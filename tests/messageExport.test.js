import {
    getExportFileName,
    getOriginalMessageMimeType,
    messageToEml,
    messageToHtmlDocument
} from '../src/js/messageExport.js';

describe('message export helpers', () => {
    const message = {
        subject: 'Quarterly Update',
        senderName: 'Alice Example',
        senderEmail: 'alice@example.com',
        recipients: [
            { name: 'Bob Example', email: 'bob@example.com', recipType: 'to' },
            { name: 'Carla Example', email: 'carla@example.com', recipType: 'cc' }
        ],
        messageDeliveryTime: '2026-03-13T09:15:00.000Z',
        bodyContent: 'Plain body',
        bodyContentHTML: '<p>Hello <strong>team</strong></p>',
        fileName: 'quarterly.msg',
        _fileType: 'msg',
        attachments: [
            {
                fileName: 'report.pdf',
                attachMimeTag: 'application/pdf',
                contentBase64: 'data:application/pdf;base64,QUJD'
            }
        ]
    };

    test('builds export file names by format', () => {
        expect(getExportFileName(message, 'eml')).toBe('quarterly.eml');
        expect(getExportFileName(message, 'html')).toBe('quarterly.html');
        expect(getExportFileName(message, 'original')).toBe('quarterly.msg');
    });

    test('returns original message mime type', () => {
        expect(getOriginalMessageMimeType(message)).toBe('application/vnd.ms-outlook');
        expect(getOriginalMessageMimeType({ _fileType: 'eml' })).toBe('message/rfc822');
    });

    test('serializes a message as eml with body and attachments', () => {
        const eml = messageToEml(message);

        expect(eml).toContain('Subject: Quarterly Update');
        expect(eml).toContain('Content-Type: multipart/mixed;');
        expect(eml).toContain('Content-Type: text/html; charset=UTF-8');
        expect(eml).toContain('PHA+SGVsbG8gPHN0cm9uZz50ZWFtPC9zdHJvbmc+PC9wPg==');
        expect(eml).toContain('Content-Disposition: attachment; filename="report.pdf"');
        expect(eml).toContain('QUJD');
    });

    test('preserves important transport headers when export metadata is present', () => {
        const eml = messageToEml({
            ...message,
            _exportMeta: {
                headerMap: {
                    from: '"Alice Example" <alice@example.com>',
                    to: '"Bob Example" <bob@example.com>',
                    'reply-to': 'support@example.com',
                    'message-id': '<abc123@example.com>',
                    'in-reply-to': '<prev@example.com>',
                    references: '<older@example.com> <prev@example.com>',
                    importance: 'high',
                    priority: 'urgent',
                    'x-priority': '1',
                    'x-mailer': 'Microsoft Outlook 16.0'
                }
            }
        });

        expect(eml).toContain('Reply-To: support@example.com');
        expect(eml).toContain('Message-ID: <abc123@example.com>');
        expect(eml).toContain('In-Reply-To: <prev@example.com>');
        expect(eml).toContain('References: <older@example.com> <prev@example.com>');
        expect(eml).toContain('Importance: high');
        expect(eml).toContain('Priority: urgent');
        expect(eml).toContain('X-Priority: 1');
        expect(eml).toContain('X-Mailer: Microsoft Outlook 16.0');
    });

    test('does not reuse raw address headers containing Exchange legacy DNs', () => {
        const legacyDn =
            '/O=ENBW-KK/OU=EXCHANGE ADMINISTRATIVE GROUP (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=KLIUCININKAITE, LINA7E2';
        const eml = messageToEml({
            ...message,
            senderName: 'Kliucininkaite, Lina (ENBW AG)',
            senderEmail: '',
            _exportMeta: {
                headerMap: {
                    from: `Kliucininkaite, Lina (ENBW AG) <${legacyDn}>`
                }
            }
        });

        expect(eml).toContain('From: Kliucininkaite, Lina (ENBW AG)');
        expect(eml).not.toContain(legacyDn);
    });

    test('renders contacts without empty angle brackets in standalone html', () => {
        const html = messageToHtmlDocument({
            ...message,
            senderName: 'Kliucininkaite, Lina (ENBW AG)',
            senderEmail: '',
            recipients: [
                {
                    name: 'Internal User',
                    exchangeLegacyDn: '/O=ORG/CN=RECIPIENTS/CN=USER',
                    recipType: 'to'
                }
            ]
        });

        expect(html).toContain('<strong>From:</strong> Kliucininkaite, Lina (ENBW AG)');
        expect(html).toContain('<strong>To:</strong> Internal User');
        expect(html).not.toContain('&lt;/O=ORG');
        expect(html).not.toContain('&lt;&gt;');
    });

    test('exports inline images as related cid parts instead of duplicate attachments', () => {
        const inlineMessage = {
            ...message,
            bodyContentHTML: '<p><img src="data:image/png;base64,SU1H" alt="inline"></p>',
            attachments: [
                {
                    fileName: 'inline.png',
                    attachMimeTag: 'image/png',
                    contentBase64: 'data:image/png;base64,SU1H',
                    contentId: 'image001@example'
                },
                {
                    fileName: 'report.pdf',
                    attachMimeTag: 'application/pdf',
                    contentBase64: 'data:application/pdf;base64,QUJD'
                }
            ]
        };

        const eml = messageToEml(inlineMessage);

        expect(eml).toContain('Content-Type: multipart/related;');
        expect(eml).toContain('Content-ID: <image001@example>');
        expect(eml).toContain('Content-Disposition: inline; filename="inline.png"');
        expect(eml).toContain('Content-Disposition: attachment; filename="report.pdf"');
        expect(eml).not.toContain('Content-Disposition: attachment; filename="inline.png"');
        expect(eml).toContain('Content-Transfer-Encoding: base64');
    });

    test('serializes a message as standalone html', () => {
        const html = messageToHtmlDocument(message);

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<h1>Quarterly Update</h1>');
        expect(html).toContain('<strong>From:</strong> Alice Example');
        expect(html).toContain('<p>Hello <strong>team</strong></p>');
        expect(html).toContain('download="report.pdf"');
    });

    test('does not list inline images again in html attachment section', () => {
        const html = messageToHtmlDocument({
            ...message,
            bodyContentHTML: '<p><img src="data:image/png;base64,SU1H" alt="inline"></p>',
            attachments: [
                {
                    fileName: 'inline.png',
                    attachMimeTag: 'image/png',
                    contentBase64: 'data:image/png;base64,SU1H',
                    contentId: 'image001@example'
                },
                {
                    fileName: 'report.pdf',
                    attachMimeTag: 'application/pdf',
                    contentBase64: 'data:application/pdf;base64,QUJD'
                }
            ]
        });

        expect(html).toContain('download="report.pdf"');
        expect(html).not.toContain('download="inline.png"');
    });

    test('keeps calendar and nested message attachments as regular attachments', () => {
        const eml = messageToEml({
            ...message,
            attachments: [
                {
                    fileName: 'invite.ics',
                    attachMimeTag: 'text/calendar',
                    contentBase64: 'data:text/calendar;base64,QkVHSU46VkNBTEVOREFS'
                },
                {
                    fileName: 'forwarded.eml',
                    attachMimeTag: 'message/rfc822',
                    contentBase64: 'data:message/rfc822;base64,RnJvbTogdGVzdA=='
                }
            ]
        });

        expect(eml).toContain('Content-Disposition: attachment; filename="invite.ics"');
        expect(eml).toContain('Content-Type: text/calendar; name="invite.ics"');
        expect(eml).toContain('Content-Disposition: attachment; filename="forwarded.eml"');
        expect(eml).toContain('Content-Type: message/rfc822; name="forwarded.eml"');
    });
});
