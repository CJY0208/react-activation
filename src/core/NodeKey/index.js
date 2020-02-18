import { Component } from 'react'

import { run } from '../../helpers'

import getKeyByFiberNode from './getKeyByFiberNode'
import getKeyByPreactNode from './getKeyByPreactNode'

let type

// 根据 FiberNode 所处位置来确定 NodeKey
export default class NodeKey extends Component {
  key = null
  genKey = () => {
    if (!type) {
      if (this._reactInternalFiber) {
        type = 'React'
      }

      // TODO: May "preact/compat" mode only, not verified yet.
      if (this.__v) {
        type = 'Preact'
      }
    }

    switch (type) {
      case 'Preact': {
        this.key = getKeyByPreactNode(this.__v)
        break
      }
      case 'React': {
        this.key = getKeyByFiberNode(this._reactInternalFiber)
        break
      }
      default: {
        break
      }
    }

    return this.key
  }

  render() {
    const { children, prefix = '' } = this.props

    return run(children, undefined, `${prefix}${this.key || this.genKey()}`)
  }
}
