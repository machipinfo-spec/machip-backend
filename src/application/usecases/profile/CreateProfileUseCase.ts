// application/usecases/profile/CreateUserProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../domain/value-object/profile/ProfileUrl';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';
import { UserId } from '../../../domain/value-object/users/UserId';
import { UserName } from '../../../domain/value-object/users/UserName';

export interface CreateProfileRequest {
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string;
    url: string | null;
}

export interface CreateProfileResponse {
    profile: Profile | null;
    error?: string;
}

export class CreateProfileUseCase {
    constructor(private readonly profileRepository: IProfileRepository) {}

    async execute(request: CreateProfileRequest): Promise<CreateProfileResponse> {
        try {
            if (!request.userId) {
                return { profile: null, error: 'User ID is required' };
            }
            // imageUrl is required for creation? Assuming yes based on previous code checking imageBytes.
            if (!request.imageUrl) {
                return { profile: null, error: 'Image URL is required' };
            }

            // -------------------------
            // 既存プロフィールの存在チェック
            // -------------------------
            const exists = await this.profileRepository.findByUserId(UserId.fromExisting(request.userId));
            if (exists) {
                return { profile: null, error: 'Profile already exists for this user' };
            }

            // -------------------------
            // ドメインモデル生成
            // -------------------------
            let profile: Profile;
            try {
                profile = Profile.create(
                    UserId.fromExisting(request.userId),
                    UserName.create(request.userName),
                    ImageUrl.create(request.imageUrl),
                    Introduction.create(request.introduction),
                    ProfileUrl.create(request.url),
                );
            } catch (validationError) {
                return {
                    profile: null,
                    error:
                        validationError instanceof Error
                            ? `Validation error: ${validationError.message}`
                            : 'Invalid profile data',
                };
            }

            // -------------------------
            // 永続化
            // -------------------------
            await this.profileRepository.save(profile);

            return { profile };
        } catch (error) {
            console.log('Error in CreateUserProfileUseCase:', error);
            return {
                profile: null,
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    }
}
