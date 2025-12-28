// infrastructure/repositories/location/ReverseGeocodingRepository.ts

import { GoogleAuth } from 'google-auth-library';
import { IReverseGeocodingRepository } from '../../../domain/repositories/location/IReverseGeocodingRepository';
import { AddressResult } from '../../../domain/value-object/location/AddressResult';
import { ParameterStoreManager } from '../../utils/parameterStoreManager';

const region = process.env.AWS_REGION || 'ap-northeast-1';
const parameterManager = new ParameterStoreManager(region);

export class ReverseGeocodingRepository
  implements IReverseGeocodingRepository
{
  private authClient: GoogleAuth | undefined;

  constructor() {
    // 同期コンストラクタ
  }
  private async getApiKey(): Promise<string> {
    const apiKey = await parameterManager.getParameter(
      '/tetra/google/maps/api-key'
    );

    if (!apiKey) {
      throw new Error('Google Maps API key not set');
    }

    return apiKey;
  }


  // private async getGoogleCredentials() {
  //   const googleCredentialsJson =
  //     await parameterManager.getParameter('/tetra/google/credential');

  //   if (!googleCredentialsJson) {
  //     throw new Error('Google credentials not set');
  //   }

  //   return JSON.parse(googleCredentialsJson);
  // }

  // private async initialize() {
  //   if (this.authClient) return;

  //   const credentials = await this.getGoogleCredentials();
  //   this.authClient = new GoogleAuth({
  //     credentials,
  //     scopes: ['https://www.googleapis.com/auth/maps-platform'],
  //   });
  // }

  async reverseGeocode(lat: number, lng: number): Promise<AddressResult> {
    const apiKey = await this.getApiKey();

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}&language=ja&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const json = await response.json();

    if (!json.results || json.results.length === 0) {
      throw new Error('No address found for given coordinates');
    }

    const result = json.results[0];
    const components = result.address_components as Array<{
      long_name: string;
      types: string[];
    }>;

    const find = (type: string) =>
      components.find(c => c.types.includes(type))?.long_name;

    console.log('Reverse geocoding result:', result);

    return new AddressResult(
      result.formatted_address,
      find('country'),
      find('administrative_area_level_1'), // 都道府県
      find('locality'),                    // 市
      find('sublocality_level_1'),          // 区
      find('route'),                        // 通り
      find('postal_code'),
    );
  }
}
