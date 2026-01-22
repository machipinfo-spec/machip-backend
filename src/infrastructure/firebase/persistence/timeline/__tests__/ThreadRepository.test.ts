import { ThreadRepository } from '../ThreadRepository';
import { getDbAndAuth } from '../../../config/firebaseAdmin';
import { Thread } from '../../../../../domain/entities/timeline/thread';
import { ThreadId } from '../../../../../domain/value-object/timeline/threadId';
import { ThreadName } from '../../../../../domain/value-object/map/threadName';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { PointInfoId } from '../../../../../domain/value-object/map/pointInfoId';

// Mock getDbAndAuth
jest.mock('../../../config/firebaseAdmin', () => ({
    getDbAndAuth: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

describe('ThreadRepository', () => {
    let threadRepository: ThreadRepository;
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
            offset: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        (getDbAndAuth as jest.Mock).mockResolvedValue({ db: mockDb });

        threadRepository = new ThreadRepository();
    });

    const createDummyThread = () => {
        return Thread.createFromMapPoint(
            ThreadName.create('Test Thread'),
            UserId.fromExisting('12345678-1234-4123-8123-1234567890a1'),
            PointInfoId.fromExisting('12345678-1234-4123-8123-1234567890b1'),
            null,
            null,
        );
    };

    describe('save', () => {
        it('should save a thread', async () => {
            const thread = createDummyThread();
            await threadRepository.save(thread);

            expect(mockDb.collection).toHaveBeenCalledWith('threads');
            expect(mockCollection.doc).toHaveBeenCalledWith(thread.getThreadId().getValue());
            expect(mockCollection.set).toHaveBeenCalledTimes(1);

            const savedData = mockCollection.set.mock.calls[0][0];
            expect(savedData.id).toBe(thread.getThreadId().getValue());
            expect(savedData.threadName).toBe('Test Thread');
            expect(savedData.ownerUserId).toBe('12345678-1234-4123-8123-1234567890a1');
            expect(savedData.mapPointInfoId).toBe('12345678-1234-4123-8123-1234567890b1');
        });
    });

    describe('findById', () => {
        it('should return a thread if found', async () => {
            const threadId = '12345678-1234-4000-8000-1234567890ab';
            const threadData = {
                id: threadId,
                threadName: 'Test Thread',
                createdAt: new Date(),
                deleatedAt: null,
                ownerUserId: '12345678-1234-4123-8123-1234567890a1',
                parentThreadId: null,
                childThreadIds: [],
                mapPointInfoId: '12345678-1234-4123-8123-1234567890b1',
                imageUrl: null,
            };

            mockCollection.get.mockResolvedValue({
                exists: true,
                id: threadId,
                data: () => threadData,
            });

            const result = await threadRepository.findById(threadId);

            expect(result).not.toBeNull();
            expect(result?.getThreadId().getValue()).toBe(threadId);
            expect(result?.toPrimitives().threadName).toBe('Test Thread');
        });

        it('should return null if not found', async () => {
            mockCollection.get.mockResolvedValue({
                exists: false,
            });

            const result = await threadRepository.findById('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete a thread', async () => {
            const threadId = '12345678-1234-4123-8123-1234567890c1';
            await threadRepository.delete(threadId);

            expect(mockDb.collection).toHaveBeenCalledWith('threads');
            expect(mockCollection.doc).toHaveBeenCalledWith(threadId);
            expect(mockCollection.delete).toHaveBeenCalled();
        });
    });

    describe('softDelete', () => {
        it('should soft delete a thread', async () => {
            const threadId = '12345678-1234-4123-8123-1234567890c1';
            await threadRepository.softDelete(threadId);

            expect(mockDb.collection).toHaveBeenCalledWith('threads');
            expect(mockCollection.doc).toHaveBeenCalledWith(threadId);
            expect(mockCollection.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    deleatedAt: expect.any(Date),
                }),
            );
        });
    });

    // Helper to create mock snapshot
    const createMockSnapshot = (docs: any[]) => ({
        empty: docs.length === 0,
        docs: docs,
        forEach: (cb: Function) => docs.forEach((d) => cb(d)),
    });

    describe('findByOwnerUserId', () => {
        it('should find threads by owner', async () => {
            const userId = '12345678-1234-4123-8123-1234567890a1';
            const docs = [
                {
                    id: '12345678-1234-4123-8123-1234567890c1',
                    data: () => ({
                        threadName: 'T1',
                        createdAt: new Date(),
                        ownerUserId: userId,
                        mapPointInfoId: '12345678-1234-4123-8123-1234567890b1',
                        childThreadIds: [],
                    }),
                },
            ];
            mockCollection.get.mockResolvedValue(createMockSnapshot(docs));

            const results = await threadRepository.findByOwnerUserId(userId);

            expect(mockCollection.where).toHaveBeenCalledWith('ownerUserId', '==', userId);
            expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
            expect(results.length).toBe(1);
        });
    });

    describe('findByParentThreadId', () => {
        it('should return threads for given parent', async () => {
            const parentId = '12345678-1234-4123-8123-1234567890b1';
            mockCollection.get.mockResolvedValue(createMockSnapshot([]));

            await threadRepository.findByParentThreadId(parentId);

            expect(mockCollection.where).toHaveBeenCalledWith('parentThreadId', '==', parentId);
            expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'asc');
        });
    });

    describe('findRootThreads', () => {
        it('should return threads with no parent', async () => {
            mockCollection.get.mockResolvedValue(createMockSnapshot([]));

            await threadRepository.findRootThreads();

            expect(mockCollection.where).toHaveBeenCalledWith('parentThreadId', '==', null);
            expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
        });
    });

    describe('findByMapPointInfoId', () => {
        it('should return thread for point info', async () => {
            const pointId = '12345678-1234-4123-8123-1234567890b1';
            const docs = [
                {
                    id: '12345678-1234-4123-8123-1234567890c1',
                    data: () => ({
                        threadName: 'T1',
                        createdAt: new Date(),
                        ownerUserId: '12345678-1234-4123-8123-1234567890a1',
                        mapPointInfoId: pointId,
                        childThreadIds: [],
                    }),
                },
            ];

            mockCollection.get.mockResolvedValue(createMockSnapshot(docs));

            const result = await threadRepository.findByMapPointInfoId(pointId);

            expect(mockCollection.where).toHaveBeenCalledWith('mapPointInfoId', '==', pointId);
            expect(result).not.toBeNull();
        });
    });

    describe('findByMapPointInfoIds', () => {
        it('should return threads for multiple points', async () => {
            const pointIds = ['12345678-1234-4123-8123-1234567890b1', '12345678-1234-4123-8123-1234567890b2'];

            const docs: any[] = []; // Empty for simplicity, primarily testing query construction
            mockCollection.get.mockResolvedValue(createMockSnapshot(docs));

            await threadRepository.findByMapPointInfoIds(pointIds);

            expect(mockCollection.where).toHaveBeenCalledWith('mapPointInfoId', 'in', pointIds);
        });
    });
});
