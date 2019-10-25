/// <reference types="react" />
import * as React from 'react'

export interface KeepAliveProps {
  children: ReactNode | ReactNodeArray
  name?: string
  id?: string
  when?: boolean | Array<boolean> | (() => boolean | Array<boolean>)
  saveScrollPosition?: boolean | 'screen'
}

export declare class KeepAlive extends React.Component<KeepAliveProps> {}
export default KeepAlive 

export declare class AliveScope extends React.Component<{
  children: ReactNode | ReactNodeArray
}> {}

export function withActivation(Component: React.ComponentClass): React.ComponentClass
export function withAliveScope(Component: React.ComponentClass): React.ComponentClass

export function fixContext(Context: React.Context): void
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
}
export interface AliveController {
  drop: (name: string | RegExp) => Promise<boolean>
  dropScope: (name: string | RegExp) => Promise<boolean>
  clear: () => Promise<boolean>
  getCachingNodes: () => Array<CachingNode>
}
export function useAliveController(): AliveController
