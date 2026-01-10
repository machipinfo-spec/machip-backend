import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ThreadRepository } from '../../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { ThreadReadUseCase } from '../../../../application/usecases/timeline/ThreadReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../../util';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const threadRepository = new ThreadRepository();
const profileRepository = new ProfileRepository();
const threadReadUseCase = new ThreadReadUseCase(threadRepository, profileRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * GET /thread - スレッド取得
 * クエリパラメータ:
 * - threadId: 特定のスレッドを取得
 * - ownerUserId: 特定ユーザーのスレッド一覧を取得
 * - timeline: trueの場合、タイムライン（ルートスレッド一覧）を取得
 * - includeChildren: スレッド取得時に子スレッドを含めるか（デフォルト: true）
 * - limit: 取得件数制限
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);

        if (authId) {
            const user = await getUserUseCase.execute(authId);

            if (!user) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
                };
            }
        }
        const { threadId, ownerUserId, includeChildren, limit, offset } = event.queryStringParameters || {};

        // 特定スレッド取得
        if (threadId) {
            const includeChildrenFlag = includeChildren !== 'false';
            const result = await threadReadUseCase.execute(threadId, includeChildrenFlag);

            if (!result) {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Thread not found' }),
                };
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(result),
            };
        }

        // ユーザーのスレッド一覧取得
        if (ownerUserId) {
            const threads = await threadRepository.findByOwnerUserId(
                ownerUserId,
                limit ? parseInt(limit, 10) : undefined,
                offset ? parseInt(offset, 10) : undefined,
            );

            const responseBody = threads.map((thread) => ({
                ...thread.toPrimitives(),
                createdAt: thread.toPrimitives().createdAt.toISOString(),
            }));

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(responseBody),
            };
        }

        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Missing required query parameter',
                required: 'threadId, ownerUserId, or timeline=true',
            }),
        };
    } catch (error: any) {
        console.error('Error in getThreadHandler:', error);
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
