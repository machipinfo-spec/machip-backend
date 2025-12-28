// domain/repositories/location/IReverseGeocodingRepository.ts

import { AddressResult } from '../../value-object/location/AddressResult';

export interface IReverseGeocodingRepository {
  reverseGeocode(lat: number, lng: number): Promise<AddressResult>;
}
