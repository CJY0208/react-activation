import React, { forwardRef, useContext } from 'react'
import hoistStatics from 'hoist-non-react-statics'

import { isFunction } from '../helpers'

import { Acceptor } from './Bridge'
import AliveIdProvider from './AliveIdProvider'
import { AliveScopeConsumer, aliveScopeContext } from './context'

export const expandKeepAlive = KeepAlive => {
  const renderContent = ({ id, helpers, props }) => (
    <Acceptor id={id}>
      {bridgeProps => (
        <KeepAlive {...props} {...bridgeProps} id={id} _helpers={helpers} />
      )}
    </Acceptor>
  )

  function HookExpand(props) {
    const helpers = useContext(aliveScopeContext)

    return (
      <AliveIdProvider>
        {id => renderContent({ id, helpers, props })}
      </AliveIdProvider>
    )
  }

  function WithExpand(props) {
    return (
      <AliveIdProvider>
        {id => (
          <AliveScopeConsumer>
            {helpers => renderContent({ id, helpers, props })}
          </AliveScopeConsumer>
        )}
      </AliveIdProvider>
    )
  }

  return isFunction(useContext) ? HookExpand : WithExpand
}

const withAliveScope = WrappedComponent => {
  const renderContent = ({ helpers, props, forwardedRef }) => (
    <WrappedComponent {...props} {...helpers} ref={forwardedRef} />
  )

  function HookStore({ forwardedRef, ...props }) {
    const { drop, dropScope, clear, getCachingNodes } =
      useContext(aliveScopeContext) || {}

    return renderContent({
      helpers: { drop, dropScope, clear, getCachingNodes },
      props,
      forwardedRef
    })
  }

  function WithStore({ forwardedRef, ...props }) {
    return (
      <AliveScopeConsumer>
        {({ drop, dropScope, clear, getCachingNodes } = {}) =>
          renderContent({
            helpers: { drop, dropScope, clear, getCachingNodes },
            props,
            forwardedRef
          })
        }
      </AliveScopeConsumer>
    )
  }

  const HOCWithAliveScope = isFunction(useContext) ? HookStore : WithStore

  if (isFunction(forwardRef)) {
    const ForwardedRefHOC = forwardRef((props, ref) => (
      <HOCWithAliveScope {...props} forwardedRef={ref} />
    ))

    return hoistStatics(ForwardedRefHOC, WrappedComponent)
  } else {
    return hoistStatics(HOCWithAliveScope, WrappedComponent)
  }
}

export const useAliveController = () => {
  if (!isFunction(useContext)) {
    return {}
  }

  const ctxValue = useContext(aliveScopeContext)

  if (!ctxValue) {
    return {}
  }

  const { drop, dropScope, clear, getCachingNodes } = ctxValue
  return { drop, dropScope, clear, getCachingNodes }
}

export default withAliveScope
