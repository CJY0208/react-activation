/* eslint-disable react-hooks/rules-of-hooks */
import React, {
  PureComponent,
  useContext,
  useRef,
  useEffect,
  useState,
} from 'react'
import { run, get, nextTick, isUndefined, isFunction } from 'szfe-tools'

import ConsumerWrapper from './ConsumerWrapper'
import { fixedContext, eventBus, updateListenerCache } from './fixContext'

const fixedContextSnapshot = {}

// 对 ConsumerWrapper 的递归结构，会在 devtool 中生成较深的嵌套结构，可用 hooks 消除嵌套结构
class RecursiveConsumerBridge extends PureComponent {
  constructor(props) {
    super(props)
    const { id } = props

    if (!fixedContextSnapshot[id]) {
      fixedContextSnapshot[id] = [...fixedContext]
    }
  }

  renderWrapper = (renderChildren) => {
    const { id } = this.props

    const renderWrapper = fixedContextSnapshot[id].reduce(
      (render, ctx) => {
        const { Consumer } = ctx

        const renderWrapper = (renderContent) => (
          <Consumer>
            {(value) => (
              <ConsumerWrapper
                {...{
                  value,
                  ctx,
                  renderWrapper: render,
                  renderContent,
                  id,
                }}
              />
            )}
          </Consumer>
        )

        return renderWrapper
      },
      (renderContent) => renderContent([])
    )

    return renderWrapper(renderChildren)
  }

  render() {
    const { children: renderChildren } = this.props

    return this.renderWrapper(renderChildren)
  }
}

// 若支持 Hooks，就不需要递归了，相关实现解释可参考 ConsumerWrapper
// function HooksConsumerBridge({ children: renderChildren, id }) {
//   const [, setRenderKey] = useState(Math.random)

//   useEffect(() => {
//     // 渲染时若 fixedContext 列表更新，则需强制刷新
//     const updateListener = () => setRenderKey(Math.random)
//     eventBus.on('update', updateListener)
//     return () => {
//       eventBus.off('update', updateListener)
//     }
//   }, [])

//   const context$$ = fixedContext
//     .map((ctx) => {
//       const value = useContext(ctx)
//       const prevValueRef = useRef(value)
//       const { current: updateListener } = useRef(
//         get(updateListenerCache.get(ctx), id, new Map())
//       )

//       // 尽可能早地进行更新
//       if (prevValueRef.current !== value) {
//         nextTick(() => run(updateListener, 'forEach', (fn) => fn(value)))
//       }
//       prevValueRef.current = value

//       useEffect(() => {
//         return () => {
//           if (isUndefined(value)) {
//             return
//           }

//           updateListenerCache.set(ctx, {
//             ...get(updateListenerCache.get(ctx), undefined, {}),
//             [id]: updateListener,
//           })
//         }
//       }, [])

//       return {
//         ctx,
//         value,
//         onUpdate: (fn) => {
//           updateListener.set(fn, fn)

//           return () => updateListener.delete(fn)
//         },
//       }
//     })
//     .filter(({ value }) => !isUndefined(value))

//   return renderChildren(context$$)
// }

// fix #99
// const ConsumerBridge = [useContext, useRef, useEffect].every(isFunction)
//   ? HooksConsumerBridge
//   : RecursiveConsumerBridge
// fix #99
export default RecursiveConsumerBridge
