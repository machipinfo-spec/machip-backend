import { UserMessageCollection, UserMessageCollectionDTO } from '../UserMessageCollection';
import { UserMessage } from '../../../value-object/inbox/UserMessage';
import { UserMessageId } from '../../../value-object/inbox/UserMessageId';
import { UserId } from '../../../value-object/users/UserId';
import { MessageId } from '../../../value-object/inbox/MessageId';
import { DeliveredAt } from '../../../value-object/inbox/DeliveredAt';
import { ReadAt } from '../../../value-object/inbox/ReadAt';
import { ValidationError } from '../../DomainError';

// Mock dependencies
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

describe('UserMessageCollection', () => {
    let um1: UserMessage;
    let um2: UserMessage;
    let um3: UserMessage;

    const userId1 = UserId.fromExisting('11111111-1234-4000-8000-111111111111');
    const userId2 = UserId.fromExisting('22222222-1234-4000-8000-222222222222');
    const messageId1 = MessageId.fromExisting('33333333-1234-4000-8000-333333333333');
    const messageId2 = MessageId.fromExisting('44444444-1234-4000-8000-444444444444');

    beforeEach(() => {
        um1 = UserMessage.reconstruct(
            UserMessageId.fromExisting('aaaaaaaa-1234-4000-8000-aaaaaaaaaaaa'),
            userId1,
            messageId1,
            DeliveredAt.now(),
            ReadAt.unread(),
        );

        um2 = UserMessage.reconstruct(
            UserMessageId.fromExisting('bbbbbbbb-1234-4000-8000-bbbbbbbbbbbb'),
            userId1, // Same user as um1
            messageId2,
            DeliveredAt.now(),
            ReadAt.now(), // Read
        );

        um3 = UserMessage.reconstruct(
            UserMessageId.fromExisting('cccccccc-1234-4000-8000-cccccccccccc'),
            userId2, // Different user
            messageId1, // Same message as um1
            DeliveredAt.now(),
            ReadAt.unread(),
        );
    });

    describe('create', () => {
        it('should create an empty collection', () => {
            const collection = UserMessageCollection.create();
            expect(collection.count()).toBe(0);
            expect(collection.isEmpty()).toBe(true);
        });

        it('should create with items', () => {
            const collection = UserMessageCollection.create([um1, um2]);
            expect(collection.count()).toBe(2);
            expect(collection.isEmpty()).toBe(false);
        });
    });

    describe('Management', () => {
        it('should add a user message', () => {
            let collection = UserMessageCollection.create([um1]);
            collection = collection.add(um2);
            expect(collection.count()).toBe(2);
            expect(collection.findById(um2.getId())?.equals(um2)).toBe(true);
        });

        it('should throw error when adding duplicate', () => {
            const collection = UserMessageCollection.create([um1]);
            expect(() => collection.add(um1)).toThrow(ValidationError);
        });

        it('should remove a user message', () => {
            let collection = UserMessageCollection.create([um1, um2]);
            collection = collection.remove(um1.getId());
            expect(collection.count()).toBe(1);
            expect(collection.findById(um1.getId())).toBeNull();
        });

        it('should update a user message', () => {
            let collection = UserMessageCollection.create([um1]);
            const updatedUm1 = um1.markAsRead();
            collection = collection.update(updatedUm1);

            const retrieved = collection.findById(um1.getId());
            expect(retrieved?.isRead()).toBe(true);
        });
    });

    describe('Filtering', () => {
        let collection: UserMessageCollection;
        beforeEach(() => {
            collection = UserMessageCollection.create([um1, um2, um3]);
        });

        it('should filter by user', () => {
            const user1Messages = collection.filterByUser(userId1);
            expect(user1Messages.count()).toBe(2); // um1, um2

            const user2Messages = collection.filterByUser(userId2);
            expect(user2Messages.count()).toBe(1); // um3
        });

        it('should filter by message', () => {
            const msg1UserMessages = collection.filterByMessage(messageId1);
            expect(msg1UserMessages.count()).toBe(2); // um1, um3 (both for messageId1)
        });

        it('should filter by read status', () => {
            const unread = collection.getUnreadMessages();
            expect(unread.count()).toBe(2); // um1, um3

            const read = collection.getReadMessages();
            expect(read.count()).toBe(1); // um2
        });
    });

    describe('Aggregation & Utility', () => {
        let collection: UserMessageCollection;
        beforeEach(() => {
            collection = UserMessageCollection.create([um1, um2, um3]);
        });

        it('should return unique user IDs', () => {
            const userIds = collection.getUserIds();
            expect(userIds).toHaveLength(2);
            const ids = userIds.map((u) => u.getValue());
            expect(ids).toContain(userId1.getValue());
            expect(ids).toContain(userId2.getValue());
        });

        it('should return unique message IDs', () => {
            const messageIds = collection.getMessageIds();
            expect(messageIds).toHaveLength(2); // messageId1, messageId2
        });

        it('should get unread count for user', () => {
            // user1 has um1 (unread) and um2 (read) -> count 1
            expect(collection.getUnreadCountForUser(userId1)).toBe(1);

            // user2 has um3 (unread) -> count 1
            expect(collection.getUnreadCountForUser(userId2)).toBe(1);
        });
    });

    describe('Business Logic', () => {
        it('should mark all as read for user', () => {
            let collection = UserMessageCollection.create([um1, um2, um3]);

            // Mark for user1
            collection = collection.markAllAsReadForUser(userId1);

            // um1 should become read. um2 was already read. um3 (user2) should stay unread.
            expect(collection.findById(um1.getId())?.isRead()).toBe(true);
            expect(collection.findById(um2.getId())?.isRead()).toBe(true);
            expect(collection.findById(um3.getId())?.isRead()).toBe(false);

            expect(collection.getUnreadCountForUser(userId1)).toBe(0);
        });
    });

    describe('DTO Conversion', () => {
        it('should convert to DTO', () => {
            const collection = UserMessageCollection.create([um1]);
            const dto = collection.toDTO();

            expect(dto.userMessages).toHaveLength(1);
            expect(dto.count).toBe(1);
            expect(dto.unreadCount).toBe(1);
        });

        it('should create from DTO', () => {
            const dto: UserMessageCollectionDTO = {
                userMessages: [um1.toDTO()],
                count: 1,
                unreadCount: 1,
            };

            const collection = UserMessageCollection.fromDTO(dto);
            expect(collection.count()).toBe(1);
            expect(collection.findById(um1.getId())?.equals(um1)).toBe(true);
        });
    });
});
