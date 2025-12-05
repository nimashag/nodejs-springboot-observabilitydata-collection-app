import { Request, Response } from "express";
import * as OrdersService from "../services/orders.service";
import { AuthenticatedRequest } from "../middlewares/auth";
import { fetchMenuItems, fetchRestaurant } from "../api/restaurant.api";
import stripe from '../utils/stripe';

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("▶️ Creating a new order:", req.body);

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

    console.log("✅ Created order with ID:", order._id);
    res.json(order);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  console.log("▶️ Fetching order with ID:", req.params.id);
  const order = await OrdersService.getOrderById(req.params.id);
  if (!order) {
    console.warn("Order not found:", req.params.id);
  } else {
    console.log("Order found:", order._id);
  }
  res.json(order);
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    console.log("▶️ Fetching all orders");
    const orders = await OrdersService.getAllOrders();
    console.log(`Found ${orders.length} restaurants`);
    res.json(orders);
  } catch (err) {
    console.error("Error getting all orders:", err);
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
    console.error("Error updating delivery address:", error);
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
    console.error("Error updating special instructions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//restaurantAdmin
export const getByRestaurantId = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;

    console.log(`▶️ Fetching orders for restaurant ID: ${restaurantId}`);

    const orders = await OrdersService.getOrdersByRestaurantId(restaurantId);

    console.log(
      `✅ Found ${orders.length} orders for restaurant ID: ${restaurantId}`
    );
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders by restaurant ID:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

//restaurantAdmin
export const update = async (req: Request, res: Response) => {
  try {
    console.log("▶️ Updating order ID:", req.params.id);

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

    console.log("✅ Updated order:", updated._id);
    res.json(updated);
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    console.log("▶️ Deleting order with ID:", req.params.id);

    const deletedOrder = await OrdersService.deleteOrder(req.params.id);

    if (!deletedOrder) {
      console.warn("Order not found for deletion:", req.params.id);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("✅ Deleted order:", req.params.id);
    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCurrentUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    console.log(`▶️ Fetching orders for user: ${req.user.id}`);
    const orders = await OrdersService.getOrdersByUserId(req.user.id);
    console.log(`Found ${orders.length} orders for user`);
    
    res.json(orders);
  } catch (err) {
    console.error("Error getting user orders:", err);
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

    console.log("✅ Created Payment Intent:", paymentIntent.id);

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      items: itemDetails
    });
  } catch (error) {
    console.error("Error creating Payment Intent:", error);
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
    console.error(`⚠️  Webhook signature verification failed:`, err.message);
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
    
    console.log('✅ PaymentIntent was successful:', paymentIntent.id);

    // Find the order associated with paymentIntentId and mark it as Paid
    // Example if you store paymentIntentId in your Order Model
    // Or match by totalAmount and status
  } else {
    console.warn(`Unhandled event type ${event.type}`);
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
    console.error("Error processing payment:", error);
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
    console.error("Error marking order as paid:", err);
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
    
    console.log(`▶️ Updating status for order ${orderId} to ${status}`);
    const updatedOrder = await OrdersService.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log(`✅ Updated order status: ${updatedOrder._id}`);
    res.json(updatedOrder);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};