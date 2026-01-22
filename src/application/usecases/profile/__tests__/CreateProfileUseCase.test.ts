jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { CreateProfileUseCase } from '../CreateProfileUseCase';
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

describe('CreateProfileUseCase', () => {
    let useCase: CreateProfileUseCase;

    beforeEach(() => {
        useCase = new CreateProfileUseCase(mockProfileRepository);
        jest.clearAllMocks();
    });

    const validUserId = '12345678-1234-4000-8000-123456789012';

    it('should create profile successfully', async () => {
        const request = {
            userId: validUserId,
            userName: 'Test User',
            imageUrl: 'http://example.com/img.jpg',
            introduction: 'Hello',
            url: 'http://example.com',
        };

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);
        (mockProfileRepository.save as jest.Mock).mockResolvedValue(undefined);

        const result = await useCase.execute(request);

        expect(result.error).toBeUndefined();
        expect(result.profile).toBeInstanceOf(Profile);
        expect(result.profile?.userName.getValue()).toBe('Test User');
        expect(mockProfileRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return error if profile already exists', async () => {
        const request = {
            userId: validUserId,
            userName: 'Test User',
            imageUrl: 'http://example.com/img.jpg',
            introduction: 'Hello',
            url: 'http://example.com',
        };

        const existingProfile = {
            userId: { getValue: () => validUserId },
        } as unknown as Profile;

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(existingProfile);

        const result = await useCase.execute(request);

        expect(result.error).toBe('Profile already exists for this user');
        expect(result.profile).toBeNull();
        expect(mockProfileRepository.save).not.toHaveBeenCalled();
    });

    it('should return error if input is invalid', async () => {
        // Missing userName or invalid format might throw validation error in ValueObject
        const request = {
            userId: validUserId,
            userName: '', // Invalid empty name
            imageUrl: 'http://example.com/img.jpg',
            introduction: 'Hello',
            url: 'http://example.com',
        };

        (mockProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

        // Validation error is caught inside UseCase and returned as error string
        const result = await useCase.execute(request);

        expect(result.profile).toBeNull();
        // Expect validation specific error message, ValueObj throws usually
        expect(result.error).toContain('Validation error');
    });
});
