const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const githubService = require('../services/github');
const { generateToken } = require('../middleware/auth');
const { generateRandomString } = require('../utils/crypto');
const config = require('../config/auth');

// In-memory storage (Replace with database in production)
const users = new Map(); // email -> user data
const oauthStates = new Map(); // state -> { createdAt, provider }

// Clean up old states periodically
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) { // 10 minutes
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * GET /api/auth/github
 * Step 1: Initiate GitHub OAuth flow
 */
router.get('/github', (req, res) => {
    // Generate state parameter for CSRF protection
    const state = generateRandomString(32);
    oauthStates.set(state, { createdAt: Date.now(), provider: 'github' });
    
    // Generate authorization URL
    const authUrl = githubService.getAuthorizationUrl(state);
    
    res.json({ url: authUrl, state });
});

/**
 * GET /api/auth/github/callback
 * Step 2: Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Handle GitHub errors
        if (error) {
            console.error('GitHub OAuth error:', error, error_description);
            return res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(error_description || error)}`);
        }

        // Validate state parameter (CSRF protection)
        if (!state || !oauthStates.has(state)) {
            console.error('Invalid or expired state parameter');
            return res.redirect(`${config.frontendUrl}?error=invalid_state`);
        }
        oauthStates.delete(state); // Use once

        if (!code) {
            return res.redirect(`${config.frontendUrl}?error=no_code`);
        }

        // Step 3: Exchange code for token (BACKEND ONLY - secure)
        const tokenData = await githubService.exchangeCodeForToken(code);
        
        // Step 4: Fetch user data from GitHub
        const githubUser = await githubService.getUserData(tokenData.accessToken);

        // Step 5: Find or create user in database
        let user = users.get(githubUser.email);
        
        if (!user) {
            // Create new user
            user = {
                id: `github_${githubUser.id}`,
                email: githubUser.email,
                name: githubUser.name,
                avatar: githubUser.avatar,
                provider: 'github',
                providerId: githubUser.id,
                username: githubUser.username,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            users.set(githubUser.email, user);
        } else {
            // Update last login
            user.lastLogin = new Date().toISOString();
            user.name = githubUser.name; // Update name if changed
            user.avatar = githubUser.avatar;
        }

        // Step 6: Generate JWT
        const token = generateToken(user);

        // Step 7: Set HTTP-only cookie (secure)
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        // Also return token in URL for frontend to store (optional, for SPA)
        // In production, prefer cookies only
        res.redirect(`${config.frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

    } catch (error) {
        console.error('GitHub callback error:', error);
        res.redirect(`${config.frontendUrl}?error=auth_failed`);
    }
});

/**
 * POST /api/auth/register
 * Email/password registration
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user exists
        if (users.has(email)) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: `local_${Date.now()}`,
            email,
            name,
            password: hashedPassword,
            provider: 'email',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        users.set(email, user);

        // Generate token
        const token = generateToken(user);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        // Return user (without password)
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword, token });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Email/password login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has password (GitHub users might not)
        if (!user.password) {
            return res.status(401).json({ error: 'Please login with your OAuth provider' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();

        // Generate token
        const token = generateToken(user);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/'
    });
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
    const user = users.get(req.user.email);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

module.exports = router;
