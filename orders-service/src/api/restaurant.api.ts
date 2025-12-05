import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const RESTAURANTS_SERVICE_URL = process.env.RESTAURANTS_SERVICE_URL;

export const fetchMenuItems = async (restaurantId: string) => {
  const res = await axios.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}/menu-items`);
  return res.data;
};

export const fetchRestaurant = async (restaurantId: string) => {
  const res = await axios.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}`);
  return res.data;
};