'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * @module utils
 */

const structs = new Map();
const references = new Map();

/**
 * Register a new Yjs types. The same type must be defined with the same
 * reference on all clients!
 *
 * @param {Number} reference
 * @param {Function} structConstructor
 *
 * @public
 */
const registerStruct = (reference, structConstructor) => {
  structs.set(reference, structConstructor);
  references.set(structConstructor, reference);
};

/**
 * @private
 */
const getStruct = (reference) => {
  return structs.get(reference)
};

/**
 * @private
 */
const getStructReference = (typeConstructor) => {
  return references.get(typeConstructor)
};

/**
 * @module globals
 */

/* eslint-env browser */

const Uint8Array_ = Uint8Array;

const createUint8ArrayFromLen = len => new Uint8Array_(len);

/**
 * Create Uint8Array with initial content from buffer
 */
const createUint8ArrayFromBuffer = (buffer, byteOffset, length) => new Uint8Array_(buffer, byteOffset, length);

/**
 * Create Uint8Array with initial content from buffer
 */
const createUint8ArrayFromArrayBuffer = arraybuffer => new Uint8Array_(arraybuffer);

/**
 * @module decoding
 */

/**
 * A Decoder handles the decoding of an ArrayBuffer.
 */
class Decoder {
  /**
   * @param {ArrayBuffer} buffer Binary data to decode
   */
  constructor (buffer) {
    this.arr = new Uint8Array(buffer);
    this.pos = 0;
  }
}

/**
 * @function
 * @param {ArrayBuffer} buffer
 * @return {Decoder}
 */
const createDecoder = buffer => new Decoder(buffer);

/**
 * @function
 * @param {Decoder} decoder
 * @return {boolean}
 */
const hasContent = decoder => decoder.pos !== decoder.arr.length;

/**
 * Clone a decoder instance.
 * Optionally set a new position parameter.
 *
 * @function
 * @param {Decoder} decoder The decoder instance
 * @param {number} [newPos] Defaults to current position
 * @return {Decoder} A clone of `decoder`
 */
const clone = (decoder, newPos = decoder.pos) => {
  let _decoder = createDecoder(decoder.arr.buffer);
  _decoder.pos = newPos;
  return _decoder
};

/**
 * Read `len` bytes as an ArrayBuffer.
 * @function
 * @param {Decoder} decoder The decoder instance
 * @param {number} len The length of bytes to read
 * @return {ArrayBuffer}
 */
const readArrayBuffer = (decoder, len) => {
  const arrayBuffer = createUint8ArrayFromLen(len);
  const view = createUint8ArrayFromBuffer(decoder.arr.buffer, decoder.pos, len);
  arrayBuffer.set(view);
  decoder.pos += len;
  return arrayBuffer.buffer
};

/**
 * Read variable length payload as ArrayBuffer
 * @function
 * @param {Decoder} decoder
 * @return {ArrayBuffer}
 */
const readPayload = decoder => readArrayBuffer(decoder, readVarUint(decoder));

/**
 * Read the rest of the content as an ArrayBuffer
 * @function
 * @param {Decoder} decoder
 * @return {ArrayBuffer}
 */
const readTail = decoder => readArrayBuffer(decoder, decoder.arr.length - decoder.pos);

/**
 * Skip one byte, jump to the next position.
 * @function
 * @param {Decoder} decoder The decoder instance
 * @return {number} The next position
 */
const skip8 = decoder => decoder.pos++;

/**
 * Read one byte as unsigned integer.
 * @function
 * @param {Decoder} decoder The decoder instance
 * @return {number} Unsigned 8-bit integer
 */
const readUint8 = decoder => decoder.arr[decoder.pos++];

/**
 * Read 4 bytes as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const readUint32 = decoder => {
  let uint =
    decoder.arr[decoder.pos] +
    (decoder.arr[decoder.pos + 1] << 8) +
    (decoder.arr[decoder.pos + 2] << 16) +
    (decoder.arr[decoder.pos + 3] << 24);
  decoder.pos += 4;
  return uint
};

/**
 * Look ahead without incrementing position.
 * to the next byte and read it as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const peekUint8 = decoder => decoder.arr[decoder.pos];

/**
 * Read unsigned integer (32bit) with variable length.
 * 1/8th of the storage is used as encoding overhead.
 *  * numbers < 2^7 is stored in one bytlength
 *  * numbers < 2^14 is stored in two bylength
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.length
 */
const readVarUint = decoder => {
  let num = 0;
  let len = 0;
  while (true) {
    let r = decoder.arr[decoder.pos++];
    num = num | ((r & 0b1111111) << len);
    len += 7;
    if (r < 1 << 7) {
      return num >>> 0 // return unsigned number!
    }
    if (len > 35) {
      throw new Error('Integer out of range!')
    }
  }
};

/**
 * Look ahead and read varUint without incrementing position
 *
 * @function
 * @param {Decoder} decoder
 * @return {number}
 */
const peekVarUint = decoder => {
  let pos = decoder.pos;
  let s = readVarUint(decoder);
  decoder.pos = pos;
  return s
};

/**
 * Read string of variable length
 * * varUint is used to store the length of the string
 *
 * Transforming utf8 to a string is pretty expensive. The code performs 10x better
 * when String.fromCodePoint is fed with all characters as arguments.
 * But most environments have a maximum number of arguments per functions.
 * For effiency reasons we apply a maximum of 10000 characters at once.
 *
 * @function
 * @param {Decoder} decoder
 * @return {String} The read String.
 */
const readVarString = decoder => {
  let remainingLen = readVarUint(decoder);
  let encodedString = '';
  while (remainingLen > 0) {
    const nextLen = remainingLen < 10000 ? remainingLen : 10000;
    const bytes = new Array(nextLen);
    for (let i = 0; i < nextLen; i++) {
      bytes[i] = decoder.arr[decoder.pos++];
    }
    encodedString += String.fromCodePoint.apply(null, bytes);
    remainingLen -= nextLen;
  }
  return decodeURIComponent(escape(encodedString))
};

/**
 * Look ahead and read varString without incrementing position
 *
 * @function
 * @param {Decoder} decoder
 * @return {string}
 */
const peekVarString = decoder => {
  let pos = decoder.pos;
  let s = readVarString(decoder);
  decoder.pos = pos;
  return s
};

var decoding = /*#__PURE__*/Object.freeze({
  Decoder: Decoder,
  createDecoder: createDecoder,
  hasContent: hasContent,
  clone: clone,
  readArrayBuffer: readArrayBuffer,
  readPayload: readPayload,
  readTail: readTail,
  skip8: skip8,
  readUint8: readUint8,
  readUint32: readUint32,
  peekUint8: peekUint8,
  readVarUint: readVarUint,
  peekVarUint: peekVarUint,
  readVarString: readVarString,
  peekVarString: peekVarString
});

/**
 * @module encoding
 */

const bits7 = 0b1111111;
const bits8 = 0b11111111;

/**
 * A BinaryEncoder handles the encoding to an ArrayBuffer.
 */
class Encoder {
  constructor () {
    this.cpos = 0;
    this.cbuf = createUint8ArrayFromLen(1000);
    this.bufs = [];
  }
}

/**
 * @function
 * @return {Encoder}
 */
const createEncoder = () => new Encoder();

/**
 * The current length of the encoded data.
 *
 * @function
 * @param {Encoder} encoder
 * @return {number}
 */
const length = encoder => {
  let len = encoder.cpos;
  for (let i = 0; i < encoder.bufs.length; i++) {
    len += encoder.bufs[i].length;
  }
  return len
};

/**
 * Transform to ArrayBuffer. TODO: rename to .toArrayBuffer
 *
 * @function
 * @param {Encoder} encoder
 * @return {ArrayBuffer} The created ArrayBuffer.
 */
