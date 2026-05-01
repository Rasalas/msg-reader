/**
 * Tests for utils.js MSG attachment filename handling
 */

jest.mock('@kenjiuno/msgreader', () => jest.fn());

import MsgReaderLib from '@kenjiuno/msgreader';
import { extractEml, extractMsg } from '../src/js/utils.js';

function binaryArrayBuffer(value) {
    return Uint8Array.from(Buffer.from(value, 'binary')).buffer;
}

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
            attachments: [
                {
                    dataId: 1,
                    attachMimeTag: 'application/pdf',
                    name: 'Quarterly Results',
                    extension: '.pdf'
                }
            ]
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
            attachments: [
                {
                    dataId: 2,
                    attachMimeTag: 'application/pdf',
                    fileNameShort: 'REPORT~1.PDF'
                }
            ]
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
            attachments: [
                {
                    dataId: 3,
                    attachMimeTag: 'application/pdf'
                }
            ]
        });

        mockGetAttachment.mockReturnValue({
            fileName: undefined,
            content: Uint8Array.from([7, 8, 9])
        });

        const result = extractMsg(new ArrayBuffer(0));

        expect(result.attachments[0].fileName).toBe('attachment.pdf');
    });

    test('decodes MSG HTML using Windows-1252 internet codepage', () => {
        mockGetFileData.mockReturnValue({
            subject: 'German text',
            senderName: 'Alice',
            senderEmail: 'alice@example.com',
            messageDeliveryTime: '2026-01-01T10:00:00Z',
            body: '',
            internetCodepage: 1252,
            html: Uint8Array.from(
                Buffer.from(
                    '<p>Somit ist der Gremienvorbehalt ausger\xE4umt.</p><p>Freundliche Gr\xFC\xDFe</p>',
                    'binary'
                )
            ),
            attachments: []
        });

        const result = extractMsg(new ArrayBuffer(0));

        expect(result.bodyContentHTML).toContain('ausgeräumt');
        expect(result.bodyContentHTML).toContain('Freundliche Grüße');
        expect(result.bodyContentHTML).not.toContain('\uFFFD');
    });
});

describe('extractEml', () => {
    test('decodes 8bit body content using declared Windows-1252 charset', () => {
        const eml = [
            'From: Brigitte Korn-Hoffmann <brigitte@example.com>',
            'Subject: =?windows-1252?Q?Freundliche_Gr=FC=DFe?=',
            'Content-Type: text/plain; charset=windows-1252',
            'Content-Transfer-Encoding: 8bit',
            '',
            'Freundliche Gr\xFC\xDFe'
        ].join('\r\n');

        const result = extractEml(binaryArrayBuffer(eml));

        expect(result.subject).toBe('Freundliche Grüße');
        expect(result.bodyContent).toBe('Freundliche Grüße');
    });

    test('falls back to Windows-1252 when unlabelled 8bit text is invalid UTF-8', () => {
        const eml = [
            'From: test@example.com',
            'Subject: Charset fallback',
            'Content-Type: text/plain',
            'Content-Transfer-Encoding: 8bit',
            '',
            'Somit ist der Gremienvorbehalt ausger\xE4umt.'
        ].join('\r\n');

        const result = extractEml(binaryArrayBuffer(eml));

        expect(result.bodyContent).toBe('Somit ist der Gremienvorbehalt ausgeräumt.');
    });

    test('decodes quoted-printable HTML using ISO-8859-1 charset', () => {
        const eml = [
            'From: test@example.com',
            'Subject: Quoted printable',
            'Content-Type: text/html; charset=iso-8859-1',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            '<p>Freundliche Gr=FC=DFe</p>'
        ].join('\r\n');

        const result = extractEml(binaryArrayBuffer(eml));

        expect(result.bodyContentHTML).toBe('<p>Freundliche Grüße</p>');
    });

    test('decodes RFC 2231 attachment filenames', () => {
        const eml = [
            'From: test@example.com',
            'Subject: Attachment filename',
            'Content-Type: multipart/mixed; boundary="b1"',
            '',
            '--b1',
            'Content-Type: text/plain; charset=utf-8',
            '',
            'Body',
            '--b1',
            "Content-Type: text/plain; name*=iso-8859-1''Gr%FC%DFe.txt",
            "Content-Disposition: attachment; filename*=iso-8859-1''Gr%FC%DFe.txt",
            'Content-Transfer-Encoding: quoted-printable',
            '',
            'Hallo',
            '--b1--',
            ''
        ].join('\r\n');

        const result = extractEml(binaryArrayBuffer(eml));

        expect(result.attachments[0].fileName).toBe('Grüße.txt');
        expect(result.attachments[0].contentBase64).toBe('data:text/plain;base64,SGFsbG8=');
    });
});
