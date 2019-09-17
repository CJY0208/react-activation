import React from 'react'

import { ProviderBridge, ConsumerBridge } from './Context'
import SuspenseBridge, { LazyBridge } from './Suspense'
import ErrorBoundaryBridge, { ErrorThrower } from './ErrorBoundary'

import { run } from '../../helpers'

// 用于 Keeper 中，实现 Keeper 向外或向内的桥接代理
export default function Bridge({ id, children, bridgeProps }) {
  const { sus$$, ctx$$, error$$ } = bridgeProps

  return (
    /* 由内向外透传 componentDidCatch 捕获的 error */
    <ErrorBoundaryBridge error$$={error$$}>
      {/* 由内向外透传 lazy 行为 */}
      <SuspenseBridge sus$$={sus$$}>
        {/* 由外向内透传可能存在的 Consumer 数据 */}
        <ProviderBridge id={id} value={ctx$$}>
          {children}
        </ProviderBridge>
      </SuspenseBridge>
    </ErrorBoundaryBridge>
  )
}

// 用于 KeepAlive 中，实现 KeepAlive 向外或向内的桥接代理
export function Acceptor({ id, children }) {
  return (
    /* 由内向外透传 componentDidCatch 捕获的 error */
    <ErrorThrower>
      {error$$ => (
        /* 由内向外透传 lazy 行为 */
        <LazyBridge>
          {sus$$ => (
            /* 由外向内透传可能被捕获的 Provider 数据 */
            <ConsumerBridge id={id}>
              {ctx$$ =>
                run(children, undefined, {
                  bridgeProps: {
                    sus$$,
                    ctx$$,
                    error$$
                  }
                })
              }
            </ConsumerBridge>
          )}
        </LazyBridge>
      )}
    </ErrorThrower>
  )
}
