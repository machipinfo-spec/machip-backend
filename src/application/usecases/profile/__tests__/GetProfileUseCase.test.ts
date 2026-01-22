jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { GetProfileUseCase } from '../GetProfileUseCase';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { Profile } from '../../../../domain/entities/profile/profile';
import { UserId } from '../../../../domain/value-object/users/UserId';

// Mock Repository
const mockProfileRepository: IProfileRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByProfileId: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIds: jest.fn(),
    softDelete: jest.fn(),
};

describe('GetProfileUseCase', () => {
    let useCase: GetProfileUseCase;
    const validUserId = '12345678-1234-4000-8000-123456789012';

    beforeEach(() => {
        useCase = new GetProfileUseCase(mockProfileRepository);
        jest.clearAllMocks();
    });

    it('should return profile if found', async () => {
        const mockProfile = {
            userId: { getValue: () => validUserId },
        } as unknown as Profile;

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile);

        const result = await useCase.execute({ userId: validUserId });

        expect(result.error).toBeUndefined();
        expect(result.profile).toBe(mockProfile);
        expect(mockProfileRepository.findByUserId).toHaveBeenCalledWith(expect.any(UserId));
    });

    it('should return null profile if not found', async () => {
        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

        const result = await useCase.execute({ userId: validUserId });

        expect(result.error).toBeUndefined();
        expect(result.profile).toBeNull();
    });

    it('should return error if userId is missing', async () => {
        const result = await useCase.execute({ userId: '' });

        expect(result.error).toBe('User ID is required');
        expect(result.profile).toBeNull();
    });
});
