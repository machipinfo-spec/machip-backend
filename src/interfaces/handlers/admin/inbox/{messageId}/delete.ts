import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteSystemMessageUseCase } from '../../../../../application/usecases/admin/DeleteSystemMessageUseCase';
import { DynamoMessageRepository } from '../../../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';

const messageRepository = new DynamoMessageRepository();

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://tetra-web-chi.vercel.app'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
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
        const messageId = event.pathParameters?.messageId;
        if (!messageId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing messageId' }),
            };
        }

        const useCase = new DeleteSystemMessageUseCase(messageRepository);
        await useCase.execute(messageId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Deleted successfully' }),
        };
    } catch (error: any) {
        console.error('Error in AdminDeleteHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

export const lambdaHandler = handler;
