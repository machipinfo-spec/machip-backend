import { ValueObject } from '../ValueObject';

export type BroadcastStatusValue = 'pending' | 'processing' | 'completed' | 'failed';

export class BroadcastStatus extends ValueObject<BroadcastStatusValue> {
    protected validate(): void {
        const validStatuses: ReadonlyArray<BroadcastStatusValue> = ['pending', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(this.value)) {
            throw new Error(`Invalid broadcast status: ${this.value}. Must be one of: ${validStatuses.join(', ')}`);
        }
    }

    constructor(status: BroadcastStatusValue) {
        super(status);
        Object.freeze(this);
    }

    public static pending(): BroadcastStatus {
        return new BroadcastStatus('pending');
    }

    public static processing(): BroadcastStatus {
        return new BroadcastStatus('processing');
    }

    public static completed(): BroadcastStatus {
        return new BroadcastStatus('completed');
    }

    public static failed(): BroadcastStatus {
        return new BroadcastStatus('failed');
    }

    public isPending(): boolean {
        return this.value === 'pending';
    }

    public isProcessing(): boolean {
        return this.value === 'processing';
    }

    public isCompleted(): boolean {
        return this.value === 'completed';
    }

    public isFailed(): boolean {
        return this.value === 'failed';
    }

    public isFinished(): boolean {
        return this.isCompleted() || this.isFailed();
    }

    // イミュータブルな状態遷移メソッド
    public toProcessing(): BroadcastStatus {
        if (!this.isPending()) {
            throw new Error('Can only transition to processing from pending state');
        }
        return new BroadcastStatus('processing');
    }

    public toCompleted(): BroadcastStatus {
        if (!this.isProcessing()) {
            throw new Error('Can only transition to completed from processing state');
        }
        return new BroadcastStatus('completed');
    }

    public toFailed(): BroadcastStatus {
        if (this.isCompleted()) {
            throw new Error('Cannot transition to failed from completed state');
        }
        return new BroadcastStatus('failed');
    }
    public static fromString(status: string): BroadcastStatus {
        const validStatuses: BroadcastStatusValue[] = ['pending', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(status as BroadcastStatusValue)) {
            throw new Error(`Invalid broadcast status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
        }
        return new BroadcastStatus(status as BroadcastStatusValue);
    }
}
