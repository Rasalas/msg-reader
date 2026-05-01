import {
    formatAddressHeader,
    formatContact,
    isExchangeLegacyDn,
    isSmtpAddress,
    isUnsafeRawAddressHeader,
    parseAddressHeader
} from '../src/js/addressUtils.js';

describe('addressUtils', () => {
    const legacyDn =
        '/O=ENBW-KK/OU=EXCHANGE ADMINISTRATIVE GROUP (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=KLIUCININKAITE, LINA7E2';

    test('detects SMTP addresses', () => {
        expect(isSmtpAddress('lina@example.com')).toBe(true);
        expect(isSmtpAddress(legacyDn)).toBe(false);
    });

    test('detects Exchange legacy distinguished names', () => {
        expect(isExchangeLegacyDn(legacyDn)).toBe(true);
        expect(isExchangeLegacyDn('lina@example.com')).toBe(false);
    });

    test('parses unquoted display names with commas before Exchange legacy DNs', () => {
        const [address] = parseAddressHeader(`Kliucininkaite, Lina (ENBW AG) <${legacyDn}>`);

        expect(address.name).toBe('Kliucininkaite, Lina (ENBW AG)');
        expect(address.address).toBe('');
        expect(address.email).toBe('');
        expect(address.exchangeLegacyDn).toBe(legacyDn);
    });

    test('parses normal SMTP mailbox headers', () => {
        const [address] = parseAddressHeader('"Kliucininkaite, Lina" <lina@example.com>');

        expect(address.name).toBe('Kliucininkaite, Lina');
        expect(address.address).toBe('lina@example.com');
        expect(address.email).toBe('lina@example.com');
        expect(address.exchangeLegacyDn).toBeUndefined();
    });

    test('formats contacts without pretending legacy DNs are SMTP addresses', () => {
        expect(formatContact('Kliucininkaite, Lina (ENBW AG)', legacyDn)).toBe(
            'Kliucininkaite, Lina (ENBW AG)'
        );
        expect(formatAddressHeader('Kliucininkaite, Lina (ENBW AG)', legacyDn)).toBe(
            'Kliucininkaite, Lina (ENBW AG)'
        );
    });

    test('marks raw headers with legacy DNs as unsafe for export reuse', () => {
        expect(isUnsafeRawAddressHeader(`Kliucininkaite, Lina (ENBW AG) <${legacyDn}>`)).toBe(true);
        expect(isUnsafeRawAddressHeader('"Lina" <lina@example.com>')).toBe(false);
    });
});