const toBuffer = encoder => {
  const uint8arr = createUint8ArrayFromLen(length(encoder));
  let curPos = 0;
  for (let i = 0; i < encoder.bufs.length; i++) {
    let d = encoder.bufs[i];
    uint8arr.set(d, curPos);
    curPos += d.length;
  }
  uint8arr.set(createUint8ArrayFromBuffer(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
  return uint8arr.buffer
};

/**
 * Write one byte to the encoder.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The byte that is to be encoded.
 */
const write = (encoder, num) => {
  if (encoder.cpos === encoder.cbuf.length) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = createUint8ArrayFromLen(encoder.cbuf.length * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = num;
};

/**
 * Write one byte at a specific position.
 * Position must already be written (i.e. encoder.length > pos)
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos Position to which to write data
 * @param {number} num Unsigned 8-bit integer
 */
const set = (encoder, pos, num) => {
  let buffer = null;
  // iterate all buffers and adjust position
  for (let i = 0; i < encoder.bufs.length && buffer === null; i++) {
    const b = encoder.bufs[i];
    if (pos < b.length) {
      buffer = b; // found buffer
    } else {
      pos -= b.length;
    }
  }
  if (buffer === null) {
    // use current buffer
    buffer = encoder.cbuf;
  }
  buffer[pos] = num;
};

/**
 * Write one byte as an unsigned integer.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
const writeUint8 = (encoder, num) => write(encoder, num & bits8);

/**
 * Write one byte as an unsigned Integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
const setUint8 = (encoder, pos, num) => set(encoder, pos, num & bits8);

/**
 * Write two bytes as an unsigned integer.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
const writeUint16 = (encoder, num) => {
  write(encoder, num & bits8);
  write(encoder, (num >>> 8) & bits8);
};
/**
 * Write two bytes as an unsigned integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
const setUint16 = (encoder, pos, num) => {
  set(encoder, pos, num & bits8);
  set(encoder, pos + 1, (num >>> 8) & bits8);
};

/**
 * Write two bytes as an unsigned integer
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
const writeUint32 = (encoder, num) => {
  for (let i = 0; i < 4; i++) {
    write(encoder, num & bits8);
    num >>>= 8;
  }
};

/**
 * Write two bytes as an unsigned integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
const setUint32 = (encoder, pos, num) => {
  for (let i = 0; i < 4; i++) {
    set(encoder, pos + i, num & bits8);
    num >>>= 8;
  }
};

/**
 * Write a variable length unsigned integer.
 *
 * Encodes integers in the range from [0, 4294967295] / [0, 0xffffffff]. (max 32 bit unsigned integer)
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
const writeVarUint = (encoder, num) => {
  while (num >= 0b10000000) {
    write(encoder, 0b10000000 | (bits7 & num));
    num >>>= 7;
  }
  write(encoder, bits7 & num);
};

/**
 * Write a variable length string.
 *
 * @function
 * @param {Encoder} encoder
 * @param {String} str The string that is to be encoded.
 */
const writeVarString = (encoder, str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    write(encoder, encodedString.codePointAt(i));
  }
};

/**
 * Write the content of another Encoder.
 *
 * TODO: can be improved!
 *
 * @function
 * @param {Encoder} encoder The enUint8Arr
 * @param {Encoder} append The BinaryEncoder to be written.
 */
const writeBinaryEncoder = (encoder, append) => writeArrayBuffer(encoder, toBuffer(append));

/**
 * Append an arrayBuffer to the encoder.
 *
 * @function
 * @param {Encoder} encoder
 * @param {ArrayBuffer} arrayBuffer
 */
const writeArrayBuffer = (encoder, arrayBuffer) => {
  const prevBufferLen = encoder.cbuf.length;
  // TODO: Append to cbuf if possible
  encoder.bufs.push(createUint8ArrayFromBuffer(encoder.cbuf.buffer, 0, encoder.cpos));
  encoder.bufs.push(createUint8ArrayFromArrayBuffer(arrayBuffer));
  encoder.cbuf = createUint8ArrayFromLen(prevBufferLen);
  encoder.cpos = 0;
};

/**
 * @function
 * @param {Encoder} encoder
 * @param {ArrayBuffer} arrayBuffer
 */
const writePayload = (encoder, arrayBuffer) => {
  writeVarUint(encoder, arrayBuffer.byteLength);
  writeArrayBuffer(encoder, arrayBuffer);
};

var encoding = /*#__PURE__*/Object.freeze({
  Encoder: Encoder,
  createEncoder: createEncoder,
  length: length,
  toBuffer: toBuffer,
  write: write,
  set: set,
  writeUint8: writeUint8,
  setUint8: setUint8,
  writeUint16: writeUint16,
  setUint16: setUint16,
  writeUint32: writeUint32,
  setUint32: setUint32,
  writeVarUint: writeVarUint,
  writeVarString: writeVarString,
  writeBinaryEncoder: writeBinaryEncoder,
  writeArrayBuffer: writeArrayBuffer,
  writePayload: writePayload
});

/**
 * @module utils
 */

class ID {
  constructor (user, clock) {
    this.user = user; // TODO: rename to client
    this.clock = clock;
  }
  clone () {
    return new ID(this.user, this.clock)
  }
  equals (id) {
    return id !== null && id.user === this.user && id.clock === this.clock
  }
  lessThan (id) {
    if (id.constructor === ID) {
      return this.user < id.user || (this.user === id.user && this.clock < id.clock)
    } else {
      return false
    }
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  encode (encoder) {
    writeVarUint(encoder, this.user);
    writeVarUint(encoder, this.clock);
  }
}

const createID = (user, clock) => new ID(user, clock);

const RootFakeUserID = 0xFFFFFF;

class RootID {
  constructor (name, typeConstructor) {
    this.user = RootFakeUserID;
    this.name = name;
    this.type = getStructReference(typeConstructor);
  }
  equals (id) {
    return id !== null && id.user === this.user && id.name === this.name && id.type === this.type
  }
  lessThan (id) {
    if (id.constructor === RootID) {
      return this.user < id.user || (this.user === id.user && (this.name < id.name || (this.name === id.name && this.type < id.type)))
    } else {
      return true
    }
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  encode (encoder) {
    writeVarUint(encoder, this.user);
    writeVarString(encoder, this.name);
    writeVarUint(encoder, this.type);
  }
}

/**
 * Create a new root id.
 *
 * @example
 *   y.define('name', Y.Array) // name, and typeConstructor
 *
 * @param {string} name
 * @param {Function} typeConstructor must be defined in structReferences
 */
const createRootID = (name, typeConstructor) => new RootID(name, typeConstructor);

/**
 * Read ID.
 * * If first varUint read is 0xFFFFFF a RootID is returned.
 * * Otherwise an ID is returned
 *
 * @param {decoding.Decoder} decoder
 * @return {ID|RootID}
 */
const decode = decoder => {
  const user = readVarUint(decoder);
  if (user === RootFakeUserID) {
    // read property name and type id
    const rid = createRootID(readVarString(decoder), null);
    rid.type = readVarUint(decoder);
    return rid
  }
  return createID(user, readVarUint(decoder))
};

var ID$1 = /*#__PURE__*/Object.freeze({
  ID: ID,
  createID: createID,
  RootFakeUserID: RootFakeUserID,
  RootID: RootID,
  createRootID: createRootID,
  decode: decode
});

const writeStructToTransaction = (transaction, struct) => {
  transaction.encodedStructsLen++;
  struct._toBinary(transaction.encodedStructs);
};

/**
 * @private
 * Delete all items in an ID-range.
 * Does not create delete operations!
 * TODO: implement getItemCleanStartNode for better performance (only one lookup).
 */
const deleteItemRange = (y, user, clock, range, gcChildren) => {
  let item = y.os.getItemCleanStart(createID(user, clock));
  if (item !== null) {
    if (!item._deleted) {
      item._splitAt(y, range);
      item._delete(y, false, true);
    }
    let itemLen = item._length;
    range -= itemLen;
    clock += itemLen;
    if (range > 0) {
      let node = y.os.findNode(createID(user, clock));
      while (node !== null && node.val !== null && range > 0 && node.val._id.equals(createID(user, clock))) {
        const nodeVal = node.val;
        if (!nodeVal._deleted) {
          nodeVal._splitAt(y, range);
          nodeVal._delete(y, false, gcChildren);
        }
        const nodeLen = nodeVal._length;
        range -= nodeLen;
        clock += nodeLen;
        node = node.next();
      }
    }
  }
};

/**
 * Stringify an item id.
 *
 * @param {ID.ID | ID.RootID} id
 * @return {string}
 */
const stringifyID = id => id instanceof ID ? `(${id.user},${id.clock})` : `(${id.name},${id.type})`;

/**
 * Stringify an item as ID. HHere, an item could also be a Yjs instance (e.g. item._parent).
 *
 * @param {Item | Y | null} item
 * @return {string}
 */
const stringifyItemID = item => {
  let result;
  if (item === null) {
    result = '()';
  } else if (item._id != null) {
    result = stringifyID(item._id);
  } else {
    // must be a Yjs instance
    // Don't include Y in this module, so we prevent circular dependencies.
    result = 'y';
  }
  return result
};

/**
 * Helper utility to convert an item to a readable format.
 *
 * @param {String} name The name of the item class (YText, ItemString, ..).
 * @param {Item} item The item instance.
 * @param {String} [append] Additional information to append to the returned
 *                          string.
 * @return {String} A readable string that represents the item object.
 *
 */
const logItemHelper = (name, item, append) => {
  const left = item._left !== null ? stringifyID(item._left._lastId) : '()';
  const origin = item._origin !== null ? stringifyID(item._origin._lastId) : '()';
  return `${name}(id:${stringifyItemID(item)},left:${left},origin:${origin},right:${stringifyItemID(item._right)},parent:${stringifyItemID(item._parent)},parentSub:${item._parentSub}${append !== undefined ? ' - ' + append : ''})`
};

/**
 * @module structs
 */

/**
 * @private
 * A Delete change is not a real Item, but it provides the same interface as an
 * Item. The only difference is that it will not be saved in the ItemStore
 * (OperationStore), but instead it is safed in the DeleteStore.
 */
class Delete {
  constructor () {
    /**
     * @type {ID.ID}
     */
    this._targetID = null;
    /**
     * @type {Item}
     */
    this._target = null;
    this._length = null;
  }

  /**
   * @private
   * Read the next Item in a Decoder and fill this Item with the read data.
   *
   * This is called when data is received from a remote peer.
   *
   * @param {Y} y The Yjs instance that this Item belongs to.
   * @param {decoding.Decoder} decoder The decoder object to read data from.
   */
  _fromBinary (y, decoder) {
    // TODO: set target, and add it to missing if not found
    // There is an edge case in p2p networks!
    /**
     * @type {any}
     */
    const targetID = decode(decoder);
    this._targetID = targetID;
    this._length = readVarUint(decoder);
    if (y.os.getItem(targetID) === null) {
      return [targetID]
    } else {
      return []
    }
  }

  /**
   * @private
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {encoding.Encoder} encoder The encoder to write data to.
   */
  _toBinary (encoder) {
    writeUint8(encoder, getStructReference(this.constructor));
    this._targetID.encode(encoder);
    writeVarUint(encoder, this._length);
  }

  /**
   * @private
   * Integrates this Item into the shared structure.
   *
   * This method actually applies the change to the Yjs instance. In the case of
   * Delete it marks the delete target as deleted.
   *
   * * If created remotely (a remote user deleted something),
   *   this Delete is applied to all structs in id-range.
   * * If created lokally (e.g. when y-array deletes a range of elements),
   *   this struct is broadcasted only (it is already executed)
   */
  _integrate (y, locallyCreated = false, gcChildren = false) {
    if (!locallyCreated) {
      // from remote
      const id = this._targetID;
      deleteItemRange(y, id.user, id.clock, this._length, gcChildren);
    }
    writeStructToTransaction(y._transaction, this);
  }

  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return `Delete - target: ${stringifyID(this._targetID)}, len: ${this._length}`
  }
}

/**
 * @module structs
 */
// import { Y } from '../utils/Y.js' // eslint-disable-line

// TODO should have the same base class as Item
class GC {
  constructor () {
    /**
     * @type {ID.ID}
     */
    this._id = null;
    this._length = 0;
  }

  get _redone () {
    return null
  }

  get _deleted () {
    return true
  }

  _integrate (y) {
    const id = this._id;
    const userState = y.ss.getState(id.user);
    if (id.clock === userState) {
      y.ss.setState(id.user, id.clock + this._length);
    }
    y.ds.mark(this._id, this._length, true);
    let n = y.os.put(this);
    const prev = n.prev().val;
    if (prev !== null && prev.constructor === GC && prev._id.user === n.val._id.user && prev._id.clock + prev._length === n.val._id.clock) {
      // TODO: do merging for all items!
      prev._length += n.val._length;
      y.os.delete(n.val._id);
      n = prev;
    }
    if (n.val) {
      n = n.val;
    }
    const next = y.os.findNext(n._id);
    if (next !== null && next.constructor === GC && next._id.user === n._id.user && next._id.clock === n._id.clock + n._length) {
      n._length += next._length;
      y.os.delete(next._id);
    }
    if (id.user !== RootFakeUserID) {
      writeStructToTransaction(y._transaction, this);
    }
  }

  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {encoding.Encoder} encoder The encoder to write data to.
   * @private
   */
  _toBinary (encoder) {
    writeUint8(encoder, getStructReference(this.constructor));
    this._id.encode(encoder);
    writeVarUint(encoder, this._length);
  }

  /**
   * Read the next Item in a Decoder and fill this Item with the read data.
   *
   * This is called when data is received from a remote peer.
   *
   * @param {Y} y The Yjs instance that this Item belongs to.
   * @param {decoding.Decoder} decoder The decoder object to read data from.
   * @private
   */
  _fromBinary (y, decoder) {
    /**
     * @type {any}
     */
    const id = decode(decoder);
    this._id = id;
    this._length = readVarUint(decoder);
    const missing = [];
    if (y.ss.getState(id.user) < id.clock) {
      missing.push(createID(id.user, id.clock - 1));
    }
    return missing
  }

  _splitAt () {
    return this
  }

  _clonePartial (diff) {
    const gc = new GC();
    gc._id = createID(this._id.user, this._id.clock + diff);
    gc._length = this._length - diff;
    return gc
  }
}

/**
 * @module structs
 */
// import { Type } from './Type.js' // eslint-disable-line

/**
 * @private
 */
const transactionTypeChanged = (y, type, sub) => {
  if (type !== y && !type._deleted && !y._transaction.newTypes.has(type)) {
    const changedTypes = y._transaction.changedTypes;
    let subs = changedTypes.get(type);
    if (subs === undefined) {
      // create if it doesn't exist yet
      subs = new Set();
      changedTypes.set(type, subs);
    }
    subs.add(sub);
  }
};

/**
 * Helper utility to split an Item (see {@link Item#_splitAt})
 * - copies all properties from a to b
 * - connects a to b
 * - assigns the correct _id
 * - saves b to os
 * @private
 */
const splitHelper = (y, a, b, diff) => {
  const aID = a._id;
  b._id = createID(aID.user, aID.clock + diff);
  b._origin = a;
  b._left = a;
  b._right = a._right;
  if (b._right !== null) {
    b._right._left = b;
  }
  b._right_origin = a._right_origin;
  // do not set a._right_origin, as this will lead to problems when syncing
  a._right = b;
  b._parent = a._parent;
  b._parentSub = a._parentSub;
  b._deleted = a._deleted;
  // now search all relevant items to the right and update origin
  // if origin is not it foundOrigins, we don't have to search any longer
  let foundOrigins = new Set();
  foundOrigins.add(a);
  let o = b._right;
  while (o !== null && foundOrigins.has(o._origin)) {
    if (o._origin === a) {
      o._origin = b;
    }
    foundOrigins.add(o);
    o = o._right;
  }
  y.os.put(b);
  if (y._transaction !== null) {
    if (y._transaction.newTypes.has(a)) {
      y._transaction.newTypes.add(b);
    } else if (y._transaction.deletedStructs.has(a)) {
      y._transaction.deletedStructs.add(b);
    }
  }
};

/**
 * Abstract class that represents any content.
 */
class Item {
  constructor () {
    /**
     * The uniqe identifier of this type.
     * @type {ID.ID | ID.RootID}
     */
    this._id = null;
    /**
     * The item that was originally to the left of this item.
     * @type {Item}
     */
    this._origin = null;
    /**
     * The item that is currently to the left of this item.
     * @type {Item}
     */
    this._left = null;
    /**
     * The item that is currently to the right of this item.
     * @type {Item}
     */
    this._right = null;
    /**
     * The item that was originally to the right of this item.
     * @type {Item}
     */
    this._right_origin = null;
    /**
     * The parent type.
     * @type {Y|Type}
     */
    this._parent = null;
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     * @type {String}
     */
    this._parentSub = null;
    /**
     * Whether this item was deleted or not.
     * @type {Boolean}
     */
    this._deleted = false;
    /**
     * If this type's effect is reundone this type refers to the type that undid
     * this operation.
     * @type {Type}
     */
    this._redone = null;
  }

  /**
   * Returns the next non-deleted item
   * @private
   */
  get _next () {
    let n = this._right;
    while (n !== null && n._deleted) {
      n = n._right;
    }
    return n
  }

  /**
   * Returns the previous non-deleted item
   * @private
   */
  get _prev () {
    let n = this._left;
    while (n !== null && n._deleted) {
      n = n._left;
    }
    return n
  }

  /**
   * Creates an Item with the same effect as this Item (without position effect)
   *
   * @private
   */
  _copy () {
    const C = this.constructor;
    return new C()
  }

  /**
   * Redoes the effect of this operation.
   *
   * @param {Y} y The Yjs instance.
   * @param {Set<Item>} redoitems
   *
   * @private
   */
  _redo (y, redoitems) {
    if (this._redone !== null) {
      return this._redone
    }
    if (!(this._parent instanceof Item)) {
      return
    }
    let struct = this._copy();
    let left, right;
    if (this._parentSub === null) {
      // Is an array item. Insert at the old position
      left = this._left;
      right = this;
    } else {
      // Is a map item. Insert at the start
      left = null;
      right = this._parent._map.get(this._parentSub);
      right._delete(y);
    }
    let parent = this._parent;
    // make sure that parent is redone
    if (parent._deleted === true && parent._redone === null) {
      // try to undo parent if it will be undone anyway
      if (!redoitems.has(parent) || !parent._redo(y, redoitems)) {
        return false
      }
    }
    if (parent._redone !== null) {
      parent = parent._redone;
      // find next cloned_redo items
      while (left !== null) {
        if (left._redone !== null && left._redone._parent === parent) {
          left = left._redone;
          break
        }
        left = left._left;
      }
      while (right !== null) {
        if (right._redone !== null && right._redone._parent === parent) {
          right = right._redone;
        }
        right = right._right;
      }
    }
    struct._origin = left;
    struct._left = left;
    struct._right = right;
    struct._right_origin = right;
    struct._parent = parent;
    struct._parentSub = this._parentSub;
    struct._integrate(y);
    this._redone = struct;
    return true
  }

  /**
   * Computes the last content address of this Item.
   *
   * @private
   */
  get _lastId () {
    /**
     * @type {any}
     */
    const id = this._id;
    return createID(id.user, id.clock + this._length - 1)
  }

  /**
   * Computes the length of this Item.
   *
   * @private
   */
  get _length () {
    return 1
  }

  /**
   * Should return false if this Item is some kind of meta information
   * (e.g. format information).
   *
   * * Whether this Item should be addressable via `yarray.get(i)`
   * * Whether this Item should be counted when computing yarray.length
   *
   * @private
   */
  get _countable () {
    return true
  }

  /**
   * Splits this Item so that another Items can be inserted in-between.
   * This must be overwritten if _length > 1
   * Returns right part after split
   * * diff === 0 => this
   * * diff === length => this._right
   * * otherwise => split _content and return right part of split
   * (see {@link ItemJSON}/{@link ItemString} for implementation)
   *
   * @private
   */
  _splitAt (y, diff) {
    if (diff === 0) {
      return this
    }
    return this._right
  }

  /**
   * Mark this Item as deleted.
   *
   * @param {Y} y The Yjs instance
   * @param {boolean} createDelete Whether to propagate a message that this
   *                               Type was deleted.
   * @param {boolean} gcChildren
   *
   * @private
   */
  _delete (y, createDelete = true, gcChildren) {
    if (!this._deleted) {
      const parent = this._parent;
      const len = this._length;
      // adjust the length of parent
      if (parent.length !== undefined && this._countable) {
        parent.length -= len;
      }
      this._deleted = true;
      y.ds.mark(this._id, this._length, false);
      let del = new Delete();
      del._targetID = this._id;
      del._length = len;
      if (createDelete) {
        // broadcast and persists Delete
        del._integrate(y, true);
      }
      transactionTypeChanged(y, parent, this._parentSub);
      y._transaction.deletedStructs.add(this);
    }
  }

  _gcChildren (y) {}

  _gc (y) {
    const gc = new GC();
    gc._id = this._id;
    gc._length = this._length;
    y.os.delete(this._id);
    gc._integrate(y);
  }

  /**
   * This is called right before this Item receives any children.
   * It can be overwritten to apply pending changes before applying remote changes
   *
   * @private
   */
  _beforeChange () {
    // nop
  }

  /**
   * Integrates this Item into the shared structure.
   *
   * This method actually applies the change to the Yjs instance. In case of
   * Item it connects _left and _right to this Item and calls the
   * {@link Item#beforeChange} method.
   *
   * * Integrate the struct so that other types/structs can see it
   * * Add this struct to y.os
   * * Check if this is struct deleted
   *
   * @param {Y} y
   *
   * @private
   */
  _integrate (y) {
    y._transaction.newTypes.add(this);
    /**
     * @type {any}
     */
    const parent = this._parent;
    /**
     * @type {any}
     */
    const selfID = this._id;
    const user = selfID === null ? y.userID : selfID.user;
    const userState = y.ss.getState(user);
    if (selfID === null) {
      this._id = y.ss.getNextID(this._length);
    } else if (selfID.user === RootFakeUserID) {
      // is parent
      return
    } else if (selfID.clock < userState) {
      // already applied..
      return
    } else if (selfID.clock === userState) {
      y.ss.setState(selfID.user, userState + this._length);
    } else {
      // missing content from user
      throw new Error('Can not apply yet!')
    }
    if (!parent._deleted && !y._transaction.changedTypes.has(parent) && !y._transaction.newTypes.has(parent)) {
      // this is the first time parent is updated
      // or this types is new
      parent._beforeChange();
    }

    /*
    # $this has to find a unique position between origin and the next known character
    # case 1: $origin equals $o.origin: the $creator parameter decides if left or right
    #         let $OL= [o1,o2,o3,o4], whereby $this is to be inserted between o1 and o4
    #         o2,o3 and o4 origin is 1 (the position of o2)
    #         there is the case that $this.creator < o2.creator, but o3.creator < $this.creator
    #         then o2 knows o3. Since on another client $OL could be [o1,o3,o4] the problem is complex
    #         therefore $this would be always to the right of o3
    # case 2: $origin < $o.origin
    #         if current $this insert_position > $o origin: $this ins
    #         else $insert_position will not change
    #         (maybe we encounter case 1 later, then this will be to the right of $o)
    # case 3: $origin > $o.origin
    #         $this insert_position is to the left of $o (forever!)
    */
    // handle conflicts
    let o;
    // set o to the first conflicting item
    if (this._left !== null) {
      o = this._left._right;
    } else if (this._parentSub !== null) {
      o = parent._map.get(this._parentSub) || null;
    } else {
      o = parent._start;
    }
    let conflictingItems = new Set();
    let itemsBeforeOrigin = new Set();
    // Let c in conflictingItems, b in itemsBeforeOrigin
    // ***{origin}bbbb{this}{c,b}{c,b}{o}***
    // Note that conflictingItems is a subset of itemsBeforeOrigin
    while (o !== null && o !== this._right) {
      itemsBeforeOrigin.add(o);
      conflictingItems.add(o);
      if (this._origin === o._origin) {
        // case 1
        if (o._id.user < this._id.user) {
          this._left = o;
          conflictingItems.clear();
        }
      } else if (itemsBeforeOrigin.has(o._origin)) {
        // case 2
        if (!conflictingItems.has(o._origin)) {
          this._left = o;
          conflictingItems.clear();
        }
      } else {
        break
      }
      // TODO: try to use right_origin instead.
      // Then you could basically omit conflictingItems!
      // Note: you probably can't use right_origin in every case.. only when setting _left
      o = o._right;
    }
    // reconnect left/right + update parent map/start if necessary
    const parentSub = this._parentSub;
    if (this._left === null) {
      let right;
      if (parentSub !== null) {
        const pmap = parent._map;
        right = pmap.get(parentSub) || null;
        pmap.set(parentSub, this);
      } else {
        right = parent._start;
        parent._start = this;
      }
      this._right = right;
      if (right !== null) {
        right._left = this;
      }
    } else {
      const left = this._left;
      const right = left._right;
      this._right = right;
      left._right = this;
      if (right !== null) {
        right._left = this;
      }
    }
    // adjust the length of parent
    if (parentSub === null && parent.length !== undefined && this._countable) {
      parent.length += this._length;
    }
    if (parent._deleted) {
      this._delete(y, false, true);
    }
    y.os.put(this);
    transactionTypeChanged(y, parent, parentSub);
    if (this._id.user !== RootFakeUserID) {
      writeStructToTransaction(y._transaction, this);
    }
  }

  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {encoding.Encoder} encoder The encoder to write data to.
   *
   * @private
   */
  _toBinary (encoder) {
    writeUint8(encoder, getStructReference(this.constructor));
    let info = 0;
    if (this._origin !== null) {
      info += 0b1; // origin is defined
    }
    // TODO: remove
    /* no longer send _left
    if (this._left !== this._origin) {
      info += 0b10 // do not copy origin to left
    }
    */
    if (this._right_origin !== null) {
      info += 0b100;
    }
    if (this._parentSub !== null) {
      info += 0b1000;
    }
    writeUint8(encoder, info);
    this._id.encode(encoder);
    if (info & 0b1) {
      this._origin._lastId.encode(encoder);
    }
    // TODO: remove
    /* see above
    if (info & 0b10) {
      encoder.writeID(this._left._lastId)
    }
    */
    if (info & 0b100) {
      this._right_origin._id.encode(encoder);
    }
    if ((info & 0b101) === 0) {
      // neither origin nor right is defined
      this._parent._id.encode(encoder);
    }
    if (info & 0b1000) {
      writeVarString(encoder, JSON.stringify(this._parentSub));
    }
  }

  /**
   * Read the next Item in a Decoder and fill this Item with the read data.
   *
   * This is called when data is received from a remote peer.
   *
   * @param {Y} y The Yjs instance that this Item belongs to.
   * @param {decoding.Decoder} decoder The decoder object to read data from.
   *
   * @private
   */
  _fromBinary (y, decoder) {
    let missing = [];
    const info = readUint8(decoder);
    const id = decode(decoder);
    this._id = id;
    // read origin
    if (info & 0b1) {
      // origin != null
      const originID = decode(decoder);
      // we have to query for left again because it might have been split/merged..
      const origin = y.os.getItemCleanEnd(originID);
      if (origin === null) {
        missing.push(originID);
      } else {
        this._origin = origin;
        this._left = this._origin;
      }
    }
    // read right
    if (info & 0b100) {
      // right != null
      const rightID = decode(decoder);
      // we have to query for right again because it might have been split/merged..
      const right = y.os.getItemCleanStart(rightID);
      if (right === null) {
        missing.push(rightID);
      } else {
        this._right = right;
        this._right_origin = right;
      }
    }
    // read parent
    if ((info & 0b101) === 0) {
      // neither origin nor right is defined
      const parentID = decode(decoder);
      // parent does not change, so we don't have to search for it again
      if (this._parent === null) {
        let parent;
        if (parentID.constructor === RootID) {
          parent = y.os.get(parentID);
        } else {
          parent = y.os.getItem(parentID);
        }
        if (parent === null) {
          missing.push(parentID);
        } else {
          this._parent = parent;
        }
      }
    } else if (this._parent === null) {
      if (this._origin !== null) {
        this._parent = this._origin._parent;
      } else if (this._right_origin !== null) {
        this._parent = this._right_origin._parent;
      }
    }
    if (info & 0b1000) {
      // TODO: maybe put this in read parent condition (you can also read parentsub from left/right)
      this._parentSub = JSON.parse(readVarString(decoder));
    }
    if (id instanceof ID && y.ss.getState(id.user) < id.clock) {
      missing.push(createID(id.user, id.clock - 1));
    }
    return missing
  }
}

/**
 * @module tree
 */

const rotate = (tree, parent, newParent, n) => {
  if (parent === null) {
    tree.root = newParent;
    newParent._parent = null;
  } else if (parent.left === n) {
    parent.left = newParent;
  } else if (parent.right === n) {
    parent.right = newParent;
  } else {
    throw new Error('The elements are wrongly connected!')
  }
};

class N {
  // A created node is always red!
  constructor (val) {
    this.val = val;
    this.color = true;
    this._left = null;
    this._right = null;
    this._parent = null;
  }
  isRed () { return this.color }
  isBlack () { return !this.color }
  redden () { this.color = true; return this }
  blacken () { this.color = false; return this }
  get grandparent () {
    return this.parent.parent
  }
  get parent () {
    return this._parent
  }
  get sibling () {
    return (this === this.parent.left)
      ? this.parent.right : this.parent.left
  }
  get left () {
    return this._left
  }
  get right () {
    return this._right
  }
  set left (n) {
    if (n !== null) {
      n._parent = this;
    }
    this._left = n;
  }
  set right (n) {
    if (n !== null) {
      n._parent = this;
    }
    this._right = n;
  }
  rotateLeft (tree) {
    const parent = this.parent;
    const newParent = this.right;
    const newRight = this.right.left;
    newParent.left = this;
    this.right = newRight;
    rotate(tree, parent, newParent, this);
  }
  next () {
    if (this.right !== null) {
      // search the most left node in the right tree
      var o = this.right;
      while (o.left !== null) {
        o = o.left;
      }
      return o
    } else {
      var p = this;
      while (p.parent !== null && p !== p.parent.left) {
        p = p.parent;
      }
      return p.parent
    }
  }
  prev () {
    if (this.left !== null) {
      // search the most right node in the left tree
      var o = this.left;
      while (o.right !== null) {
        o = o.right;
      }
      return o
    } else {
      var p = this;
      while (p.parent !== null && p !== p.parent.right) {
        p = p.parent;
      }
      return p.parent
    }
  }
  rotateRight (tree) {
    const parent = this.parent;
    const newParent = this.left;
    const newLeft = this.left.right;
    newParent.right = this;
    this.left = newLeft;
    rotate(tree, parent, newParent, this);
  }
  getUncle () {
    // we can assume that grandparent exists when this is called!
    if (this.parent === this.parent.parent.left) {
      return this.parent.parent.right
    } else {
      return this.parent.parent.left
    }
  }
}

const isBlack = node =>
  node !== null ? node.isBlack() : true;

const isRed = (node) =>
  node !== null ? node.isRed() : false;

/*
 * This is a Red Black Tree implementation
 */
class Tree {
  constructor () {
    this.root = null;
    this.length = 0;
  }
  findNext (id) {
    var nextID = id.clone();
    nextID.clock += 1;
    return this.findWithLowerBound(nextID)
  }
  findPrev (id) {
    let prevID = id.clone();
    prevID.clock -= 1;
    return this.findWithUpperBound(prevID)
  }
  findNodeWithLowerBound (from) {
    var o = this.root;
    if (o === null) {
      return null
    } else {
      while (true) {
        if (from === null || (from.lessThan(o.val._id) && o.left !== null)) {
          // o is included in the bound
          // try to find an element that is closer to the bound
          o = o.left;
        } else if (from !== null && o.val._id.lessThan(from)) {
          // o is not within the bound, maybe one of the right elements is..
          if (o.right !== null) {
            o = o.right;
          } else {
            // there is no right element. Search for the next bigger element,
            // this should be within the bounds
            return o.next()
          }
        } else {
          return o
        }
      }
    }
  }
  findNodeWithUpperBound (to) {
    if (to === void 0) {
      throw new Error('You must define from!')
    }
    var o = this.root;
    if (o === null) {
      return null
    } else {
      while (true) {
        if ((to === null || o.val._id.lessThan(to)) && o.right !== null) {
          // o is included in the bound
          // try to find an element that is closer to the bound
          o = o.right;
        } else if (to !== null && to.lessThan(o.val._id)) {
          // o is not within the bound, maybe one of the left elements is..
          if (o.left !== null) {
            o = o.left;
          } else {
            // there is no left element. Search for the prev smaller element,
            // this should be within the bounds
            return o.prev()
          }
        } else {
          return o
        }
      }
    }
  }
  findSmallestNode () {
    var o = this.root;
    while (o != null && o.left != null) {
      o = o.left;
    }
    return o
  }
  findWithLowerBound (from) {
    var n = this.findNodeWithLowerBound(from);
    return n == null ? null : n.val
  }
  findWithUpperBound (to) {
    var n = this.findNodeWithUpperBound(to);
    return n == null ? null : n.val
  }
  iterate (from, to, f) {
    var o;
    if (from === null) {
      o = this.findSmallestNode();
    } else {
      o = this.findNodeWithLowerBound(from);
    }
    while (
      o !== null &&
      (
        to === null || // eslint-disable-line no-unmodified-loop-condition
        o.val._id.lessThan(to) ||
        o.val._id.equals(to)
      )
    ) {
      f(o.val);
      o = o.next();
    }
  }
  find (id) {
    let n = this.findNode(id);
    if (n !== null) {
      return n.val
    } else {
      return null
    }
  }
  findNode (id) {
    var o = this.root;
    if (o === null) {
      return null
    } else {
      while (true) {
        if (o === null) {
          return null
        }
        if (id.lessThan(o.val._id)) {
          o = o.left;
        } else if (o.val._id.lessThan(id)) {
          o = o.right;
        } else {
          return o
        }
      }
    }
  }
  delete (id) {
    var d = this.findNode(id);
    if (d == null) {
      // throw new Error('Element does not exist!')
      return
    }
    this.length--;
    if (d.left !== null && d.right !== null) {
      // switch d with the greates element in the left subtree.
      // o should have at most one child.
      var o = d.left;
      // find
      while (o.right !== null) {
        o = o.right;
      }
      // switch
      d.val = o.val;
      d = o;
    }
    // d has at most one child
    // let n be the node that replaces d
    var isFakeChild;
    var child = d.left || d.right;
    if (child === null) {
      isFakeChild = true;
      child = new N(null);
      child.blacken();
      d.right = child;
    } else {
      isFakeChild = false;
    }

    if (d.parent === null) {
      if (!isFakeChild) {
        this.root = child;
        child.blacken();
        child._parent = null;
      } else {
        this.root = null;
      }
      return
    } else if (d.parent.left === d) {
      d.parent.left = child;
    } else if (d.parent.right === d) {
      d.parent.right = child;
    } else {
      throw new Error('Impossible!')
    }
    if (d.isBlack()) {
      if (child.isRed()) {
        child.blacken();
      } else {
        this._fixDelete(child);
      }
    }
    this.root.blacken();
    if (isFakeChild) {
      if (child.parent.left === child) {
        child.parent.left = null;
      } else if (child.parent.right === child) {
        child.parent.right = null;
      } else {
        throw new Error('Impossible #3')
      }
    }
  }
  _fixDelete (n) {
    if (n.parent === null) {
      // this can only be called after the first iteration of fixDelete.
      return
    }
    // d was already replaced by the child
    // d is not the root
    // d and child are black
    var sibling = n.sibling;
    if (isRed(sibling)) {
      // make sibling the grandfather
      n.parent.redden();
      sibling.blacken();
      if (n === n.parent.left) {
        n.parent.rotateLeft(this);
      } else if (n === n.parent.right) {
        n.parent.rotateRight(this);
      } else {
        throw new Error('Impossible #2')
      }
      sibling = n.sibling;
    }
    // parent, sibling, and children of n are black
    if (n.parent.isBlack() &&
      sibling.isBlack() &&
      isBlack(sibling.left) &&
      isBlack(sibling.right)
    ) {
      sibling.redden();
      this._fixDelete(n.parent);
    } else if (n.parent.isRed() &&
      sibling.isBlack() &&
      isBlack(sibling.left) &&
      isBlack(sibling.right)
    ) {
      sibling.redden();
      n.parent.blacken();
    } else {
      if (n === n.parent.left &&
        sibling.isBlack() &&
        isRed(sibling.left) &&
        isBlack(sibling.right)
      ) {
        sibling.redden();
        sibling.left.blacken();
        sibling.rotateRight(this);
        sibling = n.sibling;
      } else if (n === n.parent.right &&
        sibling.isBlack() &&
        isRed(sibling.right) &&
        isBlack(sibling.left)
      ) {
        sibling.redden();
        sibling.right.blacken();
        sibling.rotateLeft(this);
        sibling = n.sibling;
      }
      sibling.color = n.parent.color;
      n.parent.blacken();
      if (n === n.parent.left) {
        sibling.right.blacken();
        n.parent.rotateLeft(this);
      } else {
        sibling.left.blacken();
        n.parent.rotateRight(this);
      }
    }
  }
  put (v) {
    var node = new N(v);
    if (this.root !== null) {
      var p = this.root; // p abbrev. parent
      while (true) {
        if (node.val._id.lessThan(p.val._id)) {
          if (p.left === null) {
            p.left = node;
            break
          } else {
            p = p.left;
          }
        } else if (p.val._id.lessThan(node.val._id)) {
          if (p.right === null) {
            p.right = node;
            break
          } else {
            p = p.right;
          }
        } else {
          p.val = node.val;
          return p
        }
      }
      this._fixInsert(node);
    } else {
      this.root = node;
    }
    this.length++;
    this.root.blacken();
    return node
  }
  _fixInsert (n) {
    if (n.parent === null) {
      n.blacken();
      return
    } else if (n.parent.isBlack()) {
      return
    }
    var uncle = n.getUncle();
    if (uncle !== null && uncle.isRed()) {
      // Note: parent: red, uncle: red
      n.parent.blacken();
      uncle.blacken();
      n.grandparent.redden();
      this._fixInsert(n.grandparent);
    } else {
      // Note: parent: red, uncle: black or null
      // Now we transform the tree in such a way that
      // either of these holds:
      //   1) grandparent.left.isRed
      //     and grandparent.left.left.isRed
      //   2) grandparent.right.isRed
      //     and grandparent.right.right.isRed
      if (n === n.parent.right && n.parent === n.grandparent.left) {
        n.parent.rotateLeft(this);
        // Since we rotated and want to use the previous
        // cases, we need to set n in such a way that
        // n.parent.isRed again
        n = n.left;
      } else if (n === n.parent.left && n.parent === n.grandparent.right) {
        n.parent.rotateRight(this);
        // see above
        n = n.right;
      }
      // Case 1) or 2) hold from here on.
      // Now traverse grandparent, make parent a black node
      // on the highest level which holds two red nodes.
      n.parent.blacken();
      n.grandparent.redden();
      if (n === n.parent.left) {
        // Case 1
        n.grandparent.rotateRight(this);
      } else {
        // Case 2
        n.grandparent.rotateLeft(this);
      }
    }
  }
}

/**
 * @module utils
 */

class DSNode {
  constructor (id, len, gc) {
    this._id = id;
    this.len = len;
    this.gc = gc;
  }
  clone () {
    return new DSNode(this._id, this.len, this.gc)
  }
}

class DeleteStore extends Tree {
  logTable () {
    const deletes = [];
    this.iterate(null, null, n => {
      deletes.push({
        user: n._id.user,
        clock: n._id.clock,
        len: n.len,
        gc: n.gc
      });
    });
    console.table(deletes);
  }
  isDeleted (id) {
    var n = this.findWithUpperBound(id);
    return n !== null && n._id.user === id.user && id.clock < n._id.clock + n.len
  }
  mark (id, length$$1, gc) {
    if (length$$1 === 0) return
    // Step 1. Unmark range
    const leftD = this.findWithUpperBound(createID(id.user, id.clock - 1));
    // Resize left DSNode if necessary
    if (leftD !== null && leftD._id.user === id.user) {
      if (leftD._id.clock < id.clock && id.clock < leftD._id.clock + leftD.len) {
        // node is overlapping. need to resize
        if (id.clock + length$$1 < leftD._id.clock + leftD.len) {
          // overlaps new mark range and some more
          // create another DSNode to the right of new mark
          this.put(new DSNode(createID(id.user, id.clock + length$$1), leftD._id.clock + leftD.len - id.clock - length$$1, leftD.gc));
        }
        // resize left DSNode
        leftD.len = id.clock - leftD._id.clock;
      } // Otherwise there is no overlapping
    }
    // Resize right DSNode if necessary
    const upper = createID(id.user, id.clock + length$$1 - 1);
    const rightD = this.findWithUpperBound(upper);
    if (rightD !== null && rightD._id.user === id.user) {
      if (rightD._id.clock < id.clock + length$$1 && id.clock <= rightD._id.clock && id.clock + length$$1 < rightD._id.clock + rightD.len) { // we only consider the case where we resize the node
        const d = id.clock + length$$1 - rightD._id.clock;
        rightD._id = createID(rightD._id.user, rightD._id.clock + d);
        rightD.len -= d;
      }
    }
    // Now we only have to delete all inner marks
    const deleteNodeIds = [];
    this.iterate(id, upper, m => {
      deleteNodeIds.push(m._id);
    });
    for (let i = deleteNodeIds.length - 1; i >= 0; i--) {
      this.delete(deleteNodeIds[i]);
    }
    let newMark = new DSNode(id, length$$1, gc);
    // Step 2. Check if we can extend left or right
    if (leftD !== null && leftD._id.user === id.user && leftD._id.clock + leftD.len === id.clock && leftD.gc === gc) {
      // We can extend left
      leftD.len += length$$1;
      newMark = leftD;
    }
    const rightNext = this.find(createID(id.user, id.clock + length$$1));
    if (rightNext !== null && rightNext._id.user === id.user && id.clock + length$$1 === rightNext._id.clock && gc === rightNext.gc) {
      // We can merge newMark and rightNext
      newMark.len += rightNext.len;
      this.delete(rightNext._id);
    }
    if (leftD !== newMark) {
      // only put if we didn't extend left
      this.put(newMark);
    }
  }
}

/**
 * Stringifies a message-encoded Delete Set.
 *
 * @param {decoding.Decoder} decoder
 * @return {string}
 */
const stringifyDeleteStore = (decoder) => {
  let str = '';
  const dsLength = readUint32(decoder);
  for (let i = 0; i < dsLength; i++) {
    str += ' -' + readVarUint(decoder) + ':\n'; // decodes user
    const dvLength = readUint32(decoder);
    for (let j = 0; j < dvLength; j++) {
      str += `clock: ${readVarUint(decoder)}, length: ${readVarUint(decoder)}, gc: ${readUint8(decoder) === 1}\n`;
    }
  }
  return str
};

/**
 * Write the DeleteSet of a shared document to an Encoder.
 *
 * @param {encoding.Encoder} encoder
 * @param {DeleteStore} ds
 */
const writeDeleteStore = (encoder, ds) => {
  let currentUser = null;
  let currentLength;
  let lastLenPos;
  let numberOfUsers = 0;
  const laterDSLenPus = length(encoder);
  writeUint32(encoder, 0);
  ds.iterate(null, null, n => {
    const user = n._id.user;
    const clock = n._id.clock;
    const len = n.len;
    const gc = n.gc;
    if (currentUser !== user) {
      numberOfUsers++;
      // a new user was found
      if (currentUser !== null) { // happens on first iteration
        setUint32(encoder, lastLenPos, currentLength);
      }
      currentUser = user;
      writeVarUint(encoder, user);
      // pseudo-fill pos
      lastLenPos = length(encoder);
      writeUint32(encoder, 0);
      currentLength = 0;
    }
    writeVarUint(encoder, clock);
    writeVarUint(encoder, len);
    writeUint8(encoder, gc ? 1 : 0);
    currentLength++;
  });
  if (currentUser !== null) { // happens on first iteration
    setUint32(encoder, lastLenPos, currentLength);
  }
  setUint32(encoder, laterDSLenPus, numberOfUsers);
};

/**
 * Read delete set from Decoder and apply it to a shared document.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const readDeleteStore = (decoder, y) => {
  const dsLength = readUint32(decoder);
  for (let i = 0; i < dsLength; i++) {
    const user = readVarUint(decoder);
    const dv = [];
    const dvLength = readUint32(decoder);
    for (let j = 0; j < dvLength; j++) {
      const from = readVarUint(decoder);
      const len = readVarUint(decoder);
      const gc = readUint8(decoder) === 1;
      dv.push({from, len, gc});
    }
    if (dvLength > 0) {
      const deletions = [];
      let pos = 0;
      let d = dv[pos];
      y.ds.iterate(createID(user, 0), createID(user, Number.MAX_VALUE), n => {
        // cases:
        // 1. d deletes something to the right of n
        //  => go to next n (break)
        // 2. d deletes something to the left of n
        //  => create deletions
        //  => reset d accordingly
        //  *)=> if d doesn't delete anything anymore, go to next d (continue)
        // 3. not 2) and d deletes something that also n deletes
        //  => reset d so that it doesn't contain n's deletion
        //  *)=> if d does not delete anything anymore, go to next d (continue)
        while (d != null) {
          var diff = 0; // describe the diff of length in 1) and 2)
          if (n._id.clock + n.len <= d.from) {
            // 1)
            break
          } else if (d.from < n._id.clock) {
            // 2)
            // delete maximum the len of d
            // else delete as much as possible
            diff = Math.min(n._id.clock - d.from, d.len);
            // deleteItemRange(y, user, d.from, diff, true)
            deletions.push([user, d.from, diff]);
          } else {
            // 3)
            diff = n._id.clock + n.len - d.from; // never null (see 1)
            if (d.gc && !n.gc) {
              // d marks as gc'd but n does not
              // then delete either way
              // deleteItemRange(y, user, d.from, Math.min(diff, d.len), true)
              deletions.push([user, d.from, Math.min(diff, d.len)]);
            }
          }
          if (d.len <= diff) {
            // d doesn't delete anything anymore
            d = dv[++pos];
          } else {
            d.from = d.from + diff; // reset pos
            d.len = d.len - diff; // reset length
          }
        }
      });
      // TODO: It would be more performant to apply the deletes in the above loop
      // Adapt the Tree implementation to support delete while iterating
      for (let i = deletions.length - 1; i >= 0; i--) {
        const del = deletions[i];
        const delStruct = new Delete();
        delStruct._targetID = new ID(del[0], del[1]);
        delStruct._length = del[2];
        delStruct._integrate(y, false, true);
        //deleteItemRange(y, del[0], del[1], del[2], true)
      }
      // for the rest.. just apply it
      for (; pos < dv.length; pos++) {
        d = dv[pos];
        const delStruct = new Delete();
        delStruct._targetID = new ID(user, d.from);
        delStruct._length = d.len;
        delStruct._integrate(y, false, true);
        //deleteItemRange(y, user, d.from, d.len, true)
        // deletions.push([user, d.from, d.len, d.gc)
      }
    }
  }
};

/**
 * @module utils
 */

class OperationStore extends Tree {
  constructor (y) {
    super();
    this.y = y;
  }
  logTable () {
    const items = [];
    this.iterate(null, null, item => {
      if (item.constructor === GC) {
        items.push({
          id: stringifyItemID(item),
          content: item._length,
          deleted: 'GC'
        });
      } else {
        items.push({
          id: stringifyItemID(item),
          origin: item._origin === null ? '()' : stringifyID(item._origin._lastId),
          left: item._left === null ? '()' : stringifyID(item._left._lastId),
          right: stringifyItemID(item._right),
          right_origin: stringifyItemID(item._right_origin),
          parent: stringifyItemID(item._parent),
          parentSub: item._parentSub,
          deleted: item._deleted,
          content: JSON.stringify(item._content)
        });
      }
    });
    console.table(items);
  }
  get (id) {
    let struct = this.find(id);
    if (struct === null && id instanceof RootID) {
      const Constr = getStruct(id.type);
      const y = this.y;
      struct = new Constr();
      struct._id = id;
      struct._parent = y;
      y.transact(() => {
        struct._integrate(y);
      });
      this.put(struct);
    }
    return struct
  }
  // Use getItem for structs with _length > 1
  getItem (id) {
    var item = this.findWithUpperBound(id);
    if (item === null) {
      return null
    }
    const itemID = item._id;
    if (id.user === itemID.user && id.clock < itemID.clock + item._length) {
      return item
    } else {
      return null
    }
  }
  // Return an insertion such that id is the first element of content
  // This function manipulates an item, if necessary
  getItemCleanStart (id) {
    var ins = this.getItem(id);
    if (ins === null || ins._length === 1) {
      return ins
    }
    const insID = ins._id;
    if (insID.clock === id.clock) {
      return ins
    } else {
      return ins._splitAt(this.y, id.clock - insID.clock)
    }
  }
  // Return an insertion such that id is the last element of content
  // This function manipulates an operation, if necessary
  getItemCleanEnd (id) {
    var ins = this.getItem(id);
    if (ins === null || ins._length === 1) {
      return ins
    }
    const insID = ins._id;
    if (insID.clock + ins._length - 1 === id.clock) {
      return ins
    } else {
      ins._splitAt(this.y, id.clock - insID.clock + 1);
      return ins
    }
  }
}

/**
 * @module utils
 */

/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Read StateMap from Decoder and return as Map
 *
 * @param {decoding.Decoder} decoder
 * @return {StateMap}
 */
const readStateMap = decoder => {
  const ss = new Map();
  const ssLength = readUint32(decoder);
  for (let i = 0; i < ssLength; i++) {
    const user = readVarUint(decoder);
    const clock = readVarUint(decoder);
    ss.set(user, clock);
  }
  return ss
};

/**
 * Write StateMap to Encoder
 *
 * @param {encoding.Encoder} encoder
 * @param {StateMap} state
 */
const writeStateMap = (encoder, state) => {
  // write as fixed-size number to stay consistent with the other encode functions.
  // => anytime we write the number of objects that follow, encode as fixed-size number.
  writeUint32(encoder, state.size);
  state.forEach((clock, user) => {
    writeVarUint(encoder, user);
    writeVarUint(encoder, clock);
  });
};

/**
 */
class StateStore {
  constructor (y) {
    this.y = y;
    this.state = new Map();
  }
  logTable () {
    const entries = [];
    for (let [user, state] of this.state) {
      entries.push({
        user, state
      });
    }
    console.table(entries);
  }
  getNextID (len) {
    const user = this.y.userID;
    const state = this.getState(user);
    this.setState(user, state + len);
    return createID(user, state)
  }
  updateRemoteState (struct) {
    let user = struct._id.user;
    let userState = this.state.get(user);
    while (struct !== null && struct._id.clock === userState) {
      userState += struct._length;
      struct = this.y.os.get(createID(user, userState));
    }
    this.state.set(user, userState);
  }
  getState (user) {
    let state = this.state.get(user);
    if (state == null) {
      return 0
    }
    return state
  }
  setState (user, state) {
    // TODO: modify missingi structs here
    const beforeState = this.y._transaction.beforeState;
    if (!beforeState.has(user)) {
      beforeState.set(user, this.getState(user));
    }
    this.state.set(user, state);
  }
}

/**
 * @module utils
 */

/* global crypto */

const generateRandomUint32 = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues != null) {
    // browser
    let arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0]
  } else if (typeof crypto !== 'undefined' && crypto.randomBytes != null) {
    // node
    let buf = crypto.randomBytes(4);
    return new Uint32Array(buf.buffer)[0]
  } else {
    return Math.ceil(Math.random() * 0xFFFFFFFF)
  }
};

