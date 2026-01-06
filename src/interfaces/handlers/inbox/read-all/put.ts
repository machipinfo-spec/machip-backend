import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MarkAllAsReadUseCase } from '../../../../application/usecases/inbox/MarkAllAsReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { InboxRepositoryModule } from '../../../../infrastructure/firebase/persistence/inbox/InboxRepositoryModule';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { Logger } from '../../../../shared/logger';
import { HandlerUtil } from '../../util';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'PUT,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

/**
 * 全メッセージ既読化ハンドラー (PUT専用)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('MarkAllAsReadHandler');

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
        // 全メッセージ既読化
        return await handleMarkAllAsRead(event, user.userId.getValue(), logger);
    } catch (error: any) {
        logger.error('Error processing mark all as read request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Mark all as read processing error',
                error: error.message,
            }),
        };
    }
};

async function handleMarkAllAsRead(
    event: APIGatewayProxyEvent,
    userId: string,
    logger: Logger,
): Promise<APIGatewayProxyResult> {
    try {
        // リクエストボディのパース
        let body = null;
        if (event.body) {
            try {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (parseError) {
                logger.error('Failed to parse request body:', parseError);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Invalid JSON format in request body',
                    }),
                };
            }
        }

        // リポジトリの初期化
        const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();

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
