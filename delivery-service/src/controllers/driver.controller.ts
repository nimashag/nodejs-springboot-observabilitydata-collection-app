import { Request, Response } from 'express';
import { createDriver, findDriverByUserId, updateDriverProfile } from '../services/driver.service';
import { logInfo, logWarn, logError } from '../utils/logger';

/**
 * Register a new driver
 */
export const registerDriver = async (req: Request, res: Response) => {
    const { pickupLocation, vehicleRegNumber, mobileNumber } = req.body;
    let { deliveryLocations } = req.body;
    const userId = (req as any).user?.id;
    const profileImage = (req as any).file?.filename;
  
    try {
      if (!userId) {
        logWarn("driver.register.unauthorized", {
          reason: "No user in request",
        });
        return res.status(401).json({ message: "Unauthorized" });
      }

      logInfo("driver.register.start", {
        userId,
        pickupLocation,
        vehicleRegNumber,
        hasProfileImage: !!profileImage,
      });

      const existingDriver = await findDriverByUserId(userId);
      if (existingDriver) {
        logWarn("driver.register.already_exists", {
          userId,
          driverId: existingDriver._id.toString(),
        });
        return res.status(400).json({ message: 'Driver already registered' });
      }
  
      //  If deliveryLocations is a string, split it
      if (typeof deliveryLocations === 'string') {
        deliveryLocations = deliveryLocations.split(',').map((loc: string) => loc.trim());
      }
  
      const driver = await createDriver({
        userId,
        pickupLocation,
        deliveryLocations,
        vehicleRegNumber,
        mobileNumber,
        profileImage,
      });
  
      logInfo("driver.register.success", {
        userId,
        driverId: driver._id.toString(),
        pickupLocation: driver.pickupLocation,
      });

      res.status(201).json({ message: 'Driver registered successfully', driver });
    } catch (error: any) {
      logError("driver.register.error", {
        userId: (req as any).user?.id,
        pickupLocation: req.body?.pickupLocation,
      }, error);
      res.status(500).json({ message: 'Error registering driver', error: error.message });
    }
  };
  
/**
 * Update existing driver
 */
export const updateDriver = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const profileImage = (req as any).file?.filename;

  try {
    if (!userId) {
      logWarn("driver.update.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updateData = { ...req.body };
    if (profileImage) {
      updateData.profileImage = profileImage;
    }

    const driver = await updateDriverProfile(userId, updateData);
    if (!driver) {
      logWarn("driver.update.not_found", { userId });
      return res.status(404).json({ message: 'Driver not found' });
    }

    logInfo("driver.update.success", {
      userId,
      driverId: driver._id.toString(),
    });

    res.status(200).json({ message: 'Driver updated successfully', driver });
  } catch (error: any) {
    logError("driver.update.error", {
      userId: (req as any).user?.id,
    }, error);
    res.status(500).json({ message: 'Error updating driver', error: error.message });
  }
};

/**
 * Get current driver profile
 */
export const getDriverProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  try {
    if (!userId) {
      logWarn("driver.get_profile.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("driver.get_profile.start", { userId });
    const driver = await findDriverByUserId(userId);
    if (!driver) {
      logWarn("driver.get_profile.not_found", { userId });
      return res.status(404).json({ message: 'Driver not found' });
    }

    logInfo("driver.get_profile.success", {
      userId,
      driverId: driver._id.toString(),
      isAvailable: driver.isAvailable,
    });

    res.status(200).json(driver);
  } catch (error: any) {
    logError("driver.get_profile.error", {
      userId: (req as any).user?.id,
    }, error);
    res.status(500).json({ message: 'Error fetching driver profile', error: error.message });
  }
};
