import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler as postHandler } from './post';
import { lambdaHandler as listHandler } from './list';

export const lambdaHandler: APIGatewayProxyHandler = async (
    event,
    context,
    callback,
): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'POST') {
        return postHandler(event, context, callback) as Promise<APIGatewayProxyResult>;
    } else if (event.httpMethod === 'GET') {
        return listHandler(event, context, callback) as Promise<APIGatewayProxyResult>;
    } else if (event.httpMethod === 'OPTIONS') {
        return listHandler(event, context, callback) as Promise<APIGatewayProxyResult>;
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    };
};