/**
 * Handles named events.
 */
class NamedEventHandler {
  constructor () {
    this._eventListener = new Map();
    this._stateListener = new Map();
  }

  /**
   * @private
   * Returns all listeners that listen to a specified name.
   *
   * @param {String} name The query event name.
   */
  _getListener (name) {
    let listeners = this._eventListener.get(name);
    if (listeners === undefined) {
      listeners = {
        once: new Set(),
        on: new Set()
      };
      this._eventListener.set(name, listeners);
    }
    return listeners
  }

  /**
   * Adds a named event listener. The listener is removed after it has been
   * called once.
   *
   * @param {String} name The event name to listen to.
   * @param {Function} f The function that is executed when the event is fired.
   */
  once (name, f) {
    let listeners = this._getListener(name);
    listeners.once.add(f);
  }

  /**
   * Adds a named event listener.
   *
   * @param {String} name The event name to listen to.
   * @param {Function} f The function that is executed when the event is fired.
   */
  on (name, f) {
    let listeners = this._getListener(name);
    listeners.on.add(f);
  }

  /**
   * @private
   * Init the saved state for an event name.
   */
  _initStateListener (name) {
    let state = this._stateListener.get(name);
    if (state === undefined) {
      state = {};
      state.promise = new Promise(resolve => {
        state.resolve = resolve;
      });
      this._stateListener.set(name, state);
    }
    return state
  }

