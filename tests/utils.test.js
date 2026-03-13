/**
 * Tests for utils.js MSG attachment filename handling
 */

jest.mock('@kenjiuno/msgreader', () => jest.fn());

import MsgReaderLib from '@kenjiuno/msgreader';
import { extractMsg } from '../src/js/utils.js';

describe('extractMsg', () => {
    const mockGetFileData = jest.fn();
    const mockGetAttachment = jest.fn();

    beforeEach(() => {
        mockGetFileData.mockReset();
        mockGetAttachment.mockReset();

        MsgReaderLib.mockImplementation(() => ({
            getFileData: mockGetFileData,
            getAttachment: mockGetAttachment
        }));
    });

    test('builds a filename from attachment display name and extension', () => {
        mockGetFileData.mockReturnValue({
            subject: 'Report',
            senderName: 'Alice',
            senderEmail: 'alice@example.com',
            messageDeliveryTime: '2026-01-01T10:00:00Z',
            body: 'Hello',
            attachments: [{
                dataId: 1,
                attachMimeTag: 'application/pdf',
                name: 'Quarterly Results',
                extension: '.pdf'
            }]
        });

        mockGetAttachment.mockReturnValue({
            fileName: undefined,
            content: Uint8Array.from([1, 2, 3])
        });

        const result = extractMsg(new ArrayBuffer(0));

        expect(result.attachments[0].fileName).toBe('Quarterly Results.pdf');
        expect(result.attachments[0].contentBase64).toBe('data:application/pdf;base64,AQID');
    });

    test('falls back to the short filename when no other name is present', () => {
        mockGetFileData.mockReturnValue({
            subject: 'Report',
            senderName: 'Alice',
            senderEmail: 'alice@example.com',
            messageDeliveryTime: '2026-01-01T10:00:00Z',
            body: 'Hello',
            attachments: [{
                dataId: 2,
                attachMimeTag: 'application/pdf',
                fileNameShort: 'REPORT~1.PDF'
            }]
        });

        mockGetAttachment.mockReturnValue({
            fileName: undefined,
            content: Uint8Array.from([4, 5, 6])
        });

        const result = extractMsg(new ArrayBuffer(0));

        expect(result.attachments[0].fileName).toBe('REPORT~1.PDF');
    });

    test('uses a generic filename with extension as the final fallback', () => {
        mockGetFileData.mockReturnValue({
            subject: 'Report',
            senderName: 'Alice',
            senderEmail: 'alice@example.com',
            messageDeliveryTime: '2026-01-01T10:00:00Z',
            body: 'Hello',
            attachments: [{
                dataId: 3,
                attachMimeTag: 'application/pdf'
            }]
        });

        mockGetAttachment.mockReturnValue({
            fileName: undefined,
            content: Uint8Array.from([7, 8, 9])
        });

        const result = extractMsg(new ArrayBuffer(0));

        expect(result.attachments[0].fileName).toBe('attachment.pdf');
    });
});
