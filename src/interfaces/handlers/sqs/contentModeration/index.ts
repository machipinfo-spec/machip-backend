import { SQSEvent, SQSHandler } from 'aws-lambda';
import { ContentModerationService } from '../../../../application/services/timeline/ContentModerationService';
import { DynamoContentModerationHistoryRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoContentModerationHistoryRepository';
import { DynamoThreadRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { DynamoResponseRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoResponseRepository';
import { EnhancedDeepSeekApiRepository } from '../../../../infrastructure/deep-seek/EnhancedDeepSeekApiRepository';
import { ContentModerationRequest } from '../../../../domain/repositories/queue/IContentModerationQueue';

const historyRepo = new DynamoContentModerationHistoryRepository();
const threadRepo = new DynamoThreadRepository();
const responseRepo = new DynamoResponseRepository();
const aiRepo = new EnhancedDeepSeekApiRepository();
const service = new ContentModerationService(historyRepo, threadRepo, responseRepo, aiRepo);

export const lambdaHandler: SQSHandler = async (event: SQSEvent) => {
    console.log('ContentModerationHandler: Start processing', { records: event.Records.length });

    for (const record of event.Records) {
        try {
            console.log('Processing record', { messageId: record.messageId });
            const body = JSON.parse(record.body) as ContentModerationRequest;
            await service.execute(body);
            console.log('Successfully processed record', { messageId: record.messageId });
        } catch (error) {
            console.error('Error processing SQS message:', error, { record });
            // Throwing error to trigger Lambda retry/DLQ logic
            throw error;
        }
    }
};
