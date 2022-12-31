import type { ExtractReturnType, MulticallContext } from './types'
import { BytesLike, CallOverrides, ethers } from 'ethers'
import ABI from './abis/multicall3.json'
import { getContract } from './contract'
import { InvalidMulticallVersion } from './errors'
import { getMulticallAddress } from './utils'

export type MulticallVersion = 1 | 2 | 3

export interface MulticallOptions {
    allowFailure?: boolean
    chainId?: number
    multicallAddress?: string
    version?: MulticallVersion
}

export interface MulticallData {
    target: string
    callData: BytesLike
    allowFailure?: boolean
}

export class Multicall<O extends MulticallOptions> {
    public provider: ethers.providers.Provider
    public allowFailure: O['allowFailure'] extends boolean ? O['allowFailure'] : false
    public chainId?: number
    public multicallAddress?: string
    public version: MulticallVersion

    constructor(provider: ethers.providers.Provider, options?: O) {
        this.provider = provider

        const { allowFailure = false, chainId, multicallAddress, version = 3 } = options || {}

        this.allowFailure = allowFailure as never
        this.chainId = chainId
        this.multicallAddress = multicallAddress
        this.version = version
    }

    public for<C extends ethers.Contract>(contract: C) {
        return getContract(contract, this.allowFailure)
    }

    public async call<T extends MulticallContext[]>(contexts: [...T], overrides: CallOverrides = {}) {
        if (!this.multicallAddress) {
            this.multicallAddress = getMulticallAddress(this.chainId || (await this.provider.getNetwork()).chainId)
        }

        const results = await this.execute(
            new ethers.Contract(this.multicallAddress, ABI, this.provider),
            this.buildMulticallData(contexts),
            overrides
        )

        return results.map((result, index) => contexts[index].decoder(result)) as ExtractReturnType<T>
    }

    protected async execute(ct: ethers.Contract, data: MulticallData[], or: CallOverrides): Promise<BytesLike[]> {
        switch (this.version) {
            case 1: {
                return (await ct.callStatic.aggregate(data, or)).returnData
            }

            case 2: {
                return (await ct.callStatic.tryAggregate(!this.allowFailure, data, or)).map((r: any) => r.returnData)
            }

            case 3: {
                return (await ct.callStatic.aggregate3(data, or)).map((r: any) => r.returnData)
            }

            default: {
                throw new InvalidMulticallVersion(this.version)
            }
        }
    }

    protected buildMulticallData(contexts: MulticallContext[]) {
        return contexts.map((context): MulticallData => {
            const result: MulticallData = {
                callData: context.encoded,
                target: context.address,
            }

            if (this.version === 3) {
                result.allowFailure = context.allowFailure
            }

            return result
        })
    }
}
