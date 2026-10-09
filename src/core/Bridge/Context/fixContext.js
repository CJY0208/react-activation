import React, { useContext, Fragment } from 'react'
import { run, get, isString, isFunction, memoize, EventBus, isExist } from 'szfe-tools'

import createReactContext from '../../../helpers/createReactContext'
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

  // #259: 结合 use-context-selector 时，修复被删除的 Consumer
  if (!isExist(ctx.Consumer)) {
    function Consumer({ children }) {
      const ctxValue = run(useContext, undefined, ctx)

      return <Fragment>{run(children, undefined, ctxValue)}</Fragment>
    }

    // 重新声明 Consumer
    ctx.Consumer = Consumer
  }

  fixedContext.push(ctx)
  setTimeout(() => eventBus.emit('update'))
})

export const createContext = (defaultValue, calculateChangedBits) => {
  const ctx = createReactContext(defaultValue, calculateChangedBits)

  fixContext(ctx)
  return ctx
}

const CONTEXT_TYPE = get(aliveScopeContext, '$$typeof')

const tryFixCtxSlow = memoize((type) => {
  // React 19+: Context.Provider === Context 本身，jsx 收到的 type 即为 Context（无 _context）
  if (get(type, '$$typeof') === CONTEXT_TYPE) {
    fixContext(type)
    return
  }

  // React 16.3–18: Provider/Consumer 上挂 _context / context；React 19 Consumer 仍有 _context
  const ctx = get(type, '_context') || get(type, 'context')

  if (get(ctx, '$$typeof') === CONTEXT_TYPE) {
    fixContext(ctx)
  }
})

// 每次 jsx/createElement 都会打到这里：函数/类组件直接跳过，避免 memoize 缓存膨胀拖垮主线程
const tryFixCtx = (type) => {
  if (!type || typeof type === 'function') {
    return
  }
  tryFixCtxSlow(type)
}

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

// React 17+ / 打包器默认走 jsx-runtime；库内自补丁，避免仅依赖业务 app.ts 的 require 打到另一份模块实例
try {
  // eslint-disable-next-line global-require
  autoFixContext(
    [require('react/jsx-runtime'), 'jsx', 'jsxs', 'jsxDEV'],
    [require('react/jsx-dev-runtime'), 'jsx', 'jsxs', 'jsxDEV']
  )
} catch (e) {
  // optional in非浏览器构建
}

// React 18 createRoot / React 19：KeepAlive 子树在 AliveScope 下（常在 Router 外），
// jsx-runtime 探测不一定能挂上 react-router Context，启动时主动注册。
// 使用静态 require，避免打包器 Critical dependency: request of a dependency is an expression
;(() => {
  try {
    // eslint-disable-next-line global-require
    const rr = require('react-router-dom')
    ;[
      rr.UNSAFE_LocationContext,
      rr.UNSAFE_NavigationContext,
      rr.UNSAFE_RouteContext,
    ]
      .filter(Boolean)
      .forEach((ctx) => fixContext(ctx))
  } catch (e) {
    // optional peer
  }
  try {
    // eslint-disable-next-line global-require
    const r = require('react-router')
    ;[
      r.UNSAFE_LocationContext,
      r.UNSAFE_NavigationContext,
      r.UNSAFE_RouteContext,
    ]
      .filter(Boolean)
      .forEach((ctx) => fixContext(ctx))
  } catch (e) {
    // optional peer
  }
})()
