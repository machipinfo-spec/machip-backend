import { AuthId } from '../AuthId';

describe('AuthId', () => {
    it('should create valid AuthId', () => {
        const id = 'google:12345';
        const authId = AuthId.create(id);
        expect(authId.getValue()).toBe(id);
    });

    it('should throw error for empty AuthId', () => {
        expect(() => AuthId.create('')).toThrow('Auth ID cannot be empty');
        expect(() => AuthId.create('   ')).toThrow('Auth ID cannot be empty');
    });

    it('should throw error for short AuthId', () => {
        expect(() => AuthId.create('1234')).toThrow('Auth ID must be at least 5 characters long');
    });

    it('should create specific provider IDs', () => {
        const firebaseId = '1234567890abcdef1234567890abcdef';
        const authId = AuthId.createFirebaseAuthId(firebaseId);
        expect(authId.getValue()).toBe(`firebase:${firebaseId}`);
        expect(authId.getProvider()).toBe('firebase');

        const googleId = '1234567890';
        const googleAuthId = AuthId.createGoogleAuthId(googleId);
        expect(googleAuthId.getValue()).toBe(`google:${googleId}`);
        expect(googleAuthId.getProvider()).toBe('google');
    });

    it('should return null provider for simple IDs', () => {
        const authId = AuthId.create('simpleid');
        expect(authId.getProvider()).toBeNull();
    });
});
