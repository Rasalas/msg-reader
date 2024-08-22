export interface Entry {
    key: number;
    isStringProperty: boolean;
    guidIndex: number;
    propertyIndex: number;
}
/**
 * @internal
 */
export declare function parse(array: Uint8Array): Entry[];
