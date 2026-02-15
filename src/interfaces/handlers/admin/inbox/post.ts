import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
    MessageSendingService,
    MessageSendingRequest,
} from '../../../../application/services/inbox/MessageSendingService';
import { SendSystemMessageUseCase } from '../../../../application/usecases/admin/SendSystemMessageUseCase';
import { DynamoMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoMessageBroadcastRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageBroadcastRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { InboxNotificationService } from '../../../../application/services/inbox/InboxNotificationService';
import { FirebasePushNotificationService } from '../../../../infrastructure/firebase/notification/FirebasePushNotificationService';
import { DynamoDeviceTokenRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';

// Logger mock or simple console implementation since shared/logger is not fully visible, assuming console.
class ConsoleLogger {
    info(message: string, meta?: any) {
        console.info(message, meta);
    }
    error(message: string, meta?: any) {
        console.error(message, meta);
    }
    warn(message: string, meta?: any) {
        console.warn(message, meta);
    }
    debug(message: string, meta?: any) {
        console.debug(message, meta);
    }
}

const messageRepository = new DynamoMessageRepository();
const userMessageRepository = new DynamoUserMessageRepository();
const messageBroadcastRepository = new DynamoMessageBroadcastRepository();
const userRepository = new DynamoUserRepository();
const profileRepository = new DynamoProfileRepository();
const logger = new ConsoleLogger();

// ... (existing loggers and repositories)
const deviceTokenRepository = new DynamoDeviceTokenRepository();
const pushNotificationService = new FirebasePushNotificationService(deviceTokenRepository);
const inboxNotificationService = new InboxNotificationService(pushNotificationService);

const service = new MessageSendingService(
    profileRepository,
    messageRepository,
    userMessageRepository,
    messageBroadcastRepository,
    userRepository,
    inboxNotificationService,
    logger as any,
);

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    console.log('AdminPostHandler invoked');

    // Dynamic CORS handling
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const allowedOrigins = ['https://tetra-backoffice.vercel.app', 'http://localhost:3000', 'http://localhost:3001'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : '';

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        const body = JSON.parse(event.body);
        const { targetUserIds, subject, content } = body;

        // Validation
        if (!subject || !content || !targetUserIds) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing required fields: subject, content, targetUserIds' }),
            };
        }

        let target: string[] | 'all';
        if (targetUserIds === 'all') {
            target = 'all';
        } else if (Array.isArray(targetUserIds)) {
            target = targetUserIds;
        } else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid targetUserIds format. Must be array of strings or "all"' }),
            };
        }

        const useCase = new SendSystemMessageUseCase(service);
        const result = await useCase.execute({
            targetUserIds: target,
            subject,
            content,
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        console.error('Error in AdminPostHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

export const lambdaHandler = handler;
