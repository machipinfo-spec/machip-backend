import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetUserInboxSummaryUseCase } from '../../../../application/usecases/inbox/GetUserInboxSummaryUseCase';
import { MarkAllAsReadUseCase } from '../../../../application/usecases/inbox/MarkAllAsReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { Logger } from '../../../../shared/logger';
import { HandlerUtil } from '../../util';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('InboxSummaryHandler');

    try {
        let authId = await handlerUtil.getAuthId(event);
        let user;
        if (authId) {
            user = await getUserUseCase.execute(authId);
        }
        if (!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
            };
        }

        return await handleGetInboxSummary(user.userId.getValue(), logger);
    } catch (error: any) {
        logger.error('Error processing inbox summary request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Inbox summary processing error',
                error: error.message,
            }),
        };
    }
};

async function handleGetInboxSummary(userId: string, logger: Logger): Promise<APIGatewayProxyResult> {
    try {
        // リポジトリの初期化
        const messageRepository = new DynamoMessageRepository();
        const userMessageRepository = new DynamoUserMessageRepository();

        // ユースケース実行
        const getUserInboxSummaryUseCase = new GetUserInboxSummaryUseCase(
            messageRepository,
            userMessageRepository,
            logger,
        );

        const request = { userId };
        const result = await getUserInboxSummaryUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleGetInboxSummary:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Failed to get inbox summary',
                error: error.message,
            }),
        };
    }
}

async function handleMarkAllAsRead(
    event: APIGatewayProxyEvent,
    userId: string,
    logger: Logger,
): Promise<APIGatewayProxyResult> {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

        // リポジトリの初期化
        const userMessageRepository = new DynamoUserMessageRepository();

        // ユースケース実行
        const markAllAsReadUseCase = new MarkAllAsReadUseCase(userMessageRepository, logger);

        const request = {
            userId,
            type: body?.type || 'all',
        };

        const result = await markAllAsReadUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleMarkAllAsRead:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Failed to mark all messages as read',
                error: error.message,
            }),
        };
    }
}
