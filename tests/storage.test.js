/**
 * Tests for storage.js
 */
const { Storage, storage } = require('../src/js/storage');

describe('Storage', () => {
    describe('get', () => {
        test('returns stored value', () => {
            localStorage.setItem('testKey', JSON.stringify({ foo: 'bar' }));
            const result = storage.get('testKey');
            expect(result).toEqual({ foo: 'bar' });
        });

        test('returns default value for missing key', () => {
            const result = storage.get('nonExistentKey', 'default');
            expect(result).toBe('default');
        });

        test('returns null for missing key without default', () => {
            const result = storage.get('nonExistentKey');
            expect(result).toBeNull();
        });

        test('returns default value on JSON parse error', () => {
            localStorage.store['badJson'] = 'not valid json {';
            const result = storage.get('badJson', 'fallback');
            expect(result).toBe('fallback');
        });
    });

    describe('set', () => {
        test('stores value as JSON', () => {
            storage.set('myKey', { hello: 'world' });
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'myKey',
                JSON.stringify({ hello: 'world' })
            );
        });

        test('returns true on success', () => {
            const result = storage.set('testKey', 'value');
            expect(result).toBe(true);
        });

        test('stores arrays correctly', () => {
            storage.set('arrayKey', [1, 2, 3]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'arrayKey',
                JSON.stringify([1, 2, 3])
            );
        });
    });

    describe('remove', () => {
        test('removes item from storage', () => {
            storage.remove('keyToRemove');
            expect(localStorage.removeItem).toHaveBeenCalledWith('keyToRemove');
        });

        test('returns true on success', () => {
            const result = storage.remove('keyToRemove');
            expect(result).toBe(true);
        });
    });

    describe('has', () => {
        test('returns true for existing key', () => {
            localStorage.store['existingKey'] = 'value';
            const result = storage.has('existingKey');
            expect(result).toBe(true);
        });

        test('returns false for non-existing key', () => {
            const result = storage.has('nonExistingKey');
            expect(result).toBe(false);
        });
    });

    describe('clear', () => {
        test('clears all storage', () => {
            storage.clear();
            expect(localStorage.clear).toHaveBeenCalled();
        });

        test('returns true on success', () => {
            const result = storage.clear();
            expect(result).toBe(true);
        });
    });

    describe('with null backend', () => {
        let nullStorage;

        beforeEach(() => {
            nullStorage = new Storage(null);
            // Force the backend to null
            nullStorage.backend = null;
        });

        test('get returns default value', () => {
            expect(nullStorage.get('key', 'default')).toBe('default');
        });

        test('set returns false', () => {
            expect(nullStorage.set('key', 'value')).toBe(false);
        });

        test('remove returns false', () => {
            expect(nullStorage.remove('key')).toBe(false);
        });

        test('has returns false', () => {
            expect(nullStorage.has('key')).toBe(false);
        });

        test('clear returns false', () => {
            expect(nullStorage.clear()).toBe(false);
        });
    });
});
