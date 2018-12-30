
/**
 * @module utils
 */

import * as ID from '../utils/ID.js'
import { ItemJSON } from '../structs/ItemJSON.js'
import { ItemString } from '../structs/ItemString.js'

/**
 * Try to merge all items in os with their successors.
 *
 * Some transformations (like delete) fragment items.
 * Item(c: 'ab') + Delete(1,1) + Delete(0, 1) -> Item(c: 'a',deleted);Item(c: 'b',deleted)
 *
 * This functions merges the fragmented nodes together:
 * Item(c: 'a',deleted);Item(c: 'b',deleted) -> Item(c: 'ab', deleted)
 *
 * TODO: The Tree implementation does not support deletions in-spot.
 *       This is why all deletions must be performed after the traversal.
 *
 */
export const defragmentItemContent = y => {
  const os = y.os
  if (os.length < 2) {
    return
  }
  let deletes = []
  let node = os.findSmallestNode()
  let next = node.next()
  let strBuffer = []
  let strBufferNode = null
  let concatStrItemWithBuf = (node) => {
    node.val._content += strBuffer.join('')
    delete node.val.__tmpMergeLength
  }
  while (next !== null) {
    let a = node.val
    let b = next.val
    const aLen = a.__tmpMergeLength || a._length
    if (
      (a instanceof ItemJSON || a instanceof ItemString) &&
      a.constructor === b.constructor &&
      a._deleted === b._deleted &&
      a._right === b &&
      (ID.createID(a._id.user, a._id.clock + aLen)).equals(b._id)
    ) {
      a._right = b._right
      if (a instanceof ItemJSON) {
        a._content = a._content.concat(b._content)
      } else if (a instanceof ItemString) {
        strBufferNode = node
        strBuffer.push(b._content)
        a.__tmpMergeLength = aLen + b._length
      }
      // delete b later
      deletes.push(b._id)
      // do not iterate node!
      // !(node = next)
    } else {
      if (strBuffer.length) {
        concatStrItemWithBuf(node)
        strBuffer = []
        strBufferNode = null
      }
      // not able to merge node, get next node
      node = next
    }
    // update next
    next = next.next()
  }
  if (strBuffer.length) {
    concatStrItemWithBuf(strBufferNode)
  }
  for (let i = deletes.length - 1; i >= 0; i--) {
    os.delete(deletes[i])
  }
}
