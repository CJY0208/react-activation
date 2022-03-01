import React, { PureComponent, Suspense } from 'react'
import { get, run, nextTick, EventBus } from 'szfe-tools'

import ReactFreeze from './Freeze'
import Bridge from './Bridge'
import { AliveNodeProvider } from './context'
import { LIFECYCLE_ACTIVATE, LIFECYCLE_UNACTIVATE } from './lifecycles'

const Freeze = !!Suspense ? ReactFreeze : ({ children }) => children

export default class Keeper extends PureComponent {
  eventBus = new EventBus()
  listeners = new Map()
  wrapper = null

  constructor(props, ...rest) {
    super(props, ...rest)

    this.state = {
      children: props.children,
      bridgeProps: props.bridgeProps,
      key: Math.random(),
      freeze: false,
    }
  }

  cache = undefined
  componentDidMount() {
    const { store, id } = this.props
    const listeners = this.listeners
    const node = this.wrapper

    // 已存在检测，防止意外现象
    if (store.has(id)) {
      return
    }

    let nodes
    try {
      nodes = [...node.children]
    } catch (e) {
      nodes = [node.children]
    }

    this.cache = {
      listeners,
      aliveNodesId: [],
      inited: false,
      cached: false,
      wrapper: node,
      nodes,
      [LIFECYCLE_ACTIVATE]: () => this[LIFECYCLE_ACTIVATE](),
      [LIFECYCLE_UNACTIVATE]: () => this[LIFECYCLE_UNACTIVATE](),
    }

    store.set(id, this.cache)
  }

  
  unmounted = false
  safeSetState = (nextState, callback) => {
    // fix #170
    if (this.unmounted) {
      return
    }
    this.setState(nextState, callback)
  }
  componentWillUnmount() {
    const { store, keepers, id } = this.props
    // 卸载前尝试归位 DOM 节点
    try {
      const cache = store.get(id)
      cache.nodes.forEach((node) => {
        cache.wrapper.appendChild(node)
      })
    } catch (error) {
      // console.error(error) // do nothing
    }
    store.delete(id)
    keepers.delete(id)
    this.unmounted = true
  }

  freezeTimeout = null

  ;[LIFECYCLE_ACTIVATE]() {
    clearTimeout(this.freezeTimeout)
    // 激活后，立即解冻
    this.safeSetState({
      freeze: false,
    })
    this.eventBus.emit(LIFECYCLE_ACTIVATE)
    this.listeners.forEach((listener) => run(listener, [LIFECYCLE_ACTIVATE]))
  }

  ;[LIFECYCLE_UNACTIVATE]() {
    this.eventBus.emit(LIFECYCLE_UNACTIVATE)
    const listeners = [...this.listeners]

    listeners
      .reverse()
      .forEach(([, listener]) => run(listener, [LIFECYCLE_UNACTIVATE]))

    // 缓存后，延迟冻结，保证各项后续处理得以进行，如关闭弹窗等
    clearTimeout(this.freezeTimeout)
    this.freezeTimeout = setTimeout(() => {
      this.safeSetState({
        freeze: true,
      })
    }, 1000)
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
  attach = (ref) => {
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
      [LIFECYCLE_UNACTIVATE]: () => run(ref, LIFECYCLE_UNACTIVATE),
    })

    // 返回 listenerRemover 用以在对应组件卸载时解除监听
    return () => {
      listeners.delete(ref)
    }
  }

  // 静态化节点上下文内容，防止重复渲染
  contextValue = {
    id: this.props.id,
    attach: this.attach,
  }

  drop = ({ delay = 1200 } = {}) =>
    new Promise((resolve) => {
      let timeout
      const { scope, id } = this.props
      const drop = () => {
        clearTimeout(timeout)
        this.eventBus.off(LIFECYCLE_UNACTIVATE, drop)
        // 用在多层 KeepAlive 同时触发 drop 时，避免触发深层 KeepAlive 节点的缓存生命周期
        this.cache.willDrop = true
        scope.nodes.delete(id)
        scope.helpers = { ...scope.helpers }
        scope.smartForceUpdate(() => resolve(true))
      }

      const canDrop = get(this.cache, 'cached') || get(this.cache, 'willDrop')
      if (!canDrop) {
        this.eventBus.on(LIFECYCLE_UNACTIVATE, drop)
        timeout = setTimeout(() => {
          this.eventBus.off(LIFECYCLE_UNACTIVATE, drop)
          resolve(false)
        }, delay)
        return
      }

      drop()
    })

  refresh = () =>
    new Promise((resolve) => {
      const canRefresh = !get(this.cache, 'cached')
      if (!canRefresh) {
        resolve(false)
      }
      this.safeSetState(
        {
          key: Math.random(),
        },
        () => resolve(true)
      )
    })

  render() {
    const { id, ...props } = this.props
    const { children, bridgeProps, key, freeze } = this.state

    return (
      <Freeze freeze={freeze}>
        <div
          ref={(node) => {
            this.wrapper = node
          }}
        >
          <div key="keeper-container" nodeKeyIgnore className="ka-content">
            <Bridge id={id} bridgeProps={bridgeProps}>
              <AliveNodeProvider value={this.contextValue}>
                {React.Children.map(children, (child, idx) =>
                  React.cloneElement(child, {
                    key: `${child.key || ''}:${key}:${idx}`,
                  })
                )}
              </AliveNodeProvider>
            </Bridge>
          </div>
        </div>
      </Freeze>
    )
  }
}
