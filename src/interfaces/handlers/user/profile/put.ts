// handlers/profile/put.ts

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateProfileUseCase } from '../../../../application/usecases/profile/UpdateProfileUseCase';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { HandlerUtil } from '../../util';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const profileRepository = new ProfileRepository();
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
    imageBase64?: string;
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

        // リクエストボディの解析
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: UpdateProfileRequest;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const { userName, imageBase64, introduction, url } = requestBody;

        // 少なくとも1つのフィールドが指定されているか確認
        if (userName === undefined && imageBase64 === undefined && introduction === undefined) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'At least one field must be provided for update',
                    allowed: ['userName', 'imageUrl', 'introduction'],
                }),
            };
        }
        // ------------------------------------
        // ★ Base64文字列 → バイナリへ変換
        // ------------------------------------
        let imageBytes: Buffer | null = null;
        if (imageBase64) {
            try {
                // 「data:image/png;base64,xxxxxxxx」の場合はプレフィックス除去
                const base64Data = imageBase64.replace(/^data:.*;base64,/, '');
                imageBytes = Buffer.from(base64Data, 'base64');
            } catch (err) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Invalid Base64 image' }),
                };
            }
        }

        // UseCase実行
        const response = await updateProfileUseCase.execute({
            userId,
            userName,
            imageBytes,
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
