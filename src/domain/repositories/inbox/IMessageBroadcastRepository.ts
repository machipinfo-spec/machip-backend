import { MessageBroadcast } from '../../entities/inbox/MessageBroadcast';
import { BroadcastId } from '../../value-object/inbox/BroadcastId';
import { BroadcastStatus } from '../../value-object/inbox/BroadcastStatus';
import { MessageId } from '../../value-object/inbox/MessageId';

export interface IMessageBroadcastRepository {
    /**
     * ブロードキャストを保存する
     */
    save(broadcast: MessageBroadcast): Promise<void>;

    /**
     * IDでブロードキャストを取得する
     */
    findById(id: BroadcastId): Promise<MessageBroadcast | null>;

    /**
     * メッセージIDでブロードキャストを取得する
     */
    findByMessageId(messageId: MessageId): Promise<MessageBroadcast[]>;

    /**
     * ステータス別でブロードキャストを取得する
     */
    findByStatus(status: BroadcastStatus): Promise<MessageBroadcast[]>;

    /**
     * 処理待ちのブロードキャストを取得する
     */
    findPendingBroadcasts(): Promise<MessageBroadcast[]>;

    /**
     * 進行中のブロードキャストを取得する
     */
    findProcessingBroadcasts(): Promise<MessageBroadcast[]>;

    /**
     * 全てのブロードキャストを取得する（作成日時降順）
     */
    findAll(limit?: number, offset?: number): Promise<MessageBroadcast[]>;

    /**
     * ブロードキャストを更新する
     */
    update(broadcast: MessageBroadcast): Promise<void>;

    /**
     * ブロードキャストを削除する
     */
    delete(id: BroadcastId): Promise<void>;

    /**
     * ブロードキャストが存在するかチェックする
     */
    exists(id: BroadcastId): Promise<boolean>;

    /**
     * ブロードキャストの統計情報を取得する
     */
    getStats(): Promise<{
        totalBroadcasts: number;
        pendingCount: number;
        processingCount: number;
        completedCount: number;
        failedCount: number;
    }>;

    /**
     * 古いブロードキャストを削除する
     */
    deleteOlderThan(date: Date): Promise<number>;

    /**
     * 失敗したブロードキャストを再試行対象として取得する
     */
    findFailedBroadcastsForRetry(retryAfterHours: number): Promise<MessageBroadcast[]>;
}
