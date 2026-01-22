jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { GetPointInfoListUseCase } from '../GetPointInfoListUseCase';
import { IMapRepository } from '../../../../domain/repositories/map/IMapRepository';
import { IThreadRepository } from '../../../../domain/repositories/timeline/IThreadRepository';
import { IPointEventRepository } from '../../../../domain/repositories/map/IPointEventRepository';
import { PointInfo } from '../../../../domain/entities/map/pointInfo';
import { PointEvent } from '../../../../domain/entities/map/PointEvent';
import { Thread } from '../../../../domain/entities/timeline/thread';

// Mock Dependencies
const mockMapRepository: IMapRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByCategory: jest.fn(),
    findAll: jest.fn(),
    findByBox: jest.fn(),
    delete: jest.fn(),
} as any;

const mockThreadRepository: IThreadRepository = {
    findByMapPointInfoId: jest.fn(),
} as any;

const mockPointEventRepository: IPointEventRepository = {
    findByThreadName: jest.fn(),
    findByPointInfoId: jest.fn(),
} as any;

describe('GetPointInfoListUseCase', () => {
    let useCase: GetPointInfoListUseCase;
    const validId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        useCase = new GetPointInfoListUseCase(mockMapRepository, mockThreadRepository, mockPointEventRepository);
        jest.clearAllMocks();
    });

    it('should return all points enriched with details', async () => {
        // Mock PointInfo (Chat)
        const chatPoint = {
            getId: () => ({ getValue: () => 'chat-point' }),
            getGeoLocation: () => ({ getLat: () => 35, getLng: () => 139 }),
            getCategory: () => ({ getValue: () => 'chat' }),
        } as unknown as PointInfo;

        // Mock PointInfo (Event)
        const eventPoint = {
            getId: () => ({ getValue: () => 'event-point' }),
            getGeoLocation: () => ({ getLat: () => 36, getLng: () => 140 }),
            getCategory: () => ({ getValue: () => 'event' }),
        } as unknown as PointInfo;

        (mockMapRepository.findAll as jest.Mock).mockResolvedValue([chatPoint, eventPoint]);

        // Mock Thread for Chat
        const chatThread = {
            getThreadId: () => ({ getValue: () => 'thread-chat' }),
            getImageUrl: () => 'chat.jpg',
            toPrimitives: () => ({ threadName: 'Chat Spot' }),
        } as unknown as Thread;
        (mockThreadRepository.findByMapPointInfoId as jest.Mock).mockImplementation((id) => {
            if (id === 'chat-point') return Promise.resolve(chatThread);
            if (id === 'event-point')
                return Promise.resolve({ getThreadId: () => ({ getValue: () => 'thread-event' }) }); // Event also has thread
            return Promise.resolve(null);
        });

        // Mock PointEvent for Event
        const pointEvent = {
            getThreadName: () => ({ getValue: () => 'Event Spot' }),
            getImageUrl: () => 'event.jpg',
            getStartDate: () => new Date('2023-01-01'),
            getEndDate: () => new Date('2023-01-02'),
        } as unknown as PointEvent;
        (mockPointEventRepository.findByPointInfoId as jest.Mock).mockResolvedValue(pointEvent);

        const result = await useCase.execute({});

        expect(result).toHaveLength(2);

        const chatRes = result.find((r) => r.category === 'chat');
        expect(chatRes?.threadName).toBe('Chat Spot');
        expect(chatRes?.imageUrl).toBe('chat.jpg');

        const eventRes = result.find((r) => r.category === 'event');
        expect(eventRes?.threadName).toBe('Event Spot');
        expect(eventRes?.startDate).toEqual(new Date('2023-01-01'));
    });

    it('should filter by category', async () => {
        (mockMapRepository.findByCategory as jest.Mock).mockResolvedValue([]);

        await useCase.execute({ category: 'event' });

        expect(mockMapRepository.findByCategory).toHaveBeenCalledWith('event', undefined);
    });
});
