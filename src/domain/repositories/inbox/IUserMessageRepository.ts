import { UserMessageCollection } from '../../entities/inbox/UserMessageCollection';
import { MessageId } from '../../value-object/inbox/MessageId';
import { MessageTypeValue, MessageType } from '../../value-object/inbox/MessageType';
import { UserMessage } from '../../value-object/inbox/UserMessage';
import { UserMessageId } from '../../value-object/inbox/UserMessageId';
import { UserId } from '../../value-object/users/UserId';

export interface IUserMessageRepository {
    /**
     * ユーザーメッセージを保存する
     */
    save(userMessage: UserMessage): Promise<void>;

    /**
     * IDでユーザーメッセージを取得する
     */
    findById(id: UserMessageId): Promise<UserMessage | null>;

    /**
     * ユーザーIDでメッセージを取得する（配信日時降順）
     */
    findByUserId(userId: UserId): Promise<UserMessageCollection>;
    /**
     * ユーザーとメッセージの組み合わせで検索
     */
    findByUserAndMessage(userId: UserId, messageId: MessageId): Promise<UserMessage | null>;

    /**
     * 複数条件でフィルタリングして取得する
     */
    findByFilter(filter: {
        userId?: string;
        messageId?: string;
        isRead?: boolean;
        type?: MessageTypeValue | 'all';
        limit?: number;
        offset?: number;
    }): Promise<UserMessageCollection>;

    /**
     * ユーザーメッセージを更新する
     */
    update(userMessage: UserMessage): Promise<void>;

    /**
     * ユーザーメッセージを削除する
     */
    delete(id: UserMessageId): Promise<void>;

    /**
     * 複数のユーザーメッセージを一括保存する
     */
    saveMultiple(userMessages: UserMessage[]): Promise<void>;

    /**
     * ユーザーの特定メッセージを既読にする
     */
    markAsRead(userId: UserId, messageId: MessageId): Promise<void>;

    /**
     * ユーザーの全メッセージを既読にする
     */
    markAllAsReadByUser(userId: UserId): Promise<void>;

    /**
     * ユーザーの特定タイプの全メッセージを既読にする
     */
    markAllAsReadByUserAndType(userId: UserId, type: MessageType): Promise<void>;

    /**
     * ユーザーの未読件数を取得する
     */
    getUnreadCountByUserId(userId: UserId): Promise<number>;

    /**
     * ユーザーのタイプ別未読件数を取得する
     */
    getUnreadCountByUserIdAndType(userId: UserId, type: MessageTypeValue): Promise<number>;

    /**
     * メッセージの配信統計を取得する
     */
    getDeliveryStats(messageId: MessageId): Promise<{
        totalDelivered: number;
        totalRead: number;
        totalUnread: number;
        readRate: number;
    }>;

    /**
     * ユーザーが存在するかチェックする
     */
    existsByUserAndMessage(userId: UserId, messageId: MessageId): Promise<boolean>;

    /**
     * 古いユーザーメッセージを削除する
     */
    deleteOlderThan(date: Date): Promise<number>;
}
