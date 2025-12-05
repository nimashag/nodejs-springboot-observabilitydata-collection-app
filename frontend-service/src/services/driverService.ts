import axios from 'axios';

export const fetchDriverProfile = async () => {
  return axios.get('/api/drivers/me');
};

export const updateDriverProfile = async (data: { pickupLocation?: string; deliveryLocations?: string[]; isAvailable?: boolean }) => {
  return axios.patch('/api/drivers/me', data);
};
