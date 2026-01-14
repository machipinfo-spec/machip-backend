import { handler as getHandler } from './get';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const lambdaHandler = getHandler;
