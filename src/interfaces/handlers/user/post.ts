import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateUserUseCase } from '../../../application/usecases/user/CreateUserUseCase';
import { DynamoUserRepository } from '../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { HandlerUtil } from '../util';

const userRepository = new DynamoUserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateUserResponse {
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
 * POST /user - ユーザー作成
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);
        const claims = event.requestContext.authorizer?.claims as { [key: string]: any } | undefined;
        let email = claims?.email;
        const userName = claims?.['cognito:username'] ?? null;

        if (!authId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: No valid token' }),
            };
        }

        // リクエストボディの解析
        // if (!event.body) {
        //     return {
        //         statusCode: 400,
        //         headers: corsHeaders,
        //         body: JSON.stringify({ message: 'Request body is required' }),
        //     };
        // }

        // 必須フィールドの検証
        if (!email || !userName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['name', 'email'],
                }),
            };
        }

        const user = await createUserUseCase.execute(authId, userName, email);

        const responseBody: CreateUserResponse = {
            authId: authId,
            userId: user.userId.getValue(),
            name: user.name.getValue(),
            email: user.email.getValue(),
        };

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in createUserHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

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
