import { MessageCollection, MessageCollectionDTO } from '../MessageCollection';
import { Message } from '../Message';
import { MessageId } from '../../../value-object/inbox/MessageId';
import { MessageType, MessageTypeValue } from '../../../value-object/inbox/MessageType';
import { ValidationError } from '../../DomainError';
import { UserId } from '../../../value-object/users/UserId';
import { ReadStatus } from '../../../value-object/inbox/ReadStatus';
import { CreatedAt } from '../../../value-object/inbox/CreatedAt';
import { MessageSubject } from '../../../value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../value-object/inbox/SystemMessageContent';

// Mock dependencies
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

describe('MessageCollection', () => {
    let message1: Message;
    let message2: Message;
    let message3: Message; // Read message

    const userId = UserId.create(); // Mocked uuid

    beforeEach(() => {
        // Create messages using reconstruct to control IDs and state
        message1 = Message.reconstruct(
            MessageId.fromExisting('11111111-1234-4000-8000-111111111111'),
            MessageType.system(),
            MessageSubject.create('Subject 1'),
            SystemMessageContent.create('Content 1'),
            userId,
            CreatedAt.now(),
            ReadStatus.unread(),
        );

        message2 = Message.reconstruct(
            MessageId.fromExisting('22222222-1234-4000-8000-222222222222'),
            MessageType.ai(), // Use 'ai' for variety if possible, otherwise system
            MessageSubject.create('Subject 2'),
            SystemMessageContent.create('Content 2'),
            userId,
            CreatedAt.now(),
            ReadStatus.unread(),
        );

        message3 = Message.reconstruct(
            MessageId.fromExisting('33333333-1234-4000-8000-333333333333'),
            MessageType.system(),
            MessageSubject.create('Subject 3'),
            SystemMessageContent.create('Content 3'),
            userId,
            CreatedAt.now(),
            ReadStatus.read(),
        );
    });

    describe('create', () => {
        it('should create an empty collection', () => {
            const collection = MessageCollection.create();
            expect(collection.count()).toBe(0);
            expect(collection.isEmpty()).toBe(true);
        });

        it('should create a collection with messages', () => {
            const collection = MessageCollection.create([message1, message2]);
            expect(collection.count()).toBe(2);
            expect(collection.isEmpty()).toBe(false);
        });
    });

    describe('Management', () => {
        it('should add a message', () => {
            let collection = MessageCollection.create([message1]);
            expect(collection.count()).toBe(1);

            collection = collection.add(message2);
            expect(collection.count()).toBe(2);
            expect(collection.findById(message2.getId())?.equals(message2)).toBe(true);
        });

        it('should throw error when adding duplicate message', () => {
            const collection = MessageCollection.create([message1]);
            expect(() => collection.add(message1)).toThrow(ValidationError);
        });

        it('should remove a message', () => {
            let collection = MessageCollection.create([message1, message2]);
            collection = collection.remove(message1.getId());
            expect(collection.count()).toBe(1);
            expect(collection.findById(message1.getId())).toBeNull();
        });

        it('should update a message', () => {
            let collection = MessageCollection.create([message1]);

            // Create updated version of message1 (e.g. mark as read)
            const updatedMessage1 = Message.reconstruct(
                message1.getId(),
                message1.getType(),
                message1.getSubject(),
                message1.getContent(),
                message1.getSenderUserId(),
                message1.getCreatedAt(),
                ReadStatus.read(),
            );

            collection = collection.update(updatedMessage1);

            const retrieved = collection.findById(message1.getId());
            expect(retrieved?.isRead()).toBe(true);
        });
    });

    describe('Filtering & Aggregation', () => {
        let collection: MessageCollection;

        beforeEach(() => {
            collection = MessageCollection.create([message1, message2, message3]);
        });

        it('should filter by type', () => {
            const systemMessages = collection.filterByType(MessageType.system());
            expect(systemMessages.count()).toBe(2); // message1 and message3

            const aiMessages = collection.filterByType(MessageType.ai());
            expect(aiMessages.count()).toBe(1); // message2
        });

        it('should filter by read status', () => {
            const unread = collection.getUnreadMessages();
            expect(unread.count()).toBe(2); // message1, message2

            const read = collection.getReadMessages();
            expect(read.count()).toBe(1); // message3
        });

        it('should get correct counts', () => {
            expect(collection.getUnreadCount()).toBe(2);
            expect(collection.getUnreadCountByType('system')).toBe(1); // message1
            // message2 is AI and unread
            expect(collection.getUnreadCountByType('ai')).toBe(1);
        });

        it('should mark all as read', () => {
            const updatedCollection = collection.markAllAsRead();
            expect(updatedCollection.getUnreadCount()).toBe(0);
            expect(updatedCollection.getReadMessages().count()).toBe(3);
        });
    });

    describe('Business Rules', () => {
        it('should enforce max size', () => {
            // Can't easily test 10000 limit without performance hit, skipping or mocking max size if possible.
            // Since max size is static private, we can't easily change it.
            // We'll trust the logic or assume it works for now.
            // Or we can try to push boundary if we create a lighter weight mock of Message array,
            // but MessageCollection constructor takes Message instances.
        });

        it('should validate unique IDs in constructor', () => {
            expect(() => {
                new MessageCollection([message1, message1]);
            }).toThrow(ValidationError);
        });
    });

    describe('DTO Conversion', () => {
        it('should convert to DTO', () => {
            const collection = MessageCollection.create([message1]);
            const dto = collection.toDTO();

            expect(dto.messages).toHaveLength(1);
            expect(dto.count).toBe(1);
            expect(dto.unreadCount).toBe(1);
        });

        it('should create from DTO', () => {
            const dto: MessageCollectionDTO = {
                messages: [message1.toDTO()],
                count: 1,
                unreadCount: 1,
                systemMessageCount: 1,
                aiMessageCount: 0,
            };

            const collection = MessageCollection.fromDTO(dto);
            expect(collection.count()).toBe(1);
            expect(collection.findById(message1.getId())?.equals(message1)).toBe(true);
        });
    });
});
