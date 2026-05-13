import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
    IContentModerationQueue,
    ContentModerationRequest,
} from '../../../domain/repositories/queue/IContentModerationQueue';

export class SqsContentModerationQueue implements IContentModerationQueue {
    private readonly client: SQSClient;
    private readonly queueUrl: string;

    constructor() {
        this.client = new SQSClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
        // Queue URL should be constructed or passed via env.
        // Usually: https://sqs.{region}.amazonaws.com/{accountId}/{QueueName}
        // For local (POC), it might be different or mocked.
        // Assuming env var CONTENT_MODERATION_QUEUE_URL is set by SAM.
        this.queueUrl = process.env.CONTENT_MODERATION_QUEUE_URL || '';
    }

    async sendMessage(request: ContentModerationRequest): Promise<void> {
        if (!this.queueUrl) {
            console.warn('ContentModerationQueue: Queue URL is not set. Skipping message sending.');
            return;
        }

        const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(request),
        });

        await this.client.send(command);
    }
}
