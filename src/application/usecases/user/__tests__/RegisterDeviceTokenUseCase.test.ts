import { RegisterDeviceTokenUseCase, RegisterDeviceTokenRequest } from '../RegisterDeviceTokenUseCase';
import { IDeviceTokenRepository } from '../../../../domain/repositories/user/IDeviceTokenRepository';
import { DeviceToken } from '../../../../domain/entities/user/DeviceToken';

// Mock Repository
const mockDeviceTokenRepository: IDeviceTokenRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    findByUserId: jest.fn(),
    deleteTokens: jest.fn(),
};

describe('RegisterDeviceTokenUseCase', () => {
    let useCase: RegisterDeviceTokenUseCase;

    beforeEach(() => {
        useCase = new RegisterDeviceTokenUseCase(mockDeviceTokenRepository);
        jest.clearAllMocks();
    });

    const request: RegisterDeviceTokenRequest = {
        userId: 'user_1',
        token: 'token_abc',
        platform: 'ios',
    };

    it('should save a new token if it does not exist', async () => {
        (mockDeviceTokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

        await useCase.execute(request);

        expect(mockDeviceTokenRepository.findByToken).toHaveBeenCalledWith(request.token);
        expect(mockDeviceTokenRepository.save).toHaveBeenCalledTimes(1);

        const savedToken = (mockDeviceTokenRepository.save as jest.Mock).mock.calls[0][0] as DeviceToken;
        expect(savedToken.getToken()).toBe(request.token);
        expect(savedToken.getUserId()).toBe(request.userId);
        expect(savedToken.getPlatform()).toBe(request.platform);
    });

    it('should update timestamp if token exists for the same user', async () => {
        const oldDate = new Date('2023-01-01T00:00:00Z');
        const existingToken = DeviceToken.reconstruct(
            request.token,
            request.userId,
            request.platform,
            oldDate,
            oldDate,
        );
        // Mock created time to be in past
        (mockDeviceTokenRepository.findByToken as jest.Mock).mockResolvedValue(existingToken);

        await useCase.execute(request);

        expect(mockDeviceTokenRepository.save).toHaveBeenCalledTimes(1);
        const savedToken = (mockDeviceTokenRepository.save as jest.Mock).mock.calls[0][0] as DeviceToken;

        // Should be same instance or equivalent with updated time
        expect(savedToken.getToken()).toBe(request.token);
        expect(savedToken.getUserId()).toBe(request.userId);
        // Logic says: updateLastUsedAt returns NEW instance
        expect(savedToken).not.toBe(existingToken);
        expect(savedToken.getLastUsedAt().getTime()).toBeGreaterThan(existingToken.getLastUsedAt().getTime());
    });

    it('should overwrite token ownership if token exists for a different user', async () => {
        const otherUserId = 'user_2';
        const existingToken = DeviceToken.create(request.token, otherUserId, request.platform);
        (mockDeviceTokenRepository.findByToken as jest.Mock).mockResolvedValue(existingToken);

        await useCase.execute(request);

        expect(mockDeviceTokenRepository.save).toHaveBeenCalledTimes(1);
        const savedToken = (mockDeviceTokenRepository.save as jest.Mock).mock.calls[0][0] as DeviceToken;

        // Should be updated to new user
        expect(savedToken.getToken()).toBe(request.token);
        expect(savedToken.getUserId()).toBe(request.userId);
    });
});
