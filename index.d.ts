/// <reference types="react" />
import {
  ReactNode,
  ReactNodeArray,
  Context,
  Component,
  ComponentClass
} from 'react'

export interface KeepAliveProps {
  children: ReactNode | ReactNodeArray
  name?: string
  id?: string
  when?: boolean | Array<boolean> | (() => boolean | Array<boolean>)
  saveScrollPosition?: boolean | 'screen'
}

export declare class KeepAlive extends Component<KeepAliveProps> {}
export default KeepAlive

export declare class AliveScope extends Component<{
  children: ReactNode | ReactNodeArray
}> {}

export declare class NodeKey extends Component<{
  prefix?: string
}> {}

export function withActivation(Component: ComponentClass): ComponentClass
export function withAliveScope(Component: ComponentClass): ComponentClass

export function fixContext(context: Context<any>): void
export function createContext<T>(
  defaultValue: T,
  calculateChangedBits?: (prev: T, next: T) => number
): Context<T>

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
  clear: () => Promise<boolean>
  getCachingNodes: () => Array<CachingNode>
}
export function useAliveController(): AliveController
