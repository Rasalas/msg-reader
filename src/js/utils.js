import MsgReaderLib from '@kenjiuno/msgreader';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import { deEncapsulateSync } from 'rtf-stream-parser';
import { Buffer } from 'buffer';

import {
    escapeRegex,
    extractBaseMimeType,
    extractBoundary,
    extractCharset,
    getCharsetFromCodepage
} from './helpers.js';
import { BASE64_SIZE_FACTOR, DEFAULT_CHARSET } from './constants.js';
import { replaceCidReferences } from './cidReplacer.js';
import { parseAddressHeader } from './addressUtils.js';
import {
    binaryStringToBase64,
    decodeBase64Text,
    decodeBinaryString,
    decodeBytes,
    decodeMimeWords,
    decodePercentEncodedText,
    decodeQuotedPrintable,
    textToBase64
} from './encoding.js';

/**
 * Sanitizes attachment filenames to prevent path traversal attacks
 * and remove dangerous characters
 * @param {string} filename - The original filename
 * @returns {string} Sanitized filename safe for filesystem operations
 */
function sanitizeFilename(filename) {
    if (!filename) return 'attachment';

    let sanitized = filename
        // Remove path traversal sequences
        .replace(/\.\.\//g, '') // Remove ../
        .replace(/\.\.\\/g, '') // Remove ..\
        .replace(/^\/+/g, '') // Remove leading forward slashes
        .replace(/^[A-Za-z]:[\\/]/g, '') // Remove Windows drive letters (C:\, D:/)
        // Remove control characters
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters (including null)
        .replace(/\ufeff/g, '') // Remove UTF-16 BOM
        .replace(/\ufffd/g, '') // Remove replacement character
        // Replace Windows reserved characters
        .replace(/[<>:"|?*]/g, '_') // Replace chars invalid in Windows filenames
        // Remove trailing encoding artifacts from MIME (e.g., _= or trailing =)
        .replace(/[_=]+$/, '')
        .trim();

    // Extract only the filename (remove any remaining path components)
    sanitized = sanitized.split('/').pop().split('\\').pop();

    // Ensure we have a valid filename
    return sanitized || 'attachment';
}

const MIME_EXTENSION_FALLBACKS = {
    'application/javascript': '.js',
    'application/json': '.json',
    'application/pdf': '.pdf',
    'application/rtf': '.rtf',
    'application/xml': '.xml',
    'image/bmp': '.bmp',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'message/rfc822': '.eml',
    'text/csv': '.csv',
    'text/html': '.html',
    'text/plain': '.txt'
};

/**
 * Normalizes a filename extension so it can be appended safely.
 * @param {string} extension - Raw extension (with or without leading dot)
 * @returns {string} Sanitized extension with leading dot, or empty string
 */
function normalizeAttachmentExtension(extension) {
    if (!extension) return '';

    const sanitized = sanitizeFilename(extension);
    if (!sanitized) return '';

    return sanitized.startsWith('.') ? sanitized : `.${sanitized}`;
}

/**
 * Appends an extension to a filename when it is missing.
 * @param {string} filename - Candidate filename
 * @param {string} extension - Normalized extension with leading dot
 * @returns {string} Filename with extension when applicable
 */
function appendExtensionIfMissing(filename, extension) {
    if (!filename) return '';
    if (!extension) return filename;

    return filename.toLowerCase().endsWith(extension.toLowerCase())
        ? filename
        : `${filename}${extension}`;
}

/**
 * Resolves a usable filename for MSG attachments when Outlook omits PidTagAttachLongFilename.
 * @param {Object} attachment - MSG attachment metadata from msgreader
 * @param {string} [attachmentFileName=''] - Filename returned by msgreader.getAttachment()
 * @returns {string} Sanitized filename
 */
function resolveMsgAttachmentFilename(attachment, attachmentFileName = '') {
    const mimeType = (attachment?.attachMimeTag || '').toLowerCase();
    const extension = normalizeAttachmentExtension(
        attachment?.extension || MIME_EXTENSION_FALLBACKS[mimeType] || ''
    );

    const candidates = [
        attachmentFileName,
        attachment?.fileName,
        appendExtensionIfMissing(attachment?.name, extension),
        appendExtensionIfMissing(attachment?.fileNameShort, extension)
    ];

    for (const candidate of candidates) {
        if (typeof candidate !== 'string' || !candidate.trim()) {
            continue;
        }

        const sanitized = sanitizeFilename(candidate);
        if (sanitized !== 'attachment' || candidate.trim().toLowerCase() === 'attachment') {
            return sanitized;
        }
    }

    return extension ? `attachment${extension}` : 'attachment';
}

/**
 * Decodes MIME encoded-word format strings (RFC 2047)
 * Handles both Base64 (B) and Quoted-Printable (Q) encodings
 * @param {string} str - String containing encoded words (e.g., "=?UTF-8?B?SGVsbG8=?=")
 * @returns {string} Decoded string
 */
function decodeMIMEWord(str) {
    return decodeMimeWords(str);
}

function splitHeaderParameters(headerValue) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    let escaped = false;

    for (const char of headerValue || '') {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === '\\' && inQuotes) {
            current += char;
            escaped = true;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
            continue;
        }

        if (char === ';' && !inQuotes) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

function unquoteHeaderValue(value) {
    const trimmed = (value || '').trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/\\(.)/g, '$1');
    }
    return trimmed;
}

function parseHeaderParameters(headerValue) {
    return splitHeaderParameters(headerValue)
        .slice(1)
        .reduce((params, part) => {
            const equalsIndex = part.indexOf('=');
            if (equalsIndex === -1) return params;

            const name = part.slice(0, equalsIndex).trim().toLowerCase();
            const value = unquoteHeaderValue(part.slice(equalsIndex + 1));
            if (name) {
                params[name] = value;
            }

            return params;
        }, {});
}

function decodeRfc2231Value(value) {
    const match = (value || '').match(/^([^']*)'[^']*'(.*)$/);
    if (match) {
        return decodePercentEncodedText(match[2], match[1] || DEFAULT_CHARSET);
    }

    return decodePercentEncodedText(value, DEFAULT_CHARSET);
}

function decodeRfc2231Parameter(params, parameterName) {
    const directValue = params[`${parameterName}*`];
    if (directValue) {
        return decodeRfc2231Value(directValue);
    }

    const segments = Object.keys(params)
        .map((key) => {
            const match = key.match(new RegExp(`^${parameterName}\\*(\\d+)(\\*)?$`, 'i'));
            return match ? { key, index: Number(match[1]) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.index - b.index);

    if (segments.length === 0) return '';

    return decodeRfc2231Value(segments.map((segment) => params[segment.key] || '').join(''));
}

/**
 * Extracts filename from Content-Disposition header
 * Handles RFC 2231 encoding and MIME encoded-words
 * @param {string} contentDisposition - Content-Disposition header value
 * @param {string} [defaultName='attachment'] - Default filename if none found
 * @param {string} [contentType=''] - Content-Type header value, used for name fallback
 * @returns {string} Extracted filename
 */
function extractFilename(contentDisposition, defaultName = 'attachment', contentType = '') {
    const dispositionParams = parseHeaderParameters(contentDisposition);
    const contentTypeParams = parseHeaderParameters(contentType);

    const encodedFilename =
        decodeRfc2231Parameter(dispositionParams, 'filename') ||
        decodeRfc2231Parameter(contentTypeParams, 'name');
    if (encodedFilename) {
        return encodedFilename.replace(/[_=]+$/, '');
    }

    const plainFilename = dispositionParams.filename || contentTypeParams.name;
    if (plainFilename) {
        return decodeMIMEWord(plainFilename).replace(/[_=]+$/, '');
    }

    return defaultName;
}

/**
 * Parses email headers from a header string
 * Handles multi-line headers (folded headers)
 * @param {string} headerString - Raw header string
 * @returns {Object} Parsed headers as key-value pairs (keys are lowercase)
 */
export function parseEmailHeaders(headerString) {
    const headers = {};
    let currentHeader = '';

    headerString.split(/\r?\n/).forEach((line) => {
        if (line.match(/^\s+/)) {
            // Continuation of previous header (folded header)
            if (currentHeader) {
                headers[currentHeader] += ' ' + line.trim();
            }
        } else {
            const match = line.match(/^([\w-]+):\s*(.*)$/i);
            if (match) {
                currentHeader = match[1].toLowerCase().trim();
                headers[currentHeader] = match[2].trim();
            }
        }
    });

    return headers;
}

/**
 * Decodes content based on transfer encoding
 * @param {string} content - Raw content string
 * @param {string} encoding - Transfer encoding (base64, quoted-printable, or empty)
 * @param {string} charset - Character set for decoding
 * @param {boolean} isText - Whether content is text (affects base64 decoding)
 * @returns {string} Decoded content
 */
function decodeTransferEncoding(content, encoding, charset, isText = true) {
    const normalizedEncoding = (encoding || '').toLowerCase();

    if (normalizedEncoding === 'base64') {
        if (isText) {
            try {
                return decodeBase64Text(content, charset);
            } catch (error) {
                console.error('Error decoding base64 content:', error);
                return content;
            }
        }
        return content; // Return raw for non-text
    } else if (normalizedEncoding === 'quoted-printable') {
        return decodeQuotedPrintable(content, charset);
    }

    return decodeBinaryString(content, charset, { trim: true });
}

/**
 * Extracts email addresses from a header value
 * @param {string} str - Header value containing email addresses
 * @returns {Array<{name: string, address: string}>} Array of email objects
 */
function extractEmailAddresses(str) {
    return parseAddressHeader(str, decodeMIMEWord);
}

/**
 * Creates an attachment object from parsed data
 * @param {string} filename - Attachment filename
 * @param {string} mimeType - MIME type
 * @param {string} base64Content - Base64 encoded content
 * @param {string} [contentId] - Optional Content-ID
 * @returns {Object} Attachment object
 */
function createAttachment(filename, mimeType, base64Content, contentId = null) {
    const attachment = {
        fileName: sanitizeFilename(filename),
        attachMimeTag: mimeType,
        contentLength: Math.floor(base64Content.length * BASE64_SIZE_FACTOR),
        contentBase64: `data:${mimeType};base64,${base64Content}`
    };

    if (contentId) {
        attachment.contentId = contentId.replace(/[<>]/g, '').trim();
    }

    return attachment;
}

/**
 * Parses multipart email content recursively
 * @param {string} content - Raw multipart content
 * @param {string} boundary - MIME boundary string
 * @param {number} [depth=0] - Recursion depth
 * @param {string} [defaultCharset='utf-8'] - Default charset
 * @returns {{bodyHTML: string, bodyText: string, attachments: Array}} Parsed content
 */
function parseMultipartContent(content, boundary, depth = 0, defaultCharset = DEFAULT_CHARSET) {
    const results = {
        bodyHTML: '',
        bodyText: '',
        attachments: []
    };

    const boundaryRegExp = new RegExp(`--${escapeRegex(boundary)}(?:--)?(?:\r?\n|\r|$)`, 'g');
    const parts = content.split(boundaryRegExp).filter((part) => part.trim());

    parts.forEach((part) => {
        const partMatch = part.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!partMatch) return;

        const [, partHeadersStr, partContent] = partMatch;
        const partHeaders = parseEmailHeaders(partHeadersStr);

        const contentType = partHeaders['content-type'] || '';
        const baseContentType = extractBaseMimeType(contentType);
        const contentTransferEncoding = partHeaders['content-transfer-encoding'] || '';
        const contentDisposition = partHeaders['content-disposition'] || '';
        const contentId = partHeaders['content-id'] || '';

        const partCharset = /charset\s*=/i.test(contentType)
            ? extractCharset(contentType)
            : defaultCharset;

        // Check for nested multipart
        const nestedBoundary = extractBoundary(contentType);
        if (nestedBoundary) {
            const nestedResults = parseMultipartContent(
                partContent,
                nestedBoundary,
                depth + 1,
                partCharset
            );
            // Merge nested results
            if (nestedResults.bodyHTML) {
                results.bodyHTML = results.bodyHTML
                    ? results.bodyHTML + '\n' + nestedResults.bodyHTML
                    : nestedResults.bodyHTML;
            }
            if (nestedResults.bodyText) {
                results.bodyText = results.bodyText
                    ? results.bodyText + '\n' + nestedResults.bodyText
                    : nestedResults.bodyText;
            }
            results.attachments.push(...nestedResults.attachments);
            return;
        }

        // Check if this part is explicitly marked as an attachment
        const isExplicitAttachment = contentDisposition.toLowerCase().startsWith('attachment');

        // Decode and handle content based on type
        if (isExplicitAttachment) {
            // Treat as attachment regardless of content-type
            const filename = extractFilename(contentDisposition, 'attachment', contentType);
            const mimeType = baseContentType || 'application/octet-stream';

            let base64Content;
            if (contentTransferEncoding.toLowerCase() === 'base64') {
                base64Content = partContent.replace(/\s/g, '');
            } else {
                // For text-based attachments, properly encode to base64
                const decodedContent = decodeTransferEncoding(
                    partContent.trim(),
                    contentTransferEncoding,
                    partCharset
                );
                base64Content = textToBase64(decodedContent);
            }

            const attachment = createAttachment(filename, mimeType, base64Content, contentId);
            results.attachments.push(attachment);
        } else if (baseContentType === 'text/html') {
            const decodedContent = decodeTransferEncoding(
                partContent.trim(),
                contentTransferEncoding,
                partCharset
            );
            results.bodyHTML = results.bodyHTML
                ? results.bodyHTML + '\n' + decodedContent
                : decodedContent;
        } else if (baseContentType === 'text/plain') {
            const decodedContent = decodeTransferEncoding(
                partContent.trim(),
                contentTransferEncoding,
                partCharset
            );
            results.bodyText = results.bodyText
                ? results.bodyText + '\n' + decodedContent
                : decodedContent;
        } else if (
            baseContentType.startsWith('image/') ||
            baseContentType.startsWith('application/')
        ) {
            const filename = extractFilename(contentDisposition, 'attachment', contentType);
            const mimeType = baseContentType;

            let base64Content;
            if (contentTransferEncoding.toLowerCase() === 'base64') {
                base64Content = partContent.replace(/\s/g, '');
            } else {
                base64Content = binaryStringToBase64(partContent);
            }

            const attachment = createAttachment(filename, mimeType, base64Content, contentId);

            // Fallback: try Content-Location if no Content-ID
            if (!contentId) {
                const contentLocation = partHeaders['content-location'] || '';
                if (contentLocation) {
                    attachment.contentId = contentLocation.replace(/[<>]/g, '').trim();
                }
            }

            results.attachments.push(attachment);
        } else if (baseContentType.startsWith('message/')) {
            // Handle nested email attachments (e.g., message/rfc822)
            const filename = extractFilename(
                contentDisposition,
                'embedded_message.eml',
                contentType
            );
            const mimeType = baseContentType;

            // Encode the entire part content as base64
            let base64Content;
            if (contentTransferEncoding.toLowerCase() === 'base64') {
                base64Content = partContent.replace(/\s/g, '');
            } else {
                base64Content = binaryStringToBase64(partContent);
            }

            const attachment = createAttachment(filename, mimeType, base64Content, contentId);
            results.attachments.push(attachment);
        } else if (baseContentType.startsWith('text/')) {
            // Other text types (text/x-diff, text/csv, etc.) - treat as attachment if has filename
            const filename = extractFilename(contentDisposition, 'attachment', contentType);
            if (filename && filename !== 'attachment') {
                const mimeType = baseContentType;
                const decodedContent = decodeTransferEncoding(
                    partContent.trim(),
                    contentTransferEncoding,
                    partCharset
                );
                const base64Content = textToBase64(decodedContent);
                const attachment = createAttachment(filename, mimeType, base64Content, contentId);
                results.attachments.push(attachment);
            }
        }
    });

    return results;
}

/**
 * Initializes MsgReader and extracts file data
 * @param {ArrayBuffer} fileBuffer - The raw MSG file content
 * @returns {{reader: Object, info: Object}|null} MsgReader instance and file data
 */
function initializeMsgReader(fileBuffer) {
    try {
        let msgReader = null;
        let msgInfo = null;

        if (typeof MsgReaderLib === 'function') {
            msgReader = new MsgReaderLib(fileBuffer);
            msgInfo = msgReader.getFileData();
        } else if (MsgReaderLib && typeof MsgReaderLib.default === 'function') {
            msgReader = new MsgReaderLib.default(fileBuffer);
            msgInfo = msgReader.getFileData();
        } else {
            console.error('MsgReader constructor could not be found.');
            return null;
        }

        return { reader: msgReader, info: msgInfo };
    } catch (error) {
        console.error('Error creating a MsgReader instance:', error);
        return null;
    }
}

/**
 * Extracts HTML content from MSG file data
 * Handles raw HTML arrays, compressed RTF, and plain text fallback
 * @param {Object} msgInfo - Parsed MSG file data
 * @param {Object} [debugData] - Optional debug data object to populate
 * @returns {string} HTML content
 */
function extractMsgHtmlContent(msgInfo, debugData = null) {
    const emailBodyContent = msgInfo.bodyHTML || msgInfo.body || '';

    // Try HTML from Uint8Array first (preserves tables and formatting better)
    if (msgInfo.html && typeof msgInfo.html === 'object') {
        try {
            const htmlArr = Array.isArray(msgInfo.html)
                ? Uint8Array.from(msgInfo.html)
                : Uint8Array.from(Object.values(msgInfo.html));

            const charset = getCharsetFromCodepage(msgInfo.internetCodepage);

            if (debugData) {
                debugData.htmlSource = 'uint8array';
                debugData.htmlRawBytes = htmlArr;
                debugData.charset = charset;
            }

            const result = decodeBytes(htmlArr, charset);

            if (debugData) {
                debugData.htmlBeforeCid = result;
            }
            return result;
        } catch (error) {
            console.error('Failed to decode HTML from Uint8Array:', error);
        }
    }

    // Fallback to compressed RTF
    if (msgInfo.compressedRtf) {
        try {
            const compressedRtfArr = Uint8Array.from(Object.values(msgInfo.compressedRtf));
            const decompressedRtf = decompressRTF(compressedRtfArr);

            if (debugData) {
                debugData.htmlSource = 'rtf';
                debugData.compressedRtf = compressedRtfArr;
                debugData.decompressedRtf =
                    typeof decompressedRtf === 'string'
                        ? decompressedRtf
                        : decodeBytes(
                              decompressedRtf instanceof Uint8Array
                                  ? decompressedRtf
                                  : Uint8Array.from(Object.values(decompressedRtf)),
                              'latin1'
                          );
            }

            const result = convertRTFToHTML(decompressedRtf);

            if (debugData) {
                debugData.rtfToHtml = result;
                debugData.htmlBeforeCid = result;
            }

            return result;
        } catch (error) {
            console.error('Failed to decompress or convert RTF:', error);
        }
    }

    if (debugData) {
        debugData.htmlSource = 'fallback';
        debugData.htmlBeforeCid = emailBodyContent;
    }

    return emailBodyContent;
}

/**
 * Processes MSG attachments: extracts content, sanitizes filenames, converts to base64
 * @param {Object} msgReader - MsgReader instance
 * @param {Array} attachments - Array of attachment objects
 * @returns {Array} Processed attachments with base64 content
 */
function processMsgAttachments(msgReader, attachments) {
    return attachments.map((attachment) => {
        const attachmentData = msgReader.getAttachment(attachment);
        const contentUint8Array = attachmentData.content;
        const contentBuffer = Buffer.from(contentUint8Array);
        const contentBase64 = contentBuffer.toString('base64');

        return {
            ...attachment,
            fileName: resolveMsgAttachmentFilename(attachment, attachmentData.fileName),
            contentBase64: `data:${attachment.attachMimeTag};base64,${contentBase64}`
        };
    });
}

function buildExportMeta(rawHeaders, fallbackHeaders = {}) {
    const headerMap = rawHeaders ? parseEmailHeaders(rawHeaders) : {};

    return {
        rawHeaders: rawHeaders || '',
        headerMap: {
            ...fallbackHeaders,
            ...headerMap
        }
    };
}

/**
 * Extracts email data from a Microsoft Outlook MSG file
 * @param {ArrayBuffer} fileBuffer - The raw MSG file content
 * @param {Object} [options] - Options object
 * @param {boolean} [options.collectDebugData=false] - Whether to collect debug data
 * @returns {Object|null} Parsed email object with subject, sender, recipients, body, attachments
 */
export function extractMsg(fileBuffer, options = {}) {
    const { collectDebugData = false } = options;

    // Initialize debug data object if collecting
    const debugData = collectDebugData
        ? {
              fileType: 'msg',
              rawSize: fileBuffer.byteLength,
              rawBuffer: fileBuffer,
              timestamp: new Date().toISOString()
          }
        : null;

    const result = initializeMsgReader(fileBuffer);
    if (!result) return null;

    const { reader: msgReader, info: msgInfo } = result;
    const emailBodyContent = msgInfo.bodyHTML || msgInfo.body || '';

    // Store raw msgInfo for debug
    if (debugData) {
        // Create a clean copy without circular references
        debugData.msgInfoRaw = JSON.parse(
            JSON.stringify(msgInfo, (key, value) => {
                // Skip large binary data in JSON representation
                if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                    return `[Binary: ${value.byteLength || value.length} bytes]`;
                }
                if (key === 'content' && typeof value === 'object') {
                    return '[Attachment content]';
                }
                return value;
            })
        );
        debugData.plainText = emailBodyContent;
    }

    // Extract HTML content from various sources
    let emailBodyContentHTML = extractMsgHtmlContent(msgInfo, debugData);

    // Process attachments
    if (msgInfo.attachments && msgInfo.attachments.length > 0) {
        msgInfo.attachments = processMsgAttachments(msgReader, msgInfo.attachments);

        if (debugData) {
            debugData.htmlBeforeCid = emailBodyContentHTML;
        }

        emailBodyContentHTML = replaceCidReferences(emailBodyContentHTML, msgInfo.attachments);

        if (debugData) {
            debugData.htmlAfterCid = emailBodyContentHTML;
            debugData.attachmentCount = msgInfo.attachments.length;
            debugData.attachments = msgInfo.attachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.attachMimeTag,
                contentLength: a.contentLength,
                contentId: a.contentId || null
            }));
        }
    }

    // Store final sanitized HTML will be done by caller
    if (debugData) {
        debugData.htmlFinal = emailBodyContentHTML;
    }

    const emailData = {
        ...msgInfo,
        bodyContent: emailBodyContent,
        bodyContentHTML: emailBodyContentHTML,
        _exportMeta: buildExportMeta(msgInfo.headers, {
            ...(msgInfo.messageId ? { 'message-id': msgInfo.messageId } : {})
        })
    };

    // Attach debug data to result if collected
    if (debugData) {
        emailData._debugData = debugData;
    }

    return emailData;
}

/**
 * Converts decompressed RTF content to HTML
 * @param {string|Array|Uint8Array} rtfContent - Decompressed RTF content (may be array-like)
 * @returns {string} HTML representation of the RTF content
 */
function convertRTFToHTML(rtfContent) {
    // decompressRTF may return an array-like object, convert to string
    let rtfString = rtfContent;
    if (typeof rtfContent !== 'string') {
        const arr =
            rtfContent instanceof Uint8Array
                ? rtfContent
                : Uint8Array.from(Object.values(rtfContent));
        rtfString = decodeBytes(arr, 'latin1');
    }

    const result = deEncapsulateSync(rtfString, { decode: decodeBytes });
    return result.text;
}

/**
 * Handles single-part (non-multipart) email content
 * @param {string} bodyContent - Raw body content
 * @param {string} contentType - Content-Type header value
 * @param {string} contentTransferEncoding - Content-Transfer-Encoding header value
 * @param {string} contentDisposition - Content-Disposition header value
 * @param {string} charset - Character set for decoding
 * @returns {{bodyHTML: string, bodyText: string, attachments: Array}} Parsed content
 */
function handleSinglePartContent(
    bodyContent,
    contentType,
    contentTransferEncoding,
    contentDisposition,
    charset
) {
    const results = {
        bodyHTML: '',
        bodyText: '',
        attachments: []
    };
    const baseContentType = extractBaseMimeType(contentType);

    if (baseContentType.startsWith('application/') || baseContentType.startsWith('image/')) {
        // Handle as attachment
        const filename = extractFilename(contentDisposition, 'attachment', contentType);
        const mimeType = baseContentType;

        const base64Content =
            contentTransferEncoding.toLowerCase() === 'base64'
                ? bodyContent.replace(/\s/g, '')
                : binaryStringToBase64(bodyContent);

        results.attachments.push(createAttachment(filename, mimeType, base64Content));
    } else {
        // Handle as text content
        const decodedContent = decodeTransferEncoding(
            bodyContent,
            contentTransferEncoding,
            charset
        );

        if (baseContentType === 'text/html') {
            results.bodyHTML = decodedContent;
        } else {
            results.bodyText = decodedContent;
        }
    }

    return results;
}

/**
 * Extracts email data from an EML (RFC 5322) file
 * @param {ArrayBuffer} fileBuffer - The raw EML file content
 * @param {Object} [options] - Options object
 * @param {boolean} [options.collectDebugData=false] - Whether to collect debug data
 * @returns {Object} Parsed email object with subject, sender, recipients, body, attachments
 * @throws {Error} If the EML file cannot be parsed
 */
export function extractEml(fileBuffer, options = {}) {
    const { collectDebugData = false } = options;

    // Initialize debug data object if collecting
    const debugData = collectDebugData
        ? {
              fileType: 'eml',
              rawSize: fileBuffer.byteLength,
              rawBuffer: fileBuffer,
              timestamp: new Date().toISOString()
          }
        : null;

    try {
        // Convert ArrayBuffer to String
        const emailString = Buffer.from(fileBuffer).toString('binary');

        if (debugData) {
            debugData.rawString = emailString;
        }

        // Split email into headers and body
        const headerBodySplit = emailString.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!headerBodySplit) {
            throw new Error('Could not split email into headers and body');
        }

        const [, headersPart, bodyContent] = headerBodySplit;

        if (debugData) {
            debugData.headersRaw = headersPart;
            debugData.bodyRaw = bodyContent;
        }

        // Parse headers using helper function
        const headers = parseEmailHeaders(headersPart);

        if (debugData) {
            debugData.headersParsed = { ...headers };
        }

        // Extract content type info
        const contentType = headers['content-type'] || '';
        const boundary = extractBoundary(contentType);
        const detectedCharset = /charset\s*=/i.test(contentType)
            ? extractCharset(contentType)
            : DEFAULT_CHARSET;

        if (debugData) {
            debugData.contentType = contentType;
            debugData.charset = detectedCharset;
            debugData.isMultipart = !!boundary;
            debugData.boundary = boundary || null;
        }

        // Parse content based on whether it's multipart or single-part
        let results;
        let htmlBeforeCid = '';

        if (boundary) {
            // Multipart email
            results = parseMultipartContent(bodyContent, boundary, 0, detectedCharset);

            if (debugData) {
                debugData.mimeStructure = buildMimeStructure(bodyContent, boundary);
            }

            htmlBeforeCid = results.bodyHTML;

            // Replace CID references with base64 attachment data
            if (results.bodyHTML && results.attachments.length > 0) {
                if (debugData) {
                    debugData.htmlBeforeCid = results.bodyHTML;
                }
                results.bodyHTML = replaceCidReferences(results.bodyHTML, results.attachments);
                if (debugData) {
                    debugData.htmlAfterCid = results.bodyHTML;
                }
            }
        } else {
            // Single-part email
            results = handleSinglePartContent(
                bodyContent,
                contentType,
                headers['content-transfer-encoding'] || '',
                headers['content-disposition'] || '',
                detectedCharset
            );
            htmlBeforeCid = results.bodyHTML;
        }

        if (debugData) {
            debugData.plainText = results.bodyText;
            debugData.htmlFinal = results.bodyHTML || results.bodyText;
            debugData.attachmentCount = results.attachments.length;
            debugData.attachments = results.attachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.attachMimeTag,
                contentLength: a.contentLength,
                contentId: a.contentId || null
            }));
            if (!debugData.htmlBeforeCid) {
                debugData.htmlBeforeCid = htmlBeforeCid;
            }
        }

        // Extract sender and recipients
        const from = extractEmailAddresses(headers.from)[0] || { name: '', address: '' };
        const to = extractEmailAddresses(headers.to);
        const cc = extractEmailAddresses(headers.cc);
        const date = headers.date ? new Date(headers.date) : new Date();

        const emailData = {
            subject: decodeMIMEWord(headers.subject) || '',
            senderName: from.name || from.address,
            senderEmail: from.address,
            senderExchangeLegacyDn: from.exchangeLegacyDn || '',
            recipients: [
                ...to.map((r) => ({ ...r, recipType: 'to' })),
                ...cc.map((r) => ({ ...r, recipType: 'cc' }))
            ],
            messageDeliveryTime: date.toISOString(),
            bodyContent: results.bodyText,
            bodyContentHTML: results.bodyHTML || results.bodyText,
            attachments: results.attachments,
            _exportMeta: buildExportMeta(headersPart, headers)
        };

        // Attach debug data to result if collected
        if (debugData) {
            emailData._debugData = debugData;
        }

        return emailData;
    } catch (error) {
        console.error('Error parsing EML file:', error);
        throw error;
    }
}

