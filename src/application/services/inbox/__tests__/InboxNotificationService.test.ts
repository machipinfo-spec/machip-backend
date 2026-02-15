import { InboxNotificationService } from '../InboxNotificationService';
import { Logger } from '../../../../shared/logger';

// Mock Logger
const mockLoggerInstance = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

jest.mock('../../../../shared/logger', () => {
    return {
        Logger: jest.fn().mockImplementation(() => mockLoggerInstance),
    };
});

describe('InboxNotificationService', () => {
    let service: InboxNotificationService;
    let mockPushService: any;

    beforeEach(() => {
        mockPushService = {
            sendToUser: jest.fn().mockResolvedValue(undefined),
        };
        service = new InboxNotificationService(mockPushService);
        jest.clearAllMocks();
    });

    describe('notifyNewMessage', () => {
        it('should log notification data', async () => {
            const data = {
                userId: 'user1',
                messageId: 'msg1',
                messageType: 'system' as const,
                subject: 'Subject',
                senderName: 'Sender',
            };

            await service.notifyNewMessage(data);

            expect(mockLoggerInstance.info).toHaveBeenCalledWith('新着メッセージ通知送信開始', { userId: data.userId });
            expect(mockLoggerInstance.info).toHaveBeenCalledWith('新着メッセージ通知送信完了', { userId: data.userId });
        });

        it('should handle error gracefully', async () => {
            mockLoggerInstance.info.mockImplementationOnce(() => {
                throw new Error('Log fail');
            });

            const data = {
                userId: 'user1',
                messageId: 'msg1',
                messageType: 'system' as const,
                subject: 'Subject',
                senderName: 'Sender',
            };

            await service.notifyNewMessage(data);

            expect(mockLoggerInstance.error).toHaveBeenCalled();
        });
    });

    describe('notifyUnreadCountUpdate', () => {
        it('should log unread count update', async () => {
            const userId = 'user1';
            const counts = { total: 5, system: 3, ai: 2 };

            await service.notifyUnreadCountUpdate(userId, counts);

            expect(mockLoggerInstance.info).toHaveBeenCalledWith('未読件数更新通知送信', { userId, counts });
        });
    });
});
