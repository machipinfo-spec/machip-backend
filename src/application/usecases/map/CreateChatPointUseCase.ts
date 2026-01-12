import { PointInfo } from '../../../domain/entities/map/pointInfo';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { IMapRepository } from '../../../domain/repositories/map/IMapRepository';
import { Category } from '../../../domain/value-object/map/category';
import { GeoLocation } from '../../../domain/value-object/map/geoLocation';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface CreateChatPointRequest {
    lat: number;
    lng: number;
    threadName: string;
    imageUrl?: string | null;
    userId: string;
}

export interface CreateChatPointResponse {
    pointInfo: PointInfo | null;
    error?: string;
}

export class CreateChatPointUseCase {
    constructor(
        private readonly mapRepository: IMapRepository,
        private readonly reverseGeocodingRepository: IReverseGeocodingRepository,
        private readonly messageSendingService: MessageSendingService, // Maybe needed for chat notifications too? kept for consistency
    ) {}

    async execute(request: CreateChatPointRequest): Promise<CreateChatPointResponse> {
        try {
            console.log('CreateChatPointUseCase: execute called', { ...request });

            const geoLocation = GeoLocation.create(request.lat, request.lng);
            const threadName = ThreadName.create(request.threadName);
            const category = Category.create('chat'); // Fixed category for chat
            const pointInfoId = PointInfoId.create();

            // -------------------------
            // Reverse Geocoding
            // -------------------------
            let address: string | null = null;
            try {
                const addressResult = await this.reverseGeocodingRepository.reverseGeocode(request.lat, request.lng);
                address = addressResult.formattedAddress;
            } catch (err) {
                console.warn('Reverse geocoding failed:', err);
            }

            // 1. Create PointInfo
            const pointInfo = PointInfo.create(
                geoLocation,
                category,
                address,
                null, // deletedAt
                UserId.fromExisting(request.userId), // ownerUserId
                pointInfoId,
            );

            await this.mapRepository.save(pointInfo);

            // No PointEvent creation for chat
            // No specific notification for chat point creation yet? Or maybe standard notification?
            // Assuming no "New Event" broadcast for chat points, but we could add "New Spot" notification later.

            return {
                pointInfo,
            };
        } catch (error: any) {
            console.error('CreateChatPointUseCase Error:', error);
            return {
                pointInfo: null,
                error: error.message,
            };
        }
    }
}
