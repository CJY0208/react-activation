import React, { Component } from 'react'

import { get, flatten, isRegExp } from '../helpers'

import { AliveScopeProvider } from './context'
import Keeper from './Keeper'

export default class AliveScope extends Component {
  store = new Map()
  nodes = new Map()

  update = (id, { name, children, ctx$$ }) =>
    new Promise(resolve => {
      this.nodes.set(id, {
        id,
        name,
        children,
        ctx$$
      })

      this.forceUpdate(resolve)
    })
  keep = (id, params) =>
    new Promise(resolve => {
      const isNew = !this.nodes.has(id)

      if (isNew) {
        this.helpers = { ...this.helpers }
      }

      this.update(id, {
        id,
        ...params
      }).then(() => {
        resolve(this.store.get(id))
      })
    })

  getCachingNodesByName = name =>
    this.getCachingNodes().filter(node =>
      isRegExp(name) ? name.test(node.name) : node.name === name
    )

  drop = name =>
    this.dropNodes(this.getCachingNodesByName(name).map(node => node.id))

  dropScope = name => {
    const getCachingNodesId = id => {
      const aliveNodesId = get(this.getCache(id), 'aliveNodesId', [])

      if (aliveNodesId.size > 0) {
        return [id, [...aliveNodesId].map(getCachingNodesId)]
      }

      return [id, ...aliveNodesId]
    }

    return this.dropNodes(
      flatten(
        this.getCachingNodesByName(name).map(({ id }) => getCachingNodesId(id))
      )
    )
  }

  dropNodes = nodesId =>
    new Promise(resolve => {
      const willDropIds = nodesId
        .filter(id => {
          const cache = this.store.get(id)
          const canDrop = get(cache, 'cached')

          if (canDrop) {
            // 用在多层 KeepAlive 同时触发 drop 时，避免触发深层 KeepAlive 节点的缓存生命周期
            cache.willDrop = true
          }

          return canDrop
        })
        .map(id => {
          this.nodes.delete(id)

          return id
        })

      this.helpers = { ...this.helpers }
      this.forceUpdate(() => {
        resolve()

        willDropIds.map(id => {
          this.store.delete(id)
        })
      })
    })

  clear = () => this.dropNodes(this.getCachingNodes().map(({ id }) => id))

  getCache = id => this.store.get(id)
  getCachingNodes = () => [...this.nodes.values()]

  // 静态化节点上下文内容，防止重复渲染
  helpers = {
    keep: this.keep,
    update: this.update,
    drop: this.drop,
    dropScope: this.dropScope,
    clear: this.clear,
    getCache: this.getCache,
    getCachingNodes: this.getCachingNodes
  }

  render() {
    const { children } = this.props

    return (
      <AliveScopeProvider value={this.helpers}>
        {children}
        <div>
          {[...this.nodes.values()].map(({ children, ...props }) => (
            <Keeper key={props.id} {...props} store={this.store}>
              {children}
            </Keeper>
          ))}
        </div>
      </AliveScopeProvider>
    )
  }
}
