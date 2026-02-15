import {
    IPushNotificationService,
    PushNotificationData,
} from '../../../domain/services/notification/IPushNotificationService';
import { IDeviceTokenRepository } from '../../../domain/repositories/user/IDeviceTokenRepository';
import { Logger } from '../../../shared/logger';
import { getMessagingService } from '../config/firebaseAdmin';
import { MulticastMessage } from 'firebase-admin/messaging';

export class FirebasePushNotificationService implements IPushNotificationService {
    private readonly logger: Logger;

    constructor(private readonly deviceTokenRepository: IDeviceTokenRepository) {
        this.logger = new Logger('FirebasePushNotificationService');
    }

    async sendToUser(userId: string, notification: PushNotificationData): Promise<void> {
        await this.sendToUsers([userId], notification);
    }

    async sendToUsers(userIds: string[], notification: PushNotificationData): Promise<void> {
        if (userIds.length === 0) return;

        try {
            // 1. 全ユーザーのデバイストークンを取得
            const tokens: string[] = [];
            const tokenToUserIdMap: Map<string, string> = new Map();

            // Note: ユーザー数が多い場合はバッチ処理などを検討すべきだが、現状の規模では並列取得で対応
            await Promise.all(
                userIds.map(async (userId) => {
                    const deviceTokens = await this.deviceTokenRepository.findByUserId(userId);
                    deviceTokens.forEach((dt) => {
                        tokens.push(dt.getToken());
                        tokenToUserIdMap.set(dt.getToken(), userId);
                    });
                }),
            );

            if (tokens.length === 0) {
                this.logger.info('送信対象のデバイストークンがありません', { userCount: userIds.length });
                return;
            }

            // 2. メッセージ構築
            const message: MulticastMessage = {
                tokens: tokens,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: notification.data,
                // Android/iOSごとの設定が必要な場合はここに追加
                android: {
                    priority: 'high',
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            contentAvailable: true,
                        },
                    },
                },
            };

            // 3. 送信
            const messaging = await getMessagingService();
            const response = await messaging.sendEachForMulticast(message);

            this.logger.info('プッシュ通知送信完了', {
                successCount: response.successCount,
                failureCount: response.failureCount,
            });

            // 4. エラーハンドリング (無効なトークンの削除など)
            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const failedToken = tokens[idx];
                        const error = resp.error;
                        this.logger.warn('プッシュ通知送信失敗', {
                            token: failedToken,
                            error: error?.code,
                            message: error?.message,
                        });

                        if (
                            error?.code === 'messaging/invalid-registration-token' ||
                            error?.code === 'messaging/registration-token-not-registered'
                        ) {
                            failedTokens.push(failedToken);
                        }
                    }
                });

                if (failedTokens.length > 0) {
                    await this.deviceTokenRepository.deleteTokens(failedTokens);
                    this.logger.info('無効なトークンを削除しました', { count: failedTokens.length });
                }
            }
        } catch (error) {
            this.logger.error('プッシュ通知送信プロセスエラー', { error });
            // 通知エラーでメイン処理を落とさないため、スローはしない
        }
    }
}
