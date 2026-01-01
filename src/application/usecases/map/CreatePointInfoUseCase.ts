import { PointInfo } from '../../../domain/entities/map/pointInfo';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { IMapRepository } from '../../../domain/repositories/map/IMapRepository';
import { Category } from '../../../domain/value-object/map/category';
import { GeoLocation } from '../../../domain/value-object/map/geoLocation';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ====== S3 クライアント ======
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// S3 バケット名（CloudFormation と合わせる）
const BUCKET_NAME = process.env.IS_STG === 'true' ? 'tetra-images-stg' : 'tetra-images-poc';

export class CreatePointInfoUseCase {
    constructor(
        private readonly mapRepository: IMapRepository,
        private readonly reverseGeocodingRepository: IReverseGeocodingRepository,
    ) {}

    async execute(input: CreatePointInfoUseCaseRequest): Promise<CreatePointInfoUseCaseResponse> {
        const geoLocation = GeoLocation.create(input.lat, input.lng);
        const threadName = ThreadName.create(input.threadName);
        const category = Category.create(input.category);
        const selectDate = input.selectDate ? new Date(input.selectDate) : null;
        const pointInfoId = PointInfoId.create();
        // -------------------------
        // 逆ジオコーディング
        // -------------------------
        let address: string | null = null;
        try {
            const addressResult = await this.reverseGeocodingRepository.reverseGeocode(input.lat, input.lng);
            address = addressResult.formattedAddress;
        } catch (err) {
            console.warn('Reverse geocoding failed:', err);
            // 住所取得失敗しても Point 作成は継続
        }
        // -------------------------
        // S3 に画像アップロード
        // -------------------------
        let uploadedImageUrl;
        if (input.imageBuffer) {
            const imageKey = `map/${pointInfoId.getValue()}.png`;
            const putParams = {
                Bucket: BUCKET_NAME,
                Key: imageKey,
                Body: input.imageBuffer,
                ContentType: 'image/png',
            };

            try {
                await s3.send(new PutObjectCommand(putParams));
            } catch (err) {
                console.error('Failed to upload profile image to S3:', err);
                return {
                    pointInfo: null,
                    error: 'Failed to upload profile image',
                };
            }
            uploadedImageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`;
        }

        const pointInfo = PointInfo.create(
            geoLocation,
            threadName,
            category,
            uploadedImageUrl || null,
            selectDate,
            address,
            null,
            pointInfoId,
        );

        await this.mapRepository.save(pointInfo);

        return {
            pointInfo,
        };
    }
}

export interface CreatePointInfoUseCaseRequest {
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    selectDate: Date | null;
    imageBuffer: Buffer | null;
}

// export interface CreatePointInfoUseCaseResponse {
//     id: string;
//     lat: number;
//     lng: number;
//     threadName: string;
//     category: string;
//     selectDate: Date | null;
//     imageBuffer: Buffer | null;
// }

export interface CreatePointInfoUseCaseResponse {
    pointInfo: PointInfo | null;
    error?: string;
}
