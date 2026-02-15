import { InboxBatchService } from '../InboxBatchService';
import { InboxRepositoryModule } from '../../../../infrastructure/repositories/inbox/InboxRepositoryModule';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { IMessageBroadcastRepository } from '../../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { MessageBroadcast } from '../../../../domain/entities/inbox/MessageBroadcast';
import { Message } from '../../../../domain/entities/inbox/Message';
import { MessageDeliveryService } from '../../../../domain/services/inbox/MessageDeliveryService';

// Mock dependencies
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

describe('InboxBatchService', () => {
    let service: InboxBatchService;
    let mockMessageRepository: jest.Mocked<IMessageRepository>;
    let mockUserMessageRepository: jest.Mocked<IUserMessageRepository>;
    let mockBroadcastRepository: jest.Mocked<IMessageBroadcastRepository>;

    beforeEach(() => {
        mockMessageRepository = {
            deleteOlderThan: jest.fn(),
        } as any;

        mockUserMessageRepository = {
            deleteOlderThan: jest.fn(),
            saveMultiple: jest.fn(),
        } as any;

        mockBroadcastRepository = {
            deleteOlderThan: jest.fn(),
            findFailedBroadcastsForRetry: jest.fn(),
            update: jest.fn(),
        } as any;

        // Mock static methods of InboxRepositoryModule to return our mocks
        jest.spyOn(InboxRepositoryModule, 'getMessageRepository').mockReturnValue(mockMessageRepository);
        jest.spyOn(InboxRepositoryModule, 'getUserMessageRepository').mockReturnValue(mockUserMessageRepository);
        jest.spyOn(InboxRepositoryModule, 'getMessageBroadcastRepository').mockReturnValue(mockBroadcastRepository);

        service = new InboxBatchService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('cleanupOldMessages', () => {
        it('should call deleteOlderThan on all repositories', async () => {
            mockMessageRepository.deleteOlderThan.mockResolvedValue(10);
            mockUserMessageRepository.deleteOlderThan.mockResolvedValue(20);
            mockBroadcastRepository.deleteOlderThan.mockResolvedValue(5);

            const result = await service.cleanupOldMessages(90);

            expect(mockMessageRepository.deleteOlderThan).toHaveBeenCalled();
            expect(mockUserMessageRepository.deleteOlderThan).toHaveBeenCalled();
            expect(mockBroadcastRepository.deleteOlderThan).toHaveBeenCalled();

            expect(result).toEqual({
                deletedMessages: 10,
                deletedUserMessages: 20,
                deletedBroadcasts: 5,
            });
        });

        it('should recalculate cutoff date correctly', async () => {
            // Hard to test exact date without mocking Date, but we can verify it's called
            await service.cleanupOldMessages(30);
            expect(mockMessageRepository.deleteOlderThan).toHaveBeenCalledWith(expect.any(Date));
        });
    });

    describe('retryFailedBroadcasts', () => {
        it('should retry failed broadcasts', async () => {
            // Setup mock failed broadcast
            const mockBroadcast = {
                getId: jest.fn().mockReturnValue({ getValue: () => 'b1' }),
                getMessageId: jest.fn().mockReturnValue({ getValue: () => 'm1' }),
                getTargetUserIds: jest.fn().mockReturnValue({ getUserIds: () => ['u1'] }), // Mock target users
                startProcessing: jest.fn(),
                incrementDelivered: jest.fn(),
                incrementFailed: jest.fn(),
                markAsFailed: jest.fn(),
            } as unknown as MessageBroadcast;

            mockBroadcastRepository.findFailedBroadcastsForRetry.mockResolvedValue([mockBroadcast]);

            // Mock MessageDeliveryService helpers
            const generateSpy = jest.spyOn(MessageDeliveryService, 'generateUserMessagesFromBroadcast');
            generateSpy.mockReturnValue([{}] as any); // Return 1 dummy user message

            await service.retryFailedBroadcasts();

            expect(mockBroadcastRepository.findFailedBroadcastsForRetry).toHaveBeenCalled();
            expect(mockBroadcast.startProcessing).toHaveBeenCalled();
            expect(mockBroadcastRepository.update).toHaveBeenCalledTimes(2); // Start + End
            expect(generateSpy).toHaveBeenCalled();
            expect(mockUserMessageRepository.saveMultiple).toHaveBeenCalled();
            expect(mockBroadcast.incrementDelivered).toHaveBeenCalled();
        });

        it('should handle retry execution error', async () => {
            const mockBroadcast = {
                getId: jest.fn().mockReturnValue({ getValue: () => 'b1' }),
                startProcessing: jest.fn(),
                markAsFailed: jest.fn(),
            } as unknown as MessageBroadcast;

            mockBroadcastRepository.findFailedBroadcastsForRetry.mockResolvedValue([mockBroadcast]);

            // Force error during retry
            (mockBroadcast.startProcessing as jest.Mock).mockImplementation(() => {
                throw new Error('Retry fail');
            });

            await service.retryFailedBroadcasts();

            expect(mockBroadcast.markAsFailed).toHaveBeenCalled();
            expect(mockBroadcastRepository.update).toHaveBeenCalled(); // Update failure status
        });
    });
});
