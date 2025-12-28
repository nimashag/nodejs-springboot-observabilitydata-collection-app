import { Request, Response } from "express";
import * as OrdersService from "../services/orders.service";
import { AuthenticatedRequest } from "../middlewares/auth";
import { fetchMenuItems, fetchRestaurant } from "../api/restaurant.api";
import stripe from '../utils/stripe';
import { logError, logInfo, logWarn } from "../utils/logger";

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logInfo("order.create.start", {
      userId: req.user?.id,
      restaurantId: req.body?.restaurantId,
      itemsCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
      totalAmount: req.body?.totalAmount,
    });

    const {
      items,
      status,
      deliveryAddress,
      totalAmount,
      paymentStatus,
      paymentMethod,
      specialInstructions,
      restaurantId,
    } = req.body;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // 🔗 Fetch menu items from the restaurant service
    const menuItems = await fetchMenuItems(restaurantId);
    if (!menuItems || menuItems.length === 0) {
      return res.status(400).json({ message: "No menu items found for this restaurant." });
    }

    const order = await OrdersService.createOrder(
      {
        items,
        status,
        deliveryAddress,
        totalAmount,
        paymentStatus,
        paymentMethod,
        specialInstructions,
        restaurantId,
      },
      req.user.id
    );

    logInfo("order.create.success", { orderId: order._id });
    res.json(order);
  } catch (err) {
    logError("order.create.error", { body: req.body }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    logInfo("order.getOne.start", { orderId: req.params.id });
    const order = await OrdersService.getOrderById(req.params.id);
    if (!order) {
      logWarn("order.getOne.notFound", { orderId: req.params.id });
      return res.status(404).json({ message: "Order not found" });
    }
    logInfo("order.getOne.found", { orderId: order._id });
    res.json(order);
  } catch (err: any) {
    // Handle CastError (invalid ObjectId format)
    if (err.name === 'CastError') {
      logWarn("order.getOne.invalidId", { orderId: req.params.id });
      return res.status(400).json({ message: "Invalid order ID format" });
    }
    logError("order.getOne.error", { orderId: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    logInfo("order.list.start");
    const orders = await OrdersService.getAllOrders();
    logInfo("order.list.success", { count: orders.length });
    res.json(orders);
  } catch (err) {
    logError("order.list.error", undefined, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Update delivery address
export const updateDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryAddress } = req.body;

    if (!deliveryAddress) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    const updatedOrder = await OrdersService.updateOrder(id, { deliveryAddress });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    logError("order.updateAddress.error", { orderId: req.params.id }, error as Error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update special instructions
export const updateSpecialInstructions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { specialInstructions } = req.body;

    if (specialInstructions === undefined) {
      return res.status(400).json({ message: "Special instructions are required" });
    }

    const updatedOrder = await OrdersService.updateOrder(id, { specialInstructions });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    logError("order.updateSpecialInstructions.error", { orderId: req.params.id }, error as Error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//restaurantAdmin
export const getByRestaurantId = async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId;
  try {
    logInfo("order.byRestaurant.start", { restaurantId });

    const orders = await OrdersService.getOrdersByRestaurantId(restaurantId);

    logInfo("order.byRestaurant.success", { restaurantId, count: orders.length });
    res.json(orders);
  } catch (err) {
    logError("order.byRestaurant.error", { restaurantId }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

//restaurantAdmin
export const update = async (req: Request, res: Response) => {
  try {
    logInfo("order.update.start", { orderId: req.params.id });

    const updateData: any = { ...req.body };

    // Get the order to fetch userId and user's email
    const order = await OrdersService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Get user email
    
    const userEmail = "dev40.emailtest@gmail.com";

    const updated = await OrdersService.updateOrder(req.params.id, updateData, userEmail);

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.update.success", { orderId: updated._id });
    res.json(updated);
  } catch (err) {
    logError("order.update.error", { orderId: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    logInfo("order.delete.start", { orderId: req.params.id });

    const deletedOrder = await OrdersService.deleteOrder(req.params.id);

    if (!deletedOrder) {
      logWarn("order.delete.notFound", { orderId: req.params.id });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.delete.success", { orderId: req.params.id });
    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    logError("order.delete.error", { orderId: req.params.id }, err as Error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCurrentUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    logInfo("order.byUser.start", { userId: req.user.id });
    const orders = await OrdersService.getOrdersByUserId(req.user.id);
    logInfo("order.byUser.success", { userId: req.user.id, count: orders.length });
    
    res.json(orders);
  } catch (err) {
    logError("order.byUser.error", { userId: req.user?.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { totalAmount, items = [] } = req.body;
    const deliveryFee = 3.99;
    const tax = totalAmount * 0.08;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Total amount must be greater than 0." });
    }

    const itemDetails = Array.isArray(req.body.items)
  ? req.body.items.map((item: any) => ({
      name: item.name,
      price: item.price,
    }))
  : [];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((totalAmount + deliveryFee + tax) * 100), // 💳 Stripe accepts amounts in cents
      currency: 'usd', // or your preferred currency
      payment_method_types: ['card'],
    });

    logInfo("payment.intent.created", { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      items: itemDetails
    });
  } catch (error) {
    logError("payment.intent.error", undefined, error as Error);
    res.status(500).json({ message: "Something went wrong while creating payment intent" });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET as string; // <-- we'll get it soon
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    logError("payment.webhook.verifyFailed", { signature: sig }, err as Error);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const orderId = paymentIntent.metadata.orderId; // Assuming you store the orderId in metadata
    await OrdersService.processOrderPayment(orderId, {
      method: 'Stripe',
      transactionId: paymentIntent.id,
    });
    
    logInfo('payment.intent.succeeded', { paymentIntentId: paymentIntent.id, orderId });

    // Find the order associated with paymentIntentId and mark it as Paid
    // Example if you store paymentIntentId in your Order Model
    // Or match by totalAmount and status
  } else {
    logWarn("payment.webhook.unhandledEvent", { eventType: event.type });
  }

  res.json({ received: true });
};

export const markOrderPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    // Call the service to update the order's payment status and status
    const updatedOrder = await OrdersService.processOrderPayment(id, {
      method: paymentMethod,
      transactionId: transactionId,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    logError("payment.process.error", { orderId: req.params.id }, error as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const markOrderAsPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    if (!paymentMethod || !transactionId) {
      return res.status(400).json({ message: "Payment method and transaction ID are required" });
    }

    const updatedOrder = await OrdersService.processOrderPayment(id, {
      transactionId,
      method: paymentMethod || 'Stripe'
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (err) {
    logError("payment.markPaid.error", { orderId: req.params.id }, err as Error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const { status } = req.body;
    const orderId = req.params.id;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // For restaurant admin, verify they own this order's restaurant
    if (req.user.role === 'restaurantAdmin') {
      const order = await OrdersService.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if admin has restaurantId and if order belongs to admin's restaurant
      if (!req.user.restaurantId || order.restaurantId.toString() !== req.user.restaurantId) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
    }
    
    logInfo("order.status.update.start", { orderId, status, role: req.user.role });
    const updatedOrder = await OrdersService.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    logInfo("order.status.update.success", { orderId: updatedOrder._id, status });
    res.json(updatedOrder);
  } catch (err) {
    logError("order.status.update.error", { orderId: req.params.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};