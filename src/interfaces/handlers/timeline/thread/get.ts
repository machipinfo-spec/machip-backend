import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoThreadRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { ThreadReadUseCase } from '../../../../application/usecases/timeline/ThreadReadUseCase';
import { TimelineReadByUserUseCase } from '../../../../application/usecases/timeline/TimelineReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { HandlerUtil } from '../../util';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { DynamoPointEventRepository } from '../../../../infrastructure/aws/dynamo/map/DynamoPointEventRepository';

const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const threadRepository = new DynamoThreadRepository();
const profileRepository = new DynamoProfileRepository();
const pointEventRepository = new DynamoPointEventRepository();
const threadReadUseCase = new ThreadReadUseCase(threadRepository, profileRepository, pointEventRepository);
const timelineReadByUserUseCase = new TimelineReadByUserUseCase(threadRepository, profileRepository, pointEventRepository);
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
            if (!authId) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Unauthorized: Missing authentication token' }),
                };
            }

            const result = await timelineReadByUserUseCase.execute(
                ownerUserId,
                limit ? parseInt(limit, 10) : undefined,
                offset ? parseInt(offset, 10) : undefined,
            );

            const responseBody = result.threads.map((t) => {
                const isEvent = t.category === 'event';
                return {
                    threadId: t.threadId,
                    threadName: t.threadName,
                    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
                    ownerUserId: t.ownerUserId,
                    ownerName: t.ownerUserProfile.userName,
                    ownerAvatar: t.ownerUserProfile.imageUrl,
                    category: t.category,
                    categoryContent: isEvent ? {
                        url: (t.categoryContent as any).url,
                        imageUrl: (t.categoryContent as any).imageUrl,
                        detail: (t.categoryContent as any).detail,
                    } : {
                        imageUrl: (t.categoryContent as any).imageUrl,
                        url: (t.categoryContent as any).url,
                        detail: (t.categoryContent as any).detail,
                    },
                    replyCount: t.childThreadCount,
                };
            });

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
