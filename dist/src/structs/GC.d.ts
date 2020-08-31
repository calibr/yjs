export const structGCRefNumber: 0;
/**
 * @private
 */
export class GC extends AbstractStruct {
    /**
     * @param {ID} id
     * @param {number} length
     */
    constructor(id: ID, length: number);
    delete(): void;
}
/**
 * @private
 */
export class GCRef extends AbstractStructRef {
    /**
     * @param {decoding.Decoder} decoder
     * @param {ID} id
     * @param {number} info
     */
    constructor(decoder: decoding.Decoder, id: ID, info: number);
    /**
     * @type {number}
     */
    length: number;
}
import { AbstractStruct } from "./AbstractStruct.js";
import { ID } from "../utils/ID.js";
import { AbstractStructRef } from "./AbstractStruct.js";
import * as decoding from "lib0/decoding";
