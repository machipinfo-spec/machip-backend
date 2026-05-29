import { IFollowRepository } from '../../../domain/repositories/user/IFollowRepository';
import { UserId } from '../../../domain/value-object/users/UserId';

export class UnfollowUserUseCase {
    constructor(private followRepository: IFollowRepository) {}

    async execute(userId: string, targetUserId: string): Promise<void> {
        await this.followRepository.delete(
            UserId.fromExisting(userId),
            UserId.fromExisting(targetUserId)
        );
    }
}
