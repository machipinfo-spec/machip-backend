import { ValueObject } from '../ValueObject';

export interface NewEventMessageData {
    pointInfoId: string;
    ownerUserId: string;
    address: string;
    title: string;
    date: Date | null;
}

export class NewEventMessageContent extends ValueObject<NewEventMessageData> {
    protected validate(): void {
        if (!this.value.pointInfoId || this.value.pointInfoId.trim().length === 0) {
            throw new Error('Point info ID cannot be empty');
        }
        if (!this.value.ownerUserId || this.value.ownerUserId.trim().length === 0) {
            throw new Error('Owner user ID cannot be empty');
        }
        if (!this.value.address || this.value.address.trim().length === 0) {
            throw new Error('Address cannot be empty');
        }
    }

    constructor(data: NewEventMessageData) {
        super(data);
        Object.freeze(this);
    }

    public static create(
        pointInfoId: string,
        ownerUserId: string,
        address: string,
        title: string,
        date: Date | null,
    ): NewEventMessageContent {
        return new NewEventMessageContent({
            pointInfoId,
            ownerUserId,
            address,
            title,
            date,
        });
    }

    public static fromJSON(json: string): NewEventMessageContent {
        try {
            const data = JSON.parse(json) as NewEventMessageData;
            return new NewEventMessageContent(data);
        } catch (error) {
            throw new Error(`Failed to parse NewEventMessageContent from JSON: ${error}`);
        }
    }

    public static fromObject(data: NewEventMessageData): NewEventMessageContent {
        return new NewEventMessageContent(data);
    }

    public toJSON(): string {
        return JSON.stringify(this.value);
    }

    public getPointInfoId(): string {
        return this.value.pointInfoId;
    }

    public getOwnerUserId(): string {
        return this.value.ownerUserId;
    }

    public getAddress(): string {
        return this.value.address;
    }

    public getTitle(): string {
        return this.value.title;
    }
}
