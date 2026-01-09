import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ThreadRepository } from '../../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { ThreadCreateUseCase } from '../../../../application/usecases/timeline/ThreadCreateUseCase';
import { HandlerUtil } from '../../util';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { MessageSendingService } from '../../../../application/services/inbox/MessageSendingService';
import { MessageBroadcastRepository } from '../../../../infrastructure/firebase/persistence/inbox/MessageBroadcastRepository';
import { MessageRepository } from '../../../../infrastructure/firebase/persistence/inbox/MessageRepository';
import { UserMessageRepository } from '../../../../infrastructure/firebase/persistence/inbox/UserMessageRepository';
import { Logger } from '../../../../shared/logger';

const profileRepository = new ProfileRepository();
const threadRepository = new ThreadRepository();
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

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateThreadRequest {
    threadName: string;
    parentThreadId?: string;
    imageUrl?: string;
}

/**
 * POST /timeline/thread - スレッド作成
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
        const userId = user.userId.getValue();

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

        let requestBody: CreateThreadRequest;
        try {
            let body = event.body;
            if (event.isBase64Encoded) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            requestBody = JSON.parse(body || '{}');
        } catch (parseError) {
            console.error('DEBUG: JSON Parse Error:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const threadName = requestBody.threadName;
        const parentThreadId = requestBody.parentThreadId;
        const imageUrl = requestBody.imageUrl;

        if (!threadName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['threadName'],
                }),
            };
        }

        // UseCase実行
        const threadResponse = await threadCreateUseCase.execute(
            threadName,
            userId,
            null, // pointInfoId
            imageUrl || null,
            null, // selectDate
            null, // address
            parentThreadId || null,
        );

        if (threadResponse.error || !threadResponse.thread) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to create thread', error: threadResponse.error }),
            };
        }

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(threadResponse.thread),
        };
    } catch (error: any) {
        console.error('Error in createThreadHandler:', error);
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
