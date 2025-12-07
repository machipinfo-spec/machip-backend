import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateUserUseCase } from '../../../application/usecases/user/CreateUserUseCase';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../util';

const userRepository = new UserRepository();
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
        let authId = handlerUtil.getAuthId(event);
        const claims = event.requestContext.authorizer?.claims as
        | { [key: string]: any }
        | undefined;
        let email = claims?.email;
        const userName = claims?.['cognito:username'] ?? null;

        // 2025-12-05T15:27:49.688Z	28f9ae8a-f46c-41f3-9a53-7c59b5f55ec7	INFO	claims: {
        // at_hash: 'JlIbSJNOKtKGS0497LwY4w',
        // sub: 'd794aa28-c0f1-7087-0f9d-df6fb3129cc7',
        // email_verified: 'true',
        // iss: 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_APNLl7tTu',
        // 'cognito:username': 'mossan',
        // origin_jti: '36cc4daf-613e-42ec-939b-7e97775cb9bf',
        // aud: '3h6mk52ts0npf15ruv45iir4c7',
        // event_id: '1817624a-380d-4abb-b8f9-6eec772554b5',
        // token_use: 'id',
        // auth_time: '1764948424',
        // nickname: 'しんちゃろ',
        // exp: 'Fri Dec 05 16:27:04 UTC 2025',
        // iat: 'Fri Dec 05 15:27:04 UTC 2025',
        // jti: '9e9999f5-8f02-4fb7-bbfb-e803c9870a6b',
        // email: 'mosamosa1228@gmail.com'
        // }


        console.log("claims")
        console.log(event.requestContext.authorizer?.claims)

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