/**
 * 本文件用于修复 KeepAlive 转移 children 后的自定义上下文丢失问题
 * 问题及方案最初的探讨可参考以下
 * https://github.com/StructureBuilder/react-keep-alive/issues/36
 */
import React, { PureComponent, useContext, useRef, useEffect } from 'react'
import createReactContext from 'create-react-context'

import { run, get, nextTick, isUndefined, isFunction } from '../../helpers'

const fixedContext = []
const updateListenerCache = new Map()

export function fixContext(ctx) {
  fixedContext.push(ctx)
}

export const createContext = (...args) => {
  const ctx = createReactContext(...args)

  fixContext(ctx)
  return ctx
}

// 递归重建上下文 Provider
export class ProviderBridge extends PureComponent {
  unmount = null
  constructor(props, ...args) {
    super(props, ...args)

    const { value: ctxValues } = props

    if (ctxValues.length === 0) {
      this.state = {
        ctxValue: null
      }

      return
    }

    const [{ ctx, value, onUpdate }] = ctxValues

    this.state = {
      ctxValue: value
    }

    this.unmount = onUpdate(value => {
      this.setState({
        ctxValue: value
      })
    })
  }

  componentWillUnmount() {
    run(this.unmount)
  }

  // componentDidCatch(error) {
  //   console.error('ProviderBridge Error', error)
  // }

  render() {
    const { value: ctxValues, children } = this.props

    if (ctxValues.length === 0) {
      return children
    }

    const { ctxValue } = this.state
    const [{ ctx }, ...restValues] = ctxValues
    const { Provider } = ctx

    const nextChildren = !isUndefined(ctxValue) ? (
      <Provider value={ctxValue}>{children}</Provider>
    ) : (
      children
    )

    // 递归 ProviderBridge 修复多个上下文
    // 此处未考虑待修复上下文顺序问题，按先来后到顺序处理，但理论上不应存在顺序问题
    return restValues.length > 0 ? (
      <ProviderBridge value={restValues}>{nextChildren}</ProviderBridge>
    ) : (
      nextChildren
    )
  }
}

// 在 KeepAlive 位置使用待修复上下文的 Consumer 探测可能存在的上下文关系
// 若成功捕获上下文则保存其内容，用以后续 Keeper 中上下文的重建
class ConsumerWrapper extends PureComponent {
  updateListener = null
  ctxInfo = null
  constructor(props, ...args) {
    super(props, ...args)

    const { value, ctx, id } = props
    if (isUndefined(value)) {
      return
    }

    // 因 Consumer 探测器存在于 KeepAlive 外层故会随着 KeepAlive 卸载
    // componentWillUnmount 中保留了已生成的更新监听器
    // 此处重新挂载后恢复与对应 Keeper 中 ProviderBridge 的联系
    this.updateListener = get(updateListenerCache.get(ctx), id, new Map())
    this.ctxInfo = {
      ctx,
      value,
      // 注册上下文更新的监听，保证上下文更新时 Keeper 中 ProviderBridge 内容的同步
      onUpdate: updator => {
        this.updateListener.set(updator, updator)

        // 返回更新监听器的注销方法
        return () => this.updateListener.delete(updator)
      }
    }
  }

  componentWillUnmount() {
    const { value, ctx, id } = this.props
    if (isUndefined(value)) {
      return
    }

    // 因 Consumer 探测器存在于 KeepAlive 外层故会随着 KeepAlive 卸载
    // 此处保留其中已生成的更新监听器，用以在重新挂载后保持与对应 Keeper 中 ProviderBridge 的联系
    updateListenerCache.set(ctx, {
      ...get(updateListenerCache.get(ctx), undefined, {}),
      [id]: this.updateListener
    })
  }

  // 利用 shouldComponentUpdate 尽早将上下文更新的咨询通知到对应 Keeper 中 ProviderBridge
  // TODO: 改用 componentWillReceiveProps 更早地进行更新，需注意与 getDerivedStateFromProps 新生命周期的兼容及可能存在的死循环问题
  shouldComponentUpdate({ value }) {
    const { prevValue } = this.props
    const shouldUpdate = prevValue !== value

    if (shouldUpdate) {
      run(this.updateListener, 'forEach', fn => fn(value))
    }

    return shouldUpdate
  }

  render() {
    const { value, renderWrapper, renderContent, id } = this.props

    return renderWrapper(ctx$$ =>
      renderContent(isUndefined(value) ? ctx$$ : [...ctx$$, this.ctxInfo])
    )
  }
}

// 对 ConsumerWrapper 的递归结构，会在 devtool 中生成较深的嵌套结构，可用 hooks 消除嵌套结构
function RecursiveConsumerBridge({ children: renderChildren, id }) {
  const renderWrapper = fixedContext.reduce(
    (render, ctx) => {
      const { Consumer } = ctx

      const renderWrapper = renderContent => (
        <Consumer>
          {value => (
            <ConsumerWrapper
              {...{
                value,
                ctx,
                renderWrapper: render,
                renderContent,
                id
              }}
            />
          )}
        </Consumer>
      )

      return renderWrapper
    },
    renderContent => renderContent([])
  )

  return renderWrapper(renderChildren)
}

// 若支持 Hooks，就不需要递归了，相关实现解释可参考 ConsumerWrapper
function HooksConsumerBridge({ children: renderChildren, id }) {
  const context$$ = fixedContext
    .map(ctx => {
      const value = useContext(ctx)
      const prevValueRef = useRef(value)
      const { current: updateListener } = useRef(
        get(updateListenerCache.get(ctx), id, new Map())
      )

      // 尽可能早地进行更新
      if (prevValueRef.current !== value) {
        nextTick(() => run(updateListener, 'forEach', fn => fn(value)))
      }
      prevValueRef.current = value

      useEffect(() => {
        return () => {
          if (isUndefined(value)) {
            return
          }

          updateListenerCache.set(ctx, {
            ...get(updateListenerCache.get(ctx), undefined, {}),
            [id]: updateListener
          })
        }
      }, [])

      return {
        ctx,
        value,
        onUpdate: fn => {
          updateListener.set(fn, fn)

          return () => updateListener.delete(fn)
        }
      }
    })
    .filter(({ value }) => !isUndefined(value))

  return renderChildren(context$$)
}

export const ConsumerBridge = [useContext, useRef, useEffect].every(isFunction)
  ? HooksConsumerBridge
  : RecursiveConsumerBridge
