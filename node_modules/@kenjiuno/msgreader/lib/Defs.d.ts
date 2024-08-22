/**
 * Obtain a copy of list of some known property tags.
 *
 * e.g.
 *
 * ```
 * [
 *  ...,
 *  {
 *   "area": "General Message Properties",
 *   "key": "0037001F",
 *   "name": "PidTagSubject"
 *  },
 *  ...
 * ]
 * ```
 *
 */
export declare function getProps(): Array<{
    area: string;
    key: string;
    name: string;
}>;
/**
 * Obtain a copy of a table for mapping from property type value to property type name.
 *
 * e.g.
 *
 * - `typeNames[0x0003]` returns `"PtypInteger32"`.
 * - `typeNames[0x001E]` returns `"PtypString8"`.
 * - `typeNames[0x001F]` returns `"PtypString"`.
 * - `typeNames[0x0102]` returns `"PtypBinary"`.
 *
 * @see [[MS-OXCDATA]: Property Data Types | Microsoft Docs](https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxcdata/0c77892e-288e-435a-9c49-be1c20c7afdb)
 */
export declare function getTypeNames(): {
    [key: number]: string;
};
/**
 * Obtain a copy of a table to convert from [LCID](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/70feba9f-294e-491e-b6eb-56532684c37f)
 * to [ANSICodePage](https://docs.microsoft.com/en-us/dotnet/api/system.globalization.textinfo.ansicodepage?view=net-5.0) list.
 *
 * e.g.
 *
 * - `lcidToAnsiCodePages[0x0409]` will return `[1252]` (en-US)
 * - `lcidToAnsiCodePages[0x0411]` will return `[932]` (ja-JP)
 */
export declare function getLcidToAnsiCodePages(): {
    [key: number]: Array<number>;
};
