import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface AdminUserDetailResult {
    authId: string;
    userId: string;
    name: string;
    email: string;
    imageUrl?: string;
    introduction?: string;
}

export class AdminUserDetailUseCase {
    constructor(private userRepository: IUserRepository, private profileRepository: IProfileRepository) {}

    async execute(userIdString: string): Promise<AdminUserDetailResult | null> {
        const userId = UserId.fromExisting(userIdString);
        const user = await this.userRepository.findByUserId(userId);

        if (!user) {
            return null;
        }

        const result: AdminUserDetailResult = {
            authId: user.authId.getValue(),
            userId: user.userId.getValue(),
            name: user.name.getValue(),
            email: user.email.getValue(),
            imageUrl: undefined,
            introduction: undefined,
        };

        // Fetch profile data
        const profile = await this.profileRepository.findByUserId(user.userId);
        if (profile) {
            result.name = profile.userName.getValue();
            result.imageUrl = profile.imageUrl.getValue();
            result.introduction = profile.introduction.getValue();
        }

        return result;
    }
}
