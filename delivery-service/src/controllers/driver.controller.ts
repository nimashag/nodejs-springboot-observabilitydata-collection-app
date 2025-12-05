import { Request, Response } from 'express';
import { createDriver, findDriverByUserId, updateDriverProfile } from '../services/driver.service';

/**
 * Register a new driver
 */
export const registerDriver = async (req: Request, res: Response) => {
    const { pickupLocation, vehicleRegNumber, mobileNumber } = req.body;
    let { deliveryLocations } = req.body;
    const userId = (req as any).user.id;
    const profileImage = (req as any).file?.filename;
  
    try {
      const existingDriver = await findDriverByUserId(userId);
      if (existingDriver) return res.status(400).json({ message: 'Driver already registered' });
  
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
  
      res.status(201).json({ message: 'Driver registered successfully', driver });
    } catch (error: any) {
      console.error("Error creating driver:", error); // ✅ Add proper console log
      res.status(500).json({ message: 'Error registering driver', error: error.message });
    }
  };
  
/**
 * Update existing driver
 */
export const updateDriver = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const profileImage = (req as any).file?.filename;

  try {
    const updateData = { ...req.body };
    if (profileImage) {
      updateData.profileImage = profileImage;
    }

    const driver = await updateDriverProfile(userId, updateData);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    res.status(200).json({ message: 'Driver updated successfully', driver });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating driver', error: error.message });
  }
};

/**
 * Get current driver profile
 */
export const getDriverProfile = async (req: Request, res: Response) => {
  const driver = await findDriverByUserId((req as any).user.id);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });

  res.status(200).json(driver);
};
