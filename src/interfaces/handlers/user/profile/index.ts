// handlers/profile/index.ts

import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { handler as getHandler } from './get';
import { handler as postHandler } from './post';
import { handler as putHandler } from './put';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * プロフィール管理統合ハンドラー
 * HTTPメソッドに応じて各ハンドラーに処理を委譲
 */
export const lambdaHandler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    try {
        // CORS対応
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: '',
            };
        }

        // HTTPメソッドに応じて既存のハンドラーに処理を委譲
        switch (event.httpMethod) {
            case 'GET':
                return await getHandler(event);
            case 'POST':
                return await postHandler(event);
            case 'PUT':
                return await putHandler(event);
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Method Not Allowed' }),
                };
        }
    } catch (error: any) {
        console.error('Error in profileHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message
            }),
        };
    }
};