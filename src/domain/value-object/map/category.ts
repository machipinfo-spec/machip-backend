import { ValueObject } from '../ValueObject';

export class Category extends ValueObject<string> {
    constructor(value: string) {
        super(value);
        Object.freeze(this);
    }

    protected validate(): void {
        if (this.value === null || this.value === undefined || this.value === '') {
            throw new Error('カテゴリ名は空にできません');
        }

        if (this.value.length > 50) {
            throw new Error('カテゴリ名は50文字以内である必要があります');
        }
    }

    public static create(value: string): Category {
        return new Category(value);
    }
}
