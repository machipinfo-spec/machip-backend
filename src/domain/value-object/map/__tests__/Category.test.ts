import { Category } from '../category';

describe('Category', () => {
    it('should create valid category', () => {
        const category = Category.create('General');
        expect(category.getValue()).toBe('General');
    });

    it('should throw error for empty category', () => {
        expect(() => Category.create('')).toThrow('カテゴリ名は空にできません');
        expect(() => Category.create(null as any)).toThrow('カテゴリ名は空にできません');
        expect(() => Category.create(undefined as any)).toThrow('カテゴリ名は空にできません');
    });

    it('should throw error for category exceeding max length', () => {
        const longName = 'a'.repeat(51);
        expect(() => Category.create(longName)).toThrow('カテゴリ名は50文字以内である必要があります');
    });

    it('should accept category with max length', () => {
        const maxName = 'a'.repeat(50);
        expect(Category.create(maxName).getValue()).toBe(maxName);
    });
});
