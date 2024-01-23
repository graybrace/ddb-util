import { BatchWriteItemCommand, BatchWriteItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { BatchWriteItemCommandInput } from "@aws-sdk/client-dynamodb/dist-types/commands/BatchWriteItemCommand";
import { WriteRequest } from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import { marshall } from "@aws-sdk/util-dynamodb";
import { backoff } from "../util/backoff";

const BACKOFF_OPTIONS = {
    initDelay: 0.5,
    delayMultiplier: 1.5,
    maxAttempts: 5
}

/*
    Generic client capable of sending BatchWriteItem commands
    In a non-test scenario use a DynamoDBClient
 */
interface DynamoDBBatchWriteClient {
    send: (cmd: BatchWriteItemCommand) => Promise<BatchWriteItemCommandOutput>
}

/**
 * Batch PUT the given items to the specified DynamoDB table
 *
 * @param client Client capable of sending BatchWriteItem commands
 * @param tableName Name of the DynamoDB table
 * @param items Items to insert
 *
 * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html | BatchWriteItem}
 */
export const batchWrite = async(
    client: DynamoDBBatchWriteClient,
    tableName: string,
    items: object[]
) => {
    console.debug(`writing ${items.length} item(s)`)
    const batchWriter = new BatchWriter(tableName, items)
    return backoff(
        () => batchWriter.tryWrite(client),
        {
            ...BACKOFF_OPTIONS,
            // AWS SDK backoff retries in other instances, only handle if
            // there are remaining unprocessed items
            shouldRetry: err => err instanceof UnprocessedItemsError
        }
    )
}

class BatchWriter {
    /**
     * Helper class to track remaining unprocessed items through
     * (potentially) multiple BatchWriteItem requests
     */
    private readonly _tableName: string
    private _unprocessedItems: WriteRequest[]

    constructor(tableName: string, items: object[]) {
        this._tableName = tableName
        this._unprocessedItems = items.map(item => {
            return {
                PutRequest: {
                    Item: marshall(item)
                }
            }
        })
    }

    async tryWrite(client: DynamoDBBatchWriteClient) {
        const res = await client.send(new BatchWriteItemCommand({
            RequestItems: makeRequestItems(this._tableName, this._unprocessedItems)
        }))
        this._unprocessedItems = getUnprocessedItems(res, this._tableName)
        if (this._unprocessedItems.length > 0) {
            throw new UnprocessedItemsError()
        }
    }
}

/*
    request items looks like
    {
        <TABLE NAME>: [
            {
                PutRequest: { Item: ... }
            },
            ...
            {
                PutRequest: { Item: ... }
            }
        ]
    }
 */
const makeRequestItems = (tableName: string, requests: WriteRequest[]) => {
    const requestItems: BatchWriteItemCommandInput['RequestItems'] = {}
    requestItems[tableName] = requests
    return requestItems
}

class UnprocessedItemsError extends Error {}

const getUnprocessedItems = (output: BatchWriteItemCommandOutput, tableName: string) => {
    return output.UnprocessedItems && output.UnprocessedItems[tableName] ? output.UnprocessedItems[tableName] : []
}