import { Component } from 'react'

import { run } from '../../helpers'

export default class ErrorBoundaryBridge extends Component {
  // Error Boundary 透传至对应 KeepAlive 实例位置
  static getDerivedStateFromError = () => null
  componentDidCatch(error) {
    const { error$$: throwError } = this.props

    run(throwError, undefined, error, () => {
      run(throwError, undefined, null)
    })
  }

  render() {
    return this.props.children
  }
}

export class ErrorThrower extends Component {
  state = {
    error: null
  }

  throwError = (error, cb) => this.setState({ error }, cb)
  render() {
    if (this.state.error) {
      throw this.state.error
    }

    return run(this.props.children, undefined, this.throwError)
  }
}
