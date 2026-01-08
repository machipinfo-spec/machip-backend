import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { MessageType } from '../../../domain/value-object/inbox/MessageType';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface MarkAllAsReadRequest {
    userId: string;
    type?: 'system' | 'ai' | 'all';
}

export interface MarkAllAsReadResponse {
    success: boolean;
    message: string;
    markedCount: number;
}

export class MarkAllAsReadUseCase {
    constructor(private readonly userMessageRepository: IUserMessageRepository, private readonly logger: Logger) {}

    async execute(request: MarkAllAsReadRequest): Promise<MarkAllAsReadResponse> {
        try {
            this.logger.info('全メッセージ既読化開始', { request });

            const userId = UserId.fromExisting(request.userId);

            // 既読化前の未読件数を取得
            const beforeCount =
                request.type && request.type !== 'all'
                    ? await this.userMessageRepository.getUnreadCountByUserIdAndType(userId, request.type)
                    : await this.userMessageRepository.getUnreadCountByUserId(userId);

            // 既読化実行
            if (request.type && request.type !== 'all') {
                const messageType = request.type === 'system' ? MessageType.system() : MessageType.ai();
                await this.userMessageRepository.markAllAsReadByUserAndType(userId, messageType);
            } else {
                await this.userMessageRepository.markAllAsReadByUser(userId);
            }

            this.logger.info('全メッセージ既読化完了', { request, markedCount: beforeCount });

            return {
                success: true,
                message: `${beforeCount}件のメッセージを既読にしました`,
                markedCount: beforeCount,
            };
        } catch (error) {
            this.logger.error('全メッセージ既読化エラー', { error, request });
            throw error;
        }
    }
}
