import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MapRepository } from '../../../../infrastructure/firebase/persistence/map/MapRepository';
import { CreateChatPointUseCase } from '../../../../application/usecases/map/CreateChatPointUseCase';
import { ThreadRepository } from '../../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { ThreadCreateUseCase } from '../../../../application/usecases/timeline/ThreadCreateUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../../util';
import { ReverseGeocodingRepository } from '../../../../infrastructure/gcp/persistence/ReverseGeocodingRepository';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { MessageSendingService } from '../../../../application/services/inbox/MessageSendingService';
import { MessageBroadcastRepository } from '../../../../infrastructure/firebase/persistence/inbox/MessageBroadcastRepository';
import { MessageRepository } from '../../../../infrastructure/firebase/persistence/inbox/MessageRepository';
import { UserMessageRepository } from '../../../../infrastructure/firebase/persistence/inbox/UserMessageRepository';
import { Logger } from '../../../../shared/logger';

const reverseGeocodingRepository = new ReverseGeocodingRepository();
const mapRepository = new MapRepository();
const threadRepository = new ThreadRepository();
const profileRepository = new ProfileRepository();
const messageRepository = new MessageRepository();
const userMessageRepository = new UserMessageRepository();
const messageBroadcastRepository = new MessageBroadcastRepository();
const userRepository = new UserRepository();
const messageSendingService = new MessageSendingService(
    profileRepository,
    messageRepository,
    userMessageRepository,
    messageBroadcastRepository,
    userRepository,
    new Logger('MessageSendingService'),
);
const threadCreateUseCase = new ThreadCreateUseCase(threadRepository, profileRepository, messageSendingService);
const getUserUseCase = new GetUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();
const useCase = new CreateChatPointUseCase(mapRepository, reverseGeocodingRepository, messageSendingService);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateChatPointRequest {
    lat: number;
    lng: number;
    threadName: string;
    imageUrl?: string;
}

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

        let requestBody: CreateChatPointRequest;
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

        const { lat, lng, threadName, imageUrl } = requestBody;

        if (lat === undefined || lng === undefined || !threadName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['lat', 'lng', 'threadName'],
                }),
            };
        }

        const response = await useCase.execute({
            lat,
            lng,
            threadName,
            imageUrl: imageUrl || null,
            userId: user.userId.getValue(),
        });

        if (response.error || !response.pointInfo) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to create chat point', error: response.error }),
            };
        }
        const point = response.pointInfo;

        // Create thread
        // Chat uses current time implies startDate/endDate might be null? Or current time?
        // If selectDate is removed, maybe chat threads don't have startDate/endDate unless specified?
        // User said "selectDate is unnecessary as it's period specified".
        // For chat, maybe no period?
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
                    message: 'Failed to create thread for chat point',
                    error: threadCreateResponse.error,
                }),
            };
        }

        const responseBody = {
            id: point.getId().getValue(),
            lat: point.getGeoLocation().getLat(),
            lng: point.getGeoLocation().getLng(),
            threadName: threadName,
            category: 'chat', // Fixed
            threadId: threadCreateResponse.thread.threadId,
            imageUrl: threadCreateResponse.thread.imageUrl || null,
        };

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in createChatPointHandler:', error);
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
