const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    port: process.env.PORT || 8080,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: isProd 
            ? `https://${process.env.FLY_APP_NAME}.fly.dev/api/auth/github/callback`
            : 'http://localhost:8080/api/auth/github/callback',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        apiUrl: 'https://api.github.com'
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'your-fallback-secret-change-in-production',
        expiresIn: '7d'
    },
    
    cookie: {
        secret: process.env.COOKIE_SECRET || 'cookie-fallback-secret',
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
};
