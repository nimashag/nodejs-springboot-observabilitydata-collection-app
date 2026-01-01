import { Request, Response } from "express";
import * as restaurantsService from "../services/restaurants.service";
import { AuthenticatedRequest } from "../middlewares/auth";
import { logError, logInfo, logWarn } from "../utils/logger";

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("restaurant.create.unauthorized", {
        reason: "No user in request",
        hasBody: !!req.body,
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("restaurant.create.start", {
      name: req.body?.name,
      userId: req.user.id,
      address: req.body?.address,
      hasImage: !!req.file,
    });

    const { name, address, location } = req.body;
    const image = req.file?.filename;

    const restaurant = await restaurantsService.createRestaurant(
      { name, address, location, image },
      req.user.id
    );

    logInfo("restaurant.create.success", {
      restaurantId: restaurant._id.toString(),
      userId: req.user.id,
      name: restaurant.name,
    });
    res.json(restaurant);
  } catch (err) {
    logError("restaurant.create.error", {
      userId: req.user?.id,
      name: req.body?.name,
    }, err as Error);
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

export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("restaurant.update.unauthorized", {
        restaurantId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fieldsToUpdate = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    logInfo("restaurant.update.start", {
      restaurantId: req.params.id,
      userId: req.user.id,
      fieldsToUpdate,
      hasImage: !!req.file,
    });

    const updateData: any = { ...req.body };

    if (req.file?.filename) {
      updateData.image = req.file.filename;
    }

    const updated = await restaurantsService.updateRestaurant(
      req.params.id,
      updateData
    );

    if (!updated) {
      logWarn("restaurant.update.not_found", {
        restaurantId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Restaurant not found" });
    }

    logInfo("restaurant.update.success", {
      restaurantId: updated._id.toString(),
      userId: req.user.id,
      name: updated.name,
    });
    res.json(updated);
  } catch (err) {
    logError("restaurant.update.error", {
      restaurantId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
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
    if (!req.user) {
      logWarn("restaurant.get_by_user.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    logInfo("restaurant.get_by_user.start", { userId: req.user.id });
    const restaurants = await restaurantsService.getRestaurantByUserId(req.user.id);
    logInfo("restaurant.get_by_user.success", {
      count: restaurants.length,
      userId: req.user.id,
    });
    
    res.json(restaurants);
  } catch (err) {
    logError("restaurant.get_by_user.error", { userId: req.user?.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const toggleAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("restaurant.toggle.unauthorized", {
        restaurantId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("restaurant.toggle.start", {
      restaurantId: req.params.id,
      userId: req.user.id,
    });
    
    const updated = await restaurantsService.toggleAvailability(req.params.id);
    
    if (!updated) {
      logWarn("restaurant.toggle.not_found", {
        restaurantId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    logInfo("restaurant.toggle.success", {
      restaurantId: req.params.id,
      userId: req.user.id,
      available: updated.available,
    });
    res.json(updated);
  } catch (err) {
    logError("restaurant.toggle.error", {
      restaurantId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("restaurant.delete.unauthorized", {
        restaurantId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("restaurant.delete.start", {
      restaurantId: req.params.id,
      userId: req.user.id,
    });

    const deleted = await restaurantsService.deleteRestaurant(req.params.id);

    if (!deleted) {
      logWarn("restaurant.delete.not_found", {
        restaurantId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Restaurant not found" });
    }

    logInfo("restaurant.delete.success", {
      restaurantId: req.params.id,
      userId: req.user.id,
      name: deleted.name,
    });
    res.status(204).send(); // No content
  } catch (err) {
    logError("restaurant.delete.error", {
      restaurantId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const addMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("menuitem.add.unauthorized", {
        restaurantId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("menuitem.add.start", {
      restaurantId: req.params.id,
      userId: req.user.id,
      name: req.body?.name,
      category: req.body?.category,
      price: req.body?.price,
      hasImage: !!req.file,
    });

    const { name, description, price, category } = req.body;
    const image = req.file?.filename; // For image upload

    // Create the item with restaurantId and userId
    const item = await restaurantsService.addMenuItem(
      req.params.id, // restaurantId
      { name, description, price, category, image, userId: req.user.id, } // item data with userId
    );

    logInfo("menuitem.add.success", {
      menuItemId: item._id.toString(),
      restaurantId: req.params.id,
      userId: req.user.id,
      name: item.name,
    });
    res.json(item);
  } catch (err) {
    logError("menuitem.add.error", {
      restaurantId: req.params.id,
      userId: req.user?.id,
      name: req.body?.name,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const listMenuItems = async (req: Request, res: Response) => {
  logInfo("menuItem.list.start", { restaurantId: req.params.id });
  const items = await restaurantsService.listMenuItems(req.params.id);
  logInfo("menuItem.list.success", { restaurantId: req.params.id, count: items.length });
  res.json(items);
};

export const getOneMenuItem = async (req: Request, res: Response) => {
  try {
    logInfo("menuitem.get_one.start", { menuItemId: req.params.itemId });
  
    const item = await restaurantsService.getOneMenuItem(req.params.itemId);
  
    if (!item) {
      logWarn("menuitem.get_one.not_found", { menuItemId: req.params.itemId });
      return res.status(404).json({ message: "Menu item not found" });
    }
  
    logInfo("menuitem.get_one.success", {
      menuItemId: item._id.toString(),
      name: item.name,
      restaurantId: item.restaurantId?.toString() || "unknown",
    });
    res.json(item);
  } catch (err: any) {
    if (err.name === 'CastError') {
      logWarn("menuitem.get_one.invalid_id", { menuItemId: req.params.itemId });
      return res.status(400).json({ message: "Invalid menu item ID format" });
    }
    logError("menuitem.get_one.error", { menuItemId: req.params.itemId }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
  
export const getMenuItemsByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("menuitem.get_by_user.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    logInfo("menuitem.get_by_user.start", { userId: req.user.id });
    const items = await restaurantsService.getMenuItemsByUser(req.user.id);
  
    logInfo("menuitem.get_by_user.success", {
      userId: req.user.id,
      count: items.length,
    });
    res.json(items);
  } catch (err) {
    logError("menuitem.get_by_user.error", { userId: req.user?.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
  
  
export const updateMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("menuitem.update.unauthorized", {
        menuItemId: req.params.itemId,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fieldsToUpdate = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    logInfo("menuitem.update.start", {
      menuItemId: req.params.itemId,
      userId: req.user.id,
      fieldsToUpdate,
      hasImage: !!req.file,
    });
  
    const updateData: any = { ...req.body };
  
    if (req.file?.filename) {
      updateData.image = req.file.filename;
    }
  
    const updatedItem = await restaurantsService.updateMenuItem(
      req.params.itemId,
      updateData
    );
  
    if (!updatedItem) {
      logWarn("menuitem.update.not_found", {
        menuItemId: req.params.itemId,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Menu item not found" });
    }
  
    logInfo("menuitem.update.success", {
      menuItemId: updatedItem._id.toString(),
      userId: req.user.id,
      name: updatedItem.name,
    });
    res.json(updatedItem);
  } catch (err) {
    logError("menuitem.update.error", {
      menuItemId: req.params.itemId,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
  
export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("menuitem.delete.unauthorized", {
        menuItemId: req.params.itemId,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("menuitem.delete.start", {
      menuItemId: req.params.itemId,
      userId: req.user.id,
    });

    const deleted = await restaurantsService.deleteMenuItem(req.params.itemId);

    if (!deleted) {
      logWarn("menuitem.delete.not_found", {
        menuItemId: req.params.itemId,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Menu item not found" });
    }

    logInfo("menuitem.delete.success", {
      menuItemId: req.params.itemId,
      userId: req.user.id,
      name: deleted.name,
    });
    res.status(204).send(); // No content
  } catch (err) {
    logError("menuitem.delete.error", {
      menuItemId: req.params.itemId,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
