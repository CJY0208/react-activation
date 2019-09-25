import React, { forwardRef, useContext } from 'react'
import hoistStatics from 'hoist-non-react-statics'

import { isFunction } from '../helpers'

import { Acceptor } from './Bridge'
import AliveIdProvider from './AliveIdProvider'
import { AliveScopeConsumer, aliveScopeContext } from './context'

function controllerCherryPick(controller) {
  const { drop, dropScope, clear, getCachingNodes } = controller
  return { drop, dropScope, clear, getCachingNodes }
}

export const expandKeepAlive = KeepAlive => {
  const renderContent = ({ id, helpers, props }) => (
    <Acceptor id={id}>
      {bridgeProps => (
        <KeepAlive {...props} {...bridgeProps} id={id} _helpers={helpers} />
      )}
    </Acceptor>
  )

  function HookExpand({ id: idPrefix, ...props }) {
    const helpers = useContext(aliveScopeContext)

    return (
      <AliveIdProvider prefix={idPrefix}>
        {id => renderContent({ id, helpers, props })}
      </AliveIdProvider>
    )
  }

  function WithExpand({ id: idPrefix, ...props }) {
    return (
      <AliveIdProvider prefix={idPrefix}>
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
    const controller = useContext(aliveScopeContext) || {}

    return renderContent({
      helpers: controllerCherryPick(controller),
      props,
      forwardedRef
    })
  }

  function WithStore({ forwardedRef, ...props }) {
    return (
      <AliveScopeConsumer>
        {(controller = {}) =>
          renderContent({
            helpers: controllerCherryPick(controller),
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

  return controllerCherryPick(ctxValue)
}

export default withAliveScope
