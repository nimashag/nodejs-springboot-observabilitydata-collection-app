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
import axios from "axios";
import { Delivery } from "../models/delivery.model";
import { sendSMS } from "../services/sms.service";

const ORDER_SERVICE_BASE_URL = "http://localhost:3002/api/orders";
const USER_SERVICE_BASE_URL = "http://localhost:3003/api/auth";

export const assignDriverAutomatically = async (
  req: Request,
  res: Response
) => {
  const { orderId, customerId, restaurantId } = req.body;
  console.log(
    "Received orderId:",
    orderId,
    "customerId:",
    customerId,
    "restaurantId:",
    restaurantId
  );
  try {
    const restaurantRes = await axios.get(
      `http://localhost:3001/api/restaurants/${restaurantId}`
    ); //3001
    const restaurant = restaurantRes.data;

    if (!restaurant.available)
      return res.status(400).json({ message: "Restaurant not available" });

    const orderRes = await axios.get(
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

    res.status(200).json({ message: "Driver assigned", delivery });
  } catch (error: any) {
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
      console.log("Driver declined, attempting to reassign...");

      try {
        const orderRes = await axios.get(
          `${ORDER_SERVICE_BASE_URL}/${orderId}`
        );
        const order = orderRes.data;

        const newDriver = await findAvailableDriver(
          delivery.restaurantLocation,
          order.deliveryAddress.city
        );

        if (newDriver) {
          console.log("✅ Found another driver:", newDriver._id);

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
          console.log("❌ No available driver to reassign.");
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
        console.error("Error during reassignment:", error);
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
    console.error(error);
    res.status(500).json({
      message: "Error responding to assignment",
      error: error.message,
    });
  }
};
export const getAssignedOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    console.log("Token User ID:", userId);

    // 1️⃣ Find Driver by userId
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    console.log("Driver _id:", driver._id);

    // 2️⃣ Find assigned deliveries
    const deliveries = await findAssignedDeliveriesForDriver(
      driver._id.toString()
    );

    // 3️⃣ Fetch full deliveryAddress for each order
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const orderRes = await axios.get(
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
          console.error(
            `Failed fetching order ${delivery.orderId}:`,
            (err as Error).message
          );
          return {
            ...delivery.toObject(),
            deliveryAddress: null,
          };
        }
      })
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching assigned deliveries",
      error: error.message,
    });
  }
};

// ✅ Fetch All My Deliveries (Ongoing + Completed)
export const getMyDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const deliveries = await findAllDeliveriesForDriver(driver._id.toString());

    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const orderRes = await axios.get(
            `${ORDER_SERVICE_BASE_URL}/${delivery.orderId}`
          );
          const order = orderRes.data;

          return {
            ...delivery.toObject(),
            deliveryAddress: order.deliveryAddress || null,
          };
        } catch (err) {
          console.error(
            `Failed fetching order ${delivery.orderId}:`,
            (err as Error).message
          );
          return {
            ...delivery.toObject(),
            deliveryAddress: null,
          };
        }
      })
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching deliveries", error: error.message });
  }
};

// ✅ Update Delivery Status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["PickedUp", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedDelivery = await updateDeliveryStatusById(deliveryId, status);
    if (!updatedDelivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Step 2: If the status is "Delivered", send an email to the customer
    if (status === "Delivered") {
      // Fetch the order details to get the userId
      console.log("Fetching order details...");
      const orderRes = await axios.get(
        `${ORDER_SERVICE_BASE_URL}/${updatedDelivery.orderId}`
      );
      const order = orderRes.data;
      console.log("Order fetched:", order);

      // Fetch the customer details from the user service using userId
      const userRes = await axios.get(
        `${USER_SERVICE_BASE_URL}/${order.userId}`
      );
      const user = userRes.data;
      console.log("User fetched:", user);

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
        console.log("Sending email...");
        await sendEmail(customerEmail, subject, text);
      }
      // Send SMS if the phone number exists
      if (customerPhone) {
        console.log("Sending SMS...");
        await sendSMS(customerPhone, message);
      }
    }

    res.status(200).json({
      message: "Delivery status updated successfully",
      updatedDelivery,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
};
