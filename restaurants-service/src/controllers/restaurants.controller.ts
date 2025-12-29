import { Request, Response } from "express";
import * as restaurantsService from "../services/restaurants.service";
import { AuthenticatedRequest } from "../middlewares/auth";
import { logError, logInfo, logWarn } from "../utils/logger";

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logInfo("restaurant.create.start", {
      name: req.body?.name,
      userId: req.user?.id,
    });

    const { name, address, location } = req.body;
    const image = req.file?.filename;


    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const restaurant = await restaurantsService.createRestaurant(
      { name, address, location, image },
      req.user.id
    );

    logInfo("restaurant.create.success", { id: restaurant._id });
    res.json(restaurant);
  } catch (err) {
    logError("restaurant.create.error", { body: req.body }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const list = async (_req: Request, res: Response) => {
  try {
    logInfo("restaurant.list.start");
    const restaurants = await restaurantsService.getAllRestaurants();
    logInfo("restaurant.list.success", { count: restaurants.length });
    res.json(restaurants);
  } catch (err) {
    logError("restaurant.list.error", undefined, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    logInfo("restaurant.update.start", { id: req.params.id });

    const updateData: any = { ...req.body };

    if (req.file?.filename) {
      updateData.image = req.file.filename;
    }

    const updated = await restaurantsService.updateRestaurant(
      req.params.id,
      updateData
    );

    if (!updated) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    logInfo("restaurant.update.success", { id: updated._id });
    res.json(updated);
  } catch (err) {
    logError("restaurant.update.error", { id: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    logInfo("restaurant.getOne.start", { id: req.params.id });
    const restaurant = await restaurantsService.getRestaurantById(req.params.id);
    if (!restaurant) {
      logWarn("restaurant.getOne.notFound", { id: req.params.id });
      return res.status(404).json({ message: "Restaurant not found" });
    }
    logInfo("restaurant.getOne.found", { id: restaurant._id, name: restaurant.name });
    res.json(restaurant);
  } catch (err: any) {
    // Handle CastError (invalid ObjectId format)
    if (err.name === 'CastError') {
      logWarn("restaurant.getOne.invalidId", { id: req.params.id });
      return res.status(400).json({ message: "Invalid restaurant ID format" });
    }
    logError("restaurant.getOne.error", { id: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    logInfo("[getByUser] Fetching restaurants for user", { userId: req.user.id });
    const restaurants = await restaurantsService.getRestaurantByUserId(req.user.id);
    logInfo("restaurants.byUser.success", { count: restaurants.length, userId: req.user.id });
    
    res.json(restaurants);
  } catch (err) {
    logError("restaurants.byUser.error", { userId: req.user?.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const toggleAvailability = async (req: Request, res: Response) => {
  logInfo("restaurant.toggle.start", { id: req.params.id });
  const updated = await restaurantsService.toggleAvailability(req.params.id);
  logInfo("restaurant.toggle.success", { id: req.params.id, available: updated?.available });
  res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
  try {
    logInfo("restaurant.delete.start", { id: req.params.id });

    const deleted = await restaurantsService.deleteRestaurant(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    logInfo("restaurant.delete.success", { id: req.params.id });
    res.status(204).send(); // No content
  } catch (err) {
    logError("restaurant.delete.error", { id: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const addMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  logInfo("menuItem.add.start", {
    restaurantId: req.params.id,
    userId: req.user?.id,
    name: req.body?.name,
  });

  const { name, description, price, category } = req.body;
  const image = req.file?.filename; // For image upload

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Create the item with restaurantId and userId
  const item = await restaurantsService.addMenuItem(
    req.params.id, // restaurantId
    { name, description, price, category, image, userId: req.user.id, } // item data with userId
  );

  logInfo("menuItem.add.success", { id: item._id, restaurantId: req.params.id });
  res.json(item);
};

export const listMenuItems = async (req: Request, res: Response) => {
  logInfo("menuItem.list.start", { restaurantId: req.params.id });
  const items = await restaurantsService.listMenuItems(req.params.id);
  logInfo("menuItem.list.success", { restaurantId: req.params.id, count: items.length });
  res.json(items);
};

export const getOneMenuItem = async (req: Request, res: Response) => {
    logInfo("menuItem.getOne.start", { itemId: req.params.itemId });
  
    const item = await restaurantsService.getOneMenuItem(req.params.itemId);
  
    if (!item) {
      logWarn("menuItem.getOne.notFound", { itemId: req.params.itemId });
      return res.status(404).json({ message: "Menu item not found" });
    }
  
    logInfo("menuItem.getOne.found", { itemId: item._id, name: item.name });
    res.json(item);
  };
  
export const getMenuItemsByUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  
      logInfo("menuItem.byUser.start", { userId: req.user.id });
      const items = await restaurantsService.getMenuItemsByUser(req.user.id);
  
      logInfo("menuItem.byUser.success", { userId: req.user.id, count: items.length });
      res.json(items);
    } catch (err) {
      logError("menuItem.byUser.error", { userId: req.user?.id }, err as Error);
      res.status(500).json({ message: "Something went wrong" });
    }
};
  
  
export const updateMenuItem = async (req: Request, res: Response) => {
    try {
      logInfo("menuItem.update.start", { itemId: req.params.itemId });
  
      const updateData: any = { ...req.body };
  
      if (req.file?.filename) {
        updateData.image = req.file.filename;
      }
  
      const updatedItem = await restaurantsService.updateMenuItem(
        req.params.itemId,
        updateData
      );
  
      if (!updatedItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
  
      logInfo("menuItem.update.success", { itemId: updatedItem._id });
      res.json(updatedItem);
    } catch (err) {
      logError("menuItem.update.error", { itemId: req.params.itemId }, err as Error);
      res.status(500).json({ message: "Something went wrong" });
    }
  };
  
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    logInfo("menuItem.delete.start", { itemId: req.params.itemId });

    const deleted = await restaurantsService.deleteMenuItem(req.params.itemId);

    if (!deleted) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    logInfo("menuItem.delete.success", { itemId: req.params.itemId });
    res.status(204).send(); // No content
  } catch (err) {
    logError("menuItem.delete.error", { itemId: req.params.itemId }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
