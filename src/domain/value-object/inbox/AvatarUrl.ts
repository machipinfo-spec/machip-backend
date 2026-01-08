import { ValueObject } from '../ValueObject';

export class AvatarUrl extends ValueObject<string | null> {
    protected validate(): void {
        if (this.value !== null) {
            // 簡単なURL形式の検証
            try {
                new URL(this.value);
            } catch {
                // 相対パスも許可
                if (!this.value.startsWith('/') && !this.value.startsWith('./')) {
                    throw new Error('Invalid avatar URL format');
                }
            }
        }
    }

    constructor(url: string | null) {
        // プリミティブ値または null の場合はそのまま使用（不変）
        super(url);
        Object.freeze(this);
    }

    public static create(url: string | null): AvatarUrl {
        return new AvatarUrl(url);
    }

    public static empty(): AvatarUrl {
        return new AvatarUrl(null);
    }

    public hasAvatar(): boolean {
        return this.value !== null && this.value.length > 0;
    }

    // イミュータブルな更新メソッド
    public withUrl(url: string | null): AvatarUrl {
        return new AvatarUrl(url);
    }

    public clear(): AvatarUrl {
        return new AvatarUrl(null);
    }
}
