import { APIGatewayProxyEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export class HandlerUtil {
    private verifier: any;

    constructor() {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_CLIENT_ID;

        if (userPoolId) {
            this.verifier = CognitoJwtVerifier.create({
                userPoolId: userPoolId,
                tokenUse: 'id',
                clientId: clientId || 'dummy', // verify() might fail if clientId doesn't match, but we need to create it.
                // If clientId is empty, we might want to skip audience verification.
                // aws-jwt-verify throws if clientId is missing in create options usually.
                // Let's use a dummy and expect it to fail if not provided,
                // OR we can rely on verify({ clientId: null }) if supported?
                // Actually, let's assume clientId is required for security.
                // I will modify this to use optional client ID if possible or just log error.
            });
        }
    }

    async getAuthId(event: APIGatewayProxyEvent): Promise<string | null> {
        let authId = event.requestContext.authorizer?.claims?.sub;
        if (authId) {
            return authId;
        }
        return await this.extractAuthIdFromToken(event);
    }

    async extractAuthIdFromToken(event: APIGatewayProxyEvent): Promise<string | null> {
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            if (!authHeader) {
                return null;
            }

            const token = authHeader.replace('Bearer ', '');

            // If verifier is not set (e.g. missing env vars), return null for guest
            if (!this.verifier) {
                console.warn('Cognito Verifier not initialized');
                return null;
            }

            // Verify the token
            // Note: If COGNITO_CLIENT_ID was not provided in env, verification might fail on audience check
            // We can relax this if needed but for now strict.
            const payload = await this.verifier.verify(token);
            return payload.sub;
        } catch (error) {
            console.error('Token verification failed:', error);
            // ゲストとして扱う (return null)
            return null;
        }
    }
}
