import { Schema, model, Document } from 'mongoose';

export interface DeliveryDocument extends Document {
  orderId: string;
  driverId?: string;
  customerId: string;
  restaurantLocation: string;
  deliveryLocation: string;
  acceptStatus: 'Pending' | 'Accepted' | 'Declined';
  status: 'Pending' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled';
}

const deliverySchema = new Schema<DeliveryDocument>(
  {
    orderId: { type: String, required: true },
    driverId: { type: String },
    customerId: { type: String, required: true },
    restaurantLocation: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    acceptStatus: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
    status: { type: String, enum: ['Pending', 'Assigned', 'PickedUp', 'Delivered', 'Cancelled'], default: 'Pending' },
  },
  { timestamps: true }
);

export const Delivery = model<DeliveryDocument>('Delivery', deliverySchema);
