import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';

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
    selectDate: Date | null;
    childThreadCount: number;
    address: string | null;
}

export interface ThreadCreateResponse {
    thread: ThreadItem | null;
    error?: string;
}

export class ThreadCreateUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private readonly messageSendingService: MessageSendingService,
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
            selectDate: p.selectDate,
            childThreadCount: p.childThreadIds.length,
            address: p.address,
        };
    }

    async execute(
        threadName: string,
        ownerUserId: string,
        parentThreadId: string | null,
        pointInfoId: string | null,
        imageBytes: Buffer | null,
        selectDate: Date | null,
        address: string | null,
    ): Promise<ThreadCreateResponse> {
        const parentThread = parentThreadId ? ThreadId.fromExisting(parentThreadId) : null;

        const threadId = ThreadId.create();
        let uploadedImageUrl = null;
        if (imageBytes) {
            // -------------------------
            // S3 に画像アップロード
            // -------------------------

            const imageKey = `thread/${threadId.getValue()}.png`;

            const putParams = {
                Bucket: BUCKET_NAME,
                Key: imageKey,
                Body: imageBytes,
                ContentType: 'image/png',
            };

            try {
                await s3.send(new PutObjectCommand(putParams));
            } catch (err) {
                console.error('Failed to upload profile image to S3:', err);
                return {
                    thread: null,
                    error: 'Failed to upload profile image',
                };
            }
            uploadedImageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`;
        }

        let thread;
        if (!pointInfoId) {
            thread = Thread.create(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                selectDate,
                null,
                uploadedImageUrl,
                parentThread,
                threadId,
            );
        } else {
            thread = Thread.createFromMapPoint(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                PointInfoId.fromExisting(pointInfoId),
                selectDate,
                address,
                uploadedImageUrl,
                // ThreadIdもPointInfoIdも存在する場合は既存のThreadIdを使う
                ThreadId.fromExisting(pointInfoId),
            );
        }
        await this.threadRepository.save(thread);

        // 親スレッドが存在する場合、親スレッドの子リストに追加
        if (parentThreadId) {
            const parent = await this.threadRepository.findById(parentThreadId);
            if (parent) {
                const threadId = ThreadId.fromExisting(thread.toPrimitives().id);
                const updatedParent = parent.addChildThread(threadId);
                await this.threadRepository.save(updatedParent);
                await this.messageSendingService.sendMessage({
                    type: 'reply',
                    subject: '返信があります',
                    content: `返信がつきました: ${threadName}`,
                    senderUserId: UserId.SYSTEM_ID.getValue(),
                    deliveryType: 'single',
                    targetUserIds: [parent.getOwnerUserId().getValue()],
                });
            }
        }
        const threadItem = await this.convertToThreadItem(thread);

        return {
            thread: threadItem,
        };
    }
}
