const MsgReaderLib = require('@kenjiuno/msgreader');

// Prüfe, welche Objekte in MsgReaderLib verfügbar sind
console.log("MsgReaderLib:", MsgReaderLib);

// Versuche, eine Instanz von MsgReader zu erstellen und zu testen
function extractMsg(fileBuffer) {
    try {
        // Prüfe, ob MsgReader als Funktion/Konstruktor existiert
        if (typeof MsgReaderLib === 'function') {
            const msgReader = new MsgReaderLib(fileBuffer);
            const msgInfo = msgReader.getFileData();
            return msgInfo;
        } else if (MsgReaderLib && typeof MsgReaderLib.default === 'function') {
            const msgReader = new MsgReaderLib.default(fileBuffer);
            const msgInfo = msgReader.getFileData();
            return msgInfo;
        } else {
            console.error("MsgReader-Konstruktor konnte nicht gefunden werden.");
        }
    } catch (error) {
        console.error("Fehler beim Erstellen einer MsgReader-Instanz:", error);
    }
}

// Exportiere die Funktion für den Browser
window.extractMsg = extractMsg;
