import { TypeEnum } from "./Reader";
/**
 * CFBF entry for CFBF burner.
 *
 * These entries are stored in same order in CFBF.
 *
 * The first entry must be {@link ROOT}.
 *
 * This {@link ROOT} stream represents:
 *
 * - The root folder as same as you see in real file system.
 *   Including direct children files/folder.
 * - The body of minifat.
 *
 * The secondary entries are collection of items having type either {@link DIRECTORY} or {@link DOCUMENT}.
 *
 */
export interface Entry {
    /**
     * Entry name (max 32 chars).
     */
    name: string;
    /**
     * Entry type:
     *
     * - {@link DIRECTORY}
     * - {@link DOCUMENT}
     * - {@link ROOT}
     */
    type: TypeEnum;
    /**
     * Callback to supply binary data.
     *
     * This is valid only for {@link DOCUMENT} entry type.
    */
    binaryProvider?: () => ArrayLike<number>;
    /**
     * Binary data length in byte unit.
     *
     * Has to match with {@link binaryProvider}'s length.
     *
     * This is valid only for {@link DOCUMENT} entry type. Otherwise set zero.
     */
    length: number;
    /**
     * The indices to sub entries including {@link DOCUMENT} and {@link DIRECTORY}.
     *
     * This is valid only for {@link DIRECTORY} entry type.
     */
    children?: number[];
}
/**
 * Burn CFBF file on the fly.
 *
 * CFBF = Compound File Binary Format
 *
 * @param entries The flattened (not tree) entries starting with `Root Entry`.
 * @returns The binary.
 */
export declare function burn(entries: Entry[]): Uint8Array;
