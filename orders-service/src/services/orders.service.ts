import { Types } from "mongoose";
import { Order } from '../models/order.model';
import { sendOrderStatusEmail } from './email.service';
import { sendOrderStatusSMS } from './sms.service'; 

export const createOrder = (data: any, userId: string) => Order.create({ ...data, userId });

export const getOrderById = (id: string) => Order.findById(id);

export const getAllOrders = () => Order.find();

//restaurantAdmin
export const getOrdersByRestaurantId = (restaurantId: string) => {
  return Order.find({ restaurantId });
};

export const updateOrder = async (id: string, data: any, userEmail?: string) => {
  const oldOrder = await Order.findById(id);
  if (!oldOrder) return null;

  const updatedOrder = await Order.findByIdAndUpdate(id, data, { new: true });

  // Hardcoded phone number for now (international format)
  const phoneNumber = '+94713161255'; // Replace with actual phone number

  if (updatedOrder && data.status && oldOrder.status !== data.status) {
    try {
      if (userEmail) {
        await sendOrderStatusEmail(userEmail, updatedOrder._id.toString(), data.status);
      }

      await sendOrderStatusSMS(phoneNumber, updatedOrder._id.toString(), data.status);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  return updatedOrder;
};

export const deleteOrder = async (id: string) => {
  return await Order.findByIdAndDelete(id);
};

export const getOrdersByUserId = (userId: string) => Order.find({ userId });

export const processOrderPayment = async (id: string, paymentDetails: any) => {
  // In a real implementation, you would integrate with payment gateway here
  // This is a simplified version
  const order = await Order.findById(id);
  
  if (!order) {
    throw new Error("Order not found");
  }
  
  if (order.paymentStatus === 'Paid') {
    throw new Error("Order is already paid");
  }
  
  // Update payment status to paid and order status to confirmed
  return await Order.findByIdAndUpdate(
    id,
    { 
      paymentStatus: 'Paid',
      status: 'Confirmed',
      paymentMethod: paymentDetails.method,
      // You might store transaction ID or other payment reference here
      paymentReference: paymentDetails.transactionId
    },
    { new: true }
  );
};

export const updateOrderStatus = async (id: string, status: string) => {
  return await Order.findByIdAndUpdate(
    id, 
    { status }, 
    { new: true }
  );
};