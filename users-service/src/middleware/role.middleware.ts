import { Request, Response, NextFunction } from 'express';

export const isAppAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user || user.role !== 'appAdmin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }

  next();
};

export const isRestaurantAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'restaurantAdmin') {
    return res.status(403).json({ message: 'Access denied: Restaurant Admins only' });
  }
  next();
};

export const isCustomer = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'customer') {
    return res.status(403).json({ message: 'Access denied: Customers only' });
  }
  next();
};

export const isDeliveryPersonnel = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'deliveryPersonnel') {
    return res.status(403).json({ message: 'Access denied: Delivery Personnel only' });
  }
  next();
};