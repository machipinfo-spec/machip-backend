import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HandlerUtil } from '../../util';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { ReactionCreateUseCase } from '../../../../application/usecases/timeline/ReactionCreateUseCase';
import { DynamoReactionRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoReactionRepository';
import { ReactionType } from '../../../../domain/value-object/timeline/reactionType';

const reactionRepository = new DynamoReactionRepository();
const useCase = new ReactionCreateUseCase(reactionRepository);
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

interface CreateReactionRequest {
    threadId: string;
}

interface CreateReactionResponse {
    id: string;
    createdAt: string;
    ownerUserId: string;
}

/**
 * POST /thread - スレッド作成
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
        const ownerUserId = user.userId.getValue();
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        let requestBody: CreateReactionRequest;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON in request body' }),
            };
        }

        const { threadId } = requestBody;

        if (!threadId || !ownerUserId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required fields',
                    required: ['threadName'],
                }),
            };
        }

        const reaction = await useCase.execute(threadId, ownerUserId, ReactionType.LIKE.getValue());

        const dto = reaction.toPrimitives();
        const responseBody: CreateReactionResponse = {
            id: dto.id,
            createdAt: dto.createdAt.toISOString(),
            ownerUserId: dto.ownerUserId,
        };

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.error('Error in createReactionHandler:', error);
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
