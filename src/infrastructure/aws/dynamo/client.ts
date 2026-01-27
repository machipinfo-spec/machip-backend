import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export class DynamoDBClientFactory {
    private static instance: DynamoDBDocumentClient;

    private constructor() {}

    public static create(): DynamoDBDocumentClient {
        if (!DynamoDBClientFactory.instance) {
            const client = new DynamoDBClient({
                region: process.env.AWS_REGION || 'ap-northeast-1',
            });
            DynamoDBClientFactory.instance = DynamoDBDocumentClient.from(client, {
                marshallOptions: {
                    removeUndefinedValues: true,
                },
            });
        }
        return DynamoDBClientFactory.instance;
    }
}
