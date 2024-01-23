const mockScan = jest.fn(async(_, tableName, onData) => {
    switch (tableName) {
        case 'empty':
            break
        case 'one-chunk':
            await Promise.resolve(onData([ { a: 1 }, { b: 2 }], 0))
            break
        case 'three-chunk':
            await Promise.resolve(onData([ { a: 1 }, { b: 2 }], 0))
            await Promise.resolve(onData([ { a: 3 }, { b: 4 }], 1))
            await Promise.resolve(onData([ { a: 5 }, { b: 6 }], 2))
            break
    }
})

const mockEntry = jest.fn(() => {})

const tarWithFile = jest.fn((_, handler) => handler({
    entry: mockEntry
}))

import { getDynamoData } from "./get";

jest.mock('../dynamodb/scan', () => {
    const originalModule = jest.requireActual('../dynamodb/scan')

    return {
        __esModule: true,
        ...originalModule,
        scan: mockScan
    }
})

jest.mock('../tar/pack', () => {
    const originalModule = jest.requireActual('../tar/pack')

    return {
        __esModule: true,
        ...originalModule,
        TarPacker: {
            withFile: tarWithFile
        },
    }
})

afterEach(() => {
    jest.clearAllMocks()
})

test('get opens file and scans table', async() => {
    await getDynamoData('empty', 'file')

    expect(tarWithFile).toHaveBeenCalledTimes(1)
    expect(tarWithFile.mock.calls[0][0]).toBe('file')

    expect(mockScan).toHaveBeenCalledTimes(1)
    expect(mockScan.mock.calls[0][1]).toBe('empty')
})

test('data chunk gets passed to tar pack', async() => {
    await getDynamoData('one-chunk', 'file')

    expect(tarWithFile).toHaveBeenCalledTimes(1)
    expect(tarWithFile.mock.calls[0][0]).toBe('file')

    expect(mockScan).toHaveBeenCalledTimes(1)
    expect(mockScan.mock.calls[0][1]).toBe('one-chunk')

    expect(mockEntry).toHaveBeenCalledTimes(1)
    expect(mockEntry).toHaveBeenCalledWith('entry0.json', JSON.stringify([ { a: 1 }, { b: 2 }]))
})

test('multiple data chunks gets passed to tar pack', async() => {
    await getDynamoData('three-chunk', 'file')

    expect(tarWithFile).toHaveBeenCalledTimes(1)
    expect(tarWithFile.mock.calls[0][0]).toBe('file')

    expect(mockScan).toHaveBeenCalledTimes(1)
    expect(mockScan.mock.calls[0][1]).toBe('three-chunk')

    expect(mockEntry).toHaveBeenCalledTimes(3)
    expect(mockEntry).toHaveBeenCalledWith('entry0.json', JSON.stringify([ { a: 1 }, { b: 2 }]))
    expect(mockEntry).toHaveBeenCalledWith('entry1.json', JSON.stringify([ { a: 3 }, { b: 4 }]))
    expect(mockEntry).toHaveBeenCalledWith('entry2.json', JSON.stringify([ { a: 5 }, { b: 6 }]))
})