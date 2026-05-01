import { storage } from './storage.js';

export const PDF_ATTACHMENT_OPEN_MODE = {
    IN_APP: 'in-app',
    EXTERNAL: 'external'
};

export const PDF_ATTACHMENT_OPEN_MODE_STORAGE_KEY = 'msgReader_pdfAttachmentOpenMode';

export function getPdfAttachmentOpenMode() {
    const savedValue = storage.get(
        PDF_ATTACHMENT_OPEN_MODE_STORAGE_KEY,
        PDF_ATTACHMENT_OPEN_MODE.IN_APP
    );

    return Object.values(PDF_ATTACHMENT_OPEN_MODE).includes(savedValue)
        ? savedValue
        : PDF_ATTACHMENT_OPEN_MODE.IN_APP;
}

export function setPdfAttachmentOpenMode(openMode) {
    if (!Object.values(PDF_ATTACHMENT_OPEN_MODE).includes(openMode)) {
        return false;
    }

    return storage.set(PDF_ATTACHMENT_OPEN_MODE_STORAGE_KEY, openMode);
}

export function pdfAttachmentsOpenInApp() {
    return getPdfAttachmentOpenMode() === PDF_ATTACHMENT_OPEN_MODE.IN_APP;
}
