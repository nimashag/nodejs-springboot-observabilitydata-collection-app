import { Restaurant } from "../models/restaurant.model";
import { MenuItem } from "../models/menuItem.model";
import { logInfo, logWarn, logError } from "../utils/logger";

export const createRestaurant = async (data: any, userId: string) => {
  logInfo("restaurant.service.create.start", {
    userId,
    name: data.name,
    address: data.address,
    hasImage: !!data.image,
  });

  try {
    const restaurant = await Restaurant.create({ ...data, userId });
    logInfo("restaurant.service.create.success", {
      restaurantId: restaurant._id.toString(),
      userId,
      name: restaurant.name,
    });
    return restaurant;
  } catch (err) {
    logError("restaurant.service.create.error", { userId, name: data.name }, err as Error);
    throw err;
  }
};

export const getAllRestaurants = async () => {
  logInfo("restaurant.service.get_all.start", {});
  try {
    const restaurants = await Restaurant.find();
    logInfo("restaurant.service.get_all.success", { count: restaurants.length });
    return restaurants;
  } catch (err) {
    logError("restaurant.service.get_all.error", {}, err as Error);
    throw err;
  }
};

export const getRestaurantById = async (id: string) => {
  logInfo("restaurant.service.get_by_id.start", { restaurantId: id });
  try {
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      logWarn("restaurant.service.get_by_id.not_found", { restaurantId: id });
      return null;
    }
    logInfo("restaurant.service.get_by_id.success", {
      restaurantId: id,
      name: restaurant.name,
      available: restaurant.available,
    });
    return restaurant;
  } catch (err) {
    logError("restaurant.service.get_by_id.error", { restaurantId: id }, err as Error);
    throw err;
  }
};

export const getRestaurantByUserId = async (userId: string) => {
  logInfo("restaurant.service.get_by_user.start", { userId });
  try {
    const restaurants = await Restaurant.find({ userId });
    logInfo("restaurant.service.get_by_user.success", {
      userId,
      count: restaurants.length,
    });
    return restaurants;
  } catch (err) {
    logError("restaurant.service.get_by_user.error", { userId }, err as Error);
    throw err;
  }
};


export const toggleAvailability = async (id: string) => {
  logInfo("restaurant.service.toggle.start", { restaurantId: id });
  try {
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      logWarn("restaurant.service.toggle.not_found", { restaurantId: id });
      return null;
    }
    const oldAvailability = restaurant.available;
    restaurant.available = !restaurant.available;
    const saved = await restaurant.save();
    logInfo("restaurant.service.toggle.success", {
      restaurantId: id,
      oldAvailability,
      newAvailability: saved.available,
    });
    return saved;
  } catch (err) {
    logError("restaurant.service.toggle.error", { restaurantId: id }, err as Error);
    throw err;
  }
};

export const updateRestaurant = async (id: string, data: any) => {
  const fieldsToUpdate = Object.keys(data).filter(key => data[key] !== undefined);
  logInfo("restaurant.service.update.start", {
    restaurantId: id,
    fieldsToUpdate,
    hasImage: !!data.image,
  });
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!updatedRestaurant) {
      logWarn("restaurant.service.update.not_found", { restaurantId: id });
      return null;
    }
    logInfo("restaurant.service.update.success", {
      restaurantId: id,
      name: updatedRestaurant.name,
      fieldsUpdated: fieldsToUpdate.length,
    });
    return updatedRestaurant;
  } catch (err) {
    logError("restaurant.service.update.error", { restaurantId: id }, err as Error);
    throw err;
  }
};

export const deleteRestaurant = async (id: string) => {
  logInfo("restaurant.service.delete.start", { restaurantId: id });
  try {
    const deleted = await Restaurant.findByIdAndDelete(id);
    if (!deleted) {
      logWarn("restaurant.service.delete.not_found", { restaurantId: id });
      return null;
    }
    logInfo("restaurant.service.delete.success", {
      restaurantId: id,
      name: deleted.name,
    });
    return deleted;
  } catch (err) {
    logError("restaurant.service.delete.error", { restaurantId: id }, err as Error);
    throw err;
  }
};


