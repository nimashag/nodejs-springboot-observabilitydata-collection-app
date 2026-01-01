import { Request, Response } from "express";
import { sendEmail } from "../services/email.service";
import {
  findAvailableDriver,
  markDriverAvailability,
} from "../services/driver.service";
import {
  createDelivery,
  findDeliveryByOrderId,
  updateDeliveryAcceptance,
  findAssignedDeliveriesForDriver,
  findAllDeliveriesForDriver,
  updateDeliveryStatusById,
} from "../services/delivery.service";
import { Driver } from "../models/driver.model";
import { httpClient } from "../utils/httpClient";
import { Delivery } from "../models/delivery.model";
import { sendSMS } from "../services/sms.service";
import { logError, logInfo, logWarn } from "../utils/logger";

const ORDER_SERVICE_BASE_URL = "http://localhost:3002/api/orders";
const USER_SERVICE_BASE_URL = "http://localhost:3003/api/auth";

export const assignDriverAutomatically = async (
  req: Request,
  res: Response
) => {
  const { orderId, customerId, restaurantId } = req.body;
  logInfo("delivery.assign.auto.start", {
    orderId,
    customerId,
    restaurantId,
    requestId: req.requestId,
  });
  try {
    const restaurantRes = await httpClient.get(
      `http://localhost:3001/api/restaurants/${restaurantId}`
    ); //3001
    const restaurant = restaurantRes.data;

    if (!restaurant.available)
      return res.status(400).json({ message: "Restaurant not available" });

    const orderRes = await httpClient.get(
      `http://localhost:3002/api/orders/${orderId}`
    );
    const order = orderRes.data;

    const driver = await findAvailableDriver(
      restaurant.location,
      order.deliveryAddress.city
    );

    if (!driver)
      return res.status(404).json({ message: "No matching driver available" });

    const delivery = await createDelivery({
      orderId,
      customerId,
      restaurantLocation: restaurant.location,
      deliveryLocation: order.deliveryAddress.city,
      driverId: driver._id.toString(),
    });

    await markDriverAvailability(driver._id.toString(), false);

    logInfo("delivery.assign.auto.success", {
      orderId,
      deliveryId: delivery._id,
      driverId: driver._id.toString(),
    });
    res.status(200).json({ message: "Driver assigned", delivery });
  } catch (error: any) {
    logError("delivery.assign.auto.error", { orderId, customerId, restaurantId }, error);
    res
      .status(500)
      .json({ message: "Error assigning driver", error: error.message });
  }
};

export const respondToAssignment = async (req: Request, res: Response) => {
  const { orderId, action } = req.body;

  try {
    const delivery = await findDeliveryByOrderId(orderId);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });

    await updateDeliveryAcceptance(delivery, action);

    if (action === "decline") {
      logInfo("delivery.assign.declined", { orderId });

      try {
        const orderRes = await httpClient.get(
          `${ORDER_SERVICE_BASE_URL}/${orderId}`
        );
        const order = orderRes.data;

        const newDriver = await findAvailableDriver(
          delivery.restaurantLocation,
          order.deliveryAddress.city
        );

        if (newDriver) {
          logInfo("delivery.assign.reassign.found", {
            orderId,
            newDriverId: newDriver._id.toString(),
          });

          // Assign delivery to new driver
          delivery.driverId = newDriver._id.toString();
          delivery.acceptStatus = "Pending";
          delivery.status = "Assigned";
          await delivery.save();

          await markDriverAvailability(newDriver._id.toString(), false);

          return res.status(200).json({
            message: "Delivery reassigned to another driver",
            delivery,
          });
        } else {
          logWarn("delivery.assign.reassign.none", { orderId });
          // Delivery remains pending without a driver
          delivery.driverId = undefined;
          delivery.acceptStatus = "Pending";
          delivery.status = "Pending";
          await delivery.save();

          return res.status(200).json({
            message: "No driver available to reassign. Delivery pending.",
            delivery,
          });
        }
      } catch (error) {
        logError("delivery.assign.reassign.error", { orderId }, error as Error);
        return res.status(500).json({
          message: "Error reassigning delivery",
          error: (error as Error).message,
        });
      }
    }

    // Normal accept case
    return res
      .status(200)
      .json({ message: `Assignment ${action}ed`, delivery });
  } catch (error: any) {
    logError("delivery.assign.respond.error", { orderId, action }, error);
    res.status(500).json({
      message: "Error responding to assignment",
      error: error.message,
    });
  }
};
export const getAssignedOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    logInfo("delivery.assigned.list.start", { userId });

    // 1️⃣ Find Driver by userId
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    logInfo("delivery.assigned.driver.found", { userId, driverId: driver._id.toString() });

    // 2️⃣ Find assigned deliveries
    const deliveries = await findAssignedDeliveriesForDriver(
      driver._id.toString()
    );

    // 3️⃣ Fetch full deliveryAddress for each order
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const orderRes = await httpClient.get(
            `${ORDER_SERVICE_BASE_URL}/${delivery.orderId}`
          );
          const order = orderRes.data;

          return {
            ...delivery.toObject(), // convert mongoose document to plain object
            deliveryAddress: order.deliveryAddress || null,
            paymentStatus: order.paymentStatus || null,
            customerId: order.userId || null,
            restaurantId: order.restaurantId || null,
            specialInstructions: order.specialInstructions || "",
          };
        } catch (err) {
          logWarn("delivery.assigned.order.fetchFailed", {
            orderId: delivery.orderId,
            error: (err as Error).message,
          });
          return {
            ...delivery.toObject(),
            deliveryAddress: null,
          };
        }
      })
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    logError("delivery.assigned.list.error", { userId: (req as any).user?.id }, error);
    res.status(500).json({
      message: "Error fetching assigned deliveries",
      error: error.message,
    });
  }
};

