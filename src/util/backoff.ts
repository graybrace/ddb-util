interface BackoffOptions {
    /**
     * Initial amount to delay by after a failure
     */
    initDelay: number

    /**
     * How much to multiply the delay by after each backoff
     */
    delayMultiplier: number

    /**
     * Maximum number of times to try before giving up altogether
     */
    maxAttempts: number

    /**
     * @returns true if the given error indicates the request should be retried
     */
    shouldRetry: (err: unknown) => boolean
}

/**
 * Run a given handler with exponential backoff in case of failure
 *
 * @param handler Function handler to run
 * @param backoffOptions Specification of how to backoff
 */
export const backoff = async<T>(
    handler: () => T,
    backoffOptions: BackoffOptions
) => {
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
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}