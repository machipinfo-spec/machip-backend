// application/usecases/profile/GetUserProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface GetProfileRequest {
    userId: string;
}

export interface GetProfileResponse {
    profile: Profile | null;
    error?: string;
}

export class GetProfileUseCase {
    constructor(private readonly profileRepository: IProfileRepository) {}

    async execute(request: GetProfileRequest): Promise<GetProfileResponse> {
        try {
            // リクエストのバリデーション
            if (!request.userId) {
                return {
                    profile: null,
                    error: 'User ID is required',
                };
            }
            // リポジトリからプロフィールを取得
            const profile = await this.profileRepository.findByUserId(UserId.fromExisting(request.userId));

            // 結果を返す
            return {
                profile,
            };
        } catch (error) {
            console.log('Error in GetUserProfileUseCase:', error);
            return {
                profile: null,
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    }
}
