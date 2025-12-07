import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ThreadReadUseCase } from '../../../application/usecases/timeline/ThreadReadUseCase';
import { TimelineReadUseCase } from '../../../application/usecases/timeline/TimelineReadUseCase';
import { GetUserUseCase } from '../../../application/usecases/user/GetUserUseCase';
import { ReactionRepository } from '../../../infrastructure/firebase/persistence/timeline/ReactionRepository';
import { ThreadRepository } from '../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../util';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const threadRepository = new ThreadRepository();
const reactionRepository = new ReactionRepository();
const threadReadUseCase = new ThreadReadUseCase(threadRepository, reactionRepository);
const timelineReadUseCase = new TimelineReadUseCase(threadRepository, reactionRepository);
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
        let authId = handlerUtil.getAuthId(event);
        const user = await getUserUseCase.execute(authId!);

        if(!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
            };
        }
        const { limit } = event.queryStringParameters || {};

        const result = await timelineReadUseCase.execute(
            limit ? parseInt(limit, 10) : undefined
        );

        const responseBody = {
            threads: result.threads.map(item => ({
                thread: {
                    ...item.thread.toPrimitives(),
                    createdAt: item.thread.toPrimitives().createdAt.toISOString(),
                },
                // reactions: item.reactions.map(r => ({
                //     ...r.toPrimitives(),
                //     createdAt: r.toPrimitives().createdAt.toISOString(),
                // })),
                childThreadCount: item.childThreadCount,
            })),
            total: result.total,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
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