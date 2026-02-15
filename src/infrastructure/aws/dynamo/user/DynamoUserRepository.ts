import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    QueryCommand,
    DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { User } from '../../../../domain/entities/user/user';
import { AuthId } from '../../../../domain/value-object/users/AuthId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoUserRepository implements IUserRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Users';
    }

    async save(user: User): Promise<void> {
        const item = {
            userId: user.userId.getValue(),
            authId: user.authId.getValue(),
            name: user.name.getValue(),
            email: user.email.getValue(),
            updatedAt: new Date().toISOString(), // User entity might not track createdAt/updatedAt in current DTO
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async delete(user: User): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    userId: user.userId.getValue(),
                },
            }),
        );
    }

    async update(user: User): Promise<void> {
        // Simple overwrite for now, same as save
        await this.save(user);
    }

    async findByAuthId(authId: AuthId): Promise<User | null> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'AuthIdIndex',
                KeyConditionExpression: 'authId = :authId',
                ExpressionAttributeValues: {
                    ':authId': authId.getValue(),
                },
            }),
        );

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        const item = result.Items[0];
        return this.mapToEntity(item);
    }

    async findByUserId(userId: UserId): Promise<User | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    userId: userId.getValue(),
                },
            }),
        );

        if (!result.Item) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findAll(): Promise<User[]> {
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async search(params: {
        limit?: number;
        nextToken?: string;
        keyword?: string;
    }): Promise<{ users: User[]; nextToken: string | null }> {
        // Basic scan with filter for keyword
        const commandParams: any = {
            TableName: this.tableName,
            Limit: params.limit,
        };

        if (params.nextToken) {
            commandParams.ExclusiveStartKey = JSON.parse(Buffer.from(params.nextToken, 'base64').toString('utf-8'));
        }

        if (params.keyword) {
            commandParams.FilterExpression = 'contains(userId, :keyword) OR contains(authId, :keyword)';
            commandParams.ExpressionAttributeValues = {
                ':keyword': params.keyword,
            };
        }

        const result = await this.client.send(new ScanCommand(commandParams));

        const users = result.Items ? result.Items.map((item) => this.mapToEntity(item)) : [];
        const nextToken = result.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
            : null;

        return { users, nextToken };
    }

    private mapToEntity(item: any): User {
        return User.fromDTO({
            userId: item.userId,
            authId: item.authId,
            name: item.name,
            email: item.email,
        });
    }
}
