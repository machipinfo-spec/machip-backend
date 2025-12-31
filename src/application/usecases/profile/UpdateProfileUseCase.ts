// application/usecases/profile/UpdateProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { UserId } from '../../../domain/value-object/users/UserId';
import { UserName } from '../../../domain/value-object/users/UserName';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand, // ✅ 正しいコマンド
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';
import { ProfileUrl } from '../../../domain/value-object/profile/ProfileUrl';

export interface UpdateProfileRequest {
    userId: string;
    userName?: string;
    imageBytes: Buffer | null;
    introduction?: string;
    url: string | null;
}

export interface UpdateProfileResponse {
    profile: Profile | null;
    error?: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.IS_STG === 'true' ? 'tetra-images-stg' : 'tetra-images-poc';

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

            if (request.imageBytes) {
                // ユニークなファイル名を生成（キャッシュバスティング）
                const timestamp = Date.now();
                const imageKey = `profile/${request.userId}-${timestamp}.png`;

                try {
                    // ✅ 新しい画像をアップロード
                    await s3.send(
                        new PutObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: imageKey,
                            Body: request.imageBytes,
                            ContentType: 'image/png',
                            CacheControl: 'public, max-age=31536000',
                        }),
                    );

                    // ✅ 古い画像を削除（存在する場合のみ）
                    const oldImageUrl = profile.imageUrl.getValue();
                    if (oldImageUrl) {
                        await this.deleteOldProfileImage(oldImageUrl);
                    }
                } catch (err) {
                    console.error('S3 upload failed:', err);
                    return {
                        profile: null,
                        error: 'Failed to upload profile image',
                    };
                }

                const uploadedImageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`;
                imageUrl = ImageUrl.create(uploadedImageUrl);
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

    /**
     * ✅ 古いプロフィール画像を削除
     */
    private async deleteOldProfileImage(oldImageUrl: string): Promise<void> {
        try {
            // URLからS3キーを抽出
            // 例: https://tetra-images-poc.s3.amazonaws.com/profile/userId-123456.png
            //  → profile/userId-123456.png
            const match = oldImageUrl.match(/\.com\/(.+)$/);
            if (!match) {
                console.warn('Could not extract S3 key from URL:', oldImageUrl);
                return;
            }

            const oldKey = match[1];

            // ✅ オブジェクト（ファイル）を削除
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: oldKey,
                }),
            );
        } catch (err) {
            // 削除失敗はログだけ残して続行（画像が既に削除されている可能性もある）
            console.warn('Failed to delete old profile image:', err);
        }
    }
}
