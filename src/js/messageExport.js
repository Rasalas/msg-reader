import { escapeHTML } from './sanitizer.js';
import { textToBase64 } from './encoding.js';

function stripExtension(fileName) {
    if (!fileName) return '';
    return fileName.replace(/\.[^.]+$/, '');
}

function sanitizeFileComponent(value, fallback = 'message') {
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

function getBaseName(message) {
    const fileStem = stripExtension(message?.fileName);
    if (fileStem) {
        return sanitizeFileComponent(fileStem);
    }

    return sanitizeFileComponent(message?.subject || 'message');
}

function formatTimestamp(value) {
    const parsed = value ? new Date(value) : new Date();
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toUTCString();
    }
    return parsed.toUTCString();
}

function formatAddress(name, email) {
    if (!email) return name || '';
    if (name && name !== email) {
        return `"${name.replace(/"/g, '\\"')}" <${email}>`;
    }
    return `<${email}>`;
}

function wrapBase64(base64) {
    return (base64 || '')
        .replace(/\s+/g, '')
        .replace(/.{1,76}/g, '$&\r\n')
        .trim();
}

function encodeTextAsBase64(text) {
    return textToBase64(text);
}

function getAttachmentBase64(attachment) {
    return attachment?.contentBase64?.split(',')[1] || '';
}

function getAttachmentContentId(attachment, index) {
    const rawContentId = attachment?.pidContentId || attachment?.contentId || '';
    const normalized = rawContentId.replace(/[<>]/g, '').trim();
    if (normalized) return normalized;

    const fileName = sanitizeFileComponent(
        stripExtension(attachment?.fileName || `inline_${index}`),
        `inline_${index}`
    );
    return `${fileName}@msgreader.local`;
}

function partitionAttachments(bodyHtml, attachments = []) {
    const inlineAttachments = [];
    const regularAttachments = [];

    attachments.forEach((attachment, index) => {
        const isInline = Boolean(
            bodyHtml && attachment?.contentBase64 && bodyHtml.includes(attachment.contentBase64)
        );
        const withContentId = {
            ...attachment,
            exportContentId: getAttachmentContentId(attachment, index)
        };

        if (isInline) {
            inlineAttachments.push(withContentId);
        } else {
            regularAttachments.push(withContentId);
        }
    });

    return { inlineAttachments, regularAttachments };
}

function replaceInlineDataUrlsWithCid(bodyHtml, inlineAttachments) {
    let rewrittenHtml = bodyHtml;

    inlineAttachments.forEach((attachment) => {
        if (!attachment.contentBase64) return;
        rewrittenHtml = rewrittenHtml
            .split(attachment.contentBase64)
            .join(`cid:${attachment.exportContentId}`);
    });

    return rewrittenHtml;
}

