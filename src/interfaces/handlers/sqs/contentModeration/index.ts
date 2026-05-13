import { SQSEvent, SQSHandler } from 'aws-lambda';
import { ContentModerationService } from '../../../../application/services/timeline/ContentModerationService';
import { DynamoContentModerationHistoryRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoContentModerationHistoryRepository';
import { DynamoThreadRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoThreadRepository';
import { DynamoResponseRepository } from '../../../../infrastructure/aws/dynamo/timeline/DynamoResponseRepository';
import { EnhancedDeepSeekApiRepository } from '../../../../infrastructure/deep-seek/EnhancedDeepSeekApiRepository';
import { ContentModerationRequest } from '../../../../domain/repositories/queue/IContentModerationQueue';

import { MessageSendingService } from '../../../../application/services/inbox/MessageSendingService';
import { DynamoProfileRepository } from '../../../../infrastructure/aws/dynamo/profile/DynamoProfileRepository';
import { DynamoMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoMessageBroadcastRepository } from '../../../../infrastructure/aws/dynamo/inbox/DynamoMessageBroadcastRepository';
import { DynamoUserRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoUserRepository';
import { InboxNotificationService } from '../../../../application/services/inbox/InboxNotificationService';
import { FirebasePushNotificationService } from '../../../../infrastructure/firebase/notification/FirebasePushNotificationService';
import { DynamoDeviceTokenRepository } from '../../../../infrastructure/aws/dynamo/user/DynamoDeviceTokenRepository';
import { Logger } from '../../../../shared/logger';

const historyRepo = new DynamoContentModerationHistoryRepository();
const threadRepo = new DynamoThreadRepository();
const responseRepo = new DynamoResponseRepository();
const aiRepo = new EnhancedDeepSeekApiRepository();

// MessageSendingService Dependencies
const profileRepo = new DynamoProfileRepository();
const messageRepo = new DynamoMessageRepository();
const userMessageRepo = new DynamoUserMessageRepository();
const broadcastRepo = new DynamoMessageBroadcastRepository();
const userRepo = new DynamoUserRepository();
const deviceTokenRepo = new DynamoDeviceTokenRepository();
const pushService = new FirebasePushNotificationService(deviceTokenRepo);
const notificationService = new InboxNotificationService(pushService);
const logger = new Logger('ContentModerationFunction');

const messageSendingService = new MessageSendingService(
    profileRepo,
    messageRepo,
    userMessageRepo,
    broadcastRepo,
    userRepo,
    notificationService,
    logger,
);

const service = new ContentModerationService(historyRepo, threadRepo, responseRepo, aiRepo, messageSendingService);

export const lambdaHandler: SQSHandler = async (event: SQSEvent) => {
    console.log('ContentModerationHandler: Start processing', JSON.stringify({ records: event.Records.length, event }));

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
