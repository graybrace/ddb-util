import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { scan } from "../dynamodb/scan";
import { TarPacker } from "../tar/pack";

const client = new DynamoDBClient()

/**
 * Scans the DynamoDB table and stores retrieved items in a tar
 * file compatible with the insert command
 *
 * @param tableName Name of the DynamoDB table to pull data from
 * @param filePath File path to archive items to
 */
export const getDynamoData = (tableName: string, filePath: string) => {
    return TarPacker.withFile(filePath, (pack) => {
        return scan(client, tableName, (items, i) => {
            return pack.entry(`entry${i}.json`, JSON.stringify(items))
        })
    })
}