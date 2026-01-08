import { Logger } from '../../../shared/logger';

/**
 * インボックス通知サービス
 * メッセージ配信時の通知機能を管理
 */
export class InboxNotificationService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger('InboxNotificationService');
    }

    /**
     * 新着メッセージ通知
     */
    async notifyNewMessage(data: {
        userId: string;
        messageId: string;
        messageType: 'system' | 'reply';
        subject: string;
        senderName: string;
    }): Promise<void> {
        try {
            this.logger.info('新着メッセージ通知送信', { data });

            // 実際の通知実装は外部サービス（FCM、メール、WebSocket等）と連携
            // ここではログ出力のみ

            // WebSocket通知の例
            // await this.webSocketService.sendToUser(data.userId, {
            //     type: 'NEW_MESSAGE',
            //     payload: data
            // });

            // プッシュ通知の例
            // await this.pushNotificationService.send(data.userId, {
            //     title: `新着メッセージ: ${data.subject}`,
            //     body: `${data.senderName}からメッセージが届きました`,
            //     data: { messageId: data.messageId }
            // });

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
