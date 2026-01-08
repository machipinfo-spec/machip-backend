import { Logger } from '../../../shared/logger';
import { MessageSendingService, MessageSendingRequest } from '../../services/inbox/MessageSendingService';

export type SendMessageRequest = MessageSendingRequest;

export interface SendMessageResponse {
    messageId: string;
    broadcastId?: string; // multiple/all の場合
    deliveredCount: number;
    success: boolean;
    message: string;
}

/**
 * リファクタリング後のSendMessageUseCase
 * メッセージ送信の実装はMessageSendingServiceに委譲
 */
export class SendMessageUseCase {
    constructor(private readonly messageSendingService: MessageSendingService, private readonly logger: Logger) {}

    async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
        try {
            this.logger.info('SendMessageUseCase実行開始', { request });

            // MessageSendingServiceに委譲
            const result = await this.messageSendingService.sendMessage(request);

            this.logger.info('SendMessageUseCase実行完了', {
                messageId: result.messageId,
                deliveredCount: result.deliveredCount,
            });

            return result;
        } catch (error) {
            this.logger.error('SendMessageUseCaseエラー', { error, request });
            throw error;
        }
    }
}
