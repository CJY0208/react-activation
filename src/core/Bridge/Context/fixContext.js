import React from 'react'
import createReactContext from 'create-react-context'
import { get, isString, isFunction, memoize, EventBus, isExist } from 'szfe-tools'

import { aliveScopeContext, aliveNodeContext } from '../../context'

export const fixedContext = []
export const updateListenerCache = new Map()
export const eventBus = new EventBus()

export const fixContext = memoize((ctx) => {
  if (!isExist(ctx)) {
    return
  }

  // 排除 KeepAlive 功能的上下文
  if ([aliveScopeContext, aliveNodeContext].includes(ctx)) {
    return
  }
  fixedContext.push(ctx)
  setTimeout(() => eventBus.emit('update'))
})

export const createContext = (defaultValue, calculateChangedBits) => {
  const ctx = createReactContext(defaultValue, calculateChangedBits)

  fixContext(ctx)
  return ctx
}

const tryFixCtx = memoize((type) => {
  // 尝试读取 Provider 或 Consumer 中的 context 静态属性
  const ctx = get(type, '_context') || get(type, 'context') // 16.3.0 版本为 context，之后为 _context

  // 判断是否为 ReactContext 类型
  if (get(ctx, '$$typeof') === get(aliveScopeContext, '$$typeof')) {
    fixContext(ctx)
  }
})

const override = (configs) => {
  configs.forEach(([host, ...methods]) => {
    methods.forEach((method) => {
      if (
        !isFunction(get(host, method)) ||
        get(host, [method, '_overridden'])
      ) {
        return
      }
      const originMethod = host[method].bind(host)
      host[method] = (type, ...args) => {
        if (!isString(type)) {
          tryFixCtx(type)
        }
        return originMethod(type, ...args)
      }
      host[method]._overridden = true
    })
  })
}

/**
 * 通过覆写 React.createElement 方法来探测 Provider 或 Consumer 的创建，并攫取其中 context 主动进行修复
 * TODO：同时兼容 React 17+，目前仅默认兼容 React.createElement 方法
 * React 17+ 为 require('react/jsx-runtime') 或 require('react/jsx-dev-runtime') 的 jsx、jsxs、jsxDEV 方法
 * 但由于无法动态 require，暂未想到方式同时兼容
 * 若需兼容 17+，目前手法为
 *
 * autoFixContext(
 *   [require('react/jsx-runtime'), 'jsx', 'jsxs', 'jsxDEV'],
 *   [require('react/jsx-dev-runtime'), 'jsx', 'jsxs', 'jsxDEV']
 * )
 *
 * Note: 需注意 16.2.x 及以下版本不支持此方法
 */
export const autoFixContext = (...configs) => {
  try {
    override(configs)
  } catch (err) {
    console.warn('activation override failed:', err)
  }
}

autoFixContext([React, 'createElement'])
