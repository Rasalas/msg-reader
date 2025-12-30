import MsgReaderLib from '@kenjiuno/msgreader';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import { deEncapsulateSync } from 'rtf-stream-parser';
import iconvLite from 'iconv-lite';
import { Buffer } from 'buffer';

import { getCharsetFromCodepage } from './helpers.js';
import { BASE64_SIZE_FACTOR } from './constants.js';
import { replaceCidReferences } from './cidReplacer.js';

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
        .replace(/\.\.\//g, '')            // Remove ../
        .replace(/\.\.\\/g, '')            // Remove ..\
        .replace(/^\/+/g, '')              // Remove leading forward slashes
        .replace(/^[A-Za-z]:[\\/]/g, '')  // Remove Windows drive letters (C:\, D:/)
        // Remove control characters
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, '')   // Remove control characters (including null)
        .replace(/\ufeff/g, '')            // Remove UTF-16 BOM
        .replace(/\ufffd/g, '')            // Remove replacement character
        // Replace Windows reserved characters
        .replace(/[<>:"|?*]/g, '_')        // Replace chars invalid in Windows filenames
        // Remove trailing encoding artifacts from MIME (e.g., _= or trailing =)
        .replace(/[_=]+$/, '')
        .trim();

    // Extract only the filename (remove any remaining path components)
    sanitized = sanitized.split('/').pop().split('\\').pop();

    // Ensure we have a valid filename
    return sanitized || 'attachment';
}

/**
 * Decodes MIME encoded-word format strings (RFC 2047)
 * Handles both Base64 (B) and Quoted-Printable (Q) encodings
 * @param {string} str - String containing encoded words (e.g., "=?UTF-8?B?SGVsbG8=?=")
 * @returns {string} Decoded string
 */
function decodeMIMEWord(str) {
    if (!str) return '';

    // Replace all encoded words in the string
    return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (match, charset, encoding, text) => {
        try {
            if (encoding.toUpperCase() === 'B') {
                // Base64 encoded
                const bytes = atob(text);
                return iconvLite.decode(Buffer.from(bytes, 'binary'), charset);
            } else if (encoding.toUpperCase() === 'Q') {
                // Quoted-printable encoded
                text = text.replace(/_/g, ' ');
                const bytes = text.replace(/=([0-9A-F]{2})/gi, (_, hex) =>
                    String.fromCharCode(parseInt(hex, 16))
                );
                return iconvLite.decode(Buffer.from(bytes, 'binary'), charset);
            }
        } catch (error) {
            console.error('Error decoding MIME word:', error);
        }
        return match; // Return original string if decoding fails
    });
}

/**
 * Extracts filename from Content-Disposition header
 * Handles RFC 2231 encoding and MIME encoded-words
 * @param {string} contentDisposition - Content-Disposition header value
 * @param {string} [defaultName='attachment'] - Default filename if none found
 * @returns {string} Extracted filename
 */
