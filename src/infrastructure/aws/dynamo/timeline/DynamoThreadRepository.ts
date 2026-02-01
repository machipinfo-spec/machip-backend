import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    QueryCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { IThreadRepository } from '../../../../domain/repositories/timeline/IThreadRepository';
import { Thread } from '../../../../domain/entities/timeline/thread';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { ThreadName } from '../../../../domain/value-object/map/threadName';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { DynamoDBClientFactory } from '../client';

export class DynamoThreadRepository implements IThreadRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Threads';
    }

    async save(thread: Thread): Promise<void> {
        const dto = thread.toPrimitives();
        const item: any = {
            id: dto.id,
            threadName: dto.threadName,
            createdAt: dto.createdAt.toISOString(),
            ownerUserId: dto.ownerUserId,
            childThreadIds: dto.childThreadIds,
            updatedAt: new Date().toISOString(),
        };

        if (dto.deleatedAt) item.deleatedAt = dto.deleatedAt.toISOString();
        if (dto.parentThreadId) item.parentThreadId = dto.parentThreadId;
        if (dto.mapPointInfoId) item.mapPointInfoId = dto.mapPointInfoId;
        if (dto.imageUrl) item.imageUrl = dto.imageUrl;

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async findById(threadId: string): Promise<Thread | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    id: threadId,
                },
            }),
        );

        if (!result.Item || result.Item.deleatedAt) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByOwnerUserId(ownerUserId: string, limit?: number, offset?: number): Promise<Thread[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'OwnerUserIdIndex',
                KeyConditionExpression: 'ownerUserId = :uid',
                ExpressionAttributeValues: {
                    ':uid': ownerUserId,
                },
                Limit: limit,
                // Offset via ExclusiveStartKey not directly supported with number offset.
                // Pagination usually needs LastEvaluatedKey. Ignoring offset alias for now.
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findByParentThreadId(parentThreadId: string, limit?: number, offset?: number): Promise<Thread[]> {
        // Assuming GSI
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'ParentThreadIdIndex',
                KeyConditionExpression: 'parentThreadId = :pid',
                ExpressionAttributeValues: {
                    ':pid': parentThreadId,
                },
                Limit: limit,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findRootThreads(limit?: number, offset?: number): Promise<Thread[]> {
        // Root threads have parentThreadId = null.
        // Sparse index might not include them if key is missing.
        // Scan with Filter: attribute_not_exists(parentThreadId) OR parentThreadId = :null
        // Efficient way: store explicit isRoot or 'ROOT' as parentId.
        // For now, Scan.
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                FilterExpression:
                    '(attribute_not_exists(parentThreadId) OR parentThreadId = :null) AND (attribute_not_exists(deleatedAt) OR deleatedAt = :null)',
                ExpressionAttributeValues: {
                    ':null': null,
                },
            }),
        );

        if (!result.Items) {
            return [];
        }

        const threads = result.Items.map((item) => this.mapToEntity(item));

        // Sort by createdAt DESC
        threads.sort((a, b) => b.toPrimitives().createdAt.getTime() - a.toPrimitives().createdAt.getTime());

        if (limit) {
            return threads.slice(0, limit);
        }

        return threads;
    }

    async delete(threadId: string): Promise<void> {
        await this.client.send(
            new UpdateCommand({
                TableName: this.tableName,
                Key: { id: threadId },
                UpdateExpression: 'SET deleatedAt = :now',
                ExpressionAttributeValues: {
                    ':now': new Date().toISOString(),
                },
            }),
        );
    }

    async softDelete(threadId: string): Promise<void> {
        await this.delete(threadId);
    }

    async findBySelectDateRange(start: Date, end: Date, limit: number): Promise<Thread[]> {
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'createdAt BETWEEN :start AND :end',
                ExpressionAttributeValues: {
                    ':start': start.toISOString(),
                    ':end': end.toISOString(),
                },
                Limit: limit,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findByMapPointInfoId(mapPointInfoId: string): Promise<Thread | null> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'MapPointInfoIdIndex',
                KeyConditionExpression: 'mapPointInfoId = :mid',
                ExpressionAttributeValues: {
                    ':mid': mapPointInfoId,
                },
                Limit: 1,
            }),
        );

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        return this.mapToEntity(result.Items[0]);
    }

    async findByMapPointInfoIds(mapPointInfoIds: string[]): Promise<Thread[]> {
        if (mapPointInfoIds.length === 0) return [];

        const promises = mapPointInfoIds.map((id) => this.findByMapPointInfoId(id));
        const results = await Promise.all(promises);

        return results.filter((t): t is Thread => t !== null);
    }

    private mapToEntity(item: any): Thread {
        return Thread.fromExisting(
            ThreadId.fromExisting(item.id),
            new ThreadName(item.threadName),
            new Date(item.createdAt),
            item.deleatedAt ? new Date(item.deleatedAt) : null,
            new UserId(item.ownerUserId),
            item.parentThreadId ? ThreadId.fromExisting(item.parentThreadId) : null,
            (item.childThreadIds || []).map((id: string) => ThreadId.fromExisting(id)),
            item.mapPointInfoId ? PointInfoId.fromExisting(item.mapPointInfoId) : null,
            item.imageUrl || null,
        );
    }
}
