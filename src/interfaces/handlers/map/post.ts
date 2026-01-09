import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MapRepository } from '../../../infrastructure/firebase/persistence/map/MapRepository';
import { CreatePointInfoUseCase } from '../../../application/usecases/map/CreatePointInfoUseCase';
import { ThreadRepository } from '../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { ThreadCreateUseCase } from '../../../application/usecases/timeline/ThreadCreateUseCase';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../util';
import { ReverseGeocodingRepository } from '../../../infrastructure/gcp/persistence/ReverseGeocodingRepository';
import { ProfileRepository } from '../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { MessageSendingService } from '../../../application/services/inbox/MessageSendingService';
import { MessageBroadcastRepository } from '../../../infrastructure/firebase/persistence/inbox/MessageBroadcastRepository';
import { MessageRepository } from '../../../infrastructure/firebase/persistence/inbox/MessageRepository';
import { UserMessageRepository } from '../../../infrastructure/firebase/persistence/inbox/UserMessageRepository';
import { Logger } from '../../../shared/logger';
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
const useCase = new CreatePointInfoUseCase(mapRepository, reverseGeocodingRepository, messageSendingService);

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'your-bucket-name';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

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
    imageBase64?: string;
    selectedDate?: string;
}

interface CreatePointInfoResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    threadId: string;
    imageUrl: string | null;
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
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const { lat, lng, threadName, category, imageBase64, selectedDate } = requestBody;

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

        let imageBytes: Buffer | undefined;
        if (imageBase64) {
            // ------------------------------------
            // ★ Base64文字列 → バイナリへ変換
            // ------------------------------------
            try {
                // 「data:image/png;base64,xxxxxxxx」の場合はプレフィックス除去
                const base64Data = imageBase64.replace(/^data:.*;base64,/, '');
                imageBytes = Buffer.from(base64Data, 'base64');
            } catch (err) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Invalid Base64 image' }),
                };
            }
        }

        const selectDate = selectedDate ? new Date(selectedDate) : null;
        const pointCreateResponse = await useCase.execute({
            lat,
            lng,
            threadName,
            category,
            selectDate: selectDate,
            imageBuffer: imageBytes || null,
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

        // map上に関連したスレッドを立ち上げる
        const threadCreateResponse = await threadCreateUseCase.execute(
            threadName,
            user.userId.getValue(),
            null,
            point.getId().getValue(),
            imageBytes || null,
            selectDate,
            point.getAddress(),
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
            threadName: point.getThreadName().getValue(),
            category: point.getCategory().getValue(),
            threadId: threadCreateResponse.thread.threadId,
            imageUrl: threadCreateResponse.thread.imageUrl || null,
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
