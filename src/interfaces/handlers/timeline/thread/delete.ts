import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoThreadRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { ThreadDeleteUseCase } from '../../../../application/usecases/timeline/ThreadDeleteUseCase';
import { HandlerUtil } from '../../util';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { DynamoMapRepository } from '../../../../infrastructure/aws/dynamo/map/DynamoMapRepository';

const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const threadRepository = new DynamoThreadRepository();
const mapRepository = new DynamoMapRepository();
const useCase = new ThreadDeleteUseCase(threadRepository, mapRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

interface DeleteThreadResponse {
    success: boolean;
    deletedThreadIds: string[];
    deletedReactionIds: string[];
    message: string;
}

/**
 * DELETE /thread - スレッド削除
 * クエリパラメータ:
 * - threadId: 削除するスレッドのID（必須）
 * - deleteChildren: 子スレッドも削除するか（デフォルト: true）
 * - soft: 論理削除するか（デフォルト: false）
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

        const { threadId, deleteChildren, soft } = event.queryStringParameters || {};

        if (!threadId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required query parameter: threadId',
                }),
            };
        }

        // 論理削除の場合
        if (soft === 'true') {
            await useCase.executeSoftDelete(threadId);

            const responseBody: DeleteThreadResponse = {
                success: true,
                deletedThreadIds: [threadId],
                deletedReactionIds: [],
                message: 'Thread soft deleted successfully',
            };

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(responseBody),
            };
        }

        // 物理削除の場合
        const deleteChildrenFlag = deleteChildren !== 'false';
        const result = await useCase.execute(threadId, deleteChildrenFlag);

        const responseBody: DeleteThreadResponse = {
            ...result,
            message: `Thread deleted successfully. ${result.deletedThreadIds.length} thread(s) and ${result.deletedReactionIds.length} reaction(s) deleted.`,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in deleteThreadHandler:', error);

        // Thread not found エラーの場合は404を返す
        if (error.message && error.message.includes('not found')) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: error.message }),
            };
        }

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
