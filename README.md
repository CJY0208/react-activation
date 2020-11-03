# React Activation

[![size](https://img.shields.io/bundlephobia/minzip/react-activation.svg)](https://github.com/CJY0208/react-activation)
[![dm](https://img.shields.io/npm/dm/react-activation.svg)](https://github.com/CJY0208/react-activation)
![](https://visitor-badge.glitch.me/badge?page_id=cjy0208.react-activation)

English | [中文说明](./README_CN.md)

Implementation of the `<keep-alive />` function in `Vue` For `React`

---

More stable `<KeepAlive />` function with `babel` pre-compilation

[Online Demo](https://codesandbox.io/s/affectionate-beaver-solkt)

<img src="./docs/basicReactActivation.gif">

---

## More examples

- [Closable tabs with `react-router`](https://codesandbox.io/s/keguanbideyifangwenluyou-tab-shilikeanluyoucanshufenduofenhuancun-ewycx)
- [Closable tabs with `umi`](https://codesandbox.io/s/umi-keep-alive-tabs-demo-knfxy)
- [Using Animation with `react-router`](https://codesandbox.io/s/luyouzhuanchangdonghuashili-jdhq1)

---

## Compatibility

- React v17+ (beta)

- React v16+

- Preact v10+

- Compatible with SSR

---

## Install

```bash
yarn add react-activation
# or
npm install react-activation
```

---

## Usage

#### 1. Add `react-activation/babel` plugins in `.babelrc`

[Why is it needed?](https://github.com/CJY0208/react-activation/issues/18#issuecomment-564360695)

The plugin adds a `_nk` attribute to each JSX element during compilation to help the `react-activation` runtime **generate an unique identifier by render location** base on [`react-node-key`](https://github.com/CJY0208/react-node-key).

```javascript
{
  "plugins": [
    "react-activation/babel"
  ]
}
```

#### 2. In your business code, place the `<AliveScope>` outer layer at a location that will not be unmounted, usually at the application entrance

Note: When used with `react-router` or `react-redux`, you need to place `<AliveScope>` inside `<Router>` or `<Provider>`

```javascript
// entry.js

import React from 'react'
import ReactDOM from 'react-dom'
import { AliveScope } from 'react-activation'

import Test from './Test'

ReactDOM.render(
  <AliveScope>
    <Test />
  </AliveScope>,
  document.getElementById('root')
)
```

#### 3. Wrap the components that need to keep states with `<KeepAlive>`

Like the `<Counter>` component in the example

```javascript
// Test.js

import React, { useState } from 'react'
import KeepAlive from 'react-activation'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => setCount(count => count + 1)}>Add</button>
    </div>
  )
}

function Test() {
  const [show, setShow] = useState(true)

  return (
    <div>
      <button onClick={() => setShow(show => !show)}>Toggle</button>
      {show && (
        <KeepAlive>
          <Counter />
        </KeepAlive>
      )}
    </div>
  )
}

export default Test
```

---

## Lifecycle

`ClassComponent` works with `withActivation` decorator

Use `componentDidActivate` and `componentWillUnactivate` to correspond to the two states of "activate" and "unactivate" respectively.

`FunctionComponent` uses the `useActivate` and `useUnactivate` hooks respectively

```javascript
...
import KeepAlive, { useActivate, useUnactivate, withActivation } from 'react-activation'

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

---

## Save Scroll Position (`true` by default)

`<KeepAlive />` would try to detect scrollable nodes in its `children`, then, save their scroll position automaticlly before `componentWillUnactivate` and restore saving position after `componentDidActivate`

If you don't want `<KeepAlive />` to do this thing, set `saveScrollPosition` prop to `false`

```javascript
<KeepAlive saveScrollPosition={false} />
```

If your components share screen scroll container, `document.body` or `document.documentElement`, set `saveScrollPosition` prop to `"screen"` can save sharing screen container's scroll position before `componentWillUnactivate`

```javascript
<KeepAlive saveScrollPosition="screen" />
```

---

## Multiple Cache

Under the same parent node, `<KeepAlive>` in the same location will use the same cache by default.

For example, with the following parameter routing scenario, the `/item` route will be rendered differently by `id`, but only the same cache can be kept.

```javascript
<Route
  path="/item/:id"
  render={props => (
    <KeepAlive>
      <Item {...props} />
    </KeepAlive>
  )}
/>
```

Similar scenarios, you can use the `id` attribute of `<KeepAlive>` to implement multiple caches according to specific conditions.

```javascript
<Route
  path="/item/:id"
  render={props => (
    <KeepAlive id={props.match.params.id}>
      <Item {...props} />
    </KeepAlive>
  )}
/>
```

---

## Cache Control

### Automatic control cache

Add the `when` attribute to the `<KeepAlive />` tag that needs to control the cache. The value is as follows

#### When the `when` type is `Boolean`

- **true**: Cache after uninstallation
- **false**: Not cached after uninstallation

```javascript
<KeepAlive when={false}>
```

#### When the `when` type is `Array`

The **1th** parameter indicates whether it needs to be cached at the time of uninstallation.

The **2th** parameter indicates whether to unload all cache contents of `<KeepAlive>`, including all `<KeepAlive>` nested in `<KeepAlive>`.

```javascript
// For example:
// The following indicates that it is not cached when uninstalling
// And uninstalls all nested `<KeepAlive>`
<KeepAlive when={[false, true]}>
  ...
  <KeepAlive>
    ...
    <KeepAlive>...</KeepAlive>
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

---

## Principle

Pass the `children` attribute of `<KeepAlive />` to `<AliveScope />` and render it with `<Keeper />`

After rendering `<Keeper />`, the content is transferred to `<KeepAlive />` through `DOM` operation.

Since `<Keeper />` will not be uninstalled, caching can be implemented.

[Simplest Implementation Demo](https://codesandbox.io/s/zuijian-react-keepalive-shixian-ovh90)

<img src="./docs/reactActivationPrinciple.gif">

---

## Breaking Change

1. `<KeepAlive />` needs to pass children to `<AliveScope />` , so the rendering of the real content will be **slower than the normal situation**

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
           <div
             ref={ref => {
               this.outside = ref
             }}
           >
             Outside KeepAlive
           </div>
           <KeepAlive>
             <div
               ref={ref => {
                 this.inside = ref
               }}
             >
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
           <div
             ref={ref => {
               this.outside = ref
             }}
           >
             Outside KeepAlive
           </div>
           <KeepAlive>
             <div
               ref={ref => {
                 this.inside = ref
               }}
             >
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
   <Provider value={1}>
     {show && (
       <KeepAlive>
         <Consumer>
           {(
             context // Since the rendering level is broken, the context cannot be obtained here.
           ) => <Test contextValue={context} />}
         </Consumer>
       </KeepAlive>
     )}
     <button onClick={toggle}>toggle</button>
   </Provider>
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

   - [x] [Fix `withRouter/hooks` of react-router](https://github.com/CJY0208/react-activation/issues/77)
   - [x] ~~Error Boundaries~~ (Fixed)
   - [x] ~~React.Suspense & React.lazy~~ (Fixed)
   - [ ] React Synthetic Event Bubbling Failure
   - [ ] Other undiscovered features

---
