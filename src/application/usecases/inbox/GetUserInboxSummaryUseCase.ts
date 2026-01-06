import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Logger } from '../../../shared/logger';

export interface GetUserInboxSummaryRequest {
    userId: string;
}

export interface InboxSummaryResponse {
    summary: {
        unreadCount: number;
        systemUnreadCount: number;
        aiUnreadCount: number;
    };
}

export class GetUserInboxSummaryUseCase {
    constructor(
        private readonly messageRepository: IMessageRepository,
        private readonly userMessageRepository: IUserMessageRepository,
        private readonly logger: Logger,
    ) {}

    async execute(request: GetUserInboxSummaryRequest): Promise<InboxSummaryResponse> {
        try {
            this.logger.info('インボックスサマリー取得開始', { request });

            const userId = UserId.fromExisting(request.userId);

            // 1. 統計情報取得
            const [unreadCount, systemUnreadCount, aiUnreadCount] = await Promise.all([
                this.userMessageRepository.getUnreadCountByUserId(userId),
                this.userMessageRepository.getUnreadCountByUserIdAndType(userId, 'system'),
                this.userMessageRepository.getUnreadCountByUserIdAndType(userId, 'ai'),
            ]);

            return {
                summary: {
                    unreadCount,
                    systemUnreadCount,
                    aiUnreadCount,
                },
            };
        } catch (error) {
            this.logger.error('インボックスサマリー取得エラー', { error, request });
            throw error;
        }
    }
}
