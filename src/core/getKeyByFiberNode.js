import { get, isObject } from '../helpers'

let uuid = 1
const typeIdMap = new Map()

// 对每种 NodeType 做编号处理
export const getTypeId = type => {
  let typeId = typeIdMap.get(type)

  if (!typeId) {
    typeId = (++uuid).toString(32)
    typeIdMap.set(type, typeId)
  }

  return typeId
}
// 获取节点的渲染路径，作为节点的 X 坐标
const genRenderPath = node =>
  node.return ? [node, ...genRenderPath(node.return)] : [node]

// 使用节点下标或其 key 作为 Y 坐标
const getNodeId = fiberNode =>
  `${get(fiberNode, 'pendingProps._ka', fiberNode.index)}:${fiberNode.key ||
    ''}`

// 根据 X,Y 坐标生成 Key
const getKeyByCoord = nodes =>
  nodes
    .map(node => {
      const x = getTypeId(get(node, 'type.$$typeof', node.type))
      const y = getNodeId(node)

      return `${x},${y}`
    })
    .join('|')

const getKeyByFiberNode = fiberNode => {
  const key = getKeyByCoord(genRenderPath(fiberNode))

  return getTypeId(key)
}

export default getKeyByFiberNode
