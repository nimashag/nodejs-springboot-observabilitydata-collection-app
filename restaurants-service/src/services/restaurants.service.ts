import { Restaurant } from "../models/restaurant.model";
import { MenuItem } from "../models/menuItem.model";

export const createRestaurant = (data: any, userId: string) =>
  Restaurant.create({ ...data, userId });

export const getAllRestaurants = () => Restaurant.find();

export const getRestaurantById = (id: string) => Restaurant.findById(id);

export const getRestaurantByUserId = (userId: string) =>
  Restaurant.find({ userId });


export const toggleAvailability = async (id: string) => {
  const restaurant = await Restaurant.findById(id);
  if (!restaurant) return null;
  restaurant.available = !restaurant.available;
  return restaurant.save();
};

export const updateRestaurant = async (id: string, data: any) => {
  const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, data, {
    new: true,
  });
  return updatedRestaurant;
};

export const deleteRestaurant = (id: string) =>
  Restaurant.findByIdAndDelete(id);


export const addMenuItem = (restaurantId: string, item: any) =>
  MenuItem.create({ ...item, restaurantId });

export const getOneMenuItem = (itemId: string) =>
    MenuItem.findById(itemId);
  
export const getMenuItemsByUser = (userId: string) =>
  MenuItem.find({ userId });

export const listMenuItems = (restaurantId: string) =>
  MenuItem.find({ restaurantId });

export const updateMenuItem = async (itemId: string, item: any) => {
  const existingItem = await MenuItem.findById(itemId);
  if (!existingItem) return null;

  // Only update the fields that are present
  if (item.name) existingItem.name = item.name;
  if (item.description) existingItem.description = item.description;
  if (item.price) existingItem.price = item.price;
  if (item.category) existingItem.category = item.category;
  if (item.image) existingItem.image = item.image; // Only update image if a new one is uploaded

  return existingItem.save();
};

export const deleteMenuItem = (itemId: string) =>
  MenuItem.findByIdAndDelete(itemId);
