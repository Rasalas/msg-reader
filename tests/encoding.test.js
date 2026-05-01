import {
    decodeBase64Text,
    decodeBinaryString,
    decodeMimeWords,
    decodePercentEncodedText,
    textToBase64
} from '../src/js/encoding.js';

describe('encoding helpers', () => {
    test('decodes Windows-1252 binary strings', () => {
        expect(decodeBinaryString('Freundliche Gr\xFC\xDFe', 'windows-1252')).toBe(
            'Freundliche Grüße'
        );
    });

    test('falls back from invalid UTF-8 to Windows-1252', () => {
        expect(decodeBinaryString('Somit ist der Gremienvorbehalt ausger\xE4umt.', 'utf-8')).toBe(
            'Somit ist der Gremienvorbehalt ausgeräumt.'
        );
    });

    test('uses Windows-1252 fallback for unsupported charsets with invalid UTF-8 bytes', () => {
        expect(decodeBinaryString('Freundliche Gr\xFC\xDFe', 'x-unknown-charset')).toBe(
            'Freundliche Grüße'
        );
    });

    test('keeps valid UTF-8 content as UTF-8', () => {
        const base64 = textToBase64('Freundliche Grüße');
        expect(decodeBase64Text(base64, 'utf-8')).toBe('Freundliche Grüße');
    });

    test('decodes adjacent MIME encoded words', () => {
        expect(decodeMimeWords('=?UTF-8?Q?Freundliche?= =?UTF-8?Q?_Gr=C3=BC=C3=9Fe?=')).toBe(
            'Freundliche Grüße'
        );
    });

    test('decodes RFC 2231 percent-encoded bytes with charset', () => {
        expect(decodePercentEncodedText('Gr%FC%DFe.txt', 'iso-8859-1')).toBe('Grüße.txt');
    });
});
