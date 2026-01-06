import { BroadcastId } from '../../value-object/inbox/BroadcastId';
import { BroadcastStatus } from '../../value-object/inbox/BroadcastStatus';
import { CreatedAt } from '../../value-object/inbox/CreatedAt';
import { MessageId } from '../../value-object/inbox/MessageId';
import { TargetUserIds } from '../../value-object/inbox/TargetUserIds';
import { UserId } from '../../value-object/users/UserId';
import { ValidationError } from '../DomainError';
import { DTOMapper } from '../DTOMapper';

export interface MessageBroadcastDTO {
    id: string;
    messageId: string;
    targetUserIds: string[];
    createdAt: string;
    status: string;
    deliveredCount: number;
    failedCount: number;
    completedAt?: string;
    progress: {
        total: number;
        delivered: number;
        failed: number;
        remaining: number;
        percentage: number;
    };
}

/**
 * メッセージ一斉配信管理エンティティ
 */
export class MessageBroadcast implements DTOMapper<MessageBroadcast, MessageBroadcastDTO> {
    private static readonly MAX_TARGET_USERS = 100000;
    private static readonly MIN_DELIVERED_COUNT = 0;
    private static readonly MIN_FAILED_COUNT = 0;

    constructor(
        private readonly id: BroadcastId,
        private readonly messageId: MessageId,
        private readonly targetUserIds: TargetUserIds,
        private readonly createdAt: CreatedAt,
        private status: BroadcastStatus,
        private deliveredCount: number = 0,
        private failedCount: number = 0,
        private completedAt?: Date,
    ) {
        this.validateState();
    }

    // 整合性検証
    private validateState(): void {
        this.validateRequiredFields();
        this.validateBusinessRules();
    }

    private validateRequiredFields(): void {
        if (!this.id) {
            throw new ValidationError('Broadcast ID is required', 'id');
        }
        if (!this.messageId) {
            throw new ValidationError('Message ID is required', 'messageId');
        }
        if (!this.targetUserIds) {
            throw new ValidationError('Target user IDs is required', 'targetUserIds');
        }
        if (!this.createdAt) {
            throw new ValidationError('Created at is required', 'createdAt');
        }
        if (!this.status) {
            throw new ValidationError('Status is required', 'status');
        }
    }

    private validateBusinessRules(): void {
        if (this.targetUserIds.count() > MessageBroadcast.MAX_TARGET_USERS) {
            throw new ValidationError(
                `Target users cannot exceed ${MessageBroadcast.MAX_TARGET_USERS}`,
                'targetUserIds',
            );
        }

        if (this.deliveredCount < MessageBroadcast.MIN_DELIVERED_COUNT) {
            throw new ValidationError(`Delivered count cannot be negative`, 'deliveredCount');
        }

        if (this.failedCount < MessageBroadcast.MIN_FAILED_COUNT) {
            throw new ValidationError(`Failed count cannot be negative`, 'failedCount');
        }

        const totalProcessed = this.deliveredCount + this.failedCount;
        const totalTargets = this.targetUserIds.count();
        if (totalProcessed > totalTargets) {
            throw new ValidationError('Total processed count cannot exceed target user count', 'counts');
        }
    }

    // ファクトリメソッド
    public static create(messageId: MessageId, targetUserIds: TargetUserIds): MessageBroadcast {
        return new MessageBroadcast(
            BroadcastId.create(),
            messageId,
            targetUserIds,
            CreatedAt.now(),
            BroadcastStatus.pending(),
        );
    }

    public static reconstruct(
        id: BroadcastId,
        messageId: MessageId,
        targetUserIds: TargetUserIds,
        createdAt: CreatedAt,
        status: BroadcastStatus,
        deliveredCount = 0,
        failedCount = 0,
        completedAt?: Date,
    ): MessageBroadcast {
        return new MessageBroadcast(
            id,
            messageId,
            targetUserIds,
            createdAt,
            status,
            deliveredCount,
            failedCount,
            completedAt,
        );
    }

