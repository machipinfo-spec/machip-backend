import { PointInfo } from '../../../domain/entities/map/pointInfo';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { IMapRepository } from '../../../domain/repositories/map/IMapRepository';
import { Category } from '../../../domain/value-object/map/category';
import { GeoLocation } from '../../../domain/value-object/map/geoLocation';
import { PointInfoId } from '../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../domain/value-object/map/threadName';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';
import { UserId } from '../../../domain/value-object/users/UserId';

export interface CreatePointInfoRequest {
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    // selectDate removed
    startDate: Date | null;
    endDate: Date | null;
    detail: string | null;
    url: string | null;
    imageUrl: string | null;
    userId: string;
}

export interface CreatePointInfoResponse {
    pointInfo: PointInfo | null;
    pointEvent?: PointEvent | null;
    error?: string;
}

import { IPointEventRepository } from '../../../domain/repositories/map/IPointEventRepository';
import { PointEvent } from '../../../domain/entities/map/PointEvent';

export class CreatePointInfoUseCase {
    constructor(
        private readonly mapRepository: IMapRepository,
        private readonly pointEventRepository: IPointEventRepository,
        private readonly reverseGeocodingRepository: IReverseGeocodingRepository,
        private readonly messageSendingService: MessageSendingService,
    ) {}

    async execute(request: CreatePointInfoRequest): Promise<CreatePointInfoResponse> {
        try {
            console.log('CreatePointInfoUseCase: execute called', { ...request });

            const geoLocation = GeoLocation.create(request.lat, request.lng);
            const threadName = ThreadName.create(request.threadName);
            const category = Category.create(request.category);
            const pointInfoId = PointInfoId.create();

            // -------------------------
            // 逆ジオコーディング
            // -------------------------
            let address: string | null = null;
            try {
                const addressResult = await this.reverseGeocodingRepository.reverseGeocode(request.lat, request.lng);
                address = addressResult.formattedAddress;
            } catch (err) {
                console.warn('Reverse geocoding failed:', err);
                // 住所取得失敗しても Point 作成は継続
            }

            // 1. PointInfo作成 (ロケーション情報)
            const pointInfo = PointInfo.create(
                geoLocation,
                category,
                address,
                null, // deletedAt
                UserId.fromExisting(request.userId),
                pointInfoId,
            );

            await this.mapRepository.save(pointInfo);

            // 2. PointEvent作成 (イベント情報がある場合)
            let pointEvent: PointEvent | null = null;
            if (category.getValue() === 'event') {
                if (!request.startDate || !request.endDate) {
                    throw new Error('Event requires startDate and endDate');
                }
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                pointEvent = PointEvent.create(
                    pointInfoId,
                    threadName,
                    request.imageUrl || null,
                    startDate,
                    endDate,
                    request.detail || null,
                    request.url || null,
                );
                await this.pointEventRepository.save(pointEvent);

                await this.messageSendingService.sendMessage({
                    type: 'newEvent',
                    subject: '新しいイベントが登録されました',
                    // NewEventMessageRequest
                    content: {
                        pointInfoId: pointEvent.getId().getValue(),
                        ownerUserId: request.userId,
                        address: address || '',
                        title: threadName.getValue(),
                        date: startDate, // Use startDate instead of selectDate
                        detail: request.detail,
                        url: request.url,
                        period:
                            startDate && endDate ? `${startDate.toISOString()} ~ ${endDate.toISOString()}` : undefined, // 簡易フォーマット
                    },
                    senderUserId: UserId.SYSTEM_ID.getValue(),
                    deliveryType: 'all',
                });
            }

            return {
                pointInfo,
                pointEvent,
            };
        } catch (error: any) {
            console.error('CreatePointInfoUseCase Error:', error);
            return {
                pointInfo: null,
                pointEvent: null,
                error: error.message,
            };
        }
    }
}
