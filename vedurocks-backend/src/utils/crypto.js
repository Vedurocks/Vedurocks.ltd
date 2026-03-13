const crypto = require('crypto');

// Generate cryptographically secure random string
function generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Generate PKCE code challenge (for enhanced security)
function generatePKCE() {
    const verifier = generateRandomString(128);
    const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    return { verifier, challenge };
}

module.exports = {
    generateRandomString,
    generatePKCE
};
