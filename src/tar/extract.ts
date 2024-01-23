import fs from "fs";
import { PassThrough } from "stream";
import { extract as extractTar } from "tar-stream";

type EntryHandler = (data: Buffer) => unknown

export const extract = async(path: string, onEntry: EntryHandler) => {
    const fileStream = fs.createReadStream(path, { autoClose: true })
    return extractStream(fileStream, onEntry)
}

const extractStream = async(stream: NodeJS.ReadableStream, onEntry: EntryHandler) => {
    const extractor = extractTar()
    return new Promise<void>((resolve, reject) => {
        extractor.on('finish', resolve)
        extractor.on('error', reject)
        extractor.on('entry', async(header, stream, next) => {
            console.debug("tar entry:", header.name, header.type)
            const rawData = await bufferify(stream)
            console.debug("--> size:", rawData.length)
            await Promise.resolve(onEntry(rawData))
            next()
        })
        stream.pipe(extractor)
    })
}

const bufferify = async(stream: PassThrough) => {
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}