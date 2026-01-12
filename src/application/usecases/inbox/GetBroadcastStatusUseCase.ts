import { IMessageBroadcastRepository } from '../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { BroadcastId } from '../../../domain/value-object/inbox/BroadcastId';
import { Logger } from '../../../shared/logger';

export interface GetBroadcastStatusRequest {
    broadcastId: string;
}

export interface BroadcastStatusResponse {
    broadcast: {
        id: string;
        messageId: string;
        status: string;
        createdAt: string;
        completedAt?: string;
        progress: {
            total: number;
            delivered: number;
            failed: number;
            remaining: number;
            percentage: number;
        };
    };
    message: {
        subject: string;
        type: string;
        senderUserName: string;
    };
}

export class GetBroadcastStatusUseCase {
    constructor(
        private readonly messageBroadcastRepository: IMessageBroadcastRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly profileRepository: IProfileRepository,
        private readonly logger: Logger,
    ) {}

    async execute(request: GetBroadcastStatusRequest): Promise<BroadcastStatusResponse> {
        try {
            this.logger.info('ブロードキャスト状況取得開始', { request });

            const broadcastId = BroadcastId.fromExisting(request.broadcastId);

            // ブロードキャスト取得
            const broadcast = await this.messageBroadcastRepository.findById(broadcastId);
            if (!broadcast) {
                throw new Error('ブロードキャストが見つかりません');
            }

            // メッセージ情報取得
            const message = await this.messageRepository.findById(broadcast.getMessageId());
            if (!message) {
                throw new Error('関連するメッセージが見つかりません');
            }

            this.logger.info('ブロードキャスト状況取得完了', {
                broadcastId: request.broadcastId,
                status: broadcast.getStatus().getValue(),
            });

            const profile = await this.profileRepository.findByUserId(message.getSenderUserId());
            if (!profile) {
                throw new Error('関連するプロフィールが見つかりません');
            }

            return {
                broadcast: {
                    id: broadcast.getId().getValue(),
                    messageId: broadcast.getMessageId().getValue(),
                    status: broadcast.getStatus().getValue(),
                    createdAt: broadcast.getCreatedAt().toISOString(),
                    completedAt: broadcast.getCompletedAt()?.toISOString(),
                    progress: broadcast.getProgress(),
                },
                message: {
                    subject: message.getSubject().getValue(),
                    type: message.getType().getValue(),
                    senderUserName: profile.userName.getValue(),
                },
            };
        } catch (error) {
            this.logger.error('ブロードキャスト状況取得エラー', { error, request });
            throw error;
        }
    }
}
