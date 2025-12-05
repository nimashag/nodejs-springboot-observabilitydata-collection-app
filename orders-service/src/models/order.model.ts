import mongoose, { Document, Schema, Types } from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: {type: String, required: true},
  quantity: {type: Number, min: 1},
  price: {type: Number, required: true}
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [orderItemSchema],
  status: {type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Waiting for Pickup', 'Delivered', 'Cancelled'], default: 'Pending'},
  totalAmount: {type: Number, required: true},
  deliveryAddress: {street: String, city: String, state: String, zipCode: String, country: String},
  paymentStatus: {type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending'},
  paymentMethod: {type: String, enum: ['Stripe'],  default: 'Stripe'},
  specialInstructions: {type: String, default: ''}
}, {
  timestamps: true
});

export const Order = mongoose.model('Order', orderSchema);