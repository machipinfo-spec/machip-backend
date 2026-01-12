import { PointInfo } from '../../../domain/entities/map/pointInfo';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { IMapRepository } from '../../../domain/repositories/map/IMapRepository';
import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';
import { Category } from '../../../domain/value-object/map/category';
import { GeoLocation } from '../../../domain/value-object/map/geoLocation';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { PointEvent } from '../../../domain/entities/map/PointEvent';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface CreateEventPointRequest {
    lat: number;
    lng: number;
    threadName: string;
    startDate: Date;
    endDate: Date;
    detail?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    userId: string;
}

export interface CreateEventPointResponse {
    pointInfo: PointInfo | null;
    pointEvent: PointEvent | null;
    error?: string;
}

export class CreateEventPointUseCase {
    constructor(
        private readonly mapRepository: IMapRepository,
        private readonly pointEventRepository: IPointEventRepository,
        private readonly reverseGeocodingRepository: IReverseGeocodingRepository,
        private readonly messageSendingService: MessageSendingService,
    ) {}

    async execute(request: CreateEventPointRequest): Promise<CreateEventPointResponse> {
        try {
            console.log('CreateEventPointUseCase: execute called', { ...request });

            const geoLocation = GeoLocation.create(request.lat, request.lng);
            const threadName = ThreadName.create(request.threadName);
            const category = Category.create('event'); // Fixed category for events
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

            // 1. Create PointInfo (Location)
            const pointInfo = PointInfo.create(
                geoLocation,
                category,
                address,
                null, // deletedAt
                UserId.fromExisting(request.userId),
                pointInfoId,
            );

            await this.mapRepository.save(pointInfo);

            // 2. Create PointEvent
            const pointEvent = PointEvent.create(
                pointInfoId,
                threadName,
                request.imageUrl || null,
                request.startDate,
                request.endDate,
                request.detail || null,
                request.url || null,
            );
            await this.pointEventRepository.save(pointEvent);

            // Send notification
            await this.messageSendingService.sendMessage({
                type: 'newEvent',
                subject: '新しいイベントが登録されました',
                content: {
                    pointInfoId: pointInfoId.getValue(),
                    ownerUserId: request.userId,
                    address: address || '',
                    title: threadName.getValue(),
                    date: request.startDate,
                    detail: request.detail,
                    url: request.url,
                    period: `${request.startDate.toISOString()} ~ ${request.endDate.toISOString()}`,
                },
                senderUserId: UserId.SYSTEM_ID.getValue(),
                deliveryType: 'all',
            });

            return {
                pointInfo,
                pointEvent,
            };
        } catch (error: any) {
            console.error('CreateEventPointUseCase Error:', error);
            return {
                pointInfo: null,
                pointEvent: null,
                error: error.message,
            };
        }
    }
}
