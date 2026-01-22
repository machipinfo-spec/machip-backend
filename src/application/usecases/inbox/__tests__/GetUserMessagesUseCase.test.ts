jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { GetUserMessagesUseCase } from '../GetUserMessagesUseCase';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { Logger } from '../../../../shared/logger';
import { UserMessageCollection } from '../../../../domain/entities/inbox/UserMessageCollection';
import { UserMessage } from '../../../../domain/value-object/inbox/UserMessage';
import { Message } from '../../../../domain/entities/inbox/Message';
import { Profile } from '../../../../domain/entities/profile/profile';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { MessageType } from '../../../../domain/value-object/inbox/MessageType';
import { MessageSubject } from '../../../../domain/value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../../domain/value-object/inbox/SystemMessageContent';
import { CreatedAt } from '../../../../domain/value-object/inbox/CreatedAt';
import { ReadStatus } from '../../../../domain/value-object/inbox/ReadStatus';
import { UserName } from '../../../../domain/value-object/users/UserName';
// Note: AvatarUrl might be named differently or ImageUrl.
// GetUserMessagesUseCase.ts uses profile.imageUrl.
// Let's check Profile entity later if needed, but for now assuming structure.
// Actually Profile entity uses ImageUrl?
// Let's use any for mock returns to avoid deep dependency issues if possible, othewise strictly typed.
// The UseCase imports Profile.

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as unknown as Logger;

// Mock Repositories
const mockMessageRepository: IMessageRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    findByThreadId: jest.fn(), // If exists
} as any;

const mockUserMessageRepository: IUserMessageRepository = {
    save: jest.fn(),
    findByUserId: jest.fn(),
    findByFilter: jest.fn(),
    getUnreadCountByUserId: jest.fn(),
    getUnreadCountByUserIdAndType: jest.fn(),
    markAsRead: jest.fn(),
} as any;

const mockProfileRepository: IProfileRepository = {
    save: jest.fn(),
    findByUserId: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProfileId: jest.fn(),
    findByUserIds: jest.fn(),
    softDelete: jest.fn(),
};

describe('GetUserMessagesUseCase', () => {
    let useCase: GetUserMessagesUseCase;

    beforeEach(() => {
        useCase = new GetUserMessagesUseCase(
            mockMessageRepository,
            mockUserMessageRepository,
            mockProfileRepository,
            mockLogger,
        );
        jest.clearAllMocks();
    });

    it('should return messages with resolved details', async () => {
        const userIdString = '12345678-1234-4000-8000-123456789012';
        const request = { userId: userIdString };

        // Mock UserMessage
        const mockUserMessage = {
            getId: () => ({ getValue: () => 'um-1' }),
            getMessageId: () => ({ getValue: () => 'msg-1' }),
            getDeliveredAt: () => ({ toISOString: () => '2023-01-01T00:00:00Z' }),
            getReadAt: () => ({ toISOString: () => null }),
            isRead: () => false,
        } as unknown as UserMessage;

        const mockCollection = {
            getAll: () => [mockUserMessage],
            count: () => 1,
        } as unknown as UserMessageCollection;

        // Mock Message
        const mockMessage = {
            getId: () => ({ getValue: () => 'msg-1' }),
            getType: () => ({ getValue: () => 'system' }),
            getSubject: () => ({ getValue: () => 'Subject' }),
            getContent: () => ({ toJSON: () => '{"message":"Content"}' }),
            getSenderUserId: () => ({ getValue: () => 'sender-1' }), // Valid UUID not strictly required for Mock logic unless instantiated
            getCreatedAt: () => ({ toISOString: () => '2023-01-01T00:00:00Z' }),
        } as unknown as Message;

        // Mock Profile
        const mockProfile = {
            userName: { getValue: () => 'Sender Name' },
            imageUrl: { getValue: () => 'http://avatar.url' },
        } as unknown as Profile;

        (mockUserMessageRepository.findByFilter as jest.Mock).mockResolvedValue(mockCollection);
        (mockMessageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);
        (mockUserMessageRepository.getUnreadCountByUserId as jest.Mock).mockResolvedValue(5);
        (mockUserMessageRepository.getUnreadCountByUserIdAndType as jest.Mock).mockResolvedValue(2);

        const response = await useCase.execute(request);

        expect(mockUserMessageRepository.findByFilter).toHaveBeenCalled();
        expect(mockMessageRepository.findById).toHaveBeenCalled();
        expect(mockProfileRepository.findByUserId).toHaveBeenCalled();

        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].message.sender.name).toBe('Sender Name');
        expect(response.summary.unreadCount).toBe(5);
        expect(response.summary.systemUnreadCount).toBe(2);
    });

    it('should throw error if profile not found', async () => {
        const userIdString = '12345678-1234-4000-8000-123456789012';
        const request = { userId: userIdString };

        const mockUserMessage = {
            getId: () => ({ getValue: () => 'um-1' }),
            getMessageId: () => ({ getValue: () => 'msg-1' }),
        } as unknown as UserMessage;

        const mockCollection = {
            getAll: () => [mockUserMessage],
            count: () => 1,
        } as unknown as UserMessageCollection;

        const mockMessage = {
            getId: () => ({ getValue: () => 'msg-1' }),
            getSenderUserId: () => ({ getValue: () => 'sender-1' }),
        } as unknown as Message;

        (mockUserMessageRepository.findByFilter as jest.Mock).mockResolvedValue(mockCollection);
        (mockMessageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null); // Profile not found

        await expect(useCase.execute(request)).rejects.toThrow('関連するプロフィールが見つかりません');
    });
});
