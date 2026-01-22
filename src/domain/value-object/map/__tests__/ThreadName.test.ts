import { ThreadName } from '../threadName';

describe('ThreadName', () => {
    it('should create valid thread name', () => {
        const name = 'Test Thread';
        const threadName = ThreadName.create(name);
        expect(threadName.getValue()).toBe(name);
    });

    // Currently validation is commented out in source code, but we can verify it accepts values
    it('should accept empty name (current behavior)', () => {
        const name = '';
        const threadName = ThreadName.create(name);
        expect(threadName.getValue()).toBe(name);
    });

    it('should accept long name (current behavior)', () => {
        const name = 'a'.repeat(100);
        const threadName = ThreadName.create(name);
        expect(threadName.getValue()).toBe(name);
    });
});
