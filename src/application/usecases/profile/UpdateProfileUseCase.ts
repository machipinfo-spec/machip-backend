// application/usecases/profile/UpdateProfileUseCase.ts

import { Profile } from '../../../domain/entities/profile/profile';
import { UserId } from '../../../domain/value-object/users/UserId';
import { UserName } from '../../../domain/value-object/users/UserName';
import { Introduction } from '../../../domain/value-object/profile/Introduction';
import { ImageUrl } from '../../../domain/value-object/users/ImageUrl';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository.ts';

export interface UpdateProfileRequest {
    userId: string;
    userName?: string;
    imageBytes?: Buffer;
    introduction?: string;
}

export interface UpdateProfileResponse {
    profile: Profile | null;
    error?: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

const BUCKET_NAME =
    process.env.IS_STG === 'true'
        ? 'tetra-images-stg'
        : 'tetra-images-poc';

export class UpdateProfileUseCase {
    constructor(private readonly profileRepository: IProfileRepository) {}

    async execute(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
        try {
            const profile = await this.profileRepository.findByUserId(UserId.fromExisting(request.userId));
            if(!profile){
                return { profile: null, error: "Profile not found" };
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
                const imageKey = `profile/${request.userId}.png`;

                try {
                    await s3.send(
                        new PutObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: imageKey,
                            Body: request.imageBytes,
                            ContentType: "image/png"
                        })
                    );
                } catch (err) {
                    console.error("S3 upload failed:", err);
                    return {
                        profile: null,
                        error: "Failed to upload profile image"
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
                introduction
            );

            await this.profileRepository.update(updatedProfile);

            return { profile: updatedProfile };

        } catch (error: any) {
            console.error("UpdateProfileUseCase error:", error);
            return {
                profile: null,
                error: error.message ?? "Unknown error"
            };
        }
    }
}
