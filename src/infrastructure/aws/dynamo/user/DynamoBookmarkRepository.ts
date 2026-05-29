import {
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { IBookmarkRepository } from '../../../../domain/repositories/user/IBookmarkRepository';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { DynamoDBClientFactory } from '../client';

export class DynamoBookmarkRepository implements IBookmarkRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Bookmarks';
    }

    async save(userId: UserId, threadId: ThreadId): Promise<void> {
        const item = {
            userId: userId.getValue(),
            threadId: threadId.getValue(),
            createdAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async delete(userId: UserId, threadId: ThreadId): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    userId: userId.getValue(),
                    threadId: threadId.getValue(),
                },
            }),
        );
    }

    async findByUserId(userId: UserId, limit?: number, offset?: number): Promise<ThreadId[]> {
        const params: any = {
            TableName: this.tableName,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId.getValue(),
            },
        };

        if (limit) {
            params.Limit = limit;
        }

        const result = await this.client.send(new QueryCommand(params));

        if (!result.Items) {
            return [];
        }

        let items = result.Items;
        if (offset && offset > 0) {
            items = items.slice(offset);
        }

        return items.map((item) => ThreadId.fromExisting(item.threadId));
    }
}
