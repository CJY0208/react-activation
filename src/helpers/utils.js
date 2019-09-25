import { isArray } from './base/is'

export const nextTick = func => Promise.resolve().then(func)

export const flatten = array =>
  array.reduce(
    (res, item) => [...res, ...(isArray(item) ? flatten(item) : [item])],
    []
  )

/**
 * [防抖]
 * @param {Function} func 执行函数
 * @param {Number} wait 多少毫秒后运行一次
 */
export const debounce = (func, wait = 16) => {
  let timeout

  return function(...args) {
    clearTimeout(timeout)

    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)

    return timeout
  }
}

export function getKey2Id() {
  let uuid = 0
  const map = new Map()

  // 对每种 NodeType 做编号处理
  return function key2Id(key) {
    let id = map.get(key)

    if (!id) {
      id = (++uuid).toString(32)
      map.set(key, id)
    }

    return id
  }
}
