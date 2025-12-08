import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// ====== S3 クライアント ======
const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

// S3 バケット名（CloudFormation と合わせる）
const BUCKET_NAME =
    process.env.IS_STG === 'true'
        ? 'tetra-images-stg'
        : 'tetra-images-poc';

export interface ThreadCreateResponse {
    thread: Thread | null;
    error?: string;
}

export class ThreadCreateUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(
        threadName: string,
        ownerUserId: string,
        parentThreadId: string | null,
        pointInfoId: string | null,
        imageBytes: Buffer | null,
        selectDate: Date | null
    ): Promise<ThreadCreateResponse> {
        const parentThread = parentThreadId 
            ? ThreadId.fromExisting(parentThreadId)
            : undefined;

        const threadId = ThreadId.create();

        let uploadedImageUrl = null;
        if(imageBytes){
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
        if(!pointInfoId){
            thread = Thread.create(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                null,
                parentThread,
                uploadedImageUrl,
                threadId
            );
        }else{
            thread = Thread.createFromMapPoint(
                ThreadName.create(threadName),
                UserId.fromExisting(ownerUserId),
                PointInfoId.fromExisting(pointInfoId),
                null,
                uploadedImageUrl
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
            }
        }

        return {
            thread,
        };
    }
}