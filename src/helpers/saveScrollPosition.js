import root from './base/globalThis'
import { get, run, value } from './base/try'
import { isArray, isFunction, isExist } from './base/is'
import { flatten } from './utils'

const body = get(root, 'document.body')
const screenScrollingElement = get(
  root,
  'document.scrollingElement',
  get(root, 'document.documentElement', {})
)

function isScrollableNode(node = {}) {
  if (!isExist(node)) {
    return false
  }

  return (
    node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight
  )
}

function getScrollableNodes(from) {
  if (!isFunction(get(root, 'document.querySelectorAll'))) {
    return []
  }

  return [...value(run(from, 'querySelectorAll', '*'), []), from].filter(
    isScrollableNode
  )
}

export default function saveScrollPosition(from, screenInclude) {
  const nodes = [
    ...new Set([
      ...flatten((!isArray(from) ? [from] : from).map(getScrollableNodes)),
      ...(screenInclude
        ? [screenScrollingElement, body].filter(isScrollableNode)
        : [])
    ])
  ]

  const saver = nodes.map(node => [
    node,
    {
      x: node.scrollLeft,
      y: node.scrollTop
    }
  ])

  return function revert() {
    saver.forEach(([node, { x, y }]) => {
      node.scrollLeft = x
      node.scrollTop = y
    })
  }
}
