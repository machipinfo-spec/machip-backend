import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';
import { MimeTypeHelper } from '../../../shared/mimeTypeHelper';
import { IContentModerationQueue } from '../../../domain/repositories/queue/IContentModerationQueue';

// ====== S3 クライアント ======
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// S3 バケット名（CloudFormation と合わせる）
const BUCKET_NAME = process.env.IS_STG === 'true' ? 'tetra-images-stg' : 'tetra-images-poc';

export interface ThreadItem {
    threadId: string;
    threadName: string;
    createdAt: Date;
    ownerUserId: string;
    ownerUserProfile: {
        userId: string;
        userName: string;
        imageUrl: string;
    };
    parentThreadId: string | null;
    childThreadIds: string[];
    mapPointInfoId: string | null;
    imageUrl: string | null;
    childThreadCount: number;
}

export interface ThreadCreateResponse {
    thread: ThreadItem | null;
    error?: string;
}

export class ThreadCreateUseCase {
    constructor(
        private readonly threadRepository: IThreadRepository,
        private readonly profileRepository: IProfileRepository,
        private readonly messageSendingService: MessageSendingService,
        private readonly contentModerationQueue: IContentModerationQueue,
    ) {}
    private async convertToThreadItem(thread: Thread): Promise<ThreadItem> {
        const p = thread.toPrimitives();

        let ownerUserProfile: Profile | null = null;
        try {
            ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(p.ownerUserId));
        } catch (e) {
            console.error(`Failed to fetch profile for user ${p.ownerUserId}`, e);
        }

        return {
            threadId: p.id,
            threadName: p.threadName,
            createdAt: p.createdAt,
            ownerUserId: p.ownerUserId,
            ownerUserProfile: {
                userId: ownerUserProfile!.userId.getValue(),
                userName: ownerUserProfile!.userName.getValue(),
                imageUrl: ownerUserProfile!.imageUrl.getValue(),
            },
            parentThreadId: p.parentThreadId,
            childThreadIds: p.childThreadIds,
            mapPointInfoId: p.mapPointInfoId,
            imageUrl: p.imageUrl,
            childThreadCount: p.childThreadIds.length,
        };
    }

    async execute(
        threadName: string,
        ownerUserId: string,
        pointInfoId: string | null,
        imageUrl: string | null,
        parentThreadId: string | null,
    ): Promise<ThreadCreateResponse> {
        console.log('ThreadCreateUseCase: execute called', {
            threadName,
            ownerUserId,
            pointInfoId,
            imageUrl,
            parentThreadId,
        });

        const parentThread = parentThreadId ? ThreadId.fromExisting(parentThreadId) : null;

        let thread;
        if (!pointInfoId) {
            thread = Thread.create(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                imageUrl,
                parentThread,
                null,
            );
        } else {
            thread = Thread.createFromMapPoint(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                PointInfoId.fromExisting(pointInfoId),
                imageUrl,
                null,
            );
        }

        // ... saving logic ...
        await this.threadRepository.save(thread);
        console.log('ThreadCreateUseCase: Thread saved', thread.getThreadId().getValue());

        // 親スレッドが存在する場合、親スレッドの子リストに追加
        if (parentThreadId) {
            const parent = await this.threadRepository.findById(parentThreadId);
            if (parent) {
                const threadId = ThreadId.fromExisting(thread.toPrimitives().id);
                const updatedParent = parent.addChildThread(threadId);
                await this.threadRepository.save(updatedParent);

                // Get reply user profile
                const replyUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(ownerUserId));

                await this.messageSendingService.sendMessage({
                    type: 'reply',
                    subject: '返信があります',
                    content: {
                        ownerThreadId: parent.toPrimitives().id,
                        threadId: thread.toPrimitives().id,
                        content: `${threadName}`,
                        replyUserId: ownerUserId,
                        replyUserName: replyUserProfile?.userName.getValue() || 'Unknown User',
                    },
                    senderUserId: ownerUserId,
                    deliveryType: 'single',
                    targetUserIds: [parent.getOwnerUserId().getValue()],
                });
            }
        }

        // Send to Content Moderation Queue (Async)
        try {
            await this.contentModerationQueue.sendMessage({
                targetType: 'thread', // Treats both root threads and replies (child threads) as 'thread'
                targetId: thread.getThreadId().getValue(),
                ownerUserId: ownerUserId,
                content: threadName,
                imageUrls: imageUrl ? [imageUrl] : [],
            });
            console.log('ThreadCreateUseCase: Sent to moderation queue');
        } catch (e) {
            console.error('ThreadCreateUseCase: Failed to send to moderation queue', e);
            // Non-blocking error
        }

        const threadItem = await this.convertToThreadItem(thread);

        return {
            thread: threadItem,
        };
    }
}
