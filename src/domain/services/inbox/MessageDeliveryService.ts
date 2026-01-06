import { Message } from '../../entities/inbox/Message';
import { MessageBroadcast } from '../../entities/inbox/MessageBroadcast';
import { TargetUserIds } from '../../value-object/inbox/TargetUserIds';
import { UserMessage } from '../../value-object/inbox/UserMessage';
import { UserId } from '../../value-object/users/UserId';

/**
 * メッセージ配信ドメインサービス
 */
export class MessageDeliveryService {
    /**
     * 単一ユーザーへのメッセージ配信
     */
    public static deliverToUser(message: Message, userId: UserId): UserMessage {
        return UserMessage.create(userId, message.getId());
    }

    /**
     * 複数ユーザーへのメッセージ一斉配信設定
     */
    public static createBroadcast(message: Message, targetUserIds: UserId[]): MessageBroadcast {
        const targets = TargetUserIds.create(targetUserIds);
        return MessageBroadcast.create(message.getId(), targets);
    }

    /**
     * ブロードキャストからユーザーメッセージを生成
     */
    public static generateUserMessagesFromBroadcast(broadcast: MessageBroadcast): UserMessage[] {
        const userMessages: UserMessage[] = [];
        const targetUsers = broadcast.getTargetUserIds().getUserIds();

        for (const userId of targetUsers) {
            const userMessage = UserMessage.create(userId, broadcast.getMessageId());
            userMessages.push(userMessage);
        }

        return userMessages;
    }

    /**
     * 配信進捗の更新
     */
    public static updateBroadcastProgress(
        broadcast: MessageBroadcast,
        deliveredUserIds: UserId[],
        failedUserIds: UserId[],
    ): MessageBroadcast {
        // 実際の実装では、配信結果を元にブロードキャストの進捗を更新
        const updatedBroadcast = MessageBroadcast.reconstruct(
            broadcast.getId(),
            broadcast.getMessageId(),
            broadcast.getTargetUserIds(),
            broadcast.getCreatedAt(),
            broadcast.getStatus(),
            broadcast.getDeliveredCount() + deliveredUserIds.length,
            broadcast.getFailedCount() + failedUserIds.length,
            broadcast.getCompletedAt(),
        );

        return updatedBroadcast;
    }
}
