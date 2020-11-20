import { Array } from "core-js"

const getType = val => Object.prototype.toString.call(val)

// 值类型判断 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export const isUndefined = val => typeof val === 'undefined'

export const isNull = val => val === null

export const isFunction = val => typeof val === 'function'

export const isArray = val => Array.isArray ? Array.isArray(val) : getType(val) === '[object Array]'

export const isRegExp = val => val instanceof RegExp

export const isObject = val =>
  typeof val === ('object' || 'function') && !isNull(val)

export const isBoolean = val => getType(val) === '[object Boolean]'

export const isString = val => getType(val) === '[object String]'

export const isExist = val => !(isUndefined(val) || isNull(val))

export const isNaN = val => val !== val

export const isNumber = val => typeof val === 'number' && !isNaN(val)
// 值类型判断 -------------------------------------------------------------
