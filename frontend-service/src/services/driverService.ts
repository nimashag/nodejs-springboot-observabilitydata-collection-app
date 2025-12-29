import httpClient from '../utils/httpClient';

export const fetchDriverProfile = async () => {
  return httpClient.get('/api/drivers/me');
};

export const updateDriverProfile = async (data: { pickupLocation?: string; deliveryLocations?: string[]; isAvailable?: boolean }) => {
  return httpClient.patch('/api/drivers/me', data);
};
