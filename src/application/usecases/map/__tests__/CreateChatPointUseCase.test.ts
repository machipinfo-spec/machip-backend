jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { CreateChatPointUseCase } from '../CreateChatPointUseCase';
import { IMapRepository } from '../../../../domain/repositories/map/IMapRepository';
import { IReverseGeocodingRepository } from '../../../../domain/repositories/location/IReverseGeocodingRepository';
import { MessageSendingService } from '../../services/inbox/MessageSendingService';
import { PointInfo } from '../../../../domain/entities/map/pointInfo';

// Mock Dependencies
const mockMapRepository: IMapRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByBox: jest.fn(),
    delete: jest.fn(),
} as any;

const mockReverseGeocodingRepository: IReverseGeocodingRepository = {
    reverseGeocode: jest.fn(),
} as any;

const mockMessageSendingService = {} as unknown as MessageSendingService;

describe('CreateChatPointUseCase', () => {
    let useCase: CreateChatPointUseCase;
    const validUserId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        useCase = new CreateChatPointUseCase(
            mockMapRepository,
            mockReverseGeocodingRepository,
            mockMessageSendingService,
        );
        jest.clearAllMocks();
    });

    it('should create chat point successfully with address', async () => {
        (mockReverseGeocodingRepository.reverseGeocode as jest.Mock).mockResolvedValue({
            formattedAddress: 'Tokyo, Japan',
        });

        const request = {
            lat: 35.6895,
            lng: 139.6917,
            threadName: 'Chat Spot',
            userId: validUserId,
        };

        const result = await useCase.execute(request);

        expect(result.error).toBeUndefined();
        expect(result.pointInfo).toBeInstanceOf(PointInfo);
        expect(result.pointInfo?.getAddress()).toBe('Tokyo, Japan');
        expect(result.pointInfo?.getCategory().getValue()).toBe('chat');
        expect(mockMapRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create chat point even if geocoding fails', async () => {
        (mockReverseGeocodingRepository.reverseGeocode as jest.Mock).mockRejectedValue(new Error('Geo Error'));

        const request = {
            lat: 35.6895,
            lng: 139.6917,
            threadName: 'Chat Spot',
            userId: validUserId,
        };

        const result = await useCase.execute(request);

        expect(result.error).toBeUndefined();
        expect(result.pointInfo).not.toBeNull();
        expect(result.pointInfo?.getAddress()).toBeNull();
        expect(mockMapRepository.save).toHaveBeenCalledTimes(1);
    });
});
