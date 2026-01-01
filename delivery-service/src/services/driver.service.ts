import { Driver, DriverDocument } from '../models/driver.model';
import { logInfo, logWarn, logError } from '../utils/logger';

/**
 * Find driver by userId
 */
export const findDriverByUserId = async (userId: string): Promise<DriverDocument | null> => {
  logInfo("driver.service.find_by_user.start", { userId });
  try {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      logWarn("driver.service.find_by_user.not_found", { userId });
      return null;
    }
    logInfo("driver.service.find_by_user.success", {
      userId,
      driverId: driver._id.toString(),
      isAvailable: driver.isAvailable,
      pickupLocation: driver.pickupLocation,
    });
    return driver;
  } catch (err) {
    logError("driver.service.find_by_user.error", { userId }, err as Error);
    throw err;
  }
};

/**
 * Create new driver profile
 */
export const createDriver = async (data: {
  userId: string;
  pickupLocation: string;
  deliveryLocations: string[];
  vehicleRegNumber: string;
  mobileNumber: string;
  profileImage?: string;
}): Promise<DriverDocument> => {
  logInfo("driver.service.create.start", {
    userId: data.userId,
    pickupLocation: data.pickupLocation,
    deliveryLocationsCount: data.deliveryLocations.length,
    vehicleRegNumber: data.vehicleRegNumber,
    hasProfileImage: !!data.profileImage,
  });

  try {
    const driver = new Driver({
      ...data,
      isAvailable: true,
    });
    const saved = await driver.save();
    
    logInfo("driver.service.create.success", {
      driverId: saved._id.toString(),
      userId: data.userId,
      pickupLocation: saved.pickupLocation,
      isAvailable: saved.isAvailable,
    });
    
    return saved;
  } catch (err) {
    logError("driver.service.create.error", { userId: data.userId }, err as Error);
    throw err;
  }
};

/**
 * Update existing driver profile
 */
export const updateDriverProfile = async (userId: string, updateData: Partial<DriverDocument>): Promise<DriverDocument | null> => {
  const fieldsToUpdate = Object.keys(updateData).filter(key => updateData[key as keyof DriverDocument] !== undefined);
  logInfo("driver.service.update.start", {
    userId,
    fieldsToUpdate,
    hasProfileImage: !!updateData.profileImage,
  });

  try {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      logWarn("driver.service.update.not_found", { userId });
      return null;
    }

    const oldAvailability = driver.isAvailable;
    Object.assign(driver, updateData);
    await driver.save();
    
    logInfo("driver.service.update.success", {
      driverId: driver._id.toString(),
      userId,
      fieldsUpdated: fieldsToUpdate.length,
      availabilityChanged: oldAvailability !== driver.isAvailable,
      isAvailable: driver.isAvailable,
    });
    
    return driver;
  } catch (err) {
    logError("driver.service.update.error", { userId }, err as Error);
    throw err;
  }
};

/**
 * Find available driver by pickup and delivery location
 */
export const findAvailableDriver = async (pickupLocation: string, deliveryLocation: string): Promise<DriverDocument | null> => {
  logInfo("driver.service.find_available.start", {
    pickupLocation,
    deliveryLocation,
  });

  try {
    const driver = await Driver.findOne({
      isAvailable: true,
      pickupLocation,
      deliveryLocations: { $in: [deliveryLocation] },
    });

    if (!driver) {
      logWarn("driver.service.find_available.not_found", {
        pickupLocation,
        deliveryLocation,
        reason: "No available driver matching criteria",
      });
      return null;
    }

    logInfo("driver.service.find_available.success", {
      driverId: driver._id.toString(),
      pickupLocation,
      deliveryLocation,
      vehicleRegNumber: driver.vehicleRegNumber,
    });

    return driver;
  } catch (err) {
    logError("driver.service.find_available.error", {
      pickupLocation,
      deliveryLocation,
    }, err as Error);
    throw err;
  }
};

/**
 * Mark driver as available or unavailable
 */
export const markDriverAvailability = async (driverId: string, available: boolean): Promise<void> => {
  logInfo("driver.service.mark_availability.start", {
    driverId,
    newAvailability: available,
  });

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      logWarn("driver.service.mark_availability.not_found", { driverId });
      return;
    }

    const oldAvailability = driver.isAvailable;
    await Driver.findByIdAndUpdate(driverId, { isAvailable: available });
    
    logInfo("driver.service.mark_availability.success", {
      driverId,
      oldAvailability,
      newAvailability: available,
    });
  } catch (err) {
    logError("driver.service.mark_availability.error", { driverId, available }, err as Error);
    throw err;
  }
};
