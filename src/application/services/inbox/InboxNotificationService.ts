import { Logger } from '../../../shared/logger';
import { IPushNotificationService } from '../../../domain/services/notification/IPushNotificationService';

/**
 * インボックス通知サービス
 * メッセージ配信時の通知機能を管理
 */
export class InboxNotificationService {
    private readonly logger: Logger;

    constructor(private readonly pushNotificationService: IPushNotificationService) {
        this.logger = new Logger('InboxNotificationService');
    }

    /**
     * 新着メッセージ通知
     */
    async notifyNewMessage(data: {
        userId: string;
        messageId: string;
        messageType: 'system' | 'reply' | 'newEvent';
        subject: string;
        senderName: string;
    }): Promise<void> {
        try {
            this.logger.info('新着メッセージ通知送信開始', { userId: data.userId });

            const title = `新着メッセージ: ${data.subject}`;
            let body = `${data.senderName}からメッセージが届きました`;

            if (data.messageType === 'system') {
                body = `[システム] ${data.subject}`;
            } else if (data.messageType === 'newEvent') {
                body = `[新着イベント] ${data.subject}`;
            }

            await this.pushNotificationService.sendToUser(data.userId, {
                title,
                body,
                data: {
                    messageId: data.messageId,
                    type: data.messageType,
                    url: `/inbox/${data.messageId}`, // フロントエンドの遷移先URL
                },
            });

            this.logger.info('新着メッセージ通知送信完了', { userId: data.userId });
        } catch (error) {
            this.logger.error('新着メッセージ通知送信エラー', { error, data });
            // 通知エラーはメッセージ配信を止めないように、ログのみ出力
        }
    }

    /**
     * 未読メッセージ数更新通知
     */
    async notifyUnreadCountUpdate(
        userId: string,
        counts: {
            total: number;
            system: number;
            ai: number;
        },
    ): Promise<void> {
        try {
            this.logger.info('未読件数更新通知送信', { userId, counts });

            // WebSocket通知の例
            // await this.webSocketService.sendToUser(userId, {
            //     type: 'UNREAD_COUNT_UPDATE',
            //     payload: counts
            // });

            this.logger.info('未読件数更新通知送信完了', { userId });
        } catch (error) {
            this.logger.error('未読件数更新通知送信エラー', { error, userId, counts });
        }
    }
}
