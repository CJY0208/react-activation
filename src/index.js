import AliveScope from './core/AliveScope'
import { withActivation, useActivate, useUnactivate } from './core/lifecycles'
import KeepAlive from './core/KeepAlive'
import { fixContext, createContext } from './core/Bridge/Context'
import withAliveScope, { useAliveController } from './core/withAliveScope'
import NodeKey from './core/NodeKey'

export default KeepAlive
export {
  KeepAlive,
  AliveScope,
  withActivation,
  fixContext,
  useActivate,
  useUnactivate,
  createContext,
  withAliveScope,
  useAliveController,
  NodeKey
}
