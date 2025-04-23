/* eslint-disable react-hooks/rules-of-hooks */
import React, { forwardRef, useContext } from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { get, isFunction, isUndefined } from 'szfe-tools'

import { Acceptor } from './Bridge'
import NodeKey from './NodeKey'
import { AliveScopeConsumer, useScopeContext } from './context'

function controllerCherryPick(controller) {
  const {
    drop,
    dropScope,
    refresh,
    refreshScope,
    clear,
    getCachingNodes,
    dropById,
    dropScopeByIds,
    refreshById,
    refreshScopeByIds,
  } = controller

  return {
    drop,
    dropScope,
    refresh,
    refreshScope,
    clear,
    getCachingNodes,
    dropById,
    dropScopeByIds,
    refreshById,
    refreshScopeByIds,
  }
}

export const expandKeepAlive = (KeepAlive) => {
  const renderContent = ({ idPrefix, helpers, props, forwardedRef }) => {
    const isOutsideAliveScope = isUndefined(helpers)

    if (isOutsideAliveScope) {
      console.error('You should not use <KeepAlive /> outside a <AliveScope>')
    }

    return isOutsideAliveScope ? (
      get(props, 'children', null)
    ) : (
      <NodeKey prefix={idPrefix} key={props._nk} manualKey={props.cacheKey}>
        {(nkId) => {
          const id = props.cacheKey || nkId

          return (
            <Acceptor key={id} id={id}>
              {(bridgeProps) => (
                <KeepAlive
                  key={id}
                  {...props}
                  {...bridgeProps}
                  id={id}
                  ref={forwardedRef}
                  _helpers={helpers}
                />
              )}
            </Acceptor>
          )
        }}
      </NodeKey>
    )
  }
  const HookExpand = ({ id: idPrefix, forwardedRef, ...props }) =>
    renderContent({ idPrefix, helpers: useScopeContext(), props, forwardedRef })

  const WithExpand = ({ id: idPrefix, forwardedRef, ...props }) => (
    <AliveScopeConsumer>
      {(helpers) => renderContent({ idPrefix, helpers, props, forwardedRef })}
    </AliveScopeConsumer>
  )

  const ExpandKeepAlive = isFunction(useContext) ? HookExpand : WithExpand

  if (isFunction(forwardRef)) {
    const ForwardedRefHOC = forwardRef((props, ref) => (
      <ExpandKeepAlive {...props} forwardedRef={ref} />
    ))

    return hoistStatics(ForwardedRefHOC, KeepAlive)
  } else {
    return hoistStatics(ExpandKeepAlive, KeepAlive)
  }
}

const withAliveScope = (WrappedComponent) => {
  const renderContent = ({ helpers, props, forwardedRef }) => (
    <WrappedComponent {...props} {...helpers} ref={forwardedRef} />
  )

  const HookScope = ({ forwardedRef, ...props }) =>
    renderContent({
      helpers: controllerCherryPick(useScopeContext() || {}),
      props,
      forwardedRef,
    })

  const WithScope = ({ forwardedRef, ...props }) => (
    <AliveScopeConsumer>
      {(controller = {}) =>
        renderContent({
          helpers: controllerCherryPick(controller),
          props,
          forwardedRef,
        })
      }
    </AliveScopeConsumer>
  )

  const HOCWithAliveScope = isFunction(useContext) ? HookScope : WithScope

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

  const ctxValue = useScopeContext()

  if (!ctxValue) {
    return {}
  }

  return controllerCherryPick(ctxValue)
}

export default withAliveScope
