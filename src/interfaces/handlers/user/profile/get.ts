// handlers/profile/get.ts

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { HandlerUtil } from '../../util';
import { GetProfileUseCase } from '../../../../application/usecases/profile/GetProfileUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';

const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const profileRepository = new DynamoProfileRepository();
const getProfileUseCase = new GetProfileUseCase(profileRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
};

interface GetProfileResponse {
    profileId: string;
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string;
    url: string | null;
}

/**
 * GET /profile - プロフィール取得
 * クエリパラメータでuserIdを指定可能（指定がない場合は認証ユーザー自身のプロフィール）
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);

        let user = null;
        if (authId) {
            user = await getUserUseCase.execute(authId);
            if (!user) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
                };
            }
        }

        const requestUserId = event.pathParameters?.userId;

        // ゲストの場合、@selfは許可しない（認証が必要）
        if (!authId && requestUserId === '@self') {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Authentication required for @self' }),
            };
        }

        let userId;
        if (requestUserId === '@self') {
            userId = user!.userId.getValue();
        } else {
            userId = requestUserId!;
        }
        const response = await getProfileUseCase.execute({ userId });

        if (!response.profile) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: response.error || 'Profile not found',
                }),
            };
        }

        const responseBody: GetProfileResponse = {
            profileId: response.profile.profileId.getValue(),
            userId: response.profile.userId.getValue(),
            userName: response.profile.userName.getValue(),
            imageUrl: response.profile.imageUrl.getValue(),
            introduction: response.profile.introduction.getValue(),
            url: response.profile.url.getValue(),
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in getProfileHandler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message,
            }),
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
