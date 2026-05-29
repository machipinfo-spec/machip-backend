import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoFollowRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoFollowRepository';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';

import { FollowUserUseCase } from '../../../../application/usecases/user/FollowUserUseCase';
import { UnfollowUserUseCase } from '../../../../application/usecases/user/UnfollowUserUseCase';
import { GetFollowingUsersUseCase } from '../../../../application/usecases/user/GetFollowingUsersUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';

import { HandlerUtil } from '../../util';

const followRepository = new DynamoFollowRepository();
const profileRepository = new DynamoProfileRepository();
const userRepository = new DynamoUserRepository();

const followUserUseCase = new FollowUserUseCase(followRepository);
const unfollowUserUseCase = new UnfollowUserUseCase(followRepository);
const getFollowingUsersUseCase = new GetFollowingUsersUseCase(followRepository, profileRepository);
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
        const path = event.path;

        // Route based on path suffix
        if (path.endsWith('/following') && method === 'GET') {
            const result = await getFollowingUsersUseCase.execute(userId);
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(result),
            };
        }

        if (path.endsWith('/follow') && method === 'POST') {
            const body = event.body ? JSON.parse(event.body) : {};
            const { targetUserId } = body;
            if (!targetUserId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing required body parameter: targetUserId' }),
                };
            }

            try {
                await followUserUseCase.execute(userId, targetUserId);
            } catch (err: any) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: err.message }),
                };
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'User followed successfully' }),
            };
        }

        if (path.endsWith('/follow') && method === 'DELETE') {
            const { targetUserId: queryTargetUserId } = event.queryStringParameters || {};
            let targetUserId = queryTargetUserId;

            if (!targetUserId && event.body) {
                try {
                    const body = JSON.parse(event.body);
                    targetUserId = body.targetUserId;
                } catch (e) {
                    // Ignore body parsing issues
                }
            }

            if (!targetUserId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing required parameter: targetUserId (query or body)' }),
                };
            }

            await unfollowUserUseCase.execute(userId, targetUserId);
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'User unfollowed successfully' }),
            };
        }

        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method or Path Not Allowed' }),
        };
    } catch (error: any) {
        console.error('Error in FollowHandler:', error);
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
