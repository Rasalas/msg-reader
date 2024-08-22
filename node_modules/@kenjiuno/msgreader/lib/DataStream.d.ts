/**
 * This DataStream is for internal use.
 */
export default class DataStream {
    /**
     * @internal
     */
    _byteOffset: number;
    /**
     * @internal
     */
    position: number;
    /**
     * @internal
     */
    endianness: boolean;
    /**
     * @internal
     */
    _buffer: ArrayBuffer;
    /**
     * @internal
     */
    _dataView: DataView;
    /**
      DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
      It's like a file-like DataView on steroids.
    
      @param arrayBuffer ArrayBuffer to read from.
      @param byteOffset Offset from arrayBuffer beginning for the DataStream.
      @param endianness {@link DataStream.BIG_ENDIAN} or {@link DataStream.LITTLE_ENDIAN} (the default).
      */
    constructor(arrayBuffer: ArrayBuffer | DataView | Uint8Array | Int8Array, byteOffset: number | null, endianness: boolean | null);
    /**
      Saves the DataStream contents to the given filename.
      Uses Chrome's anchor download property to initiate download.
    
      @param filename Filename to save as.
      */
    save(filename: any): void;
    /**
      Big-endian const to use as default endianness.
      */
    static BIG_ENDIAN: boolean;
    /**
      Little-endian const to use as default endianness.
      */
    static LITTLE_ENDIAN: boolean;
    /**
      @internal
      */
    _dynamicSize: boolean;
    /**
     * Whether to extend DataStream buffer when trying to write beyond its size.
     * If set, the buffer is reallocated to twice its current size until the
     * requested write fits the buffer.
     */
    get dynamicSize(): boolean;
    set dynamicSize(v: boolean);
    /**
      Virtual byte length of the DataStream backing buffer.
      Updated to be max of original buffer size and last written size.
      If dynamicSize is false is set to buffer size.
  
      @internal
      */
    _byteLength: number;
    /**
      Returns the byte length of the DataStream object.
      */
    get byteLength(): number;
    /**
      Set/get the backing ArrayBuffer of the DataStream object.
      The setter updates the DataView to point to the new buffer.
      */
    get buffer(): ArrayBuffer;
    set buffer(v: ArrayBuffer);
    /**
      Set/get the byteOffset of the DataStream object.
      The setter updates the DataView to point to the new byteOffset.
      */
    get byteOffset(): number;
    set byteOffset(v: number);
    /**
      Set/get the backing DataView of the DataStream object.
      The setter updates the buffer and byteOffset to point to the DataView values.
      */
    get dataView(): DataView;
    set dataView(v: DataView);
    /**
      Internal function to resize the DataStream buffer when required.
      @param extra Number of bytes to add to the buffer allocation.
      */
    private _realloc;
    /**
      Internal function to trim the DataStream buffer when required.
      Used for stripping out the extra bytes from the backing buffer when
      the virtual byteLength is smaller than the buffer byteLength (happens after
      growing the buffer with writes and not filling the extra space completely).
    
      */
    private _trimAlloc;
    /**
      Sets the DataStream read/write position to given position.
      Clamps between 0 and DataStream length.
    
      @param pos Position to seek to.
      */
    seek(pos: number): void;
    /**
      Returns true if the DataStream seek pointer is at the end of buffer and
      there's no more data to read.
    
      @return True if the seek pointer is at the end of the buffer.
      */
    isEof(): boolean;
    /**
      Maps an Int32Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Int32Array to the DataStream backing buffer.
      */
    mapInt32Array(length: number, e?: boolean): Int32Array;
    /**
      Maps an Int16Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Int16Array to the DataStream backing buffer.
      */
    mapInt16Array(length: number, e?: boolean): Int16Array;
    /**
      Maps an Int8Array into the DataStream buffer.
    
      Nice for quickly reading in data.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Int8Array to the DataStream backing buffer.
      */
    mapInt8Array(length: number): Int8Array;
    /**
      Maps a Uint32Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Uint32Array to the DataStream backing buffer.
      */
    mapUint32Array(length: number, e?: boolean): Uint32Array;
    /**
      Maps a Uint16Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Uint16Array to the DataStream backing buffer.
      */
    mapUint16Array(length: number, e?: boolean): Uint16Array;
    /**
      Maps a Uint8Array into the DataStream buffer.
    
      Nice for quickly reading in data.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Uint8Array to the DataStream backing buffer.
      */
    mapUint8Array(length: number): Uint8Array;
    /**
      Maps a Float64Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Float64Array to the DataStream backing buffer.
      */
    mapFloat64Array(length: number, e?: boolean): Float64Array;
    /**
      Maps a Float32Array into the DataStream buffer, swizzling it to native
      endianness in-place. The current offset from the start of the buffer needs to
      be a multiple of element size, just like with typed array views.
    
      Nice for quickly reading in data. Warning: potentially modifies the buffer
      contents.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return Float32Array to the DataStream backing buffer.
      */
    mapFloat32Array(length: number, e?: boolean): Float32Array;
    /**
      Reads an Int32Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Int32Array.
     */
    readInt32Array(length: number, e?: boolean): Int32Array;
    /**
      Reads an Int16Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Int16Array.
     */
    readInt16Array(length: number, e?: boolean): Int16Array;
    /**
      Reads an Int8Array of desired length from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Int8Array.
     */
    readInt8Array(length: number): Int8Array;
    /**
      Reads a Uint32Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Uint32Array.
     */
    readUint32Array(length: number, e?: boolean): Uint32Array;
    /**
      Reads a Uint16Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Uint16Array.
     */
    readUint16Array(length: number, e?: boolean): Uint16Array;
    /**
      Reads a Uint8Array of desired length from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Uint8Array.
     */
    readUint8Array(length: number): Uint8Array;
    /**
     * @internal
     */
    readToUint8Array(length: number, arr: Uint8Array, dstOffset: number): void;
    /**
      Reads a Float64Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Float64Array.
     */
    readFloat64Array(length: number, e?: boolean): Float64Array;
    /**
      Reads a Float32Array of desired length and endianness from the DataStream.
    
      @param length Number of elements to map.
      @param e Endianness of the data to read.
      @return The read Float32Array.
     */
    readFloat32Array(length: number, e?: boolean): Float32Array;
    /**
      Writes an Int32Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeInt32Array(arr: Int32Array | ArrayLike<number>, e?: boolean): void;
    /**
      Writes an Int16Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeInt16Array(arr: Int16Array | ArrayLike<number>, e?: boolean): void;
    /**
      Writes an Int8Array to the DataStream.
    
      @param arr The array to write.
     */
    writeInt8Array(arr: Int8Array | ArrayLike<number>): void;
    /**
      Writes a Uint32Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeUint32Array(arr: Uint32Array | ArrayLike<number>, e?: boolean): void;
    /**
      Writes a Uint16Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeUint16Array(arr: Uint16Array | ArrayLike<number>, e?: boolean): void;
    /**
      Writes a Uint8Array to the DataStream.
    
      @param arr The array to write.
     */
    writeUint8Array(arr: Uint8Array | ArrayLike<number>): void;
    /**
      Writes a Float64Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeFloat64Array(arr: Float64Array | ArrayLike<number>, e?: boolean): void;
    /**
      Writes a Float32Array of specified endianness to the DataStream.
    
      @param arr The array to write.
      @param e Endianness of the data to write.
     */
    writeFloat32Array(arr: Float32Array | ArrayLike<number>, e?: boolean): void;
    /**
      Reads a 32-bit int from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readInt32(e?: boolean): number;
    /**
     Reads a 32-bit int from the DataStream with the offset.
    
     @param offset The offset.
     @return The read number.
     */
    readInt(offset: number): number;
    /**
      Reads a 16-bit int from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readInt16(e?: boolean): number;
    /**
     Reads a 16-bit int from the DataStream with the offset
    
     @param offset The offset.
     @return The read number.
     */
    readShort(offset: number): number;
    /**
      Reads an 8-bit int from the DataStream.
    
      @return The read number.
     */
    readInt8(): number;
    /**
     Reads an 8-bit int from the DataStream with the offset.
    
     @param offset The offset.
     @return The read number.
     */
    readByte(offset: number): number;
    /**
      Reads a 32-bit unsigned int from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readUint32(e?: boolean): number;
    /**
      Reads a 16-bit unsigned int from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readUint16(e?: boolean): number;
    /**
      Reads an 8-bit unsigned int from the DataStream.
    
      @return The read number.
     */
    readUint8(): number;
    /**
      Reads a 32-bit float from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readFloat32(e?: boolean): number;
    /**
      Reads a 64-bit float from the DataStream with the desired endianness.
    
      @param e Endianness of the number.
      @return The read number.
     */
    readFloat64(e?: boolean): number;
    /**
      Writes a 32-bit int to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeInt32(v: number, e?: boolean): void;
    /**
      Writes a 16-bit int to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeInt16(v: number, e?: boolean): void;
    /**
      Writes an 8-bit int to the DataStream.
    
      @param v Number to write.
     */
    writeInt8(v: number): void;
    /**
      Writes a 32-bit unsigned int to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeUint32(v: number, e?: boolean): void;
    /**
      Writes a 16-bit unsigned int to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeUint16(v: number, e?: boolean): void;
    /**
      Writes an 8-bit unsigned  int to the DataStream.
    
      @param v Number to write.
     */
    writeUint8(v: number): void;
    /**
      Writes a 32-bit float to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeFloat32(v: number, e?: boolean): void;
    /**
      Writes a 64-bit float to the DataStream with the desired endianness.
    
      @param v Number to write.
      @param e Endianness of the number.
     */
    writeFloat64(v: number, e?: boolean): void;
    /**
      Native endianness. Either DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN
      depending on the platform endianness.
    
     */
    static endianness: boolean;
    /**
      Copies byteLength bytes from the src buffer at srcOffset to the
      dst buffer at dstOffset.
    
      @param dst Destination ArrayBuffer to write to.
      @param dstOffset Offset to the destination ArrayBuffer.
      @param src Source ArrayBuffer to read from.
      @param srcOffset Offset to the source ArrayBuffer.
      @param byteLength Number of bytes to copy.
     */
    private static memcpy;
    /**
      Converts array to native endianness in-place.
    
      @param array Typed array to convert.
      @param arrayIsLittleEndian True if the data in the array is
                                           little-endian. Set false for big-endian.
      @return The converted typed array.
     */
    private static arrayToNative;
    /**
      Converts native endianness array to desired endianness in-place.
    
      @param array Typed array to convert.
      @param littleEndian True if the converted array should be
                                    little-endian. Set false for big-endian.
      @return The converted typed array.
     */
    private static nativeToEndian;
    /**
      Flips typed array endianness in-place.
    
      @param array Typed array to flip.
      @return The converted typed array.
     */
    private static flipArrayEndianness;
    /**
      Creates an array from an array of character codes.
      Uses String.fromCharCode on the character codes and concats the results into a string.
    
      @param array Array of character codes.
      @return String created from the character codes.
    **/
    private static createStringFromArray;
    /**
      Seek position where {@link readStruct} ran into a problem.
      Useful for debugging struct parsing.
    
     */
    failurePosition: number;
    /**
      Reads a struct of data from the DataStream. The struct is defined as
      a flat array of [name, type]-pairs. See the example below:
    
      ds.readStruct([
        'headerTag', 'uint32', // Uint32 in DataStream endianness.
        'headerTag2', 'uint32be', // Big-endian Uint32.
        'headerTag3', 'uint32le', // Little-endian Uint32.
        'array', ['[]', 'uint32', 16], // Uint32Array of length 16.
        'array2Length', 'uint32',
        'array2', ['[]', 'uint32', 'array2Length'] // Uint32Array of length array2Length
      ]);
    
      The possible values for the type are as follows:
    
      // Number types
    
      // Unsuffixed number types use DataStream endianness.
      // To explicitly specify endianness, suffix the type with
      // 'le' for little-endian or 'be' for big-endian,
      // e.g. 'int32be' for big-endian int32.
    
      'uint8' -- 8-bit unsigned int
      'uint16' -- 16-bit unsigned int
      'uint32' -- 32-bit unsigned int
      'int8' -- 8-bit int
      'int16' -- 16-bit int
      'int32' -- 32-bit int
      'float32' -- 32-bit float
      'float64' -- 64-bit float
    
      // String types
      'cstring' -- ASCII string terminated by a zero byte.
      'string:N' -- ASCII string of length N, where N is a literal integer.
      'string:variableName' -- ASCII string of length $variableName,
        where 'variableName' is a previously parsed number in the current struct.
      'string,CHARSET:N' -- String of byteLength N encoded with given CHARSET.
      'u16string:N' -- UCS-2 string of length N in DataStream endianness.
      'u16stringle:N' -- UCS-2 string of length N in little-endian.
      'u16stringbe:N' -- UCS-2 string of length N in big-endian.
    
      // Complex types
      [name, type, name_2, type_2, ..., name_N, type_N] -- Struct
      function(dataStream, struct) {} -- Callback function to read and return data.
      {get: function(dataStream, struct) {},
       set: function(dataStream, struct) {}}
      -- Getter/setter functions to read and return data, handy for using the same
         struct definition for reading and writing structs.
      ['[]', type, length] -- Array of given type and length. The length can be either
                            a number, a string that references a previously-read
                            field, or a callback function(struct, dataStream, type){}.
                            If length is '*', reads in as many elements as it can.
    
      @param structDefinition Struct definition object.
      @return The read struct. Null if failed to read struct.
     */
    readStruct(structDefinition: any): {};
    /**
      Read UCS-2 string of desired length and endianness from the DataStream.
    
      @param length The length of the string to read.
      @param endianness The endianness of the string data in the DataStream.
      @return The read string.
     */
    readUCS2String(length: number, endianness?: boolean): string;
    /**
     Read UCS-2 string of desired length and offset from the DataStream.
    
     @param offset The offset.
     @param length The length of the string to read.
     @return The read string.
     */
    readStringAt(offset: number, length: number): string;
    /**
      Write a UCS-2 string of desired endianness to the DataStream. The
      lengthOverride argument lets you define the number of characters to write.
      If the string is shorter than lengthOverride, the extra space is padded with
      zeroes.
    
      @param str The string to write.
      @param endianness The endianness to use for the written string data.
      @param lengthOverride The number of characters to write.
     */
    writeUCS2String(str: string, endianness?: boolean, lengthOverride?: number): void;
    /**
      Read a string of desired length and encoding from the DataStream.
    
      @param length The length of the string to read in bytes.
      @param encoding The encoding of the string data in the DataStream.
                                Defaults to ASCII.
      @return The read string.
     */
    readString(length?: number, encoding?: string): any;
    /**
      Writes a string of desired length and encoding to the DataStream.
    
      @param s The string to write.
      @param encoding The encoding for the written string data.
                                Defaults to ASCII.
      @param length The number of characters to write.
     */
    writeString(s: string, encoding?: string, length?: number): void;
    /**
      Read null-terminated string of desired length from the DataStream. Truncates
      the returned string so that the null byte is not a part of it.
    
      @param length The length of the string to read.
      @return The read string.
     */
    readCString(length?: number): string;
    /**
      Writes a null-terminated string to DataStream and zero-pads it to length
      bytes. If length is not given, writes the string followed by a zero.
      If string is longer than length, the written part of the string does not have
      a trailing zero.
    
      @param s The string to write.
      @param length The number of characters to write.
     */
    writeCString(s: string, length?: number): void;
    /**
      Reads an object of type t from the DataStream, passing struct as the thus-far
      read struct to possible callbacks that refer to it. Used by readStruct for
      reading in the values, so the type is one of the readStruct types.
    
      @param t Type of the object to read.
      @param struct Struct to refer to when resolving length references
                              and for calling callbacks.
      @return Returns the object on successful read, null on unsuccessful.
     */
    readType(t: any, struct: any): any;
    /**
      Writes a struct to the DataStream. Takes a structDefinition that gives the
      types and a struct object that gives the values. Refer to readStruct for the
      structure of structDefinition.
    
      @param structDefinition Type definition of the struct.
      @param struct The struct data object.
      */
    writeStruct(structDefinition: any, struct: any): void;
    /**
      Writes object v of type t to the DataStream.
    
      @param t Type of data to write.
      @param v Value of data to write.
      @param struct Struct to pass to write callback functions.
      */
    writeType(t: any, v: any, struct: any): any;
}
