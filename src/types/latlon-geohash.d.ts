declare module "latlon-geohash" {
  interface GeohashResult {
    lat: number;
    lon: number;
  }

  interface Geohash {
    encode(lat: number, lon: number, precision?: number): string;
    decode(geohash: string): GeohashResult;
  }

  const geohash: Geohash;
  export default geohash;
}
