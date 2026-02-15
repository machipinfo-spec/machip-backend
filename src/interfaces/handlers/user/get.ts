import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../infrastructure/aws/dynamo/user/DynamoUserRepository';

const repository = new DynamoUserRepository();
const useCase = new GetUserUseCase(repository);
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
};

interface GetUserResponse {
    authId: string;
    userId: string;
    name: string;
    email: string;
}

/**
 * Authorization ヘッダーからトークンをデコード
 */
function extractAuthIdFromToken(event: APIGatewayProxyEvent): string | null {
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

/**
 * GET /user - ユーザー取得
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // トークンから authId を取得
        let authId = event.requestContext.authorizer?.claims?.sub;
        // API Gateway の Cognito 認可が機能していない場合、トークンから直接取得
        if (!authId) {
            authId = extractAuthIdFromToken(event);
        }

        if (!authId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: No valid token' }),
            };
        }

        const user = await useCase.execute(authId);

        if (!user) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'User not found' }),
            };
        }

        const responseBody: GetUserResponse = {
            authId: authId,
            userId: user.userId.getValue(),
            name: user.name.getValue(),
            email: user.email.getValue(),
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in getUserHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

// メイン用の lambdaHandler (単独で使用する場合)
export const lambdaHandler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: '',
        };
    }
    return handler(event);
};
