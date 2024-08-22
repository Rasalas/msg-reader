import DataStream from "./DataStream";
import { TransitionSystemTime } from "./TZDEFINITIONParser";
/**
 * @internal
 */
export declare function arraysEqual(a: ArrayLike<any>, b: ArrayLike<any>): boolean;
/**
 * @internal
 */
export declare function uInt2int(data: number[]): number[];
/**
 * @internal
 */
export declare function toHexStr(value: number, padding: number): string;
/**
 * byte to lower case hex string
 *
 * @internal
 */
export declare function toHex1(value: number): string;
/**
 * little uint16 to lower case hex string
 *
 * @internal
 */
export declare function toHex2(value: number): string;
/**
 * little uint32 to lower case hex string
 *
 * @internal
 */
export declare function toHex4(value: number): string;
/**
 * Variant 2 UUIDs, historically used in Microsoft's COM/OLE libraries,
 * use a mixed-endian format, whereby the first three components of the UUID are little-endian,
 * and the last two are big-endian.
 * For example, `00112233-4455-6677-8899-aabbccddeeff` is encoded as the bytes
 * `33 22 11 00 55 44 77 66 88 99 aa bb cc dd ee ff`.
 *
 * @see https://en.wikipedia.org/wiki/Universally_unique_identifier
 * @internal
 */
export declare function msftUuidStringify(array: ArrayLike<number>, offset: number): string;
/**
 * @internal
 */
export declare function emptyToNull(text: string): string;
/**
 * @internal
 */
export declare function readSystemTime(ds: DataStream): Date | null;
/**
 * @internal
 */
export declare function readTransitionSystemTime(ds: DataStream): TransitionSystemTime;
/**
 * @internal
 */
export declare function bin2HexUpper(ds: DataStream): string;
