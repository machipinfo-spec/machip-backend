import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { MessageId } from '../../../domain/value-object/inbox/MessageId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface GetMessageDetailRequest {
    messageId: string;
    userId: string; // 閲覧ユーザー
}

export interface MessageDetailResponse {
    message: {
        id: string;
        type: string;
        subject: string;
        content: string;
        sender: {
            id: string;
            name: string;
            avatar?: string;
        };
        createdAt: string;
    };
    userMessage: {
        id: string;
        deliveredAt: string;
        readAt: string | null;
        isRead: boolean;
    };
    deliveryStats: {
        totalDelivered: number;
        totalRead: number;
        totalUnread: number;
        readRate: number;
    };
}

export class GetMessageDetailUseCase {
    constructor(
        private readonly messageRepository: IMessageRepository,
        private readonly userMessageRepository: IUserMessageRepository,
        private readonly profileRepository: IProfileRepository,
        private readonly logger: Logger,
    ) {}

    async execute(request: GetMessageDetailRequest): Promise<MessageDetailResponse> {
        try {
            this.logger.info('メッセージ詳細取得開始', { request });

            const messageId = MessageId.fromExisting(request.messageId);
            const userId = UserId.fromExisting(request.userId);

            // 1. メッセージ取得
            const message = await this.messageRepository.findById(messageId);
            if (!message) {
                throw new Error('メッセージが見つかりません');
            }

            // 2. ユーザーメッセージ取得
            const userMessage = await this.userMessageRepository.findByUserAndMessage(userId, messageId);
            if (!userMessage) {
                throw new Error('このメッセージは配信されていません');
            }

            // 3. 配信統計取得
            const deliveryStats = await this.userMessageRepository.getDeliveryStats(messageId);

            // 4. 自動既読化（メッセージを開いた時点で既読にする）
            if (userMessage.isUnread()) {
                await this.userMessageRepository.markAsRead(userId, messageId);
            }

            this.logger.info('メッセージ詳細取得完了', {
                messageId: request.messageId,
                userId: request.userId,
            });

            const profile = await this.profileRepository.findByUserId(message.getSenderUserId());
            if (!profile) {
                throw new Error('関連するプロフィールが見つかりません');
            }

            return {
                message: {
                    id: message.getId().getValue(),
                    type: message.getType().getValue(),
                    subject: message.getSubject().getValue(),
                    content: JSON.stringify(message.getContent().getValue()),
                    sender: {
                        id: message.getSenderUserId().getValue(),
                        name: profile.userName.getValue(),
                        avatar: profile.imageUrl.getValue() || undefined,
                    },
                    createdAt: message.getCreatedAt().toISOString(),
                },
                userMessage: {
                    id: userMessage.getId().getValue(),
                    deliveredAt: userMessage.getDeliveredAt().toISOString(),
                    readAt: userMessage.getReadAt().toISOString(),
                    isRead: true, // 閲覧時点で既読になるため
                },
                deliveryStats,
            };
        } catch (error) {
            this.logger.error('メッセージ詳細取得エラー', { error, request });
            throw error;
        }
    }
}
