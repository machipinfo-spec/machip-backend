import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteUserMessageUseCase } from '../../../../application/usecases/inbox/DeleteUserMessageUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { Logger } from '../../../../shared/logger';
import { HandlerUtil } from '../../util';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,DELETE,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

/**
 * ユーザーメッセージ削除ハンドラー (DELETE専用)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('DeleteUserCommandHandler');

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

        // メッセージ削除
        return await handleDeleteUserMessage(user.userId.getValue(), messageId, logger);
    } catch (error: any) {
        logger.error('Error processing delete message request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Message deletion processing error',
                error: error.message,
            }),
        };
    }
};

async function handleDeleteUserMessage(
    userId: string,
    messageId: string,
    logger: Logger,
): Promise<APIGatewayProxyResult> {
    try {
        // リポジトリの初期化
        const userMessageRepository = new DynamoUserMessageRepository();

        // ユースケース実行
        const deleteUserMessageUseCase = new DeleteUserMessageUseCase(userMessageRepository, logger);

        const request = {
            userId,
            messageId,
        };

        const result = await deleteUserMessageUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleDeleteUserMessage:', error);

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
                message: 'Failed to delete message',
                error: error.message,
            }),
        };
    }
}
