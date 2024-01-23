import * as fs from "fs";
import { pack, Pack } from "tar-stream";

export class TarPacker {
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

    static async withStream(stream: NodeJS.WritableStream, handler: TarPackerHandler) {
        const tarPacker = new TarPacker(stream)
        try {
            return await Promise.resolve(handler(tarPacker))
        } finally {
            tarPacker.finalize()
        }
    }

    static async withFile(path: string, handler: TarPackerHandler) {
        const fileStream = fs.createWriteStream(path, { autoClose: true })
        return TarPacker.withStream(fileStream, handler)
    }
}

type TarPackerHandler = (tarPacker: TarPacker) => unknown