import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { batchWrite } from "../dynamodb/batch-write";
import { extract } from "../tar/extract";

const client = new DynamoDBClient()

export const insertDynamoData = async(tableName: string, filePath: string) => {
    let totalCount = 0
    await extract(filePath, data => {
        const items = JSON.parse(data.toString('utf-8'));
        if (Array.isArray(items)) {
            totalCount += items.length;
            return batchWrite(client, tableName, items);
        } else {
            console.warn("Encountered entry with non-array data, skipping");
        }
    })
    console.log("# items:", totalCount);
}