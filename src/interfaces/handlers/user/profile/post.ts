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
    imageUrl: string;
    introduction: string;
    url: string | null;
}

/**
 * POST /profile - プロフィール作成
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        let authId = await handlerUtil.getAuthId(event);
        // GetUserUseCase might fail if user doesn't exist yet?
        // Typically CreateProfile is called when user is creating their profile for the first time.
        // But GetUserUseCase checks typically against Repository.
        // If this is "Create Profile", maybe the user exists in Auth but not in DB?
        // Let's assume standard flow.

        // Wait, if it's CREATE profile, we might just need the authId to create the user entity?
        // Let's look at the original code.
        // Original code: const user = await getUserUseCase.execute(authId!);
        // If user is null, it returns 403.
        // So this implies the USER entity must exist before PROFILE?
        // Or is this "User Registration"?
        // In this system, User and Profile are separate.

        // Assuming user exists.
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

        console.log('DEBUG: Received POST /user/profile');

        const contentType = event.headers['Content-Type'] || event.headers['content-type'] || '';

        // JSON Only
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: CreateProfileRequest;
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

        if (!userName || !imageUrl) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['userName', 'imageUrl'],
                }),
            };
        }

        if (introduction === undefined || introduction === null) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['introduction'], // It must be present, even if empty string
                }),
            };
        }

        const response = await createProfileUseCase.execute({
            userId,
            userName,
            imageUrl,
            introduction,
            url,
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
