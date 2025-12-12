const MsgReaderLib = require('@kenjiuno/msgreader');
const { decompressRTF } = require('@kenjiuno/decompressrtf');
const { deEncapsulateSync } = require('rtf-stream-parser');
const iconvLite = require('iconv-lite');
const md5 = require('md5');

const { getCharsetFromCodepage } = require('./helpers');
const { BASE64_SIZE_FACTOR } = require('./constants');
const { replaceCidReferences } = require('./cidReplacer');

// Export md5 for global use
window.md5 = md5;

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
        .replace(/^[A-Za-z]:[\\\/]/g, '')  // Remove Windows drive letters (C:\, D:/)
        // Remove control characters
        .replace(/[\x00-\x1f\x7f]/g, '')   // Remove control characters (including null)
        .replace(/\ufeff/g, '')            // Remove UTF-16 BOM
        .replace(/\ufffd/g, '')            // Remove replacement character
        // Replace Windows reserved characters
        .replace(/[<>:"|?*]/g, '_')        // Replace chars invalid in Windows filenames
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
 * Extracts email data from a Microsoft Outlook MSG file
 * @param {ArrayBuffer} fileBuffer - The raw MSG file content
 * @returns {Object|null} Parsed email object with subject, sender, recipients, body, attachments
 */
function extractMsg(fileBuffer) {
    let msgInfo = null;
    let msgReader = null;
    try {
        // Check if MsgReader exists as a function/constructor
        if (typeof MsgReaderLib === 'function') {
            msgReader = new MsgReaderLib(fileBuffer);
            msgInfo = msgReader.getFileData();

        } else if (MsgReaderLib && typeof MsgReaderLib.default === 'function') {
            msgReader = new MsgReaderLib.default(fileBuffer);
            msgInfo = msgReader.getFileData();

        } else {
            console.error("MsgReader constructor could not be found.");
        }
    } catch (error) {
        console.error("Error creating a MsgReader instance:", error);
    }

    let emailBodyContent = msgInfo && (msgInfo.bodyHTML || msgInfo.body);
    let emailBodyContentHTML = '';

    if (msgInfo && msgInfo.compressedRtf) {
        try {
            const decompressedRtf = decompressRTF(Uint8Array.from(Object.values(msgInfo.compressedRtf)));
            emailBodyContentHTML = convertRTFToHTML(decompressedRtf);
        } catch (err) {
            console.error('Failed to decompress or convert RTF:', err);
            emailBodyContentHTML = emailBodyContent || '';
        }
    } else if (msgInfo && msgInfo.html && typeof msgInfo.html === 'object') {
        // Try to decode HTML from Uint8Array
        try {
            let htmlArr;
            if (Array.isArray(msgInfo.html)) {
                htmlArr = Uint8Array.from(msgInfo.html);
            } else {
                // msgInfo.html is likely an object with numeric keys
                htmlArr = Uint8Array.from(Object.values(msgInfo.html));
            }
            // Try TextDecoder first, fallback to Buffer
            let htmlStr = '';
            const charset = getCharsetFromCodepage(msgInfo.internetCodepage);
            if (typeof TextDecoder !== 'undefined') {
                try {
                    htmlStr = new TextDecoder(charset).decode(htmlArr);
                } catch (e) {
                    // Fallback for charsets not supported by TextDecoder
                    htmlStr = iconvLite.decode(Buffer.from(htmlArr), charset);
                }
            } else {
                // Node fallback: support broader set of encodings via iconv-lite
                htmlStr = iconvLite.decode(Buffer.from(htmlArr), charset);
            }
            emailBodyContentHTML = htmlStr;
        } catch (err) {
            console.error('Failed to decode HTML from Uint8Array:', err);
            emailBodyContentHTML = emailBodyContent || '';
        }
    } else {
        // No RTF or HTML content found, fallback to plain text
        emailBodyContentHTML = emailBodyContent || '';
    }

    // Extract images and attachments
    if (msgInfo.attachments && msgInfo.attachments.length > 0) {
        // First pass: collect all attachments with their base64 data
        msgInfo.attachments.forEach((attachment, index) => {
            const contentUint8Array = msgReader.getAttachment(attachment).content;
            const contentBuffer = Buffer.from(contentUint8Array);
            const contentBase64 = contentBuffer.toString('base64');

            const base64String = `data:${attachment.attachMimeTag};base64,${contentBase64}`;
            msgInfo.attachments[index].contentBase64 = base64String;
            // Sanitize filename to remove null terminators and control characters (fixes #14)
            msgInfo.attachments[index].fileName = sanitizeFilename(attachment.fileName);
        });

        // Replace CID references in HTML with base64 attachment data
        emailBodyContentHTML = replaceCidReferences(emailBodyContentHTML, msgInfo.attachments);
    }

    return msgInfo ? {
        ...msgInfo,
        bodyContent: emailBodyContent,
        bodyContentHTML: emailBodyContentHTML
    } : null;
}

/**
 * Converts decompressed RTF content to HTML
 * @param {string} rtfContent - Decompressed RTF content
 * @returns {string} HTML representation of the RTF content
 */
function convertRTFToHTML(rtfContent) {
    const result = deEncapsulateSync(rtfContent, { decode: iconvLite.decode });
    return result.text;
}

/**
 * Extracts email data from an EML (RFC 5322) file
 * @param {ArrayBuffer} fileBuffer - The raw EML file content
 * @returns {Object} Parsed email object with subject, sender, recipients, body, attachments
 * @throws {Error} If the EML file cannot be parsed
 */
function extractEml(fileBuffer) {
    try {
        // Convert ArrayBuffer to String
        const emailString = Buffer.from(fileBuffer).toString('binary');

        // Helper function for parsing multipart content
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

                const [_, partHeaders, partContent] = partMatch;

                // Parse part headers
                const partHeadersObj = {};
                let currentHeader = '';
                partHeaders.split(/\r?\n/).forEach(line => {
                    if (line.match(/^\s+/)) {
                        if (currentHeader) {
                            partHeadersObj[currentHeader] += ' ' + line.trim();
                        }
                    } else {
                        const match = line.match(/^([\w-]+):\s*(.*)$/i);
                        if (match) {
                            currentHeader = match[1].toLowerCase().trim();
                            partHeadersObj[currentHeader] = match[2].trim();
                        }
                    }
                });

                const contentType = partHeadersObj['content-type'] || '';
                const contentTransferEncoding = partHeadersObj['content-transfer-encoding'] || '';
                const contentDisposition = partHeadersObj['content-disposition'] || '';
                const contentId = partHeadersObj['content-id'] || '';

                // Extract charset from part's content-type
                const partCharsetMatch = contentType.match(/charset="?([^";\s]+)"?/i);
                const partCharset = partCharsetMatch ? partCharsetMatch[1] : defaultCharset;

                // Check for nested multipart
                const nestedBoundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
                if (nestedBoundaryMatch) {
                    const nestedResults = parseMultipartContent(partContent, nestedBoundaryMatch[1], depth + 1, partCharset);
                    // Keep existing content and add new
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

                // Decode content
                let decodedContent = partContent.trim();
                if (contentTransferEncoding.toLowerCase() === 'base64') {
                    if (contentType.startsWith('text/')) {
                        try {
                            const decodedBytes = Buffer.from(partContent.replace(/\s/g, ''), 'base64');
                            decodedContent = iconvLite.decode(decodedBytes, partCharset);
                        } catch (error) {
                            console.error('Error decoding base64 content:', error);
                        }
                    }
                } else if (contentTransferEncoding.toLowerCase() === 'quoted-printable') {
                    // Decode quoted-printable hex codes first
                    const qpContent = partContent.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                    // Then decode with proper charset
                    const decodedBytes = Buffer.from(qpContent, 'binary');
                    decodedContent = iconvLite.decode(decodedBytes, partCharset);
                }

                // Handle content types
                if (contentType.startsWith('text/html')) {
                    // Add HTML content
                    results.bodyHTML = results.bodyHTML ? results.bodyHTML + '\n' + decodedContent : decodedContent;
                } else if (contentType.startsWith('text/plain')) {
                    // Add text content
                    results.bodyText = results.bodyText ? results.bodyText + '\n' + decodedContent : decodedContent;
                } else if (contentType.startsWith('image/') || contentType.startsWith('application/')) {
                    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
                    const filename = filenameMatch ? filenameMatch[1] : 'attachment';

                    let base64Content;
                    if (contentTransferEncoding.toLowerCase() === 'base64') {
                        base64Content = partContent.replace(/\s/g, '');
                    } else {
                        // Convert binary string to base64
                        base64Content = Buffer.from(partContent, 'binary').toString('base64');
                    }

                    const attachment = {
                        fileName: sanitizeFilename(filename),
                        attachMimeTag: contentType.split(';')[0],
                        contentLength: Math.floor(base64Content.length * BASE64_SIZE_FACTOR),
                        contentBase64: `data:${contentType.split(';')[0]};base64,${base64Content}`
                    };

                    // Extract Content-ID in various ways
                    if (contentId) {
                        // Remove < and > and everything except the actual ID part
                        attachment.contentId = contentId.replace(/[<>]/g, '').trim();
                    } else {
                        // Try to extract Content-ID from Content-Location if Content-ID is missing
                        const contentLocation = partHeadersObj['content-location'] || '';
                        if (contentLocation) {
                            attachment.contentId = contentLocation.replace(/[<>]/g, '').trim();
                        }
                    }

                    results.attachments.push(attachment);
                }
            });

            return results;
        }

        // Split email into headers and body
        const headerBodySplit = emailString.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
        if (!headerBodySplit) {
            throw new Error('Could not split email into headers and body');
        }

        const [_, headersPart, bodyContent] = headerBodySplit;

        // Parse headers
        const headers = {};
        let currentHeader = '';
        headersPart.split(/\r?\n/).forEach(line => {
            if (line.match(/^\s+/)) {
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

        // Extract email addresses
        const extractEmails = (str) => {
            if (!str) return [];
            const matches = str.match(/(?:"([^"]*)")?\s*(?:<([^>]+)>|([^\s,]+@[^\s,]+))/g) || [];
            return matches.map(match => {
                const parts = match.match(/(?:"([^"]*)")?\s*(?:<([^>]+)>|([^\s,]+@[^\s,]+))/);
                const email = parts[2] || parts[3];
                const name = parts[1] || email;
                return { name: decodeMIMEWord(name), address: email };
            });
        };

        let results;
        const contentType = headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);

        // Extract charset from content-type
        const contentTypeCharsetMatch = contentType.match(/charset="?([^";\s]+)"?/i);
        const detectedCharset = contentTypeCharsetMatch ? contentTypeCharsetMatch[1] : 'utf-8';

        if (boundaryMatch) {
            results = parseMultipartContent(bodyContent, boundaryMatch[1], 0, detectedCharset);
            // Replace CID references with base64 attachment data
            if (results.bodyHTML && results.attachments.length > 0) {
                results.bodyHTML = replaceCidReferences(results.bodyHTML, results.attachments);
            }
        } else {
            // Single part handling
            const contentTransferEncoding = headers['content-transfer-encoding'] || '';
            const contentDisposition = headers['content-disposition'] || '';

            results = {
                bodyHTML: '',
                bodyText: '',
                attachments: []
            };

            if (contentType.startsWith('application/') || contentType.startsWith('image/')) {
                const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
                const filename = filenameMatch ? filenameMatch[1] : 'attachment';

                const base64Content = contentTransferEncoding.toLowerCase() === 'base64'
                    ? bodyContent.replace(/\s/g, '')
                    : Buffer.from(bodyContent).toString('base64');

                results.attachments.push({
                    fileName: sanitizeFilename(filename),
                    attachMimeTag: contentType.split(';')[0],
                    contentLength: Math.floor(base64Content.length * BASE64_SIZE_FACTOR),
                    contentBase64: `data:${contentType.split(';')[0]};base64,${base64Content}`
                });
            } else {
                let content = bodyContent;
                if (contentTransferEncoding.toLowerCase() === 'base64') {
                    try {
                        content = Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8');
                    } catch (error) {
                        console.error('Error decoding base64 content:', error);
                    }
                } else if (contentTransferEncoding.toLowerCase() === 'quoted-printable') {
                    content = content.replace(/=\r?\n/g, '')
                        .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
                            String.fromCharCode(parseInt(hex, 16))
                        );
                }

                if (contentType.includes('text/html')) {
                    results.bodyHTML = content;
                } else {
                    results.bodyText = content;
                }
            }
        }

        const from = extractEmails(headers.from)[0] || { name: '', address: '' };
        const to = extractEmails(headers.to);
        const cc = extractEmails(headers.cc);
        const date = headers.date ? new Date(headers.date) : new Date();

        return {
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
    } catch (error) {
        console.error('Error parsing EML file:', error);
        throw error;
    }
}

module.exports = {
    extractMsg,
    extractEml
};
