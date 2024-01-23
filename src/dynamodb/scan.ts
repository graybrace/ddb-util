import { ScanCommand, ScanCommandOutput } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const CHUNK_SIZE = 25 // Number of items attempted to be scanned at a time

/*
    Generic client capable of sending Scan commands
    In a non-test scenario use a DynamoDBClient
 */
interface DynamoDBScanClient {
    send: (cmd: ScanCommand) => Promise<ScanCommandOutput>
}

/**
 * Scan the specified table for all data
 *
 * @remarks For large tables, this can be a high-cost request
 *
 * @param client Client capable of sending Scan commands
 * @param tableName Name of the DynamoDB table to scan
 * @param onData Callback to receive chunked data
 *
 * @see {@link https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html | Scan}
 */
export const scan = async(
    client: DynamoDBScanClient,
    tableName: string,
    onData: (items: ReturnType<typeof unmarshall>[], idx: number) => unknown
) => {
    let totalCount = 0
    let exclusiveStartKey: ScanCommandOutput['LastEvaluatedKey'] | undefined = undefined
    for (let i = 0; ; i++) {
        const res = await client.send(new ScanCommand({
            TableName: tableName,
            Limit: CHUNK_SIZE,
            ExclusiveStartKey: exclusiveStartKey
        }))
        if (res.Count) {
            totalCount += res.Count
        }
        if (res.Items && res.Items.length > 0) {
            const unmarshalledData = res.Items.map(item => unmarshall(item))
            await Promise.resolve(onData(unmarshalledData, i))
        }
        if (res.LastEvaluatedKey) {
            exclusiveStartKey = res.LastEvaluatedKey
        } else {
            break
        }
    }
    console.log("# items:", totalCount)
}