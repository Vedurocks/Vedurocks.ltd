require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: process.env.GITHUB_CALLBACK_URL,
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
};
