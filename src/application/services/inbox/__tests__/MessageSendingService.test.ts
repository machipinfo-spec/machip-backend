import { MessageSendingService, MessageSendingRequest } from '../MessageSendingService';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { IMessageBroadcastRepository } from '../../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { Logger } from '../../../../shared/logger';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { Profile } from '../../../../domain/entities/profile/profile';
import { UserName } from '../../../../domain/value-object/users/UserName';
import { ImageUrl } from '../../../../domain/value-object/users/ImageUrl';
import { Introduction } from '../../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../../domain/value-object/profile/ProfileUrl';
import { Message } from '../../../../domain/entities/inbox/Message';
import { MessageType } from '../../../../domain/value-object/inbox/MessageType';
import { MessageSubject } from '../../../../domain/value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../../domain/value-object/inbox/SystemMessageContent';
import { CreatedAt } from '../../../../domain/value-object/inbox/CreatedAt';
import { ReadStatus } from '../../../../domain/value-object/inbox/ReadStatus';
import { UserMessage } from '../../../../domain/value-object/inbox/UserMessage';

// Mock dependencies
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

describe('MessageSendingService', () => {
    let service: MessageSendingService;
    let mockProfileRepository: jest.Mocked<IProfileRepository>;
    let mockMessageRepository: jest.Mocked<IMessageRepository>;
    let mockUserMessageRepository: jest.Mocked<IUserMessageRepository>;
    let mockBroadcastRepository: jest.Mocked<IMessageBroadcastRepository>;
    let mockUserRepository: jest.Mocked<IUserRepository>;
    let mockLogger: jest.Mocked<Logger>;

    const senderUserIdStr = '11111111-1234-4000-8000-111111111111';
    const targetUserIdStr = '22222222-1234-4000-8000-222222222222';
    const senderUserId = UserId.fromExisting(senderUserIdStr);
    const targetUserId = UserId.fromExisting(targetUserIdStr);

    beforeEach(() => {
        mockProfileRepository = {
            findByUserId: jest.fn(),
            save: jest.fn(),
        } as any;

        mockMessageRepository = {
            save: jest.fn(),
        } as any;

        mockUserMessageRepository = {
            save: jest.fn(),
            saveMultiple: jest.fn(),
        } as any;

        mockBroadcastRepository = {
            save: jest.fn(),
            update: jest.fn(),
        } as any;

        mockUserRepository = {
            findAll: jest.fn(),
        } as any;

        const logger = new Logger('Test');
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as unknown as jest.Mocked<Logger>;

        service = new MessageSendingService(
            mockProfileRepository,
            mockMessageRepository,
            mockUserMessageRepository,
            mockBroadcastRepository,
            mockUserRepository,
            mockLogger,
        );

        // Setup default mock responses
        mockProfileRepository.findByUserId.mockResolvedValue(
            Profile.create(
                senderUserId,
                UserName.create('Sender'),
                ImageUrl.create('http://example.com/img.png'),
                Introduction.create(''),
                ProfileUrl.create(''),
            ),
        );
    });

    describe('sendMessage', () => {
        const baseSystemRequest: MessageSendingRequest = {
            type: 'system',
            subject: 'Test Subject',
            content: { message: 'Test Content' },
            senderUserId: senderUserIdStr,
            deliveryType: 'single',
            targetUserIds: [targetUserIdStr],
        };

        it('should validate request', async () => {
            const invalidRequest = { ...baseSystemRequest, subject: '' };
            await expect(service.sendMessage(invalidRequest as any)).rejects.toThrow('件名は必須です');
        });

        it('should create sender profile if not exists', async () => {
            mockProfileRepository.findByUserId.mockResolvedValue(null);

            await service.sendMessage(baseSystemRequest);

            expect(mockProfileRepository.save).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('メッセージ送信サービス開始', expect.anything());
        });

        it('should save message', async () => {
            await service.sendMessage(baseSystemRequest);
            expect(mockMessageRepository.save).toHaveBeenCalledWith(expect.any(Message));
        });

        it('should deliver to single user', async () => {
            const result = await service.sendMessage(baseSystemRequest);

            expect(mockUserMessageRepository.save).toHaveBeenCalledWith(expect.any(UserMessage));
            expect(result.deliveredCount).toBe(1);
            expect(result.success).toBe(true);
        });

        it('should deliver to multiple users', async () => {
            const request: MessageSendingRequest = {
                ...baseSystemRequest,
                deliveryType: 'multiple',
                targetUserIds: [targetUserIdStr, '33333333-1234-4000-8000-333333333333'],
            };

            const result = await service.sendMessage(request);

            expect(mockBroadcastRepository.save).toHaveBeenCalled(); // create
            expect(mockUserMessageRepository.saveMultiple).toHaveBeenCalled();
            expect(mockBroadcastRepository.update).toHaveBeenCalled(); // update progress
            expect(result.deliveredCount).toBe(2);
            expect(result.broadcastId).toBeDefined();
        });

        it('should deliver to all users', async () => {
            const request: MessageSendingRequest = {
                ...baseSystemRequest,
                deliveryType: 'all',
                targetUserIds: undefined,
            };

            mockUserRepository.findAll.mockResolvedValue([
                { userId: targetUserId } as any,
                { userId: UserId.fromExisting('33333333-1234-4000-8000-333333333333') } as any,
            ]);

            const result = await service.sendMessage(request);

            expect(mockUserRepository.findAll).toHaveBeenCalled();
            expect(mockBroadcastRepository.save).toHaveBeenCalled();
            expect(result.deliveredCount).toBe(2);
        });

        it('should handle delivery error for multiple users', async () => {
            const request: MessageSendingRequest = {
                ...baseSystemRequest,
                deliveryType: 'multiple',
                targetUserIds: [targetUserIdStr],
            };

            mockUserMessageRepository.saveMultiple.mockRejectedValue(new Error('Save failed'));

            await expect(service.sendMessage(request)).rejects.toThrow('Save failed');

            // Should mark as failed
            expect(mockBroadcastRepository.update).toHaveBeenCalled();
            // Verify log error
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Helper methods', () => {
        it('should send system message', async () => {
            const spy = jest.spyOn(service, 'sendMessage');
            // Mock sendMessage execution to avoid full chain failure if dependencies not perfectly reset
            // or just let it run since mocks are in beforeEach. Let's let it run but mock return.
            spy.mockResolvedValue({ messageId: '1', deliveredCount: 1, success: true, message: 'ok' });

            await service.sendSystemMessage('Sub', 'Msg', 'single', [targetUserIdStr]);

            expect(spy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'system',
                    subject: 'Sub',
                    deliveryType: 'single',
                }),
            );
        });
    });
});
