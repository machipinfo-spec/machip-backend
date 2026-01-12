import { Thread } from '../../../domain/entities/timeline/thread';
import { Profile } from '../../../domain/entities/profile/profile';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';

export interface TimelineThreadItemCommon {
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
    childThreadCount: number;
}

export interface EventContent {
    startDate: Date;
    endDate: Date;
    detail: string | null;
    url: string | null;
    imageUrl: string | null;
}

export interface ChatContent {
    imageUrl: string | null;
}

export interface TimelineThreadItemEvent extends TimelineThreadItemCommon {
    category: 'event';
    categoryContent: EventContent;
}

export interface TimelineThreadItemChat extends TimelineThreadItemCommon {
    category: 'chat';
    categoryContent: ChatContent;
}

export type TimelineThreadItem = TimelineThreadItemEvent | TimelineThreadItemChat;

export interface TimelineReadResult {
    threads: TimelineThreadItem[];
    total: number;
}

export class TimelineReadUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private pointEventRepository: IPointEventRepository,
    ) {}

    async execute(limit?: number, offset?: number): Promise<TimelineReadResult> {
        const rootThreads = await this.threadRepository.findRootThreads(limit, offset);

        const threads: TimelineThreadItem[] = await Promise.all(
            rootThreads.map(async (thread) => {
                const primitives = thread.toPrimitives();
                let ownerUserProfile: Profile | null = null;
                try {
                    ownerUserProfile = await this.profileRepository.findByUserId(
                        UserId.fromExisting(primitives.ownerUserId),
                    );
                } catch (error) {
                    console.error(`Failed to fetch profile for user ${primitives.ownerUserId}:`, error);
                }

                const common: TimelineThreadItemCommon = {
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
                    childThreadCount: primitives.childThreadIds.length,
                };

                if (primitives.mapPointInfoId) {
                    try {
                        const pointEvent = await this.pointEventRepository.findByPointInfoId(primitives.mapPointInfoId);
                        if (pointEvent) {
                            return {
                                ...common,
                                category: 'event',
                                categoryContent: {
                                    startDate: pointEvent.getStartDate(),
                                    endDate: pointEvent.getEndDate(),
                                    detail: pointEvent.getDetail(),
                                    url: pointEvent.getUrl(),
                                    imageUrl: pointEvent.getImageUrl(),
                                },
                            };
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch point event for ${primitives.mapPointInfoId}`, e);
                    }
                }

                return {
                    ...common,
                    category: 'chat',
                    categoryContent: {
                        imageUrl: primitives.imageUrl,
                    },
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
    constructor(
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private pointEventRepository: IPointEventRepository,
    ) {}

    async execute(ownerUserId: string, limit?: number, offset?: number): Promise<TimelineReadResult> {
        const userThreads = await this.threadRepository.findByOwnerUserId(ownerUserId, limit, offset);
        const rootThreads = userThreads.filter((thread) => !thread.hasParent());

        let ownerUserProfile: Profile | null = null;
        if (ownerUserId) {
            try {
                ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(ownerUserId));
            } catch (error) {
                console.error(`Failed to fetch profile for user ${ownerUserId}:`, error);
            }
        }

        const threads: TimelineThreadItem[] = await Promise.all(
            rootThreads.map(async (thread) => {
                const primitives = thread.toPrimitives();

                const common: TimelineThreadItemCommon = {
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
                    childThreadCount: primitives.childThreadIds.length,
                };

                if (primitives.mapPointInfoId) {
                    try {
                        const pointEvent = await this.pointEventRepository.findByPointInfoId(primitives.mapPointInfoId);
                        if (pointEvent) {
                            return {
                                ...common,
                                category: 'event',
                                categoryContent: {
                                    startDate: pointEvent.getStartDate(),
                                    endDate: pointEvent.getEndDate(),
                                    detail: pointEvent.getDetail(),
                                    url: pointEvent.getUrl(),
                                    imageUrl: pointEvent.getImageUrl(),
                                },
                            };
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch point event for ${primitives.mapPointInfoId}`, e);
                    }
                }

                return {
                    ...common,
                    category: 'chat',
                    categoryContent: {
                        imageUrl: primitives.imageUrl,
                    },
                };
            }),
        );

        return {
            threads,
            total: threads.length,
        };
    }
}
