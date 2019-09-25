import React, { Component } from 'react'

import { get, run, nextTick } from '../helpers'

import Bridge from './Bridge'
import { AliveNodeProvider } from './context'
import { LIFECYCLE_ACTIVATE, LIFECYCLE_UNACTIVATE } from './lifecycles'

export default class Keeper extends Component {
  listeners = new Map()
  wrapper = null
  componentDidMount() {
    const { store, id } = this.props
    const listeners = this.listeners
    const node = this.wrapper

    // 已存在检测，防止意外现象
    if (store.has(id)) {
      return
    }

    store.set(id, {
      listeners,
      aliveNodesId: [],
      inited: false,
      cached: false,
      wrapper: node,
      nodes: [...node.children],
      [LIFECYCLE_ACTIVATE]: () => this[LIFECYCLE_ACTIVATE](),
      [LIFECYCLE_UNACTIVATE]: () => this[LIFECYCLE_UNACTIVATE]()
    })
  }

  componentWillUnmount() {
    const { store, id } = this.props
    store.delete(id)
  }

  [LIFECYCLE_ACTIVATE]() {
    this.listeners.forEach(listener => run(listener, [LIFECYCLE_ACTIVATE]))
  }

  [LIFECYCLE_UNACTIVATE]() {
    const listeners = [...this.listeners]

    listeners
      .reverse()
      .forEach(([, listener]) => run(listener, [LIFECYCLE_UNACTIVATE]))
  }

  // // 原先打算更新过程中先重置 dom 节点状态，更新后恢复 dom 节点
  // // 但考虑到性能消耗可能过大，且可能因 dom 操作时机引发其他 react 渲染问题，故不使用
  // // 对应 KeepAlive 处 update 也注释起来不使用
  // // 组件更新后，更新 DOM 节点列表状态
  // componentDidUpdate() {
  //   const { store, id } = this.props
  //   const node = this.wrapper
  //   if (get(node, 'children.length') > 0) {
  //     store[id].nodes = [...node.children]
  //   }

  //   console.log(store[id].nodes)
  // }

  // 生命周期绑定
  attach = ref => {
    const listeners = this.listeners

    if (!ref) {
      return () => null
    }

    if (ref.isKeepAlive) {
      nextTick(() => {
        const { id, store } = this.props
        const cache = store.get(id)
        cache.aliveNodesId = new Set([...cache.aliveNodesId, ref.id])
      })
    }

    listeners.set(ref, {
      [LIFECYCLE_ACTIVATE]: () => run(ref, LIFECYCLE_ACTIVATE),
      [LIFECYCLE_UNACTIVATE]: () => run(ref, LIFECYCLE_UNACTIVATE)
    })

    // 返回 listenerRemover 用以在对应组件卸载时解除监听
    return () => {
      listeners.delete(ref)
    }
  }

  // 静态化节点上下文内容，防止重复渲染
  contextValue = {
    id: this.props.id,
    attach: this.attach
  }

  render() {
    const { id, children, bridgeProps, ...props } = this.props

    return (
      <div
        ref={node => {
          this.wrapper = node
        }}
      >
        <div key="keeper-container">
          <Bridge id={id} bridgeProps={bridgeProps}>
            <AliveNodeProvider value={this.contextValue}>
              {children}
            </AliveNodeProvider>
          </Bridge>
        </div>
      </div>
    )
  }
}
