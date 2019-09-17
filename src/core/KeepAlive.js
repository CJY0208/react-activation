import React, { Component } from 'react'

import {
  get,
  run,
  globalThis as root,
  nextTick,
  isFunction,
  isArray,
  debounce
} from '../helpers'

import { expandKeepAlive } from './withAliveScope'
import {
  LIFECYCLE_ACTIVATE,
  LIFECYCLE_UNACTIVATE,
  withActivation
} from './lifecycles'
import saveScrollPosition from '../helpers/saveScrollPosition'

const getErrorTips = name =>
  `<KeepAlive ${
    name ? `name="${name}" ` : ''
  }/>  瞬时更新次数过多，可能遇到了更新的死循环，已强制暂停更新
您现在可见的更新结果存在严重的性能问题
可能遇到了隐含的 bug，请不要使用 KeepAlive 并联系作者解决`

const parseWhenResult = res => {
  if (isArray(res)) {
    return res
  }

  return [res]
}

class KeepAlive extends Component {
  // 本段为 KeepAlive 更新隐患检测，通过检测 KeepAlive 瞬时更新次数来判断是否进入死循环，并在 update 中强制阻止更新
  updateTimes = 0
  errorTips = debounce(() => {
    const { name } = this.props
    console.error(getErrorTips(name))
  }, 100)
  releaseUpdateTimes = debounce(() => {
    this.updateTimes = 0
  }, 32)
  needForceStopUpdate = () => {
    const needForceStopUpdate = this.updateTimes > 16

    if (needForceStopUpdate) {
      this.errorTips()
    }

    this.updateTimes++
    this.releaseUpdateTimes()

    return needForceStopUpdate
  }

  id = null // 用作 Keeper 识别 KeepAlive
  isKeepAlive = true // 用作 Keeper 识别 KeepAlive
  constructor(props) {
    super(props)
    this.id = props.id
    this.init()

    // 继承响应父级 KeepAlive 的生命周期
    ;[LIFECYCLE_ACTIVATE, LIFECYCLE_UNACTIVATE].forEach(lifecycleName => {
      this[lifecycleName] = () => {
        const { id, _helpers } = this.props
        const cache = _helpers.getCache(id)
        const node = _helpers.getNode(id)
        if (node) {
          node.updateTime = Date.now()
        }

        // 若组件即将卸载则不再触发缓存生命周期
        if (!cache || cache.willDrop) {
          return
        }
        run(cache, lifecycleName)
        cache.cached = lifecycleName === LIFECYCLE_UNACTIVATE
      }
    })
  }

  // DOM 操作将实际内容插入占位元素
  inject = (didActivate = true) => {
    const { id, _helpers } = this.props
    const cache = _helpers.getCache(id)
    // DOM 操作有风险，try catch 护体
    try {
      // // 原计划不增加额外的节点，直接将 Keeper 中所有内容节点一一迁移
      // // 后发现缺乏统一 react 认可的外层包裹，可能会造成 react dom 操作的错误
      // // 且将导致 KeepAlive 进行 update 时需先恢复各 dom 节点的组件归属，成本过高
      // // 故此处增加统一的 div 外层，Keeper 中与 KeepAlive 中各一个且外层不做移除处理
      // this.parentNode = this.placeholder.parentNode
      // cache.nodes.forEach(node => {
      //   this.parentNode.insertBefore(node, this.placeholder)
      // })
      // this.parentNode.removeChild(this.placeholder)
      // 将 AliveScopeProvider 中的渲染内容通过 dom 操作置回当前 KeepAlive
      cache.nodes.forEach(node => {
        this.placeholder.appendChild(node)
      })

      if (didActivate) {
        // 恢复该节点下各可滚动元素的滚动位置
        run(cache.revertScrollPos)
      }
    } catch (error) {
      console.error(error)
    }
  }

