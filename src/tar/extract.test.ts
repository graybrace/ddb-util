import { extract } from "./extract";

const mockOnEntry = jest.fn((data: Buffer) => {
    console.debug("data:", data.toString('utf-8'))
})

afterEach(() => {
    jest.clearAllMocks()
})

/*
    Would much rather use in-memory (and/or mocked) tar streams to test these,
    but it's just much easier to use test files at this point
 */

test('extractor handles empty tar', async() => {
    await extract('./res/empty.tar', mockOnEntry)
    expect(mockOnEntry).toHaveBeenCalledTimes(0)
})

test('extractor handles multiple tar entries', async() => {
    await extract('./res/three.tar', mockOnEntry)
    expect(mockOnEntry).toHaveBeenCalledTimes(3)
    for (let i = 0; i < 3; i++) {
        const strInput = mockOnEntry.mock.calls[i][0].toString('utf-8')
        expect(strInput).toBe(`contents of entry ${i + 1}`)
    }
})