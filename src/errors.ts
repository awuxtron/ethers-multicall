import type { MulticallContext } from './types'

export class UnsupportedChainId extends Error {
    constructor(chainId: any) {
        super(`Chain ID ${chainId} is not supported, please specify the custom multicall address.`)
    }
}

export class InvalidMulticallVersion extends Error {
    constructor(version: any) {
        super(`Invalid multicall version: ${version}, supported versions: 1, 2, 3.`)
    }
}

export class MethodCallFailed extends Error {
    constructor(context: MulticallContext, returnedData: any) {
        const params = context.methodParameters.join(', ')

        super(`Call contract method: ${context.methodName}(${params}) failed, returned data: ${returnedData}.`)
    }
}
