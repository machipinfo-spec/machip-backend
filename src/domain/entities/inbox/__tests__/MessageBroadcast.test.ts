import { MessageBroadcast, MessageBroadcastDTO } from '../MessageBroadcast';
import { BroadcastId } from '../../../value-object/inbox/BroadcastId';
import { MessageId } from '../../../value-object/inbox/MessageId';
import { TargetUserIds } from '../../../value-object/inbox/TargetUserIds';
import { UserId } from '../../../value-object/users/UserId';
import { BroadcastStatus } from '../../../value-object/inbox/BroadcastStatus';
import { CreatedAt } from '../../../value-object/inbox/CreatedAt';
import { ValidationError } from '../../DomainError';

// Mock dependencies if necessary, but ValueObjects are usually safe to use directly
jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

describe('MessageBroadcast', () => {
    const messageIdStr = '12345678-1234-4000-8000-123456789012';
    const userId1Str = '11111111-1234-4000-8000-111111111111';
    const userId2Str = '22222222-1234-4000-8000-222222222222';
    const broadcastIdStr = '33333333-1234-4000-8000-333333333333'; // v4 mock value for create() or specific for reconstruct

    let messageId: MessageId;
    let targetUserIds: TargetUserIds;
    let userId1: UserId;
    let userId2: UserId;

    beforeEach(() => {
        messageId = MessageId.fromExisting(messageIdStr);
        userId1 = UserId.fromExisting(userId1Str);
        userId2 = UserId.fromExisting(userId2Str);
        targetUserIds = TargetUserIds.create([userId1, userId2]);
    });

    describe('create', () => {
        it('should create a new instance with pending status', () => {
            const broadcast = MessageBroadcast.create(messageId, targetUserIds);

            expect(broadcast).toBeInstanceOf(MessageBroadcast);
            expect(broadcast.getId()).toBeInstanceOf(BroadcastId);
            expect(broadcast.getMessageId().equals(messageId)).toBe(true);
            expect(broadcast.getTargetUserIds().equals(targetUserIds)).toBe(true);
            expect(broadcast.getStatus().isPending()).toBe(true);
            expect(broadcast.getDeliveredCount()).toBe(0);
            expect(broadcast.getFailedCount()).toBe(0);
            expect(broadcast.getCompletedAt()).toBeUndefined();
        });
    });

    describe('reconstruct', () => {
        it('should reconstruct an instance with all fields', () => {
            const id = BroadcastId.create();
            const createdAt = CreatedAt.now();
            const status = BroadcastStatus.processing();
            const deliveredCount = 1;
            const failedCount = 1;
            const completedAt = new Date();

            const broadcast = MessageBroadcast.reconstruct(
                id,
                messageId,
                targetUserIds,
                createdAt,
                status,
                deliveredCount,
                failedCount,
                completedAt,
            );

            expect(broadcast.getId().equals(id)).toBe(true);
            expect(broadcast.getMessageId().equals(messageId)).toBe(true);
            expect(broadcast.getTargetUserIds().equals(targetUserIds)).toBe(true);
            expect(broadcast.getCreatedAt().equals(createdAt)).toBe(true);
            expect(broadcast.getStatus().equals(status)).toBe(true);
            expect(broadcast.getDeliveredCount()).toBe(deliveredCount);
            expect(broadcast.getFailedCount()).toBe(failedCount);
            expect(broadcast.getCompletedAt()).toEqual(completedAt);
        });
    });

    describe('validateState', () => {
        it('should throw error if target users exceed max limit', () => {
            // Mock TargetUserIds to return a large count
            const hugeTargetUserIds = {
                count: () => 100001,
                getUserIds: () => [],
                contains: () => false,
                equals: () => false,
            } as unknown as TargetUserIds;

            expect(() => {
                MessageBroadcast.create(messageId, hugeTargetUserIds);
            }).toThrow(ValidationError);
        });

        it('should throw error if delivered count is negative', () => {
            expect(() => {
                MessageBroadcast.reconstruct(
                    BroadcastId.create(),
                    messageId,
                    targetUserIds,
                    CreatedAt.now(),
                    BroadcastStatus.processing(),
                    -1,
                    0,
                );
            }).toThrow(ValidationError);
        });

        it('should throw error if failed count is negative', () => {
            expect(() => {
                MessageBroadcast.reconstruct(
                    BroadcastId.create(),
                    messageId,
                    targetUserIds,
                    CreatedAt.now(),
                    BroadcastStatus.processing(),
                    0,
                    -1,
                );
            }).toThrow(ValidationError);
        });

        it('should throw error if total processed exceeds total targets', () => {
            expect(() => {
                MessageBroadcast.reconstruct(
                    BroadcastId.create(),
                    messageId,
                    targetUserIds,
                    CreatedAt.now(),
                    BroadcastStatus.processing(),
                    2,
                    1, // Total 3 > 2 targets
                );
            }).toThrow(ValidationError);
        });
    });

    describe('Business Logic & State Transitions', () => {
        let broadcast: MessageBroadcast;

        beforeEach(() => {
            broadcast = MessageBroadcast.create(messageId, targetUserIds);
        });

        it('should start processing from pending', () => {
            broadcast.startProcessing();
            expect(broadcast.isProcessing()).toBe(true);
        });

        it('should throw error if starting processing from non-pending', () => {
            broadcast.startProcessing(); // now processing
            expect(() => broadcast.startProcessing()).toThrow(ValidationError);
        });

        it('should increment delivered count', () => {
            broadcast.startProcessing();
            broadcast.incrementDelivered();
            expect(broadcast.getDeliveredCount()).toBe(1);
        });

        it('should throw error if incrementing delivered count when not processing', () => {
            expect(() => broadcast.incrementDelivered()).toThrow(ValidationError);
        });

        it('should increment failed count', () => {
            broadcast.startProcessing();
            broadcast.incrementFailed();
            expect(broadcast.getFailedCount()).toBe(1);
        });

        it('should auto-complete when all targets processed (delivered)', () => {
            broadcast.startProcessing();
            broadcast.incrementDelivered();
            broadcast.incrementDelivered(); // 2 targets total

            expect(broadcast.isCompleted()).toBe(true);
            expect(broadcast.getCompletedAt()).toBeDefined();
        });

        it('should auto-complete when all targets processed (mixed)', () => {
            broadcast.startProcessing();
            broadcast.incrementDelivered();
            broadcast.incrementFailed(); // 2 targets total

            expect(broadcast.isCompleted()).toBe(true);
            expect(broadcast.getCompletedAt()).toBeDefined();
        });

        it('should allow manual mark as completed', () => {
            broadcast.markAsCompleted();
            expect(broadcast.isCompleted()).toBe(true);
            expect(broadcast.getCompletedAt()).toBeDefined();
        });

        it('should allow manual mark as failed', () => {
            broadcast.markAsFailed();
            expect(broadcast.isFailed()).toBe(true);
            expect(broadcast.getCompletedAt()).toBeDefined();
        });
    });

    describe('Progress & Metrics', () => {
        it('should calculate progress correctly', () => {
            const broadcast = MessageBroadcast.create(messageId, targetUserIds); // 2 targets
            broadcast.startProcessing();
            broadcast.incrementDelivered();

            const progress = broadcast.getProgress();
            expect(progress).toEqual({
                total: 2,
                delivered: 1,
                failed: 0,
                remaining: 1,
                percentage: 50,
            });
        });

        it('should calculate success rate correctly', () => {
            const broadcast = MessageBroadcast.create(messageId, targetUserIds); // 2 targets
            broadcast.startProcessing();
            broadcast.incrementDelivered();
            broadcast.incrementFailed();

            // 1 delivered, 1 failed, total 2. Success rate = 1/2 = 50%
            expect(broadcast.getSuccessRate()).toBe(50);
        });

        it('should return 0 success rate if no processed items', () => {
            const broadcast = MessageBroadcast.create(messageId, targetUserIds);
            expect(broadcast.getSuccessRate()).toBe(0);
        });
    });

    describe('DTO Conversion', () => {
        it('should convert to DTO correctly', () => {
            const broadcast = MessageBroadcast.create(messageId, targetUserIds);
            const dto = broadcast.toDTO();

            expect(dto.id).toBe(broadcast.getId().getValue());
            expect(dto.messageId).toBe(messageIdStr);
            expect(dto.targetUserIds).toContain(userId1Str);
            expect(dto.targetUserIds).toContain(userId2Str);
            expect(dto.status).toBe(broadcast.getStatus().getValue());
        });

        it('should create from DTO correctly', () => {
            const dto: MessageBroadcastDTO = {
                id: broadcastIdStr,
                messageId: messageIdStr,
                targetUserIds: [userId1Str, userId2Str],
                createdAt: new Date().toISOString(),
                status: 'pending',
                deliveredCount: 0,
                failedCount: 0,
                progress: { total: 2, delivered: 0, failed: 0, remaining: 2, percentage: 0 },
            };

            const broadcast = MessageBroadcast.fromDTO(dto);

            expect(broadcast.getId().getValue()).toBe(dto.id);
            expect(broadcast.getMessageId().getValue()).toBe(dto.messageId);
            expect(broadcast.getStatus().getValue()).toBe(dto.status);
        });

        it('should throw validation error for invalid DTO', () => {
            const invalidDto = {
                id: broadcastIdStr,
                // missing messageId
            } as any;

            expect(() => MessageBroadcast.fromDTO(invalidDto)).toThrow(ValidationError);
        });
    });
});
