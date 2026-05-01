import {
    isCurrentVersionAtLeastUpdate,
    parseReleaseVersion
} from '../src/js/tauri-bridge.js';

describe('tauri-bridge version helpers', () => {
    test('parses release and git-describe versions', () => {
        expect(parseReleaseVersion('1.8.0')).toEqual({ major: 1, minor: 8, patch: 0 });
        expect(parseReleaseVersion('v1.8.0')).toEqual({ major: 1, minor: 8, patch: 0 });
        expect(parseReleaseVersion('v1.8.0-4-g5e7b327b')).toEqual({
            major: 1,
            minor: 8,
            patch: 0
        });
    });

    test('treats git-describe builds at the offered release as current', () => {
        expect(isCurrentVersionAtLeastUpdate('v1.8.0-4-g5e7b327b', '1.8.0')).toBe(true);
        expect(isCurrentVersionAtLeastUpdate('v1.8.1-1-g5e7b327b', '1.8.0')).toBe(true);
        expect(isCurrentVersionAtLeastUpdate('v1.7.9-4-g5e7b327b', '1.8.0')).toBe(false);
    });

    test('falls back to showing updates for unparseable versions', () => {
        expect(isCurrentVersionAtLeastUpdate('dev', '1.8.0')).toBe(false);
        expect(isCurrentVersionAtLeastUpdate('v1.8.0-rc.1', '1.8.0')).toBe(false);
    });
});
