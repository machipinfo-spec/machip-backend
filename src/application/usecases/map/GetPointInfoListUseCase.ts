import { PointInfo } from "../../../domain/entities/map/pointInfo";
import { IMapRepository } from "../../../domain/repositories/map/IMapRepository";

export class GetPointInfoListUseCase {
    constructor(private readonly mapRepository: IMapRepository) {}

    async execute(input: GetPointInfoListUseCaseRquest): Promise<GetPointInfoListUseCaseResponse[]> {
        let points: PointInfo[];

        if (input.threadName) {
            points = await this.mapRepository.findByThreadName(input.threadName, input.limit);
        } else if (input.category) {
            points = await this.mapRepository.findByCategory(input.category, input.limit);
        } else {
            points = await this.mapRepository.findAll(input.limit);
        }

        return points.map((point) => ({
            id: point.getId().getValue(),
            lat: point.getGeoLocation().getLat(),
            lng: point.getGeoLocation().getLng(),
            threadName: point.getThreadName().getValue(),
            category: point.getCategory().getValue(),
            imageUrl: point.toPrimitives().imageUrl,
            selectDate: point.toPrimitives().selectDate,
        }));
    }
}

export interface GetPointInfoListUseCaseRquest {
    threadName?: string;
    category?: string;
    limit?: number;
}

export interface GetPointInfoListUseCaseResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
    imageUrl: string | null;
    selectDate: Date | null;
}