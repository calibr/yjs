import { default as Item } from './Item.js'
import { logID } from '../MessageHandler/messageToString.js'

export default class ItemFormat extends Item {
  constructor () {
    super()
    this.key = null
    this.value = null
  }
  _copy (undeleteChildren, copyPosition) {
    let struct = super._copy(undeleteChildren, copyPosition)
    struct.key = this.key
    struct.value = this.value
    return struct
  }
  get _length () {
    return 1
  }
  get _countable () {
    return false
  }
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder)
    this.key = decoder.readVarString()
    this.value = JSON.parse(decoder.readVarString())
    return missing
  }
  _toBinary (encoder) {
    super._toBinary(encoder)
    encoder.writeVarString(this.key)
    encoder.writeVarString(JSON.stringify(this.value))
  }
  _logString () {
    const left = this._left !== null ? this._left._lastId : null
    const origin = this._origin !== null ? this._origin._lastId : null
    return `ItemFormat(id:${logID(this._id)},key:${JSON.stringify(this.key)},value:${JSON.stringify(this.value)},left:${logID(left)},origin:${logID(origin)},right:${logID(this._right)},parent:${logID(this._parent)},parentSub:${this._parentSub})`
  }
}