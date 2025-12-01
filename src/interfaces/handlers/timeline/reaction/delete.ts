import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ReactionRepository } from '../../../../infrastructure/firebase/persistence/timeline/ReactionRepository';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { UserRepository } from '../../../../infrastructure/firebase/persistence/user/UserRepository';
import { ReactionDeleteUseCase } from '../../../../application/usecases/timeline/ReactionDeleteUseCase';
import { HandlerUtil } from '../../util';

const userRepository = new UserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const reactionRepository = new ReactionRepository();
const useCase = new ReactionDeleteUseCase(reactionRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * DELETE /thread - スレッド削除
 * クエリパラメータ:
 * - threadId: 削除するスレッドのID（必須）
 * - deleteChildren: 子スレッドも削除するか（デフォルト: true）
 * - soft: 論理削除するか（デフォルト: false）
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
        
        const { reactionId } = event.queryStringParameters || {};

        if (!reactionId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required query parameter: threadId',
                }),
            };
        }
        await useCase.execute(reactionId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Reaction deleted successfully' }),
        };
    } catch (error: any) {
        console.error('Error in deleteReactionHandler:', error);
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