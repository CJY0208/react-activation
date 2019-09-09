import {
  isString,
  isExist,
  isUndefined,
  isFunction,
  isObject,
  isArray,
  isNumber
} from '../is'

export const get = (obj, keys = [], defaultValue) => {
  try {
    if (isNumber(keys)) {
      keys = String(keys)
    }
    let result = (isString(keys) ? keys.split('.') : keys).reduce(
      (res, key) => res[key],
      obj
    )
    return isUndefined(result) ? defaultValue : result
  } catch (e) {
    return defaultValue
  }

  // keys = isString(keys) ? keys.split('.') : keys

  // let result
  // let res = obj
  // let idx = 0

  // for (; idx < keys.length; idx++) {
  //   let key = keys[idx]

  //   if (isExist(res)) {
  //     res = res[key]
  //   } else {
  //     break
  //   }
  // }

  // if (idx === keys.length) {
  //   result = res
  // }

  // return isUndefined(result) ? defaultValue : result
}

export const set = (obj = {}, keys = [], value) => {
  obj = Object.assign({}, obj)
  keys = isString(keys) ? keys.split('.') : keys

  keys.reduce((res, key, idx) => {
    let next = idx === keys.length - 1 ? value : get(res, key, {})

    if (isObject(next)) {
      next = Object.assign({}, next)
    }

    if (isArray(next)) {
      next = next.slice()
    }

    res[key] = next

    return res[key]
  }, obj)

  return obj
}

export const run = (obj, keys = [], ...args) => {
  keys = isString(keys) ? keys.split('.') : keys

  const func = get(obj, keys)
  const context = get(obj, keys.slice(0, -1))

  return isFunction(func) ? func.call(context, ...args) : func
}

// export const __run = (obj, keys = [], args) => run(obj, keys, ...args)

export const value = (...values) =>
  values.reduce(
    (value, nextValue) => (isUndefined(value) ? run(nextValue) : run(value)),
    undefined
  )

// export const valueRight = (...args) => value.apply(undefined, args.reverse())
