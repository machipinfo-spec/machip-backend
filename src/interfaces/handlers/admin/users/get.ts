import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { AdminUserListUseCase } from '../../../../application/usecases/admin/AdminUserListUseCase';

const userRepository = new DynamoUserRepository();
const profileRepository = new DynamoProfileRepository();

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    console.log('AdminUserListHandler invoked');

    // Dynamic CORS handling
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://tetra-web-chi.vercel.app'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: '',
        };
    }

    try {
        // Query parameters
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit || '20', 10);
        const search = queryParams.search;
        const nextToken = queryParams.nextToken;

        const useCase = new AdminUserListUseCase(userRepository, profileRepository);
        const result = await useCase.execute(limit, search, nextToken);

        const responseBody = {
            items: result.users,
            nextToken: result.nextToken,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in AdminUserListHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

export const lambdaHandler = handler;
