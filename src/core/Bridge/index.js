import React from 'react'

import { ProviderBridge, ConsumerBridge } from './Context'
import SuspenseBridge, { LazyBridge } from './Suspense'
import ErrorBoundaryBridge, { ErrorThrower } from './ErrorBoundary'

import { run } from '../../helpers'

export default function Bridge({ id, children, bridgeProps }) {
  const { sus$$, ctx$$, error$$ } = bridgeProps

  return (
    <ErrorBoundaryBridge error$$={error$$}>
      <SuspenseBridge sus$$={sus$$}>
        <ProviderBridge id={id} value={ctx$$}>
          {children}
        </ProviderBridge>
      </SuspenseBridge>
    </ErrorBoundaryBridge>
  )
}

export function Acceptor({ id, children }) {
  return (
    <ErrorThrower>
      {error$$ => (
        <LazyBridge>
          {sus$$ => (
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
