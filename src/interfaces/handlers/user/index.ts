import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { handler as getHandler } from './get';
import { handler as postHandler } from './post';
import { handler as deleteHandler } from './delete';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * ユーザー管理統合ハンドラー（既存ファイルを活用）
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
            case 'DELETE':
                return await deleteHandler(event);
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Method Not Allowed' }),
                };
        }
    } catch (error: any) {
        console.error('Error in userHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};