/**
 * Builds a MIME structure tree for visualization
 * @param {string} content - Raw multipart content
 * @param {string} boundary - MIME boundary string
 * @param {number} [depth=0] - Current recursion depth
 * @returns {Object} MIME structure tree
 */
function buildMimeStructure(content, boundary, depth = 0) {
    const structure = {
        type: 'multipart',
        boundary: boundary,
        parts: []
    };

    const boundaryRegExp = new RegExp(`--${escapeRegex(boundary)}(?:--)?(?:\r?\n|\r|$)`, 'g');
    const parts = content.split(boundaryRegExp).filter((part) => part.trim());

    parts.forEach((part, index) => {
        const partMatch = part.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!partMatch) return;

        const [, partHeadersStr, partContent] = partMatch;
        const partHeaders = parseEmailHeaders(partHeadersStr);
        const contentType = partHeaders['content-type'] || 'text/plain';

        const partInfo = {
            index: index,
            contentType: extractBaseMimeType(contentType) || 'text/plain',
            headers: partHeaders,
            size: partContent.length
        };

        // Check for nested multipart
        const nestedBoundary = extractBoundary(contentType);
        if (nestedBoundary) {
            partInfo.nested = buildMimeStructure(partContent, nestedBoundary, depth + 1);
        }

        // Add disposition info
        if (partHeaders['content-disposition']) {
            partInfo.disposition = partHeaders['content-disposition'].split(';')[0].trim();
            const filename = extractFilename(partHeaders['content-disposition'], '', contentType);
            if (filename) {
                partInfo.filename = filename;
            }
        }

        // Add content-id if present
        if (partHeaders['content-id']) {
            partInfo.contentId = partHeaders['content-id'].replace(/[<>]/g, '');
        }

        structure.parts.push(partInfo);
    });

    return structure;
}
