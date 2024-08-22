"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bin2HexUpper = exports.readTransitionSystemTime = exports.readSystemTime = exports.emptyToNull = exports.msftUuidStringify = exports.toHex4 = exports.toHex2 = exports.toHex1 = exports.toHexStr = exports.uInt2int = exports.arraysEqual = void 0;
/**
 * @internal
 */
function arraysEqual(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (a.length != b.length)
        return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
exports.arraysEqual = arraysEqual;
/**
 * @internal
 */
function uInt2int(data) {
    var result = new Array(data.length);
    for (var i = 0; i < data.length; i++) {
        result[i] = data[i] << 24 >> 24;
    }
    return result;
}
exports.uInt2int = uInt2int;
/**
 * @internal
 */
function toHexStr(value, padding) {
    var text = "";
    while (value != 0) {
        text = "0123456789abcdef"[value & 15] + text;
        value >>= 4;
        text = "0123456789abcdef"[value & 15] + text;
        value >>= 4;
    }
    while (text.length < padding) {
        text = "0" + text;
    }
    return text;
}
exports.toHexStr = toHexStr;
var hex = "0123456789abcdef";
/**
 * byte to lower case hex string
 *
 * @internal
 */
function toHex1(value) {
    return hex[(value >> 4) & 15]
        + hex[(value) & 15];
}
exports.toHex1 = toHex1;
/**
 * little uint16 to lower case hex string
 *
 * @internal
 */
function toHex2(value) {
    return hex[(value >> 12) & 15]
        + hex[(value >> 8) & 15]
        + hex[(value >> 4) & 15]
        + hex[(value) & 15];
}
exports.toHex2 = toHex2;
/**
 * little uint32 to lower case hex string
 *
 * @internal
 */
function toHex4(value) {
    return hex[(value >> 28) & 15]
        + hex[(value >> 24) & 15]
        + hex[(value >> 20) & 15]
        + hex[(value >> 16) & 15]
        + hex[(value >> 12) & 15]
        + hex[(value >> 8) & 15]
        + hex[(value >> 4) & 15]
        + hex[(value) & 15];
}
exports.toHex4 = toHex4;
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
function msftUuidStringify(array, offset) {
    return ""
        + toHex1(array[offset + 3])
        + toHex1(array[offset + 2])
        + toHex1(array[offset + 1])
        + toHex1(array[offset + 0])
        + "-"
        + toHex1(array[offset + 5])
        + toHex1(array[offset + 4])
        + "-"
        + toHex1(array[offset + 7])
        + toHex1(array[offset + 6])
        + "-"
        + toHex1(array[offset + 8])
        + toHex1(array[offset + 9])
        + "-"
        + toHex1(array[offset + 10])
        + toHex1(array[offset + 11])
        + toHex1(array[offset + 12])
        + toHex1(array[offset + 13])
        + toHex1(array[offset + 14])
        + toHex1(array[offset + 15]);
}
exports.msftUuidStringify = msftUuidStringify;
/**
 * @internal
 */
function emptyToNull(text) {
    return (text === "") ? null : text;
}
exports.emptyToNull = emptyToNull;
/**
 * @internal
 */
function padNumber(value, maxLen) {
    return ("" + value).padStart(maxLen, '0');
}
/**
 * @internal
 */
function readSystemTime(ds) {
    // SYSTEMTIME structure (minwinbase.h)
    // https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-systemtime
    var wYear = ds.readUint16();
    var wMonth = ds.readUint16();
    var wDayOfWeek = ds.readUint16();
    var wDay = ds.readUint16();
    var wHour = ds.readUint16();
    var wMinute = ds.readUint16();
    var wSecond = ds.readUint16();
    var wMilliseconds = ds.readUint16();
    var text = "".concat(padNumber(wYear, 4), "-").concat(padNumber(wMonth, 2), "-").concat(padNumber(wDay, 2), "T").concat(padNumber(wHour, 2), ":").concat(padNumber(wMinute, 2), ":").concat(padNumber(wSecond, 2), "Z");
    if (text === '0000-00-00T00:00:00Z') {
        return null;
    }
    else {
        return new Date(text);
    }
}
exports.readSystemTime = readSystemTime;
/**
 * @internal
 */
function readTransitionSystemTime(ds) {
    // SYSTEMTIME structure (minwinbase.h)
    // https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-systemtime
    var wYear = ds.readUint16();
    var wMonth = ds.readUint16();
    var wDayOfWeek = ds.readUint16();
    var wDay = ds.readUint16();
    var wHour = ds.readUint16();
    var wMinute = ds.readUint16();
    var wSecond = ds.readUint16();
    var wMilliseconds = ds.readUint16();
    return {
        year: wYear,
        month: wMonth,
        dayOfWeek: wDayOfWeek,
        day: wDay,
        hour: wHour,
        minute: wMinute,
    };
}
exports.readTransitionSystemTime = readTransitionSystemTime;
/**
 * @internal
 */
function bin2HexUpper(ds) {
    var text = "";
    while (!ds.isEof()) {
        text += toHex1(ds.readUint8());
    }
    return text.toUpperCase();
}
exports.bin2HexUpper = bin2HexUpper;
