/**
 * Offline test helper — replaces @vitalets/google-translate-api with a
 * pass-through so unit/e2e tests never hit Google Translate rate limits.
 */
module.exports = {
    translate: async (text) => ({ text: String(text) }),
};
