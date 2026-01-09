import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { IMessageBroadcastRepository } from '../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { Message } from '../../../domain/entities/inbox/Message';
import { MessageDeliveryService } from '../../../domain/services/inbox/MessageDeliveryService';
import { Logger } from '../../../shared/logger';
import { SystemMessageContent } from '../../../domain/value-object/inbox/SystemMessageContent';
import { ReplyMessageContent } from '../../../domain/value-object/inbox/ReplyMessageContent';
import { MessageSubject } from '../../../domain/value-object/inbox/MessageSubject';
import { MessageType } from '../../../domain/value-object/inbox/MessageType';
import { UserId } from '../../../domain/value-object/users/UserId';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { Profile } from '../../../domain/entities/profile/profile';
import { UserName } from '../../../domain/value-object/users/UserName';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../domain/value-object/profile/ProfileUrl';
import { NewEventMessageContent } from '../../../domain/value-object/inbox/NewEventMessageContent';

export interface SystemMessageRequest {
    type: 'system';
    subject: string;
    content: {
        message: string;
    };
    senderUserId: string;
    deliveryType: 'single' | 'multiple' | 'all';
    targetUserIds?: string[];
}

export interface ReplyMessageRequest {
    type: 'reply';
    subject: string;
    content: {
        ownerThreadId: string;
        threadId: string;
        content: string;
        replyUserId: string;
        replyUserName: string;
    };
    senderUserId: string;
    deliveryType: 'single' | 'multiple' | 'all';
    targetUserIds?: string[];
}

export interface NewEventMessageRequest {
    type: 'newEvent';
    subject: string;
    content: {
        pointInfoId: string;
        ownerUserId: string;
        address: string;
        title: string;
        date: Date | null;
    };
    senderUserId: string;
    deliveryType: 'single' | 'multiple' | 'all';
    targetUserIds?: string[];
}

export type MessageSendingRequest = SystemMessageRequest | ReplyMessageRequest | NewEventMessageRequest;

export interface MessageSendingResult {
    messageId: string;
    broadcastId?: string;
    deliveredCount: number;
    success: boolean;
    message: string;
}

export class MessageSendingService {
    constructor(
        private readonly profileRepository: IProfileRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly userMessageRepository: IUserMessageRepository,
        private readonly messageBroadcastRepository: IMessageBroadcastRepository,
        private readonly userRepository: IUserRepository,
        private readonly logger: Logger,
    ) {}

    /**
     * メッセージを送信する
     */
    async sendMessage(request: MessageSendingRequest): Promise<MessageSendingResult> {
        try {
            this.logger.info('メッセージ送信サービス開始', { request });

            // 1. バリデーション
            this.validateRequest(request);

            // 2. 送信者の取得または作成
            const sender = await this.getOrCreateSender(request);

            // 3. メッセージ作成
            const message = this.createMessage(request);

            // 4. メッセージ保存
            await this.messageRepository.save(message);

            // 5. 配信実行
            const deliveryResult = await this.executeDelivery(message, request);

            this.logger.info('メッセージ送信サービス完了', {
                messageId: message.getId().getValue(),
                deliveredCount: deliveryResult.deliveredCount,
            });

            return {
                messageId: message.getId().getValue(),
                broadcastId: deliveryResult.broadcastId,
                deliveredCount: deliveryResult.deliveredCount,
                success: true,
                message: 'メッセージが正常に送信されました',
            };
        } catch (error) {
            this.logger.error('メッセージ送信サービスエラー', { error, request });
            throw error;
        }
    }

    /**
     * システムメッセージを送信する便利メソッド
     */
    async sendSystemMessage(
        subject: string,
        content: string,
        deliveryType: 'single' | 'multiple' | 'all',
        targetUserIds?: string[],
    ): Promise<MessageSendingResult> {
        return this.sendMessage({
            type: 'system',
            subject,
            content: { message: content },
            senderUserId: UserId.SYSTEM_ID.getValue(),
            deliveryType,
            targetUserIds,
        });
    }

    /**
     * 単一ユーザーにシステムメッセージを送信する便利メソッド
     */
    async sendToUser(
        userId: string,
        subject: string,
        content: string,
        senderUserId: string,
    ): Promise<MessageSendingResult> {
        return this.sendMessage({
            type: 'system',
            subject,
            content: { message: content },
            senderUserId,
            deliveryType: 'single',
            targetUserIds: [userId],
        });
    }

    /**
     * 複数ユーザーにシステムメッセージを送信する便利メソッド
     */
    async sendToMultipleUsers(userIds: string[], subject: string, content: string): Promise<MessageSendingResult> {
        return this.sendMessage({
            type: 'system',
            subject,
            content: { message: content },
            senderUserId: UserId.SYSTEM_ID.getValue(),
            deliveryType: 'multiple',
            targetUserIds: userIds,
        });
    }

