jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { CreateUserUseCase } from '../CreateUserUseCase';
import { IUserRepository } from '../../../../domain/repositories/user/IUserRepository';
import { User } from '../../../../domain/entities/user/user';
import { AuthId } from '../../../../domain/value-object/users/AuthId';

// Mock Repository
const mockUserRepository: IUserRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByAuthId: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
};

describe('CreateUserUseCase', () => {
    let useCase: CreateUserUseCase;

    beforeEach(() => {
        useCase = new CreateUserUseCase(mockUserRepository);
        jest.clearAllMocks();
    });

    it('should create a new user if not exists', async () => {
        const authId = 'auth-new';
        const name = 'New User';
        const email = 'new@example.com';

        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue(null);

        const user = await useCase.execute(authId, name, email);

        expect(mockUserRepository.findByAuthId).toHaveBeenCalledWith(expect.any(AuthId));
        expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
        expect(user).toBeInstanceOf(User);
        expect(user.authId.getValue()).toBe(authId);
        expect(user.name.getValue()).toBe(name);
        expect(user.email.getValue()).toBe(email);
        expect(user.userId.getValue()).toBe('12345678-1234-4000-8000-123456789012'); // Mocked UUID
    });

    it('should throw error if user already exists', async () => {
        const authId = 'auth-existing';
        const name = 'Existing User';
        const email = 'existing@example.com';

        // Mock existing user
        const existingUser = User.create(
            new AuthId(authId),
            { create: () => ({ value: 'name' }) } as any, // Simple mock for brevity or real object
            { create: () => ({ value: 'email' }) } as any,
        );

        // Actually better to return something truthy than full mock if repository just checks existence?
        // But findByAuthId returns User | null.
        // Let's rely on repository mock returning a truthy value (like {})
        // But strict typing? promise<User | null>
        // We can just return {} as any
        (mockUserRepository.findByAuthId as jest.Mock).mockResolvedValue({} as User);

        await expect(useCase.execute(authId, name, email)).rejects.toThrow('User already exists');

        expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
});
