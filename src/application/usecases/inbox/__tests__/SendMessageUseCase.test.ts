import { SendMessageUseCase } from '../SendMessageUseCase';
import { Logger } from '../../../../shared/logger';
import { MessageSendingService } from '../../../services/inbox/MessageSendingService';

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as unknown as Logger;

// Mock MessageSendingService
const mockMessageSendingService = {
    sendMessage: jest.fn(),
};

describe('SendMessageUseCase', () => {
    let useCase: SendMessageUseCase;

    beforeEach(() => {
        useCase = new SendMessageUseCase(mockMessageSendingService as unknown as MessageSendingService, mockLogger);
        jest.clearAllMocks();
    });

    it('should delegate to MessageSendingService and return result', async () => {
        const request = {
            subject: 'Test Subject',
            body: 'Test Body',
            senderAuthId: 'auth-123',
            targetType: 'all',
        };

        const expectedResult = {
            messageId: 'msg-123',
            broadcastId: 'broadcast-123',
            deliveredCount: 10,
            success: true,
            message: 'Message sent successfully',
        };

        mockMessageSendingService.sendMessage.mockResolvedValue(expectedResult);

        const result = await useCase.execute(request as any);

        expect(mockLogger.info).toHaveBeenCalledWith('SendMessageUseCase実行開始', { request });
        expect(mockMessageSendingService.sendMessage).toHaveBeenCalledWith(request);
        expect(mockLogger.info).toHaveBeenCalledWith('SendMessageUseCase実行完了', {
            messageId: expectedResult.messageId,
            deliveredCount: expectedResult.deliveredCount,
        });
        expect(result).toBe(expectedResult);
    });

    it('should handle errors and log them', async () => {
        const request = {
            subject: 'Test Subject',
            body: 'Test Body',
            senderAuthId: 'auth-123',
            targetType: 'all',
        };

        const error = new Error('Sending failed');
        mockMessageSendingService.sendMessage.mockRejectedValue(error);

        await expect(useCase.execute(request as any)).rejects.toThrow('Sending failed');

        expect(mockLogger.error).toHaveBeenCalledWith('SendMessageUseCaseエラー', { error, request });
    });
});
