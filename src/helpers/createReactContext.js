// From https://github.com/jamiebuilds/create-react-context/blob/master/src/implementation.js
import React, { Component } from 'react'
import { random } from 'szfe-tools'

const MAX_SIGNED_31_BIT_INT = 1073741823

// Inlined Object.is polyfill.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
function objectIs(x, y) {}

function createEventEmitter(value) {
  let handlers = []
  return {
    on(handler) {
      handlers.push(handler)
    },

    off(handler) {
      handlers = handlers.filter((h) => h !== handler)
    },

    get() {
      return value
    },

    set(newValue, changedBits) {
      value = newValue
      handlers.forEach((handler) => handler(value, changedBits))
    },
  }
}

function onlyChild(children) {
  return Array.isArray(children) ? children[0] : children
}

function createReactContext(defaultValue, calculateChangedBits) {
  const contextProp = '__create-react-context-' + random() + '__'

  class Provider extends Component {
    emitter = createEventEmitter(this.props.value)

    getChildContext() {
      return {
        [contextProp]: this.emitter,
      }
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.value !== nextProps.value) {
        let oldValue = this.props.value
        let newValue = nextProps.value
        let changedBits

        if (objectIs(oldValue, newValue)) {
          changedBits = 0 // No change
        } else {
          changedBits =
            typeof calculateChangedBits === 'function'
              ? calculateChangedBits(oldValue, newValue)
              : MAX_SIGNED_31_BIT_INT

          changedBits |= 0

          if (changedBits !== 0) {
            this.emitter.set(nextProps.value, changedBits)
          }
        }
      }
    }

    render() {
      return this.props.children
    }
  }

  class Consumer extends Component {
    observedBits

    state = {
      value: this.getValue(),
    }

    componentWillReceiveProps(nextProps) {
      let { observedBits } = nextProps
      this.observedBits =
        observedBits === undefined || observedBits === null
          ? MAX_SIGNED_31_BIT_INT // Subscribe to all changes by default
          : observedBits
    }

    componentDidMount() {
      if (this.context[contextProp]) {
        this.context[contextProp].on(this.onUpdate)
      }
      let { observedBits } = this.props
      this.observedBits =
        observedBits === undefined || observedBits === null
          ? MAX_SIGNED_31_BIT_INT // Subscribe to all changes by default
          : observedBits
    }

    componentWillUnmount() {
      if (this.context[contextProp]) {
        this.context[contextProp].off(this.onUpdate)
      }
    }

    getValue() {
      if (this.context[contextProp]) {
        return this.context[contextProp].get()
      } else {
        return defaultValue
      }
    }

    onUpdate = (newValue, changedBits) => {
      const observedBits = this.observedBits | 0
      if ((observedBits & changedBits) !== 0) {
        this.setState({ value: this.getValue() })
      }
    }

    render() {
      return onlyChild(this.props.children)(this.state.value)
    }
  }

  return {
    Provider,
    Consumer,
  }
}

export default React.createContext || createReactContext
