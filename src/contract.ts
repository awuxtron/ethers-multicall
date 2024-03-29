import type { ExcludeLast, MulticallContext } from './types'
import type { ethers, utils } from 'ethers'
import { isObject } from './utils'

export type MethodContext<
    C extends ethers.Contract,
    N extends keyof C['functions'],
    F extends boolean
> = MulticallContext<Awaited<ReturnType<C[N]>>, F>

export type MethodArgs<C extends ethers.Contract, N extends keyof C['functions']> = ExcludeLast<
    Parameters<C['functions'][N]>
>

export type ContractClass<C extends ethers.Contract, F extends boolean> = Contract<C> & {
    readonly [K in keyof C['functions']]: <T extends Partial<MethodContext<C, K, F>>>(
        ...args: [...MethodArgs<C, K>, ...[overrides?: T]]
    ) => MethodContext<C, K, T['allowFailure'] extends boolean ? T['allowFailure'] : F>
}

class Contract<C extends ethers.Contract> {
    protected readonly contract: C
    protected readonly allowFailure: boolean

    constructor(contract: C, allowFailure: boolean) {
        this.contract = contract
        this.allowFailure = allowFailure

        const fragments = contract.interface.fragments.filter((fragment): fragment is utils.FunctionFragment => {
            return fragment.type == 'function'
        })

        for (const fragment of fragments) {
            Object.defineProperty(this, fragment.name, {
                enumerable: true,
                writable: false,
                value: (...args: MethodArgs<C, typeof fragment.name>) => this.getContext(fragment, args),
            })
        }
    }

    protected getContext<F extends utils.FunctionFragment>(
        fragment: F,
        args: MethodArgs<C, F['name']>
    ): MulticallContext {
        const context: MulticallContext = {
            address: this.contract.address,
            allowFailure: this.allowFailure,
            decoder: () => {
                //
            },
            encoded: '0x',
            methodName: fragment.name,
            methodParameters: args,
        }

        if (args.length == fragment.inputs.length + 1 && isObject(args[args.length - 1])) {
            Object.assign(context, args.pop())
            context.methodParameters = args
        }

        try {
            context.encoded = this.contract.interface.encodeFunctionData(fragment, args)
        } catch (error: any) {
            if (!context.allowFailure) {
                throw error
            }
        }

        context.decoder = (data) => {
            if (data == '0x') {
                return
            }

            try {
                const decoded = this.contract.interface.decodeFunctionResult(fragment, data)

                if (fragment.outputs?.length == 1) {
                    return decoded[0]
                }

                return decoded
            } catch (error: any) {
                if (!context.allowFailure) {
                    throw error
                }

                return
            }
        }

        return context
    }
}

export function getContract<C extends ethers.Contract, F extends boolean>(contract: C, allowFailure: F) {
    return new Contract(contract, allowFailure) as ContractClass<C, F>
}
