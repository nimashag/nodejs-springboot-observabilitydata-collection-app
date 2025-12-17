// services/sms.service.ts
import axios from 'axios';
import { logError, logInfo } from '../utils/logger';

export const sendOrderStatusSMS = async (phoneNumber: string, orderId: string, status: string) => {
  try {
    const response = await axios.get('https://www.textit.biz/sendmsg', {
      params: {
        id: '94713161255',
        pw: '1892',
        to: phoneNumber,
        text: `🍽️ HungerJet: Your order (ID: #${orderId}) is now ${status}. Thank you for ordering with us!`
      }
    });

    if (response.data.includes('OK')) {
      logInfo('sms.sent.success', { phoneNumber, orderId, status });
    } else {
      logError('sms.sent.failed', { phoneNumber, orderId, status, response: response.data });
    }
  } catch (error) {
    logError('sms.sent.error', { phoneNumber, orderId, status }, error as Error);
  }
};
