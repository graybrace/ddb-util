const mockCreateWriteStream = jest.fn(() => new stream.Writable())

import * as stream from "stream";
import { Callback, Headers } from "tar-stream";
import { TarPacker } from "./pack";

jest.mock('fs', () => {
    const originalModule = jest.requireActual('fs')

    return {
        __esModule: true,
        ...originalModule,
        createWriteStream: mockCreateWriteStream,
    }
})

jest.mock('tar-stream', () => {
    const originalModule = jest.requireActual('tar-stream')

    return {
        __esModule: true,
        ...originalModule,
        pack: jest.fn(() => mockTarPack),
    }
})

const mockTarPack = {
    pipe: jest.fn(<T extends NodeJS.WritableStream>(destination: T) => destination),
    finalize: jest.fn(),
    entry: jest.fn((headers: Headers, buffer?: string | Buffer, callback?: Callback) => {
        console.debug("mock entry:", headers.name, buffer?.length)
        if (callback) {
            callback(headers.name === 'throw an error' ? new Error('entry error!') : null)
        }
    })
}

const longString = () => {
    // 240,000 characters for some more substantial data
    let res = ''
    for (let i = 0; i < 10000; i++) {
        res = res + new Date().toISOString()
    }
    return res
}

afterEach(() => {
    jest.clearAllMocks()
})

test('tar packer pipes to stream', async() => {
    const writeStream = new stream.Writable()
    await TarPacker.withStream(writeStream, () => {})
    expect(mockTarPack.pipe).toHaveBeenCalledWith(writeStream)
})

test('tar packer finalizes when finished', async() => {
    const writeStream = new stream.Writable()
    await TarPacker.withStream(writeStream, () => {})
    expect(mockTarPack.finalize).toHaveBeenCalledTimes(1)
})

test('tar packer adds entries', async() => {
    const writeStream = new stream.Writable()
    const longData = longString()
    await TarPacker.withStream(writeStream, async(tarPacker) => {
        await tarPacker.entry('entry1', 'data1')
        await tarPacker.entry('entry2', longData)
        await tarPacker.entry('entry3', 'data3')
    })
    expect(mockTarPack.entry).toHaveBeenCalledTimes(3)
    expect(mockTarPack.entry.mock.calls[0][0]).toStrictEqual({ name: 'entry1'})
    expect(mockTarPack.entry.mock.calls[0][1]).toStrictEqual('data1')
    expect(mockTarPack.entry.mock.calls[1][0]).toStrictEqual({ name: 'entry2'})
    expect(mockTarPack.entry.mock.calls[1][1]).toStrictEqual(longData)
    expect(mockTarPack.entry.mock.calls[2][0]).toStrictEqual({ name: 'entry3'})
    expect(mockTarPack.entry.mock.calls[2][1]).toStrictEqual('data3')
})

test('tar packer rejects on entry error', async() => {
    const writeStream = new stream.Writable()
    await expect(async() => await TarPacker.withStream(writeStream, async(tarPacker) => {
        await tarPacker.entry('throw an error', 'data1')
    })).rejects.toThrow('entry error!')
})

test('pack with file creates a write stream', async() => {
    await TarPacker.withFile('file', () => {})
    expect(mockCreateWriteStream).toHaveBeenCalledTimes(1)
    expect(mockCreateWriteStream).toHaveBeenCalledWith('file', expect.objectContaining({ autoClose: true }))
    expect(mockTarPack.pipe).toHaveBeenCalledTimes(1)
})