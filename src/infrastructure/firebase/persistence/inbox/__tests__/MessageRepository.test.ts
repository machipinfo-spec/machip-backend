// Mock uuid FIRST
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-1234567890ab',
}));

import { MessageRepository } from '../MessageRepository';
import { Message, MessageContent } from '../../../../../domain/entities/inbox/Message';
import { MessageId } from '../../../../../domain/value-object/inbox/MessageId';
import { MessageType } from '../../../../../domain/value-object/inbox/MessageType';
import { MessageSubject } from '../../../../../domain/value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../../../domain/value-object/inbox/SystemMessageContent';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { CreatedAt } from '../../../../../domain/value-object/inbox/CreatedAt';
import { ReadStatus } from '../../../../../domain/value-object/inbox/ReadStatus';
import { Logger } from '../../../../../shared/logger';

// Mock Firebase Admin
const mockDb = {
    collection: jest.fn(),
    batch: jest.fn(),
};

const mockCollection = {
    doc: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    get: jest.fn(),
};

const mockDoc = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
};

const mockBatch = {
    delete: jest.fn(),
    commit: jest.fn(),
};

const mockSnapshot = {
    empty: false,
    size: 1,
    docs: [],
    forEach: jest.fn(),
};

jest.mock('../../../config/firebaseAdmin', () => ({
    getDbAndAuth: jest.fn(() => Promise.resolve({ db: mockDb, auth: {} })),
}));

// Mock Logger
const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

describe('MessageRepository', () => {
    let repository: MessageRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        mockDb.collection.mockReturnValue(mockCollection);
        mockDb.batch.mockReturnValue(mockBatch);
        mockCollection.doc.mockReturnValue(mockDoc);
        mockCollection.where.mockReturnValue(mockCollection);
        mockCollection.orderBy.mockReturnValue(mockCollection);
        mockCollection.get.mockResolvedValue(mockSnapshot);

        repository = new MessageRepository(mockLogger);
    });

    const createDummyMessage = (id: string = '12345678-1234-4000-8000-1234567890ab') => {
        return Message.reconstruct(
            MessageId.fromExisting(id),
            MessageType.system(),
            MessageSubject.create('Test Subject'),
            SystemMessageContent.create('Test Content'),
            UserId.fromExisting('12345678-1234-4000-8000-1234567890ac'),
            CreatedAt.fromISOString('2023-01-01T00:00:00.000Z'),
            ReadStatus.unread(),
        );
    };

    describe('save', () => {
        it('should save a message correctly', async () => {
            const message = createDummyMessage();
            await repository.save(message);

            expect(mockDb.collection).toHaveBeenCalledWith('Messages');
            expect(mockCollection.doc).toHaveBeenCalledWith(message.getId().getValue());
            expect(mockDoc.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    messageId: message.getId().getValue(),
                    subject: 'Test Subject',
                    senderUserId: '12345678-1234-4000-8000-1234567890ac',
                }),
            );
        });
    });

    describe('findById', () => {
        it('should return a message when found', async () => {
            const messageId = MessageId.fromExisting('12345678-1234-4000-8000-1234567890ab');
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    messageId: '12345678-1234-4000-8000-1234567890ab',
                    type: 'system',
                    subject: 'Test Subject',
                    content: 'Test Content',
                    senderUserId: '12345678-1234-4000-8000-1234567890ac',
                    createdAt: '2023-01-01T00:00:00.000Z',
                    isRead: false,
                }),
            });

            const result = await repository.findById(messageId);

            expect(result).not.toBeNull();
            expect(result?.getId().equals(messageId)).toBe(true);
            expect(result?.getSubject().getValue()).toBe('Test Subject');
        });

        it('should return null when not found', async () => {
            const messageId = MessageId.fromExisting('12345678-1234-4000-8000-1234567890ab');
            mockDoc.get.mockResolvedValue({ exists: false });

            const result = await repository.findById(messageId);

            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete message and related data', async () => {
            const messageId = MessageId.fromExisting('12345678-1234-4000-8000-1234567890ab');

            // Mock snapshots for related data
            const emptySnapshot = { forEach: jest.fn() };
            mockCollection.get.mockResolvedValue(emptySnapshot);

            await repository.delete(messageId);

            expect(mockDb.batch).toHaveBeenCalled();
            expect(mockBatch.delete).toHaveBeenCalled(); // At least for message body
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });

    // Additional tests for other methods like findAll, findByType can be added similarly
    // Assuming standard behavior based on other repository tests
});
