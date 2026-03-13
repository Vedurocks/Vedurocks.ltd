const axios = require('axios');
const config = require('../config/auth');

class GitHubService {
    /**
     * Exchange authorization code for access token
     * This is the CRITICAL step that must happen on the backend
     */
    async exchangeCodeForToken(code) {
        try {
            const response = await axios.post(
                config.github.tokenUrl,
                {
                    client_id: config.github.clientId,
                    client_secret: config.github.clientSecret,
                    code: code,
                    redirect_uri: config.github.callbackUrl
                },
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (response.data.error) {
                throw new Error(response.data.error_description || 'Token exchange failed');
            }

            return {
                accessToken: response.data.access_token,
                scope: response.data.scope,
                tokenType: response.data.token_type
            };
        } catch (error) {
            console.error('GitHub token exchange error:', error.message);
            throw new Error('Failed to exchange code for token');
        }
    }

    /**
     * Fetch user data from GitHub API
     */
    async getUserData(accessToken) {
        try {
            // Get basic user info
            const userResponse = await axios.get(`${config.github.apiUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            // Get user emails (to find primary email)
            const emailsResponse = await axios.get(`${config.github.apiUrl}/user/emails`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const primaryEmail = emailsResponse.data.find(e => e.primary && e.verified)?.email 
                || emailsResponse.data[0]?.email 
                || `${userResponse.data.login}@users.noreply.github.com`;

            return {
                id: userResponse.data.id,
                username: userResponse.data.login,
                name: userResponse.data.name || userResponse.data.login,
                email: primaryEmail,
                avatar: userResponse.data.avatar_url,
                bio: userResponse.data.bio,
                location: userResponse.data.location,
                company: userResponse.data.company,
                githubUrl: userResponse.data.html_url
            };
        } catch (error) {
            console.error('GitHub API error:', error.message);
            throw new Error('Failed to fetch user data from GitHub');
        }
    }

    /**
     * Generate GitHub authorization URL
     */
    getAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: config.github.clientId,
            redirect_uri: config.github.callbackUrl,
            scope: 'user:email read:user',
            state: state,
            allow_signup: 'true'
        });

        return `${config.github.authorizeUrl}?${params.toString()}`;
    }
}

module.exports = new GitHubService();
