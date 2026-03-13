require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    port: process.env.PORT || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: isProd 
            ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/github/callback`  // Auto-set by Render
            : 'http://localhost:5000/api/auth/github/callback',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        apiUrl: 'https://api.github.com'
    },
    
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    
    cookie: {
        secret: process.env.COOKIE_SECRET,
        secure: isProd,  // true in production (HTTPS)
        sameSite: isProd ? 'none' : 'lax',  // 'none' for cross-domain in prod
        domain: isProd ? undefined : undefined  // Set your domain if needed
    }
};
