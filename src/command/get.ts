import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { scan } from "../dynamodb/scan";
import { TarPacker } from "../tar/pack";

const client = new DynamoDBClient()

export const getDynamoData = (tableName: string, filePath: string) => {
    return TarPacker.withFile(filePath, (pack) => {
        return scan(client, tableName, (items, i) => {
            return pack.entry(`entry${i}.json`, JSON.stringify(items))
        })
    })
}