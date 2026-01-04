import { IUserRepository } from '../../../domain/repositories/user/IUserRepository';
import { IIDRepository } from '../../../domain/repositories/user/IIDRepository';
import { AuthId } from '../../../domain/value-object/users/AuthId';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';

export class DeleteUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private profileRepository: IProfileRepository,
        private idRepository: IIDRepository,
    ) {}

    async execute(authIdString: string): Promise<void> {
        const authId = new AuthId(authIdString);

        // ユーザーが存在するか確認
        const user = await this.userRepository.findByAuthId(authId);
        if (!user) {
            throw new Error('User not found');
        }

        const profile = await this.profileRepository.findByUserId(user.userId);
        if (!profile) {
            throw new Error('Profile not found');
        }

        // DBから削除（メールアドレスが含まれるため物理削除）
        await this.userRepository.delete(user);

        // profileの論理削除
        await this.profileRepository.softDelete(profile.profileId);

        // Cognitoから削除
        await this.idRepository.delete(authId);
    }
}
