import { ImageUrl } from '../ImageUrl';

describe('ImageUrl', () => {
    it('should create valid image URL', () => {
        const url = 'https://example.com/image.png';
        const imageUrl = ImageUrl.create(url);
        expect(imageUrl.getValue()).toBe(url);
    });

    it('should throw error for empty URL', () => {
        expect(() => ImageUrl.create('')).toThrow('Image URL cannot be empty');
        expect(() => ImageUrl.create('   ')).toThrow('Image URL cannot be empty');
    });

    it('should throw error for null/undefined (runtime check)', () => {
        expect(() => ImageUrl.create(null as any)).toThrow('Image URL cannot be empty');
        expect(() => ImageUrl.create(undefined as any)).toThrow('Image URL cannot be empty');
    });
});
