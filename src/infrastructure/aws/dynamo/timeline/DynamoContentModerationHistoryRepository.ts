import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IContentModerationHistoryRepository } from '../../../../domain/repositories/timeline/IContentModerationHistoryRepository';
import { ContentModerationHistory } from '../../../../domain/entities/timeline/contentModerationHistory';
import { DynamoDBClientFactory } from '../client';

export class DynamoContentModerationHistoryRepository implements IContentModerationHistoryRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = process.env.CONTENT_MODERATION_HISTORY_TABLE_NAME || 'ContentModerationHistories';
    }

    async save(history: ContentModerationHistory): Promise<void> {
        const dto = history.toPrimitives();
        const item = {
            id: dto.id,
            targetId: dto.targetId,
            content: dto.content,
            isViolation: dto.isViolation,
            reason: dto.reason,
            aiResponse: dto.aiResponse,
            createdAt: dto.createdAt.toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }
}
