import { Component, PureComponent } from 'react'
import { EventBus, run, debounce } from 'szfe-tools'

export const eventBus = new EventBus()

export class FakeScopeProvider extends Component {
  static eventBus = eventBus
  static currentContextValue = undefined

  constructor(props) {
    super(props)
    FakeScopeProvider.currentContextValue = props.value
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.value !== this.props.value) {
      FakeScopeProvider.currentContextValue = nextProps.value
      eventBus.emit('update', nextProps.value)
    }

    return (
      nextProps.children !== this.props.children ||
      nextProps.value !== this.props.value
    )
  }

  render() {
    const { children } = this.props
    return children
  }
}

export class FakeScopeConsumer extends PureComponent {
  state = {
    context: FakeScopeProvider.currentContextValue,
  }

  constructor(props) {
    super(props)
    eventBus.on('update', this.updateListener)
  }

  updateListener = debounce((nextContextValue) => {
    this.setState({
      context: nextContextValue,
    })
  })

  componentWillUnmount() {
    eventBus.off('update', this.updateListener)
  }

  render() {
    const { children } = this.props
    const { context } = this.state
    return run(children, undefined, context)
  }
}
