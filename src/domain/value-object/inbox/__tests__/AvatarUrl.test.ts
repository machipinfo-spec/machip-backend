import { AvatarUrl } from '../AvatarUrl';

describe('AvatarUrl', () => {
    it('should create valid URL', () => {
        const url = 'https://example.com/avatar.png';
        expect(new AvatarUrl(url).getValue()).toBe(url);
    });

    it('should create valid relative URL', () => {
        expect(new AvatarUrl('/images/avatar.png').getValue()).toBe('/images/avatar.png');
        expect(new AvatarUrl('./avatar.png').getValue()).toBe('./avatar.png');
    });

    it('should throw error for invalid URL format', () => {
        expect(() => new AvatarUrl('invalid-url')).toThrow('Invalid avatar URL format');
    });

    it('should create empty (null)', () => {
        const empty = AvatarUrl.empty();
        expect(empty.getValue()).toBeNull();
        expect(empty.hasAvatar()).toBe(false);
    });

    it('should check if has avatar', () => {
        const url = new AvatarUrl('https://example.com/avatar.png');
        expect(url.hasAvatar()).toBe(true);
        expect(new AvatarUrl(null).hasAvatar()).toBe(false);

        // Let's check validation logic:
        // if (this.value !== null) { try new URL } catch { check startsWith / or ./ }
        // '' startsWith / is false. So '' throws error.
    });

    it('should clear avatar', () => {
        const url = new AvatarUrl('https://example.com/avatar.png');
        const cleared = url.clear();
        expect(cleared.hasAvatar()).toBe(false);
        expect(url.hasAvatar()).toBe(true); // Immutable
    });

    it('should update with new URL', () => {
        const url = new AvatarUrl('https://example.com/old.png');
        const updated = url.withUrl('https://example.com/new.png');
        expect(updated.getValue()).toBe('https://example.com/new.png');
    });
});
