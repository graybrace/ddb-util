interface BackoffOptions {
    initDelay: number
    delayMultiplier: number
    maxAttempts: number
    shouldRetry: (err: unknown) => boolean
}

export const backoff = async<T>(handler: () => T, backoffOptions: BackoffOptions) => {
    for (
        let i = 0, delay = backoffOptions.initDelay;
        i < backoffOptions.maxAttempts;
        i++, delay *= backoffOptions.delayMultiplier
    ) {
        try {
            return await handler();
        } catch (err) {
            if (i === backoffOptions.maxAttempts - 1 || !backoffOptions.shouldRetry(err)) {
                throw err
            } else {
                await sleep(delay)
            }
        }
    }
}

const sleep = async(ms: number) => {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms)
    })
}