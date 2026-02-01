import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoMapRepository } from '../../../infrastructure/aws/dynamo/map/DynamoMapRepository';
import { CreatePointInfoUseCase } from '../../../application/usecases/map/CreatePointInfoUseCase';
import { DynamoThreadRepository } from '../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { ThreadCreateUseCase } from '../../../application/usecases/timeline/ThreadCreateUseCase';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { HandlerUtil } from '../util';
import { ReverseGeocodingRepository } from '../../../infrastructure/gcp/persistence/ReverseGeocodingRepository';
import { DynamoProfileRepository } from '../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { MessageSendingService } from '../../../application/services/inbox/MessageSendingService';
import { DynamoMessageBroadcastRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoMessageBroadcastRepository';
import { DynamoMessageRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { Logger } from '../../../shared/logger';

import { DynamoPointEventRepository } from '../../../infrastructure/aws/dynamo/map/DynamoPointEventRepository';

import { InboxNotificationService } from '../../../application/services/inbox/InboxNotificationService';
import { FirebasePushNotificationService } from '../../../infrastructure/firebase/notification/FirebasePushNotificationService';
import { DynamoDeviceTokenRepository } from '../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';

const reverseGeocodingRepository = new ReverseGeocodingRepository();
const mapRepository = new DynamoMapRepository();
const pointEventRepository = new DynamoPointEventRepository();
const threadRepository = new DynamoThreadRepository();
const profileRepository = new DynamoProfileRepository();
const messageRepository = new DynamoMessageRepository();
const userMessageRepository = new DynamoUserMessageRepository();
const messageBroadcastRepository = new DynamoMessageBroadcastRepository();
const userRepository = new DynamoUserRepository();

const deviceTokenRepository = new DynamoDeviceTokenRepository();
const pushNotificationService = new FirebasePushNotificationService(deviceTokenRepository);
const inboxNotificationService = new InboxNotificationService(pushNotificationService);

const messageSendingService = new MessageSendingService(
    profileRepository,
    messageRepository,
    userMessageRepository,
    messageBroadcastRepository,
    userRepository,
    inboxNotificationService,
    new Logger('MessageSendingService'),
);
const threadCreateUseCase = new ThreadCreateUseCase(threadRepository, profileRepository, messageSendingService);
const getUserUseCase = new GetUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();
const useCase = new CreatePointInfoUseCase(
    mapRepository,
    pointEventRepository,
    reverseGeocodingRepository,
    messageSendingService,
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreatePointInfoRequest {
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    imageUrl?: string;
    // selectedDate removed
    startDate?: string;
    endDate?: string;
    detail?: string;
    url?: string;
}

interface CreatePointInfoResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    threadId: string;
    imageUrl: string | null;
    startDate: string | null;
    endDate: string | null;
    detail: string | null;
    url: string | null;
}

/**
 * POST /map - ポイント情報作成
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);
        const user = await getUserUseCase.execute(authId!);

        if (!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: CreatePointInfoRequest;
        try {
            let body = event.body;
            if (event.isBase64Encoded) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            requestBody = JSON.parse(body || '{}');
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const { lat, lng, threadName, category, imageUrl, detail, url, startDate, endDate } = requestBody;

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

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Use updated UseCase with imageUrl
        const pointCreateResponse = await useCase.execute({
            lat,
            lng,
            threadName,
            category,
            // selectDate removed
            startDate: start,
            endDate: end,
            detail: detail || null,
            url: url || null,
            imageUrl: imageUrl || null,
            userId: user.userId.getValue(),
        });

        if (pointCreateResponse.error || !pointCreateResponse.pointInfo) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to create point info', error: pointCreateResponse.error }),
            };
        }
        const point = pointCreateResponse.pointInfo;
        const pointEvent = pointCreateResponse.pointEvent;

        // map上に関連したスレッドを立ち上げる
        const threadCreateResponse = await threadCreateUseCase.execute(
            threadName,
            user.userId.getValue(),
            point.getId().getValue(),
            imageUrl || null,
            null, // parentThreadId
        );
        if (threadCreateResponse.error || !threadCreateResponse.thread) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Failed to create thread for point info',
                    error: threadCreateResponse.error,
                }),
            };
        }

        const responseBody: CreatePointInfoResponse = {
            id: point.getId().getValue(),
            lat: point.getGeoLocation().getLat(),
            lng: point.getGeoLocation().getLng(),
            threadName: threadName,
            category: point.getCategory().getValue(),
            threadId: threadCreateResponse.thread.threadId,
            imageUrl: threadCreateResponse.thread.imageUrl || null,
            startDate: pointEvent?.getStartDate().toISOString() || null,
            endDate: pointEvent?.getEndDate().toISOString() || null,
            detail: pointEvent?.getDetail() || null,
            url: pointEvent?.getUrl() || null,
        };

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
