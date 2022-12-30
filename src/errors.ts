import type { MulticallContext } from './types'

export class UnsupportedChainId extends Error {
    constructor(chainId: any) {
        super(`Chain ID ${chainId} is not supported, please specified the custom multicall address.`)
    }
}

export class InvalidMulticallVersion extends Error {
    constructor(version: any) {
        super(`Invalid multicall version: ${version}, supported versions: 1, 2, 3.`)
    }
}

export class InvalidReturnedData extends Error {
    constructor(context: MulticallContext, returnedData: any) {
        const params = context.methodParameters.join(', ')

        super(`The contract method ${context.methodName}(${params}) returned an invalid data: ${returnedData}.`)
    }
}
