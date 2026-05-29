import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoBookmarkRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoBookmarkRepository';
import { DynamoThreadRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { DynamoPointEventRepository } from '../../../../infrastructure/aws/dynamo/map/DynamoPointEventRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';

import { BookmarkThreadUseCase } from '../../../../application/usecases/user/BookmarkThreadUseCase';
import { UnbookmarkThreadUseCase } from '../../../../application/usecases/user/UnbookmarkThreadUseCase';
import { GetBookmarkedThreadsUseCase } from '../../../../application/usecases/user/GetBookmarkedThreadsUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';

import { HandlerUtil } from '../../util';

const bookmarkRepository = new DynamoBookmarkRepository();
const threadRepository = new DynamoThreadRepository();
const profileRepository = new DynamoProfileRepository();
const pointEventRepository = new DynamoPointEventRepository();
const userRepository = new DynamoUserRepository();

const bookmarkThreadUseCase = new BookmarkThreadUseCase(bookmarkRepository);
const unbookmarkThreadUseCase = new UnbookmarkThreadUseCase(bookmarkRepository);
const getBookmarkedThreadsUseCase = new GetBookmarkedThreadsUseCase(
    bookmarkRepository,
    threadRepository,
    profileRepository,
    pointEventRepository
);
const getUserUseCase = new GetUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Enforce Cognito authentication
        const authId = await handlerUtil.getAuthId(event);
        if (!authId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Missing authentication token' }),
            };
        }

        const user = await getUserUseCase.execute(authId);
        if (!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: User profile not registered' }),
            };
        }

        const userId = user.userId.getValue();
        const method = event.httpMethod;

        if (method === 'POST') {
            const body = event.body ? JSON.parse(event.body) : {};
            const { threadId } = body;
            if (!threadId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing required body parameter: threadId' }),
                };
            }

            await bookmarkThreadUseCase.execute(userId, threadId);
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Bookmark saved successfully' }),
            };
        }

        if (method === 'DELETE') {
            const { threadId: queryThreadId } = event.queryStringParameters || {};
            let threadId = queryThreadId;

            if (!threadId && event.body) {
                try {
                    const body = JSON.parse(event.body);
                    threadId = body.threadId;
                } catch (e) {
                    // Ignore JSON parsing issues
                }
            }

            if (!threadId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing required parameter: threadId (query or body)' }),
                };
            }

            await unbookmarkThreadUseCase.execute(userId, threadId);
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Bookmark removed successfully' }),
            };
        }

        if (method === 'GET') {
            const { limit, offset } = event.queryStringParameters || {};
            const result = await getBookmarkedThreadsUseCase.execute(
                userId,
                limit ? parseInt(limit, 10) : undefined,
                offset ? parseInt(offset, 10) : undefined
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
                        startDate: (t.categoryContent as any).startDate,
                        endDate: (t.categoryContent as any).endDate,
                        detail: (t.categoryContent as any).detail,
                    } : {
                        imageUrl: (t.categoryContent as any).imageUrl,
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
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    } catch (error: any) {
        console.error('Error in BookmarkHandler:', error);
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