    public static fromDTO(dto: MessageBroadcastDTO): MessageBroadcast {
        // 入力データの検証
        if (!dto.id) {
            throw new ValidationError('DTO id is required', 'id');
        }
        if (!dto.messageId) {
            throw new ValidationError('DTO messageId is required', 'messageId');
        }
        if (!dto.targetUserIds) {
            throw new ValidationError('DTO targetUserIds is required', 'targetUserIds');
        }

        try {
            const targetUserIds = TargetUserIds.create(dto.targetUserIds.map((id) => UserId.fromExisting(id)));

            return MessageBroadcast.reconstruct(
                BroadcastId.fromExisting(dto.id),
                MessageId.fromExisting(dto.messageId),
                targetUserIds,
                CreatedAt.fromISOString(dto.createdAt),
                BroadcastStatus.fromString(dto.status),
                dto.deliveredCount,
                dto.failedCount,
                dto.completedAt ? new Date(dto.completedAt) : undefined,
            );
        } catch (error) {
            throw new ValidationError(`Failed to create MessageBroadcast from DTO: ${error}`, 'dto');
        }
    }

    // DTOへの変換
    public toDTO(): MessageBroadcastDTO {
        return {
            id: this.id.getValue(),
            messageId: this.messageId.getValue(),
            targetUserIds: this.targetUserIds.getUserIds().map((id) => id.getValue()),
            createdAt: this.createdAt.toISOString(),
            status: this.status.getValue(),
            deliveredCount: this.deliveredCount,
            failedCount: this.failedCount,
            completedAt: this.completedAt?.toISOString(),
            progress: this.getProgress(),
        };
    }

    // Getters
    public getId(): BroadcastId {
        return this.id;
    }

    public getMessageId(): MessageId {
        return this.messageId;
    }

    public getTargetUserIds(): TargetUserIds {
        return this.targetUserIds;
    }

    public getCreatedAt(): CreatedAt {
        return this.createdAt;
    }

    public getStatus(): BroadcastStatus {
        return this.status;
    }

    public getDeliveredCount(): number {
        return this.deliveredCount;
    }

    public getFailedCount(): number {
        return this.failedCount;
    }

    public getCompletedAt(): Date | undefined {
        return this.completedAt;
    }

    // Business Logic
    public startProcessing(): void {
        if (!this.status.isPending()) {
            throw new ValidationError('Broadcast can only be started from pending status', 'status');
        }
        this.status = BroadcastStatus.processing();
    }

    public incrementDelivered(): void {
        if (!this.status.isProcessing()) {
            throw new ValidationError('Cannot increment delivered count when not processing', 'status');
        }
        this.deliveredCount++;
        this.checkIfCompleted();
    }

    public incrementFailed(): void {
        if (!this.status.isProcessing()) {
            throw new ValidationError('Cannot increment failed count when not processing', 'status');
        }
        this.failedCount++;
        this.checkIfCompleted();
    }

    public markAsCompleted(): void {
        this.status = BroadcastStatus.completed();
        this.completedAt = new Date();
    }

    public markAsFailed(): void {
        this.status = BroadcastStatus.failed();
        this.completedAt = new Date();
    }

    private checkIfCompleted(): void {
        const totalProcessed = this.deliveredCount + this.failedCount;
        const totalTargets = this.targetUserIds.count();

        if (totalProcessed >= totalTargets) {
            this.markAsCompleted();
        }
    }

    public getProgress(): {
        total: number;
        delivered: number;
        failed: number;
        remaining: number;
        percentage: number;
    } {
        const total = this.targetUserIds.count();
        const remaining = total - (this.deliveredCount + this.failedCount);
        const percentage = total > 0 ? Math.round(((this.deliveredCount + this.failedCount) / total) * 100) : 0;

        return {
            total,
            delivered: this.deliveredCount,
            failed: this.failedCount,
            remaining,
            percentage,
        };
    }

    // ドメインロジック
    public isTargetUser(userId: UserId): boolean {
        if (!userId) {
            return false;
        }
        return this.targetUserIds.contains(userId);
    }

    public isPending(): boolean {
        return this.status.isPending();
    }

    public isProcessing(): boolean {
        return this.status.isProcessing();
    }

    public isCompleted(): boolean {
        return this.status.isCompleted();
    }

    public isFailed(): boolean {
        return this.status.isFailed();
    }

    public hasStarted(): boolean {
        return !this.status.isPending();
    }

    public hasFinished(): boolean {
        return this.status.isCompleted() || this.status.isFailed();
    }

    public getSuccessRate(): number {
        const total = this.deliveredCount + this.failedCount;
        return total > 0 ? Math.round((this.deliveredCount / total) * 100) : 0;
    }

    public getTotalTargets(): number {
        return this.targetUserIds.count();
    }

    public equals(other?: MessageBroadcast): boolean {
        if (!other) {
            return false;
        }
        return this.id.equals(other.id);
    }
}
