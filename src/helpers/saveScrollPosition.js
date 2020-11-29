import {
  globalThis as root,
  get,
  run,
  value,
  isFunction,
  isExist,
  flatten,
} from 'szfe-tools'

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

export default function saveScrollPosition(from) {
  const nodes = [...new Set([...flatten(from.map(getScrollableNodes))])]

  const saver = nodes.map((node) => [
    node,
    {
      x: node.scrollLeft,
      y: node.scrollTop,
    },
  ])

  return function revert() {
    saver.forEach(([node, { x, y }]) => {
      node.scrollLeft = x
      node.scrollTop = y
    })
  }
}
