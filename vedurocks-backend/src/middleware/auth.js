const jwt = require('jsonwebtoken');
const config = require('../config/auth');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id || user.id,
            email: user.email,
            provider: user.provider
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

// Verify JWT from cookie or header
const authenticateToken = (req, res, next) => {
    try {
        // Check cookie first
        let token = req.cookies?.token;
        
        // Check Authorization header
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Optional auth (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = decoded;
        }
    } catch {
        // Ignore error
    }
    next();
};

module.exports = {
    generateToken,
    authenticateToken,
    optionalAuth
};
