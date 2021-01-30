import React from 'react'
import createReactContext from 'create-react-context'
import { get, isString, isFunction, memoize, EventBus } from 'szfe-tools'

import { aliveScopeContext, aliveNodeContext } from '../../context'

export const fixedContext = []
export const updateListenerCache = new Map()
export const eventBus = new EventBus()

export const fixContext = memoize((ctx) => {
  // 排除 KeepAlive 功能的上下文
  if ([aliveScopeContext, aliveNodeContext].includes(ctx)) {
    return
  }
  fixedContext.push(ctx)
  eventBus.emit('update')
})

export const createContext = (defaultValue, calculateChangedBits) => {
  const ctx = createReactContext(defaultValue, calculateChangedBits)

  fixContext(ctx)
  return ctx
}

const tryFixCtx = memoize((type) => {
  const ctx = get(type, '_context')

  if (ctx) {
    fixContext(ctx)
  }
})

const override = (configs) => {
  configs.forEach(([host, ...methods]) => {
    methods.forEach((method) => {
      if (!isFunction(get(host, method))) {
        return
      }
      const originMethod = host[method].bind(host)
      host[method] = (type, ...args) => {
        if (!isString(type)) {
          tryFixCtx(type)
        }
        return originMethod(type, ...args)
      }
    })
  })
}

export const autoFixContext = (configs = []) => {
  let ReactJSXRuntime, ReactJSXDevRuntime

  try {
    ReactJSXRuntime = require('react/jsx-runtime')
  } catch (err) {
    // nothing
  }

  try {
    ReactJSXDevRuntime = require('react/jsx-dev-runtime')
  } catch (err) {
    // nothing
  }

  try {
    override([
      [React, 'createElement'],
      [ReactJSXDevRuntime, 'jsx', 'jsxs', 'jsxDEV'],
      [ReactJSXRuntime, 'jsx', 'jsxs', 'jsxDEV'],
      ...configs,
    ])
  } catch (err) {
    console.warn('auto fix failed:', err)
  }
}

autoFixContext()
