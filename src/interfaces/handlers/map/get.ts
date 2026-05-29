import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoMapRepository } from '../../../infrastructure/aws/dynamo/map/DynamoMapRepository';
import { DynamoThreadRepository } from '../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { DynamoPointEventRepository } from '../../../infrastructure/aws/dynamo/map/DynamoPointEventRepository';
import { GetPointInfoListUseCase } from '../../../application/usecases/map/GetPointInfoListUseCase';
import { HandlerUtil } from '../util';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../infrastructure/aws/dynamo/user/DynamoUserRepository';

const mapRepository = new DynamoMapRepository();
const threadRepository = new DynamoThreadRepository();
const pointEventRepository = new DynamoPointEventRepository();
const useCase = new GetPointInfoListUseCase(mapRepository, threadRepository, pointEventRepository);
const handlerUtil = new HandlerUtil();
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
};

interface GetPointInfoListResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    imageUrl: string | null;
    iconEmoji: string | null;
    iconColor: string | null;
}

/**
 * GET /map - ポイント情報リスト取得
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);
        if (authId) {
            const user = await getUserUseCase.execute(authId);
            if (!user) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
                };
            }
        }
        const { threadName, category, limit } = event.queryStringParameters || {};

        const points = await useCase.execute({
            threadName: threadName || undefined,
            category: category || undefined,
            limit: limit ? parseInt(limit, 10) : 50,
        });

        const responseBody: GetPointInfoListResponse[] = points;

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in getPointInfoListHandler:', error);
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
