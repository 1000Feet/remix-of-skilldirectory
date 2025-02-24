interface Coordinates {
  lat: number;
  lng: number;
}

export async function getCoordinates(address: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

// Calculate distance between two points using the Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export async function getDistanceBetweenAddresses(
  address1: string | null,
  address2: string | null
): Promise<number | null> {
  if (!address1 || !address2) return null;

  const coords1 = await getCoordinates(address1);
  const coords2 = await getCoordinates(address2);

  if (!coords1 || !coords2) return null;

  return calculateDistance(
    coords1.lat,
    coords1.lng,
    coords2.lat,
    coords2.lng
  );
}

export async function testGeocodingAPI(address: string = "New York, NY"): Promise<boolean> {
  try {
    console.log('API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    console.log('Geocoding API response:', data);
    
    const coords = await getCoordinates(address);
    console.log('Geocoding test result:', coords);
    return coords !== null;
  } catch (error) {
    console.error('Geocoding test failed:', error);
    return false;
  }
}
