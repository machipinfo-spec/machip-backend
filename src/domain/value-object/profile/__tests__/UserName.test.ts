import { UserName } from '../UserName';

describe('UserName', () => {
    it('should create valid user name', () => {
        const name = 'John Doe';
        const userName = UserName.create(name);
        expect(userName.getValue()).toBe(name);
    });

    it('should throw error for empty user name', () => {
        expect(() => UserName.create('')).toThrow('User name cannot be empty');
        expect(() => UserName.create('   ')).toThrow('User name cannot be empty');
    });

    it('should throw error for user name exceeding max length', () => {
        const longName = 'a'.repeat(101);
        expect(() => UserName.create(longName)).toThrow('User name is too long (maximum 100 characters)');
    });

    it('should accept user name with max length', () => {
        const maxName = 'a'.repeat(100);
        expect(UserName.create(maxName).getValue()).toBe(maxName);
    });
});
