import React, { Component } from 'react'
import { get, run, flatten, debounce, globalThis as root } from 'szfe-tools'

import { isRegExp } from '../helpers/is'
import { AliveScopeProvider } from './context'
import Keeper from './Keeper'

const HANDLE_TYPE_DROP = 'drop'
const HANDLE_TYPE_REFRESH = 'refresh'

export default class AliveScope extends Component {
  store = new Map()
  nodes = new Map()
  keepers = new Map()

  debouncedForceUpdate = debounce((cb) => this.forceUpdate(cb))
  updateCallbackList = []
  smartForceUpdate = (cb) => {
    this.updateCallbackList.push(cb)
    this.debouncedForceUpdate(() => {
      this.updateCallbackList.forEach((cb) => run(cb))
      this.updateCallbackList = []
    })
  }
  update = (id, params) =>
    new Promise((resolve) => {
      const keeper = this.keepers.get(id)
      const isNew = !keeper
      const now = Date.now()
      const node = this.nodes.get(id) || null
      this.nodes.set(id, {
        id,
        createTime: now,
        updateTime: now,
        ...node,
        ...params,
      })

      if (isNew) {
        this.helpers = { ...this.helpers }

        this.forceUpdate(resolve)
      } else {
        const { children, bridgeProps } = params
        keeper.setState({ children, bridgeProps }, resolve)
      }
    })

  keep = (id, params) =>
    new Promise((resolve) => {
      this.update(id, {
        id,
        ...params,
      }).then(() => {
        resolve(this.store.get(id))
      })
    })

  getCachingNodesByName = (name) =>
    this.getCachingNodes().filter((node) =>
      isRegExp(name) ? name.test(node.name) : node.name === name
    )

  getScopeIds = (ids) => {
    // 递归采集 scope alive nodes id
    const getCachingNodesId = (id) => {
      const aliveNodesId = get(this.getCache(id), 'aliveNodesId', [])

      if (aliveNodesId.size > 0) {
        return [id, [...aliveNodesId].map(getCachingNodesId)]
      }

      return [id, ...aliveNodesId]
    }

    return flatten(ids.map((id) => getCachingNodesId(id)))
  }

  dropById = (id, ...rest) => this.handleNodes([id], HANDLE_TYPE_DROP, ...rest)
  dropScopeByIds = (ids, ...rest) =>
    this.handleNodes(this.getScopeIds(ids), HANDLE_TYPE_DROP, ...rest)

  drop = (name, ...rest) =>
    this.handleNodes(
      this.getCachingNodesByName(name).map((node) => node.id),
      HANDLE_TYPE_DROP,
      ...rest
    )

  dropScope = (name, ...rest) =>
    this.dropScopeByIds(
      this.getCachingNodesByName(name).map(({ id }) => id),
      ...rest
    )

  refreshById = (id, ...rest) =>
    this.handleNodes([id], HANDLE_TYPE_REFRESH, ...rest)
  refreshScopeByIds = (ids, ...rest) =>
    this.handleNodes(this.getScopeIds(ids), HANDLE_TYPE_REFRESH, ...rest)

  refresh = (name, ...rest) =>
    this.handleNodes(
      this.getCachingNodesByName(name).map((node) => node.id),
      HANDLE_TYPE_REFRESH,
      ...rest
    )

  refreshScope = (name, ...rest) =>
    this.refreshScopeByIds(
      this.getCachingNodesByName(name).map(({ id }) => id),
      ...rest
    )

  handleNodes = (nodesId, type = HANDLE_TYPE_DROP, ...rest) =>
    new Promise((resolve) => {
      const handleKeepers = []

      nodesId.forEach((id) => {
        const cache = this.store.get(id)

        if (!cache) {
          return
        }

        const keeper = this.keepers.get(id)
        handleKeepers.push(keeper)
      })

      if (handleKeepers.length === 0) {
        resolve(false)
        return
      }

      Promise.all(
        handleKeepers.map((keeper) => run(keeper, type, ...rest))
      ).then((responses) => resolve(responses.every(Boolean)))
    })

  clear = (...rest) =>
    this.handleNodes(
      this.getCachingNodes().map(({ id }) => id),
      HANDLE_TYPE_DROP,
      ...rest
    )

  getCache = (id) => this.store.get(id)
  getNode = (id) => this.nodes.get(id)
  getCachingNodes = () => [...this.nodes.values()]

  // 静态化节点上下文内容，防止重复渲染
  helpers = {
    keep: this.keep,
    update: this.update,
    drop: this.drop,
    dropScope: this.dropScope,
    dropById: this.dropById,
    dropScopeByIds: this.dropScopeByIds,
    refresh: this.refresh,
    refreshScope: this.refreshScope,
    refreshById: this.refreshById,
    refreshScopeByIds: this.refreshScopeByIds,
    getScopeIds: this.getScopeIds,
    clear: this.clear,
    getCache: this.getCache,
    getNode: this.getNode,
    getCachingNodes: this.getCachingNodes,
  }

  render() {
    const { children = null } = this.props

    return (
      <AliveScopeProvider value={this.helpers}>
        {children}
        <div style={{ display: 'none' }}>
          {[...this.nodes.values()].map(({ children, ...props }) => (
            <Keeper
              key={props.id}
              {...props}
              scope={this}
              store={this.store}
              keepers={this.keepers}
              ref={(keeper) => {
                this.keepers.set(props.id, keeper)
              }}
            >
              {children}
            </Keeper>
          ))}
        </div>
      </AliveScopeProvider>
    )
  }
}
