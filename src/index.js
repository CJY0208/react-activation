import AliveScope from './core/AliveScope'
import { withActivation, useActivate, useUnactivate } from './core/lifecycles'
import KeepAlive from './core/KeepAlive'
import { fixContext, createContext } from './core/ContextBridge'
import withAliveScope, { useAliveController } from './core/withAliveScope'

export default KeepAlive
export {
  AliveScope,
  withActivation,
  fixContext,
  useActivate,
  useUnactivate,
  createContext,
  withAliveScope,
  useAliveController
}
