import { Thread } from '../../../domain/entities/timeline/thread';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';

export interface ThreadItemCommon {
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
    detail: string | null;
    url: string | null;
}

export interface ThreadItemEvent extends ThreadItemCommon {
    category: 'event';
    categoryContent: EventContent;
}

export interface ThreadItemChat extends ThreadItemCommon {
    category: 'chat' | string;
    categoryContent: ChatContent;
}

export type ThreadItem = ThreadItemEvent | ThreadItemChat;

export interface ThreadReadResult {
    thread: ThreadItem;
    childThreads: ThreadReadResult[];
    parentThread: ThreadItem | null;
}

export class ThreadReadUseCase {
    constructor(
        private threadRepository: IThreadRepository,
        private profileRepository: IProfileRepository,
        private pointEventRepository: IPointEventRepository,
    ) {}

    private async convertToThreadItem(thread: Thread): Promise<ThreadItem> {
        const p = thread.toPrimitives();

        let ownerUserProfile: Profile | null = null;
        try {
            ownerUserProfile = await this.profileRepository.findByUserId(UserId.fromExisting(p.ownerUserId));
        } catch (e) {
            console.error(`Failed to fetch profile for user ${p.ownerUserId}`, e);
        }

        const common: ThreadItemCommon = {
            threadId: p.id,
            threadName: p.threadName,
            createdAt: p.createdAt,
            ownerUserId: p.ownerUserId,
            ownerUserProfile: {
                userId: ownerUserProfile?.userId.getValue() || null,
                userName: ownerUserProfile?.userName.getValue() || '存在しないユーザー',
                imageUrl: ownerUserProfile?.imageUrl.getValue() || `${process.env.BLOB_BASE_URL}/profile/default.png`,
            },
            parentThreadId: p.parentThreadId,
            childThreadIds: p.childThreadIds,
            mapPointInfoId: p.mapPointInfoId,
            childThreadCount: p.childThreadIds.length,
        };

        if (p.mapPointInfoId) {
            try {
                const pointEvent = await this.pointEventRepository.findByPointInfoId(p.mapPointInfoId);
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
                console.warn(`Failed to fetch point event for ${p.mapPointInfoId}`, e);
            }
        }

        // Chat or fallback
        return {
            ...common,
            category: p.category || 'chat',
            categoryContent: {
                imageUrl: p.imageUrl,
                detail: p.detail,
                url: p.url,
            },
        };
    }

    async execute(threadId: string, includeChildren: boolean = true): Promise<ThreadReadResult | null> {
        const thread = await this.threadRepository.findById(threadId);
        if (!thread) return null;

        const primitives = thread.toPrimitives();

        const [childThreads, parentThread] = await Promise.all([
            includeChildren ? this.threadRepository.findByParentThreadId(threadId) : Promise.resolve([]),
            primitives.parentThreadId
                ? this.threadRepository.findById(primitives.parentThreadId)
                : Promise.resolve(null),
        ]);

        const threadItem = await this.convertToThreadItem(thread);

        const childThreadResults = includeChildren
            ? await Promise.all(childThreads.map(async (ct) => this.execute(ct.toPrimitives().id, true)))
            : [];

        return {
            thread: threadItem,
            childThreads: childThreadResults.filter((x): x is ThreadReadResult => x !== null),
            parentThread: parentThread ? await this.convertToThreadItem(parentThread) : null,
        };
    }

    async executeFlat(threadId: string): Promise<ThreadReadResult | null> {
        const thread = await this.threadRepository.findById(threadId);
        if (!thread) return null;

        const primitives = thread.toPrimitives();

        const [childThreads, parentThread] = await Promise.all([
            this.threadRepository.findByParentThreadId(threadId),
            primitives.parentThreadId
                ? this.threadRepository.findById(primitives.parentThreadId)
                : Promise.resolve(null),
        ]);

        const threadItem = await this.convertToThreadItem(thread);

        const childThreadResults: ThreadReadResult[] = await Promise.all(
            childThreads.map(async (child) => ({
                thread: await this.convertToThreadItem(child),
                childThreads: [],
                parentThread: threadItem,
            })),
        );

        return {
            thread: threadItem,
            childThreads: childThreadResults,
            parentThread: parentThread ? await this.convertToThreadItem(parentThread) : null,
        };
    }
}

export class ThreadReadByOwnerUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(ownerUserId: string, limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findByOwnerUserId(ownerUserId, limit);
    }
}

export class ThreadReadRootUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findRootThreads(limit);
    }
}

export class ThreadReadChildrenUseCase {
    constructor(private threadRepository: IThreadRepository) {}

    async execute(parentThreadId: string, limit?: number): Promise<Thread[]> {
        return await this.threadRepository.findByParentThreadId(parentThreadId, limit);
    }
}
