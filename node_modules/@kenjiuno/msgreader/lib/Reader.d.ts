/**
 * `Object Type` in `2.6.1 Compound File Directory Entry`
 *
 * See also: [[MS-CFB]: Compound File Directory Entry | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/60fe8611-66c3-496b-b70d-a504c94c9ace)
 */
export declare enum TypeEnum {
    /**
     * `Storage Object`
     *
     * storage object: An object in a compound file that is analogous to a file system directory. The parent object of a storage object must be another storage object or the root storage object.
     *
     * See also:
     *
     * - [[MS-CFB]: Other Directory Entries | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/b37413bb-f3ef-4adc-b18e-29bddd62c26e)
     * - [[MS-CFB]: Glossary | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/59ccb2ef-1ce5-41e3-bc30-075dea759d0a#gt_c3ddf892-3f55-4561-8804-20325dbc8fba)
     */
    DIRECTORY = 1,
    /**
     * `Stream Object`
     *
     * - stream object: An object in a compound file that is analogous to a file system file. The parent object of a stream object must be a storage object or the root storage object.
     *
     * See also:
     * - [[MS-CFB]: Compound File User-Defined Data Sectors | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/b089deda-be20-4b4a-aad5-fbe68bb19672)
     * - [[MS-CFB]: Glossary | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/59ccb2ef-1ce5-41e3-bc30-075dea759d0a#gt_9f598e1c-0d65-4845-8f06-8d50f7a32fd5)
     */
    DOCUMENT = 2,
    /**
     * `Root Storage Object`
     *
     * - root storage object: A storage object in a compound file that must be accessed before any other storage objects and stream objects are referenced. It is the uppermost parent object in the storage object and stream object hierarchy.
     *
     * See also:
     * - [[MS-CFB]: Root Directory Entry | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/026fde6e-143d-41bf-a7da-c08b2130d50e)
     * - [[MS-CFB]: Glossary | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/59ccb2ef-1ce5-41e3-bc30-075dea759d0a#gt_d49237e3-04dd-4823-a0a5-5e23f750a5f4)
     */
    ROOT = 5
}
export interface Property {
    type: TypeEnum;
    name: string;
    previousProperty: number;
    nextProperty: number;
    childProperty: number;
    startBlock: number;
    sizeBlock: number;
    children?: number[];
}
/**
 * The reader access to CFBF storage
 */
export interface CFolder {
    /**
     * CFBF entry index.
     */
    dataId: number;
    /**
     * Storage name.
     */
    name: string;
    /**
     * Sub folders.
     */
    subFolders(): CFolder[];
    /**
     * Sub name set of streams.
     */
    fileNames(): string[];
    /**
     * Sub read access set of stream.
     */
    fileNameSets(): CFileSet[];
    /**
     * Read stream as binary to memory.
     */
    readFile(fileName: string): Uint8Array | null;
}
/**
 * The reader access to CFBF stream
 */
export interface CFileSet {
    /**
     * CFBF entry index.
     */
    dataId: number;
    /**
     * Stream name.
     */
    name: string;
    /**
     * The stream binary length in byte unit.
     */
    length: number;
    /**
     * Read stream contents and get memory data.
     */
    provider: () => Uint8Array;
}
/**
 * Original msg file (CFBF) reader which was implemented in MsgReader.
 */
export declare class Reader {
    private ds;
    private bigBlockSize;
    private bigBlockLength;
    private xBlockLength;
    private batCount;
    private propertyStart;
    private sbatStart;
    private sbatCount;
    private xbatStart;
    private xbatCount;
    private batData?;
    private sbatData?;
    private propertyData?;
    private bigBlockTable;
    constructor(arrayBuffer: ArrayBuffer | DataView);
    isMSGFile(): boolean;
    private headerData;
    private convertName;
    private convertProperty;
    private convertBlockToProperties;
    private createPropertyHierarchy;
    private propertyDataReader;
    /**
     * Parse msg file.
     */
    parse(): void;
    private batCountInHeader;
    private batDataReader;
    private getBlockOffsetAt;
    private getBlockAt;
    private getBlockValueAt;
    private getNextBlockInner;
    private getNextBlock;
    private sbatDataReader;
    private xbatDataReader;
    private getNextBlockSmall;
    private getChainByBlockSmall;
    private readBigBlockTable;
    private readDataByBlockSmall;
    private readChainDataByBlockSmall;
    private readProperty;
    /**
     * Get binary from document in CFBF.
     *
     * @param index entry index
     * @returns binary
     * @internal
     */
    readFileOf(index: number): Uint8Array;
    private folderOf;
    /**
     * Get reader access to CFBF (valid after successful call of {@link parse}).
     *
     * @returns root folder
     */
    rootFolder(): CFolder;
}
