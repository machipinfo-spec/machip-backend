import { PointInfo } from '../../../domain/entities/map/pointInfo';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { IMapRepository } from '../../../domain/repositories/map/IMapRepository';
import { Category } from '../../../domain/value-object/map/category';
import { GeoLocation } from '../../../domain/value-object/map/geoLocation';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// S3 バケット名（CloudFormation と合わせる）
const BUCKET_NAME = process.env.IS_STG === 'true' ? 'tetra-images-stg' : 'tetra-images-poc';

export class DeletePointinfoUseCase {
    constructor(private readonly mapRepository: IMapRepository) {}

    async execute(pointInfoId: string): Promise<void> {
        const pointInfo = await this.mapRepository.findById(pointInfoId);
        if (!pointInfo) {
            throw new Error(`PointInfo not found: ${pointInfoId}`);
        }

        await this.mapRepository.softDelete(pointInfoId);
    }
}
