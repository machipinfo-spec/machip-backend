import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetUserMessagesUseCase } from '../../../application/usecases/inbox/GetUserMessagesUseCase';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { InboxRepositoryModule } from '../../../infrastructure/firebase/persistence/inbox/InboxRepositoryModule';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { Logger } from '../../../shared/logger';
import { HandlerUtil } from '../util';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
};
const handlerUtil = new HandlerUtil();
const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = new Logger('GetUserMessagesHandler');

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

        return await handleGetUserMessages(event, user.userId.getValue(), logger);
    } catch (error: any) {
        logger.error('Error processing get user messages request:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Get user messages processing error',
                error: error.message,
            }),
        };
    }
};

async function handleGetUserMessages(
    event: APIGatewayProxyEvent,
    userId: string,
    logger: Logger,
): Promise<APIGatewayProxyResult> {
    try {
        const queryParams = event.queryStringParameters || {};

        // リポジトリの初期化
        const messageRepository = InboxRepositoryModule.getMessageRepository();
        const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();
        const profileRepository = InboxRepositoryModule.getProfileRepository();

        // ユースケース実行
        const getUserMessagesUseCase = new GetUserMessagesUseCase(
            messageRepository,
            userMessageRepository,
            profileRepository,
            logger,
        );

        const request = {
            userId,
            filter: {
                type: queryParams.type as any,
                isRead: queryParams.isRead === 'true' ? true : queryParams.isRead === 'false' ? false : undefined,
                limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
                offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
            },
        };

        const result = await getUserMessagesUseCase.execute(request);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        logger.error('Error in handleGetUserMessages:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Failed to get user messages',
                error: error.message,
            }),
        };
    }
}
