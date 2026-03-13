const jwt = require('jsonwebtoken');
const config = require('../config/auth');

// Verify JWT token from cookie or Authorization header
function authenticateToken(req, res, next) {
    try {
        // Check for token in cookies first (more secure)
        let token = req.cookies?.token;
        
        // Fallback to Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
}

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id,
            email: user.email,
            provider: user.provider 
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

// Optional: Check if user is authenticated (soft check)
function optionalAuth(req, res, next) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = decoded;
        }
        next();
    } catch {
        next();
    }
}

module.exports = {
    authenticateToken,
    generateToken,
    optionalAuth
};
