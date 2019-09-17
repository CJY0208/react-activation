# React Activation

[中文说明](https://github.com/CJY0208/react-activation/blob/master/README_CN.md)

Implementation of the `<keep-alive />` function in Vue For React

- - -

Same as [react-keep-alive](https://github.com/StructureBuilder/react-keep-alive)

But fixed some of the issues in https://github.com/StructureBuilder/react-keep-alive/issues/36

More stable `<KeepAlive />` function with `babel` pre-compilation

[Online Demo](https://codesandbox.io/s/affectionate-beaver-solkt)

<img src="./docs/basicReactActivation.gif">

- - -

## Compatibility

- React v16+

- Compatible with SSR

- - -

## Install

```bash
yarn add react-activation
# or
npm install react-activation
```
- - -

## Usage

Add `react-activation/babel` plugins in `.babelrc`

The plugin adds a `_ka` attribute to each JSX element during compilation to help the `<KeepAlive />` runtime generate a unique identifier by render location.

```javascript
{
  "plugins": [
    "react-activation/babel"
  ]
}
```

In your business code

```javascript
import React, { Component, useState } from 'react'
import ReactDOM from 'react-dom'
import KeepAlive, { AliveScope, withActivation } from 'react-activation'

@withActivation
class Test extends Component {
  state = {
    count: 0
  }

  setCount = count => this.setState({ count })

  componentDidActivate() {
    console.log('Test: componentDidActivate')
  }

  componentWillUnactivate() {
    console.log('Test: componentWillUnactivate')
  }

  render() {
    const { count } = this.state
    
    return (
      <div>
        count: {count}
        <button onClick={() => this.setCount(count + 1)}>add</button>
      </div>
    )
  }
}

function App() {
  const [show, setShow] = useState(true)

  return (
    <AliveScope>
      <button onClick={() => setShow(show => !show)}>Toggle</button>
      {show && (
        <KeepAlive>
          <Test />
        </KeepAlive>
      )}
    </AliveScope>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
```

- - -

## Lifecycle

`ClassComponent` works with `withActivation` decorator

Use `componentDidActivate` and `componentWillUnactivate` to correspond to the two states of "activate" and "unactivate" respectively.

`FunctionComponent` uses the `useActivate` and `useUnactivate` hooks respectively

```javascript
...
import KeepAlive, { useActivate, useUnactivate， withActivation } from 'react-activation'

@withActivation
class TestClass extends Component {
  ...
  componentDidActivate() {
    console.log('TestClass: componentDidActivate')
  }

  componentWillUnactivate() {
    console.log('TestClass: componentWillUnactivate')
  }
  ...
}
...
function TestFunction() {
  useActivate(() => {
    console.log('TestFunction: didActivate')
  })

  useUnactivate(() => {
    console.log('TestFunction: willUnactivate')
  })
  ...
}
...
function App() {
  ...
  return (
    {show && (
      <KeepAlive>
        <TestClass />
        <TestFunction />
      </KeepAlive>
    )}
  )
}
...
```

- - -

## Cache Controller

### Automatic control cache

Add the `when` attribute to the `<KeepAlive />` tag that needs to control the cache. The value is as follows

#### When the `when` type is `Boolean`

- **true**: Cache after uninstallation
- **false**: Not cached after uninstallation

```javascript
<KeepAlive when={false}>
```

#### When the `when` type is `Array`

The first parameter indicates whether it needs to be cached at the time of uninstallation. The second parameter indicates whether to unload all cache contents of `<KeepAlive>`, including all `<KeepAlive>` nested in `<KeepAlive>`.

```javascript
// For example: The following indicates that it is not cached when uninstalling, and uninstalls all nested `<KeepAlive>`
<KeepAlive when={[false, true]}>
  ...
    <KeepAlive>
      ...
        <KeepAlive>
          ...
        </KeepAlive>
      ...
    </KeepAlive>
  ...
</KeepAlive>
```

#### When the `when` type is `Function`

The return value is the above `Boolean` or `Array`, which takes effect as described above.

### Manually control the cache

1. Add the `name` attribute to the `<KeepAlive>` tag that needs to control the cache.

2. Get control functions using `withAliveScope` or `useAliveController`

   - **drop(name)**
   
      Unload the `<KeepAlive>` node in cache state by name. The name can be of type `String` or `RegExp`. Note that only the first layer of content that hits `<KeepAlive>` is unloaded and will not be uninstalled in `<KeepAlive>`. Would not unload nested `<KeepAlive>`
      
   - **dropScope(name)**
   
      Unloads the `<KeepAlive>` node in cache state by name. The name optional type is `String` or `RegExp`, which will unload all content of `<KeepAlive>`, including all `<KeepAlive>` nested in `<KeepAlive>`.
      
   - **clear()**
   
      will clear all `<KeepAlive>` in the cache
      
   - **getCachingNodes()**
   
      Get all the nodes in the cache

```javascript
...
import KeepAlive, { withAliveScope, useAliveController } from 'react-activation'
...
<KeepAlive name="Test">
  ...
    <KeepAlive>
      ...
        <KeepAlive>
          ...
        </KeepAlive>
      ...
    </KeepAlive>
  ...
</KeepAlive>
...
function App() {
  const { drop, dropScope, clear, getCachingNodes } = useAliveController()

  useEffect(() => {
    drop('Test')
    // or
    drop(/Test/)
    // or
    dropScope('Test')

    clear()
  })

  return (
    ...
  )
}
// or
@withAliveScope
class App extends Component {
  render() {
    const { drop, dropScope, clear, getCachingNodes } = this.props

    return (
      ...
    )
  }
}
...
```

- - -

## Principle

Pass the `children` attribute of `<KeepAlive />` to `<AliveScope />` and render it with `<Keeper />`

After rendering `<Keeper />`, the content is transferred to `<KeepAlive />` through DOM operation.

Since `<Keeper />` will not be uninstalled, caching can be implemented.

- - -

## Breaking Change

1. `KeepAlive />` needs to pass children to `<AliveScope />` , so the rendering of the real content will be **slower than the normal situation**

    Will have a certain impact on the function of strictly relying on the lifecycle order, such as getting the value of `ref` in `componentDidMount`, as follows

    ```javascript
    class Test extends Component {
      componentDidMount() {
        console.log(this.outside) // will log <div /> instance
        console.log(this.inside) // will log undefined
      }

      render() {
        return (
          <div>
            <div ref={ref => {
              this.outside = ref
            }}>
              Outside KeepAlive
            </div>
            <KeepAlive>
              <div ref={ref => {
                this.inside = ref
              }}>
                Inside KeepAlive
              </div>
            </KeepAlive>
          </div>
        )
      }
    }
    ```

    The above error in `ClassComponent` can be fixed by using the `withActivation` high-level component

    `FunctionComponent` currently has no processing method, you can use `setTimeout` or `nextTick` to delay ref getting behavior

    ```javascript
    @withActivation
    class Test extends Component {
      componentDidMount() {
        console.log(this.outside) // will log <div /> instance
        console.log(this.inside) // will log <div /> instance
      }

      render() {
        return (
          <div>
            <div ref={ref => {
              this.outside = ref
            }}>
              Outside KeepAlive
            </div>
            <KeepAlive>
              <div ref={ref => {
                this.inside = ref
              }}>
                Inside KeepAlive
              </div>
            </KeepAlive>
          </div>
        )
      }
    }
    ```

2. Destructive impact on `Context`, need to be manually fixed

    Problem reference: https://github.com/StructureBuilder/react-keep-alive/issues/36

    ```javascript
    (
      <Provider value={1}>
        {show && (
          <KeepAlive>
            <Consumer>
              {context => ( // Since the rendering level is broken, the context cannot be obtained here.
                <Test contextValue={context} />
              )}
            </Consumer>
          </KeepAlive>
        )}
        <button onClick={toggle}>toggle</button>
      </Provider>
    )
    ```

    Choose a repair method

    - Create `Context` using `createContext` exported from `react-activation`
    - Fix the affected `Context` with `fixContext` exported from `react-activation`

    ```javascript
    ...
    import { createContext } from 'react-activation'

    const { Provider, Consumer } = createContext()
    ...
    // or
    ...
    import { createContext } from 'react'
    import { fixContext } from 'react-activation'

    const Context = createContext()
    const { Provider, Consumer } = Context

    fixContext(Context)
    ...
    ```

3. Affects the functionality that depends on the level of the React component, as follows

    - [x] ~~Error Boundaries (fixed)~~
    - [x] ~~React.Suspense & React.lazy (fixed)~~
    - [ ] React Synthetic Event Bubbling Failure
    - [ ] Other undiscovered features
