import React, { Component } from 'react'

import { run } from '../../helpers'

export default class ErrorBoundaryBridge extends Component {
  // Error Boundary 透传至对应 KeepAlive 实例
  static getDerivedStateFromError = error => null
  componentDidCatch(error) {
    const { error$$: throwError } = this.props

    run(throwError, undefined, error)
  }

  render() {
    return this.props.children
  }
}

export class ErrorThrower extends Component {
  state = {
    error: null
  }

  throwError = error => this.setState({ error })
  render() {
    if (this.state.error) {
      throw this.state.error
    }

    return run(this.props.children, undefined, this.throwError)
  }
}
