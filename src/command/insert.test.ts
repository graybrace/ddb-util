// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockBatchWrite = jest.fn((client, tableName, items) => {})

jest.mock('../dynamodb/batch-write', () => {
    const originalModule = jest.requireActual('../dynamodb/batch-write')

    return {
        __esModule: true,
        ...originalModule,
        batchWrite: mockBatchWrite
    }
})

const mockExtract = jest.fn(async(path, onEntry) => {
    switch (path) {
        case 'empty':
            break
        case 'one-entry':
            await Promise.resolve(onEntry(Buffer.from(JSON.stringify([ { a: 1 }, { b: 2 } ]))))
            break
        case 'three-entry':
            await Promise.resolve(onEntry(Buffer.from(JSON.stringify([ { a: 1 }, { b: 2 } ]))))
            await Promise.resolve(onEntry(Buffer.from(JSON.stringify([ { a: 3 }, { b: 4 } ]))))
            await Promise.resolve(onEntry(Buffer.from(JSON.stringify([ { a: 5 }, { b: 6 } ]))))
            break
        case 'bad-entry':
            await Promise.resolve(onEntry(Buffer.from(JSON.stringify({ a: 1 }))))
            break
    }
})

jest.mock('../tar/extract', () => {
    const originalModule = jest.requireActual('../tar/extract')

    return {
        __esModule: true,
        ...originalModule,
        extract: mockExtract
    }
})

import { insertDynamoData } from "./insert";

afterEach(() => {
    jest.clearAllMocks()
})

test('extract empty archive does not write', async() => {
    await insertDynamoData('test-table', 'empty')

    expect(mockExtract).toHaveBeenCalledTimes(1)
    expect(mockExtract.mock.calls[0][0]).toBe('empty')

    expect(mockBatchWrite).toHaveBeenCalledTimes(0)
})

test('extract archive with one entry calls batch write', async() => {
    await insertDynamoData('test-table', 'one-entry')

    expect(mockExtract).toHaveBeenCalledTimes(1)
    expect(mockExtract.mock.calls[0][0]).toBe('one-entry')

    expect(mockBatchWrite).toHaveBeenCalledTimes(1)
    expect(mockBatchWrite.mock.calls[0][1]).toBe('test-table')
    expect(mockBatchWrite.mock.calls[0][2]).toStrictEqual([ { a: 1 }, { b: 2 } ])
})

test('extract archive with multiple entry calls batch write multiple times', async() => {
    await insertDynamoData('test-table', 'three-entry')

    expect(mockExtract).toHaveBeenCalledTimes(1)
    expect(mockExtract.mock.calls[0][0]).toBe('three-entry')

    expect(mockBatchWrite).toHaveBeenCalledTimes(3)
    expect(mockBatchWrite.mock.calls[0][1]).toBe('test-table')
    expect(mockBatchWrite.mock.calls[0][2]).toStrictEqual([ { a: 1 }, { b: 2 } ])
    expect(mockBatchWrite.mock.calls[1][1]).toBe('test-table')
    expect(mockBatchWrite.mock.calls[1][2]).toStrictEqual([ { a: 3 }, { b: 4 } ])
    expect(mockBatchWrite.mock.calls[2][1]).toBe('test-table')
    expect(mockBatchWrite.mock.calls[2][2]).toStrictEqual([ { a: 5 }, { b: 6 } ])
})

test('extract archive with non-list entry does not write', async() => {
    await insertDynamoData('test-table', 'bad-entry')

    expect(mockExtract).toHaveBeenCalledTimes(1)
    expect(mockExtract.mock.calls[0][0]).toBe('bad-entry')

    expect(mockBatchWrite).toHaveBeenCalledTimes(0)
})