  // DOM 操作将实际内容移出占位元素
  eject = (willUnactivate = true) => {
    const { id, _helpers } = this.props
    const cache = _helpers.getCache(id)

    // DOM 操作有风险，try catch 护体
    try {
      if (willUnactivate) {
        // 保存该节点下各可滚动元素的滚动位置
        cache.revertScrollPos = saveScrollPosition(cache.nodes)
      }

      //
      // // 原计划不增加额外的节点，直接将 Keeper 中所有内容节点一一迁移
      // // 后发现缺乏统一 react 认可的外层包裹，可能会造成 react dom 操作的错误
      // // 且将导致 KeepAlive 进行 update 时需先恢复各 dom 节点的组件归属，成本过高
      // // 故此处增加统一的 div 外层，Keeper 中与 KeepAlive 中各一个且外层不做移除处理
      // this.parentNode.insertBefore(this.placeholder, cache.nodes[0])
      // cache.nodes.forEach(node => {
      //   if (willUnactivate) {
      //     this.parentNode.removeChild(node)
      //   } else {
      //     cache.wrapper.appendChild(node)
      //   }
      // })
      // this.parentNode.insertBefore(this.placeholder, cache.nodes[0])
      // 将 KeepAlive 中的节点恢复为原先的占位节点，保证卸载操作正常进行
      cache.nodes.forEach(node => {
        if (willUnactivate) {
          this.placeholder.removeChild(node)
        } else {
          cache.wrapper.appendChild(node)
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  init = () => {
    const { _helpers, id, children, ...rest } = this.props

    // 将 children 渲染至 AliveScopeProvider 中
    _helpers
      .keep(id, {
        children,
        getInstance: () => this,
        ...rest
      })
      .then(cache => {
        this.inject()

        // 触发 didActivate 生命周期
        if (cache.inited) {
          run(this, LIFECYCLE_ACTIVATE)
        } else {
          cache.inited = true
        }
      })
  }

  update = ({ _helpers, id, name, ...rest }) => {
    if (this.needForceStopUpdate(name)) {
      return
    }

    // // 原先打算更新过程中先重置 dom 节点状态，更新后恢复 dom 节点
    // // 但考虑到性能消耗可能过大，且可能因 dom 操作时机引发其他 react 渲染问题，故不使用
    // // 对应 Keeper 处 componentDidUpdate 也注释起来不使用
    // this.eject(false)
    _helpers.update(id, {
      name,
      getInstance: () => this,
      ...rest
    })
    // this.inject(false)
  }

  // 利用 shouldComponentUpdate 提前触发组件更新
  shouldComponentUpdate(nextProps) {
    this.update(nextProps)

    return false
  }

  // 组件卸载时重置 dom 状态，保证 react dom 操作正常进行，并触发 unactivate 生命周期
  componentWillUnmount() {
    const { id, _helpers, when: calcWhen = true } = this.props
    const cache = _helpers.getCache(id)
    const [when, isScope] = parseWhenResult(run(calcWhen))

    if (!cache) {
      return
    }

    this.eject()
    delete cache.getInstance

    if (!when) {
      if (isScope) {
        const needToDrop = [
          cache,
          ..._helpers.getScopeIds([id]).map(id => _helpers.getCache(id))
        ]

        needToDrop.forEach(cache => {
          cache.cached = true
          cache.willDrop = true
        })
        nextTick(() => _helpers.dropScopeByIds([id]))
      } else {
        cache.cached = true
        cache.willDrop = true
        nextTick(() => _helpers.dropById(id))
      }
    }

    // 触发 willUnactivate 生命周期
    run(this, LIFECYCLE_UNACTIVATE)
  }

  render() {
    return (
      <div
        key="keep-alive-placeholder"
        ref={node => {
          this.placeholder = node
        }}
      />
    )
  }
}

// 兼容 SSR 服务端渲染
function SSRKeepAlive({ children }) {
  return (
    <div key="keep-alive-placeholder">
      <div key="keeper-container">{children}</div>
    </div>
  )
}

export default (isFunction(get(root, 'document.getElementById'))
  ? expandKeepAlive(withActivation(KeepAlive))
  : SSRKeepAlive)
