const MsgReaderLib = require('@kenjiuno/msgreader');
const { decompressRTF } = require('@kenjiuno/decompressrtf');
const { RTFToHTML } = require('rtf-stream-parser');
const { deEncapsulateSync } = require('rtf-stream-parser');
const iconvLite  = require('iconv-lite');

function extractMsg(fileBuffer) {
    let msgInfo = null;
    try {
        // Prüfe, ob MsgReader als Funktion/Konstruktor existiert
        if (typeof MsgReaderLib === 'function') {
            const msgReader = new MsgReaderLib(fileBuffer);
            msgInfo = msgReader.getFileData();
            
        } else if (MsgReaderLib && typeof MsgReaderLib.default === 'function') {
            const msgReader = new MsgReaderLib.default(fileBuffer);
            msgInfo = msgReader.getFileData();
            
        } else {
            console.error("MsgReader-Konstruktor konnte nicht gefunden werden.");
        }
    } catch (error) {
        console.error("Fehler beim Erstellen einer MsgReader-Instanz:", error);
    }

    let emailBodyContent = msgInfo.bodyHTML || msgInfo.body;
    let emailBodyContentHTML = '';

    // Falls der HTML-Body fehlt und compressedRtf vorhanden ist, dekomprimiere und konvertiere
        const decompressedRtf = decompressRTF(Uint8Array.from(Object.values(msgInfo.compressedRtf)));
        emailBodyContentHTML = convertRTFToHTML(decompressedRtf);
    

    // Bilder und Anhänge extrahieren
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

// Funktion zum Konvertieren des dekomprimierten RTF-Inhalts zu HTML
function convertRTFToHTML(rtfContent) {
    const result = deEncapsulateSync(rtfContent, {decode: iconvLite.decode});
    return result.text;
}

// Exportiere die Funktion für den Browser
window.extractMsg = extractMsg;