  /**
   * Returns a Promise that is resolved when the event name is called.
   * The Promise is immediately resolved when the event name was called in the
   * past.
   */
  when (name) {
    return this._initStateListener(name).promise
  }

  /**
   * Remove an event listener that was registered with either
   * {@link EventHandler#on} or {@link EventHandler#once}.
   */
  off (name, f) {
    if (name == null || f == null) {
      throw new Error('You must specify event name and function!')
    }
    const listener = this._eventListener.get(name);
    if (listener !== undefined) {
      listener.on.delete(f);
      listener.once.delete(f);
    }
  }

  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @param {String} name The event name.
   * @param {Array} args The arguments that are applied to the event listener.
   */
  emit (name, ...args) {
    if(!this._eventListener) {
      console.error('cannot emit event on already destroyed instance', name, args);
    }
    this._initStateListener(name).resolve();
    const listener = this._eventListener.get(name);
    if (listener !== undefined) {
      listener.on.forEach(f => f.apply(null, args));
      listener.once.forEach(f => f.apply(null, args));
      listener.once = new Set();
    } else if (name === 'error') {
      console.error(args[0]);
    }
  }
  destroy () {
    this._eventListener = null;
  }
}

/**
 * @module utils
 */

/**
 * General event handler implementation.
 */
class EventHandler {
  constructor () {
    this.eventListeners = [];
  }

  /**
   * To prevent memory leaks, call this method when the eventListeners won't be
   * used anymore.
   */
  destroy () {
    this.eventListeners = null;
  }

  /**
   * Adds an event listener that is called when
   * {@link EventHandler#callEventListeners} is called.
   *
   * @param {Function} f The event handler.
   */
  addEventListener (f) {
    this.eventListeners.push(f);
  }

  /**
   * Removes an event listener.
   *
   * @param {Function} f The event handler that was added with
   *                     {@link EventHandler#addEventListener}
   */
  removeEventListener (f) {
    this.eventListeners = this.eventListeners.filter(g => f !== g);
  }

  /**
   * Removes all event listeners.
   */
  removeAllEventListeners () {
    this.eventListeners = [];
  }

  /**
   * Call all event listeners that were added via
   * {@link EventHandler#addEventListener}.
   *
   * @param {Transaction} transaction The transaction object
   * @param {YEvent} event An event object that describes the change on a type.
   */
  callEventListeners (transaction, event) {
    for (var i = 0; i < this.eventListeners.length; i++) {
      try {
        const f = this.eventListeners[i];
        f(event, transaction);
      } catch (e) {
        /*
          Your observer threw an error. This error was caught so that Yjs
          can ensure data consistency! In order to debug this error you
          have to check "Pause On Caught Exceptions" in developer tools.
        */
        console.error(e);
      }
    }
  }
}

/**
 * @module utils
 */

/**
 * YEvent describes the changes on a YType.
 */
class YEvent {
  /**
   * @param {Type} target The changed type.
   */
  constructor (target) {
    /**
     * The type on which this event was created on.
     * @type {Type}
     */
    this.target = target;
    /**
     * The current target on which the observe callback is called.
     * @type {Type}
     */
    this.currentTarget = target;
  }

  /**
   * Computes the path from `y` to the changed type.
   *
   * The following property holds:
   * @example
   *   let type = y
   *   event.path.forEach(dir => {
   *     type = type.get(dir)
   *   })
   *   type === event.target // => true
   */
  get path () {
    return this.currentTarget.getPathTo(this.target)
  }
}

/**
 * @module structs
 */

// restructure children as if they were inserted one after another
const integrateChildren = (y, start) => {
  let right;
  do {
    right = start._right;
    start._right = null;
    start._right_origin = null;
    start._origin = start._left;
    start._integrate(y);
    start = right;
  } while (right !== null)
};

const gcChildren = (y, item) => {
  while (item !== null) {
    item._delete(y, false, true);
    item._gc(y);
    item = item._right;
  }
};

/**
 * Abstract Yjs Type class
 */
class Type extends Item {
  constructor () {
    super();
    this._map = new Map();
    this._start = null;
    this._y = null;
    this._eventHandler = new EventHandler();
    this._deepEventHandler = new EventHandler();
  }

  /**
   * The first non-deleted item
   */
  get _first () {
    let n = this._start;
    while (n !== null && n._deleted) {
      n = n._right;
    }
    return n
  }

  /**
   * Compute the path from this type to the specified target.
   *
   * @example
   * It should be accessible via `this.get(result[0]).get(result[1])..`
   * const path = type.getPathTo(child)
   * // assuming `type instanceof YArray`
   * console.log(path) // might look like => [2, 'key1']
   * child === type.get(path[0]).get(path[1])
   *
   * @param {Type | Y | any} type Type target
   * @return {Array<string>} Path to the target
   */
  getPathTo (type) {
    if (type === this) {
      return []
    }
    const path = [];
    const y = this._y;
    while (type !== this && type !== y) {
      let parent = type._parent;
      if (type._parentSub !== null) {
        path.unshift(type._parentSub);
      } else {
        // parent is array-ish
        for (let [i, child] of parent) {
          if (child === type) {
            path.unshift(i);
            break
          }
        }
      }
      type = parent;
    }
    if (type !== this) {
      throw new Error('The type is not a child of this node')
    }
    return path
  }

  /**
   * Creates YArray Event and calls observers.
   * @private
   */
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YEvent(this));
  }

  /**
   * Call event listeners with an event. This will also add an event to all
   * parents (for `.observeDeep` handlers).
   * @private
   */
  _callEventHandler (transaction, event) {
    const changedParentTypes = transaction.changedParentTypes;
    this._eventHandler.callEventListeners(transaction, event);
    /**
     * @type {any}
     */
    let type = this;
    while (type !== this._y) {
      let events = changedParentTypes.get(type);
      if (events === undefined) {
        events = [];
        changedParentTypes.set(type, events);
      }
      events.push(event);
      type = type._parent;
    }
  }

  /**
   * Helper method to transact if the y instance is available.
   *
   * TODO: Currently event handlers are not thrown when a type is not registered
   *       with a Yjs instance.
   * @private
   */
  _transact (f) {
    const y = this._y;
    if (y !== null) {
      y.transact(f);
    } else {
      f(y);
    }
  }

  /**
   * Observe all events that are created on this type.
   *
   * @param {Function} f Observer function
   */
  observe (f) {
    this._eventHandler.addEventListener(f);
  }

  /**
   * Observe all events that are created by this type and its children.
   *
   * @param {Function} f Observer function
   */
  observeDeep (f) {
    this._deepEventHandler.addEventListener(f);
  }

  /**
   * Unregister an observer function.
   *
   * @param {Function} f Observer function
   */
  unobserve (f) {
    this._eventHandler.removeEventListener(f);
  }

  /**
   * Unregister an observer function.
   *
   * @param {Function} f Observer function
   */
  unobserveDeep (f) {
    this._deepEventHandler.removeEventListener(f);
  }

  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Y} y The Yjs instance
   * @private
   */
  _integrate (y) {
    super._integrate(y);
    this._y = y;
    // when integrating children we must make sure to
    // integrate start
    const start = this._start;
    if (start !== null) {
      this._start = null;
      integrateChildren(y, start);
    }
    // integrate map children_integrate
    const map = this._map;
    this._map = new Map();
    for (let t of map.values()) {
      // TODO make sure that right elements are deleted!
      integrateChildren(y, t);
    }
  }

  _gcChildren (y) {
    gcChildren(y, this._start);
    this._start = null;
    this._map.forEach(item => {
      gcChildren(y, item);
    });
    this._map = new Map();
  }

  _gc (y) {
    this._gcChildren(y);
    super._gc(y);
  }

  /**
   * @abstract
   * @return {Object | Array | number | string}
   */
  toJSON () {}

  /**
   * Mark this Item as deleted.
   *
   * @param {Y} y The Yjs instance
   * @param {boolean} createDelete Whether to propagate a message that this
   *                               Type was deleted.
   * @param {boolean} [gcChildren=(y._hasUndoManager===false)] Whether to garbage
   *                                         collect the children of this type.
   * @private
   */
  _delete (y, createDelete, gcChildren) {
    if (gcChildren === undefined || !y.gcEnabled) {
      gcChildren = y._hasUndoManager === false && y.gcEnabled;
    }
    super._delete(y, createDelete, gcChildren);
    y._transaction.changedTypes.delete(this);
    // delete map types
    for (let value of this._map.values()) {
      if (value instanceof Item && !value._deleted) {
        value._delete(y, false, gcChildren);
      }
    }
    // delete array types
    let t = this._start;
    while (t !== null) {
      if (!t._deleted) {
        t._delete(y, false, gcChildren);
      }
      t = t._right;
    }
    if (gcChildren) {
      this._gcChildren(y);
    }
  }
}

/**
 * @module utils
 */
/**
 * A transaction is created for every change on the Yjs model. It is possible
 * to bundle changes on the Yjs model in a single transaction to
 * minimize the number on messages sent and the number of observer calls.
 * If possible the user of this library should bundle as many changes as
 * possible. Here is an example to illustrate the advantages of bundling:
 *
 * @example
 * const map = y.define('map', YMap)
 * // Log content when change is triggered
 * map.observe(() => {
 *   console.log('change triggered')
 * })
 * // Each change on the map type triggers a log message:
 * map.set('a', 0) // => "change triggered"
 * map.set('b', 0) // => "change triggered"
 * // When put in a transaction, it will trigger the log after the transaction:
 * y.transact(() => {
 *   map.set('a', 1)
 *   map.set('b', 1)
 * }) // => "change triggered"
 *
 */
class Transaction {
  constructor (y) {
    /**
     * @type {Y} The Yjs instance.
     */
    this.y = y;
    /**
     * All new types that are added during a transaction.
     * @type {Set<Item>}
     */
    this.newTypes = new Set();
    /**
     * All types that were directly modified (property added or child
     * inserted/deleted). New types are not included in this Set.
     * Maps from type to parentSubs (`item._parentSub = null` for YArray)
     * @type {Map<Type|Y,String>}
     */
    this.changedTypes = new Map();
    // TODO: rename deletedTypes
    /**
     * Set of all deleted Types and Structs.
     * @type {Set<Item>}
     */
    this.deletedStructs = new Set();
    /**
     * Saves the old state set of the Yjs instance. If a state was modified,
     * the original value is saved here.
     * @type {Map<Number,Number>}
     */
    this.beforeState = new Map();
    /**
     * Stores the events for the types that observe also child elements.
     * It is mainly used by `observeDeep`.
     * @type {Map<Type,Array<YEvent>>}
     */
    this.changedParentTypes = new Map();
    this.encodedStructsLen = 0;
    this.encodedStructs = createEncoder();
  }
}

/**
 * @module utils
 */

class MissingEntry {
  constructor (decoder, missing, struct) {
    this.decoder = decoder;
    this.missing = missing.length;
    this.struct = struct;
  }
}

/**
 * @private
 * Integrate remote struct
 * When a remote struct is integrated, other structs might be ready to ready to
 * integrate.
 * @param {Y} y
 * @param {Item} struct
 */
function _integrateRemoteStructHelper (y, struct) {
  const id = struct._id;
  if (id === undefined) {
    struct._integrate(y);
  } else {
    if (y.ss.getState(id.user) > id.clock) {
      return
    }
    if (!y.gcEnabled || struct.constructor === GC || (struct._parent.constructor !== GC && struct._parent._deleted === false)) {
      // Is either a GC or Item with an undeleted parent
      // save to integrate
      struct._integrate(y);
    } else {
      // Is an Item. parent was deleted.
      struct._gc(y);
    }
    let msu = y._missingStructs.get(id.user);
    if (msu != null) {
      let clock = id.clock;
      const finalClock = clock + struct._length;
      for (;clock < finalClock; clock++) {
        const missingStructs = msu.get(clock);
        if (missingStructs !== undefined) {
          missingStructs.forEach(missingDef => {
            missingDef.missing--;
            if (missingDef.missing === 0) {
              const decoder = missingDef.decoder;
              let oldPos = decoder.pos;
              let missing = missingDef.struct._fromBinary(y, decoder);
              decoder.pos = oldPos;
              if (missing.length === 0) {
                y._readyToIntegrate.push(missingDef.struct);
              }
            }
          });
          msu.delete(clock);
        }
      }
      if (msu.size === 0) {
        y._missingStructs.delete(id.user);
      }
    }
  }
}

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const integrateRemoteStructs = (decoder, y) => {
  const len = readUint32(decoder);
  for (let i = 0; i < len; i++) {
    let reference = readVarUint(decoder);
    let Constr = getStruct(reference);
    let struct = new Constr();
    let decoderPos = decoder.pos;
    let missing = struct._fromBinary(y, decoder);
    if (missing.length === 0) {
      while (struct != null) {
        _integrateRemoteStructHelper(y, struct);
        struct = y._readyToIntegrate.shift();
      }
    } else {
      let _decoder = createDecoder(decoder.arr.buffer);
      _decoder.pos = decoderPos;
      let missingEntry = new MissingEntry(_decoder, missing, struct);
      let missingStructs = y._missingStructs;
      for (let i = missing.length - 1; i >= 0; i--) {
        let m = missing[i];
        if (!missingStructs.has(m.user)) {
          missingStructs.set(m.user, new Map());
        }
        let msu = missingStructs.get(m.user);
        if (!msu.has(m.clock)) {
          msu.set(m.clock, []);
        }
        let mArray = msu = msu.get(m.clock);
        mArray.push(missingEntry);
      }
    }
  }
};

// TODO: use this above / refactor
/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const integrateRemoteStruct = (decoder, y) => {
  let reference = readVarUint(decoder);
  let Constr = getStruct(reference);
  let struct = new Constr();
  let decoderPos = decoder.pos;
  let missing = struct._fromBinary(y, decoder);
  if (missing.length === 0) {
    while (struct != null) {
      _integrateRemoteStructHelper(y, struct);
      struct = y._readyToIntegrate.shift();
    }
  } else {
    let _decoder = createDecoder(decoder.arr.buffer);
    _decoder.pos = decoderPos;
    let missingEntry = new MissingEntry(_decoder, missing, struct);
    let missingStructs = y._missingStructs;
    for (let i = missing.length - 1; i >= 0; i--) {
      let m = missing[i];
      if (!missingStructs.has(m.user)) {
        missingStructs.set(m.user, new Map());
      }
      let msu = missingStructs.get(m.user);
      if (!msu.has(m.clock)) {
        msu.set(m.clock, []);
      }
      let mArray = msu = msu.get(m.clock);
      mArray.push(missingEntry);
    }
  }
};

/**
 * @module sync-protocol
 */

/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Core Yjs only defines three message types:
 * • YjsSyncStep1: Includes the State Set of the sending client. When received, the client should reply with YjsSyncStep2.
 * • YjsSyncStep2: Includes all missing structs and the complete delete set. When received, the the client is assured that
 *   it received all information from the remote client.
 *
 * In a peer-to-peer network, you may want to introduce a SyncDone message type. Both parties should initiate the connection
 * with SyncStep1. When a client received SyncStep2, it should reply with SyncDone. When the local client received both
 * SyncStep2 and SyncDone, it is assured that it is synced to the remote client.
 *
 * In a client-server model, you want to handle this differently: The client should initiate the connection with SyncStep1.
 * When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The client replies
 * with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
 * client knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
 * easily be implemented on top of http and websockets. 2. The server shoul only reply to requests, and not initiate them.
 * Therefore it is necesarry that the client initiates the sync.
 *
 * Construction of a message:
 * [messageType : varUint, message definition..]
 *
 * Note: A message does not include information about the room name. This must to be handled by the upper layer protocol!
 *
 * stringify[messageType] stringifies a message definition (messageType is already read from the bufffer)
 */

const messageYjsSyncStep1 = 0;
const messageYjsSyncStep2 = 1;
const messageYjsUpdate = 2;

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 * @return {string}
 */
const stringifyStructs = (decoder, y) => {
  let str = '';
  const len = readUint32(decoder);
  for (let i = 0; i < len; i++) {
    let reference = readVarUint(decoder);
    let Constr = getStruct(reference);
    let struct = new Constr();
    let missing = struct._fromBinary(y, decoder);
    let logMessage = '  ' + struct._logString();
    if (missing.length > 0) {
      logMessage += ' .. missing: ' + missing.map(stringifyItemID).join(', ');
    }
    str += logMessage + '\n';
  }
  return str
};

/**
 * Write all Items that are not not included in ss to
 * the encoder object.
 *
 * @param {encoding.Encoder} encoder
 * @param {Y} y
 * @param {StateMap} ss State Set received from a remote client. Maps from client id to number of created operations by client id.
 */
const writeStructs = (encoder, y, ss) => {
  const lenPos = length(encoder);
  writeUint32(encoder, 0);
  let len = 0;
  for (let user of y.ss.state.keys()) {
    let clock = ss.get(user) || 0;
    if (user !== RootFakeUserID) {
      const minBound = createID(user, clock);
      const overlappingLeft = y.os.findPrev(minBound);
      const rightID = overlappingLeft === null ? null : overlappingLeft._id;
      if (rightID !== null && rightID.user === user && rightID.clock + overlappingLeft._length > clock) {
        // TODO: only write partial content (only missing content)
        // const struct = overlappingLeft._clonePartial(clock - rightID.clock)
        const struct = overlappingLeft;
        struct._toBinary(encoder);
        len++;
      }
      y.os.iterate(minBound, createID(user, Number.MAX_VALUE), struct => {
        struct._toBinary(encoder);
        len++;
      });
    }
  }
  setUint32(encoder, lenPos, len);
};

/**
 * Read structs and delete operations from decoder and apply them on a shared document.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const readStructs = (decoder, y) => {
  const len = readUint32(decoder);
  for (let i = 0; i < len; i++) {
    integrateRemoteStruct(decoder, y);
  }
};

/**
 * Read SyncStep1 and return it as a readable string.
 *
 * @param {decoding.Decoder} decoder
 * @return {string}
 */
const stringifySyncStep1 = (decoder) => {
  let s = 'SyncStep1: ';
  const len = readUint32(decoder);
  for (let i = 0; i < len; i++) {
    const user = readVarUint(decoder);
    const clock = readVarUint(decoder);
    s += `(${user}:${clock})`;
  }
  return s
};

/**
 * Create a sync step 1 message based on the state of the current shared document.
 *
 * @param {encoding.Encoder} encoder
 * @param {Y} y
 */
const writeSyncStep1 = (encoder, y) => {
  writeVarUint(encoder, messageYjsSyncStep1);
  writeStateMap(encoder, y.ss.state);
};

/**
 * @param {encoding.Encoder} encoder
 * @param {Y} y
 * @param {Map<number, number>} ss
 */
const writeSyncStep2 = (encoder, y, ss) => {
  writeVarUint(encoder, messageYjsSyncStep2);
  writeStructs(encoder, y, ss);
  writeDeleteStore(encoder, y.ds);
};

/**
 * Read SyncStep1 message and reply with SyncStep2.
 *
 * @param {decoding.Decoder} decoder The reply to the received message
 * @param {encoding.Encoder} encoder The received message
 * @param {Y} y
 */
const readSyncStep1 = (decoder, encoder, y) =>
  writeSyncStep2(encoder, y, readStateMap(decoder));

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 * @return {string}
 */
const stringifySyncStep2 = (decoder, y) => {
  let str = '  == Sync step 2:\n';
  str += ' + Structs:\n';
  str += stringifyStructs(decoder, y);
  // write DS to string
  str += ' + Delete Set:\n';
  str += stringifyDeleteStore(decoder);
  return str
};

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const readSyncStep2 = (decoder, y) => {
  readStructs(decoder, y);
  readDeleteStore(decoder, y);
};

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 * @return {string}
 */
const stringifyUpdate = (decoder, y) =>
  '  == Update:\n' + stringifyStructs(decoder, y);

