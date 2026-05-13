import { Response } from '../../entities/timeline/response';

export interface IResponseRepository {
    save(response: Response): Promise<void>;
    findById(responseId: string): Promise<Response | null>;
    findByParentId(parentId: string, limit?: number): Promise<Response[]>;
    findByOwnerUserId(ownerUserId: string, limit?: number): Promise<Response[]>;
    delete(responseId: string): Promise<void>;
}
