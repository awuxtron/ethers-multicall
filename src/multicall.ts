import type { ExtractReturnType, MulticallContext } from './types'
import { BigNumber, BigNumberish, BytesLike, CallOverrides, ethers } from 'ethers'
import ABI from './abis/multicall3.json'
import { getContract } from './contract'
import { InvalidMulticallVersion, InvalidReturnedData } from './errors'
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
    value?: BigNumberish
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

    public async getAddress() {
        if (!this.multicallAddress) {
            this.multicallAddress = getMulticallAddress(this.chainId || (await this.provider.getNetwork()).chainId)
        }

        return this.multicallAddress
    }

    public async call<T extends MulticallContext[]>(contexts: [...T], overrides: CallOverrides = {}) {
        const address = await this.getAddress()

        const results = await this.execute(
            new ethers.Contract(address, ABI, this.provider),
            this.buildMulticallData(contexts),
            overrides
        )

        return results.map(([success, result], index) => {
            if (!contexts[index].allowFailure && !success) {
                throw new InvalidReturnedData(contexts[index], result)
            }

            return contexts[index].decoder(result)
        }) as ExtractReturnType<T>
    }

    protected async execute(
        ct: ethers.Contract,
        data: MulticallData[],
        or: CallOverrides
    ): Promise<Array<[boolean, BytesLike]>> {
        if (!or.value) {
            or.value = Object.values(data).reduce((sum, i) => sum.add(i.value ?? 0), BigNumber.from(0))
        }

        switch (this.version) {
            case 1: {
                return (await ct.callStatic.aggregate(data, or)).returnData.map((r: BytesLike) => [true, r])
            }

            case 2: {
                return (await ct.callStatic.tryAggregate(!this.allowFailure, data, or)).map((r: any) => [
                    r.success,
                    r.returnData,
                ])
            }

            case 3: {
                return (await ct.callStatic.aggregate3Value(data, or)).map((r: any) => [r.success, r.returnData])
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
                result.value = context.value ?? 0
            }

            return result
        })
    }
}
