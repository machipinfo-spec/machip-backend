import { BroadcastStatus } from '../BroadcastStatus';

describe('BroadcastStatus', () => {
    it('should create valid statuses', () => {
        expect(new BroadcastStatus('pending').getValue()).toBe('pending');
        expect(new BroadcastStatus('processing').getValue()).toBe('processing');
        expect(new BroadcastStatus('completed').getValue()).toBe('completed');
        expect(new BroadcastStatus('failed').getValue()).toBe('failed');
    });

    it('should throw error for invalid status', () => {
        expect(() => new BroadcastStatus('invalid' as any)).toThrow('Invalid broadcast status');
    });

    it('should create via factory methods', () => {
        expect(BroadcastStatus.pending().getValue()).toBe('pending');
        expect(BroadcastStatus.processing().getValue()).toBe('processing');
        expect(BroadcastStatus.completed().getValue()).toBe('completed');
        expect(BroadcastStatus.failed().getValue()).toBe('failed');
    });

    it('should create from string', () => {
        expect(BroadcastStatus.fromString('pending').getValue()).toBe('pending');
        expect(() => BroadcastStatus.fromString('invalid')).toThrow('Invalid broadcast status');
    });

    it('should check status correctly', () => {
        const pending = BroadcastStatus.pending();
        expect(pending.isPending()).toBe(true);
        expect(pending.isProcessing()).toBe(false);
        expect(pending.isFinished()).toBe(false);

        const completed = BroadcastStatus.completed();
        expect(completed.isCompleted()).toBe(true);
        expect(completed.isFinished()).toBe(true);

        const failed = BroadcastStatus.failed();
        expect(failed.isFailed()).toBe(true);
        expect(failed.isFinished()).toBe(true);
    });

    describe('State Transitions', () => {
        it('should transition from pending to processing', () => {
            const status = BroadcastStatus.pending();
            const processing = status.toProcessing();
            expect(processing.isProcessing()).toBe(true);
        });

        it('should throw when transitioning to processing from non-pending', () => {
            const status = BroadcastStatus.completed();
            expect(() => status.toProcessing()).toThrow('Can only transition to processing from pending state');
        });

        it('should transition from processing to completed', () => {
            const status = BroadcastStatus.processing();
            const completed = status.toCompleted();
            expect(completed.isCompleted()).toBe(true);
        });

        it('should throw when transitioning to completed from non-processing', () => {
            const status = BroadcastStatus.pending();
            expect(() => status.toCompleted()).toThrow('Can only transition to completed from processing state');
        });

        it('should transition to failed from not completed', () => {
            const pending = BroadcastStatus.pending();
            expect(pending.toFailed().isFailed()).toBe(true);

            const processing = BroadcastStatus.processing();
            expect(processing.toFailed().isFailed()).toBe(true);
        });

        it('should throw when transitioning to failed from completed', () => {
            const completed = BroadcastStatus.completed();
            expect(() => completed.toFailed()).toThrow('Cannot transition to failed from completed state');
        });
    });
});
