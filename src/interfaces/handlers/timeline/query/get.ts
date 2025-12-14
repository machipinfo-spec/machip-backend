import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TimelineReadUseCase } from '../../../../application/usecases/timeline/TimelineReadUseCase';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { ProfileRepository } from '../../../../infrastructure/firebase/persistence/profile/ProfileRepository';
import { ThreadRepository } from '../../../../infrastructure/firebase/persistence/timeline/ThreadRepository';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { HandlerUtil } from '../../util';
import { ThreadQueryUseCase } from '../../../../application/usecases/timeline/ThreadQueryUseCase';

const profileRepository = new ProfileRepository();
const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const threadRepository = new ThreadRepository();
const threadQueryUseCase = new ThreadQueryUseCase(threadRepository, profileRepository);
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
        const { startDate, endDate, limit } = event.queryStringParameters || {};

        // ------------------------------------------------------
        // startDate / endDate が無ければ今日の範囲を自動設定
        // ------------------------------------------------------
        let start: Date;
        let end: Date;

        if (!startDate && !endDate) {
            const today = new Date();

            // 今日の 00:00:00
            start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            // 今日の 23:59:59.999
            end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        } else {
            // 片方だけ指定されても OK（指定なければ new Date()）
            start = startDate ? new Date(startDate) : new Date();
            end = endDate ? new Date(endDate) : new Date();
        }

        const result = await threadQueryUseCase.execute(
            start,
            end,
            limit ? parseInt(limit, 10) : undefined
        );

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result),
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