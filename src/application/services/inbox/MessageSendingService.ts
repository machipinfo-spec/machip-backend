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
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
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
        detail?: string | null;
        url?: string | null;
        period?: string;
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

import { InboxNotificationService } from './InboxNotificationService';

// ... imports ...

export class MessageSendingService {
    constructor(
        private readonly profileRepository: IProfileRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly userMessageRepository: IUserMessageRepository,
        private readonly messageBroadcastRepository: IMessageBroadcastRepository,
        private readonly userRepository: IUserRepository,
        private readonly notificationService: InboxNotificationService, // Added
        private readonly logger: Logger,
    ) {}

    /**
     * メッセージを送信する
     */
    async sendMessage(request: MessageSendingRequest): Promise<MessageSendingResult> {
        try {
            this.logger.info('MessageSendingService: send message start', {
                type: request.type,
                subject: request.subject,
                senderUserId: request.senderUserId,
                deliveryType: request.deliveryType,
                targetCount: request.targetUserIds?.length ?? 0,
            });

            // 1. バリデーション
            this.validateRequest(request);
            this.logger.info('MessageSendingService: validation passed');

            // 2. 送信者の取得または作成
            const sender = await this.getOrCreateSender(request);
            this.logger.info('MessageSendingService: sender resolved', { senderId: sender.userId.getValue() });

            // 3. メッセージ作成
            const message = this.createMessage(request);
            this.logger.info('MessageSendingService: message created', { messageId: message.getId().getValue() });

            // 4. メッセージ保存
            await this.messageRepository.save(message);
            this.logger.info('MessageSendingService: message saved');

            // 5. 配信実行

            const deliveryResult = await this.executeDelivery(message, request);

            this.logger.info('MessageSendingService: delivery completed', {
                messageId: message.getId().getValue(),
                deliveredCount: deliveryResult.deliveredCount,
                broadcastId: deliveryResult.broadcastId,
            });

            return {
                messageId: message.getId().getValue(),
                broadcastId: deliveryResult.broadcastId,
                deliveredCount: deliveryResult.deliveredCount,
                success: true,
                message: 'メッセージが正常に送信されました',
            };
        } catch (error) {
            this.logger.error('MessageSendingService: send message error', { error, request });
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
        this.logger.info('MessageSendingService: execute delivery', { deliveryType: request.deliveryType });
        switch (request.deliveryType) {
            case 'single':
                return this.deliverToSingleUser(message, request.targetUserIds![0]);

            case 'multiple':
                return this.deliverToMultipleUsers(message, request.targetUserIds!);

            case 'all':
                const allUsers = await this.userRepository.findAll();
                const allUserIds = allUsers.map((user) => user.userId.getValue());
                this.logger.info('MessageSendingService: deliver to all', { totalUsers: allUserIds.length });
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
        this.logger.info('MessageSendingService: deliver to single user', { userId: userIdString });
        const userId = UserId.fromExisting(userIdString);
        const userMessage = MessageDeliveryService.deliverToUser(message, userId);

        await this.userMessageRepository.save(userMessage);
        this.logger.info('MessageSendingService: user message saved', {
            userMessageId: userMessage.getId().getValue(),
        });

        await this.notificationService.notifyNewMessage({
            userId: userIdString,
            messageId: message.getId().getValue(),
            messageType: message.getType().getValue() as any, // Cast needed if types don't match exactly
            subject: message.getSubject().getValue(),
            senderName: 'System',
        });

        return { deliveredCount: 1 };
    }

    private async deliverToMultipleUsers(
        message: Message,
        userIdStrings: string[],
    ): Promise<{
        deliveredCount: number;
        broadcastId: string;
    }> {
        this.logger.info('MessageSendingService: deliver to multiple users', { count: userIdStrings.length });
        const userIds = userIdStrings.map((id) => UserId.fromExisting(id));
        const broadcast = MessageDeliveryService.createBroadcast(message, userIds);

        broadcast.startProcessing();
        await this.messageBroadcastRepository.save(broadcast);
        this.logger.info('MessageSendingService: broadcast saved', { broadcastId: broadcast.getId().getValue() });

        const userMessages = MessageDeliveryService.generateUserMessagesFromBroadcast(broadcast);
        this.logger.info('MessageSendingService: generated user messages', { count: userMessages.length });

        try {
            await this.userMessageRepository.saveMultiple(userMessages);
            this.logger.info('MessageSendingService: user messages saved');

            userMessages.forEach(() => broadcast.incrementDelivered());
            await this.messageBroadcastRepository.update(broadcast);

            // Notify users
            await this.sendNotifications(userMessages, message);

            return {
                deliveredCount: userMessages.length,
                broadcastId: broadcast.getId().getValue(),
            };
        } catch (error) {
            this.logger.error('MessageSendingService: delivery failed', { error });
            userMessages.forEach(() => broadcast.incrementFailed());
            await this.messageBroadcastRepository.update(broadcast);
            throw error;
        }
    }

    private async sendNotifications(userMessages: any[], message: Message): Promise<void> {
        // We need sender Name.
        // For system messages, it is "System".
        // For others, we might need to fetch.
        // But for this task, mostly System messages are concern?
        // Let's retry fetching profile or just generic name.

        const senderId = message.getSenderUserId().getValue();
        let senderName = 'New Message';
        // Optimization: We could have passed sender profile to executeDelivery.
        // But let's just fetch it again or cache it? NO, clean code first.

        try {
            const senderProfile = await this.profileRepository.findByUserId(message.getSenderUserId());
            if (senderProfile) {
                senderName = senderProfile.userName.getValue();
            }
        } catch (e) {
            this.logger.warn('Failed to fetch sender profile for notification', { senderId });
        }

        const notifications = userMessages.map((um) => {
            return this.notificationService.notifyNewMessage({
                userId: um.getUserId().getValue(),
                messageId: message.getId().getValue(),
                messageType: message.getType().getValue() as any,
                subject: message.getSubject().getValue(),
                senderName: senderName,
            });
        });

        await Promise.all(notifications);
    }
}
