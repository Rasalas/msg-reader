/**
 * CID Reference Replacer Module
 * Handles replacement of Content-ID (cid:) references in HTML email content
 * with base64 encoded attachment data
 */

import { escapeRegex, tryUrlDecoded, cleanContentId, isImageMimeType } from './helpers.js';
import { PLACEHOLDER_IMAGE_SVG } from './constants.js';

/**
 * Builds an array of regex patterns to match CID references
 * @param {string} contentId - The Content-ID value
 * @param {string} fileName - The attachment filename
 * @returns {string[]} Array of regex pattern strings
 */
export function buildCidPatterns(contentId, fileName) {
    const patterns = [];
    const cidIdWithoutBrackets = cleanContentId(contentId);
    const urlDecodedCid = cidIdWithoutBrackets ? tryUrlDecoded(cidIdWithoutBrackets) : null;

    if (cidIdWithoutBrackets) {
        // Standard cid: patterns
        patterns.push(`src=["']?cid:${escapeRegex(cidIdWithoutBrackets)}["']?`);
        patterns.push(`src=["']?cid:<${escapeRegex(cidIdWithoutBrackets)}>["']?`);
        // Without cid: prefix (some email clients use direct references)
        patterns.push(`src=["']?${escapeRegex(cidIdWithoutBrackets)}["']?`);
        // With trailing content (e.g., cid:id@domain:1)
        patterns.push(`src=["']?cid:${escapeRegex(cidIdWithoutBrackets)}[^"'\\s>]*["']?`);

        // URL-decoded version if different
        if (urlDecodedCid) {
            patterns.push(`src=["']?cid:${escapeRegex(urlDecodedCid)}["']?`);
            patterns.push(`src=["']?${escapeRegex(urlDecodedCid)}["']?`);
        }
    }

    // Filename-based patterns (fallback when CID is missing or doesn't match)
    if (fileName) {
        // cid:filename.ext pattern (common in Outlook)
        patterns.push(`src=["']?cid:${escapeRegex(fileName)}["']?`);
        // cid:filename.ext with trailing content
        patterns.push(`src=["']?cid:${escapeRegex(fileName)}[^"'\\s>]*["']?`);
        // Just filename (relative reference)
        patterns.push(`src=["']?${escapeRegex(fileName)}["']?`);
    }

    return patterns;
}

/**
 * Replaces a single image CID reference with base64 data
 * @param {string} html - The HTML content
 * @param {Object} attachment - The attachment object
 * @returns {string} HTML with replaced CID references
 */
export function replaceImageCid(html, attachment) {
    const contentId = attachment.pidContentId || attachment.contentId || '';
    const fileName = attachment.fileName || '';
    const base64String = attachment.contentBase64;

    const patterns = buildCidPatterns(contentId, fileName);

    let result = html;
    patterns.forEach(pattern => {
        result = result.replace(
            new RegExp(pattern, 'gi'),
            `src="${base64String}"`
        );
    });

    return result;
}

/**
 * Replaces href CID references for non-image attachments
 * @param {string} html - The HTML content
 * @param {Object} attachment - The attachment object
 * @returns {string} HTML with replaced href references
 */
export function replaceHrefCid(html, attachment) {
    const contentId = attachment.pidContentId || attachment.contentId || '';
    if (!contentId) return html;

    const cidIdWithoutBrackets = cleanContentId(contentId);
    const base64String = attachment.contentBase64;

    return html.replace(
        new RegExp(`href=["']?cid:${escapeRegex(cidIdWithoutBrackets)}["']?`, 'gi'),
        `href="${base64String}"`
    );
}

/**
 * Replaces all CID references in HTML with base64 attachment data
 * @param {string} html - The HTML content containing cid: references
 * @param {Object[]} attachments - Array of attachment objects with contentBase64, contentId, fileName, attachMimeTag
 * @returns {string} HTML with all CID references replaced
 */
export function replaceCidReferences(html, attachments) {
    if (!html) {
        return '';
    }

    let result = html;

    // Process each attachment if we have any
    if (attachments && attachments.length > 0) {
        attachments.forEach(attachment => {
            if (!attachment.contentBase64) return;

            if (isImageMimeType(attachment.attachMimeTag)) {
                // Image attachments: replace src references
                result = replaceImageCid(result, attachment);
            } else if (attachment.contentId || attachment.pidContentId) {
                // Non-image attachments: replace href references
                result = replaceHrefCid(result, attachment);
            }
        });
    }

    // Replace remaining unmatched cid: references with placeholder
    result = result.replace(
        /src=["']?cid:[^"'\s>]+["']?/gi,
        `src="${PLACEHOLDER_IMAGE_SVG}"`
    );

    return result;
}
