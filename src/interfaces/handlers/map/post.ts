import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MapRepository } from '../../../infrastructure/firebase/persistence/map/MapRepository';
import { CreatePointInfoUseCase } from '../../../application/usecases/map/CreatePointInfoUseCase';
import { ThreadRepository } from '../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { ThreadCreateUseCase } from '../../../application/usecases/timeline/ThreadCreateUseCase';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../util';

const mapRepository = new MapRepository();
const useCase = new CreatePointInfoUseCase(mapRepository);
const threadRepository = new ThreadRepository();
const threadCreateUseCase = new ThreadCreateUseCase(threadRepository);
const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreatePointInfoResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    threadId: string;
}

/**
 * POST /map - ポイント情報作成
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = handlerUtil.getAuthId(event);
        const user = await getUserUseCase.execute(authId!);

        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const { lat, lng, threadName, category } = requestBody;

        if (lat === undefined || lng === undefined || !threadName || !category) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['lat', 'lng', 'threadName', 'category'],
                }),
            };
        }

        const point = await useCase.execute({
            lat,
            lng,
            threadName,
            category,
        });

        // map上に関連したスレッドを立ち上げる
        const thred = await threadCreateUseCase.execute(
            threadName,
            user!.userId.getValue(),
            undefined,
            point.id
        );
        const responseBody: CreatePointInfoResponse = {
            ...point,
            threadId: thred.toPrimitives().id,
        }

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in createPointInfoHandler:', error);
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