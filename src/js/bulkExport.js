import {
    getExportFileName,
    getOriginalMessageMimeType,
    messageToEml,
    messageToHtmlDocument
} from './messageExport.js';

export const BULK_EXPORT_FORMATS = {
    eml: {
        label: 'EML',
        mimeType: 'message/rfc822'
    },
    html: {
        label: 'HTML',
        mimeType: 'text/html'
    },
    original: {
        label: 'Original',
        mimeType: null
    }
};

function formatArchiveDate(date) {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }

    return parsed.toISOString().slice(0, 10);
}

function sanitizeZipPathSegment(value, fallback = 'message') {
    const invalidChars = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
    const cleaned = Array.from(value || fallback)
        .map((char) => {
            if (invalidChars.has(char)) return '_';
            if (char.charCodeAt(0) < 32) return '_';
            return char;
        })
        .join('')
        .trim();

    return cleaned || fallback;
}

function dedupeFileName(fileName, usedNames) {
    const safeName = sanitizeZipPathSegment(fileName);
    const extensionIndex = safeName.lastIndexOf('.');
    const stem = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
    const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
    let candidate = safeName;
    let counter = 2;

    while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${stem} (${counter})${extension}`;
        counter += 1;
    }

    usedNames.add(candidate.toLowerCase());
    return candidate;
}

function normalizeBinaryData(value) {
    if (value instanceof ArrayBuffer) {
        return value;
    }

    if (ArrayBuffer.isView(value)) {
        return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    }

    return null;
}

function createExportEntry(message, format) {
    if (format === 'eml') {
        return {
            fileName: getExportFileName(message, 'eml'),
            mimeType: BULK_EXPORT_FORMATS.eml.mimeType,
            content: messageToEml(message)
        };
    }

    if (format === 'html') {
        return {
            fileName: getExportFileName(message, 'html'),
            mimeType: BULK_EXPORT_FORMATS.html.mimeType,
            content: messageToHtmlDocument(message)
        };
    }

    if (format === 'original') {
        const content = normalizeBinaryData(message?._rawBuffer);
        if (!content || !message?._fileType) {
            return null;
        }

        return {
            fileName: getExportFileName(message, 'original'),
            mimeType: getOriginalMessageMimeType(message),
            content
        };
    }

    throw new Error(`Unsupported bulk export format: ${format}`);
}

function buildManifest({ messages, exportedEntries, skippedMessages, format, scope, now }) {
    return {
        generatedAt: now.toISOString(),
        format,
        scope,
        messageCount: messages.length,
        exportedCount: exportedEntries.length,
        skippedCount: skippedMessages.length,
        messages: exportedEntries.map(({ message, fileName, mimeType }) => ({
            fileName,
            mimeType,
            subject: message?.subject || '',
            senderName: message?.senderName || '',
            senderEmail: message?.senderEmail || '',
            sourceFileName: message?.fileName || '',
            messageDeliveryTime: message?.messageDeliveryTime || '',
            messageHash: message?.messageHash || ''
        })),
        skippedMessages: skippedMessages.map((message) => ({
            subject: message?.subject || '',
            sourceFileName: message?.fileName || '',
            messageHash: message?.messageHash || '',
            reason: 'Original email file is not available'
        }))
    };
}

/**
 * Creates a ZIP blob containing exported messages.
 * @param {Array} messages - Messages to export
 * @param {string} format - Export format: eml, html, or original
 * @param {Object} [options] - Archive options
 * @param {string} [options.scope='messages'] - Scope label used in archive metadata/name
 * @param {Date} [options.now=new Date()] - Timestamp used for manifest and file name
 * @param {Function} [options.onProgress] - Progress callback from JSZip
 * @returns {Promise<{blob: Blob, fileName: string, exportedCount: number, skippedCount: number}>}
 */
export async function createBulkExportZipBlob(messages, format, options = {}) {
    if (!BULK_EXPORT_FORMATS[format]) {
        throw new Error(`Unsupported bulk export format: ${format}`);
    }

    const requestedNow = options.now instanceof Date ? options.now : new Date();
    const now = Number.isNaN(requestedNow.getTime()) ? new Date() : requestedNow;
    const scope = options.scope || 'messages';
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const emailsFolder = zip.folder('emails');
    const usedNames = new Set();
    const exportedEntries = [];
    const skippedMessages = [];

    messages.forEach((message) => {
        const entry = createExportEntry(message, format);
        if (!entry) {
            skippedMessages.push(message);
            return;
        }

        const fileName = dedupeFileName(entry.fileName, usedNames);
        emailsFolder.file(fileName, entry.content);
        exportedEntries.push({
            message,
            fileName,
            mimeType: entry.mimeType
        });
    });

    if (exportedEntries.length === 0) {
        return {
            blob: null,
            fileName: '',
            exportedCount: 0,
            skippedCount: skippedMessages.length
        };
    }

    const manifest = buildManifest({
        messages,
        exportedEntries,
        skippedMessages,
        format,
        scope,
        now
    });
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const blob = await zip.generateAsync(
        {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        },
        options.onProgress
    );
    const archiveDate = formatArchiveDate(now);
    const archiveScope = sanitizeZipPathSegment(scope, 'messages').toLowerCase();
    const fileName = `msgReader-${archiveScope}-${format}-${archiveDate}.zip`;

    return {
        blob,
        fileName,
        exportedCount: exportedEntries.length,
        skippedCount: skippedMessages.length
    };
}
