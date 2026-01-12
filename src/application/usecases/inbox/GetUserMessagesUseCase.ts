import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface GetUserMessagesRequest {
    userId: string;
    filter?: {
        type?: 'system' | 'ai' | 'all';
        isRead?: boolean;
        limit?: number;
        offset?: number;
    };
}

export interface UserMessageResponse {
    id: string;
    messageId: string;
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
    deliveredAt: string;
    readAt: string | null;
    isRead: boolean;
}

export interface GetUserMessagesResponse {
    messages: UserMessageResponse[];
    pagination: {
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
    };
    summary: {
        unreadCount: number;
        systemUnreadCount: number;
        aiUnreadCount: number;
    };
}

export class GetUserMessagesUseCase {
    constructor(
        private readonly messageRepository: IMessageRepository,
        private readonly userMessageRepository: IUserMessageRepository,
        private readonly profileRepository: IProfileRepository,
        private readonly logger: Logger,
    ) {}

    async execute(request: GetUserMessagesRequest): Promise<GetUserMessagesResponse> {
        try {
            this.logger.info('ユーザーメッセージ取得開始', { request });

            const userId = UserId.fromExisting(request.userId);
            console.log('request', request);

            // 1. ユーザーメッセージを取得
            const userMessageCollection = await this.userMessageRepository.findByFilter({
                userId: request.userId,
                type: request.filter?.type,
                isRead: request.filter?.isRead,
                limit: request.filter?.limit || 20,
                offset: request.filter?.offset || 0,
            });
            console.log('userMessageCollection', userMessageCollection);

            // 2. 関連するメッセージを取得
            const userMessages = userMessageCollection.getAll();

            const messageResponses: UserMessageResponse[] = [];

            for (const userMessage of userMessages) {
                const message = await this.messageRepository.findById(userMessage.getMessageId());
                if (message) {
                    const profile = await this.profileRepository.findByUserId(message.getSenderUserId());
                    if (!profile) {
                        throw new Error('関連するプロフィールが見つかりません');
                    }
                    messageResponses.push({
                        id: userMessage.getId().getValue(),
                        messageId: userMessage.getMessageId().getValue(),
                        message: {
                            id: message.getId().getValue(),
                            type: message.getType().getValue(),
                            subject: message.getSubject().getValue(),
                            content: message.getContent().toJSON(),
                            sender: {
                                id: message.getSenderUserId().getValue(),
                                name: profile.userName.getValue(),
                                avatar: profile.imageUrl.getValue() || undefined,
                            },
                            createdAt: message.getCreatedAt().toISOString(),
                        },
                        deliveredAt: userMessage.getDeliveredAt().toISOString(),
                        readAt: userMessage.getReadAt().toISOString(),
                        isRead: userMessage.isRead(),
                    });
                }
            }

            // 3. 統計情報を取得
            const [unreadCount, systemUnreadCount, aiUnreadCount] = await Promise.all([
                this.userMessageRepository.getUnreadCountByUserId(userId),
                this.userMessageRepository.getUnreadCountByUserIdAndType(userId, 'system'),
                this.userMessageRepository.getUnreadCountByUserIdAndType(userId, 'ai'),
            ]);

            this.logger.info('ユーザーメッセージ取得完了', {
                userId: request.userId,
                messageCount: messageResponses.length,
            });

            return {
                messages: messageResponses,
                pagination: {
                    total: userMessageCollection.count(),
                    offset: request.filter?.offset || 0,
                    limit: request.filter?.limit || 20,
                    hasMore: messageResponses.length === (request.filter?.limit || 20),
                },
                summary: {
                    unreadCount,
                    systemUnreadCount,
                    aiUnreadCount,
                },
            };
        } catch (error) {
            this.logger.error('ユーザーメッセージ取得エラー', { error, request });
            throw error;
        }
    }
}
