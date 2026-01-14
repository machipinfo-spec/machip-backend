import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { UserRepository } from '../../../../../infrastructure/firebase/persistence/user/UserRepository';
import { ProfileRepository } from '../../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { AdminUserDetailUseCase } from '../../../../../application/usecases/admin/AdminUserDetailUseCase';

const userRepository = new UserRepository();
const profileRepository = new ProfileRepository();

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    console.log('AdminUserDetailHandler invoked');

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
        const userIdString = event.pathParameters?.userId;
        if (!userIdString) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing userId parameter' }),
            };
        }

        const useCase = new AdminUserDetailUseCase(userRepository, profileRepository);
        const result = await useCase.execute(userIdString);

        if (!result) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'User not found' }),
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        console.error('Error in AdminUserDetailHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

export const lambdaHandler = handler;
