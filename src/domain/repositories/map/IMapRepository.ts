import { PointInfo } from '../../entities/map/pointInfo';

export interface IMapRepository {
    save(pointInfo: PointInfo): Promise<void>;
    findById(pointInfoId: string): Promise<PointInfo | null>;
    findByThreadName(threadName: string, limit?: number): Promise<PointInfo[]>;
    findByCategory(category: string, limit?: number): Promise<PointInfo[]>;
    findAll(limit?: number): Promise<PointInfo[]>;
}