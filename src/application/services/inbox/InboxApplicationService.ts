import { InboxRepositoryModule } from '../../../infrastructure/firebase/persistence/inbox/InboxRepositoryModule';
import { Logger } from '../../../shared/logger';
import {
    DeleteUserMessageUseCase,
    DeleteUserMessageRequest,
    DeleteUserMessageResponse,
} from '../../usecases/inbox/DeleteUserMessageUseCase';
import {
    GetBroadcastStatusUseCase,
    GetBroadcastStatusRequest,
    BroadcastStatusResponse,
} from '../../usecases/inbox/GetBroadcastStatusUseCase';
import {
    GetMessageDetailUseCase,
    GetMessageDetailRequest,
    MessageDetailResponse,
} from '../../usecases/inbox/GetMessageDetailUseCase';
import {
    GetUserInboxSummaryUseCase,
    GetUserInboxSummaryRequest,
    InboxSummaryResponse,
} from '../../usecases/inbox/GetUserInboxSummaryUseCase';
import {
    GetUserMessagesUseCase,
    GetUserMessagesRequest,
    GetUserMessagesResponse,
} from '../../usecases/inbox/GetUserMessagesUseCase';
import {
    MarkAllAsReadUseCase,
    MarkAllAsReadRequest,
    MarkAllAsReadResponse,
} from '../../usecases/inbox/MarkAllAsReadUseCase';
import {
    MarkMessageAsReadUseCase,
    MarkMessageAsReadRequest,
    MarkMessageAsReadResponse,
} from '../../usecases/inbox/MarkMessageAsReadUseCase';
import { SendMessageUseCase, SendMessageRequest, SendMessageResponse } from '../../usecases/inbox/SendMessageUseCase';
import { MessageSendingService } from './MessageSendingService';

/**
 * インボックス機能のアプリケーションサービス
 * すべてのユースケースを統合し、外部からのエントリーポイントとして機能する
 */
export class InboxApplicationService {
    private readonly logger: Logger;
    private readonly sendMessageUseCase: SendMessageUseCase;
    private readonly getUserMessagesUseCase: GetUserMessagesUseCase;
    private readonly markMessageAsReadUseCase: MarkMessageAsReadUseCase;
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase;
    private readonly getMessageDetailUseCase: GetMessageDetailUseCase;
    private readonly getUserInboxSummaryUseCase: GetUserInboxSummaryUseCase;
    private readonly deleteUserMessageUseCase: DeleteUserMessageUseCase;
    private readonly getBroadcastStatusUseCase: GetBroadcastStatusUseCase;

    constructor() {
        this.logger = new Logger('InboxApplicationService');

        // リポジトリの取得
        const messageRepository = InboxRepositoryModule.getMessageRepository();
        const userMessageRepository = InboxRepositoryModule.getUserMessageRepository();
        const messageBroadcastRepository = InboxRepositoryModule.getMessageBroadcastRepository();
        const profileRepository = InboxRepositoryModule.getProfileRepository();

        const messageSendingService = new MessageSendingService(
            profileRepository,
            messageRepository,
            userMessageRepository,
            messageBroadcastRepository,
            this.logger,
        );

        // ユースケースの初期化
        this.sendMessageUseCase = new SendMessageUseCase(messageSendingService, this.logger);

        this.getUserMessagesUseCase = new GetUserMessagesUseCase(
            messageRepository,
            userMessageRepository,
            profileRepository,
            this.logger,
        );

        this.markMessageAsReadUseCase = new MarkMessageAsReadUseCase(userMessageRepository, this.logger);

        this.markAllAsReadUseCase = new MarkAllAsReadUseCase(userMessageRepository, this.logger);

        this.getMessageDetailUseCase = new GetMessageDetailUseCase(
            messageRepository,
            userMessageRepository,
            profileRepository,
            this.logger,
        );

        this.getUserInboxSummaryUseCase = new GetUserInboxSummaryUseCase(
            messageRepository,
            userMessageRepository,
            this.logger,
        );

        this.deleteUserMessageUseCase = new DeleteUserMessageUseCase(userMessageRepository, this.logger);
        this.getBroadcastStatusUseCase = new GetBroadcastStatusUseCase(
            messageBroadcastRepository,
            messageRepository,
            profileRepository,
            this.logger,
        );
    }

    /**
     * メッセージを送信する
     */
    async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
        return this.sendMessageUseCase.execute(request);
    }

    /**
     * ユーザーのメッセージ一覧を取得する
     */
    async getUserMessages(request: GetUserMessagesRequest): Promise<GetUserMessagesResponse> {
        return this.getUserMessagesUseCase.execute(request);
    }

    /**
     * メッセージを既読にする
     */
    async markMessageAsRead(request: MarkMessageAsReadRequest): Promise<MarkMessageAsReadResponse> {
        return this.markMessageAsReadUseCase.execute(request);
    }

    /**
     * 全メッセージを既読にする
     */
    async markAllAsRead(request: MarkAllAsReadRequest): Promise<MarkAllAsReadResponse> {
        return this.markAllAsReadUseCase.execute(request);
    }

    /**
     * メッセージの詳細を取得する
     */
    async getMessageDetail(request: GetMessageDetailRequest): Promise<MessageDetailResponse> {
        return this.getMessageDetailUseCase.execute(request);
    }

    /**
     * ユーザーのインボックスサマリーを取得する
     */
    async getUserInboxSummary(request: GetUserInboxSummaryRequest): Promise<InboxSummaryResponse> {
        return this.getUserInboxSummaryUseCase.execute(request);
    }

    /**
     * ユーザーメッセージを削除する
     */
    async deleteUserMessage(request: DeleteUserMessageRequest): Promise<DeleteUserMessageResponse> {
        return this.deleteUserMessageUseCase.execute(request);
    }

    /**
     * ブロードキャストの状況を取得する
     */
    async getBroadcastStatus(request: GetBroadcastStatusRequest): Promise<BroadcastStatusResponse> {
        return this.getBroadcastStatusUseCase.execute(request);
    }

    /**
     * ヘルスチェック
     */
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        try {
            // 簡単な接続確認（例：メッセージ数のカウント）
            const messageRepository = InboxRepositoryModule.getMessageRepository();
            await messageRepository.count();

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('ヘルスチェックエラー', { error });
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
            };
        }
    }
}
