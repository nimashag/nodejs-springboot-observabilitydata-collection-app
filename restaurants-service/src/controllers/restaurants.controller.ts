import { Request, Response } from "express";
import * as restaurantsService from "../services/restaurants.service";
import { AuthenticatedRequest } from "../middlewares/auth";

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("[create]▶️ Creating a new restaurant:", req.body);

    const { name, address, location } = req.body;
    const image = req.file?.filename;


    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const restaurant = await restaurantsService.createRestaurant(
      { name, address, location, image },
      req.user.id
    );

    console.log("✅ Created restaurant with ID:", restaurant._id);
    res.json(restaurant);
  } catch (err) {
    console.error("Error creating restaurant:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const list = async (_req: Request, res: Response) => {
  try {
    console.log("[list]▶️ Fetching all restaurants");
    const restaurants = await restaurantsService.getAllRestaurants();
    console.log(`Found ${restaurants.length} restaurants`);
    res.json(restaurants);
  } catch (err) {
    console.error("Error listing restaurants:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    console.log("[update]▶️ Updating restaurant ID:", req.params.id);

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

    console.log("✅ Updated restaurant:", updated._id);
    res.json(updated);
  } catch (err) {
    console.error("Error updating restaurant:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  console.log("[getOne] ▶️ Fetching restaurant with ID:", req.params.id);
  const restaurant = await restaurantsService.getRestaurantById(req.params.id);
  if (!restaurant) {
    console.warn("Restaurant not found:", req.params.id);
  } else {
    console.log("Restaurant found:", restaurant.name);
  }
  res.json(restaurant);
};

export const getByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    console.log("[getByUser] ▶️ Fetching restaurants for user ID:", req.user.id);
    const restaurants = await restaurantsService.getRestaurantByUserId(req.user.id);
    console.log(restaurants);
    console.log(`restaurants: ${JSON.stringify(restaurants)}`);
    
    res.json(restaurants);
  } catch (err) {
    console.error("Error fetching user restaurants:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const toggleAvailability = async (req: Request, res: Response) => {
  console.log("[toggleAvailability]▶️ Toggling availability for restaurant ID:", req.params.id);
  const updated = await restaurantsService.toggleAvailability(req.params.id);
  console.log("Updated availability to:", updated?.available);
  res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
  try {
    console.log("[deleteRestaurant] ▶️ Deleting restaurant ID:", req.params.id);

    const deleted = await restaurantsService.deleteRestaurant(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    console.log("✅ Deleted restaurant");
    res.status(204).send(); // No content
  } catch (err) {
    console.error("Error deleting restaurant:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const addMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  console.log(
    "[addMenuItem]▶️ Adding menu item for restaurant ID:",
    req.params.id,
    "Item:",
    req.body
  );

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

  console.log("✅ Added menu item with ID:", item._id);
  res.json(item);
};

export const listMenuItems = async (req: Request, res: Response) => {
  console.log("[listMenuItems]▶️ Fetching menu items for restaurant ID:", req.params.id);
  const items = await restaurantsService.listMenuItems(req.params.id);
  console.log(`Found ${items.length} menu items`);
  res.json(items);
};

export const getOneMenuItem = async (req: Request, res: Response) => {
    console.log("[getOneMenuItem]▶️ Fetching menu item with ID:", req.params.itemId);
  
    const item = await restaurantsService.getOneMenuItem(req.params.itemId);
  
    if (!item) {
      console.warn("❌ Menu item not found:", req.params.itemId);
      return res.status(404).json({ message: "Menu item not found" });
    }
  
    console.log("✅ Menu item found:", item.name);
    res.json(item);
  };
  
export const getMenuItemsByUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  
      console.log("[getMenuItemsByUser]▶️ Fetching menu items for user ID:", req.user.id);
      const items = await restaurantsService.getMenuItemsByUser(req.user.id);
  
      console.log(`✅ Found ${items.length} menu items for user`);
      res.json(items);
    } catch (err) {
      console.error("Error fetching menu items by user:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
};
  
  
export const updateMenuItem = async (req: Request, res: Response) => {
    try {
      console.log("[updateMenuItem]▶️ Updating menu item ID:", req.params.itemId);
  
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
  
      console.log("✅ Updated menu item:", updatedItem._id);
      res.json(updatedItem);
    } catch (err) {
      console.error("Error updating menu item:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  };
  
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    console.log("[deleteMenuItem] ▶️ Deleting menu item ID:", req.params.itemId);

    const deleted = await restaurantsService.deleteMenuItem(req.params.itemId);

    if (!deleted) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    console.log("✅ Deleted menu item");
    res.status(204).send(); // No content
  } catch (err) {
    console.error("Error deleting menu item:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
