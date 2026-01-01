import { httpClient } from '../utils/httpClient';
import { logInfo, logWarn, logError } from '../utils/logger';
import dotenv from 'dotenv';
dotenv.config();

const RESTAURANTS_SERVICE_URL = process.env.RESTAURANTS_SERVICE_URL;

export const fetchMenuItems = async (restaurantId: string) => {
  logInfo("api.restaurant.fetch_menu_items.start", {
    restaurantId,
    url: `${RESTAURANTS_SERVICE_URL}/${restaurantId}/menu-items`,
  });

  try {
    // httpClient automatically includes X-Request-Id header from AsyncLocalStorage context
    const res = await httpClient.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}/menu-items`);
    
    logInfo("api.restaurant.fetch_menu_items.success", {
      restaurantId,
      itemsCount: Array.isArray(res.data) ? res.data.length : 0,
      statusCode: res.status,
    });
    
    return res.data;
  } catch (err) {
    logError("api.restaurant.fetch_menu_items.error", {
      restaurantId,
      url: `${RESTAURANTS_SERVICE_URL}/${restaurantId}/menu-items`,
    }, err as Error);
    throw err;
  }
};

export const fetchRestaurant = async (restaurantId: string) => {
  logInfo("api.restaurant.fetch_restaurant.start", {
    restaurantId,
    url: `${RESTAURANTS_SERVICE_URL}/${restaurantId}`,
  });

  try {
    // httpClient automatically includes X-Request-Id header from AsyncLocalStorage context
    const res = await httpClient.get(`${RESTAURANTS_SERVICE_URL}/${restaurantId}`);
    
    logInfo("api.restaurant.fetch_restaurant.success", {
      restaurantId,
      statusCode: res.status,
      restaurantName: res.data?.name,
    });
    
    return res.data;
  } catch (err) {
    logError("api.restaurant.fetch_restaurant.error", {
      restaurantId,
      url: `${RESTAURANTS_SERVICE_URL}/${restaurantId}`,
    }, err as Error);
    throw err;
  }
};