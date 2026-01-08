import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class UserMessageId extends IdValueObject<string> {
    constructor(id: string) {
        super(id);
        Object.freeze(this);
    }

    public static create(): UserMessageId {
        return new UserMessageId(uuidv4());
    }

    public static fromExisting(id: string): UserMessageId {
        return new UserMessageId(id);
    }

    // イミュータブルな更新メソッド（通常IDは変更しないが、必要に応じて）
    public regenerate(): UserMessageId {
        return new UserMessageId(uuidv4());
    }
}
