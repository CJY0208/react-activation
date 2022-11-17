import { ReactNode, ReactNodeArray, Context, Component, ComponentType } from 'react'

export declare type GetProps<C> = C extends ComponentType<infer P> ? P : never;

export interface KeepAliveProps {
  children: ReactNode | ReactNodeArray
  name?: string
  id?: string
  cacheKey?: string
  when?: boolean | Array<boolean> | (() => boolean | Array<boolean>)
  saveScrollPosition?: boolean | string
  autoFreeze?: boolean
  [key: string]: any
}

export declare class KeepAlive extends Component<KeepAliveProps> {}
export default KeepAlive

export declare class AliveScope extends Component<{
  children: ReactNode | ReactNodeArray
}> {}

export declare class NodeKey extends Component<{
  prefix?: string
  onHandleNode?: (node: any, mark?: string) => string | undefined | null
}> {}

export function fixContext(context: Context<any>): void
export function createContext<T>(
  defaultValue: T,
  calculateChangedBits?: (prev: T, next: T) => number
): Context<T>
// type ContextFixEntry = [host: any, ...methods: any[]]
export function autoFixContext(...configs: any[]): void

export function useActivate(effect: () => void): void
export function useUnactivate(effect: () => void): void

export interface CachingNode {
  createTime: number
  updateTime: number
  name?: string
  id: string
  [key: string]: any
}
export interface AliveController {
  drop: (name: string | RegExp) => Promise<boolean>
  dropScope: (name: string | RegExp) => Promise<boolean>
  refresh: (name: string | RegExp) => Promise<boolean>
  refreshScope: (name: string | RegExp) => Promise<boolean>
  clear: () => Promise<boolean>
  getCachingNodes: () => Array<CachingNode>
}
export function useAliveController(): AliveController

export declare function withActivation<C extends ComponentType<GetProps<C>>>(component: C): C
export declare function withAliveScope<C extends ComponentType<GetProps<C>>>(component: C): C
