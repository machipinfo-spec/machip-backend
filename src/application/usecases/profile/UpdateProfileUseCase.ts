// application/usecases/profile/UpdateProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { UserId } from '../../../domain/value-object/users/UserId';
import { UserName } from '../../../domain/value-object/users/UserName';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { ProfileUrl } from '../../../domain/value-object/profile/ProfileUrl';

export interface UpdateProfileRequest {
    userId: string;
    userName?: string;
    imageUrl?: string;
    introduction?: string;
    url: string | null;
}

export interface UpdateProfileResponse {
    profile: Profile | null;
    error?: string;
}

export class UpdateProfileUseCase {
    constructor(private readonly profileRepository: IProfileRepository) {}

    async execute(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
        try {
            const profile = await this.profileRepository.findByUserId(UserId.fromExisting(request.userId));
            if (!profile) {
                return { profile: null, error: 'Profile not found' };
            }

            let userName = profile.userName;
            let introduction = profile.introduction;
            let imageUrl = profile.imageUrl;

            if (request.userName) {
                userName = UserName.create(request.userName);
            }
            if (request.introduction) {
                introduction = Introduction.create(request.introduction);
            }

            if (request.imageUrl) {
                // If Frontend sends full S3/CDN URL, simple creates ImageUrl
                imageUrl = ImageUrl.create(request.imageUrl);
            }

            const updatedProfile = Profile.reconstitute(
                profile.profileId,
                profile.userId,
                userName,
                imageUrl,
                introduction,
                ProfileUrl.create(request.url),
            );

            await this.profileRepository.update(updatedProfile);

            return { profile: updatedProfile };
        } catch (error: any) {
            console.error('UpdateProfileUseCase error:', error);
            return {
                profile: null,
                error: error.message ?? 'Unknown error',
            };
        }
    }
}
