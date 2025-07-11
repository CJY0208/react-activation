import {
  ReactNode,
  ReactNodeArray,
  Context,
  Component,
  ComponentType,
} from 'react'

export declare type GetProps<C> = C extends ComponentType<infer P> ? P : never

type DivProps = React.HTMLAttributes<HTMLDivElement>

export interface KeepAliveProps {
  children: ReactNode | ReactNodeArray
  name?: string
  id?: string
  cacheKey?: string
  when?: boolean | Array<boolean> | (() => boolean | Array<boolean>)
  saveScrollPosition?: boolean | string
  autoFreeze?: boolean
  wrapperProps?: DivProps
  contentProps?: DivProps
  saveScrollPositionIgnoreNodeIds?: string[]
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

export interface KeeperDropConfig {
  delay: string
  refreshIfDropFailed: boolean
}
export interface AliveController {
  drop: (name: string | RegExp, config?: KeeperDropConfig) => Promise<boolean>
  dropScope: (
    name: string | RegExp,
    config?: KeeperDropConfig
  ) => Promise<boolean>
  dropById: (id: string, config?: KeeperDropConfig) => Promise<boolean>
  dropScopeByIds: (ids: string[], config?: KeeperDropConfig) => Promise<boolean>
  refresh: (name: string | RegExp) => Promise<boolean>
  refreshScope: (name: string | RegExp) => Promise<boolean>
  refreshById: (id: string) => Promise<boolean>
  refreshScopeByIds: (ids: string[]) => Promise<boolean>
  clear: () => Promise<boolean>
  getCachingNodes: () => Array<CachingNode>
}
export function useAliveController(): AliveController

export declare function withActivation<C extends ComponentType<GetProps<C>>>(
  component: C
): C
export declare function withAliveScope<C extends ComponentType<GetProps<C>>>(
  component: C
): C
