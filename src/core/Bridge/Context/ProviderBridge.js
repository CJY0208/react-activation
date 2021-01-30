import React, { PureComponent } from 'react'
import { run, isUndefined } from 'szfe-tools'

export default class ProviderBridge extends PureComponent {
  unmount = null
  constructor(props) {
    super(props)

    const { value: ctxValues } = props

    if (ctxValues.length === 0) {
      this.state = {
        ctxValue: null,
      }

      return
    }

    const [{ ctx, value, onUpdate }] = ctxValues

    this.state = {
      ctxValue: value,
    }

    this.unmount = onUpdate((value) => {
      this.setState({
        ctxValue: value,
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
