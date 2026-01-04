import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteUserUseCase } from '../../../application/usecases/user/DeleteUserUseCase';
import { UserRepository } from '../../../infrastructure/firebase/persistence/user/UserRepository';
import { IDRepository } from '../../../infrastructure/cognito/presistence/IDRepository';
import { HandlerUtil } from '../util';
import { ProfileRepository } from '../../../infrastructure/firebase/persistence/profile/ProfileRepository';

const userRepository = new UserRepository();
const idRepository = new IDRepository();
const profileRepository = new ProfileRepository();
const deleteUserUseCase = new DeleteUserUseCase(userRepository, profileRepository, idRepository);
const handlerUtil = new HandlerUtil();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

/**
 * DELETE /user - ユーザー退会
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const authId = await handlerUtil.getAuthId(event);

        if (!authId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized' }),
            };
        }

        await deleteUserUseCase.execute(authId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'User deleted successfully' }),
        };
    } catch (error: any) {
        console.error('Error in deleteUserHandler:', error);
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
