const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config/auth');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter auth limits
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookies
app.use(cookieParser(config.cookie.secret));

// Connect to database (optional - falls back to memory)
connectDB().then(connected => {
    if (connected) {
        console.log('✅ Using MongoDB for storage');
    } else {
        console.log('⚠️  Using in-memory storage (data will be lost on restart)');
    }
});

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: mongoose?.connection?.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        message: 'Vedurocks API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            health: '/api/health'
        }
    });
});

// Error handling
app.use(errorHandler);

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(config.port, () => {
    console.log(`
    ╔════════════════════════════════════════════════╗
    ║                                                ║
    ║   🚀 Vedurocks API Server                      ║
    ║                                                ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(24 - (process.env.NODE_ENV || 'development').length)}║
    ║   Port: ${config.port}${' '.repeat(35)}║
    ║   Frontend: ${config.frontendUrl}${' '.repeat(31 - config.frontendUrl.length)}║
    ║                                                ║
    ║   Endpoints:                                   ║
    ║   • GET  /api/health                           ║
    ║   • GET  /api/auth/github                      ║
    ║   • GET  /api/auth/github/callback             ║
    ║   • POST /api/auth/register                    ║
    ║   • POST /api/auth/login                       ║
    ║   • POST /api/auth/logout                      ║
    ║   • GET  /api/auth/me                          ║
    ║                                                ║
    ╚════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
