import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    QueryCommand,
    DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { IReactionRepository } from '../../../../domain/repositories/timeline/IReactionRepository';
import { Reaction } from '../../../../domain/entities/timeline/reaction';
import { ReactionsId } from '../../../../domain/value-object/timeline/reactionId';
import { ReactionType } from '../../../../domain/value-object/timeline/reactionType';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoReactionRepository implements IReactionRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Reactions';
    }

    async save(reaction: Reaction): Promise<void> {
        const dto = reaction.toPrimitives();
        const item = {
            id: dto.id,
            reactionsType: dto.reactionsType,
            parentId: dto.parentId,
            createdAt: dto.createdAt.toISOString(),
            deleatedAt: dto.deleatedAt ? dto.deleatedAt.toISOString() : null,
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

    async findById(reactionsId: string): Promise<Reaction | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    id: reactionsId,
                },
            }),
        );

        if (!result.Item || result.Item.deleatedAt) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByParentId(parentId: string, limit?: number): Promise<Reaction[]> {
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

    async delete(reactionId: string): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    id: reactionId,
                },
            }),
        );
    }

    async softDelete(reactionId: string): Promise<void> {
        await this.client.send(
            new UpdateCommand({
                TableName: this.tableName,
                Key: {
                    id: reactionId,
                },
                UpdateExpression: 'SET deleatedAt = :now',
                ExpressionAttributeValues: {
                    ':now': new Date().toISOString(),
                },
            }),
        );
    }

    private mapToEntity(item: any): Reaction {
        return Reaction.fromExisting(
            ReactionsId.fromExisting(item.id),
            new ReactionType(item.reactionsType),
            ThreadId.fromExisting(item.parentId), // Same assumption as ResponseRepo
            new Date(item.createdAt),
            item.deleatedAt ? new Date(item.deleatedAt) : null,
            new UserId(item.ownerUserId),
        );
    }
}
