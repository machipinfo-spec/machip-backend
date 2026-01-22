import { ProfileUrl } from '../ProfileUrl';

describe('ProfileUrl', () => {
    it('should create valid profile URL', () => {
        const url = 'https://example.com/profile';
        const profileUrl = ProfileUrl.create(url);
        expect(profileUrl.getValue()).toBe(url);
    });

    it('should create with null', () => {
        const profileUrl = ProfileUrl.create(null);
        expect(profileUrl.getValue()).toBeNull();
    });

    // Validation is currently commented out in source, so we verify current permissive behavior
    it('should accept empty string if validation is disabled', () => {
        const profileUrl = ProfileUrl.create('');
        // If validation logic was active, this might differ, but currently checking it doesn't crash
        expect(profileUrl.getValue()).toBe('');
    });
});