    private validateRequest(request: MessageSendingRequest): void {
        if (!request.subject || request.subject.trim().length === 0) {
            throw new Error('件名は必須です');
        }

        // Validate content based on type
        if (request.type === 'system') {
            if (!request.content.message || request.content.message.trim().length === 0) {
                throw new Error('本文は必須です');
            }
        } else if (request.type === 'reply') {
            if (!request.content.content || request.content.content.trim().length === 0) {
                throw new Error('本文は必須です');
            }
            if (!request.content.ownerThreadId || !request.content.threadId) {
                throw new Error('スレッドIDは必須です');
            }
            if (!request.content.replyUserId || !request.content.replyUserName) {
                throw new Error('返信ユーザー情報は必須です');
            }
        } else if (request.type === 'newEvent') {
            if (!request.content.pointInfoId || !request.content.ownerUserId) {
                throw new Error('ポイント情報は必須です');
            }
            if (!request.content.address) {
                throw new Error('住所は必須です');
            }
        }

        if (!request.senderUserId || request.senderUserId.trim().length === 0) {
            throw new Error('送信者IDは必須です');
        }
        if (request.deliveryType === 'single' && (!request.targetUserIds || request.targetUserIds.length !== 1)) {
            throw new Error('単一配信では対象ユーザーIDが1つ必要です');
        }
        if (request.deliveryType === 'multiple' && (!request.targetUserIds || request.targetUserIds.length === 0)) {
            throw new Error('複数配信では対象ユーザーIDが必要です');
        }
    }

    private createMessage(request: MessageSendingRequest): Message {
        const subject = MessageSubject.create(request.subject);

        if (request.type === 'system') {
            const messageType = MessageType.system();
            const content = SystemMessageContent.create(request.content.message);
            return Message.create(messageType, subject, content, new UserId(request.senderUserId));
        } else if (request.type === 'reply') {
            const messageType = MessageType.reply();
            const content = ReplyMessageContent.create(
                request.content.ownerThreadId,
                request.content.threadId,
                request.content.content,
                request.content.replyUserId,
                request.content.replyUserName,
            );
            return Message.create(messageType, subject, content, new UserId(request.senderUserId));
        } else if (request.type === 'newEvent') {
            const messageType = MessageType.newEvent();
            const content = NewEventMessageContent.create(
                request.content.pointInfoId,
                request.content.ownerUserId,
                request.content.address,
                request.content.title,
                request.content.date,
            );
            return Message.create(messageType, subject, content, new UserId(request.senderUserId));
        } else {
            throw new Error(`Unsupported message type: ${(request as any).type}`);
        }
    }

    private async getOrCreateSender(request: MessageSendingRequest): Promise<Profile> {
        const profile = await this.profileRepository.findByUserId(UserId.fromExisting(request.senderUserId));
        if (!profile) {
            // 現状はシステム管理者のみ。従って存在しなければここで作成する
            const profile = Profile.create(
                UserId.fromExisting(request.senderUserId),
                UserName.create('システム管理者'),
                ImageUrl.create('https://tetra-images-poc.s3.ap-northeast-1.amazonaws.com/profile/default.png'),
                Introduction.create(''),
                ProfileUrl.create(''),
            );
            await this.profileRepository.save(profile);
            return profile;
        }
        return profile;
    }

    private async executeDelivery(
        message: Message,
        request: MessageSendingRequest,
    ): Promise<{
        deliveredCount: number;
        broadcastId?: string;
    }> {
        switch (request.deliveryType) {
            case 'single':
                return this.deliverToSingleUser(message, request.targetUserIds![0]);

            case 'multiple':
                return this.deliverToMultipleUsers(message, request.targetUserIds!);

            case 'all':
                const allUsers = await this.userRepository.findAll();
                const allUserIds = allUsers.map((user) => user.userId.getValue());
                return this.deliverToMultipleUsers(message, allUserIds);

            default:
                throw new Error(`未対応の配信タイプ: ${request.deliveryType}`);
        }
    }

    private async deliverToSingleUser(
        message: Message,
        userIdString: string,
    ): Promise<{
        deliveredCount: number;
    }> {
        const userId = UserId.fromExisting(userIdString);
        const userMessage = MessageDeliveryService.deliverToUser(message, userId);

        await this.userMessageRepository.save(userMessage);

        return { deliveredCount: 1 };
    }

    private async deliverToMultipleUsers(
        message: Message,
        userIdStrings: string[],
    ): Promise<{
        deliveredCount: number;
        broadcastId: string;
    }> {
        const userIds = userIdStrings.map((id) => UserId.fromExisting(id));
        const broadcast = MessageDeliveryService.createBroadcast(message, userIds);

        broadcast.startProcessing();
        await this.messageBroadcastRepository.save(broadcast);

        const userMessages = MessageDeliveryService.generateUserMessagesFromBroadcast(broadcast);

        try {
            await this.userMessageRepository.saveMultiple(userMessages);

            userMessages.forEach(() => broadcast.incrementDelivered());
            await this.messageBroadcastRepository.update(broadcast);

            return {
                deliveredCount: userMessages.length,
                broadcastId: broadcast.getId().getValue(),
            };
        } catch (error) {
            userMessages.forEach(() => broadcast.incrementFailed());
            await this.messageBroadcastRepository.update(broadcast);
            throw error;
        }
    }
}
