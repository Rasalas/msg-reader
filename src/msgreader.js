const MsgReaderLib = require('@kenjiuno/msgreader');
const { decompressRTF } = require('@kenjiuno/decompressrtf');
const { deEncapsulateSync } = require('rtf-stream-parser');
const iconvLite = require('iconv-lite');

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
                emailBodyContentHTML = emailBodyContentHTML.replace(`cid:${attachment.pidContentId}`, base64String);
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

// Export the function for the browser
window.extractMsg = extractMsg;
