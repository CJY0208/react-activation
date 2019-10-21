import root from './base/globalThis'
import { get } from './base/try'
import { isArray, isFunction } from './base/is'
import { flatten } from './utils'

const body = get(root, 'document.body')

function isScrollableNode(node) {
  return (
    node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight
  )
}

function getScrollableNodes(from = body) {
  if (!isFunction(get(root, 'document.getElementById'))) {
    return []
  }

  return [...from.querySelectorAll('*'), from].filter(isScrollableNode)
}

export default function saveScrollPosition(from = body) {
  const nodes = [
    ...new Set([
      ...flatten((!isArray(from) ? [from] : from).map(getScrollableNodes)),
      ...[get(root, 'document.documentElement', {}), body].filter(
        isScrollableNode
      )
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
