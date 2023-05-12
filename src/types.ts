import type { BigNumberish, BytesLike } from 'ethers'

export interface MulticallContext<T = any, F extends boolean | undefined = true | false | undefined> {
    address: string
    allowFailure: boolean
    decoder: (data: BytesLike) => F extends true ? T | undefined : T
    encoded: BytesLike
    methodName: string
    methodParameters: any[]
    value?: BigNumberish
}

export type ExtractReturnType<T extends MulticallContext[]> = {
    [K in keyof T]: ReturnType<T[K]['decoder']>
}

export type ExcludeLast<T extends any[]> = Required<T> extends [...infer HEAD, any] ? HEAD : any[]
