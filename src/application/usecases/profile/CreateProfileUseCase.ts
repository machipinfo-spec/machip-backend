// application/usecases/profile/CreateUserProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../domain/value-object/profile/ProfileUrl';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';
import { UserId } from '../../../domain/value-object/users/UserId';
import { UserName } from '../../../domain/value-object/users/UserName';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ====== 修正：imageBytes を受け取るリクエスト構造 ======
export interface CreateProfileRequest {
    userId: string;
    userName: string;
    imageBytes: Buffer;
    introduction: string;
    url: string | null;
}

export interface CreateProfileResponse {
    profile: Profile | null;
    error?: string;
}

// ====== S3 クライアント ======
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// S3 バケット名（CloudFormation と合わせる）
const BUCKET_NAME = process.env.IS_STG === 'true' ? 'tetra-images-stg' : 'tetra-images-poc';

export class CreateProfileUseCase {
    constructor(private readonly profileRepository: IProfileRepository) {}

    async execute(request: CreateProfileRequest): Promise<CreateProfileResponse> {
        try {
            if (!request.userId) {
                return { profile: null, error: 'User ID is required' };
            }
            if (!request.imageBytes) {
                return { profile: null, error: 'Image data is required' };
            }

            // -------------------------
            // 既存プロフィールの存在チェック
            // -------------------------
            const exists = await this.profileRepository.findByUserId(UserId.fromExisting(request.userId));
            if (exists) {
                return { profile: null, error: 'Profile already exists for this user' };
            }

            // -------------------------
            // S3 に画像アップロード
            // -------------------------

            const imageKey = `profile/${request.userId}.png`;

            const putParams = {
                Bucket: BUCKET_NAME,
                Key: imageKey,
                Body: request.imageBytes,
                ContentType: 'image/png',
            };

            try {
                await s3.send(new PutObjectCommand(putParams));
            } catch (err) {
                console.error('Failed to upload profile image to S3:', err);
                return {
                    profile: null,
                    error: 'Failed to upload profile image',
                };
            }

            // CloudFront を後で使うならここを書き換えればOK
            const uploadedImageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`;

            // -------------------------
            // ドメインモデル生成
            // -------------------------
            let profile: Profile;
            try {
                profile = Profile.create(
                    UserId.fromExisting(request.userId),
                    UserName.create(request.userName),
                    ImageUrl.create(uploadedImageUrl),
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
