import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { IPointEventRepository } from '../../../../domain/repositories/map/IPointEventRepository';
import { PointEvent } from '../../../../domain/entities/map/PointEvent';
import { PointEventId } from '../../../../domain/value-object/map/pointEventId';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../../domain/value-object/map/threadName';
import { DynamoDBClientFactory } from '../client';

export class DynamoPointEventRepository implements IPointEventRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'PointEvents';
    }

    async save(pointEvent: PointEvent): Promise<void> {
        const dto = pointEvent.toPrimitives();
        const item = {
            id: dto.id,
            pointInfoId: dto.pointInfoId,
            threadName: dto.threadName,
            imageUrl: dto.imageUrl,
            createdAt: dto.createdAt.toISOString(),
            startDate: dto.startDate.toISOString(),
            endDate: dto.endDate.toISOString(),
            detail: dto.detail,
            url: dto.url,
            deletedAt: dto.deletedAt ? dto.deletedAt.toISOString() : null,
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async findByPointInfoId(pointInfoId: string): Promise<PointEvent | null> {
        // Assuming correlation is 1:1 or we want the latest?
        // Interface returns PointEvent | null, so implies 0 or 1.
        // If PointInfo has multiple events, this might be ambiguous.
        // But let's assume Query on GSI and take first.
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'PointInfoIdIndex',
                KeyConditionExpression: 'pointInfoId = :id',
                ExpressionAttributeValues: {
                    ':id': pointInfoId,
                },
                Limit: 1,
            }),
        );

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        return this.mapToEntity(result.Items[0]);
    }

    async findByThreadName(threadName: string): Promise<PointEvent[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'ThreadNameIndex',
                KeyConditionExpression: 'threadName = :name',
                ExpressionAttributeValues: {
                    ':name': threadName,
                },
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findByDateRange(start: Date, end: Date, limit: number): Promise<PointEvent[]> {
        // Full Table Scan with Filter (Not Efficient for large data)
        // Optimization: Create a GSI based on Time if needed.
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'startDate BETWEEN :start AND :end',
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

    private mapToEntity(item: any): PointEvent {
        return PointEvent.fromExisting(
            PointEventId.fromExisting(item.id),
            PointInfoId.fromExisting(item.pointInfoId),
            ThreadName.create(item.threadName),
            item.imageUrl,
            new Date(item.createdAt),
            new Date(item.startDate),
            new Date(item.endDate),
            item.detail,
            item.url,
            item.deletedAt ? new Date(item.deletedAt) : null,
        );
    }
}
