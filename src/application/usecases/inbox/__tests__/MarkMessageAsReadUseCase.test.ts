jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { MarkMessageAsReadUseCase } from '../MarkMessageAsReadUseCase';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { Logger } from '../../../../shared/logger';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { UserId } from '../../../../domain/value-object/users/UserId';

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as unknown as Logger;

// Mock Repository
const mockUserMessageRepository: IUserMessageRepository = {
    save: jest.fn(),
    findByUserId: jest.fn(),
    findByFilter: jest.fn(),
    getUnreadCountByUserId: jest.fn(),
    getUnreadCountByUserIdAndType: jest.fn(),
    markAsRead: jest.fn(),
    existsByUserAndMessage: jest.fn(), // Ensure this method exists in interface or mock it if UseCase casts it
} as any;

describe('MarkMessageAsReadUseCase', () => {
    let useCase: MarkMessageAsReadUseCase;

    beforeEach(() => {
        useCase = new MarkMessageAsReadUseCase(mockUserMessageRepository, mockLogger);
        jest.clearAllMocks();
    });

    it('should mark message as read if exists', async () => {
        const userId = '12345678-1234-4000-8000-123456789012';
        const messageId = '12345678-1234-4000-8000-123456789012';
        const request = { userId, messageId };

        (mockUserMessageRepository.existsByUserAndMessage as jest.Mock).mockResolvedValue(true);

        const result = await useCase.execute(request);

        expect(mockUserMessageRepository.existsByUserAndMessage).toHaveBeenCalledWith(
            expect.any(UserId),
            expect.any(MessageId),
        );
        expect(mockUserMessageRepository.markAsRead).toHaveBeenCalledWith(expect.any(UserId), expect.any(MessageId));
        expect(result.success).toBe(true);
    });

    it('should throw error if message does not exist', async () => {
        const userId = '12345678-1234-4000-8000-123456789012';
        const messageId = '12345678-1234-4000-8000-123456789012';
        const request = { userId, messageId };

        (mockUserMessageRepository.existsByUserAndMessage as jest.Mock).mockResolvedValue(false);

        await expect(useCase.execute(request)).rejects.toThrow('指定されたメッセージが見つかりません');

        expect(mockUserMessageRepository.markAsRead).not.toHaveBeenCalled();
    });
});
