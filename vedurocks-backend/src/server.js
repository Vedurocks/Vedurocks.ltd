const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config/auth');
const authRoutes = require('./routes/auth');

const app = express();

// Security middleware
app.use(helmet());

// CORS - Allow frontend to communicate with backend
app.use(cors({
    origin: config.frontendUrl,
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser(config.cookie.secret));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
    console.log(`
    🚀 Vedurocks Backend Server
    ==========================
    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${config.port}
    Frontend: ${config.frontendUrl}
    
    Available endpoints:
    - GET  /api/health
    - GET  /api/auth/github (Start OAuth)
    - GET  /api/auth/github/callback (OAuth callback)
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/logout
    - GET  /api/auth/me (Protected)
    `);
});
