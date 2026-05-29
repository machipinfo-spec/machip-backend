import { IFollowRepository } from '../../../domain/repositories/user/IFollowRepository';
import { UserId } from '../../../domain/value-object/users/UserId';

export class FollowUserUseCase {
    constructor(private followRepository: IFollowRepository) {}

    async execute(userId: string, targetUserId: string): Promise<void> {
        if (userId === targetUserId) {
            throw new Error('You cannot follow yourself');
        }

        await this.followRepository.save(
            UserId.fromExisting(userId),
            UserId.fromExisting(targetUserId)
        );
    }
}
