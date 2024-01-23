import { BatchWriteItemOutput } from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import { marshall } from "@aws-sdk/util-dynamodb";
import { batchWrite } from "./batch-write";

const makeMockBatchWriteClient = (...unprocessed: BatchWriteItemOutput['UnprocessedItems'][]) => {
    return {
        send: jest.fn(async(_) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            return {
                $metadata: {},
                UnprocessedItems: unprocessed.shift()
            }
        })
    }
}

test('successful batch write only called once', async() => {
    const batchWriteClient = makeMockBatchWriteClient()
    await batchWrite(batchWriteClient, 'test-table', [ { a: 1 }, { b: 2 }])

    expect(batchWriteClient.send).toHaveBeenCalledTimes(1)
    expect(batchWriteClient.send.mock.calls[0][0].input).toStrictEqual(expect.objectContaining({
        RequestItems: {
            'test-table': [
                {
                    PutRequest: { Item: marshall({ a: 1 }) }
                },
                {
                    PutRequest: { Item: marshall({ b: 2 }) }
                }
            ]
        }
    }))
})

test('unsuccessful full batch write called again', async() => {
    const batchWriteClient = makeMockBatchWriteClient({
        'test-table': [
            {
                PutRequest: { Item: marshall({ b: 2 }) }
            }
        ]
    })
    await batchWrite(batchWriteClient, 'test-table', [ { a: 1 }, { b: 2 }])

    expect(batchWriteClient.send).toHaveBeenCalledTimes(2)
    expect(batchWriteClient.send.mock.calls[0][0].input).toStrictEqual(expect.objectContaining({
        RequestItems: {
            'test-table': [
                {
                    PutRequest: { Item: marshall({ a: 1 }) }
                },
                {
                    PutRequest: { Item: marshall({ b: 2 }) }
                }
            ]
        }
    }))
    expect(batchWriteClient.send.mock.calls[1][0].input).toStrictEqual(expect.objectContaining({
        RequestItems: {
            'test-table': [
                {
                    PutRequest: { Item: marshall({ b: 2 }) }
                }
            ]
        }
    }))
})

test('unsuccessful full batch write stops after 5 tries', async() => {
    const unprocessed = {
        'test-table': [
            {
                PutRequest: { Item: marshall({ b: 2 }) }
            }
        ]
    }
    const batchWriteClient = makeMockBatchWriteClient(unprocessed, unprocessed, unprocessed, unprocessed, unprocessed)
    await expect(async() => await batchWrite(
        batchWriteClient,
        'test-table',
        [ { a: 1 }, { b: 2 }]
    )).rejects.toThrow()

    expect(batchWriteClient.send).toHaveBeenCalledTimes(5)
    expect(batchWriteClient.send.mock.calls[0][0].input).toStrictEqual(expect.objectContaining({
        RequestItems: {
            'test-table': [
                {
                    PutRequest: { Item: marshall({ a: 1 }) }
                },
                {
                    PutRequest: { Item: marshall({ b: 2 }) }
                }
            ]
        }
    }))
    for (let i = 1; i < 5; i++) {
        expect(batchWriteClient.send.mock.calls[i][0].input).toStrictEqual(expect.objectContaining({
            RequestItems: unprocessed
        }))
    }
})