function createPlainTextFallback(message) {
    if (message?.bodyContent) {
        return message.bodyContent.trim();
    }

    const body = message?.bodyContentHTML || '';
    if (!body) return '';

    if (typeof document !== 'undefined') {
        const container = document.createElement('div');
        container.innerHTML = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
        return (container.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    }

    return body
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function getHeaderMap(message) {
    return message?._exportMeta?.headerMap || {};
}

function getRawHeader(message, name) {
    const headerMap = getHeaderMap(message);
    return headerMap[name.toLowerCase()] || '';
}

function formatAddressList(recipients = []) {
    return recipients
        .map((recipient) =>
            formatAddress(
                recipient.name || recipient.smtpAddress || recipient.email || '',
                recipient.smtpAddress || recipient.email || ''
            )
        )
        .filter(Boolean)
        .join(', ');
}

function buildTopLevelHeaders(message) {
    const toRecipients = (message?.recipients || []).filter(
        (recipient) => recipient.recipType === 'to'
    );
    const ccRecipients = (message?.recipients || []).filter(
        (recipient) => recipient.recipType === 'cc'
    );
    const bccRecipients = (message?.recipients || []).filter(
        (recipient) => recipient.recipType === 'bcc'
    );
    const optionalHeaders = [
        ['Reply-To', getRawHeader(message, 'reply-to')],
        ['Message-ID', getRawHeader(message, 'message-id') || message?.messageId || ''],
        ['In-Reply-To', getRawHeader(message, 'in-reply-to')],
        ['References', getRawHeader(message, 'references')],
        ['X-Mailer', getRawHeader(message, 'x-mailer')],
        ['Thread-Index', getRawHeader(message, 'thread-index')],
        ['Content-Language', getRawHeader(message, 'content-language')],
        ['Importance', getRawHeader(message, 'importance')],
        ['Priority', getRawHeader(message, 'priority')],
        ['X-Priority', getRawHeader(message, 'x-priority')]
    ];

    return [
        [
            'From',
            getRawHeader(message, 'from') ||
                formatAddress(message?.senderName || '', message?.senderEmail || '')
        ],
        ['To', getRawHeader(message, 'to') || formatAddressList(toRecipients)],
        ['Cc', getRawHeader(message, 'cc') || formatAddressList(ccRecipients)],
        ['Bcc', getRawHeader(message, 'bcc') || formatAddressList(bccRecipients)],
        ['Subject', getRawHeader(message, 'subject') || message?.subject || ''],
        ['Date', getRawHeader(message, 'date') || formatTimestamp(message?.messageDeliveryTime)],
        ...optionalHeaders
    ]
        .filter(([, value]) => Boolean(value))
        .map(([name, value]) => `${name}: ${value}`);
}

export function getExportFileName(message, format) {
    const extensionMap = {
        eml: 'eml',
        html: 'html',
        original: message?._fileType || 'msg'
    };

    return `${getBaseName(message)}.${extensionMap[format] || 'dat'}`;
}

export function getOriginalMessageMimeType(message) {
    return message?._fileType === 'eml' ? 'message/rfc822' : 'application/vnd.ms-outlook';
}

export function messageToEml(message) {
    const boundaryMixed = `----=_msgReader_mixed_${Math.random().toString(16).slice(2)}`;
    const boundaryRelated = `----=_msgReader_related_${Math.random().toString(16).slice(2)}`;
    const boundaryAlt = `----=_msgReader_alt_${Math.random().toString(16).slice(2)}`;
    const bodyText = createPlainTextFallback(message);
    const originalHtml = message?.bodyContentHTML || `<pre>${escapeHTML(bodyText)}</pre>`;
    const { inlineAttachments, regularAttachments } = partitionAttachments(
        originalHtml,
        message?.attachments || []
    );
    const bodyHtml = replaceInlineDataUrlsWithCid(originalHtml, inlineAttachments);

    const headers = [
        ...buildTopLevelHeaders(message),
        'MIME-Version: 1.0',
        regularAttachments.length > 0
            ? `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`
            : inlineAttachments.length > 0
              ? `Content-Type: multipart/related; boundary="${boundaryRelated}"`
              : `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`
    ].filter(Boolean);

    const alternativeParts = [
        `--${boundaryAlt}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(encodeTextAsBase64(bodyText)),
        '',
        `--${boundaryAlt}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(encodeTextAsBase64(bodyHtml)),
        '',
        `--${boundaryAlt}--`,
        ''
    ];

    const relatedParts = inlineAttachments.map((attachment) => {
        const fileName = sanitizeFileComponent(attachment.fileName || 'inline');
        const mimeType = attachment.attachMimeTag || 'application/octet-stream';

        return [
            `--${boundaryRelated}`,
            `Content-Type: ${mimeType}; name="${fileName}"`,
            'Content-Transfer-Encoding: base64',
            `Content-ID: <${attachment.exportContentId}>`,
            `Content-Disposition: inline; filename="${fileName}"`,
            '',
            wrapBase64(getAttachmentBase64(attachment)),
            ''
        ].join('\r\n');
    });

    const alternativeOrRelatedBody =
        inlineAttachments.length > 0
            ? [
                  `--${boundaryRelated}`,
                  `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
                  '',
                  alternativeParts.join('\r\n'),
                  ...relatedParts,
                  `--${boundaryRelated}--`,
                  ''
              ].join('\r\n')
            : alternativeParts.join('\r\n');

    if (regularAttachments.length === 0) {
        return `${headers.join('\r\n')}\r\n\r\n${alternativeOrRelatedBody}`;
    }

    const attachmentParts = regularAttachments.map((attachment) => {
        const fileName = sanitizeFileComponent(attachment.fileName || 'attachment');
        const mimeType = attachment.attachMimeTag || 'application/octet-stream';

        return [
            `--${boundaryMixed}`,
            `Content-Type: ${mimeType}; name="${fileName}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${fileName}"`,
            '',
            wrapBase64(getAttachmentBase64(attachment)),
            ''
        ].join('\r\n');
    });

    const mixedBody = [
        `--${boundaryMixed}`,
        inlineAttachments.length > 0
            ? `Content-Type: multipart/related; boundary="${boundaryRelated}"`
            : `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
        '',
        alternativeOrRelatedBody,
        ...attachmentParts,
        `--${boundaryMixed}--`,
        ''
    ];

    return `${headers.join('\r\n')}\r\n\r\n${mixedBody.join('\r\n')}`;
}

export function messageToHtmlDocument(message) {
    const recipientsTo = (message?.recipients || [])
        .filter((recipient) => recipient.recipType === 'to')
        .map(
            (recipient) =>
                `${recipient.name || recipient.smtpAddress || recipient.email || ''} &lt;${recipient.smtpAddress || recipient.email || ''}&gt;`
        )
        .join(', ');
    const recipientsCc = (message?.recipients || [])
        .filter((recipient) => recipient.recipType === 'cc')
        .map(
            (recipient) =>
                `${recipient.name || recipient.smtpAddress || recipient.email || ''} &lt;${recipient.smtpAddress || recipient.email || ''}&gt;`
        )
        .join(', ');

    const bodyHtml =
        message?.bodyContentHTML || `<pre>${escapeHTML(message?.bodyContent || '')}</pre>`;
    const { regularAttachments } = partitionAttachments(bodyHtml, message?.attachments || []);
    const headerMap = getHeaderMap(message);
    const replyTo = getRawHeader(message, 'reply-to');
    const messageId = getRawHeader(message, 'message-id') || message?.messageId || '';

    const attachmentsHtml =
        regularAttachments.length > 0
            ? `
        <section class="attachments">
            <h2>Attachments</h2>
            <ul>
                ${regularAttachments
                    .map(
                        (attachment) => `
                <li>
                    <a href="${attachment.contentBase64}" download="${escapeHTML(attachment.fileName || 'attachment')}">${escapeHTML(attachment.fileName || 'attachment')}</a>
                    <span>${escapeHTML(attachment.attachMimeTag || 'application/octet-stream')}</span>
                </li>`
                    )
                    .join('')}
            </ul>
        </section>`
            : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(message?.subject || 'Message')}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; color: #0f172a; }
        main { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; }
        h1 { margin-top: 0; font-size: 1.5rem; }
        .meta { margin-bottom: 1.5rem; color: #475569; }
        .meta div { margin-bottom: 0.35rem; }
        .content { border-top: 1px solid #e2e8f0; padding-top: 1.5rem; }
        .attachments { border-top: 1px solid #e2e8f0; margin-top: 2rem; padding-top: 1.5rem; }
        .attachments ul { padding-left: 1.25rem; }
        .attachments li { margin-bottom: 0.5rem; }
        .attachments span { margin-left: 0.5rem; color: #64748b; font-size: 0.875rem; }
    </style>
</head>
<body>
    <main>
        <h1>${escapeHTML(message?.subject || 'Message')}</h1>
        <div class="meta">
            <div><strong>From:</strong> ${escapeHTML(message?.senderName || '')} &lt;${escapeHTML(message?.senderEmail || '')}&gt;</div>
            ${recipientsTo ? `<div><strong>To:</strong> ${recipientsTo}</div>` : ''}
            ${recipientsCc ? `<div><strong>CC:</strong> ${recipientsCc}</div>` : ''}
            <div><strong>Date:</strong> ${escapeHTML(new Date(message?.messageDeliveryTime || Date.now()).toLocaleString())}</div>
            ${replyTo ? `<div><strong>Reply-To:</strong> ${escapeHTML(replyTo)}</div>` : ''}
            ${messageId ? `<div><strong>Message-ID:</strong> ${escapeHTML(messageId)}</div>` : ''}
            ${headerMap['in-reply-to'] ? `<div><strong>In-Reply-To:</strong> ${escapeHTML(headerMap['in-reply-to'])}</div>` : ''}
        </div>
        <section class="content">${bodyHtml}</section>
        ${attachmentsHtml}
    </main>
</body>
</html>`;
}
