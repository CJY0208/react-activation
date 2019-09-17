# React Activation

Vue 中 `<keep-alive />` 功能在 React 中的实现

- - -

定位与 [react-keep-alive](https://github.com/StructureBuilder/react-keep-alive) 相同

但修复了 https://github.com/StructureBuilder/react-keep-alive/issues/36 中的部分问题

配合 babel 预编译实现更稳定的 KeepAlive 功能

[在线 Demo](https://codesandbox.io/s/affectionate-beaver-solkt)

<img src="./docs/basicReactActivation.gif">

- - -

## 兼容性

- React v16+

- 兼容 SSR

- - -

## 安装

```bash
yarn add react-activation
# or
npm install react-activation
```
- - -

## 使用方式

`.babelrc` 中增加 `react-activation/babel` 插件

该插件会于编译阶段在各 JSX 元素上增加 `_ka` 属性，帮助 KeepAlive 运行时按渲染位置生成唯一的缓存 id 标识

```javascript
{
  "plugins": [
    "react-activation/babel"
  ]
}
```

业务代码中

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

## 生命周期

`ClassComponent` 可配合 `withActivation` 装饰器

使用 `componentDidActivate` 与 `componentWillUnactivate` 对应激活与缓存两种状态

`FunctionComponent` 则分别使用 `useActivate` 与 `useUnactivate` hooks 钩子

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

## 缓存控制

### 自动控制缓存

给需要控制缓存的 `<KeepAlive />` 标签增加 `when` 属性，取值如下

#### 当 `when` 类型为 `Boolean` 时

- **true**: 卸载时缓存
- **false**: 卸载时不缓存

```javascript
<KeepAlive when={true}>
```

#### 当 `when` 类型为 `Array` 时

第 1 位参数表示是否需要在卸载时缓存，第 2 位参数表示是否卸载 `<KeepAlive>` 的所有缓存内容，包括 `<KeepAlive>` 中嵌套的所有 `<KeepAlive>` 

```javascript
// 例如：以下表示卸载时不缓存，并卸载掉嵌套的所有 `<KeepAlive>`
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

#### 当 `when` 类型为 `Function` 时

返回值为上述 `Boolean` 或 `Array`，依照上述说明生效

### 手动控制缓存

1. 给需要控制缓存的 `<KeepAlive />` 标签增加 `name` 属性

2. 使用 `withAliveScope` 或 `useAliveController` 获取控制函数

    - **drop(name)**:
    
      按 name 卸载缓存状态下的 `<KeepAlive>` 节点，name 可选类型为 `String` 或 `RegExp`，注意，仅卸载命中 `<KeepAlive>` 的第一层内容，不会卸载 `<KeepAlive>` 中嵌套的、未命中的 `<KeepAlive>`

    - **dropScope(name)**
    
      按 name 卸载缓存状态下的 `<KeepAlive>` 节点，name 可选类型为 `String` 或 `RegExp`，将卸载命中 `<KeepAlive>` 的所有内容，包括 `<KeepAlive>` 中嵌套的所有 `<KeepAlive>`
    
    - **clear()**
    
      将清空所有缓存中的 KeepAlive


    - **getCachingNodes()**
    
      获取所有缓存中的节点

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

## 原理概述

将 `<KeepAlive />` 的 `children` 属性传递到 `<AliveScope />` 中，通过 `<Keeper />` 进行渲染

`<Keeper />` 完成渲染后通过 `DOM` 操作，将内容转移到 `<KeepAlive />` 中

由于 `<Keeper />` 不会被卸载，故能实现缓存功能

<img src="./docs/reactActivationPrinciple.gif">

- - -

## Breaking Change 由实现原理引发的额外问题

1. `<KeepAlive />` 中需要有一个将 children 传递到 `<AliveScope />` 的动作，故真实内容的渲染会相较于正常情况**慢一拍**

    将会对严格依赖生命周期顺序的功能造成一定影响，例如 `componentDidMount` 中 ref 的取值，如下

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

    `ClassComponent` 中上述错误可通过利用 `withActivation` 高阶组件修复
    
    `FunctionComponent` 目前暂无处理方式，可使用 `setTimeout` 或 `nextTick` 延时获取 `ref`

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

2. 对 Context 的破坏性影响，需手动修复

    问题情景参考：https://github.com/StructureBuilder/react-keep-alive/issues/36

    ```javascript
    (
      <Provider value={1}>
        {show && (
          <KeepAlive>
            <Consumer>
              {context => ( // 由于渲染层级被破坏，此处无法正常获取 context
                <Test contextValue={context} />
              )}
            </Consumer>
          </KeepAlive>
        )}
        <button onClick={toggle}>toggle</button>
      </Provider>
    )
    ```

    修复方式任选一种

      - 使用从 `react-activation` 导出的 `createContext` 创建上下文
      
      - 使用从 `react-activation` 导出的 `fixContext` 修复受影响的上下文

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

3. 对依赖于 React 层级的功能造成影响，如下

    - [x] ~~Error Boundaries~~（已修复）
    - [x] ~~React.Suspense & React.lazy~~（已修复）
    - [ ] React 合成事件冒泡失效
    - [ ] 其他未发现的功能