/**
 * @param {encoding.Encoder} encoder
 * @param {number} numOfStructs
 * @param {encoding.Encoder} updates
 */
const writeUpdate = (encoder, numOfStructs, updates) => {
  writeVarUint(encoder, messageYjsUpdate);
  writeUint32(encoder, numOfStructs);
  writeBinaryEncoder(encoder, updates);
};

const readUpdate = readStructs;

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 * @return {string} The message converted to string
 */
const stringifySyncMessage = (decoder, y) => {
  const messageType = readVarUint(decoder);
  let stringifiedMessage;
  let stringifiedMessageType;
  switch (messageType) {
    case messageYjsSyncStep1:
      stringifiedMessageType = 'YjsSyncStep1';
      stringifiedMessage = stringifySyncStep1(decoder);
      break
    case messageYjsSyncStep2:
      stringifiedMessageType = 'YjsSyncStep2';
      stringifiedMessage = stringifySyncStep2(decoder, y);
      break
    case messageYjsUpdate:
      stringifiedMessageType = 'YjsUpdate';
      stringifiedMessage = stringifyStructs(decoder, y);
      break
    default:
      stringifiedMessageType = 'Unknown';
      stringifiedMessage = 'Unknown';
  }
  return `Message ${stringifiedMessageType}:\n${stringifiedMessage}`
};

/**
 * @param {decoding.Decoder} decoder A message received from another client
 * @param {encoding.Encoder} encoder The reply message. Will not be sent if empty.
 * @param {Y} y
 */
const readSyncMessage = (decoder, encoder, y) => {
  const messageType = readVarUint(decoder);
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, y);
      break
    case messageYjsSyncStep2:
      y.transact(() => readSyncStep2(decoder, y), true);
      break
    case messageYjsUpdate:
      y.transact(() => readUpdate(decoder, y), true);
      break
    default:
      throw new Error('Unknown message type')
  }
  return messageType
};

var sync = /*#__PURE__*/Object.freeze({
  messageYjsSyncStep1: messageYjsSyncStep1,
  messageYjsSyncStep2: messageYjsSyncStep2,
  messageYjsUpdate: messageYjsUpdate,
  stringifyStructs: stringifyStructs,
  writeStructs: writeStructs,
  readStructs: readStructs,
  stringifySyncStep1: stringifySyncStep1,
  writeSyncStep1: writeSyncStep1,
  writeSyncStep2: writeSyncStep2,
  readSyncStep1: readSyncStep1,
  stringifySyncStep2: stringifySyncStep2,
  readSyncStep2: readSyncStep2,
  stringifyUpdate: stringifyUpdate,
  writeUpdate: writeUpdate,
  readUpdate: readUpdate,
  stringifySyncMessage: stringifySyncMessage,
  readSyncMessage: readSyncMessage
});

/**
 * Anything that can be encoded with `JSON.stringify` and can be decoded with
 * `JSON.parse`.
 *
 * The following property should hold:
 * `JSON.parse(JSON.stringify(key))===key`
 *
 * At the moment the only safe values are number and string.
 *
 * @typedef {(number|string|Object)} encodable
 */

/**
 * A Yjs instance handles the state of shared data.
 */
class Y extends NamedEventHandler {
  /**
   * @param {Object} [conf] configuration
   */
  constructor (conf = {}) {
    super();
    this.gcEnabled = conf.gc || false;
    this._contentReady = false;
    this.userID = conf.userID || generateRandomUint32();
    // TODO: This should be a Map so we can use encodables as keys
    this._map = new Map();
    this.ds = new DeleteStore();
    this.os = new OperationStore(this);
    this.ss = new StateStore(this);
    this._missingStructs = new Map();
    this._readyToIntegrate = [];
    this._transaction = null;
    this.connected = false;
    // for compatibility with isParentOf
    this._parent = null;
    this._hasUndoManager = false;
    this._deleted = false; // for compatiblity of having this as a parent for types
    this._id = null;
  }

  /**
   * Read the Decoder and fill the Yjs instance with data in the decoder.
   *
   * @param {Decoder} decoder The BinaryDecoder to read from.
   */
  importModel (decoder) {
    this.transact(() => {
      integrateRemoteStructs(decoder, this);
      readDeleteStore(decoder, this);
    });
  }

  /**
   * Encode the Yjs model to ArrayBuffer
   *
   * @return {ArrayBuffer} The Yjs model as ArrayBuffer
   */
  exportModel () {
    const encoder = createEncoder();
    writeStructs(encoder, this, new Map());
    writeDeleteStore(encoder, this.ds);
    return toBuffer(encoder)
  }
  _beforeChange () {}
  _callObserver (transaction, subs, remote) {}
  /**
   * Changes that happen inside of a transaction are bundled. This means that
   * the observer fires _after_ the transaction is finished and that all changes
   * that happened inside of the transaction are sent as one message to the
   * other peers.
   *
   * @param {Function} f The function that should be executed as a transaction
   * @param {?Boolean} remote Optional. Whether this transaction is initiated by
   *                          a remote peer. This should not be set manually!
   *                          Defaults to false.
   */
  transact (f, remote = false) {
    let initialCall = this._transaction === null;
    if (initialCall) {
      this._transaction = new Transaction(this);
      this.emit('beforeTransaction', this, this._transaction, remote);
    }
    try {
      f(this);
    } catch (e) {
      console.error(e);
    }
    if (initialCall) {
      this.emit('beforeObserverCalls', this, this._transaction, remote);
      const transaction = this._transaction;
      this._transaction = null;
      // emit change events on changed types
      transaction.changedTypes.forEach((subs, type) => {
        if (!type._deleted) {
          type._callObserver(transaction, subs, remote);
        }
      });
      transaction.changedParentTypes.forEach((events, type) => {
        if (!type._deleted) {
          events = events
            .filter(event =>
              !event.target._deleted
            );
          events
            .forEach(event => {
              event.currentTarget = type;
            });
          // we don't have to check for events.length
          // because there is no way events is empty..
          type._deepEventHandler.callEventListeners(transaction, events);
        }
      });
      // when all changes & events are processed, emit afterTransaction event
      this.emit('afterTransaction', this, transaction, remote);
    }
  }

  /**
   * Fake _start for root properties (y.set('name', type))
   *
   * @private
   */
  get _start () {
    return null
  }

  /**
   * Fake _start for root properties (y.set('name', type))
   *
   * @private
   */
  set _start (start) {}

  /**
   * Define a shared data type.
   *
   * Multiple calls of `y.define(name, TypeConstructor)` yield the same result
   * and do not overwrite each other. I.e.
   * `y.define(name, type) === y.define(name, type)`
   *
   * After this method is called, the type is also available on `y._map.get(name)`.
   *
   * *Best Practices:*
   * Either define all types right after the Yjs instance is created or always
   * use `y.define(..)` when accessing a type.
   *
   * @example
   *   // Option 1
   *   const y = new Y(..)
   *   y.define('myArray', YArray)
   *   y.define('myMap', YMap)
   *   // .. when accessing the type use y._map.get(name)
   *   y.share.myArray.insert(..)
   *   y.share.myMap.set(..)
   *
   *   // Option2
   *   const y = new Y(..)
   *   // .. when accessing the type use `y.define(..)`
   *   y.define('myArray', YArray).insert(..)
   *   y.define('myMap', YMap).set(..)
   *
   * @param {String} name
   * @param {Function} TypeConstructor The constructor of the type definition
   * @returns {any} The created type. Constructed with TypeConstructor
   */
  define (name, TypeConstructor) {
    let id = createRootID(name, TypeConstructor);
    let type = this.os.get(id);
    if (this._map.get(name) === undefined) {
      this._map.set(name, type);
    } else if (this._map.get(name) !== type) {
      throw new Error('Type is already defined with a different constructor')
    }
    return type
  }

  /**
   * Get a defined type. The type must be defined locally. First define the
   * type with {@link define}.
   *
   * This returns the same value as `y.share[name]`
   *
   * @param {String} name The typename
   * @return {any}
   */
  get (name) {
    return this._map.get(name)
  }

  /**
   * Disconnect from the room, and destroy all traces of this Yjs instance.
   */
  destroy () {
    this.emit('destroyed', true);
    super.destroy();
    this._map = null;
    this.os = null;
    this.ds = null;
    this.ss = null;
  }
}

/**
 * @module structs
 */

class ItemJSON extends Item {
  constructor () {
    super();
    this._content = null;
  }
  _copy () {
    let struct = super._copy();
    struct._content = this._content;
    return struct
  }
  get _length () {
    const c = this._content;
    return c !== null ? c.length : 0
  }
  /**
   * @param {Y} y
   * @param {decoding.Decoder} decoder
   */
  _fromBinary (y, decoder) {
    let missing = super._fromBinary(y, decoder);
    let len = readVarUint(decoder);
    this._content = new Array(len);
    for (let i = 0; i < len; i++) {
      const ctnt = readVarString(decoder);
      let parsed;
      if (ctnt === 'undefined') {
        parsed = undefined;
      } else {
        parsed = JSON.parse(ctnt);
      }
      this._content[i] = parsed;
    }
    return missing
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    const len = this._length;
    writeVarUint(encoder, len);
    for (let i = 0; i < len; i++) {
      let encoded;
      const content = this._content[i];
      if (content === undefined) {
        encoded = 'undefined';
      } else {
        encoded = JSON.stringify(content);
      }
      writeVarString(encoder, encoded);
    }
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('ItemJSON', this, `content:${JSON.stringify(this._content)}`)
  }
  _splitAt (y, diff) {
    if (diff === 0) {
      return this
    } else if (diff >= this._length) {
      return this._right
    }
    let item = new ItemJSON();
    item._content = this._content.splice(diff);
    splitHelper(y, this, item, diff);
    return item
  }
}

/**
 * @module structs
 */

class ItemString extends Item {
  constructor () {
    super();
    this._content = null;
  }
  _copy () {
    let struct = super._copy();
    struct._content = this._content;
    return struct
  }
  get _length () {
    return this._content.length
  }
  /**
   * @param {Y} y
   * @param {decoding.Decoder} decoder
   */
  _fromBinary (y, decoder) {
    let missing = super._fromBinary(y, decoder);
    this._content = readVarString(decoder);
    return missing
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writeVarString(encoder, this._content);
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('ItemString', this, `content:"${this._content}"`)
  }
  _splitAt (y, diff) {
    if (diff === 0) {
      return this
    } else if (diff >= this._length) {
      return this._right
    }
    let item = new ItemString();
    item._content = this._content.slice(diff);
    this._content = this._content.slice(0, diff);
    splitHelper(y, this, item, diff);
    return item
  }
}

/**
 * @module structs
 */

class ItemFormat extends Item {
  constructor () {
    super();
    this.key = null;
    this.value = null;
  }
  _copy (undeleteChildren, copyPosition) {
    let struct = super._copy();
    struct.key = this.key;
    struct.value = this.value;
    return struct
  }
  get _length () {
    return 1
  }
  get _countable () {
    return false
  }
  /**
   * @param {Y} y
   * @param {decoding.Decoder} decoder
   */
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder);
    this.key = readVarString(decoder);
    this.value = JSON.parse(readVarString(decoder));
    return missing
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writeVarString(encoder, this.key);
    writeVarString(encoder, JSON.stringify(this.value));
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('ItemFormat', this, `key:${JSON.stringify(this.key)},value:${JSON.stringify(this.value)}`)
  }
}

/**
 * @module structs
 */

class ItemEmbed extends Item {
  constructor () {
    super();
    this.embed = null;
  }
  _copy (undeleteChildren, copyPosition) {
    let struct = super._copy();
    struct.embed = this.embed;
    return struct
  }
  get _length () {
    return 1
  }
  /**
   * @param {Y} y
   * @param {decoding.Decoder} decoder
   */
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder);
    this.embed = JSON.parse(readVarString(decoder));
    return missing
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writeVarString(encoder, JSON.stringify(this.embed));
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('ItemEmbed', this, `embed:${JSON.stringify(this.embed)}`)
  }
}

/**
 * @module structs
 */

class ItemBinary extends Item {
  constructor () {
    super();
    this._content = null;
  }
  _copy () {
    let struct = super._copy();
    struct._content = this._content;
    return struct
  }
  /**
   * @param {Y} y
   * @param {decoding.Decoder} decoder
   */
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder);
    this._content = readPayload(decoder);
    return missing
  }
  /**
   * @param {encoding.Encoder} encoder
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writePayload(encoder, this._content);
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('ItemBinary', this)
  }
}

/**
 *
 * @param {Item} item
 * @param {import("../protocols/history").HistorySnapshot} [snapshot]
 */
const isVisible = (item, snapshot) => snapshot === undefined ? !item._deleted : (snapshot.sm.has(item._id.user) && snapshot.sm.get(item._id.user) > item._id.clock && !snapshot.ds.isDeleted(item._id));

/**
 * @module types
 */

/**
 * Event that describes the changes on a YArray
 */
class YArrayEvent extends YEvent {
  /**
   * @param {YArray} yarray The changed type
   * @param {Boolean} remote Whether the changed was caused by a remote peer
   * @param {Transaction} transaction The transaction object
   */
  constructor (yarray, remote, transaction) {
    super(yarray);
    this.remote = remote;
    this._transaction = transaction;
    this._addedElements = null;
    this._removedElements = null;
  }

  /**
   * Child elements that were added in this transaction.
   *
   * @return {Set}
   */
  get addedElements () {
    if (this._addedElements === null) {
      const target = this.target;
      const transaction = this._transaction;
      const addedElements = new Set();
      transaction.newTypes.forEach(type => {
        if (type._parent === target && !transaction.deletedStructs.has(type)) {
          addedElements.add(type);
        }
      });
      this._addedElements = addedElements;
    }
    return this._addedElements
  }

  /**
   * Child elements that were removed in this transaction.
   *
   * @return {Set}
   */
  get removedElements () {
    if (this._removedElements === null) {
      const target = this.target;
      const transaction = this._transaction;
      const removedElements = new Set();
      transaction.deletedStructs.forEach(struct => {
        if (struct._parent === target && !transaction.newTypes.has(struct)) {
          removedElements.add(struct);
        }
      });
      this._removedElements = removedElements;
    }
    return this._removedElements
  }
}

/**
 * A shared Array implementation.
 */
class YArray extends Type {
  constructor () {
    super();
    this.length = 0;
  }
  /**
   * Creates YArray Event and calls observers.
   *
   * @private
   */
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YArrayEvent(this, remote, transaction));
  }

  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {any}
   */
  get (index) {
    let n = this._start;
    while (n !== null) {
      if (!n._deleted && n._countable) {
        if (index < n._length) {
          switch (n.constructor) {
            case ItemJSON:
            case ItemString:
              return n._content[index]
            default:
              return n
          }
        }
        index -= n._length;
      }
      n = n._right;
    }
  }

  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @param {Object} [snapshot]
   * @return {Array}
   */
  toArray (snapshot) {
    return this.map(c => c, snapshot)
  }

  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Array}
   */
  toJSON () {
    return this.map(c => {
      if (c instanceof Type) {
        return c.toJSON()
      }
      return c
    })
  }

  /**
   * Returns an Array with the result of calling a provided function on every
   * element of this YArray.
   *
   * @param {Function} f Function that produces an element of the new Array
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   * @return {Array} A new array with each element being the result of the
   *                 callback function
   */
  map (f, snapshot) {
    const res = [];
    this.forEach((c, i) => {
      res.push(f(c, i, this));
    }, snapshot);
    return res
  }

  /**
   * Executes a provided function on once on overy element of this YArray.
   *
   * @param {Function} f A function to execute on every element of this YArray.
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   */
  forEach (f, snapshot) {
    let index = 0;
    let n = this._start;
    while (n !== null) {
      if (isVisible(n, snapshot) && n._countable) {
        if (n instanceof Type) {
          f(n, index++, this);
        } else if (n.constructor === ItemBinary) {
          f(n._content, index++, this);
        } else {
          const content = n._content;
          const contentLen = content.length;
          for (let i = 0; i < contentLen; i++) {
            index++;
            f(content[i], index, this);
          }
        }
      }
      n = n._right;
    }
  }

  [Symbol.iterator] () {
    return {
      next: function () {
        while (this._item !== null && (this._item._deleted || this._item._length <= this._itemElement)) {
          // item is deleted or itemElement does not exist (is deleted)
          this._item = this._item._right;
          this._itemElement = 0;
        }
        if (this._item === null) {
          return {
            done: true
          }
        }
        let content;
        if (this._item instanceof Type) {
          content = this._item;
          this._item = this._item._right;
        } else {
          content = this._item._content[this._itemElement++];
        }
        return {
          value: content,
          done: false
        }
      },
      _item: this._start,
      _itemElement: 0,
      _count: 0
    }
  }

  /**
   * Deletes elements starting from an index.
   *
   * @param {number} index Index at which to start deleting elements
   * @param {number} length The number of elements to remove. Defaults to 1.
   */
  delete (index, length = 1) {
    this._y.transact(() => {
      let item = this._start;
      let count = 0;
      while (item !== null && length > 0) {
        if (!item._deleted && item._countable) {
          if (count <= index && index < count + item._length) {
            const diffDel = index - count;
            item = item._splitAt(this._y, diffDel);
            item._splitAt(this._y, length);
            length -= item._length;
            item._delete(this._y);
            count += diffDel;
          } else {
            count += item._length;
          }
        }
        item = item._right;
      }
    });
    if (length > 0) {
      throw new Error('Delete exceeds the range of the YArray')
    }
  }

  /**
   * Inserts content after an element container.
   *
   * @private
   * @param {Item} left The element container to use as a reference.
   * @param {Array<number|string|Object|ArrayBuffer>} content The Array of content to insert (see {@see insert})
   */
  insertAfter (left, content) {
    this._transact(y => {
      let right;
      if (left === null) {
        right = this._start;
      } else {
        right = left._right;
      }
      let prevJsonIns = null;
      for (let i = 0; i < content.length; i++) {
        let c = content[i];
        if (typeof c === 'function') {
          c = new c(); // eslint-disable-line new-cap
        }
        if (c instanceof Type) {
          if (prevJsonIns !== null) {
            if (y !== null) {
              prevJsonIns._integrate(y);
            }
            left = prevJsonIns;
            prevJsonIns = null;
          }
          c._origin = left;
          c._left = left;
          c._right = right;
          c._right_origin = right;
          c._parent = this;
          if (y !== null) {
            c._integrate(y);
          } else if (left === null) {
            this._start = c;
          } else {
            left._right = c;
          }
          left = c;
        } else if (c.constructor === ArrayBuffer) {
          if (prevJsonIns !== null) {
            if (y !== null) {
              prevJsonIns._integrate(y);
            }
            left = prevJsonIns;
            prevJsonIns = null;
          }
          const itemBinary = new ItemBinary();
          itemBinary._origin = left;
          itemBinary._left = left;
          itemBinary._right = right;
          itemBinary._right_origin = right;
          itemBinary._parent = this;
          itemBinary._content = c;
          if (y !== null) {
            itemBinary._integrate(y);
          } else if (left === null) {
            this._start = itemBinary;
          } else {
            left._right = itemBinary;
          }
          left = itemBinary;
        } else {
          if (prevJsonIns === null) {
            prevJsonIns = new ItemJSON();
            prevJsonIns._origin = left;
            prevJsonIns._left = left;
            prevJsonIns._right = right;
            prevJsonIns._right_origin = right;
            prevJsonIns._parent = this;
            prevJsonIns._content = [];
          }
          prevJsonIns._content.push(c);
        }
      }
      if (prevJsonIns !== null) {
        if (y !== null) {
          prevJsonIns._integrate(y);
        } else if (prevJsonIns._left === null) {
          this._start = prevJsonIns;
        } else {
          left._right = prevJsonIns;
        }
      }
    });
    return content
  }

  /**
   * Inserts new content at an index.
   *
   * Important: This function expects an array of content. Not just a content
   * object. The reason for this "weirdness" is that inserting several elements
   * is very efficient when it is done as a single operation.
   *
   * @example
   *  // Insert character 'a' at position 0
   *  yarray.insert(0, ['a'])
   *  // Insert numbers 1, 2 at position 1
   *  yarray.insert(2, [1, 2])
   *
   * @param {number} index The index to insert content at.
   * @param {Array<number|string|ArrayBuffer|Type>} content The array of content
   */
  insert (index, content) {
    this._transact(() => {
      let left = null;
      let right = this._start;
      let count = 0;
      const y = this._y;
      while (right !== null) {
        const rightLen = right._deleted ? 0 : (right._length - 1);
        if (count <= index && index <= count + rightLen) {
          const splitDiff = index - count;
          right = right._splitAt(y, splitDiff);
          left = right._left;
          count += splitDiff;
          break
        }
        if (!right._deleted) {
          count += right._length;
        }
        left = right;
        right = right._right;
      }
      if (index > count) {
        throw new Error('Index exceeds array range!')
      }
      this.insertAfter(left, content);
    });
  }

  /**
   * Appends content to this YArray.
   *
   * @param {Array<number|string|ArrayBuffer|Type>} content Array of content to append.
   */
  push (content) {
    let n = this._start;
    let lastUndeleted = null;
    while (n !== null) {
      if (!n._deleted) {
        lastUndeleted = n;
      }
      n = n._right;
    }
    this.insertAfter(lastUndeleted, content);
  }

  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('YArray', this, `start:${stringifyItemID(this._start)}"`)
  }
}

