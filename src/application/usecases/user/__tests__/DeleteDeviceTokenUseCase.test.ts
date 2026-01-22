import { DeleteDeviceTokenUseCase } from '../DeleteDeviceTokenUseCase';
import { IDeviceTokenRepository } from '../../../../domain/repositories/user/IDeviceTokenRepository';

// Mock Repository
const mockDeviceTokenRepository: IDeviceTokenRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    findByUserId: jest.fn(),
    deleteTokens: jest.fn(),
};

describe('DeleteDeviceTokenUseCase', () => {
    let useCase: DeleteDeviceTokenUseCase;

    beforeEach(() => {
        useCase = new DeleteDeviceTokenUseCase(mockDeviceTokenRepository);
        jest.clearAllMocks();
    });

    it('should delete token', async () => {
        const token = 'token_to_delete';

        await useCase.execute(token);

        expect(mockDeviceTokenRepository.delete).toHaveBeenCalledWith(token);
        expect(mockDeviceTokenRepository.delete).toHaveBeenCalledTimes(1);
    });
});
