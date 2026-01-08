import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MarkMessageAsReadUseCase } from '../../../../../application/usecases/inbox/MarkMessageAsReadUseCase';
import { GetUserUseCase } from '../../../../../application/usecases/user/GetUserUseCase';
import { InboxRepositoryModule } from '../../../../../infrastructure/firebase/persistence/inbox/InboxRepositoryModule';
import { UserRepository } from '../../../../../infrastructure/firebase/persistence/user/UserRepository';
import { Logger } from '../../../../../shared/logger';
import { HandlerUtil } from '../../../util';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'PUT,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

/**
 * メッセージ既読化ハンドラー (PUT専用)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('MarkMessageAsReadHandler');

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

        // パスパラメータ検証
        const messageId = event.pathParameters?.messageId;
        if (!messageId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing messageId in path' }),
            };
        }

        // メッセージ既読化
        return await handleMarkAsRead(user.userId.getValue(), messageId, logger);
    } catch (error: any) {
        logger.error('Error processing mark as read request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Mark as read processing error',
                error: error.message,
            }),
        };
    }
};

async function handleMarkAsRead(userId: string, messageId: string, logger: Logger): Promise<APIGatewayProxyResult> {
    try {
        // リポジトリの初期化
        const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();

        // ユースケース実行
        const markMessageAsReadUseCase = new MarkMessageAsReadUseCase(userMessageRepository, logger);

        const request = {
            userId,
            messageId,
        };

        const result = await markMessageAsReadUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleMarkAsRead:', error);

        if (error.message.includes('見つかりません') || error.message.includes('not found')) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Message not found',
                    error: error.message,
                }),
            };
        }

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Failed to mark message as read',
                error: error.message,
            }),
        };
    }
}
