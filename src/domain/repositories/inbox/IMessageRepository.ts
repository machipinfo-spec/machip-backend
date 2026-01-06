import { Message } from '../../entities/inbox/Message';
import { MessageCollection } from '../../entities/inbox/MessageCollection';
import { MessageId } from '../../value-object/inbox/MessageId';
import { MessageType, MessageTypeValue } from '../../value-object/inbox/MessageType';
import { UserId } from '../../value-object/users/UserId';

export interface IMessageRepository {
    /**
     * メッセージを保存する
     */
    save(message: Message): Promise<void>;

    /**
     * IDでメッセージを取得する
     */
    findById(id: MessageId): Promise<Message | null>;

    /**
     * 全てのメッセージを取得する（作成日時降順）
     */
    findAll(): Promise<MessageCollection>;

    /**
     * メッセージタイプで絞り込んで取得する
     */
    findByType(type: MessageType): Promise<MessageCollection>;

    /**
     * 送信者IDで絞り込んで取得する
     */
    findBySenderId(senderId: string): Promise<MessageCollection>;

    /**
     * 複数条件でフィルタリングして取得する
     */
    findByFilter(filter: {
        type?: MessageTypeValue | 'all';
        senderId?: string;
        limit?: number;
        offset?: number;
        searchText?: string;
    }): Promise<MessageCollection>;

    /**
     * 特定ユーザーに配信されたメッセージを取得する（UserMessageと結合）
     */
    findDeliveredToUser(
        userId: UserId,
        filter?: {
            type?: MessageTypeValue | 'all';
            isRead?: boolean;
            limit?: number;
            offset?: number;
        },
    ): Promise<MessageCollection>;

    /**
     * メッセージを更新する
     */
    update(message: Message): Promise<void>;

    /**
     * メッセージを削除する
     */
    delete(id: MessageId): Promise<void>;

    /**
     * メッセージが存在するかチェックする
     */
    exists(id: MessageId): Promise<boolean>;

    /**
     * メッセージ数をカウントする
     */
    count(): Promise<number>;

    /**
     * タイプ別メッセージ数をカウントする
     */
    countByType(): Promise<Record<MessageTypeValue, number>>;

    /**
     * 指定した日付より古いメッセージを削除する
     */
    deleteOlderThan(date: Date): Promise<number>;

    /**
     * メッセージを検索する（件名・本文）
     */
    search(
        searchText: string,
        filter?: {
            type?: MessageTypeValue | 'all';
            limit?: number;
            offset?: number;
        },
    ): Promise<MessageCollection>;
}
