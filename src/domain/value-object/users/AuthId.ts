import { ValueObject } from '../ValueObject';

export class AuthId extends ValueObject<string> {
    protected validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error('Auth ID cannot be empty');
        }

        // 認証IDの形式によって、追加の検証ロジックを実装できます
        // 例: OAuth認証IDがプロバイダー名:IDの形式であることを確認するなど
        if (this.value.length < 5) {
            throw new Error('Auth ID must be at least 5 characters long');
        }

        // 特定の認証プロバイダーに基づく検証を追加することもできます
        // 例: Firebase Auth IDの形式検証など
        /*
    if (this.value.startsWith('firebase:') && !this.isValidFirebaseId(this.value.substring(9))) {
      throw new Error('Invalid Firebase Auth ID format');
    }
    */
    }

    // 特定の認証プロバイダーIDの検証メソッド例
    /*
  private isValidFirebaseId(id: string): boolean {
    // Firebase Auth IDのフォーマット検証
    return /^[a-zA-Z0-9]{28}$/.test(id);
  }
  */

    public static create(id: string): AuthId {
        return new AuthId(id);
    }

    // 特定の認証プロバイダー用のファクトリメソッド例
    public static createFirebaseAuthId(firebaseId: string): AuthId {
        return new AuthId(`firebase:${firebaseId}`);
    }

    public static createGoogleAuthId(googleId: string): AuthId {
        return new AuthId(`google:${googleId}`);
    }

    // 認証プロバイダーを抽出するメソッド例
    public getProvider(): string | null {
        const parts = this.value.split(':');
        if (parts.length > 1) {
            return parts[0];
        }
        return null;
    }
}
