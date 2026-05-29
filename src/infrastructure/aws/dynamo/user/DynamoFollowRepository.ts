import {
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { IFollowRepository } from '../../../../domain/repositories/user/IFollowRepository';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoFollowRepository implements IFollowRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Follows';
    }

    async save(userId: UserId, targetUserId: UserId): Promise<void> {
        const item = {
            userId: userId.getValue(),
            targetUserId: targetUserId.getValue(),
            createdAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async delete(userId: UserId, targetUserId: UserId): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    userId: userId.getValue(),
                    targetUserId: targetUserId.getValue(),
                },
            }),
        );
    }

    async findFollowingByUserId(userId: UserId): Promise<UserId[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId.getValue(),
                },
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => UserId.fromExisting(item.targetUserId));
    }
}
