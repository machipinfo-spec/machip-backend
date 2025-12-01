import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class HandlerUtil {
    getAuthId(event: APIGatewayProxyEvent): string | null {
        let authId = event.requestContext.authorizer?.claims?.sub;
        if (!authId) {
            authId = this.extractAuthIdFromToken(event);
        }
        return authId;
    }
    extractAuthIdFromToken(event: APIGatewayProxyEvent): string | null {
        try {
            const authHeader = event.headers.Authorization || event.headers.authorization;
            if (!authHeader) {
                return null;
            }

            const token = authHeader.replace('Bearer ', '');
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            return payload.sub || null;
        } catch (error) {
            console.error('Token decode error:', error);
            return null;
        }
    }
}