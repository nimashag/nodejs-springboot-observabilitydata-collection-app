import { httpClient } from '../utils/httpClient';
import dotenv from 'dotenv';
dotenv.config();

const RESTAURANTS_SERVICE_URL = process.env.RESTAURANTS_SERVICE_URL;

export const fetchMenuItems = async (restaurantId: string) => {
  // httpClient automatically includes X-Request-Id header from AsyncLocalStorage context
  const res = await httpClient.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}/menu-items`);
  return res.data;
};

export const fetchRestaurant = async (restaurantId: string) => {
  // httpClient automatically includes X-Request-Id header from AsyncLocalStorage context
  const res = await httpClient.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}`);
  return res.data;
};