import JSZip from 'jszip';
import { createBulkExportZipBlob } from '../src/js/bulkExport.js';

describe('bulk export helpers', () => {
    const now = new Date('2026-05-13T08:30:00.000Z');
    const baseMessage = {
        subject: 'Quarterly Update',
        senderName: 'Alice Example',
        senderEmail: 'alice@example.com',
        recipients: [{ name: 'Bob Example', email: 'bob@example.com', recipType: 'to' }],
        messageDeliveryTime: '2026-03-13T09:15:00.000Z',
        bodyContent: 'Plain body',
        bodyContentHTML: '<p>Hello team</p>',
        fileName: 'quarterly.msg',
        messageHash: 'hash1',
        _fileType: 'msg',
        _rawBuffer: new Uint8Array([0x4d, 0x53, 0x47]).buffer,
        attachments: []
    };

    test('creates an EML ZIP with a manifest', async () => {
        const result = await createBulkExportZipBlob([baseMessage], 'eml', {
            scope: 'selected',
            now
        });

        expect(result.fileName).toBe('msgReader-selected-eml-2026-05-13.zip');
        expect(result.exportedCount).toBe(1);
        expect(result.skippedCount).toBe(0);

        const zip = await JSZip.loadAsync(result.blob);
        const eml = await zip.file('emails/quarterly.eml').async('string');
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

        expect(eml).toContain('Subject: Quarterly Update');
        expect(manifest.scope).toBe('selected');
        expect(manifest.messages[0].fileName).toBe('quarterly.eml');
    });

    test('deduplicates exported file names', async () => {
        const result = await createBulkExportZipBlob(
            [
                baseMessage,
                {
                    ...baseMessage,
                    messageHash: 'hash2'
                }
            ],
            'html',
            { scope: 'visible', now }
        );
        const zip = await JSZip.loadAsync(result.blob);

        expect(zip.file('emails/quarterly.html')).toBeTruthy();
        expect(zip.file('emails/quarterly (2).html')).toBeTruthy();
    });

    test('exports original files and skips messages without original data', async () => {
        const result = await createBulkExportZipBlob(
            [
                baseMessage,
                {
                    ...baseMessage,
                    fileName: 'missing.eml',
                    messageHash: 'hash2',
                    _rawBuffer: null,
                    _fileType: 'eml'
                }
            ],
            'original',
            { scope: 'selected', now }
        );
        const zip = await JSZip.loadAsync(result.blob);
        const originalBytes = await zip.file('emails/quarterly.msg').async('uint8array');
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));

        expect(Array.from(originalBytes)).toEqual([0x4d, 0x53, 0x47]);
        expect(result.exportedCount).toBe(1);
        expect(result.skippedCount).toBe(1);
        expect(manifest.skippedMessages[0].sourceFileName).toBe('missing.eml');
    });

    test('returns an empty result when nothing can be exported', async () => {
        const result = await createBulkExportZipBlob(
            [
                {
                    ...baseMessage,
                    _rawBuffer: null
                }
            ],
            'original',
            { scope: 'selected', now }
        );

        expect(result.blob).toBeNull();
        expect(result.exportedCount).toBe(0);
        expect(result.skippedCount).toBe(1);
    });
});
