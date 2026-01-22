jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { Thread } from '../thread';
import { ThreadId } from '../../../value-object/timeline/threadId';
import { ThreadName } from '../../../value-object/map/threadName';
import { UserId } from '../../../value-object/users/UserId';
import { PointInfoId } from '../../../value-object/map/pointInfoId';

describe('Thread Entity', () => {
    const validUserId = '12345678-1234-4000-8000-123456789012';
    const validThreadId = '12345678-1234-4000-8000-123456789012';
    const validPointId = '12345678-1234-4000-8000-123456789012';

    describe('create', () => {
        it('should create a new Thread', () => {
            const userId = new UserId(validUserId);
            const name = ThreadName.create('Test Thread');

            const thread = Thread.create(name, userId, 'img.jpg', null, null);

            expect(thread).toBeInstanceOf(Thread);
            expect(thread.getThreadId().getValue()).toBe(validThreadId);
            expect(thread.getOwnerUserId().equals(userId)).toBe(true);
            expect(thread.getImageUrl()).toBe('img.jpg');
            expect(thread.hasParent()).toBe(false);
        });

        it('should create a child Thread', () => {
            const userId = new UserId(validUserId);
            const name = ThreadName.create('Child Thread');
            const parentId = ThreadId.fromExisting('87654321-4321-4000-8000-210987654321');

            const thread = Thread.create(name, userId, null, parentId, null);

            expect(thread.hasParent()).toBe(true);
            expect(thread.getParentThreadId()?.equals(parentId)).toBe(true);
        });
    });

    describe('createFromMapPoint', () => {
        it('should create a thread associated with a map point', () => {
            const userId = new UserId(validUserId);
            const name = ThreadName.create('Map Thread');
            const pointId = PointInfoId.fromExisting(validPointId);

            const thread = Thread.createFromMapPoint(name, userId, pointId, null, null);

            expect(thread.toPrimitives().mapPointInfoId).toBe(validPointId);
        });
    });

    describe('Child Thread Management', () => {
        it('should add child thread immutably', () => {
            const thread = Thread.create(ThreadName.create('Parent'), new UserId(validUserId), null, null, null);

            const childId = ThreadId.fromExisting('87654321-4321-4000-8000-210987654321');
            const updated = thread.addChildThread(childId);

            expect(updated).not.toBe(thread);
            expect(thread.hasChildren()).toBe(false);
            expect(updated.hasChildren()).toBe(true);
            expect(updated.getChildThreadIds()[0].equals(childId)).toBe(true);
        });

        it('should remove child thread', () => {
            const parent = Thread.create(ThreadName.create('Parent'), new UserId(validUserId), null, null, null);
            const childId = ThreadId.fromExisting('87654321-4321-4000-8000-210987654321');
            const withChild = parent.addChildThread(childId);

            const removed = withChild.removeChildThread(childId);

            expect(removed.hasChildren()).toBe(false);
        });
    });

    describe('toPrimitives', () => {
        it('should return correct DTO', () => {
            const thread = Thread.create(ThreadName.create('DTO Test'), new UserId(validUserId), 'img.jpg', null, null);

            const dto = thread.toPrimitives();

            expect(dto.id).toBe(validThreadId);
            expect(dto.threadName).toBe('DTO Test');
            expect(dto.ownerUserId).toBe(validUserId);
            expect(dto.imageUrl).toBe('img.jpg');
            expect(dto.createdAt).toBeInstanceOf(Date);
        });
    });
});
