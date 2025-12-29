import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MapRepository } from '../../../infrastructure/firebase/persistence/map/MapRepository';
import { GetPointInfoListUseCase } from '../../../application/usecases/map/GetPointInfoListUseCase';
import { HandlerUtil } from '../util';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';

const mapRepository = new MapRepository();
const useCase = new GetPointInfoListUseCase(mapRepository);
const handlerUtil = new HandlerUtil();
const userRepository = new UserRepository();
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
    selectDate: Date | null;
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
        console.log('GetPointInfoListResponse:', responseBody);

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
