import { storage } from './storage.js';

export const INLINE_IMAGE_ATTACHMENT_VISIBILITY = {
    COLLAPSED: 'collapsed',
    EXPANDED: 'expanded'
};

export const INLINE_IMAGE_ATTACHMENT_STORAGE_KEY = 'msgReader_inlineImageAttachments';

export function getInlineImageAttachmentVisibility() {
    const savedValue = storage.get(
        INLINE_IMAGE_ATTACHMENT_STORAGE_KEY,
        INLINE_IMAGE_ATTACHMENT_VISIBILITY.COLLAPSED
    );

    return Object.values(INLINE_IMAGE_ATTACHMENT_VISIBILITY).includes(savedValue)
        ? savedValue
        : INLINE_IMAGE_ATTACHMENT_VISIBILITY.COLLAPSED;
}

export function setInlineImageAttachmentVisibility(visibility) {
    if (!Object.values(INLINE_IMAGE_ATTACHMENT_VISIBILITY).includes(visibility)) {
        return false;
    }

    return storage.set(INLINE_IMAGE_ATTACHMENT_STORAGE_KEY, visibility);
}

export function inlineImageAttachmentsExpandedByDefault() {
    return getInlineImageAttachmentVisibility() === INLINE_IMAGE_ATTACHMENT_VISIBILITY.EXPANDED;
}

