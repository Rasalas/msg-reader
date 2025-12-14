/**
 * Tests for SearchManager.js
 * Tests search functionality, filtering, debouncing, and highlighting
 */

import { SearchManager } from '../src/js/SearchManager.js';

describe('SearchManager', () => {
    let searchManager;
    let mockMessageHandler;
    let mockMessages;

    beforeEach(() => {
        mockMessages = [
            {
                subject: 'Meeting Tomorrow',
                senderName: 'John Doe',
                senderEmail: 'john@example.com',
                body: 'Let\'s discuss the project timeline.',
                recipients: [{ name: 'Jane Smith', email: 'jane@example.com' }]
            },
            {
                subject: 'Invoice #12345',
                senderName: 'Accounting',
                senderEmail: 'accounting@company.com',
                body: 'Please find attached the invoice for last month.',
                bodyContent: 'Please find attached the invoice for last month.',
                recipients: []
            },
            {
                subject: 'Welcome to the team!',
                senderName: 'HR Department',
                senderEmail: 'hr@company.com',
                body: 'We are excited to have you join us.',
                recipients: [{ name: 'New Employee', email: 'new@company.com' }]
            }
        ];

        mockMessageHandler = {
            getMessages: jest.fn(() => mockMessages)
        };

        searchManager = new SearchManager(mockMessageHandler);
    });

    describe('constructor', () => {
        test('initializes with empty query', () => {
            expect(searchManager.getQuery()).toBe('');
        });

        test('stores message handler reference', () => {
            expect(searchManager.messageHandler).toBe(mockMessageHandler);
        });
    });

    describe('search', () => {
        test('returns all messages when query is empty', () => {
            const results = searchManager.search('');
            expect(results).toEqual(mockMessages);
        });

        test('returns all messages when query is whitespace only', () => {
            const results = searchManager.search('   ');
            expect(results).toEqual(mockMessages);
        });

        test('filters messages by subject', () => {
            const results = searchManager.search('Meeting');
            expect(results).toHaveLength(1);
            expect(results[0].subject).toBe('Meeting Tomorrow');
        });

        test('filters messages by sender name', () => {
            const results = searchManager.search('John');
            expect(results).toHaveLength(1);
            expect(results[0].senderName).toBe('John Doe');
        });

        test('filters messages by sender email', () => {
            const results = searchManager.search('accounting@');
            expect(results).toHaveLength(1);
            expect(results[0].senderEmail).toBe('accounting@company.com');
        });

        test('filters messages by body content', () => {
            const results = searchManager.search('invoice');
            expect(results).toHaveLength(1);
            expect(results[0].subject).toBe('Invoice #12345');
        });

        test('filters messages by recipient', () => {
            const results = searchManager.search('Jane');
            expect(results).toHaveLength(1);
            expect(results[0].subject).toBe('Meeting Tomorrow');
        });

        test('is case insensitive', () => {
            const results1 = searchManager.search('MEETING');
            const results2 = searchManager.search('meeting');
            expect(results1).toEqual(results2);
        });

        test('returns empty array when no matches found', () => {
            const results = searchManager.search('xyz123nonexistent');
            expect(results).toHaveLength(0);
        });

        test('matches partial strings', () => {
            const results = searchManager.search('Wel');
            expect(results).toHaveLength(1);
            expect(results[0].subject).toBe('Welcome to the team!');
        });

        test('updates currentQuery', () => {
            searchManager.search('test query');
            expect(searchManager.getQuery()).toBe('test query');
        });

        test('trims whitespace from query', () => {
            searchManager.search('  Meeting  ');
            expect(searchManager.getQuery()).toBe('meeting');
        });
    });

    describe('matchesQuery', () => {
        test('returns true when message matches query', () => {
            searchManager.search('john');
            const result = searchManager.matchesQuery(mockMessages[0]);
            expect(result).toBe(true);
        });

        test('returns false when message does not match query', () => {
            searchManager.search('nonexistent');
            const result = searchManager.matchesQuery(mockMessages[0]);
            expect(result).toBe(false);
        });

        test('handles messages without recipients', () => {
            searchManager.search('john');
            const result = searchManager.matchesQuery(mockMessages[1]);
            expect(result).toBe(false); // 'john' doesn't match Invoice message
        });

        test('handles null/undefined fields gracefully', () => {
            const messageWithNulls = {
                subject: null,
                senderName: undefined,
                senderEmail: 'test@test.com'
            };
            searchManager.search('test');
            expect(() => searchManager.matchesQuery(messageWithNulls)).not.toThrow();
        });

        test('searches in bodyContentHTML with stripped tags', () => {
            const messageWithHtml = {
                subject: 'Test',
                bodyContentHTML: '<p>Hello <strong>Ada Lovelace</strong>!</p>'
            };
            searchManager.search('ada lovelace');
            expect(searchManager.matchesQuery(messageWithHtml)).toBe(true);
        });

        test('searches in senderSmtpAddress', () => {
            const messageWithSmtp = {
                subject: 'Test',
                senderSmtpAddress: 'ada@lovelace.com'
            };
            searchManager.search('lovelace');
            expect(searchManager.matchesQuery(messageWithSmtp)).toBe(true);
        });

        test('searches recipients with address field', () => {
            const messageWithAddress = {
                subject: 'Test',
                recipients: [{ name: 'Ada', address: 'ada@lovelace.com' }]
            };
            searchManager.search('lovelace');
            expect(searchManager.matchesQuery(messageWithAddress)).toBe(true);
        });
    });

    describe('stripHtml', () => {
        test('removes HTML tags', () => {
            const result = searchManager.stripHtml('<p>Hello <strong>World</strong>!</p>');
            expect(result).toBe('Hello World !');
        });

        test('returns empty string for null/undefined', () => {
            expect(searchManager.stripHtml(null)).toBe('');
            expect(searchManager.stripHtml(undefined)).toBe('');
        });

        test('normalizes whitespace', () => {
            const result = searchManager.stripHtml('<p>Hello</p>   <p>World</p>');
            expect(result).toBe('Hello World');
        });
    });

    describe('normalizeText', () => {
        test('replaces dots with spaces', () => {
            expect(searchManager.normalizeText('ada.lovelace')).toBe('ada lovelace');
        });

        test('replaces hyphens with spaces', () => {
            expect(searchManager.normalizeText('ada-lovelace')).toBe('ada lovelace');
        });

        test('replaces underscores with spaces', () => {
            expect(searchManager.normalizeText('ada_lovelace')).toBe('ada lovelace');
        });

        test('replaces @ with spaces', () => {
            expect(searchManager.normalizeText('ada@lovelace.com')).toBe('ada lovelace com');
        });

        test('normalizes multiple separators', () => {
            expect(searchManager.normalizeText('ada.lovelace-test_user')).toBe('ada lovelace test user');
        });

        test('returns empty string for null/undefined', () => {
            expect(searchManager.normalizeText(null)).toBe('');
            expect(searchManager.normalizeText(undefined)).toBe('');
        });
    });

    describe('flexible matching', () => {
        test('finds "ada lovelace" in "ada.lovelace"', () => {
            const message = { senderEmail: 'ada.lovelace@example.com' };
            searchManager.search('ada lovelace');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('finds "ada lovelace" in "ada-lovelace"', () => {
            const message = { subject: 'Message from ada-lovelace' };
            searchManager.search('ada lovelace');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('finds "ada lovelace" in "ada_lovelace"', () => {
            const message = { body: 'Contact: ada_lovelace' };
            searchManager.search('ada lovelace');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('still finds exact matches', () => {
            const message = { subject: 'Hello Ada Lovelace' };
            searchManager.search('ada lovelace');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });
    });

    describe('multi-term search (AND logic)', () => {
        test('finds message where terms are in different fields', () => {
            const message = {
                senderEmail: 'linus@linux-foundation.org',
                subject: 'Important Security Update'
            };
            searchManager.search('linus security');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('finds message where one term is in email and one in body', () => {
            const message = {
                senderEmail: 'john@example.com',
                body: 'Please review the invoice attached'
            };
            searchManager.search('john invoice');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('does not find message if only one term matches', () => {
            const message = {
                senderEmail: 'linus@linux-foundation.org',
                subject: 'Hello World'
            };
            searchManager.search('linus security');
            expect(searchManager.matchesQuery(message)).toBe(false);
        });

        test('works with three or more terms', () => {
            const message = {
                senderName: 'John Doe',
                subject: 'Meeting Tomorrow',
                body: 'Discuss the project timeline'
            };
            searchManager.search('john meeting project');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });

        test('single term still works', () => {
            const message = { subject: 'Security Update' };
            searchManager.search('security');
            expect(searchManager.matchesQuery(message)).toBe(true);
        });
    });

    describe('searchDebounced', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('calls callback after delay', () => {
            const callback = jest.fn();
            searchManager.searchDebounced('Meeting', callback, 300);

            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(expect.any(Array));
        });

        test('uses default delay of 300ms', () => {
            const callback = jest.fn();
            searchManager.searchDebounced('Meeting', callback);

            jest.advanceTimersByTime(299);
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalled();
        });

        test('cancels previous debounce on new search', () => {
            const callback = jest.fn();

            searchManager.searchDebounced('First', callback, 300);
            jest.advanceTimersByTime(200);

            searchManager.searchDebounced('Second', callback, 300);
            jest.advanceTimersByTime(300);

            expect(callback).toHaveBeenCalledTimes(1);
            // Should be called with results for 'Second', not 'First'
            expect(searchManager.getQuery()).toBe('second');
        });
    });

    describe('clearSearch', () => {
        test('resets current query to empty', () => {
            searchManager.search('test');
            searchManager.clearSearch();
            expect(searchManager.getQuery()).toBe('');
        });

        test('returns all messages', () => {
            searchManager.search('test');
            const results = searchManager.clearSearch();
            expect(results).toEqual(mockMessages);
        });

        test('clears pending debounce timer', () => {
            jest.useFakeTimers();
            const callback = jest.fn();

            searchManager.searchDebounced('test', callback, 300);
            searchManager.clearSearch();

            jest.advanceTimersByTime(500);
            expect(callback).not.toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('getQuery', () => {
        test('returns current query', () => {
            searchManager.search('test');
            expect(searchManager.getQuery()).toBe('test');
        });

        test('returns empty string initially', () => {
            expect(searchManager.getQuery()).toBe('');
        });
    });

    describe('highlightMatches', () => {
        beforeEach(() => {
            searchManager.currentQuery = 'test';
        });

        test('wraps matched text with mark tag', () => {
            const result = searchManager.highlightMatches('This is a test string');
            expect(result).toBe('This is a <mark class="search-highlight">test</mark> string');
        });

        test('highlights all occurrences', () => {
            const result = searchManager.highlightMatches('test one test two test');
            expect(result).toContain('<mark class="search-highlight">test</mark> one');
            expect(result).toContain('<mark class="search-highlight">test</mark> two');
        });

        test('is case insensitive', () => {
            const result = searchManager.highlightMatches('TEST Test test');
            expect(result.match(/<mark/g)).toHaveLength(3);
        });

        test('returns original text when no query', () => {
            searchManager.currentQuery = '';
            const result = searchManager.highlightMatches('some text');
            expect(result).toBe('some text');
        });

        test('returns original text when text is empty', () => {
            const result = searchManager.highlightMatches('');
            expect(result).toBe('');
        });

        test('returns original text when text is null', () => {
            const result = searchManager.highlightMatches(null);
            expect(result).toBeNull();
        });
    });

    describe('escapeRegex', () => {
        test('escapes special regex characters', () => {
            const input = '.*+?^${}()|[]\\';
            const result = searchManager.escapeRegex(input);
            expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
        });

        test('does not escape normal characters', () => {
            const result = searchManager.escapeRegex('abc123');
            expect(result).toBe('abc123');
        });
    });

    describe('isSearchActive', () => {
        test('returns false when query is empty', () => {
            expect(searchManager.isSearchActive()).toBe(false);
        });

        test('returns true when query has content', () => {
            searchManager.search('test');
            expect(searchManager.isSearchActive()).toBe(true);
        });
    });

    describe('getResultCount', () => {
        test('returns total message count when no search active', () => {
            expect(searchManager.getResultCount()).toBe(3);
        });

        test('returns filtered count when search is active', () => {
            searchManager.search('Meeting');
            expect(searchManager.getResultCount()).toBe(1);
        });

        test('returns 0 when no matches', () => {
            searchManager.search('nonexistent');
            expect(searchManager.getResultCount()).toBe(0);
        });
    });
});
