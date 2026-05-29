import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoThreadRepository } from '../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { ThreadCreateUseCase } from '../../../application/usecases/timeline/ThreadCreateUseCase';
import { DynamoUserRepository } from '../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { DynamoProfileRepository } from '../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { MessageSendingService } from '../../../application/services/inbox/MessageSendingService';
import { DynamoMessageBroadcastRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoMessageBroadcastRepository';
import { DynamoMessageRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { Logger } from '../../../shared/logger';
import { InboxNotificationService } from '../../../application/services/inbox/InboxNotificationService';
import { FirebasePushNotificationService } from '../../../infrastructure/firebase/notification/FirebasePushNotificationService';
import { DynamoDeviceTokenRepository } from '../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';
import { SqsContentModerationQueue } from '../../../infrastructure/aws/sqs/SqsContentModerationQueue';
import { EnhancedDeepSeekApiRepository } from '../../../infrastructure/deep-seek/EnhancedDeepSeekApiRepository';
import { NewsService } from '../../../application/services/news/NewsService';

// ----------------------------------------
// Dependency Injection
// ----------------------------------------
const profileRepository = new DynamoProfileRepository();
const threadRepository = new DynamoThreadRepository();
const messageRepository = new DynamoMessageRepository();
const userMessageRepository = new DynamoUserMessageRepository();
const messageBroadcastRepository = new DynamoMessageBroadcastRepository();
const userRepository = new DynamoUserRepository();
const contentModerationQueue = new SqsContentModerationQueue();

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
const threadCreateUseCase = new ThreadCreateUseCase(
    threadRepository,
    profileRepository,
    messageSendingService,
    contentModerationQueue,
);

const aiRepository = new EnhancedDeepSeekApiRepository();
const newsService = new NewsService(aiRepository, threadCreateUseCase);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateNewsRequest {
    region: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('CreateNewsHandler: Start', {
            path: event.path,
            httpMethod: event.httpMethod,
            bodyLength: event.body?.length,
        });

        // ------------------------------------
        // リクエストボディの解析
        // ------------------------------------
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: CreateNewsRequest;
        try {
            let body = event.body;
            if (event.isBase64Encoded) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            requestBody = JSON.parse(body || '{}');
        } catch (parseError) {
            console.error('CreateNewsHandler: JSON Parse Error:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const region = requestBody.region;

        if (!region) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required field',
                    required: ['region'],
                }),
            };
        }

        // ニュース取得＆タイムライン投稿の実行
        const postedCount = await newsService.fetchAndPostNews(region);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'News fetched and posted successfully',
                postedCount: postedCount,
                region: region,
            }),
        };
    } catch (error: any) {
        console.error('Error in createNewsHandler:', error);
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
