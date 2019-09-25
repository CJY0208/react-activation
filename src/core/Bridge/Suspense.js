import React, { lazy, Suspense, Component, Fragment } from 'react'

import { run, isUndefined, isFunction } from '../../helpers'

// 兼容性检测
const isSupported = isFunction(lazy) && !isUndefined(Suspense)
const SusNotSupported = ({ children }) => run(children)

const Lazy = isSupported ? lazy(() => new Promise(() => null)) : () => null

class FallbackListener extends Component {
  componentDidMount() {
    run(this.props, 'onStart')
  }

  componentWillUnmount() {
    run(this.props, 'onEnd')
  }

  render() {
    return null
  }
}

function SuspenseBridge({ children, sus$$ }) {
  return (
    // 捕获 Keeper 内部可能存在的 lazy，并触发对应 KeepAlive 位置上的 LazyBridge
    <Suspense
      fallback={
        <FallbackListener
          onStart={sus$$.onSuspenseStart}
          onEnd={sus$$.onSuspenseEnd}
        />
      }
    >
      {children}
    </Suspense>
  )
}

export const LazyBridge = isSupported
  ? class LazyBridge extends Component {
      state = {
        suspense: false
      }

      onSuspenseStart = () => {
        this.setState({
          suspense: true
        })
      }

      onSuspenseEnd = () => {
        this.setState({
          suspense: false
        })
      }

      sus$$ = {
        onSuspenseStart: this.onSuspenseStart,
        onSuspenseEnd: this.onSuspenseEnd
      }

      render() {
        const { children } = this.props

        return (
          <Fragment>
            {run(children, undefined, this.sus$$)}
            {/* 渲染 Lazy 以触发 KeepAlive 所处位置外部可能存在的 Suspense */}
            {this.state.suspense && <Lazy />}
          </Fragment>
        )
      }
    }
  : SusNotSupported

export default (isSupported ? SuspenseBridge : SusNotSupported)
