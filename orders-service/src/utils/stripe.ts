import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default stripe;