import { MessageDeliveryService } from '../../../domain/services/inbox/MessageDeliveryService';
import { InboxRepositoryModule } from '../../../infrastructure/firebase/persistence/inbox/InboxRepositoryModule';
import { Logger } from '../../../shared/logger';

/**
 * インボックス機能のバッチ処理サービス
 * 定期実行される処理をまとめて管理
 */
export class InboxBatchService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger('InboxBatchService');
    }

    /**
     * 古いメッセージのクリーンアップ
     * @param retentionDays 保持日数
     */
    async cleanupOldMessages(retentionDays = 90): Promise<{
        deletedMessages: number;
        deletedUserMessages: number;
        deletedBroadcasts: number;
    }> {
        try {
            this.logger.info('古いメッセージクリーンアップ開始', { retentionDays });

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const messageRepository = InboxRepositoryModule.getMessageRepository();
            const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();
            const broadcastRepository = InboxRepositoryModule.getMessageBroadcastRepository();

            const [deletedMessages, deletedUserMessages, deletedBroadcasts] = await Promise.all([
                messageRepository.deleteOlderThan(cutoffDate),
                userMessageRepository.deleteOlderThan(cutoffDate),
                broadcastRepository.deleteOlderThan(cutoffDate),
            ]);

            this.logger.info('古いメッセージクリーンアップ完了', {
                deletedMessages,
                deletedUserMessages,
                deletedBroadcasts,
            });

            return {
                deletedMessages,
                deletedUserMessages,
                deletedBroadcasts,
            };
        } catch (error) {
            this.logger.error('古いメッセージクリーンアップエラー', { error });
            throw error;
        }
    }

    /**
     * 失敗したブロードキャストの再試行
     * @param retryAfterHours 再試行までの待機時間（時間）
     */
    async retryFailedBroadcasts(retryAfterHours = 24): Promise<{
        retriedCount: number;
        successCount: number;
        failedCount: number;
    }> {
        try {
            this.logger.info('失敗ブロードキャスト再試行開始', { retryAfterHours });

            const broadcastRepository = InboxRepositoryModule.getMessageBroadcastRepository();
            const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();

            const failedBroadcasts = await broadcastRepository.findFailedBroadcastsForRetry(retryAfterHours);

            let successCount = 0;
            let failedCount = 0;

            for (const broadcast of failedBroadcasts) {
                try {
                    // ブロードキャストを再開
                    broadcast.startProcessing();
                    await broadcastRepository.update(broadcast);

                    // ユーザーメッセージ配信を再実行
                    const userMessages = MessageDeliveryService.generateUserMessagesFromBroadcast(broadcast);
                    await userMessageRepository.saveMultiple(userMessages);

                    // 成功として記録
                    userMessages.forEach(() => broadcast.incrementDelivered());
                    await broadcastRepository.update(broadcast);

                    successCount++;
                } catch (error) {
                    this.logger.error('ブロードキャスト再試行エラー', {
                        broadcastId: broadcast.getId().getValue(),
                        error,
                    });

                    // 失敗として記録
                    broadcast.markAsFailed();
                    await broadcastRepository.update(broadcast);

                    failedCount++;
                }
            }

            this.logger.info('失敗ブロードキャスト再試行完了', {
                retriedCount: failedBroadcasts.length,
                successCount,
                failedCount,
            });

            return {
                retriedCount: failedBroadcasts.length,
                successCount,
                failedCount,
            };
        } catch (error) {
            this.logger.error('失敗ブロードキャスト再試行エラー', { error });
            throw error;
        }
    }

    /**
     * インボックス統計レポートの生成
     */
    async generateStatisticsReport(): Promise<{
        messageStats: {
            totalMessages: number;
            systemMessages: number;
            aiMessages: number;
        };
        broadcastStats: {
            totalBroadcasts: number;
            pendingCount: number;
            processingCount: number;
            completedCount: number;
            failedCount: number;
        };
        generatedAt: string;
    }> {
        try {
            this.logger.info('統計レポート生成開始');

            const messageRepository = InboxRepositoryModule.getMessageRepository();
            const broadcastRepository = InboxRepositoryModule.getMessageBroadcastRepository();

            const [messageCountByType, broadcastStats] = await Promise.all([
                messageRepository.countByType(),
                broadcastRepository.getStats(),
            ]);

            const totalMessages = messageCountByType.system + messageCountByType.ai;

            const report = {
                messageStats: {
                    totalMessages,
                    systemMessages: messageCountByType.system,
                    aiMessages: messageCountByType.ai,
                },
                broadcastStats,
                generatedAt: new Date().toISOString(),
            };

            this.logger.info('統計レポート生成完了', { report });

            return report;
        } catch (error) {
            this.logger.error('統計レポート生成エラー', { error });
            throw error;
        }
    }
}
