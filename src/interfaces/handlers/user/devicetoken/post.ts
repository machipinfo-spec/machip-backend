import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RegisterDeviceTokenUseCase } from '../../../../application/usecases/user/RegisterDeviceTokenUseCase';
import { DynamoDeviceTokenRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';
import { HandlerUtil } from '../../util';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { GetUserUseCase } from '../../../../application/usecases/user/GetUserUseCase';

interface RegisterDeviceTokenRequest {
    token: string;
    platform: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
};

// Export class for testability
export class RegisterDeviceTokenHandler {
    constructor(
        private handlerUtil: HandlerUtil,
        private getUserUseCase: GetUserUseCase,
        private registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    ) {}

    public async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const authId = await this.handlerUtil.getAuthId(event);
            if (!authId) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Unauthorized' }),
                };
            }

            if (!event.body) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Request body is required' }),
                };
            }

            const body: RegisterDeviceTokenRequest = JSON.parse(event.body);
            if (!body.token || !body.platform) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing token or platform' }),
                };
            }

            const user = await this.getUserUseCase.execute(authId);
            if (!user) {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'User not found' }),
                };
            }

            await this.registerDeviceTokenUseCase.execute({
                userId: user.userId.getValue(),
                token: body.token,
                platform: body.platform,
            });

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Device token registered' }),
            };
        } catch (error: any) {
            console.error('Error in registerDeviceToken:', error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
            };
        }
    }
}

// Instantiate dependencies
const deviceTokenRepository = new DynamoDeviceTokenRepository();
const registerDeviceTokenUseCase = new RegisterDeviceTokenUseCase(deviceTokenRepository);
const handlerUtil = new HandlerUtil();
const userRepository = new DynamoUserRepository();
const getUserUseCase = new GetUserUseCase(userRepository);

const handlerInstance = new RegisterDeviceTokenHandler(handlerUtil, getUserUseCase, registerDeviceTokenUseCase);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return handlerInstance.handle(event);
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
