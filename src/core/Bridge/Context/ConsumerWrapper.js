import { Component } from 'react'
import { run, get, isUndefined } from 'szfe-tools'

import { updateListenerCache } from './fixContext'

// 在 KeepAlive 位置使用待修复上下文的 Consumer 探测可能存在的上下文关系
// 若成功捕获上下文则保存其内容，用以后续 Keeper 中上下文的重建
export default class ConsumerWrapper extends Component {
  updateListener = null
  ctxInfo = null
  constructor(props) {
    super(props)

    const { value, ctx, id } = props
    if (isUndefined(value)) {
      return
    }

    // 因 Consumer 探测器存在于 KeepAlive 外层故会随着 KeepAlive 卸载
    // componentWillUnmount 中保留了已生成的更新监听器
    // 此处重新挂载后恢复与对应 Keeper 中 ProviderBridge 的联系
    this.updateListener = get(updateListenerCache.get(ctx), id, new Map())
    run(this.updateListener, 'forEach', (fn) => fn(value))
    this.ctxInfo = {
      ctx,
      value,
      // 注册上下文更新的监听，保证上下文更新时 Keeper 中 ProviderBridge 内容的同步
      onUpdate: (updator) => {
        this.updateListener.set(updator, updator)

        // 返回更新监听器的注销方法
        return () => this.updateListener.delete(updator)
      },
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
      [id]: this.updateListener,
    })
  }

  // 利用 shouldComponentUpdate 尽早将上下文更新的咨询通知到对应 Keeper 中 ProviderBridge
  // TODO: 改用 componentWillReceiveProps 更早地进行更新，需注意与 getDerivedStateFromProps 新生命周期的兼容及可能存在的死循环问题
  shouldComponentUpdate({ value }) {
    const { value: prevValue } = this.props
    const shouldUpdate = prevValue !== value

    if (shouldUpdate) {
      run(this.updateListener, 'forEach', (fn) => fn(value))
    }

    return true
  }

  render() {
    const { value, renderWrapper, renderContent, id } = this.props

    return renderWrapper((ctx$$) =>
      renderContent(isUndefined(value) ? ctx$$ : [...ctx$$, this.ctxInfo])
    )
  }
}
