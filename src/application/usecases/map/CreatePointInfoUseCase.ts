import { PointInfo } from "../../../domain/entities/map/pointInfo";
import { IMapRepository } from "../../../domain/repositories/map/IMapRepository";
import { Category } from "../../../domain/value-object/map/category";
import { GeoLocation } from "../../../domain/value-object/map/geoLocation";
import { ThreadName } from "../../../domain/value-object/map/threadName";

export class CreatePointInfoUseCase {
    constructor(private readonly mapRepository: IMapRepository) {}

    async execute(input: CreatePointInfoUseCaseRequest): Promise<CreatePointInfoUseCaseResponse> {
        const geoLocation = GeoLocation.create(input.lat, input.lng);
        const threadName = ThreadName.create(input.threadName);
        const category = Category.create(input.category);

        const pointInfo = PointInfo.create(geoLocation, threadName, category);

        await this.mapRepository.save(pointInfo);

        return {
            id: pointInfo.getId().getValue(),
            lat: pointInfo.getGeoLocation().getLat(),
            lng: pointInfo.getGeoLocation().getLng(),
            threadName: pointInfo.getThreadName().getValue(),
            category: pointInfo.getCategory().getValue(),
        };
    }
}

export interface CreatePointInfoUseCaseRequest {
    lat: number;
    lng: number;
    threadName: string;
    category: string;
}

export interface CreatePointInfoUseCaseResponse {
    id: string;
    lat: number;
    lng: number;
    threadName: string;
    category: string;
}