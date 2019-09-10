import { isString, isUndefined, isFunction, isNumber } from '../is'

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
}

export const run = (obj, keys = [], ...args) => {
  keys = isString(keys) ? keys.split('.') : keys

  const func = get(obj, keys)
  const context = get(obj, keys.slice(0, -1))

  return isFunction(func) ? func.call(context, ...args) : func
}
