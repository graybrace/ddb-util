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

interface DynamoDBBatchWriteClient {
    send: (cmd: BatchWriteItemCommand) => Promise<BatchWriteItemCommandOutput>
}

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
            shouldRetry: err => err instanceof UnprocessedItemsError
        }
    )
}

class BatchWriter {
    private readonly _tableName: string
    private _unprocessedItems: WriteRequest[]

    constructor(tableName: string, items: object[]) {
        this._tableName = tableName
        this._unprocessedItems = items.map(item => {
            return {
                PutRequest: { Item: marshall(item) }
            }
        })
    }

    async tryWrite(client: DynamoDBBatchWriteClient) {
        const requestItems: BatchWriteItemCommandInput['RequestItems'] = {}
        requestItems[this._tableName] = this._unprocessedItems
        const res = await client.send(new BatchWriteItemCommand({
            RequestItems: requestItems
        }))
        this._unprocessedItems = getUnprocessedItems(res, this._tableName)
        if (this._unprocessedItems.length > 0) {
            throw new UnprocessedItemsError()
        }
    }
}

class UnprocessedItemsError extends Error {}

const getUnprocessedItems = (output: BatchWriteItemCommandOutput, tableName: string) => {
    return output.UnprocessedItems && output.UnprocessedItems[tableName] ? output.UnprocessedItems[tableName] : []
}