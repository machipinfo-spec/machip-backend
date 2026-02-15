import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { IResponseRepository } from '../../../../domain/repositories/timeline/IResponseRepository';
import { Response } from '../../../../domain/entities/timeline/response';
import { ResponseId } from '../../../../domain/value-object/timeline/responseId';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { ResponseText } from '../../../../domain/value-object/timeline/responseText';
import { DynamoDBClientFactory } from '../client';

export class DynamoResponseRepository implements IResponseRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Responses';
    }

    async save(response: Response): Promise<void> {
        const dto = response.toPrimitives();
        const item = {
            id: dto.id,
            parentId: dto.parentId,
            createdAt: dto.createdAt.toISOString(),
            deleatedAt: dto.deleatedAt ? dto.deleatedAt.toISOString() : null,
            ownerUserId: dto.ownerUserId,
            responseText: dto.responseText,
            updatedAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async findById(responseId: string): Promise<Response | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    id: responseId,
                },
            }),
        );

        if (!result.Item || result.Item.deleatedAt) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByParentId(parentId: string, limit?: number): Promise<Response[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'ParentIdIndex',
                KeyConditionExpression: 'parentId = :pid',
                ExpressionAttributeValues: {
                    ':pid': parentId,
                },
                Limit: limit,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    async findByOwnerUserId(ownerUserId: string, limit?: number): Promise<Response[]> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'OwnerUserIdIndex',
                KeyConditionExpression: 'ownerUserId = :uid',
                ExpressionAttributeValues: {
                    ':uid': ownerUserId,
                },
                Limit: limit,
            }),
        );

        if (!result.Items) {
            return [];
        }

        return result.Items.map((item) => this.mapToEntity(item));
    }

    private mapToEntity(item: any): Response {
        // ParentId can be ThreadId or ResponseId.
        // ValueObject usually validates format. Assuming generic string or reconstructing based on logic.
        // But constructor takes `ThreadId | ResponseId`.
        // I need to decide which one it is? Or does the VOs handle generic UUIDs?
        // Usually UUIDs are same format.
        // Let's check `ThreadId.create(item.parentId)` vs `ResponseId`.
        // Domain entity construction might be tricky if it strictly checks type.
        // However, usually we just pass the ID.
        // `item.parentId` is a string.
        // I will optimistically check if I can just pass one.
        // Actually, `Response` factory taking `ThreadId | ResponseId` usually means it just holds it.
        // I'll try to cast to ThreadId. If it fails, I might need to know the type.
        // But `Response` entity stores it.
        // Assuming `ThreadId` and `ResponseId` are just ID wrappers.

        return Response.fromExisting(
            ResponseId.fromExisting(item.id),
            ThreadId.fromExisting(item.parentId), // Assuming valid ID string works for ThreadId constructor even if it is ResponseId?
            new Date(item.createdAt),
            item.deleatedAt ? new Date(item.deleatedAt) : null,
            UserId.fromExisting(item.ownerUserId),
            ResponseText.create(item.responseText),
        );
    }
    async delete(responseId: string): Promise<void> {
        const response = await this.findById(responseId);
        if (response) {
            const deletedResponse = response.delete();
            await this.save(deletedResponse);
        }
    }
}
