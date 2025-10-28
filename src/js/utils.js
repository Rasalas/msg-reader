const MsgReaderLib = require('@kenjiuno/msgreader');
const { decompressRTF } = require('@kenjiuno/decompressrtf');
const { deEncapsulateSync } = require('rtf-stream-parser');
const iconvLite = require('iconv-lite');
const md5 = require('md5');

// Export md5 for global use
window.md5 = md5;

// Function to decode MIME encoded-word format
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
            let charset = 'utf-8';
            if (msgInfo.internetCodepage === 936) {
                charset = 'gbk'; // Simplified Chinese
            } else if (msgInfo.internetCodepage === 950) {
                charset = 'big5'; // Traditional Chinese
            } else if (msgInfo.internetCodepage === 932) {
                charset = 'shift_jis'; // Japanese
            } else if (msgInfo.internetCodepage === 949) {
                charset = 'cp949'; // Korean
            } else if (msgInfo.internetCodepage === 928) {
                charset = 'gb2312'; // Simplified Chinese
            }
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
            console.log('Failed to decode HTML from Uint8Array:', err);
            emailBodyContentHTML = emailBodyContent || '';
        }
    } else {
        console.log('Missing compressedRtf in msgInfo:', msgInfo);
        emailBodyContentHTML = emailBodyContent || '';
    }

    // Extract images and attachments
    if (msgInfo.attachments && msgInfo.attachments.length > 0) {
        msgInfo.attachments.forEach((attachment, index) => {

            const contentUint8Array = msgReader.getAttachment(attachment).content;
            const contentBuffer = Buffer.from(contentUint8Array);
            const contentBase64 = contentBuffer.toString('base64');

            const base64String = `data:${attachment.attachMimeTag};base64,${contentBase64}`;

            if (attachment.attachMimeTag && attachment.attachMimeTag.startsWith('image/')) {
                emailBodyContentHTML = emailBodyContentHTML.replaceAll(`cid:${attachment.pidContentId}`, base64String);
            } else {
                emailBodyContentHTML = emailBodyContentHTML.replace(`href="cid:${attachment.pidContentId}"`, `href="${base64String}"`);
            }

            msgInfo.attachments[index].contentBase64 = base64String;
        });
    }

    return msgInfo ? {
        ...msgInfo,
        bodyContent: emailBodyContent,
        bodyContentHTML: emailBodyContentHTML
    } : null;
}

// Function for converting the decompressed RTF content to HTML
function convertRTFToHTML(rtfContent) {
    const result = deEncapsulateSync(rtfContent, { decode: iconvLite.decode });
    return result.text;
}

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
                        fileName: filename,
                        attachMimeTag: contentType.split(';')[0],
                        contentLength: Math.floor(base64Content.length * 0.75),
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
            // Now perform CID replacement after all attachments have been collected
            if (results.bodyHTML && results.attachments.length > 0) {
                // Debug: Check what CID references exist in HTML BEFORE replacement

                // First pass: replace with actual attachment content
                results.attachments.forEach(attachment => {
                    if (attachment.contentId) {
                        // Also try without stripping < > in case Content-ID format varies
                        const cidIdWithoutBrackets = attachment.contentId.replace(/[<>]/g, '');
                        const cidPatterns = [`src=["']?cid:${attachment.contentId}["']?`, `src=["']?CID:${attachment.contentId}["']?`, `src=["']?cid:${cidIdWithoutBrackets}["']?`, `src=["']?CID:${cidIdWithoutBrackets}["']?`, `src=["']?cid:${attachment.contentId}:1["']?`, `src=["']?${attachment.contentId}["']?`];

                        cidPatterns.forEach(pattern => {
                            results.bodyHTML = results.bodyHTML.replace(new RegExp(pattern, 'gi'), `src="${attachment.contentBase64}"`);
                        });
                    }
                });

                // Second pass: try to match images by Content-ID more broadly
                results.attachments.forEach(attachment => {
                    if (attachment.contentId && attachment.attachMimeTag && attachment.attachMimeTag.startsWith('image/')) {
                        // Try various Content-ID formats
                        const rawContentId = attachment.contentId;
                        const cleanContentId = rawContentId.replace(/[<>]/g, '').trim();

                        // Match cid: followed by any variation of the ID
                        const broadPattern = new RegExp(`src=["']?cid:${cleanContentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"'\\s>]*["']?`, 'gi');

                        results.bodyHTML = results.bodyHTML.replace(broadPattern, `src="${attachment.contentBase64}"`);
                    }
                });

                // Replace remaining cid: references only if no matching attachment was found
                results.bodyHTML = results.bodyHTML.replace(/src=["']?cid:[^"'\s>]+["']?/gi, 'src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+"');
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
                    fileName: filename,
                    attachMimeTag: contentType.split(';')[0],
                    contentLength: Math.floor(base64Content.length * 0.75),
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
