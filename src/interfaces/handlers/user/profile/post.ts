// handlers/profile/post.ts

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { HandlerUtil } from '../../util';
import { CreateProfileUseCase } from '../../../../application/usecases/profile/CreateProfileUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const profileRepository = new ProfileRepository();
const createProfileUseCase = new CreateProfileUseCase(profileRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateProfileResponse {
    profileId: string;
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string;
    url: string | null;
}

interface CreateProfileRequest {
    userName: string;
    imageBase64: string;
    introduction: string;
    url: string | null;
}

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
        const userId = user.userId.getValue();

        // ------------------------------------
        // リクエストボディの解析
        // ------------------------------------
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: CreateProfileRequest;
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

        // 必須チェック
        if (!userName || !imageBase64 || introduction === undefined) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['userName', 'imageBase64', 'introduction'],
                }),
            };
        }

        // ------------------------------------
        // ★ Base64文字列 → バイナリへ変換
        // ------------------------------------
        let imageBytes: Buffer;
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

        // ------------------------------------
        // UseCase 実行（imageBytesを渡す）
        // ------------------------------------
        const response = await createProfileUseCase.execute({
            userId,
            userName,
            imageBytes,
            introduction,
            url
        });

        if (response.error || !response.profile) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: response.error || 'Failed to create profile',
                }),
            };
        }

        const responseBody: CreateProfileResponse = {
            profileId: response.profile.profileId.getValue(),
            userId: response.profile.userId.getValue(),
            userName: response.profile.userName.getValue(),
            imageUrl: response.profile.imageUrl.getValue(), // UseCase側でアップロードしたURLが返る
            introduction: response.profile.introduction.getValue(),
            url: response.profile.url.getValue(),
        };

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };

    } catch (error: any) {
        console.error('Error in createProfileHandler:', error);
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
