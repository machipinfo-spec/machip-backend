import { PointEvent } from '../../entities/map/PointEvent';

export interface IPointEventRepository {
    save(pointEvent: PointEvent): Promise<void>;
    findByPointInfoId(pointInfoId: string): Promise<PointEvent | null>;
    findByThreadName(threadName: string): Promise<PointEvent[]>;
    findByDateRange(start: Date, end: Date, limit: number): Promise<PointEvent[]>;
}