export const addMenuItem = async (restaurantId: string, item: any) => {
  logInfo("menuitem.service.add.start", {
    restaurantId,
    userId: item.userId,
    name: item.name,
    category: item.category,
    price: item.price,
    hasImage: !!item.image,
  });
  try {
    const menuItem = await MenuItem.create({ ...item, restaurantId });
    logInfo("menuitem.service.add.success", {
      menuItemId: menuItem._id.toString(),
      restaurantId,
      name: menuItem.name,
    });
    return menuItem;
  } catch (err) {
    logError("menuitem.service.add.error", { restaurantId, name: item.name }, err as Error);
    throw err;
  }
};

export const getOneMenuItem = async (itemId: string) => {
  logInfo("menuitem.service.get_one.start", { menuItemId: itemId });
  try {
    const item = await MenuItem.findById(itemId);
    if (!item) {
      logWarn("menuitem.service.get_one.not_found", { menuItemId: itemId });
      return null;
    }
    logInfo("menuitem.service.get_one.success", {
      menuItemId: itemId,
      name: item.name,
      restaurantId: item.restaurantId?.toString() || "unknown",
    });
    return item;
  } catch (err) {
    logError("menuitem.service.get_one.error", { menuItemId: itemId }, err as Error);
    throw err;
  }
};
  
export const getMenuItemsByUser = async (userId: string) => {
  logInfo("menuitem.service.get_by_user.start", { userId });
  try {
    const items = await MenuItem.find({ userId });
    logInfo("menuitem.service.get_by_user.success", {
      userId,
      count: items.length,
    });
    return items;
  } catch (err) {
    logError("menuitem.service.get_by_user.error", { userId }, err as Error);
    throw err;
  }
};

export const listMenuItems = async (restaurantId: string) => {
  logInfo("menuitem.service.list.start", { restaurantId });
  try {
    const items = await MenuItem.find({ restaurantId });
    logInfo("menuitem.service.list.success", {
      restaurantId,
      count: items.length,
    });
    return items;
  } catch (err) {
    logError("menuitem.service.list.error", { restaurantId }, err as Error);
    throw err;
  }
};

export const updateMenuItem = async (itemId: string, item: any) => {
  const fieldsToUpdate = Object.keys(item).filter(key => item[key] !== undefined);
  logInfo("menuitem.service.update.start", {
    menuItemId: itemId,
    fieldsToUpdate,
    hasImage: !!item.image,
  });
  try {
    const existingItem = await MenuItem.findById(itemId);
    if (!existingItem) {
      logWarn("menuitem.service.update.not_found", { menuItemId: itemId });
      return null;
    }

    // Only update the fields that are present
    if (item.name) existingItem.name = item.name;
    if (item.description) existingItem.description = item.description;
    if (item.price) existingItem.price = item.price;
    if (item.category) existingItem.category = item.category;
    if (item.image) existingItem.image = item.image; // Only update image if a new one is uploaded

    const saved = await existingItem.save();
    logInfo("menuitem.service.update.success", {
      menuItemId: itemId,
      name: saved.name,
      fieldsUpdated: fieldsToUpdate.length,
    });
    return saved;
  } catch (err) {
    logError("menuitem.service.update.error", { menuItemId: itemId }, err as Error);
    throw err;
  }
};

export const deleteMenuItem = async (itemId: string) => {
  logInfo("menuitem.service.delete.start", { menuItemId: itemId });
  try {
    const deleted = await MenuItem.findByIdAndDelete(itemId);
    if (!deleted) {
      logWarn("menuitem.service.delete.not_found", { menuItemId: itemId });
      return null;
    }
    logInfo("menuitem.service.delete.success", {
      menuItemId: itemId,
      name: deleted.name,
      restaurantId: deleted.restaurantId?.toString() || "unknown",
    });
    return deleted;
  } catch (err) {
    logError("menuitem.service.delete.error", { menuItemId: itemId }, err as Error);
    throw err;
  }
};
