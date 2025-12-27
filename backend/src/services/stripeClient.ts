import Stripe from 'stripe';
import { config } from '../config/env';

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true
});
