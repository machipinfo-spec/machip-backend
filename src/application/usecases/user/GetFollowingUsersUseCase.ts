import { IFollowRepository } from '../../../domain/repositories/user/IFollowRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface FollowingUserDTO {
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string | null;
}

export class GetFollowingUsersUseCase {
    constructor(
        private followRepository: IFollowRepository,
        private profileRepository: IProfileRepository
    ) {}

    async execute(userId: string): Promise<FollowingUserDTO[]> {
        // 1. Get user IDs of people this user follows
        const followedUserIds = await this.followRepository.findFollowingByUserId(
            UserId.fromExisting(userId)
        );

        if (followedUserIds.length === 0) {
            return [];
        }

        // 2. Fetch profiles in bulk using the repository's findByUserIds method
        const profiles = await this.profileRepository.findByUserIds(followedUserIds);

        // 3. Map to the clean frontend API format
        return profiles.map((profile) => {
            const primitives = profile.toDTO();
            return {
                userId: primitives.userId,
                userName: primitives.userName,
                imageUrl: primitives.imageUrl || `${process.env.BLOB_BASE_URL}/profile/default.png`,
                introduction: primitives.introduction || null,
            };
        });
    }
}
