import React, { lazy, Suspense, Component, Fragment } from 'react'

import { get, run, isUndefined, isFunction } from '../../helpers'

const isSupported = isFunction(lazy) && !isUndefined(Suspense)
const SuspenseNotSupported = ({ children }) => run(children)

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
            {this.state.suspense && <Lazy />}
          </Fragment>
        )
      }
    }
  : SuspenseNotSupported

export default (isSupported ? SuspenseBridge : SuspenseNotSupported)
