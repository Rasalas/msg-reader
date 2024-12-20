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

    let emailBodyContent = msgInfo.bodyHTML || msgInfo.body;
    let emailBodyContentHTML = '';

    const decompressedRtf = decompressRTF(Uint8Array.from(Object.values(msgInfo.compressedRtf)));
    emailBodyContentHTML = convertRTFToHTML(decompressedRtf);

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

    return {
        ...msgInfo,
        bodyContent: emailBodyContent,
        bodyContentHTML: emailBodyContentHTML
    };
}

// Function for converting the decompressed RTF content to HTML
function convertRTFToHTML(rtfContent) {
    const result = deEncapsulateSync(rtfContent, { decode: iconvLite.decode });
    return result.text;
}

function extractEml(fileBuffer) {
    try {
        // Convert ArrayBuffer to String
        const decoder = new TextDecoder('utf-8');
        const emailString = decoder.decode(fileBuffer);
        
        // Split email into headers and body
        const [headersPart, ...bodyParts] = emailString.split('\n\n');
        const bodyContent = bodyParts.join('\n\n');

        // Parse headers
        const headers = {};
        headersPart.split('\n').forEach(line => {
            if (line.startsWith(' ') || line.startsWith('\t')) {
                // This is a continuation of the previous header
                const lastHeader = Object.keys(headers).pop();
                if (lastHeader) {
                    headers[lastHeader] += ' ' + line.trim();
                }
            } else {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length) {
                    headers[key.toLowerCase().trim()] = valueParts.join(':').trim();
                }
            }
        });

        // Extract email addresses
        const extractEmails = (str) => {
            if (!str) return [];
            const matches = str.match(/<([^>]+)>|([^\s,]+@[^\s,]+)/g) || [];
            return matches.map(match => {
                const email = match.replace(/[<>]/g, '').trim();
                const name = str.split(email)[0].replace(/['"<>]/g, '').trim();
                return { name: name || email, address: email };
            });
        };

        // Parse boundary for multipart messages
        let boundary;
        const contentType = headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
        if (boundaryMatch) {
            boundary = boundaryMatch[1];
        }

        // Parse multipart content
        let bodyHTML = '';
        let bodyText = '';
        const attachments = [];

        if (boundary) {
            const parts = bodyContent.split('--' + boundary);
            parts.forEach(part => {
                if (part.trim() && !part.includes('--')) {
                    const [partHeaders, ...partContent] = part.trim().split('\n\n');
                    const content = partContent.join('\n\n');
                    
                    const contentTypeMatch = partHeaders.match(/Content-Type:\s*([^;\n]+)/i);
                    const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : '';
                    
                    if (contentType === 'text/html') {
                        bodyHTML = content;
                    } else if (contentType === 'text/plain') {
                        bodyText = content;
                    } else if (contentType.startsWith('image/') || contentType.startsWith('application/')) {
                        const filenameMatch = partHeaders.match(/filename="?([^";\n]+)"?/i);
                        const filename = filenameMatch ? filenameMatch[1] : 'attachment';
                        
                        // Find the base64 content
                        const encodingMatch = partHeaders.match(/Content-Transfer-Encoding:\s*([^\n]+)/i);
                        if (encodingMatch && encodingMatch[1].trim().toLowerCase() === 'base64') {
                            const base64Content = content.replace(/\s/g, '');
                            attachments.push({
                                fileName: filename,
                                attachMimeTag: contentType,
                                contentLength: base64Content.length * 0.75, // Approximate original size
                                contentBase64: `data:${contentType};base64,${base64Content}`
                            });
                        }
                    }
                }
            });
        } else {
            // Single part message
            if (contentType.includes('text/html')) {
                bodyHTML = bodyContent;
            } else {
                bodyText = bodyContent;
            }
        }

        const from = extractEmails(headers.from)[0] || { name: '', address: '' };
        const to = extractEmails(headers.to);
        const cc = extractEmails(headers.cc);
        const date = headers.date ? new Date(headers.date) : new Date();

        // Format recipients
        const recipients = [
            ...to.map(r => ({ ...r, recipType: 'to' })),
            ...cc.map(r => ({ ...r, recipType: 'cc' }))
        ];

        return {
            subject: decodeMIMEWord(headers.subject) || '',
            senderName: from.name || from.address,
            senderEmail: from.address,
            recipients,
            messageDeliveryTime: date.toISOString(),
            bodyContent: bodyText,
            bodyContentHTML: bodyHTML || bodyText,
            attachments
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