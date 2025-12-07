// handlers/profile/get.ts

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { HandlerUtil } from '../../util';
import { GetProfileUseCase } from '../../../../application/usecases/profile/GetProfileUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const profileRepository = new ProfileRepository();
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
    userName: string;
    imageUrl: string;
    introduction: string;
}

/**
 * GET /profile - プロフィール取得
 * クエリパラメータでuserIdを指定可能（指定がない場合は認証ユーザー自身のプロフィール）
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
        const requestUserId = event.pathParameters?.userId;
        console.log("Requested userId:", requestUserId);
        let userId;
        if (requestUserId === "@self") {
            userId = user.userId.getValue();
        }else{
            userId = requestUserId!;
        }
        const response = await getProfileUseCase.execute({ userId });

        if (!response.profile) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: response.error || 'Profile not found'
                }),
            };
        }

        const responseBody: GetProfileResponse = {
            profileId: response.profile.profileId.getValue(),
            userName: response.profile.userName.getValue(),
            imageUrl: response.profile.imageUrl.getValue(),
            introduction: response.profile.introduction.getValue(),
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
                error: error.message
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