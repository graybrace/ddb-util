import * as fs from "fs";
import { pack, Pack } from "tar-stream";

export class TarPacker {
    /**
     * Helper class for unpacking a tar file
     */

    private readonly _tarPack: Pack

    private constructor(writeStream: NodeJS.WritableStream) {
        this._tarPack = pack()
        this._tarPack.pipe(writeStream)
    }

    async entry(name: string, data: string) {
        return new Promise<void>((resolve, reject) => {
            this._tarPack.entry({ name }, data, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    private finalize() {
        this._tarPack.finalize()
    }

    /**
     * Create a packer for a tar via a writable stream
     *
     * @param stream Stream to write to
     * @param handler Function to receive the tar packer
     */
    static async withStream(stream: NodeJS.WritableStream, handler: TarPackerHandler) {
        const tarPacker = new TarPacker(stream)
        try {
            return await Promise.resolve(handler(tarPacker))
        } finally {
            tarPacker.finalize()
        }
    }

    /**
     * Create a packer for a tar at the given file location
     *
     * @param path Path to (over)write to
     * @param handler Function to receive the tar packer
     */
    static async withFile(path: string, handler: TarPackerHandler) {
        const fileStream = fs.createWriteStream(path, { autoClose: true })
        return TarPacker.withStream(fileStream, handler)
    }
}

type TarPackerHandler = (tarPacker: TarPacker) => unknown