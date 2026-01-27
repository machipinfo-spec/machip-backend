// handlers/profile/put.ts

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateProfileUseCase } from '../../../../application/usecases/profile/UpdateProfileUseCase';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { HandlerUtil } from '../../util';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { MimeTypeHelper } from '../../../../shared/mimeTypeHelper';

const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const profileRepository = new DynamoProfileRepository();
const updateProfileUseCase = new UpdateProfileUseCase(profileRepository);

const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'PUT,OPTIONS',
    'Content-Type': 'application/json',
};

interface UpdateProfileResponse {
    profileId: string;
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string;
    url: string | null;
}

export interface UpdateProfileRequest {
    userName?: string;
    imageUrl?: string;
    introduction?: string;
    url: string | null;
}

/**
 * PUT /profile - プロフィール更新
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);
        const user = await getUserUseCase.execute(authId!);

        if (!user) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: User does not exist' }),
            };
        }
        const userId = user.userId.getValue();

        let userName: string | undefined;
        let introduction: string | undefined;
        let url: string | null = null;
        let imageUrl: string | undefined;

        console.log('DEBUG: Received PUT /user/profile');

        const contentType = event.headers['Content-Type'] || event.headers['content-type'] || '';

        // Prioritize JSON
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: UpdateProfileRequest;
        try {
            let body = event.body;
            if (event.isBase64Encoded) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            requestBody = JSON.parse(body || '{}');
        } catch (e) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON' }),
            };
        }

        userName = requestBody.userName;
        introduction = requestBody.introduction;
        url = requestBody.url;
        imageUrl = requestBody.imageUrl;

        // 少なくとも1つのフィールドが指定されているか確認
        if (userName === undefined && imageUrl === undefined && introduction === undefined && url === undefined) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'At least one field must be provided for update',
                    allowed: ['userName', 'imageUrl', 'introduction', 'url'],
                }),
            };
        }

        // UseCase実行
        const response = await updateProfileUseCase.execute({
            userId,
            userName,
            imageUrl,
            introduction,
            url,
        });

        if (response.error || !response.profile) {
            const statusCode = response.error?.includes('not found') ? 404 : 400;
            return {
                statusCode,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: response.error || 'Failed to update profile',
                }),
            };
        }

        const responseBody: UpdateProfileResponse = {
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
        console.error('Error in updateProfileHandler:', error);
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