/**
 * @module types
 */

/**
 * Event that describes the changes on a YMap.
 */
class YMapEvent extends YEvent {
  /**
   * @param {YMap} ymap The YArray that changed.
   * @param {Set<any>} subs The keys that changed.
   * @param {boolean} remote Whether the change was created by a remote peer.
   */
  constructor (ymap, subs, remote) {
    super(ymap);
    this.keysChanged = subs;
    this.remote = remote;
  }
}

/**
 * A shared Map implementation.
 */
class YMap extends Type {
  /**
   * Creates YMap Event and calls observers.
   *
   * @private
   */
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YMapEvent(this, parentSubs, remote));
  }

  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Object}
   */
  toJSON () {
    const map = {};
    for (let [key, item] of this._map) {
      if (!item._deleted) {
        let res;
        if (item instanceof Type) {
          if (item.toJSON !== undefined) {
            res = item.toJSON();
          } else {
            res = item.toString();
          }
        } else if (item.constructor === ItemBinary) {
          res = item._content;
        } else {
          res = item._content[0];
        }
        map[key] = res;
      }
    }
    return map
  }

  /**
   * Returns the keys for each element in the YMap Type.
   *
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   * @return {Array}
   */
  keys (snapshot) {
    // TODO: Should return either Iterator or Set!
    let keys = [];
    if (snapshot === undefined) {
      for (let [key, value] of this._map) {
        if (value._deleted) {
          keys.push(key);
        }
      }
    } else {
      this._map.forEach((_, key) => {
        if (YMap.prototype.has.call(this, key, snapshot)) {
          keys.push(key);
        }
      });
    }
    return keys
  }

  /**
   * Remove a specified element from this YMap.
   *
   * @param {string} key The key of the element to remove.
   */
  delete (key) {
    this._transact((y) => {
      let c = this._map.get(key);
      if (y !== null && c !== undefined) {
        c._delete(y);
      }
    });
  }

  /**
   * Adds or updates an element with a specified key and value.
   *
   * @param {string} key The key of the element to add to this YMap
   * @param {Object | string | number | Type | ArrayBuffer } value The value of the element to add
   */
  set (key, value) {
    if(typeof value === 'undefined') {
      // no reason to set undefined value in map
      return value
    }
    this._transact(y => {
      const old = this._map.get(key) || null;
      if (old !== null) {
        if (
          old.constructor === ItemJSON &&
          !old._deleted && old._content[0] === value
        ) {
          // Trying to overwrite with same value
          // break here
          return value
        }
        if (y !== null) {
          old._delete(y);
        }
      }
      let v;
      if (typeof value === 'function') {
        v = new value(); // eslint-disable-line new-cap
        value = v;
      } else if (value instanceof Item) {
        v = value;
      } else if (value !== null && value.constructor === ArrayBuffer) {
        v = new ItemBinary();
        v._content = value;
      } else {
        v = new ItemJSON();
        v._content = [value];
      }
      v._right = old;
      v._right_origin = old;
      v._parent = this;
      v._parentSub = key;
      if (y !== null) {
        v._integrate(y);
      } else {
        this._map.set(key, v);
      }
    });
    return value
  }

  /**
   * Returns a specified element from this YMap.
   *
   * @param {string} key The key of the element to return.
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   */
  get (key, snapshot) {
    let v = this._map.get(key);
    if (v === undefined) {
      return undefined
    }
    if (snapshot !== undefined) {
      // iterate until found element that exists
      while (!snapshot.sm.has(v._id.user) || v._id.clock >= snapshot.sm.get(v._id.user)) {
        v = v._right;
      }
    }
    if (isVisible(v, snapshot)) {
      if (v instanceof Type) {
        return v
      } else if (v.constructor === ItemBinary) {
        return v._content
      } else {
        return v._content[v._content.length - 1]
      }
    }
  }

  /**
   * Returns a boolean indicating whether the specified key exists or not.
   *
   * @param {string} key The key to test.
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   */
  has (key, snapshot) {
    let v = this._map.get(key);
    if (v === undefined) {
      return false
    }
    if (snapshot !== undefined) {
      // iterate until found element that exists
      while (!snapshot.sm.has(v._id.user) || v._id.clock >= snapshot.sm.get(v._id.user)) {
        v = v._right;
      }
    }
    return isVisible(v, snapshot)
  }

  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('YMap', this, `mapSize:${this._map.size}`)
  }
}

/**
 * @module types
 */

/**
 * @private
 */
const integrateItem = (item, parent, y, left, right) => {
  item._origin = left;
  item._left = left;
  item._right = right;
  item._right_origin = right;
  item._parent = parent;
  if (y !== null) {
    item._integrate(y);
  } else if (left === null) {
    parent._start = item;
  } else {
    left._right = item;
  }
};

/**
 * @private
 */
const findNextPosition = (currentAttributes, parent, left, right, count) => {
  while (right !== null && count > 0) {
    switch (right.constructor) {
      case ItemEmbed:
      case ItemString:
        const rightLen = right._deleted ? 0 : (right._length - 1);
        if (count <= rightLen) {
          right = right._splitAt(parent._y, count);
          left = right._left;
          return [left, right, currentAttributes]
        }
        if (right._deleted === false) {
          count -= right._length;
        }
        break
      case ItemFormat:
        if (right._deleted === false) {
          updateCurrentAttributes(currentAttributes, right);
        }
        break
    }
    left = right;
    right = right._right;
  }
  return [left, right, currentAttributes]
};

/**
 * @private
 */
const findPosition = (parent, index) => {
  let currentAttributes = new Map();
  let left = null;
  let right = parent._start;
  return findNextPosition(currentAttributes, parent, left, right, index)
};

/**
 * Negate applied formats
 *
 * @private
 */
const insertNegatedAttributes = (y, parent, left, right, negatedAttributes) => {
  // check if we really need to remove attributes
  while (
    right !== null && (
      right._deleted === true || (
        right.constructor === ItemFormat &&
        (negatedAttributes.get(right.key) === right.value)
      )
    )
  ) {
    if (right._deleted === false) {
      negatedAttributes.delete(right.key);
    }
    left = right;
    right = right._right;
  }
  for (let [key, val] of negatedAttributes) {
    let format = new ItemFormat();
    format.key = key;
    format.value = val;
    integrateItem(format, parent, y, left, right);
    left = format;
  }
  return [left, right]
};

/**
 * @private
 */
const updateCurrentAttributes = (currentAttributes, item) => {
  const value = item.value;
  const key = item.key;
  if (value === null) {
    currentAttributes.delete(key);
  } else {
    currentAttributes.set(key, value);
  }
};

/**
 * @private
 */
const minimizeAttributeChanges = (left, right, currentAttributes, attributes) => {
  // go right while attributes[right.key] === right.value (or right is deleted)
  while (true) {
    if (right === null) {
      break
    } else if (right._deleted === true) ; else if (right.constructor === ItemFormat && (attributes[right.key] || null) === right.value) {
      // found a format, update currentAttributes and continue
      updateCurrentAttributes(currentAttributes, right);
    } else {
      break
    }
    left = right;
    right = right._right;
  }
  return [left, right]
};

/**
 * @private
 */
const insertAttributes = (y, parent, left, right, attributes, currentAttributes) => {
  const negatedAttributes = new Map();
  // insert format-start items
  for (let key in attributes) {
    const val = attributes[key];
    const currentVal = currentAttributes.get(key);
    if (currentVal !== val) {
      // save negated attribute (set null if currentVal undefined)
      negatedAttributes.set(key, currentVal || null);
      let format = new ItemFormat();
      format.key = key;
      format.value = val;
      integrateItem(format, parent, y, left, right);
      left = format;
    }
  }
  return [left, right, negatedAttributes]
};

/**
 * @private
 */
const insertText = (y, text, parent, left, right, currentAttributes, attributes) => {
  for (let [key] of currentAttributes) {
    if (attributes[key] === undefined) {
      attributes[key] = null;
    }
  }
  [left, right] = minimizeAttributeChanges(left, right, currentAttributes, attributes);
  let negatedAttributes;
  [left, right, negatedAttributes] = insertAttributes(y, parent, left, right, attributes, currentAttributes);
  // insert content
  let item;
  if (text.constructor === String) {
    item = new ItemString();
    item._content = text;
  } else {
    item = new ItemEmbed();
    item.embed = text;
  }
  integrateItem(item, parent, y, left, right);
  left = item;
  return insertNegatedAttributes(y, parent, left, right, negatedAttributes)
};

/**
 * @private
 */
const formatText = (y, length, parent, left, right, currentAttributes, attributes) => {
  [left, right] = minimizeAttributeChanges(left, right, currentAttributes, attributes);
  let negatedAttributes;
  [left, right, negatedAttributes] = insertAttributes(y, parent, left, right, attributes, currentAttributes);
  // iterate until first non-format or null is found
  // delete all formats with attributes[format.key] != null
  while (length > 0 && right !== null) {
    if (right._deleted === false) {
      switch (right.constructor) {
        case ItemFormat:
          const attr = attributes[right.key];
          if (attr !== undefined) {
            if (attr === right.value) {
              negatedAttributes.delete(right.key);
            } else {
              negatedAttributes.set(right.key, right.value);
            }
            right._delete(y);
          }
          updateCurrentAttributes(currentAttributes, right);
          break
        case ItemEmbed:
        case ItemString:
          right._splitAt(y, length);
          length -= right._length;
          break
      }
    }
    left = right;
    right = right._right;
  }
  return insertNegatedAttributes(y, parent, left, right, negatedAttributes)
};

/**
 * @private
 */
const deleteText = (y, length, parent, left, right, currentAttributes) => {
  while (length > 0 && right !== null) {
    if (right._deleted === false) {
      switch (right.constructor) {
        case ItemFormat:
          updateCurrentAttributes(currentAttributes, right);
          break
        case ItemEmbed:
        case ItemString:
          right._splitAt(y, length);
          length -= right._length;
          right._delete(y);
          break
      }
    }
    left = right;
    right = right._right;
  }
  return [left, right]
};

// TODO: In the quill delta representation we should also use the format {ops:[..]}
/**
 * The Quill Delta format represents changes on a text document with
 * formatting information. For mor information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
 *
 * @example
 *   {
 *     ops: [
 *       { insert: 'Gandalf', attributes: { bold: true } },
 *       { insert: ' the ' },
 *       { insert: 'Grey', attributes: { color: '#cccccc' } }
 *     ]
 *   }
 *
 * @typedef {Array<Object>} Delta
 */

/**
  * Attributes that can be assigned to a selection of text.
  *
  * @example
  *   {
  *     bold: true,
  *     font-size: '40px'
  *   }
  *
  * @typedef {Object} TextAttributes
  */

/**
 * Event that describes the changes on a YText type.
 *
 * @private
 */
class YTextEvent extends YArrayEvent {
  constructor (ytext, remote, transaction) {
    super(ytext, remote, transaction);
    this._delta = null;
  }
  // TODO: Should put this in a separate function. toDelta shouldn't be included
  //       in every Yjs distribution
  /**
   * Compute the changes in the delta format.
   *
   * @return {Delta} A {@link https://quilljs.com/docs/delta/|Quill Delta}) that
   *                 represents the changes on the document.
   *
   * @public
   */
  get delta () {
    if (this._delta === null) {
      const y = this.target._y;
      y.transact(() => {
        let item = this.target._start;
        const delta = [];
        const added = this.addedElements;
        const removed = this.removedElements;
        this._delta = delta;
        let action = null;
        let attributes = {}; // counts added or removed new attributes for retain
        const currentAttributes = new Map(); // saves all current attributes for insert
        const oldAttributes = new Map();
        let insert = '';
        let retain = 0;
        let deleteLen = 0;
        const addOp = function addOp () {
          if (action !== null) {
            /**
             * @type {any}
             */
            let op;
            switch (action) {
              case 'delete':
                op = { delete: deleteLen };
                deleteLen = 0;
                break
              case 'insert':
                op = { insert };
                if (currentAttributes.size > 0) {
                  op.attributes = {};
                  for (let [key, value] of currentAttributes) {
                    if (value !== null) {
                      op.attributes[key] = value;
                    }
                  }
                }
                insert = '';
                break
              case 'retain':
                op = { retain };
                if (Object.keys(attributes).length > 0) {
                  op.attributes = {};
                  for (let key in attributes) {
                    op.attributes[key] = attributes[key];
                  }
                }
                retain = 0;
                break
            }
            delta.push(op);
            action = null;
          }
        };
        while (item !== null) {
          switch (item.constructor) {
            case ItemEmbed:
              if (added.has(item)) {
                addOp();
                action = 'insert';
                insert = item.embed;
                addOp();
              } else if (removed.has(item)) {
                if (action !== 'delete') {
                  addOp();
                  action = 'delete';
                }
                deleteLen += 1;
              } else if (item._deleted === false) {
                if (action !== 'retain') {
                  addOp();
                  action = 'retain';
                }
                retain += 1;
              }
              break
            case ItemString:
              if (added.has(item)) {
                if (action !== 'insert') {
                  addOp();
                  action = 'insert';
                }
                insert += item._content;
              } else if (removed.has(item)) {
                if (action !== 'delete') {
                  addOp();
                  action = 'delete';
                }
                deleteLen += item._length;
              } else if (item._deleted === false) {
                if (action !== 'retain') {
                  addOp();
                  action = 'retain';
                }
                retain += item._length;
              }
              break
            case ItemFormat:
              if (added.has(item)) {
                const curVal = currentAttributes.get(item.key) || null;
                if (curVal !== item.value) {
                  if (action === 'retain') {
                    addOp();
                  }
                  if (item.value === (oldAttributes.get(item.key) || null)) {
                    delete attributes[item.key];
                  } else {
                    attributes[item.key] = item.value;
                  }
                } else {
                  item._delete(y);
                }
              } else if (removed.has(item)) {
                oldAttributes.set(item.key, item.value);
                const curVal = currentAttributes.get(item.key) || null;
                if (curVal !== item.value) {
                  if (action === 'retain') {
                    addOp();
                  }
                  attributes[item.key] = curVal;
                }
              } else if (item._deleted === false) {
                oldAttributes.set(item.key, item.value);
                const attr = attributes[item.key];
                if (attr !== undefined) {
                  if (attr !== item.value) {
                    if (action === 'retain') {
                      addOp();
                    }
                    if (item.value === null) {
                      attributes[item.key] = item.value;
                    } else {
                      delete attributes[item.key];
                    }
                  } else {
                    item._delete(y);
                  }
                }
              }
              if (item._deleted === false) {
                if (action === 'insert') {
                  addOp();
                }
                updateCurrentAttributes(currentAttributes, item);
              }
              break
          }
          item = item._right;
        }
        addOp();
        while (this._delta.length > 0) {
          let lastOp = this._delta[this._delta.length - 1];
          if (lastOp.retain !== undefined && lastOp.attributes === undefined) {
            // retain delta's if they don't assign attributes
            this._delta.pop();
          } else {
            break
          }
        }
      });
    }
    return this._delta
  }
}

/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 */
class YText extends YArray {
  /**
   * @param {String} [string] The initial value of the YText.
   */
  constructor (string) {
    super();
    if (typeof string === 'string') {
      const start = new ItemString();
      start._parent = this;
      start._content = string;
      this._start = start;
    }
  }

  /**
   * Creates YMap Event and calls observers.
   *
   * @private
   */
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YTextEvent(this, remote, transaction));
  }

  toDom () {
    return document.createTextNode(this.toString())
  }

  /**
   * Returns the unformatted string representation of this YText type.
   *
   * @public
   */
  toString () {
    let str = '';
    /**
     * @type {any}
     */
    let n = this._start;
    while (n !== null) {
      if (!n._deleted && n._countable) {
        str += n._content;
      }
      n = n._right;
    }
    return str
  }

  toDomString () {
    return this.toDelta().map(delta => {
      const nestedNodes = [];
      for (let nodeName in delta.attributes) {
        const attrs = [];
        for (let key in delta.attributes[nodeName]) {
          attrs.push({key, value: delta.attributes[nodeName][key]});
        }
        // sort attributes to get a unique order
        attrs.sort((a, b) => a.key < b.key ? -1 : 1);
        nestedNodes.push({ nodeName, attrs });
      }
      // sort node order to get a unique order
      nestedNodes.sort((a, b) => a.nodeName < b.nodeName ? -1 : 1);
      // now convert to dom string
      let str = '';
      for (let i = 0; i < nestedNodes.length; i++) {
        const node = nestedNodes[i];
        str += `<${node.nodeName}`;
        for (let j = 0; j < node.attrs.length; j++) {
          const attr = node.attrs[i];
          str += ` ${attr.key}="${attr.value}"`;
        }
        str += '>';
      }
      str += delta.insert;
      for (let i = nestedNodes.length - 1; i >= 0; i--) {
        str += `</${nestedNodes[i].nodeName}>`;
      }
      return str
    })
  }

  /**
   * Apply a {@link Delta} on this shared YText type.
   *
   * @param {Delta} delta The changes to apply on this element.
   *
   * @public
   */
  applyDelta (delta) {
    this._transact(y => {
      let left = null;
      let right = this._start;
      const currentAttributes = new Map();
      for (let i = 0; i < delta.length; i++) {
        let op = delta[i];
        if (op.insert !== undefined) {
[left, right] = insertText(y, op.insert, this, left, right, currentAttributes, op.attributes || {});
        } else if (op.retain !== undefined) {
[left, right] = formatText(y, op.retain, this, left, right, currentAttributes, op.attributes || {});
        } else if (op.delete !== undefined) {
[left, right] = deleteText(y, op.delete, this, left, right, currentAttributes);
        }
      }
    });
  }

  /**
   * Returns the Delta representation of this YText type.
   *
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   * @param {import('../protocols/history.js').HistorySnapshot} [prevSnapshot]
   * @return {Delta} The Delta representation of this type.
   *
   * @public
   */
  toDelta (snapshot, prevSnapshot) {
    let ops = [];
    let currentAttributes = new Map();
    let str = '';
    /**
     * @type {any}
     */
    let n = this._start;
    function packStr () {
      if (str.length > 0) {
        // pack str with attributes to ops
        let attributes = {};
        let addAttributes = false;
        for (let [key, value] of currentAttributes) {
          addAttributes = true;
          attributes[key] = value;
        }
        let op = { insert: str };
        if (addAttributes) {
          op.attributes = attributes;
        }
        ops.push(op);
        str = '';
      }
    }
    while (n !== null) {
      if (isVisible(n, snapshot) || (prevSnapshot !== undefined && isVisible(n, prevSnapshot))) {
        switch (n.constructor) {
          case ItemString:
            const cur = currentAttributes.get('ychange');
            if (snapshot !== undefined && !isVisible(n, snapshot)) {
              if (cur === undefined || cur.user !== n._id.user || cur.state !== 'removed') {
                packStr();
                currentAttributes.set('ychange', { user: n._id.user, state: 'removed' });
              }
            } else if (prevSnapshot !== undefined && !isVisible(n, prevSnapshot)) {
              if (cur === undefined || cur.user !== n._id.user || cur.state !== 'added') {
                packStr();
                currentAttributes.set('ychange', { user: n._id.user, state: 'added' });
              }
            } else if (cur !== undefined) {
              packStr();
              currentAttributes.delete('ychange');
            }
            str += n._content;
            break
          case ItemEmbed:
            packStr();
            ops.push({
              insert: n.embed
            });
            break
          case ItemFormat:
            packStr();
            updateCurrentAttributes(currentAttributes, n);
            break
        }
      }
      n = n._right;
    }
    packStr();
    return ops
  }

  /**
   * Insert text at a given index.
   *
   * @param {number} index The index at which to start inserting.
   * @param {String} text The text to insert at the specified position.
   * @param {TextAttributes} attributes Optionally define some formatting
   *                                    information to apply on the inserted
   *                                    Text.
   * @public
   */
  insert (index, text, attributes = {}) {
    if (text.length <= 0) {
      return
    }
    this._transact(y => {
      let [left, right, currentAttributes] = findPosition(this, index);
      insertText(y, text, this, left, right, currentAttributes, attributes);
    });
  }

  /**
   * Inserts an embed at a index.
   *
   * @param {number} index The index to insert the embed at.
   * @param {Object} embed The Object that represents the embed.
   * @param {TextAttributes} attributes Attribute information to apply on the
   *                                    embed
   *
   * @public
   */
  insertEmbed (index, embed, attributes = {}) {
    if (embed.constructor !== Object) {
      throw new Error('Embed must be an Object')
    }
    this._transact(y => {
      let [left, right, currentAttributes] = findPosition(this, index);
      insertText(y, embed, this, left, right, currentAttributes, attributes);
    });
  }

  /**
   * Deletes text starting from an index.
   *
   * @param {number} index Index at which to start deleting.
   * @param {number} length The number of characters to remove. Defaults to 1.
   *
   * @public
   */
  delete (index, length) {
    if (length === 0) {
      return
    }
    this._transact(y => {
      let [left, right, currentAttributes] = findPosition(this, index);
      deleteText(y, length, this, left, right, currentAttributes);
    });
  }

  /**
   * Assigns properties to a range of text.
   *
   * @param {number} index The position where to start formatting.
   * @param {number} length The amount of characters to assign properties to.
   * @param {TextAttributes} attributes Attribute information to apply on the
   *                                    text.
   *
   * @public
   */
  format (index, length, attributes) {
    this._transact(y => {
      let [left, right, currentAttributes] = findPosition(this, index);
      if (right === null) {
        return
      }
      formatText(y, length, this, left, right, currentAttributes, attributes);
    });
  }
  // TODO: De-duplicate code. The following code is in every type.
  /**
   * Transform this YText to a readable format.
   * Useful for logging as all Items implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('YText', this)
  }
}

/**
 * @module utils
 */

