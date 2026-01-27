import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { IDeviceTokenRepository } from '../../../../domain/repositories/user/IDeviceTokenRepository';
import { DeviceToken } from '../../../../domain/entities/user/DeviceToken';
import { DynamoDBClientFactory } from '../client';

export class DynamoDeviceTokenRepository implements IDeviceTokenRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'DeviceTokens';
    }

    async save(deviceToken: DeviceToken): Promise<void> {
        const item = {
            token: deviceToken.getToken(),
            userId: deviceToken.getUserId(),
            platform: deviceToken.getPlatform(),
            createdAt: deviceToken.getCreatedAt().toISOString(),
            lastUsedAt: deviceToken.getLastUsedAt().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async delete(token: string): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    token: token,
                },
            }),
        );
    }

    async findByToken(token: string): Promise<DeviceToken | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    token: token,
                },
            }),
        );

        if (!result.Item) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByUserId(userId: string): Promise<DeviceToken[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'UserIdIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async deleteTokens(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;

        // DynamoDB BatchWriteItem has a limit of 25 items.
        // Needs chunking.
        const chunkSize = 25;
        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const deleteRequests = chunk.map((token) => ({
                DeleteRequest: {
                    Key: { token },
                },
            }));

            await this.client.send(
                new BatchWriteCommand({
                    RequestItems: {
                        [this.tableName]: deleteRequests,
                    },
                }),
            );
        }
    }

    private mapToEntity(item: any): DeviceToken {
        return DeviceToken.reconstruct(
            item.token,
            item.userId,
            item.platform,
            new Date(item.createdAt),
            new Date(item.lastUsedAt),
        );
    }
}
