import iconvLite from 'iconv-lite';
import { Buffer } from 'buffer';

import { DEFAULT_CHARSET } from './constants.js';

const FALLBACK_CHARSET = 'windows-1252';

const CHARSET_ALIASES = {
    'ansi_x3.4-1968': 'ascii',
    cp1250: 'windows-1250',
    cp1251: 'windows-1251',
    cp1252: 'windows-1252',
    cp1253: 'windows-1253',
    cp1254: 'windows-1254',
    cp1255: 'windows-1255',
    cp1256: 'windows-1256',
    cp1257: 'windows-1257',
    cp1258: 'windows-1258',
    latin1: 'iso-8859-1',
    'latin-1': 'iso-8859-1',
    unicode: 'utf-16le',
    utf8: 'utf-8',
    'us-ascii': 'ascii',
    win1252: 'windows-1252'
};

function toBuffer(bytes) {
    if (!bytes) return Buffer.from([]);
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function countReplacementChars(value) {
    return (value.match(/\ufffd/g) || []).length;
}

function isUtf8Charset(charset) {
    return charset === 'utf-8' || charset === 'utf8';
}

function isValidUtf8(buffer) {
    let expectedContinuationBytes = 0;
    let codePoint = 0;
    let minCodePoint = 0;

    for (const byte of buffer) {
        if (expectedContinuationBytes > 0) {
            if ((byte & 0xc0) !== 0x80) return false;
            codePoint = (codePoint << 6) | (byte & 0x3f);
            expectedContinuationBytes -= 1;

            if (expectedContinuationBytes === 0) {
                if (codePoint < minCodePoint) return false;
                if (codePoint > 0x10ffff) return false;
                if (codePoint >= 0xd800 && codePoint <= 0xdfff) return false;
            }
            continue;
        }

        if (byte <= 0x7f) {
            continue;
        } else if (byte >= 0xc2 && byte <= 0xdf) {
            expectedContinuationBytes = 1;
            codePoint = byte & 0x1f;
            minCodePoint = 0x80;
        } else if (byte >= 0xe0 && byte <= 0xef) {
            expectedContinuationBytes = 2;
            codePoint = byte & 0x0f;
            minCodePoint = 0x800;
        } else if (byte >= 0xf0 && byte <= 0xf4) {
            expectedContinuationBytes = 3;
            codePoint = byte & 0x07;
            minCodePoint = 0x10000;
        } else {
            return false;
        }
    }

    return expectedContinuationBytes === 0;
}

export function normalizeCharset(charset = DEFAULT_CHARSET) {
    const normalized = String(charset || DEFAULT_CHARSET)
        .trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase();

    return CHARSET_ALIASES[normalized] || normalized || DEFAULT_CHARSET;
}

function resolveSupportedCharset(charset) {
    const normalizedCharset = normalizeCharset(charset);

    return iconvLite.encodingExists(normalizedCharset) ? normalizedCharset : DEFAULT_CHARSET;
}

function decodeWithCharset(buffer, charset) {
    return iconvLite.decode(buffer, resolveSupportedCharset(charset));
}

export function decodeBytes(bytes, charset = DEFAULT_CHARSET, options = {}) {
    const buffer = toBuffer(bytes);
    const requestedCharset = normalizeCharset(charset);
    const effectiveCharset = resolveSupportedCharset(requestedCharset);
    const decoded = decodeWithCharset(buffer, requestedCharset);
    const fallbackCharset = normalizeCharset(options.fallbackCharset || FALLBACK_CHARSET);

    let result = decoded;
    if (fallbackCharset && isUtf8Charset(effectiveCharset) && !isValidUtf8(buffer)) {
        const fallbackDecoded = decodeWithCharset(buffer, fallbackCharset);
        if (countReplacementChars(fallbackDecoded) <= countReplacementChars(decoded)) {
            result = fallbackDecoded;
        }
    }

    return options.trim ? result.trim() : result;
}

export function binaryStringToBuffer(value = '') {
    return Buffer.from(value || '', 'binary');
}

export function binaryStringToBase64(value = '') {
    return binaryStringToBuffer(value).toString('base64');
}

export function decodeBinaryString(value = '', charset = DEFAULT_CHARSET, options = {}) {
    return decodeBytes(binaryStringToBuffer(value), charset, options);
}

export function textToBase64(value = '') {
    return Buffer.from(value || '', 'utf-8').toString('base64');
}

export function base64ToBuffer(value = '') {
    return Buffer.from((value || '').replace(/\s/g, ''), 'base64');
}

export function base64ToArrayBuffer(value = '') {
    const buffer = base64ToBuffer(value);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function decodeBase64Text(value = '', charset = DEFAULT_CHARSET, options = {}) {
    return decodeBytes(base64ToBuffer(value), charset, options);
}

export function getDataUrlBase64(dataUrl = '') {
    return dataUrl.split(',')[1] || '';
}

export function getDataUrlCharset(dataUrl = '', fallback = DEFAULT_CHARSET) {
    const metadata = dataUrl.split(',')[0] || '';
    const match = metadata.match(/(?:^|;)charset=([^;,]+)/i);
    return match ? normalizeCharset(match[1]) : fallback;
}

export function decodeDataUrlText(dataUrl = '', fallbackCharset = DEFAULT_CHARSET, options = {}) {
    return decodeBase64Text(
        getDataUrlBase64(dataUrl),
        getDataUrlCharset(dataUrl, fallbackCharset),
        options
    );
}

export function dataUrlToArrayBuffer(dataUrl = '') {
    return base64ToArrayBuffer(getDataUrlBase64(dataUrl));
}

export function quotedPrintableToBuffer(value = '', options = {}) {
    const input = options.mimeWord ? value.replace(/_/g, ' ') : value.replace(/=\r?\n/g, '');
    const bytes = [];

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        const hex = input.slice(i + 1, i + 3);

        if (char === '=' && /^[0-9A-F]{2}$/i.test(hex)) {
            bytes.push(parseInt(hex, 16));
            i += 2;
        } else {
            bytes.push(input.charCodeAt(i) & 0xff);
        }
    }

    return Buffer.from(bytes);
}

export function decodeQuotedPrintable(value = '', charset = DEFAULT_CHARSET, options = {}) {
    return decodeBytes(quotedPrintableToBuffer(value, options), charset, options);
}

export function percentEncodedToBuffer(value = '') {
    const bytes = [];

    for (let i = 0; i < value.length; i += 1) {
        const char = value[i];
        const hex = value.slice(i + 1, i + 3);

        if (char === '%' && /^[0-9A-F]{2}$/i.test(hex)) {
            bytes.push(parseInt(hex, 16));
            i += 2;
        } else {
            bytes.push(value.charCodeAt(i) & 0xff);
        }
    }

    return Buffer.from(bytes);
}

export function decodePercentEncodedText(value = '', charset = DEFAULT_CHARSET, options = {}) {
    return decodeBytes(percentEncodedToBuffer(value), charset, options);
}

export function decodeMimeWords(value = '') {
    if (!value) return '';

    return value
        .replace(/(=\?[^?]+\?[BQbq]\?[^?]*\?=)\s+(?==\?[^?]+\?[BQbq]\?)/g, '$1')
        .replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (match, charset, encoding, text) => {
            try {
                const bytes =
                    encoding.toUpperCase() === 'B'
                        ? base64ToBuffer(text)
                        : quotedPrintableToBuffer(text, { mimeWord: true });
                return decodeBytes(bytes, charset);
            } catch (error) {
                console.error('Error decoding MIME word:', error);
                return match;
            }
        });
}