// TODO: Implement function to describe ranges

/**
 * A relative position that is based on the Yjs model. In contrast to an
 * absolute position (position by index), the relative position can be
 * recomputed when remote changes are received. For example:
 *
 * ```Insert(0, 'x')('a|bc') = 'xa|bc'``` Where | is the cursor position.
 *
 * A relative cursor position can be obtained with the function
 * {@link getRelativePosition} and it can be transformed to an absolute position
 * with {@link fromRelativePosition}.
 *
 * Pro tip: Use this to implement shared cursor locations in YText or YXml!
 * The relative position is {@link encodable}, so you can send it to other
 * clients.
 *
 * @example
 * // Current cursor position is at position 10
 * let relativePosition = getRelativePosition(yText, 10)
 * // modify yText
 * yText.insert(0, 'abc')
 * yText.delete(3, 10)
 * // Compute the cursor position
 * let absolutePosition = fromRelativePosition(y, relativePosition)
 * absolutePosition.type // => yText
 * console.log('cursor location is ' + absolutePosition.offset) // => cursor location is 3
 *
 * @typedef {encodable} RelativePosition
 */

/**
 * Create a relativePosition based on a absolute position.
 *
 * @param {YType} type The base type (e.g. YText or YArray).
 * @param {Integer} offset The absolute position.
 */
const getRelativePosition = (type, offset) => {
  // TODO: rename to createRelativePosition
  let t = type._start;
  while (t !== null) {
    if (!t._deleted && t._countable) {
      if (t._length > offset) {
        return [t._id.user, t._id.clock + offset]
      }
      offset -= t._length;
    }
    t = t._right;
  }
  return ['endof', type._id.user, type._id.clock || null, type._id.name || null, type._id.type || null]
};

/**
 * @typedef {Object} AbsolutePosition The result of {@link fromRelativePosition}
 * @property {YType} type The type on which to apply the absolute position.
 * @property {number} offset The absolute offset.r
 */

/**
 * Transforms a relative position back to a relative position.
 *
 * @param {Y} y The Yjs instance in which to query for the absolute position.
 * @param {RelativePosition} rpos The relative position.
 * @return {AbsolutePosition} The absolute position in the Yjs model
 *                            (type + offset).
 */
const fromRelativePosition = (y, rpos) => {
  if (rpos === null) {
    return null
  }
  if (rpos[0] === 'endof') {
    let id;
    if (rpos[3] === null) {
      id = createID(rpos[1], rpos[2]);
    } else {
      id = createRootID(rpos[3], rpos[4]);
    }
    let type = y.os.get(id);
    if (type === null) {
      return null
    }
    while (type._redone !== null) {
      type = type._redone;
    }
    if (type === null || type.constructor === GC) {
      return null
    }
    return {
      type,
      offset: type.length
    }
  } else {
    let offset = 0;
    let struct = y.os.findNodeWithUpperBound(createID(rpos[0], rpos[1])).val;
    if (struct === null || struct._id.user === RootFakeUserID) {
      return null // TODO: support fake ids?
    }
    const diff = rpos[1] - struct._id.clock;
    while (struct._redone !== null) {
      struct = struct._redone;
    }
    const parent = struct._parent;
    if (struct.constructor === GC || parent._deleted) {
      return null
    }
    if (!struct._deleted && struct._countable) {
      offset = diff;
    }
    struct = struct._left;
    while (struct !== null) {
      if (!struct._deleted && struct._countable) {
        offset += struct._length;
      }
      struct = struct._left;
    }
    return {
      type: parent,
      offset: offset
    }
  }
};

/**
 * Creates a mutual exclude function with the following property:
 *
 * @example
 * const mutex = createMutex()
 * mutex(() => {
 *   // This function is immediately executed
 *   mutex(() => {
 *     // This function is not executed, as the mutex is already active.
 *   })
 * })
 *
 * @return {Function} A mutual exclude function
 * @public
 */
const createMutex = () => {
  let token = true;
  return (f, g) => {
    if (token) {
      token = false;
      try {
        f();
      } finally {
        token = true;
      }
    } else if (g !== undefined) {
      g();
    }
  }
};

/**
 * @module bindings/dom
 */

/**
 * @module types
 */

/**
 * Define the elements to which a set of CSS queries apply.
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors|CSS_Selectors}
 *
 * @example
 *   query = '.classSelector'
 *   query = 'nodeSelector'
 *   query = '#idSelector'
 *
 * @typedef {string} CSS_Selector
 */

/**
 * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
 * position within them.
 *
 * Can be created with {@link YXmlFragment#createTreeWalker}
 *
 * @public
 */
class YXmlTreeWalker {
  constructor (root, f) {
    this._filter = f || (() => true);
    this._root = root;
    this._currentNode = root;
    this._firstCall = true;
  }
  [Symbol.iterator] () {
    return this
  }
  /**
   * Get the next node.
   *
   * @return {YXmlElement} The next node.
   *
   * @public
   */
  next () {
    let n = this._currentNode;
    if (this._firstCall) {
      this._firstCall = false;
      if (!n._deleted && this._filter(n)) {
        return { value: n, done: false }
      }
    }
    do {
      if (!n._deleted && (n.constructor === YXmlElement || n.constructor === YXmlFragment) && n._start !== null) {
        // walk down in the tree
        n = n._start;
      } else {
        // walk right or up in the tree
        while (n !== this._root) {
          if (n._right !== null) {
            n = n._right;
            break
          }
          n = n._parent;
        }
        if (n === this._root) {
          n = null;
        }
      }
      if (n === this._root) {
        break
      }
    } while (n !== null && (n._deleted || !this._filter(n)))
    this._currentNode = n;
    if (n === null) {
      return { done: true }
    } else {
      return { value: n, done: false }
    }
  }
}

/**
 * @module types
 */

/**
 * An Event that describes changes on a YXml Element or Yxml Fragment
 *
 * @protected
 */
class YXmlEvent extends YEvent {
  /**
   * @param {Type} target The target on which the event is created.
   * @param {Set} subs The set of changed attributes. `null` is included if the
   *                   child list changed.
   * @param {Boolean} remote Whether this change was created by a remote peer.
   * @param {Transaction} transaction The transaction instance with wich the
   *                                  change was created.
   */
  constructor (target, subs, remote, transaction) {
    super(target);
    /**
     * The transaction instance for the computed change.
     * @type {Transaction}
     */
    this._transaction = transaction;
    /**
     * Whether the children changed.
     * @type {Boolean}
     */
    this.childListChanged = false;
    /**
     * Set of all changed attributes.
     * @type {Set}
     */
    this.attributesChanged = new Set();
    /**
     * Whether this change was created by a remote peer.
     * @type {Boolean}
     */
    this.remote = remote;
    subs.forEach((sub) => {
      if (sub === null) {
        this.childListChanged = true;
      } else {
        this.attributesChanged.add(sub);
      }
    });
  }
}

/**
 * @module types
 */

/**
 * Dom filter function.
 *
 * @callback domFilter
 * @param {string} nodeName The nodeName of the element
 * @param {Map} attributes The map of attributes.
 * @return {boolean} Whether to include the Dom node in the YXmlElement.
 */

/**
 * Define the elements to which a set of CSS queries apply.
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors|CSS_Selectors}
 *
 * @example
 *   query = '.classSelector'
 *   query = 'nodeSelector'
 *   query = '#idSelector'
 *
 * @typedef {string} CSS_Selector
 *//**
 * @module types
 */

/**
 * Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
 * A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
 * nodeName and it does not have attributes. Though it can be bound to a DOM
 * element - in this case the attributes and the nodeName are not shared.
 *
 * @public
 */
class YXmlFragment extends YArray {
  /**
   * Create a subtree of childNodes.
   *
   * @example
   * const walker = elem.createTreeWalker(dom => dom.nodeName === 'div')
   * for (let node in walker) {
   *   // `node` is a div node
   *   nop(node)
   * }
   *
   * @param {Function} filter Function that is called on each child element and
   *                          returns a Boolean indicating whether the child
   *                          is to be included in the subtree.
   * @return {YXmlTreeWalker} A subtree and a position within it.
   *
   * @public
   */
  createTreeWalker (filter) {
    return new YXmlTreeWalker(this, filter)
  }

  /**
   * Returns the first YXmlElement that matches the query.
   * Similar to DOM's {@link querySelector}.
   *
   * Query support:
   *   - tagname
   * TODO:
   *   - id
   *   - attribute
   *
   * @param {CSS_Selector} query The query on the children.
   * @return {YXmlElement} The first element that matches the query or null.
   *
   * @public
   */
  querySelector (query) {
    query = query.toUpperCase();
    const iterator = new YXmlTreeWalker(this, element => element.nodeName === query);
    const next = iterator.next();
    if (next.done) {
      return null
    } else {
      return next.value
    }
  }

  /**
   * Returns all YXmlElements that match the query.
   * Similar to Dom's {@link querySelectorAll}.
   *
   * TODO: Does not yet support all queries. Currently only query by tagName.
   *
   * @param {CSS_Selector} query The query on the children
   * @return {Array<YXmlElement>} The elements that match this query.
   *
   * @public
   */
  querySelectorAll (query) {
    query = query.toUpperCase();
    return Array.from(new YXmlTreeWalker(this, element => element.nodeName === query))
  }

  /**
   * Creates YArray Event and calls observers.
   *
   * @private
   */
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YXmlEvent(this, parentSubs, remote, transaction));
  }

  toString () {
    return this.toDomString()
  }

  /**
   * Get the string representation of all the children of this YXmlFragment.
   *
   * @return {string} The string representation of all children.
   */
  toDomString () {
    return this.map(xml => xml.toDomString()).join('')
  }

  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object.<string, any>} [hooks={}] Optional property to customize how hooks
   *                                             are presented in the // TODO: include all tests

   * @param {DomBinding} [binding] You should not set this property. T// TODO: include all tests

   *                               used if DomBinding wants to create // TODO: include all tests

   *                               association to the created DOM type// TODO: include all tests

   * @return {DocumentFragment} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDom (_document = document, hooks = {}, binding) {
    const fragment = _document.createDocumentFragment();
    createAssociation(binding, fragment, this);
    this.forEach(xmlType => {
      fragment.insertBefore(xmlType.toDom(_document, hooks, binding), null);
    });
    return fragment
  }
  /**
   * Transform this YXml Type to a readable format.
   * Useful for logging as all Items and Delete implement this method.
   *
   * @private
   */
  _logString () {
    return logItemHelper('YXml', this)
  }
}

/**
 * An YXmlElement imitates the behavior of a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}.
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 */
class YXmlElement extends YXmlFragment {
  constructor (nodeName = 'UNDEFINED') {
    super();
    this.nodeName = nodeName.toUpperCase();
  }

  /**
   * Creates an Item with the same effect as this Item (without position effect)
   *
   * @private
   */
  _copy () {
    let struct = super._copy();
    struct.nodeName = this.nodeName;
    return struct
  }

  /**
   * Read the next Item in a Decoder and fill this Item with the read data.
   *
   * This is called when data is received from a remote peer.
   *
   * @private
   * @param {Y} y The Yjs instance that this Item belongs to.
   * @param {decoding.Decoder} decoder The decoder object to read data from.
   */
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder);
    this.nodeName = readVarString(decoder);
    return missing
  }

  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @private
   * @param {encoding.Encoder} encoder The encoder to write data to.
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writeVarString(encoder, this.nodeName);
  }

  /**
   * Integrates this Item into the shared structure.
   *
   * This method actually applies the change to the Yjs instance. In case of
   * Item it connects _left and _right to this Item and calls the
   * {@link Item#beforeChange} method.
   *
   * * Checks for nodeName
   * * Sets domFilter
   *
   * @private
   * @param {Y} y The Yjs instance
   */
  _integrate (y) {
    if (this.nodeName === null) {
      throw new Error('nodeName must be defined!')
    }
    super._integrate(y);
  }

  toString () {
    return this.toDomString()
  }

  /**
   * Returns the string representation of this YXmlElement.
   * The attributes are ordered by attribute-name, so you can easily use this
   * method to compare YXmlElements
   *
   * @return {String} The string representation of this type.
   *
   * @public
   */
  toDomString () {
    const attrs = this.getAttributes();
    const stringBuilder = [];
    const keys = [];
    for (let key in attrs) {
      keys.push(key);
    }
    keys.sort();
    const keysLen = keys.length;
    for (let i = 0; i < keysLen; i++) {
      const key = keys[i];
      stringBuilder.push(key + '="' + attrs[key] + '"');
    }
    const nodeName = this.nodeName.toLocaleLowerCase();
    const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : '';
    return `<${nodeName}${attrsString}>${super.toDomString()}</${nodeName}>`
  }

  /**
   * Removes an attribute from this YXmlElement.
   *
   * @param {String} attributeName The attribute name that is to be removed.
   *
   * @public
   */
  removeAttribute (attributeName) {
    return YMap.prototype.delete.call(this, attributeName)
  }

  /**
   * Sets or updates an attribute.
   *
   * @param {String} attributeName The attribute name that is to be set.
   * @param {String} attributeValue The attribute value that is to be set.
   *
   * @public
   */
  setAttribute (attributeName, attributeValue) {
    return YMap.prototype.set.call(this, attributeName, attributeValue)
  }

  /**
   * Returns an attribute value that belongs to the attribute name.
   *
   * @param {String} attributeName The attribute name that identifies the
   *                               queried value.
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   * @return {String} The queried attribute value.
   *
   * @public
   */
  getAttribute (attributeName, snapshot) {
    return YMap.prototype.get.call(this, attributeName, snapshot)
  }

  /**
   * Returns all attribute name/value pairs in a JSON Object.
   *
   * @param {import('../protocols/history.js').HistorySnapshot} [snapshot]
   * @return {Object} A JSON Object that describes the attributes.
   *
   * @public
   */
  getAttributes (snapshot) {
    const obj = {};
    if (snapshot === undefined) {
      for (let [key, value] of this._map) {
        if (!value._deleted) {
          obj[key] = value._content[0];
        }
      }
    } else {
      YMap.prototype.keys.call(this, snapshot).forEach(key => {
        obj[key] = YMap.prototype.get.call(this, key, snapshot);
      });
    }
    return obj
  }
  // TODO: outsource the binding property.
  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {DomBinding} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDom (_document = document, hooks = {}, binding) {
    const dom = _document.createElement(this.nodeName);
    let attrs = this.getAttributes();
    for (let key in attrs) {
      dom.setAttribute(key, attrs[key]);
    }
    this.forEach(yxml => {
      dom.appendChild(yxml.toDom(_document, hooks, binding));
    });
    createAssociation(binding, dom, this);
    return dom
  }
}

/**
 * @module utils
 */

/**
 * Check if `parent` is a parent of `child`.
 *
 * @param {Type | Y} parent
 * @param {Type | Y} child
 * @return {Boolean} Whether `parent` is a parent of `child`.
 *
 * @public
 */
const isParentOf = (parent, child) => {
  child = child._parent;
  while (child !== null) {
    if (child === parent) {
      return true
    }
    child = child._parent;
  }
  return false
};

/**
 * @module bindings/dom
 */

/**
 * @module bindings/dom
 */

/**
 * @module diff
 */

/**
 * @module bindings/dom
 */

/**
 * @module bindings/dom
 */

/**
 * A filter defines which elements and attributes to share.
 * Return null if the node should be filtered. Otherwise return the Map of
 * accepted attributes.
 *
 * @callback FilterFunction
 * @param {string} nodeName
 * @param {Map} attrs
 * @return {Map|null}
 */

/**
 * @module types
 */

/**
 * You can manage binding to a custom type with YXmlHook.
 *
 * @public
 */
class YXmlHook extends YMap {
  /**
   * @param {String} hookName nodeName of the Dom Node.
   */
  constructor (hookName) {
    super();
    this.hookName = null;
    if (hookName !== undefined) {
      this.hookName = hookName;
    }
  }

  /**
   * Creates an Item with the same effect as this Item (without position effect)
   *
   * @private
   */
  _copy () {
    const struct = super._copy();
    struct.hookName = this.hookName;
    return struct
  }

  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object.<string, any>} [hooks] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {DomBinding} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type
   * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDom (_document = document, hooks = {}, binding) {
    const hook = hooks[this.hookName];
    let dom;
    if (hook !== undefined) {
      dom = hook.createDom(this);
    } else {
      dom = document.createElement(this.hookName);
    }
    dom.setAttribute('data-yjs-hook', this.hookName);
    createAssociation(binding, dom, this);
    return dom
  }

  /**
   * Read the next Item in a Decoder and fill this Item with the read data.
   *
   * This is called when data is received from a remote peer.
   *
   * @param {Y} y The Yjs instance that this Item belongs to.
   * @param {decoding.Decoder} decoder The decoder object to read data from.
   *
   * @private
   */
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder);
    this.hookName = readVarString(decoder);
    return missing
  }

  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {encoding.Encoder} encoder The encoder to write data to.
   *
   * @private
   */
  _toBinary (encoder) {
    super._toBinary(encoder);
    writeVarString(encoder, this.hookName);
  }

  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Y} y The Yjs instance
   *
   * @private
   */
  _integrate (y) {
    if (this.hookName === null) {
      throw new Error('hookName must be defined!')
    }
    super._integrate(y);
  }
}

/**
 * @module bindings/dom
 */

/**
 * @module bindings/dom
 */

/**
 * Creates an association (the information that a DOM element belongs to a
 * type).
 *
 * @private
 * @function
 * @param {DomBinding} domBinding The binding object
 * @param {DocumentFragment|Element|Text} dom The dom that is to be associated with type
 * @param {YXmlFragment|YXmlElement|YXmlHook|YXmlText} type The type that is to be associated with dom
 *
 */
