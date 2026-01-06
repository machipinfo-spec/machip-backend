import { ValueObject } from '../ValueObject';

export class MessageContent extends ValueObject<string> {
    protected validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error('Message content cannot be empty');
        }
        // if (this.value.length > 10000) {
        //     throw new Error('Message content cannot exceed 10,000 characters');
        // }
    }

    constructor(content: string) {
        const trimmedContent = content.trim(); // プリミティブ値の正規化
        super(trimmedContent);
        Object.freeze(this);
    }

    public static create(content: string): MessageContent {
        return new MessageContent(content);
    }

    public getPreview(maxLength = 100): string {
        const cleanContent = this.value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }
        return cleanContent.substring(0, maxLength).trim() + '...';
    }

    // イミュータブルな更新メソッド
    public withContent(content: string): MessageContent {
        return new MessageContent(content);
    }

    public appendText(text: string): MessageContent {
        return new MessageContent(this.value + text);
    }

    public prependText(text: string): MessageContent {
        return new MessageContent(text + this.value);
    }

    public replaceText(searchValue: string | RegExp, replaceValue: string): MessageContent {
        return new MessageContent(this.value.replace(searchValue, replaceValue));
    }

    // 便利メソッド
    public getWordCount(): number {
        return this.value.trim().split(/\s+/).length;
    }

    public getCharacterCount(): number {
        return this.value.length;
    }

    public hasText(searchText: string): boolean {
        return this.value.includes(searchText);
    }
}
