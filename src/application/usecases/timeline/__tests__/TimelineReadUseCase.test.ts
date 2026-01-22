jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { TimelineReadUseCase } from '../TimelineReadUseCase';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';
import { Thread } from '../../../domain/entities/timeline/thread';
import { Profile } from '../../../domain/entities/profile/profile';
import { UserId } from '../../../domain/value-object/users/UserId';

// Mock Repositories
const mockThreadRepository: IThreadRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findRootThreads: jest.fn(),
    findByOwnerUserId: jest.fn(),
} as any;

const mockProfileRepository: IProfileRepository = {
    findByUserId: jest.fn(),
} as any;

const mockPointEventRepository: IPointEventRepository = {
    findByPointInfoId: jest.fn(),
} as any;

describe('TimelineReadUseCase', () => {
    let useCase: TimelineReadUseCase;
    const validUserId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        useCase = new TimelineReadUseCase(mockThreadRepository, mockProfileRepository, mockPointEventRepository);
        jest.clearAllMocks();
    });

    it('should return chat threads with resolved profiles', async () => {
        // Mock Thread
        const threadMock = {
            toPrimitives: () => ({
                id: 'thread-1',
                threadName: 'Chat Thread',
                createdAt: new Date('2023-01-01'),
                ownerUserId: validUserId,
                parentThreadId: null,
                childThreadIds: [],
                mapPointInfoId: null,
                imageUrl: 'thread.jpg',
            }),
        } as unknown as Thread;

        // Mock Profile
        const profileMock = {
            userId: { getValue: () => validUserId },
            userName: { getValue: () => 'Owner' },
            imageUrl: { getValue: () => 'avatar.jpg' },
        } as unknown as Profile;

        (mockThreadRepository.findRootThreads as jest.Mock).mockResolvedValue([threadMock]);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(profileMock);

        const result = await useCase.execute();

        expect(result.threads).toHaveLength(1);
        const item = result.threads[0];

        expect(item.category).toBe('chat');
        expect(item.threadName).toBe('Chat Thread');
        expect(item.ownerUserProfile.userName).toBe('Owner');
        if (item.category === 'chat') {
            expect(item.categoryContent.imageUrl).toBe('thread.jpg');
        }
    });

    it('should return event threads with point details', async () => {
        const pointId = 'point-123';

        // Mock Thread
        const threadMock = {
            toPrimitives: () => ({
                id: 'thread-2',
                threadName: 'Event Thread',
                createdAt: new Date('2023-01-02'),
                ownerUserId: validUserId,
                parentThreadId: null,
                childThreadIds: [],
                mapPointInfoId: pointId,
                imageUrl: null,
            }),
        } as unknown as Thread;

        // Mock PointEvent
        const pointEventMock = {
            getStartDate: () => new Date('2023-02-01'),
            getEndDate: () => new Date('2023-02-02'),
            getDetail: () => 'Event Detail',
            getUrl: () => 'http://event.com',
            getImageUrl: () => 'event.jpg',
        };

        (mockThreadRepository.findRootThreads as jest.Mock).mockResolvedValue([threadMock]);
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null); // No profile
        (mockPointEventRepository.findByPointInfoId as jest.Mock).mockResolvedValue(pointEventMock);

        const result = await useCase.execute();

        expect(result.threads).toHaveLength(1);
        const item = result.threads[0];

        expect(item.category).toBe('event');
        expect(item.threadName).toBe('Event Thread');
        expect(item.ownerUserProfile.userName).toBe('存在しないユーザー'); // Default

        if (item.category === 'event') {
            expect(item.categoryContent.detail).toBe('Event Detail');
            expect(item.categoryContent.imageUrl).toBe('event.jpg');
        }
    });
});