// ✅ Fetch All My Deliveries (Ongoing + Completed)
export const getMyDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      logWarn("delivery.my_deliveries.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("delivery.my_deliveries.start", { userId });
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      logWarn("delivery.my_deliveries.driver_not_found", { userId });
      return res.status(404).json({ message: "Driver not found" });
    }

    logInfo("delivery.my_deliveries.driver.found", {
      userId,
      driverId: driver._id.toString(),
    });

    const deliveries = await findAllDeliveriesForDriver(driver._id.toString());

    logInfo("delivery.my_deliveries.fetching_orders", {
      userId,
      driverId: driver._id.toString(),
      deliveriesCount: deliveries.length,
    });

    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const orderRes = await httpClient.get(
            `${ORDER_SERVICE_BASE_URL}/${delivery.orderId}`
          );
          const order = orderRes.data;

          return {
            ...delivery.toObject(),
            deliveryAddress: order.deliveryAddress || null,
          };
        } catch (err) {
          logWarn("delivery.my_deliveries.order.fetch_failed", {
            orderId: delivery.orderId,
            deliveryId: delivery._id.toString(),
            error: (err as Error).message,
          });
          return {
            ...delivery.toObject(),
            deliveryAddress: null,
          };
        }
      })
    );

    logInfo("delivery.my_deliveries.success", {
      userId,
      driverId: driver._id.toString(),
      count: enhancedDeliveries.length,
    });

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    logError("delivery.my_deliveries.error", {
      userId: (req as any).user?.id,
    }, error);
    res
      .status(500)
      .json({ message: "Error fetching deliveries", error: error.message });
  }
};

// ✅ Update Delivery Status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deliveryId } = req.params;
    const { status } = req.body;

    logInfo("delivery.update_status.start", {
      deliveryId,
      userId,
      newStatus: status,
    });

    const allowedStatuses = ["PickedUp", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      logWarn("delivery.update_status.invalid_status", {
        deliveryId,
        userId,
        status,
        allowedStatuses,
      });
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedDelivery = await updateDeliveryStatusById(deliveryId, status);
    if (!updatedDelivery) {
      logWarn("delivery.update_status.not_found", {
        deliveryId,
        userId,
      });
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Step 2: If the status is "Delivered", send an email to the customer
    if (status === "Delivered") {
      // Fetch the order details to get the userId
      logInfo("delivery.status.fetchOrder.start", { orderId: updatedDelivery.orderId });
      const orderRes = await httpClient.get(
        `${ORDER_SERVICE_BASE_URL}/${updatedDelivery.orderId}`
      );
      const order = orderRes.data;
      logInfo("delivery.status.fetchOrder.success", { orderId: updatedDelivery.orderId });

      // Fetch the customer details from the user service using userId
      const userRes = await httpClient.get(
        `${USER_SERVICE_BASE_URL}/${order.userId}`
      );
      const user = userRes.data;
      logInfo("delivery.status.fetchUser.success", { userId: user._id });

      // Email details
      // const customerEmail = 'lavinduyomith2016@gmail.com';
      const customerEmail = "dev40.emailtest@gmail.com";
      const customerName = user.name;
      const deliveryAddress = order.deliveryAddress;
      const customerPhone = "+94778964821"; //have to change this to the user phone number

      // Email subject and content
      const subject = `Your Order with HungerJet has been Delivered!`;
      const text = `
        Hello ${customerName},\n\n
        We are happy to inform you that your order with HungerJet has been successfully delivered to your address: 
        ${deliveryAddress?.street}, ${deliveryAddress?.city}.\n\n
        Thank you for choosing HungerJet, and we look forward to serving you again soon!\n\n
        Best regards,\n
        HungerJet Team
      `;

      const message = `Hello, your order has been delivered to ${deliveryAddress?.street}, ${deliveryAddress?.city}. Thank you for choosing HungerJet!`;

      // Send the email to the customer
      if (customerEmail) {
        logInfo("delivery.status.notify.email", { to: customerEmail, orderId: updatedDelivery.orderId });
        await sendEmail(customerEmail, subject, text);
      }
      // Send SMS if the phone number exists
      if (customerPhone) {
        logInfo("delivery.status.notify.sms", { to: customerPhone, orderId: updatedDelivery.orderId });
        await sendSMS(customerPhone, message);
      }
    }

    logInfo("delivery.update_status.success", {
      deliveryId,
      userId,
      orderId: updatedDelivery.orderId,
      status,
    });

    res.status(200).json({
      message: "Delivery status updated successfully",
      updatedDelivery,
    });
  } catch (error: any) {
    logError("delivery.update_status.error", {
      deliveryId: req.params.deliveryId,
      userId: (req as any).user?.id,
      status,
    }, error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
};
