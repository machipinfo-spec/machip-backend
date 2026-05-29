import { BookmarkThreadUseCase } from '../BookmarkThreadUseCase';
import { UnbookmarkThreadUseCase } from '../UnbookmarkThreadUseCase';
import { GetBookmarkedThreadsUseCase } from '../GetBookmarkedThreadsUseCase';
import { FollowUserUseCase } from '../FollowUserUseCase';
import { UnfollowUserUseCase } from '../UnfollowUserUseCase';
import { GetFollowingUsersUseCase } from '../GetFollowingUsersUseCase';

import { IBookmarkRepository } from '../../../../domain/repositories/user/IBookmarkRepository';
import { IFollowRepository } from '../../../../domain/repositories/user/IFollowRepository';
import { IThreadRepository } from '../../../../domain/repositories/timeline/IThreadRepository';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { IPointEventRepository } from '../../../../domain/repositories/map/IPointEventRepository';

import { Thread } from '../../../../domain/entities/timeline/thread';
import { Profile } from '../../../../domain/entities/profile/profile';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { UserId } from '../../../../domain/value-object/users/UserId';

// Mock Repositories
const mockBookmarkRepository: IBookmarkRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
};

const mockFollowRepository: IFollowRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findFollowingByUserId: jest.fn(),
};

const mockThreadRepository: IThreadRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByOwnerUserId: jest.fn(),
    findByParentThreadId: jest.fn(),
    findRootThreads: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    findBySelectDateRange: jest.fn(),
    findByMapPointInfoId: jest.fn(),
    findByMapPointInfoIds: jest.fn(),
} as any;

const mockProfileRepository: IProfileRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProfileId: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIds: jest.fn(),
    softDelete: jest.fn(),
};

const mockPointEventRepository: IPointEventRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findByPointInfoId: jest.fn(),
    findByPointInfoIds: jest.fn(),
} as any;

describe('User Actions Use Cases', () => {
    const user1 = '11111111-1111-4000-8000-111111111111';
    const user2 = '22222222-2222-4000-8000-222222222222';
    const thread1 = '33333333-3333-4000-8000-333333333333';
    const profile2 = '44444444-4444-4000-8000-444444444444';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Bookmarks', () => {
        it('should bookmark a thread successfully', async () => {
            const useCase = new BookmarkThreadUseCase(mockBookmarkRepository);
            await useCase.execute(user1, thread1);

            expect(mockBookmarkRepository.save).toHaveBeenCalledTimes(1);
            expect(mockBookmarkRepository.save).toHaveBeenCalledWith(
                expect.any(UserId),
                expect.any(ThreadId)
            );
        });

        it('should unbookmark a thread successfully', async () => {
            const useCase = new UnbookmarkThreadUseCase(mockBookmarkRepository);
            await useCase.execute(user1, thread1);

            expect(mockBookmarkRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockBookmarkRepository.delete).toHaveBeenCalledWith(
                expect.any(UserId),
                expect.any(ThreadId)
            );
        });

        it('should retrieve bookmarked threads with profiles', async () => {
            const useCase = new GetBookmarkedThreadsUseCase(
                mockBookmarkRepository,
                mockThreadRepository,
                mockProfileRepository,
                mockPointEventRepository
            );

            const mockThread = {
                toPrimitives: () => ({
                    id: thread1,
                    threadName: 'Test Thread',
                    createdAt: new Date('2023-01-01'),
                    ownerUserId: user2,
                    parentThreadId: null,
                    childThreadIds: [],
                    mapPointInfoId: null,
                    imageUrl: null,
                }),
            } as unknown as Thread;

            const mockProfile = {
                userId: { getValue: () => user2 },
                userName: { getValue: () => 'Owner' },
                imageUrl: { getValue: () => 'avatar.png' },
            } as unknown as Profile;

            (mockBookmarkRepository.findByUserId as jest.Mock).mockResolvedValue([
                ThreadId.fromExisting(thread1),
            ]);
            (mockThreadRepository.findById as jest.Mock).mockResolvedValue(mockThread);
            (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

            const result = await useCase.execute(user1);

            expect(result.threads).toHaveLength(1);
            expect(result.threads[0].threadName).toBe('Test Thread');
            expect(result.threads[0].ownerUserProfile.userName).toBe('Owner');
        });
    });

    describe('Follows', () => {
        it('should follow a user successfully', async () => {
            const useCase = new FollowUserUseCase(mockFollowRepository);
            await useCase.execute(user1, user2);

            expect(mockFollowRepository.save).toHaveBeenCalledTimes(1);
            expect(mockFollowRepository.save).toHaveBeenCalledWith(
                expect.any(UserId),
                expect.any(UserId)
            );
        });

        it('should throw an error when trying to follow oneself', async () => {
            const useCase = new FollowUserUseCase(mockFollowRepository);
            await expect(useCase.execute(user1, user1)).rejects.toThrow(
                'You cannot follow yourself'
            );
        });

        it('should unfollow a user successfully', async () => {
            const useCase = new UnfollowUserUseCase(mockFollowRepository);
            await useCase.execute(user1, user2);

            expect(mockFollowRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockFollowRepository.delete).toHaveBeenCalledWith(
                expect.any(UserId),
                expect.any(UserId)
            );
        });

        it('should retrieve following users profiles', async () => {
            const useCase = new GetFollowingUsersUseCase(mockFollowRepository, mockProfileRepository);

            const mockProfile = {
                toDTO: () => ({
                    profileId: profile2,
                    userId: user2,
                    userName: 'User Two',
                    imageUrl: 'user2.png',
                    introduction: 'Hello world',
                    url: null,
                }),
            } as unknown as Profile;

            (mockFollowRepository.findFollowingByUserId as jest.Mock).mockResolvedValue([
                UserId.fromExisting(user2),
            ]);
            (mockProfileRepository.findByUserIds as jest.Mock).mockResolvedValue([mockProfile]);

            const result = await useCase.execute(user1);

            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe(user2);
            expect(result[0].userName).toBe('User Two');
            expect(result[0].introduction).toBe('Hello world');
        });
    });
});
