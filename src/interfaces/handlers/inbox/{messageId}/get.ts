import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetMessageDetailUseCase } from '../../../../application/usecases/inbox/GetMessageDetailUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { Logger } from '../../../../shared/logger';
import { HandlerUtil } from '../../util';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

/**
 * メッセージ詳細取得ハンドラー (GET専用)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('GetMessageDetailHandler');

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

        // メッセージ詳細取得
        return await handleGetMessageDetail(user.userId.getValue(), messageId, logger);
    } catch (error: any) {
        logger.error('Error processing get message detail request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Message detail processing error',
                error: error.message,
            }),
        };
    }
};

async function handleGetMessageDetail(
    userId: string,
    messageId: string,
    logger: Logger,
): Promise<APIGatewayProxyResult> {
    try {
        // リポジトリの初期化
        const messageRepository = new DynamoMessageRepository();
        const userMessageRepository = new DynamoUserMessageRepository();
        const profileRepository = new DynamoProfileRepository();

        // ユースケース実行
        const getMessageDetailUseCase = new GetMessageDetailUseCase(
            messageRepository,
            userMessageRepository,
            profileRepository,
            logger,
        );

        const request = {
            userId,
            messageId,
        };

        const result = await getMessageDetailUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleGetMessageDetail:', error);

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
                message: 'Failed to get message detail',
                error: error.message,
            }),
        };
    }
}
