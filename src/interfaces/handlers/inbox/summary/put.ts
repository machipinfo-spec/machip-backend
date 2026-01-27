import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../../../../shared/logger';
import { MarkAllAsReadUseCase } from '../../../../application/usecases/inbox/MarkAllAsReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
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
    const logger = new Logger('InboxSummaryPutHandler');

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

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

        // リポジトリの初期化
        const userMessageRepository = new DynamoUserMessageRepository();

        // ユースケース実行
        const markAllAsReadUseCase = new MarkAllAsReadUseCase(userMessageRepository, logger);

        const request = {
            userId: user.userId.getValue(),
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
};
