// ImageUrl.ts
import { ValueObject } from '../ValueObject';

export class ImageUrl extends ValueObject<string> {
    protected validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error('Image URL cannot be empty');
        }

        // try {
        //     new URL(this.value);
        // } catch (error) {
        //     throw new Error('Invalid image URL format');
        // }
    }

    public static create(url: string): ImageUrl {
        return new ImageUrl(url);
    }
}
