jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { User } from '../user';
import { AuthId } from '../../../value-object/users/AuthId';
import { UserId } from '../../../value-object/users/UserId';
import { UserName } from '../../../value-object/users/UserName';
import { Email } from '../../../value-object/users/Email';

describe('User Entity', () => {
    describe('create', () => {
        it('should create a new User with new UserId', () => {
            const authId = new AuthId('auth-123');
            const userName = new UserName('testuser');
            const email = new Email('test@example.com');

            const user = User.create(authId, userName, email);

            expect(user.userId).toBeInstanceOf(UserId);
            expect(user.userId.getValue()).toBe('12345678-1234-4000-8000-123456789012');
            expect(user.authId.equals(authId)).toBe(true);
            expect(user.name.equals(userName)).toBe(true);
            expect(user.email.equals(email)).toBe(true);
        });
    });

    describe('reconstitute', () => {
        it('should reconstitute a User', () => {
            const authId = new AuthId('auth-123');
            // Use a valid UUID v4
            const validUuid = '12345678-1234-4000-8000-123456789012';
            const userId = new UserId(validUuid);
            const userName = new UserName('testuser');
            const email = new Email('test@example.com');

            const user = User.reconstitute(authId, userId, userName, email);

            expect(user.authId.equals(authId)).toBe(true);
            expect(user.userId.equals(userId)).toBe(true);
            expect(user.name.equals(userName)).toBe(true);
            expect(user.email.equals(email)).toBe(true);
        });
    });

    describe('fromDTO / toDTO', () => {
        it('should convert to DTO and back', () => {
            const authIdString = 'auth-123';
            const userIdString = '12345678-1234-4000-8000-123456789012'; // Valid UUID v4
            const nameString = 'testuser';
            const emailString = 'test@example.com';

            const dto = {
                authId: authIdString,
                userId: userIdString,
                name: nameString,
                email: emailString,
            };

            const user = User.fromDTO(dto);

            expect(user.authId.getValue()).toBe(authIdString);
            expect(user.userId.getValue()).toBe(userIdString);
            expect(user.name.getValue()).toBe(nameString);
            expect(user.email.getValue()).toBe(emailString);

            const convertedDto = user.toDTO();
            expect(convertedDto).toEqual(dto);
        });
    });

    describe('changeName', () => {
        it('should return a new User with updated name', () => {
            const user = User.create(new AuthId('auth-1'), new UserName('oldname'), new Email('test@example.com'));
            const newName = new UserName('newname');

            const updatedUser = user.changeName(newName);

            expect(updatedUser.name.equals(newName)).toBe(true);
            expect(updatedUser.userId.equals(user.userId)).toBe(true); // ID remains same
            expect(updatedUser).not.toBe(user); // Immutability
        });
    });
});
