// domain/value-object/location/AddressResult.ts

export class AddressResult {
  constructor(
    public readonly formattedAddress: string,
    public readonly country?: string,
    public readonly prefecture?: string,
    public readonly city?: string,
    public readonly ward?: string,
    public readonly street?: string,
    public readonly postalCode?: string,
  ) {}
}
