import { Thread } from '../../../domain/entities/timeline/thread';
import { Profile } from '../../../domain/entities/profile/profile';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';

export interface TimelineThreadItem {
    threadId: string;
    threadName: string;
    createdAt: Date;
    ownerUserId: string;
    ownerUserProfile: {
        userId: string | null;
        userName: string | null;
        imageUrl: string | null;
    };
    parentThreadId: string | null;
    childThreadIds: string[];
    mapPointInfoId: string | null;
    imageUrl: string | null;
    selectDate: Date | null;
    childThreadCount: number;
    address: string | null;
}

export interface TimelineReadResult {
    threads: TimelineThreadItem[];
    total: number;
}

export class TimelineReadUseCase {
    constructor(private threadRepository: IThreadRepository, private profileRepository: IProfileRepository) {}

    async execute(limit?: number, offset?: number): Promise<TimelineReadResult> {
        // トップレベル(ルート)スレッドを取得
        const rootThreads = await this.threadRepository.findRootThreads(limit, offset);

        // TimelineThreadItem形式に変換(プロフィール情報を並行取得)
        const threads: TimelineThreadItem[] = await Promise.all(
            rootThreads.map(async (thread) => {
                const primitives = thread.toPrimitives();
                // オーナーのプロフィール情報を取得
                let ownerUserProfile: Profile | null = null;
                try {
                    ownerUserProfile = await this.profileRepository.findByUserId(
                        UserId.fromExisting(primitives.ownerUserId),
                    );
                } catch (error) {
                    console.error(`Failed to fetch profile for user ${primitives.ownerUserId}:`, error);
                }

                return {
                    threadId: primitives.id,
                    threadName: primitives.threadName,
                    createdAt: primitives.createdAt,
                    ownerUserId: primitives.ownerUserId,
                    ownerUserProfile: {
                        userId: ownerUserProfile?.userId.getValue() || null,
                        userName: ownerUserProfile?.userName.getValue() || '存在しないユーザー',
                        imageUrl:
                            ownerUserProfile?.imageUrl.getValue() || `${process.env.BLOB_BASE_URL}/profile/default.png`,
                    },
                    parentThreadId: primitives.parentThreadId,
                    childThreadIds: primitives.childThreadIds,
                    mapPointInfoId: primitives.mapPointInfoId,
                    imageUrl: primitives.imageUrl,
                    selectDate: primitives.selectDate,
                    childThreadCount: primitives.childThreadIds.length,
                    address: primitives.address,
                };
            }),
        );

        return {
            threads,
            total: threads.length,
        };
    }
}

export class TimelineReadByUserUseCase {
    constructor(private threadRepository: IThreadRepository, private profileRepository: IProfileRepository) {}

    async execute(ownerUserId: string, limit?: number, offset?: number): Promise<TimelineReadResult> {
        // 指定ユーザーのスレッドを取得
        const userThreads = await this.threadRepository.findByOwnerUserId(ownerUserId, limit, offset);

        // トップレベルのスレッドのみをフィルタリング
        const rootThreads = userThreads.filter((thread) => !thread.hasParent());

        // オーナーのプロフィール情報を一度だけ取得(全スレッドで同じユーザー)
        let ownerUserProfile: Profile | null = null;
        if (ownerUserId) {
            try {
                ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(ownerUserId));
            } catch (error) {
                console.error(`Failed to fetch profile for user ${ownerUserId}:`, error);
            }
        }

        // TimelineThreadItem形式に変換
        const threads: TimelineThreadItem[] = rootThreads.map((thread) => {
            const primitives = thread.toPrimitives();
            return {
                threadId: primitives.id,
                threadName: primitives.threadName,
                createdAt: primitives.createdAt,
                ownerUserId: primitives.ownerUserId,
                ownerUserProfile: {
                    userId: ownerUserProfile?.userId.getValue() || null,
                    userName: ownerUserProfile?.userName.getValue() || '存在しないユーザー',
                    imageUrl:
                        ownerUserProfile?.imageUrl.getValue() || `${process.env.BLOB_BASE_URL}/profile/default.png`,
                },
                parentThreadId: primitives.parentThreadId,
                childThreadIds: primitives.childThreadIds,
                mapPointInfoId: primitives.mapPointInfoId,
                imageUrl: primitives.imageUrl,
                selectDate: primitives.selectDate,
                childThreadCount: primitives.childThreadIds.length,
                address: primitives.address,
            };
        });

        return {
            threads,
            total: threads.length,
        };
    }
}
