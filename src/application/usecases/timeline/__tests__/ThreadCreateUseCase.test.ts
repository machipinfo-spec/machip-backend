jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { ThreadCreateUseCase } from '../ThreadCreateUseCase';
import { IThreadRepository } from '../../../../domain/repositories/timeline/IThreadRepository';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { IContentModerationQueue } from '../../../../domain/repositories/queue/IContentModerationQueue';
import { MessageSendingService } from '../../../services/inbox/MessageSendingService';
import { Profile } from '../../../../domain/entities/profile/profile';
import { Thread } from '../../../../domain/entities/timeline/thread';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { ThreadName } from '../../../../domain/value-object/map/threadName';

describe('ThreadCreateUseCase', () => {
    let mockThreadRepository: jest.Mocked<IThreadRepository>;
    let mockProfileRepository: jest.Mocked<IProfileRepository>;
    let mockMessageSendingService: jest.Mocked<MessageSendingService>;
    let mockContentModerationQueue: jest.Mocked<IContentModerationQueue>;
    let useCase: ThreadCreateUseCase;
    const validUserId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        mockThreadRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
            findByThreadIds: jest.fn(),
            findByUserIds: jest.fn(),
            softDelete: jest.fn(),
            findByOwnerUserId: jest.fn(),
            findByTimeline: jest.fn(),
        } as any;

        mockProfileRepository = {
            findByUserId: jest.fn(),
        } as any;

        mockMessageSendingService = {
            sendMessage: jest.fn(),
        } as any;

        mockContentModerationQueue = {
            sendMessage: jest.fn(),
        } as any;

        useCase = new ThreadCreateUseCase(
            mockThreadRepository,
            mockProfileRepository,
            mockMessageSendingService,
            mockContentModerationQueue,
        );
        jest.clearAllMocks();
    });

    it('should create a simple thread', async () => {
        const profileMock = {
            userId: { getValue: () => validUserId },
            userName: { getValue: () => 'Test User' },
            imageUrl: { getValue: () => 'avatar.jpg' },
        } as unknown as Profile;

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(profileMock);

        const result = await useCase.execute('New Thread', validUserId, null, 'image.jpg', null);

        expect(result.thread).not.toBeNull();
        expect(result.thread?.threadName).toBe('New Thread');
        expect(mockThreadRepository.save).toHaveBeenCalledTimes(1);
        // MessageSendingService should NOT be called for root thread
        expect(mockMessageSendingService.sendMessage).not.toHaveBeenCalled();
    });

    it('should create a child thread and notify parent owner', async () => {
        const parentId = '87654321-4321-4000-8000-210987654321';
        const parentOwnerId = '99999999-9999-4000-8000-999999999999';

        const parentThreadMock = {
            toPrimitives: () => ({ id: parentId }),
            getOwnerUserId: () => ({ getValue: () => parentOwnerId }),
            addChildThread: jest.fn().mockImplementation((childId) => ({
                ...parentThreadMock, // return self usually, but here we mock return
                toPrimitives: () => ({ id: parentId }),
                getOwnerUserId: () => ({ getValue: () => parentOwnerId }),
            })),
        } as unknown as Thread;

        const profileMock = {
            userId: { getValue: () => validUserId },
            userName: { getValue: () => 'Replier' },
            imageUrl: { getValue: () => 'avatar.jpg' },
        } as unknown as Profile;

        (mockThreadRepository.findById as jest.Mock).mockResolvedValue(parentThreadMock);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(profileMock);

        const result = await useCase.execute('Reply Thread', validUserId, null, null, parentId);

        expect(result.thread).not.toBeNull();
        expect(result.thread?.parentThreadId).toBe(parentId);

        // Save called twice: once for new thread, once for parent update
        expect(mockThreadRepository.save).toHaveBeenCalledTimes(2);

        // Notify
        expect(mockMessageSendingService.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'reply',
                targetUserIds: [parentOwnerId],
            }),
        );
    });
});
