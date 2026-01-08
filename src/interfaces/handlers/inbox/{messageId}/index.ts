import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { handler as getHandler } from './get';
import { handler as deleteHandler } from './delete';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,DELETE,PUT,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * マップ管理統合ハンドラー
 */
export const lambdaHandler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: '',
            };
        }

        switch (event.httpMethod) {
            case 'GET':
                return await getHandler(event);
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
        console.error('Error in inboxHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};
