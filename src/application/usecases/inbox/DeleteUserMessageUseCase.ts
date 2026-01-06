import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { MessageId } from '../../../domain/value-object/inbox/MessageId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface DeleteUserMessageRequest {
    userId: string;
    messageId: string;
}

export interface DeleteUserMessageResponse {
    success: boolean;
    message: string;
}

export class DeleteUserMessageUseCase {
    constructor(private readonly userMessageRepository: IUserMessageRepository, private readonly logger: Logger) {}

    async execute(request: DeleteUserMessageRequest): Promise<DeleteUserMessageResponse> {
        try {
            this.logger.info('ユーザーメッセージ削除開始', { request });

            const userId = UserId.fromExisting(request.userId);
            const messageId = MessageId.fromExisting(request.messageId);

            // ユーザーメッセージの存在確認
            const userMessage = await this.userMessageRepository.findByUserAndMessage(userId, messageId);
            if (!userMessage) {
                throw new Error('指定されたメッセージが見つかりません');
            }

            // 削除実行
            await this.userMessageRepository.delete(userMessage.getId());

            this.logger.info('ユーザーメッセージ削除完了', { request });

            return {
                success: true,
                message: 'メッセージを削除しました',
            };
        } catch (error) {
            this.logger.error('ユーザーメッセージ削除エラー', { error, request });
            throw error;
        }
    }
}
