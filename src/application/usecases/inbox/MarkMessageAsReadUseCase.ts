import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { MessageId } from '../../../domain/value-object/inbox/MessageId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface MarkMessageAsReadRequest {
    userId: string;
    messageId: string;
}

export interface MarkMessageAsReadResponse {
    success: boolean;
    message: string;
}

export class MarkMessageAsReadUseCase {
    constructor(private readonly userMessageRepository: IUserMessageRepository, private readonly logger: Logger) {}

    async execute(request: MarkMessageAsReadRequest): Promise<MarkMessageAsReadResponse> {
        try {
            this.logger.info('メッセージ既読化開始', { request });

            const userId = UserId.fromExisting(request.userId);
            const messageId = MessageId.fromExisting(request.messageId);

            // ユーザーメッセージの存在確認
            const exists = await this.userMessageRepository.existsByUserAndMessage(userId, messageId);
            if (!exists) {
                throw new Error('指定されたメッセージが見つかりません');
            }

            // 既読化実行
            await this.userMessageRepository.markAsRead(userId, messageId);

            this.logger.info('メッセージ既読化完了', { request });

            return {
                success: true,
                message: 'メッセージを既読にしました',
            };
        } catch (error) {
            this.logger.error('メッセージ既読化エラー', { error, request });
            throw error;
        }
    }
}