const createAssociation = (domBinding, dom, type) => {
  if (domBinding !== undefined) {
    domBinding.domToType.set(dom, type);
    domBinding.typeToDom.set(type, dom);
  }
};

/**
 * @module types
 */

/**
 * Represents text in a Dom Element. In the future this type will also handle
 * simple formatting information like bold and italic.
 */
class YXmlText extends YText {
  /**
   * Creates a Dom Element that mirrors this YXmlText.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {DomBinding} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDom (_document = document, hooks, binding) {
    const dom = _document.createTextNode(this.toString());
    createAssociation(binding, dom, this);
    return dom
  }

  /**
   * Mark this Item as deleted.
   *
   * @param {Y} y The Yjs instance
   * @param {boolean} createDelete Whether to propagate a message that this
   *                               Type was deleted.
   * @param {boolean} [gcChildren=y._hasUndoManager===false] Whether to garbage
   *                                         collect the children of this type.
   *
   * @private
   */
  _delete (y, createDelete, gcChildren) {
    super._delete(y, createDelete, gcChildren);
  }
}

/**
 * @module awareness-protocol
 */

const messageUsersStateChanged = 0;

/**
 * @typedef {Object} UserStateUpdate
 * @property {number} UserStateUpdate.userID
 * @property {number} UserStateUpdate.clock
 * @property {Object} UserStateUpdate.state
 */

/**
 * @param {encoding.Encoder} encoder
 * @param {Array<UserStateUpdate>} stateUpdates
 */
const writeUsersStateChange = (encoder, stateUpdates) => {
  const len = stateUpdates.length;
  writeVarUint(encoder, messageUsersStateChanged);
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const {userID, state, clock} = stateUpdates[i];
    writeVarUint(encoder, userID);
    writeVarUint(encoder, clock);
    writeVarString(encoder, JSON.stringify(state));
  }
};

const readUsersStateChange = (decoder, y) => {
  const added = [];
  const updated = [];
  const removed = [];
  const len = readVarUint(decoder);
  for (let i = 0; i < len; i++) {
    const userID = readVarUint(decoder);
    const clock = readVarUint(decoder);
    const state = JSON.parse(readVarString(decoder));
    const uClock = y.awarenessClock.get(userID) || 0;
    y.awarenessClock.set(userID, clock);
    if (state === null) {
      // only write if clock increases. cannot overwrite
      if (y.awareness.has(userID) && uClock < clock) {
        y.awareness.delete(userID);
        removed.push(userID);
      }
    } else if (uClock <= clock) { // allow to overwrite (e.g. when client was on, then offline)
      if (y.awareness.has(userID)) {
        updated.push(userID);
      } else {
        added.push(userID);
      }
      y.awareness.set(userID, state);
      y.awarenessClock.set(userID, clock);
    }
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    y.emit('awareness', {
      added, updated, removed
    });
  }
};

/**
 * @param {decoding.Decoder} decoder
 * @param {encoding.Encoder} encoder
 * @return {Array<UserStateUpdate>}
 */
const forwardUsersStateChange = (decoder, encoder) => {
  const len = readVarUint(decoder);
  const updates = [];
  writeVarUint(encoder, messageUsersStateChanged);
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const userID = readVarUint(decoder);
    const clock = readVarUint(decoder);
    const state = readVarString(decoder);
    writeVarUint(encoder, userID);
    writeVarUint(encoder, clock);
    writeVarString(encoder, state);
    updates.push({userID, state: JSON.parse(state), clock});
  }
  return updates
};

/**
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 */
const readAwarenessMessage = (decoder, y) => {
  switch (readVarUint(decoder)) {
    case messageUsersStateChanged:
      readUsersStateChange(decoder, y);
      break
  }
};

/**
 * @typedef {Object} UserState
 * @property {number} UserState.userID
 * @property {any} UserState.state
 * @property {number} UserState.clock
 */

/**
 * @param {decoding.Decoder} decoder
 * @param {encoding.Encoder} encoder
 * @return {Array<UserState>} Array of state updates
 */
const forwardAwarenessMessage = (decoder, encoder) => {
  let s = [];
  switch (readVarUint(decoder)) {
    case messageUsersStateChanged:
      s = forwardUsersStateChange(decoder, encoder);
  }
  return s
};

var awareness = /*#__PURE__*/Object.freeze({
  writeUsersStateChange: writeUsersStateChange,
  readUsersStateChange: readUsersStateChange,
  forwardUsersStateChange: forwardUsersStateChange,
  readAwarenessMessage: readAwarenessMessage,
  forwardAwarenessMessage: forwardAwarenessMessage
});

const messagePermissionDenied = 0;

/**
 * @param {encoding.Encoder} encoder
 * @param {string} reason
 */
const writePermissionDenied = (encoder, reason) => {
  writeVarUint(encoder, messagePermissionDenied);
  writeVarString(encoder, reason);
};

/**
 * @callback PermissionDeniedHandler
 * @param {any} y
 * @param {string} reason
 */

/**
 *
 * @param {decoding.Decoder} decoder
 * @param {Y} y
 * @param {PermissionDeniedHandler} permissionDeniedHandler
 */
const readAuthMessage = (decoder, y, permissionDeniedHandler) => {
  switch (readVarUint(decoder)) {
    case messagePermissionDenied: permissionDeniedHandler(y, readVarString(decoder));
  }
};

var auth = /*#__PURE__*/Object.freeze({
  messagePermissionDenied: messagePermissionDenied,
  writePermissionDenied: writePermissionDenied,
  readAuthMessage: readAuthMessage
});

class ReverseOperation {
  constructor (y, transaction, bindingInfos) {
    this.created = new Date();
    const beforeState = transaction.beforeState;
    if (beforeState.has(y.userID)) {
      this.toState = createID(y.userID, y.ss.getState(y.userID) - 1);
      this.fromState = createID(y.userID, beforeState.get(y.userID));
    } else {
      this.toState = null;
      this.fromState = null;
    }
    this.deletedStructs = new Set();
    transaction.deletedStructs.forEach(struct => {
      this.deletedStructs.add({
        from: struct._id,
        len: struct._length
      });
    });
    /**
     * Maps from binding to binding information (e.g. cursor information)
     */
    this.bindingInfos = bindingInfos;
  }
}

function applyReverseOperation (y, scopes, reverseBuffer) {
  let performedUndo = false;
  let undoOp = null;
  y.transact(() => {
    while (!performedUndo && reverseBuffer.length > 0) {
      undoOp = reverseBuffer.pop();
      // make sure that it is possible to iterate {from}-{to}
      if (undoOp.fromState !== null) {
        y.os.getItemCleanStart(undoOp.fromState);
        y.os.getItemCleanEnd(undoOp.toState);
        y.os.iterate(undoOp.fromState, undoOp.toState, op => {
          while (op._deleted && op._redone !== null) {
            op = op._redone;
          }
          if (op._deleted === false && scopes.find(scope => isParentOf(scope, op))) {
            performedUndo = true;
            op._delete(y);
          }
        });
      }
      const redoitems = new Set();
      for (let del of undoOp.deletedStructs) {
        const fromState = del.from;
        const toState = createID(fromState.user, fromState.clock + del.len - 1);
        y.os.getItemCleanStart(fromState);
        y.os.getItemCleanEnd(toState);
        y.os.iterate(fromState, toState, op => {
          if (
            scopes.find(scope => isParentOf(scope, op)) &&
            op._parent !== y &&
            (
              op._id.user !== y.userID ||
              undoOp.fromState === null ||
              op._id.clock < undoOp.fromState.clock ||
              op._id.clock > undoOp.toState.clock
            )
          ) {
            redoitems.add(op);
          }
        });
      }
      redoitems.forEach(op => {
        const opUndone = op._redo(y, redoitems);
        performedUndo = performedUndo || opUndone;
      });
    }
  });
  if (performedUndo && undoOp !== null) {
    // should be performed after the undo transaction
    undoOp.bindingInfos.forEach((info, binding) => {
      binding._restoreUndoStackInfo(info);
    });
  }
  return [performedUndo, undoOp]
}

function getMaxState(s1, s2) {
  if(s1.clock > s2.clock) {
    return s1
  }
  return s2
}

function getMinState(s1, s2) {
  if(s1.clock < s2.clock) {
    return s1
  }
  return s2
}

/**
 * Saves a history of locally applied operations. The UndoManager handles the
 * undoing and redoing of locally created changes.
 */
class UndoManager extends NamedEventHandler {
  /**
   * @param {YType} scope The scope on which to listen for changes.
   * @param {Object} options Optionally provided configuration.
   */
  constructor (scopes, options = {}) {
    super();
    if(!Array.isArray(scopes)) {
      scopes = [scopes];
    }
    this.options = options;
    this._bindings = new Set(options.bindings);
    options.captureTimeout = options.captureTimeout == null ? 500 : options.captureTimeout;
    this._undoBuffer = [];
    this._redoBuffer = [];
    this._scopes = scopes;
    this._undoing = false;
    this._redoing = false;
    this._lastTransactionWasUndo = false;
    this._skipping = false;
    const y = scopes[0]._y;
    this.y = y;
    y._hasUndoManager = true;
    let bindingInfos;
    y.on('beforeTransaction', (y, transaction, remote) => {
      if (this._skipping) {
        return
      }
      if (!remote) {
        // Store binding information before transaction is executed
        // By restoring the binding information, we can make sure that the state
        // before the transaction can be recovered
        bindingInfos = new Map();
        this._bindings.forEach(binding => {
          bindingInfos.set(binding, binding._getUndoStackInfo());
        });
      }
    });
    y.on('afterTransaction', (y, transaction, remote) => {
      if (this._skipping) {
        return
      }
      if (!remote && scopes.find(scope => transaction.changedParentTypes.has(scope))) {
        let reverseOperation = new ReverseOperation(y, transaction, bindingInfos);
        if (!this._undoing) {
          let lastUndoOp = this._undoBuffer.length > 0 ? this._undoBuffer[this._undoBuffer.length - 1] : null;
          if (
            this._redoing === false &&
            this._lastTransactionWasUndo === false &&
            lastUndoOp !== null &&
            (options.captureTimeout < 0 || reverseOperation.created - lastUndoOp.created <= options.captureTimeout)
          ) {
            lastUndoOp.created = reverseOperation.created;

            // merge operations state here
            // it can happen that older transactions appear later than recent, so we need
            // to take this into account and get the max state for toState and the min state for fromState
            if (reverseOperation.toState !== null) {
              if(lastUndoOp.toState === null) {
                lastUndoOp.toState = reverseOperation.toState;
              }
              else {
                lastUndoOp.toState = getMaxState(lastUndoOp.toState, reverseOperation.toState);
              }
              if(lastUndoOp.fromState === null) {
                lastUndoOp.fromState = reverseOperation.fromState;
              }
              else {
                lastUndoOp.fromState = getMinState(lastUndoOp.fromState, reverseOperation.fromState);
              }
            }
            reverseOperation.deletedStructs.forEach(lastUndoOp.deletedStructs.add, lastUndoOp.deletedStructs);
          } else {
            this._lastTransactionWasUndo = false;
            this._undoBuffer.push(reverseOperation);
            this.emit('undo-push', reverseOperation);
          }
          if (!this._redoing) {
            this._redoBuffer = [];
          }
        } else {
          this._lastTransactionWasUndo = true;
          this._redoBuffer.push(reverseOperation);
          this.emit('redo-push', reverseOperation);
        }
      }
    });
  }

  /**
   * Enforce that the next change is created as a separate item in the undo stack
   */
  flushChanges () {
    this._lastTransactionWasUndo = true;
  }

  /**
   * Undo the last locally created change.
   */
  undo () {
    this._undoing = true;
    const [performedUndo, op] = applyReverseOperation(this.y, this._scopes, this._undoBuffer);
    this._undoing = false;
    this.emit('undo', op);
    return performedUndo
  }

  /**
   * Redo the last locally created change.
   */
  redo () {
    this._redoing = true;
    const [performedRedo, op] = applyReverseOperation(this.y, this._scopes, this._redoBuffer);
    this._redoing = false;
    this.emit('redo', op);
    return performedRedo
  }

  startSkipping () {
    this._skipping = true;
  }

  stopSkipping () {
    this._skipping = false;
  }
}

/**
 * @module string
 */

/* eslint-env browser */

/* eslint-env browser */

/*
Unlike stated in the LICENSE file, it is not necessary to include the copyright notice and permission notice when you copy code from this file.
*/

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;

const reconnectTimeout = 3000;

/**
 * @param {WebsocketsSharedDocument} doc
 * @param {string} reason
 */
const permissionDeniedHandler = (doc, reason) => console.warn(`Permission denied to access ${doc.url}.\n${reason}`);

/**
 * @param {WebsocketsSharedDocument} doc
 * @param {ArrayBuffer} buf
 * @return {Y.encoding.Encoder}
 */
const readMessage = (doc, buf) => {
  const decoder = createDecoder(buf);
  const encoder = createEncoder();
  const messageType = readVarUint(decoder);
  switch (messageType) {
    case messageSync:
      writeVarUint(encoder, messageSync);
      doc.mux(() => {
        const syncMessageProcessedType = readSyncMessage(decoder, encoder, doc);
        if (syncMessageProcessedType === 1) {
          if (!doc._initialSyncComplete) {
            doc._initialSyncComplete = true;
            doc.emit('synced');
          }
        }
      });
      break
    case messageAwareness:
      readAwarenessMessage(decoder, doc);
      break
    case messageAuth:
      readAuthMessage(decoder, doc, permissionDeniedHandler);
  }
  return encoder
};

const setupWS = (doc, url) => {
  const websocket = new WebSocket(url);
  websocket.binaryType = 'arraybuffer';
  doc.ws = websocket;
  websocket.onmessage = event => {
    const encoder = readMessage(doc, event.data);
    if (length(encoder) > 1) {
      websocket.send(toBuffer(encoder));
    }
  };
  websocket.onclose = () => {
    doc.ws = null;
    doc.wsconnected = false;
    // update awareness (all users left)
    const removed = [];
    doc.getAwarenessInfo().forEach((_, userid) => {
      removed.push(userid);
    });
    doc.awareness = new Map();
    doc.emit('awareness', {
      added: [], updated: [], removed
    });
    doc.emit('status', {
      status: 'disconnected'
    });
    setTimeout(setupWS, reconnectTimeout, doc, url);
  };
  websocket.onopen = () => {
    doc.wsconnected = true;
    doc.emit('status', {
      status: 'connected'
    });
    // always send sync step 1 when connected
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    writeSyncStep1(encoder, doc);
    websocket.send(toBuffer(encoder));
    // force send stored awareness info
    doc.setAwarenessField(null, null);
  };
};

const broadcastUpdate = (y, transaction) => {
  if (transaction.encodedStructsLen > 0) {
    y.mux(() => {
      const encoder = createEncoder();
      writeVarUint(encoder, messageSync);
      writeUpdate(encoder, transaction.encodedStructsLen, transaction.encodedStructs);
      const buf = toBuffer(encoder);
      if (y.wsconnected) {
        y.ws.send(buf);
      }
    });
  }
};

class WebsocketsSharedDocument extends Y {
  constructor (url, opts) {
    super(opts);
    this.url = url;
    this.wsconnected = false;
    this.mux = createMutex();
    this.ws = null;
    this._localAwarenessState = {};
    this.awareness = new Map();
    this.awarenessClock = new Map();
    setupWS(this, url);
    this.on('afterTransaction', broadcastUpdate);

  }
  getLocalAwarenessInfo () {
    return this._localAwarenessState
  }
  getAwarenessInfo () {
    return this.awareness
  }
  setAwarenessField (field, value) {
    if (field !== null) {
      this._localAwarenessState[field] = value;
    }
    if (this.wsconnected) {
      const clock = (this.awarenessClock.get(this.userID) || 0) + 1;
      this.awarenessClock.set(this.userID, clock);
      const encoder = createEncoder();
      writeVarUint(encoder, messageAwareness);
      writeUsersStateChange(encoder, [{ userID: this.userID, state: this._localAwarenessState, clock }]);
      const buf = toBuffer(encoder);
      this.ws.send(buf);
    }
  }
}

/**
 * Websocket Provider for Yjs. Creates a single websocket connection to each document.
 * The document name is attached to the provided url. I.e. the following example
 * creates a websocket connection to http://localhost:1234/my-document-name
 *
 * @example
 *   import { WebsocketProvider } from 'yjs/provider/websocket/client.js'
 *   const provider = new WebsocketProvider('http://localhost:1234')
 *   const ydocument = provider.get('my-document-name')
 */
class WebsocketProvider$$1 {
  constructor (url) {
    // ensure that url is always ends with /
    while (url[url.length - 1] === '/') {
      url = url.slice(0, url.length - 1);
    }
    this.url = url + '/';
    /**
     * @type {Map<string, WebsocketsSharedDocument>}
     */
    this.docs = new Map();
  }
  /**
   * @param {string} name
   * @return {WebsocketsSharedDocument}
   */
  get (name, opts) {
    let doc = this.docs.get(name);
    if (doc === undefined) {
      doc = new WebsocketsSharedDocument(this.url + name, opts);
    }
    return doc
  }
}

/**
 * @module provider/websocket
 */

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
const defragmentItemContent = y => {
  const os = y.os;
  if (os.length < 2) {
    return
  }
  let deletes = [];
  let node = os.findSmallestNode();
  let next = node.next();
  let strBuffer = [];
  let strBufferNode = null;
  let concatStrItemWithBuf = (node) => {
    node.val._content += strBuffer.join('');
    delete node.val.__tmpMergeLength;
  };
  while (next !== null) {
    let a = node.val;
    let b = next.val;
    const aLen = a.__tmpMergeLength || a._length;
    if (
      (a instanceof ItemJSON || a instanceof ItemString) &&
      a.constructor === b.constructor &&
      a._deleted === b._deleted &&
      a._right === b &&
      (createID(a._id.user, a._id.clock + aLen)).equals(b._id)
    ) {
      a._right = b._right;
      if (a instanceof ItemJSON) {
        a._content = a._content.concat(b._content);
      } else if (a instanceof ItemString) {
        strBufferNode = node;
        strBuffer.push(b._content);
        a.__tmpMergeLength = aLen + b._length;
      }
      // delete b later
      deletes.push(b._id);
      // do not iterate node!
      // !(node = next)
    } else {
      if (strBuffer.length) {
        concatStrItemWithBuf(node);
        strBuffer = [];
        strBufferNode = null;
      }
      // not able to merge node, get next node
      node = next;
    }
    // update next
    next = next.next();
  }
  if (strBuffer.length) {
    concatStrItemWithBuf(strBufferNode);
  }
  for (let i = deletes.length - 1; i >= 0; i--) {
    os.delete(deletes[i]);
  }
};

registerStruct(0, GC);
registerStruct(1, ItemJSON);
registerStruct(2, ItemString);
registerStruct(3, ItemFormat);
registerStruct(4, Delete);

registerStruct(5, YArray);
registerStruct(6, YMap);
registerStruct(7, YText);
registerStruct(8, YXmlFragment);
registerStruct(9, YXmlElement);
registerStruct(10, YXmlText);
registerStruct(11, YXmlHook);
registerStruct(12, ItemEmbed);
registerStruct(13, ItemBinary);

exports.decoding = decoding;
exports.encoding = encoding;
exports.awarenessProtocol = awareness;
exports.syncProtocol = sync;
exports.authProtocol = auth;
exports.ID = ID$1;
exports.Y = Y;
exports.UndoManager = UndoManager;
exports.Transaction = Transaction;
exports.Array = YArray;
exports.Map = YMap;
exports.Text = YText;
exports.XmlText = YXmlText;
exports.XmlHook = YXmlHook;
exports.XmlElement = YXmlElement;
exports.XmlFragment = YXmlFragment;
exports.writeDeleteStore = writeDeleteStore;
exports.getRelativePosition = getRelativePosition;
exports.fromRelativePosition = fromRelativePosition;
exports.registerStruct = registerStruct;
exports.DeleteStore = DeleteStore;
exports.defragmentItemContent = defragmentItemContent;
exports.createMutex = createMutex;
exports.WebsocketProvider = WebsocketProvider$$1;
//# sourceMappingURL=yjs.js.map
