const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const githubService = require('../services/github');
const { generateToken, authenticateToken } = require('../middleware/auth');
const config = require('../config/auth');

// In-memory state storage (use Redis in production)
const oauthStates = new Map();

// Clean up old states every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) { // 10 min expiry
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000);

// GET /api/auth/github - Start OAuth flow
router.get('/github', (req, res) => {
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, { createdAt: Date.now() });
    
    const authUrl = githubService.getAuthorizationUrl(state);
    res.json({ url: authUrl, state });
});

// GET /api/auth/github/callback - OAuth callback
router.get('/github/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error('GitHub OAuth error:', error);
            return res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(error_description || error)}`);
        }

        if (!state || !oauthStates.has(state)) {
            return res.redirect(`${config.frontendUrl}?error=invalid_state`);
        }
        oauthStates.delete(state);

        if (!code) {
            return res.redirect(`${config.frontendUrl}?error=no_code`);
        }

        // Exchange code for token
        const tokenData = await githubService.exchangeCodeForToken(code);
        const githubUser = await githubService.getUserData(tokenData.accessToken);

        // Find or create user
        let user = await User.findByEmail(githubUser.email);
        
        if (!user) {
            user = await User.createUser({
                email: githubUser.email,
                name: githubUser.name,
                username: githubUser.username,
                avatar: githubUser.avatar,
                bio: githubUser.bio,
                location: githubUser.location,
                provider: 'github',
                providerId: githubUser.id.toString(),
                lastLogin: new Date()
            });
        } else {
            // Update last login
            user.lastLogin = new Date();
            if (user.save) await user.save();
        }

        const token = generateToken(user);

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: config.cookie.maxAge,
            path: '/'
        });

        // Redirect to frontend with token
        res.redirect(`${config.frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

    } catch (error) {
        console.error('GitHub callback error:', error);
        res.redirect(`${config.frontendUrl}?error=auth_failed`);
    }
});

// POST /api/auth/register - Email registration
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.createUser({
            email: email.toLowerCase(),
            name: name.trim(),
            password: hashedPassword,
            provider: 'email',
            lastLogin: new Date()
        });

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: config.cookie.maxAge,
            path: '/'
        });

        const userResponse = { ...user };
        delete userResponse.password;

        res.status(201).json({ user: userResponse, token });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/login - Email login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        if (user.save) await user.save();

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: config.cookie.maxAge,
            path: '/'
        });

        const userResponse = { ...user };
        delete userResponse.password;

        res.json({ user: userResponse, token });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/'
    });
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userResponse = { ...user };
        delete userResponse.password;
        
        res.json(userResponse);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
