// Email.ts
import { ValueObject } from '../ValueObject';

export class Email extends ValueObject<string> {
    protected validate(): void {
        if (!this.isValid(this.value)) {
            throw new Error('Invalid email format');
        }
    }

    private isValid(email: string): boolean {
        // より詳細なメールアドレス検証正規表現
        // RFC 5322に準拠した簡易版
        const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!email || email.trim().length === 0) {
            return false;
        }

        if (email.length > 254) {
            return false;
        }

        return emailRegex.test(email);
    }

    // ドメイン情報を抽出するメソッド
    public getDomain(): string {
        const parts = this.value.split('@');
        return parts[1];
    }

    // ローカル部分を抽出するメソッド
    public getLocalPart(): string {
        const parts = this.value.split('@');
        return parts[0];
    }

    // ファクトリメソッド
    public static create(email: string): Email {
        return new Email(email);
    }

    // 特定ドメイン用の検証メソッド
    public isBusinessEmail(): boolean {
        const domain = this.getDomain();
        const nonBusinessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
        return !nonBusinessDomains.includes(domain);
    }

    // メールをアスタリスクでマスクするメソッド
    public mask(): string {
        const localPart = this.getLocalPart();
        const domain = this.getDomain();

        if (localPart.length <= 2) {
            return `${localPart[0]}*@${domain}`;
        }

        return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
    }
}
