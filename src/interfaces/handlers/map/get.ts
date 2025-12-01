import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MapRepository } from '../../../infrastructure/firebase/persistence/map/MapRepository';
import { GetPointInfoListUseCase } from '../../../application/usecases/map/GetPointInfoListUseCase';

const mapRepository = new MapRepository();
const useCase = new GetPointInfoListUseCase(mapRepository);

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
}

/**
 * GET /map - ポイント情報リスト取得
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
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