/**
 * Address helpers for RFC 5322-like mailbox headers plus Exchange internal addresses.
 */

export function isSmtpAddress(address) {
    return /^[^\s@<>]+@[^\s@<>]+$/.test((address || '').trim());
}

export function isExchangeLegacyDn(address) {
    const normalized = (address || '').trim();
    return normalized.startsWith('/') && /\/(?:O|OU|CN)=/i.test(normalized);
}

function stripDisplayQuotes(value) {
    const trimmed = (value || '').trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/\\"/g, '"').trim();
    }
    return trimmed;
}

function normalizeParsedAddress(displayName, rawAddress, decodeMimeWord) {
    const decodedName = stripDisplayQuotes(decodeMimeWord(displayName || ''));
    const address = (rawAddress || '').trim();
    const hasSmtpAddress = isSmtpAddress(address);
    const hasExchangeLegacyDn = isExchangeLegacyDn(address);
    const name = decodedName || (hasSmtpAddress ? address : '');

    const result = {
        name,
        address: hasSmtpAddress ? address : '',
        email: hasSmtpAddress ? address : ''
    };

    if (hasExchangeLegacyDn) {
        result.exchangeLegacyDn = address;
    } else if (address && !hasSmtpAddress) {
        result.originalAddress = address;
    }

    return result;
}

export function parseAddressHeader(headerValue, decodeMimeWord = (value) => value) {
    if (!headerValue) return [];

    const value = String(headerValue);
    const addresses = [];
    const angleAddressPattern = /<([^>]*)>/g;
    let match;
    let previousEnd = 0;

    while ((match = angleAddressPattern.exec(value)) !== null) {
        const displayName = value
            .slice(previousEnd, match.index)
            .replace(/^\s*,\s*/, '')
            .trim();
        addresses.push(normalizeParsedAddress(displayName, match[1], decodeMimeWord));
        previousEnd = match.index + match[0].length;
    }

    if (addresses.length > 0) {
        return addresses.filter(
            (address) => address.name || address.address || address.exchangeLegacyDn
        );
    }

    return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => normalizeParsedAddress('', part, decodeMimeWord))
        .filter((address) => address.name || address.address || address.exchangeLegacyDn);
}

export function getContactEmail(contact) {
    const email = contact?.smtpAddress || contact?.email || contact?.address || '';
    return isSmtpAddress(email) ? email : '';
}

export function formatContact(name, email) {
    const displayName = (name || '').trim();
    const smtpAddress = isSmtpAddress(email) ? email.trim() : '';

    if (!smtpAddress) {
        return displayName;
    }

    return displayName && displayName !== smtpAddress
        ? `${displayName} <${smtpAddress}>`
        : smtpAddress;
}

export function formatAddressHeader(name, email) {
    const displayName = (name || '').trim();
    const smtpAddress = isSmtpAddress(email) ? email.trim() : '';

    if (!smtpAddress) {
        return displayName;
    }

    return displayName && displayName !== smtpAddress
        ? `"${displayName.replace(/"/g, '\\"')}" <${smtpAddress}>`
        : `<${smtpAddress}>`;
}

export function isUnsafeRawAddressHeader(headerValue) {
    return parseAddressHeader(headerValue).some(
        (address) => address.exchangeLegacyDn || address.originalAddress
    );
}