function extractFilename(contentDisposition, defaultName = 'attachment') {
    if (!contentDisposition) return defaultName;

    // Try RFC 2231 format first: filename*=UTF-8''encoded_value
    const rfc2231Match = contentDisposition.match(/filename\*=([^']*)'([^']*)'([^;\s]+)/i);
    if (rfc2231Match) {
        const encoded = rfc2231Match[3];
        try {
            // Decode percent-encoded characters
            return decodeURIComponent(encoded);
        } catch (error) {
            console.error('Error decoding RFC 2231 filename:', error);
        }
    }

    // Try standard filename with potential MIME encoding
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    if (filenameMatch) {
        let filename = filenameMatch[1];
        // Decode MIME words if present
        filename = decodeMIMEWord(filename);
        // Remove trailing artifacts from incomplete encoding (e.g., _= or trailing =)
        filename = filename.replace(/[_=]+$/, '');
        return filename;
    }

    return defaultName;
}

/**
 * Parses email headers from a header string
 * Handles multi-line headers (folded headers)
 * @param {string} headerString - Raw header string
 * @returns {Object} Parsed headers as key-value pairs (keys are lowercase)
 */
function parseEmailHeaders(headerString) {
    const headers = {};
    let currentHeader = '';

    headerString.split(/\r?\n/).forEach(line => {
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
                const decodedBytes = Buffer.from(content.replace(/\s/g, ''), 'base64');
                return iconvLite.decode(decodedBytes, charset);
            } catch (error) {
                console.error('Error decoding base64 content:', error);
                return content;
            }
        }
        return content; // Return raw for non-text
    } else if (normalizedEncoding === 'quoted-printable') {
        // Decode quoted-printable: remove soft line breaks, then decode hex codes
        const qpContent = content
            .replace(/=\r?\n/g, '')
            .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const decodedBytes = Buffer.from(qpContent, 'binary');
        return iconvLite.decode(decodedBytes, charset);
    }

    return content.trim();
}

/**
 * Extracts email addresses from a header value
 * @param {string} str - Header value containing email addresses
 * @returns {Array<{name: string, address: string}>} Array of email objects
 */
function extractEmailAddresses(str) {
    if (!str) return [];

    const matches = str.match(/(?:"([^"]*)")?\s*(?:<([^>]+)>|([^\s,]+@[^\s,]+))/g) || [];
    return matches.map(match => {
        const parts = match.match(/(?:"([^"]*)")?\s*(?:<([^>]+)>|([^\s,]+@[^\s,]+))/);
        const email = parts[2] || parts[3];
        const name = parts[1] || email;
        return { name: decodeMIMEWord(name), address: email };
    });
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
function parseMultipartContent(content, boundary, depth = 0, defaultCharset = 'utf-8') {
    const results = {
        bodyHTML: '',
        bodyText: '',
        attachments: []
    };

    const boundaryRegExp = new RegExp(`--${boundary}(?:--)?(?:\r?\n|\r|$)`, 'g');
    const parts = content.split(boundaryRegExp).filter(part => part.trim());

    parts.forEach(part => {
        const partMatch = part.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!partMatch) return;

        const [, partHeadersStr, partContent] = partMatch;
        const partHeaders = parseEmailHeaders(partHeadersStr);

        const contentType = partHeaders['content-type'] || '';
        const contentTransferEncoding = partHeaders['content-transfer-encoding'] || '';
        const contentDisposition = partHeaders['content-disposition'] || '';
        const contentId = partHeaders['content-id'] || '';

        // Extract charset from part's content-type
        const partCharsetMatch = contentType.match(/charset="?([^";\s]+)"?/i);
        const partCharset = partCharsetMatch ? partCharsetMatch[1] : defaultCharset;

        // Check for nested multipart
        const nestedBoundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
        if (nestedBoundaryMatch) {
            const nestedResults = parseMultipartContent(
                partContent,
                nestedBoundaryMatch[1],
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

        // Decode and handle content based on type
        if (contentType.startsWith('text/html')) {
            const decodedContent = decodeTransferEncoding(
                partContent.trim(),
                contentTransferEncoding,
                partCharset
            );
            results.bodyHTML = results.bodyHTML
                ? results.bodyHTML + '\n' + decodedContent
                : decodedContent;
        } else if (contentType.startsWith('text/plain')) {
            const decodedContent = decodeTransferEncoding(
                partContent.trim(),
                contentTransferEncoding,
                partCharset
            );
            results.bodyText = results.bodyText
                ? results.bodyText + '\n' + decodedContent
                : decodedContent;
        } else if (contentType.startsWith('image/') || contentType.startsWith('application/')) {
            const filename = extractFilename(contentDisposition);
            const mimeType = contentType.split(';')[0];

            let base64Content;
            if (contentTransferEncoding.toLowerCase() === 'base64') {
                base64Content = partContent.replace(/\s/g, '');
            } else {
                base64Content = Buffer.from(partContent, 'binary').toString('base64');
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
        } else if (contentType.startsWith('message/')) {
            // Handle nested email attachments (e.g., message/rfc822)
            const filename = extractFilename(contentDisposition, 'embedded_message.eml');
            const mimeType = contentType.split(';')[0];

            // Encode the entire part content as base64
            let base64Content;
            if (contentTransferEncoding.toLowerCase() === 'base64') {
                base64Content = partContent.replace(/\s/g, '');
            } else {
                // For 7bit/8bit/quoted-printable, encode to base64
                base64Content = btoa(unescape(encodeURIComponent(partContent)));
            }

            const attachment = createAttachment(filename, mimeType, base64Content, contentId);
            results.attachments.push(attachment);
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

            // Try TextDecoder first, fallback to iconv-lite
            let result;
            if (typeof TextDecoder !== 'undefined') {
                try {
                    result = new TextDecoder(charset).decode(htmlArr);
                } catch {
                    result = iconvLite.decode(Buffer.from(htmlArr), charset);
                }
            } else {
                result = iconvLite.decode(Buffer.from(htmlArr), charset);
            }

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
                debugData.decompressedRtf = typeof decompressedRtf === 'string'
                    ? decompressedRtf
                    : new TextDecoder('latin1').decode(
                        decompressedRtf instanceof Uint8Array
                            ? decompressedRtf
                            : Uint8Array.from(Object.values(decompressedRtf))
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
    return attachments.map(attachment => {
        const contentUint8Array = msgReader.getAttachment(attachment).content;
        const contentBuffer = Buffer.from(contentUint8Array);
        const contentBase64 = contentBuffer.toString('base64');

        return {
            ...attachment,
            fileName: sanitizeFilename(attachment.fileName),
            contentBase64: `data:${attachment.attachMimeTag};base64,${contentBase64}`
        };
    });
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
    const debugData = collectDebugData ? {
        fileType: 'msg',
        rawSize: fileBuffer.byteLength,
        rawBuffer: fileBuffer,
        timestamp: new Date().toISOString()
    } : null;

    const result = initializeMsgReader(fileBuffer);
    if (!result) return null;

    const { reader: msgReader, info: msgInfo } = result;
    const emailBodyContent = msgInfo.bodyHTML || msgInfo.body || '';

    // Store raw msgInfo for debug
    if (debugData) {
        // Create a clean copy without circular references
        debugData.msgInfoRaw = JSON.parse(JSON.stringify(msgInfo, (key, value) => {
            // Skip large binary data in JSON representation
            if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                return `[Binary: ${value.byteLength || value.length} bytes]`;
            }
            if (key === 'content' && typeof value === 'object') {
                return '[Attachment content]';
            }
            return value;
        }));
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
            debugData.attachments = msgInfo.attachments.map(a => ({
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
        bodyContentHTML: emailBodyContentHTML
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
        const arr = rtfContent instanceof Uint8Array
            ? rtfContent
            : Uint8Array.from(Object.values(rtfContent));
        rtfString = new TextDecoder('latin1').decode(arr);
    }

    const result = deEncapsulateSync(rtfString, { decode: iconvLite.decode });
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
function handleSinglePartContent(bodyContent, contentType, contentTransferEncoding, contentDisposition, charset) {
    const results = {
        bodyHTML: '',
        bodyText: '',
        attachments: []
    };

    if (contentType.startsWith('application/') || contentType.startsWith('image/')) {
        // Handle as attachment
        const filename = extractFilename(contentDisposition);
        const mimeType = contentType.split(';')[0];

        const base64Content = contentTransferEncoding.toLowerCase() === 'base64'
            ? bodyContent.replace(/\s/g, '')
            : Buffer.from(bodyContent).toString('base64');

        results.attachments.push(createAttachment(filename, mimeType, base64Content));
    } else {
        // Handle as text content
        const decodedContent = decodeTransferEncoding(bodyContent, contentTransferEncoding, charset);

        if (contentType.includes('text/html')) {
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
    const debugData = collectDebugData ? {
        fileType: 'eml',
        rawSize: fileBuffer.byteLength,
        rawBuffer: fileBuffer,
        timestamp: new Date().toISOString()
    } : null;

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
        const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
        const charsetMatch = contentType.match(/charset="?([^";\s]+)"?/i);
        const detectedCharset = charsetMatch ? charsetMatch[1] : 'utf-8';

        if (debugData) {
            debugData.contentType = contentType;
            debugData.charset = detectedCharset;
            debugData.isMultipart = !!boundaryMatch;
            debugData.boundary = boundaryMatch ? boundaryMatch[1] : null;
        }

        // Parse content based on whether it's multipart or single-part
        let results;
        let htmlBeforeCid = '';

        if (boundaryMatch) {
            // Multipart email
            results = parseMultipartContent(bodyContent, boundaryMatch[1], 0, detectedCharset);

            if (debugData) {
                debugData.mimeStructure = buildMimeStructure(bodyContent, boundaryMatch[1]);
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
            debugData.attachments = results.attachments.map(a => ({
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
            recipients: [
                ...to.map(r => ({ ...r, recipType: 'to' })),
                ...cc.map(r => ({ ...r, recipType: 'cc' }))
            ],
            messageDeliveryTime: date.toISOString(),
            bodyContent: results.bodyText,
            bodyContentHTML: results.bodyHTML || results.bodyText,
            attachments: results.attachments
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

    const boundaryRegExp = new RegExp(`--${boundary}(?:--)?(?:\r?\n|\r|$)`, 'g');
    const parts = content.split(boundaryRegExp).filter(part => part.trim());

    parts.forEach((part, index) => {
        const partMatch = part.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!partMatch) return;

        const [, partHeadersStr, partContent] = partMatch;
        const partHeaders = parseEmailHeaders(partHeadersStr);
        const contentType = partHeaders['content-type'] || 'text/plain';

        const partInfo = {
            index: index,
            contentType: contentType.split(';')[0].trim(),
            headers: partHeaders,
            size: partContent.length
        };

        // Check for nested multipart
        const nestedBoundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
        if (nestedBoundaryMatch) {
            partInfo.nested = buildMimeStructure(partContent, nestedBoundaryMatch[1], depth + 1);
        }

        // Add disposition info
        if (partHeaders['content-disposition']) {
            partInfo.disposition = partHeaders['content-disposition'].split(';')[0].trim();
            const filenameMatch = partHeaders['content-disposition'].match(/filename="?([^";\n]+)"?/i);
            if (filenameMatch) {
                partInfo.filename = filenameMatch[1];
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
