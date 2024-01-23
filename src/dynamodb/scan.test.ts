import { marshall } from "@aws-sdk/util-dynamodb";
import { scan } from "./scan";

const mockOnData = jest.fn()

const makeMockScanClient = (...items: object[][]) => {
    return {
        send: jest.fn(async(_) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            const callItems = items.shift()
            if (!callItems) {
                throw new Error('mock scan client send called too many times')
            }
            return {
                $metadata: {},
                Items: callItems.map(item => marshall(item)),
                Count: callItems.length,
                LastEvaluatedKey: items.length > 0 ? marshall({ key: items.length }) : undefined
            }
        })
    }
}

afterEach(() => {
    jest.clearAllMocks()
})

const expectFirstScan = (scanClient: ReturnType<typeof makeMockScanClient>) => {
    expect(scanClient.send.mock.calls[0][0].input).toStrictEqual(expect.objectContaining({
        TableName: 'test-table',
        ExclusiveStartKey: undefined
    }))
}

test('scan with no results never calls onData', async() => {
    const scanClient = makeMockScanClient([])
    await scan(scanClient, 'test-table', mockOnData)

    expect(scanClient.send).toHaveBeenCalledTimes(1)
    expectFirstScan(scanClient)

    expect(mockOnData).toHaveBeenCalledTimes(0)
})

test('scan with one result set calls onData once', async() => {
    const scanClient = makeMockScanClient([{ a: 1 }])
    await scan(scanClient, 'test-table', mockOnData)

    expect(scanClient.send).toHaveBeenCalledTimes(1)
    expectFirstScan(scanClient)

    expect(mockOnData).toHaveBeenCalledTimes(1)
    expect(mockOnData).toHaveBeenNthCalledWith(1, [{ a: 1 }], 0)
})

test('scan with multiple chunks will re-scan', async() => {
    const scanClient = makeMockScanClient([{ a: 2 }], [{ b: 3 }])
    await scan(scanClient, 'test-table', mockOnData)

    expect(scanClient.send).toHaveBeenCalledTimes(2)
    expectFirstScan(scanClient)
    expect(scanClient.send.mock.calls[1][0].input).toStrictEqual(expect.objectContaining({
        TableName: 'test-table',
        ExclusiveStartKey: marshall({ key: 1 })
    }))

    expect(mockOnData).toHaveBeenCalledTimes(2)
    expect(mockOnData).toHaveBeenNthCalledWith(1, [{ a: 2 }], 0)
    expect(mockOnData).toHaveBeenNthCalledWith(2, [{ b: 3 }], 1)
})