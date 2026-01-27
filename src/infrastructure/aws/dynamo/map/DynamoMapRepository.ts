import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    ScanCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { IMapRepository } from '../../../../domain/repositories/map/IMapRepository';
import { PointInfo } from '../../../../domain/entities/map/pointInfo';
import { PointInfoId } from '../../../../domain/value-object/map/pointInfoId';
import { GeoLocation } from '../../../../domain/value-object/map/geoLocation';
import { Category } from '../../../../domain/value-object/map/category';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoMapRepository implements IMapRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'PointInfos';
    }

    async save(pointInfo: PointInfo): Promise<void> {
        const dto = pointInfo.toPrimitives();
        const item = {
            id: dto.id,
            lat: dto.lat,
            lng: dto.lng,
            category: dto.category,
            address: dto.address,
            deletedAt: dto.deletedAt ? dto.deletedAt.toISOString() : null,
            ownerUserId: dto.ownerUserId,
            updatedAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async findById(pointInfoId: string): Promise<PointInfo | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    id: pointInfoId,
                },
            }),
        );

        if (!result.Item || result.Item.deletedAt) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByThreadName(threadName: string, limit?: number): Promise<PointInfo[]> {
        // TODO: Implement correlation with PointEvent or Thread to find PointInfos.
        // PointInfo entity does not hold threadName, so we cannot query it directly from this table
        // without a Join or denormalization.
        return [];
    }

    async findByCategory(category: string, limit?: number): Promise<PointInfo[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'CategoryIndex',
                KeyConditionExpression: 'category = :cat',
                ExpressionAttributeValues: {
                    ':cat': category,
                },
                Limit: limit,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findAll(limit?: number): Promise<PointInfo[]> {
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                Limit: limit,
                FilterExpression: 'attribute_not_exists(deletedAt) OR deletedAt = :null',
                ExpressionAttributeValues: {
                    ':null': null,
                },
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async softDelete(pointInfoId: string): Promise<void> {
        await this.client.send(
            new UpdateCommand({
                TableName: this.tableName,
                Key: {
                    id: pointInfoId,
                },
                UpdateExpression: 'SET deletedAt = :now',
                ExpressionAttributeValues: {
                    ':now': new Date().toISOString(),
                },
            }),
        );
    }

    private mapToEntity(item: any): PointInfo {
        return PointInfo.fromExisting(
            PointInfoId.fromExisting(item.id),
            GeoLocation.create(item.lat, item.lng),
            Category.create(item.category),
            item.address,
            item.deletedAt ? new Date(item.deletedAt) : null,
            UserId.fromExisting(item.ownerUserId),
        );
    }
}
