const MsgReaderLib = require('@kenjiuno/msgreader');
const { decompressRTF } = require('@kenjiuno/decompressrtf');
const { deEncapsulateSync } = require('rtf-stream-parser');
const iconvLite = require('iconv-lite');

function extractMsg(fileBuffer) {
    let msgInfo = null;
    try {
        // Check if MsgReader exists as a function/constructor
        if (typeof MsgReaderLib === 'function') {
            const msgReader = new MsgReaderLib(fileBuffer);
            msgInfo = msgReader.getFileData();

        } else if (MsgReaderLib && typeof MsgReaderLib.default === 'function') {
            const msgReader = new MsgReaderLib.default(fileBuffer);
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
            if (attachment.mimeType && attachment.mimeType.startsWith('image/')) {
                console.log(`Image ${index}:`, attachment.content);
            } else {
                console.log(`Attachment ${index}:`, attachment);
            }
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
