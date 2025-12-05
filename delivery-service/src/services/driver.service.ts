import { Driver, DriverDocument } from '../models/driver.model';

/**
 * Find driver by userId
 */
export const findDriverByUserId = async (userId: string): Promise<DriverDocument | null> => {
  return Driver.findOne({ userId });
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
  const driver = new Driver({
    ...data,
    isAvailable: true,
  });
  return driver.save();
};

/**
 * Update existing driver profile
 */
export const updateDriverProfile = async (userId: string, updateData: Partial<DriverDocument>): Promise<DriverDocument | null> => {
  const driver = await Driver.findOne({ userId });
  if (!driver) return null;

  Object.assign(driver, updateData);
  await driver.save();
  return driver;
};

/**
 * Find available driver by pickup and delivery location
 */
export const findAvailableDriver = async (pickupLocation: string, deliveryLocation: string): Promise<DriverDocument | null> => {
  return Driver.findOne({
    isAvailable: true,
    pickupLocation,
    deliveryLocations: { $in: [deliveryLocation] },
  });
};

/**
 * Mark driver as available or unavailable
 */
export const markDriverAvailability = async (driverId: string, available: boolean): Promise<void> => {
  await Driver.findByIdAndUpdate(driverId, { isAvailable: available });
};
