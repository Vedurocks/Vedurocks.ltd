const axios = require('axios');
const config = require('../config/auth');

class GitHubService {
    async exchangeCodeForToken(code) {
        try {
            const response = await axios.post(
                config.github.tokenUrl,
                {
                    client_id: config.github.clientId,
                    client_secret: config.github.clientSecret,
                    code: code
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
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

    async getUserData(accessToken) {
        try {
            const [userResponse, emailsResponse] = await Promise.all([
                axios.get(`${config.github.apiUrl}/user`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 10000
                }),
                axios.get(`${config.github.apiUrl}/user/emails`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 10000
                })
            ]);

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
                blog: userResponse.data.blog,
                githubUrl: userResponse.data.html_url
            };
        } catch (error) {
            console.error('GitHub API error:', error.message);
            throw new Error('Failed to fetch user data from GitHub');
        }
    }

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
