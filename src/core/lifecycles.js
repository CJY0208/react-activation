import React, {
  Component,
  forwardRef,
  useEffect,
  useRef,
  useContext
} from 'react'
import hoistStatics from 'hoist-non-react-statics'

import {
  get,
  run,
  nextTick,
  isObject,
  isFunction,
  isUndefined
} from '../helpers'

import { AliveNodeConsumer, aliveNodeContext } from './context'

export const LIFECYCLE_ACTIVATE = 'componentDidActivate'
export const LIFECYCLE_UNACTIVATE = 'componentWillUnactivate'

export const withActivation = WrappedComponent => {
  class HOC extends Component {
    drop = null

    componentWillUnmount() {
      run(this.drop)
    }

    render() {
      const { forwardedRef, ...props } = this.props

      return (
        <AliveNodeConsumer>
          {({ attach } = {}) => (
            <WrappedComponent
              ref={ref => {
                if (
                  [LIFECYCLE_ACTIVATE, LIFECYCLE_UNACTIVATE].every(
                    lifecycleName => !isFunction(get(ref, lifecycleName))
                  )
                ) {
                  return
                }
                this.drop = run(attach, undefined, ref)

                // 以下保持 ref 功能
                if (isUndefined(forwardedRef)) {
                  return
                }

                if (isObject(forwardedRef) && 'current' in forwardedRef) {
                  forwardedRef.current = ref
                  return
                }

                run(forwardedRef, undefined, ref)
              }}
              {...props}
            />
          )}
        </AliveNodeConsumer>
      )
    }
  }

  // 由于 KeepAlive 内组件渲染与实际内容落后一个节拍
  // 将导致真实节点的 componentDidMount 无法及时获取到 KeepAlive 中内容的 ref 值
  // 此处对使用了 withActivation HOC 的组件 componentDidMount 做 nextTick 延时处理
  // 修复上述问题

  if (isFunction(WrappedComponent.prototype.componentDidMount)) {
    WrappedComponent.prototype._componentDidMount =
      WrappedComponent.prototype.componentDidMount
    WrappedComponent.prototype.componentDidMount = function componentDidMount() {
      nextTick(() => WrappedComponent.prototype._componentDidMount.call(this))
    }
  }

  if (isFunction(forwardRef)) {
    const ForwardedRefHOC = forwardRef((props, ref) => (
      <HOC {...props} forwardedRef={ref} />
    ))

    return hoistStatics(ForwardedRefHOC, WrappedComponent)
  } else {
    return hoistStatics(HOC, WrappedComponent)
  }
}

const useActivation = (funcName, func) => {
  // 兼容性判断
  if ([useRef, useContext, useEffect].some(fn => !isFunction(fn))) {
    return
  }

  const ctxValue = useContext(aliveNodeContext)

  // 未处于 KeepAlive 中
  if (!ctxValue) {
    return
  }

  const { current: ref } = useRef({})
  const { attach } = ctxValue

  ref[funcName] = func
  ref.drop = attach(ref)

  useEffect(() => {
    return () => run(ref.drop)
  }, [])
}

export const useActivate = useActivation.bind(null, LIFECYCLE_ACTIVATE)
export const useUnactivate = useActivation.bind(null, LIFECYCLE_UNACTIVATE)
