import { Component } from 'react'

import { run } from '../helpers'

import getKeyByFiberNode from './getKeyByFiberNode'

// 根据 FiberNode 所处位置来确定 KeepAlive ID
export default class AliveIdProvider extends Component {
  id = null
  genId = () => {
    const { prefix = '' } = this.props
    this.id = `${prefix}${getKeyByFiberNode(this._reactInternalFiber)}`
    return this.id
  }

  render() {
    const { children } = this.props

    return run(children, undefined, this.id || this.genId())
  }
}
