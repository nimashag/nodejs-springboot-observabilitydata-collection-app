import { Delivery, DeliveryDocument } from '../models/delivery.model';

// ✅ Strict type for allowed statuses
export type DeliveryStatus = 'Pending' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled';

// ✅ Create new delivery
export const createDelivery = async (data: {
  orderId: string;
  customerId: string;
  restaurantLocation: string;
  deliveryLocation: string;
  driverId: string;
}): Promise<DeliveryDocument> => {
  const delivery = new Delivery({
    ...data,
    status: 'Assigned',    // Default when assigned
    acceptStatus: 'Pending',  // Pending acceptance by driver
  });
  return delivery.save();
};

// ✅ Find delivery by order ID
export const findDeliveryByOrderId = async (orderId: string): Promise<DeliveryDocument | null> => {
  return Delivery.findOne({ orderId });
};

// ✅ Handle driver response (accept/decline)
export const updateDeliveryAcceptance = async (delivery: DeliveryDocument, action: 'accept' | 'decline'): Promise<void> => {
  if (action === 'accept') {
    delivery.acceptStatus = 'Accepted';
  } else {
    delivery.acceptStatus = 'Declined';
    delivery.driverId = undefined;
    delivery.status = 'Pending'; // Reset status if declined
  }
  await delivery.save();
};

// ✅ Find assigned deliveries for a driver (Pending acceptance)
export const findAssignedDeliveriesForDriver = async (driverId: string): Promise<DeliveryDocument[]> => {
  return Delivery.find({ driverId,status: 'Assigned' ,acceptStatus: 'Pending' });
};

// ✅ Fetch all deliveries for driver (Ongoing + Completed)
export const findAllDeliveriesForDriver = async (driverId: string): Promise<DeliveryDocument[]> => {
  return Delivery.find({ driverId });
};

// ✅ Update delivery status safely
export const updateDeliveryStatusById = async (deliveryId: string, status: DeliveryStatus): Promise<DeliveryDocument | null> => {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) return null;

  delivery.status = status; // Now type-safe ✅
  await delivery.save();
  return delivery;
};
