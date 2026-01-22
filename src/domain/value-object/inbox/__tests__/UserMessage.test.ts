import { UserMessage } from '../UserMessage';
import { UserId } from '../../users/UserId';
import { MessageId } from '../MessageId';
import { DeliveredAt } from '../DeliveredAt';
import { ReadAt } from '../ReadAt';
import { UserMessageId } from '../UserMessageId';

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
}));

// Explicit mocks for dependencies to control behavior

const mockId = '550e8400-e29b-41d4-a716-446655440001';
const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
const mockMessageId = '550e8400-e29b-41d4-a716-446655440003';

describe('UserMessage', () => {
    // Helper to create valid instance
    const createInstance = () => {
        return UserMessage.reconstruct(
            UserMessageId.fromExisting(mockId),
            UserId.fromExisting(mockUserId),
            MessageId.fromExisting(mockMessageId),
            new DeliveredAt(new Date('2023-01-01')),
            ReadAt.unread(),
        );
    };

    it('should reconstruct correctly', () => {
        const msg = createInstance();
        expect(msg.getId().getValue()).toBe(mockId);
        expect(msg.getUserId().getValue()).toBe(mockUserId);
        expect(msg.isUnread()).toBe(true);
    });

    it('should mark as read', () => {
        const msg = createInstance();
        const readMsg = msg.markAsRead();

        expect(readMsg.isRead()).toBe(true);
        expect(msg.isUnread()).toBe(true); // Immutable
        expect(readMsg).not.toBe(msg);
    });

    it('should mark as unread', () => {
        const msg = createInstance().markAsRead();
        const unreadMsg = msg.markAsUnread();

        expect(unreadMsg.isUnread()).toBe(true);
    });

    it('should create via factory', () => {
        // Need to mock UUID generation for strict check or just check types
        const msg = UserMessage.create(UserId.fromExisting(mockUserId), MessageId.fromExisting(mockMessageId));
        expect(msg.getUserId().getValue()).toBe(mockUserId);
        expect(msg.isUnread()).toBe(true);
    });

    it('should check dates', () => {
        const msg = createInstance();
        expect(msg.wasDeliveredBefore(new Date('2023-01-02'))).toBe(true);
        expect(msg.wasDeliveredAfter(new Date('2022-12-31'))).toBe(true);
    });

    it('should convert to DTO', () => {
        const msg = createInstance();
        const dto = msg.toDTO();
        expect(dto.id).toBe(mockId);
        expect(dto.userId).toBe(mockUserId);
        expect(dto.isRead).toBe(false);
    });
});
