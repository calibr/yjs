export const structGCRefNumber: 0;
/**
 * @private
 */
export class GC extends AbstractStruct {
    constructor(id: ID, length: number);
    delete(): void;
    /**
     * @param {GC} right
     * @return {boolean}
     */
    mergeWith(right: GC): boolean;
    /**
     * @param {encoding.Encoder} encoder
     * @param {number} offset
     */
    write(encoder: encoding.Encoder, offset: number): void;
    /**
     * @param {Transaction} transaction
     * @param {StructStore} store
     * @return {null | number}
     */
    getMissing(transaction: Transaction, store: StructStore): number | null;
}
import { AbstractStruct } from "./AbstractStruct.js";
import * as encoding from "lib0/encoding";
import { Transaction } from "../utils/Transaction.js";
import { StructStore } from "../utils/StructStore.js";
import { ID } from "../utils/ID.js";
