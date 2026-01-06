import { UserId } from '../users/UserId';
import { DeliveredAt } from './DeliveredAt';
import { MessageId } from './MessageId';
import { ReadAt } from './ReadAt';
import { UserMessageId } from './UserMessageId';

/**
 * ユーザーごとのメッセージ配信・既読管理エンティティ
 * イミュータブル対応版
 */
export class UserMessage {
    constructor(
        private readonly id: UserMessageId,
        private readonly userId: UserId,
        private readonly messageId: MessageId,
        private readonly deliveredAt: DeliveredAt,
        private readonly readAt: ReadAt,
    ) {
        // すべてのプロパティが既にイミュータブルなValue Objectなので、
        // エンティティ自体も凍結
        Object.freeze(this);
    }

    public static create(userId: UserId, messageId: MessageId): UserMessage {
        return new UserMessage(UserMessageId.create(), userId, messageId, DeliveredAt.now(), ReadAt.unread());
    }

    public static reconstruct(
        id: UserMessageId,
        userId: UserId,
        messageId: MessageId,
        deliveredAt: DeliveredAt,
        readAt: ReadAt,
    ): UserMessage {
        return new UserMessage(id, userId, messageId, deliveredAt, readAt);
    }

    // Getters
    public getId(): UserMessageId {
        return this.id;
    }

    public getUserId(): UserId {
        return this.userId;
    }

    public getMessageId(): MessageId {
        return this.messageId;
    }

    public getDeliveredAt(): DeliveredAt {
        return this.deliveredAt;
    }

    public getReadAt(): ReadAt {
        return this.readAt;
    }

    // イミュータブルなビジネスロジック
    public markAsRead(): UserMessage {
        if (this.readAt.isUnread()) {
            return new UserMessage(this.id, this.userId, this.messageId, this.deliveredAt, this.readAt.markAsRead());
        }
        return this; // 既に既読の場合は同じインスタンスを返す
    }

    public markAsUnread(): UserMessage {
        if (this.readAt.isRead()) {
            return new UserMessage(this.id, this.userId, this.messageId, this.deliveredAt, ReadAt.unread());
        }
        return this; // 既に未読の場合は同じインスタンスを返す
    }

    public readAtTime(readTime: Date): UserMessage {
        return new UserMessage(this.id, this.userId, this.messageId, this.deliveredAt, ReadAt.create(readTime));
    }

    // Query methods (不変)
    public isRead(): boolean {
        return this.readAt.isRead();
    }

    public isUnread(): boolean {
        return this.readAt.isUnread();
    }

    public equals(other: UserMessage): boolean {
        return this.id.equals(other.id);
    }

    public isSameUser(userId: UserId): boolean {
        return this.userId.equals(userId);
    }

    public isSameMessage(messageId: MessageId): boolean {
        return this.messageId.equals(messageId);
    }

    public wasDeliveredBefore(date: Date): boolean {
        return this.deliveredAt.getValue() < date;
    }

    public wasDeliveredAfter(date: Date): boolean {
        return this.deliveredAt.getValue() > date;
    }

    public wasReadBefore(date: Date): boolean {
        if (this.readAt.isUnread()) {
            return false;
        }
        return this.readAt.getValue()! < date;
    }

    public wasReadAfter(date: Date): boolean {
        if (this.readAt.isUnread()) {
            return false;
        }
        return this.readAt.getValue()! > date;
    }

    public getReadDuration(): number | null {
        if (this.readAt.isUnread()) {
            return null;
        }
        return this.readAt.getValue()!.getTime() - this.deliveredAt.getValue().getTime();
    }

    // DTOへの変換
    public toDTO(): {
        readonly id: string;
        readonly userId: string;
        readonly messageId: string;
        readonly deliveredAt: string;
        readonly readAt: string | null;
        readonly isRead: boolean;
    } {
        return Object.freeze({
            id: this.id.getValue(),
            userId: this.userId.getValue(),
            messageId: this.messageId.getValue(),
            deliveredAt: this.deliveredAt.toISOString(),
            readAt: this.readAt.toISOString(),
            isRead: this.readAt.isRead(),
        });
    }
}
