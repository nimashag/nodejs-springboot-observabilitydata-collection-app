import { Types } from "mongoose";
import { Order } from '../models/order.model';
import { sendOrderStatusEmail } from './email.service';
import { sendOrderStatusSMS } from './sms.service'; 
import { logError, logInfo, logWarn } from '../utils/logger';

export const createOrder = async (data: any, userId: string) => {
  logInfo("order.service.create.start", {
    userId,
    restaurantId: data.restaurantId,
    itemsCount: Array.isArray(data.items) ? data.items.length : 0,
    totalAmount: data.totalAmount,
    paymentMethod: data.paymentMethod,
  });

  try {
    const order = await Order.create({ ...data, userId });
    logInfo("order.service.create.success", {
      orderId: order._id.toString(),
      userId,
      restaurantId: order.restaurantId?.toString() || "unknown",
      totalAmount: order.totalAmount,
      status: order.status,
    });
    return order;
  } catch (err) {
    logError("order.service.create.error", { userId, restaurantId: data.restaurantId }, err as Error);
    throw err;
  }
};

export const getOrderById = async (id: string) => {
  logInfo("order.service.get_by_id.start", { orderId: id });
  try {
    const order = await Order.findById(id);
    if (!order) {
      logWarn("order.service.get_by_id.not_found", { orderId: id });
      return null;
    }
    logInfo("order.service.get_by_id.success", {
      orderId: id,
      userId: order.userId?.toString() || "unknown",
      restaurantId: order.restaurantId?.toString() || "unknown",
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
    return order;
  } catch (err) {
    logError("order.service.get_by_id.error", { orderId: id }, err as Error);
    throw err;
  }
};

export const getAllOrders = async () => {
  logInfo("order.service.get_all.start", {});
  try {
    const orders = await Order.find();
    logInfo("order.service.get_all.success", { count: orders.length });
    return orders;
  } catch (err) {
    logError("order.service.get_all.error", {}, err as Error);
    throw err;
  }
};

//restaurantAdmin
export const getOrdersByRestaurantId = async (restaurantId: string) => {
  logInfo("order.service.get_by_restaurant.start", { restaurantId });
  try {
    const orders = await Order.find({ restaurantId });
    logInfo("order.service.get_by_restaurant.success", {
      restaurantId,
      count: orders.length,
    });
    return orders;
  } catch (err) {
    logError("order.service.get_by_restaurant.error", { restaurantId }, err as Error);
    throw err;
  }
};

export const updateOrder = async (id: string, data: any, userEmail?: string) => {
  const fieldsToUpdate = Object.keys(data).filter(key => data[key] !== undefined);
  logInfo("order.service.update.start", {
    orderId: id,
    fieldsToUpdate,
    hasStatusChange: !!data.status,
    hasEmail: !!userEmail,
  });

  const oldOrder = await Order.findById(id);
  if (!oldOrder) {
    logWarn("order.service.update.not_found", { orderId: id });
    return null;
  }

  const oldStatus = oldOrder.status;
  const updatedOrder = await Order.findByIdAndUpdate(id, data, { new: true });

  if (!updatedOrder) {
    logWarn("order.service.update.update_failed", { orderId: id });
    return null;
  }

  // Hardcoded phone number for now (international format)
  const phoneNumber = '+94713161255'; // Replace with actual phone number

  if (data.status && oldStatus !== data.status) {
    logInfo("order.service.update.status_changed", {
      orderId: id,
      oldStatus,
      newStatus: data.status,
    });

    try {
      if (userEmail) {
        logInfo("order.service.update.sending_email", {
          orderId: id,
          email: userEmail,
          status: data.status,
        });
        await sendOrderStatusEmail(userEmail, updatedOrder._id.toString(), data.status);
      }

      logInfo("order.service.update.sending_sms", {
        orderId: id,
        phoneNumber,
        status: data.status,
      });
      await sendOrderStatusSMS(phoneNumber, updatedOrder._id.toString(), data.status);

      logInfo("order.service.update.notifications_sent", {
        orderId: id,
        status: data.status,
      });
    } catch (error) {
      logError('order.service.update.notify.error', {
        orderId: updatedOrder._id.toString(),
        status: data.status,
      }, error as Error);
    }
  }

  logInfo("order.service.update.success", {
    orderId: id,
    fieldsUpdated: fieldsToUpdate.length,
    status: updatedOrder.status,
    paymentStatus: updatedOrder.paymentStatus,
  });

  return updatedOrder;
};

export const deleteOrder = async (id: string) => {
  logInfo("order.service.delete.start", { orderId: id });
  try {
    const order = await Order.findById(id);
    if (!order) {
      logWarn("order.service.delete.not_found", { orderId: id });
      return null;
    }

    const deleted = await Order.findByIdAndDelete(id);
    logInfo("order.service.delete.success", {
      orderId: id,
      userId: order.userId?.toString() || "unknown",
      restaurantId: order.restaurantId?.toString() || "unknown",
      status: order.status,
    });
    return deleted;
  } catch (err) {
    logError("order.service.delete.error", { orderId: id }, err as Error);
    throw err;
  }
};

export const getOrdersByUserId = async (userId: string) => {
  logInfo("order.service.get_by_user.start", { userId });
  try {
    const orders = await Order.find({ userId });
    logInfo("order.service.get_by_user.success", {
      userId,
      count: orders.length,
    });
    return orders;
  } catch (err) {
    logError("order.service.get_by_user.error", { userId }, err as Error);
    throw err;
  }
};

export const processOrderPayment = async (id: string, paymentDetails: any) => {
  logInfo("order.service.process_payment.start", {
    orderId: id,
    paymentMethod: paymentDetails.method,
    transactionId: paymentDetails.transactionId,
  });

  try {
    const order = await Order.findById(id);
    
    if (!order) {
      logWarn("order.service.process_payment.not_found", { orderId: id });
      throw new Error("Order not found");
    }
    
    if (order.paymentStatus === 'Paid') {
      logWarn("order.service.process_payment.already_paid", {
        orderId: id,
        currentPaymentStatus: order.paymentStatus,
      });
      throw new Error("Order is already paid");
    }

    logInfo("order.service.process_payment.updating", {
      orderId: id,
      oldPaymentStatus: order.paymentStatus,
      oldStatus: order.status,
      newPaymentStatus: 'Paid',
      newStatus: 'Confirmed',
    });
    
    // Update payment status to paid and order status to confirmed
    const updated = await Order.findByIdAndUpdate(
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

    logInfo("order.service.process_payment.success", {
      orderId: id,
      paymentMethod: paymentDetails.method,
      transactionId: paymentDetails.transactionId,
      status: updated?.status,
      paymentStatus: updated?.paymentStatus,
    });

    return updated;
  } catch (err) {
    logError("order.service.process_payment.error", {
      orderId: id,
      paymentMethod: paymentDetails.method,
    }, err as Error);
    throw err;
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  logInfo("order.service.update_status.start", {
    orderId: id,
    newStatus: status,
  });

  try {
    const oldOrder = await Order.findById(id);
    if (!oldOrder) {
      logWarn("order.service.update_status.not_found", { orderId: id });
      return null;
    }

    const oldStatus = oldOrder.status;
    const updated = await Order.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );

    logInfo("order.service.update_status.success", {
      orderId: id,
      oldStatus,
      newStatus: status,
    });

    return updated;
  } catch (err) {
    logError("order.service.update_status.error", {
      orderId: id,
      newStatus: status,
    }, err as Error);
    throw err;
  }
};