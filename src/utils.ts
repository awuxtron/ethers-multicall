import { UnsupportedChainId } from './errors'

export function isObject(input: any): input is Record<PropertyKey, any> {
    return typeof input == 'object' && !Array.isArray(input)
}

export function getMulticallAddress(chainId: number): string {
    const supportedChainIds = new Set([
        1, 42, 4, 5, 3, 11_155_111, 10, 69, 420, 42_161, 421_613, 421_611, 137, 80_001, 100, 43_114, 43_113, 4002, 250,
        56, 97, 1284, 1285, 1287, 1_666_600_000, 25, 122, 14, 19, 16, 114, 288, 1_313_161_554, 592, 66, 128, 1088, 30,
        31, 9001, 9000, 108, 18, 42_262, 42_220, 44_787, 71_402, 71_401, 8217, 2001, 321, 106, 40,
    ])

    if (supportedChainIds.has(chainId)) {
        return '0xca11bde05977b3631167028862be2a173976ca11'
    }

    throw new UnsupportedChainId(chainId)
}
