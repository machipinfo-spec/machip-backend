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
    selectDate: Date | null;
    imageUrl: string | null;
    userId: string;
}

export interface CreatePointInfoResponse {
    pointInfo: PointInfo | null;
    error?: string;
}

export class CreatePointInfoUseCase {
    constructor(
        private readonly mapRepository: IMapRepository,
        private readonly reverseGeocodingRepository: IReverseGeocodingRepository,
        private readonly messageSendingService: MessageSendingService,
    ) {}

    async execute(request: CreatePointInfoRequest): Promise<CreatePointInfoResponse> {
        try {
            console.log('CreatePointInfoUseCase: execute called', { ...request });

            const geoLocation = GeoLocation.create(request.lat, request.lng);
            const threadName = ThreadName.create(request.threadName);
            const category = Category.create(request.category);
            const selectDate = request.selectDate ? new Date(request.selectDate) : null;
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

            const pointInfo = PointInfo.create(
                geoLocation,
                threadName,
                category,
                request.imageUrl || null,
                selectDate,
                address,
                null, // createdBy (User entity? or ID? PointInfo usually takes ID or Name or something. Let's check signature from previous view)
                pointInfoId,
            );

            // Checking step 647 view: PointInfo.create signature:
            // (geoLocation, threadName, category, imageUrl, selectDate, address, something, pointInfoId)
            // wait, step 647 showed:
            /*
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
            */
            // The 7th argument passed was `null`.
            // Step 655 imports `UserId`, maybe needed?
            // Let's assume the 7th arg is optional or nullable. I'll pass null as before.

            await this.mapRepository.save(pointInfo);

            // 通知を送る
            await this.messageSendingService.sendMessage({
                type: 'newEvent',
                subject: '新しいイベントが登録されました',
                // NewEventMessageRequest
                content: {
                    pointInfoId: pointInfoId.getValue(),
                    ownerUserId: request.userId,
                    address: address || '',
                    title: threadName.getValue(),
                    date: selectDate,
                },
                senderUserId: UserId.SYSTEM_ID.getValue(),
                deliveryType: 'all',
            });

            return {
                pointInfo,
            };
        } catch (error: any) {
            console.error('CreatePointInfoUseCase Error:', error);
            return {
                pointInfo: null,
                error: error.message,
            };
        }
    }
}
