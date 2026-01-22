import { PointEventRepository } from '../PointEventRepository';
import { getDbAndAuth } from '../../../config/firebaseAdmin';
import { PointEvent } from '../../../../../domain/entities/map/PointEvent';
import { PointInfoId } from '../../../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../../../domain/value-object/map/threadName';
import { PointEventId } from '../../../../../domain/value-object/map/pointEventId';

// Mock getDbAndAuth - Correct path relative to this test file
jest.mock('../../../config/firebaseAdmin', () => ({
    getDbAndAuth: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

describe('PointEventRepository', () => {
    let repository: PointEventRepository;
    let mockDb: any;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            doc: jest.fn().mockReturnThis(),
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            startAfter: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        (getDbAndAuth as jest.Mock).mockResolvedValue({ db: mockDb });

        repository = new PointEventRepository();
    });

    const validPointInfoId = '12345678-1234-4123-8123-1234567890a1';
    const validPointEventId = '12345678-1234-4123-8123-1234567890b1';

    const createDummyPointEvent = () => {
        return PointEvent.create(
            PointInfoId.fromExisting(validPointInfoId),
            ThreadName.create('Test Event'),
            'http://example.com/image.jpg',
            new Date('2023-01-01'),
            new Date('2023-01-02'),
            'Event Detail',
            'http://example.com',
            PointEventId.fromExisting(validPointEventId),
        );
    };

    const createMockSnapshot = (docs: any[]) => ({
        empty: docs.length === 0,
        docs: docs,
        forEach: (cb: Function) => docs.forEach((d) => cb(d)),
    });

    describe('save', () => {
        it('should save a point event', async () => {
            const pointEvent = createDummyPointEvent();
            await repository.save(pointEvent);

            expect(mockDb.collection).toHaveBeenCalledWith('point_events');
            expect(mockCollection.doc).toHaveBeenCalledWith(pointEvent.getId().getValue());
            expect(mockCollection.set).toHaveBeenCalledTimes(1);

            const savedData = mockCollection.set.mock.calls[0][0];
            expect(savedData.id).toBe(pointEvent.getId().getValue());
            expect(savedData.threadName).toBe('Test Event');
            expect(savedData.pointInfoId).toBe(validPointInfoId);
        });
    });

    describe('findByPointInfoId', () => {
        it('should return point event if found', async () => {
            const data = {
                id: validPointEventId,
                pointInfoId: validPointInfoId,
                threadName: 'Test Event',
                imageUrl: null,
                createdAt: new Date(),
                startDate: new Date(),
                endDate: new Date(),
                detail: 'Detail',
                url: null,
                deletedAt: null,
            };

            mockCollection.get.mockResolvedValue(createMockSnapshot([{ id: validPointEventId, data: () => data }]));

            const result = await repository.findByPointInfoId(validPointInfoId);

            expect(mockCollection.where).toHaveBeenCalledWith('pointInfoId', '==', validPointInfoId);
            expect(result).not.toBeNull();
            expect(result?.getId().getValue()).toBe(validPointEventId);
        });

        it('should return null if not found', async () => {
            mockCollection.get.mockResolvedValue(createMockSnapshot([]));
            const result = await repository.findByPointInfoId('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('findByThreadName', () => {
        it('should find events by thread name', async () => {
            const name = 'Test Event';
            mockCollection.get.mockResolvedValue(
                createMockSnapshot([
                    {
                        id: validPointEventId,
                        data: () => ({
                            id: validPointEventId,
                            pointInfoId: validPointInfoId,
                            threadName: name,
                            imageUrl: null,
                            createdAt: new Date(),
                            startDate: new Date(),
                            endDate: new Date(),
                            detail: null,
                            url: null,
                            deletedAt: null,
                        }),
                    },
                ]),
            );

            const results = await repository.findByThreadName(name);

            expect(mockCollection.where).toHaveBeenCalledWith('threadName', '==', name);
            expect(results.length).toBe(1);
            expect(results[0].getThreadName().getValue()).toBe(name);
        });
    });

    describe('findByDateRange', () => {
        it('should find events in date range', async () => {
            const start = new Date('2023-01-01');
            const end = new Date('2023-01-31');

            mockCollection.get.mockResolvedValue(
                createMockSnapshot([
                    {
                        id: validPointEventId,
                        data: () => ({
                            id: validPointEventId,
                            pointInfoId: validPointInfoId,
                            threadName: 'Event',
                            imageUrl: null,
                            createdAt: new Date(),
                            startDate: new Date('2023-01-15'),
                            endDate: new Date('2023-01-16'),
                            detail: null,
                            url: null,
                            deletedAt: null,
                        }),
                    },
                ]),
            );

            const results = await repository.findByDateRange(start, end, 10);

            expect(mockCollection.where).toHaveBeenCalledWith('startDate', '>=', start);
            expect(mockCollection.where).toHaveBeenCalledWith('startDate', '<=', end);
            expect(mockCollection.orderBy).toHaveBeenCalledWith('startDate', 'asc');
            expect(mockCollection.limit).toHaveBeenCalledWith(10);
            expect(results.length).toBe(1);
        });
    });
});
