import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteDeviceTokenUseCase } from '../../../../application/usecases/user/DeleteDeviceTokenUseCase';
import { DynamoDeviceTokenRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';
import { HandlerUtil } from '../../util';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

export class DeleteDeviceTokenHandler {
    constructor(
        private handlerUtil: HandlerUtil,
        private deleteDeviceTokenUseCase: DeleteDeviceTokenUseCase,
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

            // Extract token from Query String or Body
            let token = event.queryStringParameters?.token;
            if (!token && event.body) {
                try {
                    const body = JSON.parse(event.body);
                    token = body.token;
                } catch (e) {
                    // Ignore JSON parse error if body is not JSON
                }
            }

            if (!token) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Missing token parameter' }),
                };
            }

            await this.deleteDeviceTokenUseCase.execute(token);

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Device token deleted' }),
            };
        } catch (error: any) {
            console.error('Error in deleteDeviceToken:', error);
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
const deleteDeviceTokenUseCase = new DeleteDeviceTokenUseCase(deviceTokenRepository);
const handlerUtil = new HandlerUtil();

const handlerInstance = new DeleteDeviceTokenHandler(handlerUtil, deleteDeviceTokenUseCase);

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
