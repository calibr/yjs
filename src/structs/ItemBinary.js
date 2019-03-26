/**
 * @module structs
 */

// TODO: ItemBinary should be able to merge with right (similar to other items). Or the other items (ItemJSON) should not be able to merge - extra byte + consistency

import { AbstractItem, logItemHelper, AbstractItemRef } from './AbstractItem.js'
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'
import { ID } from '../utils/ID.js' // eslint-disable-line
import { ItemType } from './ItemType.js' // eslint-disable-line
import { Y } from '../utils/Y.js' // eslint-disable-line
import { Transaction } from '../utils/Transaction.js' // eslint-disable-line
import { getItemCleanEnd, getItemCleanStart, getItemType } from '../utils/StructStore.js'

export const structBinaryRefNumber = 1

export class ItemBinary extends AbstractItem {
  /**
   * @param {ID} id
   * @param {AbstractItem | null} left
   * @param {AbstractItem | null} right
   * @param {ItemType | null} parent
   * @param {string | null} parentSub
   * @param {ArrayBuffer} content
   */
  constructor (id, left, right, parent, parentSub, content) {
    super(id, left, right, parent, parentSub)
    this.content = content
  }
  /**
   * @param {ID} id
   * @param {AbstractItem | null} left
   * @param {AbstractItem | null} right
   * @param {ItemType | null} parent
   * @param {string | null} parentSub
   */
  copy (id, left, right, parent, parentSub) {
    return new ItemBinary(id, left, right, parent, parentSub, this.content)
  }
  /**
   * Transform this Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  logString () {
    return logItemHelper('ItemBinary', this)
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  write (encoder) {
    super.write(encoder, structBinaryRefNumber)
    encoding.writePayload(encoder, this.content)
  }
}

export class ItemBinaryRef extends AbstractItemRef {
  /**
   * @param {decoding.Decoder} decoder
   * @param {number} info
   */
  constructor (decoder, info) {
    super(decoder, info)
    /**
     * @type {ArrayBuffer}
     */
    this.content = decoding.readPayload(decoder)
  }
  /**
   * @param {Transaction} transaction
   * @return {ItemBinary}
   */
  toStruct (transaction) {
    const store = transaction.y.store
    return new ItemBinary(
      this.id,
      this.left === null ? null : getItemCleanEnd(store, transaction, this.left),
      this.right === null ? null : getItemCleanStart(store, transaction, this.right),
      this.parent === null ? null : getItemType(store, this.parent),
      this.parentSub,
      this.content
    )
  }
}
