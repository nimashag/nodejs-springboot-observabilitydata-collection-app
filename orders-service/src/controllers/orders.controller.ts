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

    if (!req.user) {
      logWarn("order.create.unauthorized", {
        restaurantId: req.body?.restaurantId,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔗 Fetch menu items from the restaurant service
    logInfo("order.create.fetching_menu_items", {
      restaurantId,
      userId: req.user.id,
    });
    const menuItems = await fetchMenuItems(restaurantId);
    if (!menuItems || menuItems.length === 0) {
      logWarn("order.create.no_menu_items", {
        restaurantId,
        userId: req.user.id,
        reason: "No menu items found for restaurant",
      });
      return res.status(400).json({ message: "No menu items found for this restaurant." });
    }
    logInfo("order.create.menu_items_fetched", {
      restaurantId,
      menuItemsCount: menuItems.length,
    });

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

    logInfo("order.create.success", {
      orderId: order._id.toString(),
      userId: req.user.id,
      restaurantId: order.restaurantId?.toString() || "unknown",
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
    res.json(order);
  } catch (err) {
    logError("order.create.error", {
      userId: req.user?.id,
      restaurantId: req.body?.restaurantId,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    logInfo("order.get_one.start", { orderId: req.params.id });
    const order = await OrdersService.getOrderById(req.params.id);
    if (!order) {
      logWarn("order.get_one.not_found", { orderId: req.params.id });
      return res.status(404).json({ message: "Order not found" });
    }
    logInfo("order.get_one.success", {
      orderId: order._id.toString(),
      userId: order.userId?.toString() || "unknown",
      restaurantId: order.restaurantId?.toString() || "unknown",
      status: order.status,
    });
    res.json(order);
  } catch (err: any) {
    // Handle CastError (invalid ObjectId format)
    if (err.name === 'CastError') {
      logWarn("order.get_one.invalid_id", { orderId: req.params.id });
      return res.status(400).json({ message: "Invalid order ID format" });
    }
    logError("order.get_one.error", { orderId: req.params.id }, err as Error);
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
export const updateDeliveryAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.update_delivery_address.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { deliveryAddress } = req.body;

    logInfo("order.update_delivery_address.start", {
      orderId: id,
      userId: req.user.id,
    });

    if (!deliveryAddress) {
      logWarn("order.update_delivery_address.missing_address", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(400).json({ message: "Delivery address is required" });
    }

    const updatedOrder = await OrdersService.updateOrder(id, { deliveryAddress });

    if (!updatedOrder) {
      logWarn("order.update_delivery_address.not_found", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.update_delivery_address.success", {
      orderId: id,
      userId: req.user.id,
    });
    res.json(updatedOrder);
  } catch (error) {
    logError("order.update_delivery_address.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, error as Error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update special instructions
export const updateSpecialInstructions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.update_special_instructions.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { specialInstructions } = req.body;

    logInfo("order.update_special_instructions.start", {
      orderId: id,
      userId: req.user.id,
    });

    if (specialInstructions === undefined) {
      logWarn("order.update_special_instructions.missing", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(400).json({ message: "Special instructions are required" });
    }

    const updatedOrder = await OrdersService.updateOrder(id, { specialInstructions });

    if (!updatedOrder) {
      logWarn("order.update_special_instructions.not_found", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.update_special_instructions.success", {
      orderId: id,
      userId: req.user.id,
    });
    res.json(updatedOrder);
  } catch (error) {
    logError("order.update_special_instructions.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, error as Error);
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
export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.update.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fieldsToUpdate = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    logInfo("order.update.start", {
      orderId: req.params.id,
      userId: req.user.id,
      role: req.user.role,
      fieldsToUpdate,
    });

    const updateData: any = { ...req.body };

    // Get the order to fetch userId and user's email
    const order = await OrdersService.getOrderById(req.params.id);
    if (!order) {
      logWarn("order.update.not_found", {
        orderId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    // Get user email
    const userEmail = "dev40.emailtest@gmail.com";

    const updated = await OrdersService.updateOrder(req.params.id, updateData, userEmail);

    if (!updated) {
      logWarn("order.update.update_failed", {
        orderId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.update.success", {
      orderId: updated._id.toString(),
      userId: req.user.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });
    res.json(updated);
  } catch (err) {
    logError("order.update.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.delete.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("order.delete.start", {
      orderId: req.params.id,
      userId: req.user.id,
    });

    const deletedOrder = await OrdersService.deleteOrder(req.params.id);

    if (!deletedOrder) {
      logWarn("order.delete.not_found", {
        orderId: req.params.id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("order.delete.success", {
      orderId: req.params.id,
      userId: req.user.id,
      status: deletedOrder.status,
    });
    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    logError("order.delete.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCurrentUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.get_by_user.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    logInfo("order.get_by_user.start", { userId: req.user.id });
    const orders = await OrdersService.getOrdersByUserId(req.user.id);
    logInfo("order.get_by_user.success", {
      userId: req.user.id,
      count: orders.length,
    });
    
    res.json(orders);
  } catch (err) {
    logError("order.get_by_user.error", { userId: req.user?.id }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("payment.intent.create.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { totalAmount, items = [] } = req.body;
    const deliveryFee = 3.99;
    const tax = totalAmount * 0.08;
    const finalAmount = totalAmount + deliveryFee + tax;

    logInfo("payment.intent.create.start", {
      userId: req.user.id,
      totalAmount,
      deliveryFee,
      tax,
      finalAmount,
      itemsCount: Array.isArray(items) ? items.length : 0,
    });

    if (!totalAmount || totalAmount <= 0) {
      logWarn("payment.intent.create.invalid_amount", {
        userId: req.user.id,
        totalAmount,
      });
      return res.status(400).json({ message: "Total amount must be greater than 0." });
    }

    const itemDetails = Array.isArray(req.body.items)
      ? req.body.items.map((item: any) => ({
          name: item.name,
          price: item.price,
        }))
      : [];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // 💳 Stripe accepts amounts in cents
      currency: 'usd', // or your preferred currency
      payment_method_types: ['card'],
    });

    logInfo("payment.intent.create.success", {
      paymentIntentId: paymentIntent.id,
      userId: req.user.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      items: itemDetails
    });
  } catch (error) {
    logError("payment.intent.create.error", {
      userId: req.user?.id,
      totalAmount: req.body?.totalAmount,
    }, error as Error);
    res.status(500).json({ message: "Something went wrong while creating payment intent" });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET as string; // <-- we'll get it soon
  
  logInfo("payment.webhook.received", {
    hasSignature: !!sig,
    contentType: req.get('content-type'),
  });

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    logInfo("payment.webhook.verified", {
      eventType: event.type,
      eventId: event.id,
    });
  } catch (err: any) {
    logError("payment.webhook.verify_failed", {
      hasSignature: !!sig,
      errorMessage: err.message,
    }, err as Error);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const orderId = paymentIntent.metadata?.orderId; // Assuming you store the orderId in metadata
    
    logInfo("payment.webhook.processing", {
      eventType: event.type,
      paymentIntentId: paymentIntent.id,
      orderId: orderId || "not_found_in_metadata",
      amount: paymentIntent.amount,
    });

    if (orderId) {
      try {
        await OrdersService.processOrderPayment(orderId, {
          method: 'Stripe',
          transactionId: paymentIntent.id,
        });
        
        logInfo('payment.webhook.processed', {
          paymentIntentId: paymentIntent.id,
          orderId,
        });
      } catch (err) {
        logError("payment.webhook.process_error", {
          paymentIntentId: paymentIntent.id,
          orderId,
        }, err as Error);
      }
    } else {
      logWarn("payment.webhook.no_order_id", {
        paymentIntentId: paymentIntent.id,
        reason: "OrderId not found in payment intent metadata",
      });
    }
  } else {
    logWarn("payment.webhook.unhandled_event", {
      eventType: event.type,
      eventId: event.id,
    });
  }

  res.json({ received: true });
};

export const markOrderPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("payment.mark_paid.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    logInfo("payment.mark_paid.start", {
      orderId: id,
      userId: req.user.id,
      paymentMethod,
      transactionId,
    });

    if (!paymentMethod || !transactionId) {
      logWarn("payment.mark_paid.missing_fields", {
        orderId: id,
        userId: req.user.id,
        hasPaymentMethod: !!paymentMethod,
        hasTransactionId: !!transactionId,
      });
      return res.status(400).json({ message: "Payment method and transaction ID are required" });
    }

    // Call the service to update the order's payment status and status
    const updatedOrder = await OrdersService.processOrderPayment(id, {
      method: paymentMethod,
      transactionId: transactionId,
    });

    if (!updatedOrder) {
      logWarn("payment.mark_paid.not_found", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("payment.mark_paid.success", {
      orderId: id,
      userId: req.user.id,
      paymentMethod,
      transactionId,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    });

    res.json(updatedOrder);
  } catch (error) {
    logError("payment.mark_paid.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, error as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const markOrderAsPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("payment.mark_as_paid.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    logInfo("payment.mark_as_paid.start", {
      orderId: id,
      userId: req.user.id,
      paymentMethod,
      transactionId,
    });

    if (!paymentMethod || !transactionId) {
      logWarn("payment.mark_as_paid.missing_fields", {
        orderId: id,
        userId: req.user.id,
        hasPaymentMethod: !!paymentMethod,
        hasTransactionId: !!transactionId,
      });
      return res.status(400).json({ message: "Payment method and transaction ID are required" });
    }

    const updatedOrder = await OrdersService.processOrderPayment(id, {
      transactionId,
      method: paymentMethod || 'Stripe'
    });

    if (!updatedOrder) {
      logWarn("payment.mark_as_paid.not_found", {
        orderId: id,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }

    logInfo("payment.mark_as_paid.success", {
      orderId: id,
      userId: req.user.id,
      paymentMethod,
      transactionId,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    });

    res.json(updatedOrder);
  } catch (err) {
    logError("payment.mark_as_paid.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logWarn("order.update_status.unauthorized", {
        orderId: req.params.id,
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { status } = req.body;
    const orderId = req.params.id;
    
    logInfo("order.update_status.start", {
      orderId,
      userId: req.user.id,
      role: req.user.role,
      newStatus: status,
    });
    
    if (!status) {
      logWarn("order.update_status.missing_status", {
        orderId,
        userId: req.user.id,
      });
      return res.status(400).json({ message: "Status is required" });
    }
    
    // For restaurant admin, verify they own this order's restaurant
    if (req.user.role === 'restaurantAdmin') {
      const order = await OrdersService.getOrderById(orderId);
      if (!order) {
        logWarn("order.update_status.not_found", {
          orderId,
          userId: req.user.id,
          role: req.user.role,
        });
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if admin has restaurantId and if order belongs to admin's restaurant
      if (!req.user.restaurantId || order.restaurantId?.toString() !== req.user.restaurantId) {
        logWarn("order.update_status.unauthorized_restaurant", {
          orderId,
          userId: req.user.id,
          userRestaurantId: req.user.restaurantId,
          orderRestaurantId: order.restaurantId?.toString(),
        });
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
    }
    
    const updatedOrder = await OrdersService.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      logWarn("order.update_status.update_failed", {
        orderId,
        userId: req.user.id,
      });
      return res.status(404).json({ message: "Order not found" });
    }
    
    logInfo("order.update_status.success", {
      orderId: updatedOrder._id.toString(),
      userId: req.user.id,
      oldStatus: updatedOrder.status,
      newStatus: status,
    });
    res.json(updatedOrder);
  } catch (err) {
    logError("order.update_status.error", {
      orderId: req.params.id,
      userId: req.user?.id,
    }, err as Error);
    res.status(500).json({ message: "Something went wrong" });
  }
};