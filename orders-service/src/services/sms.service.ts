// services/sms.service.ts
import axios from 'axios';

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
      console.log('✅ SMS sent successfully');
    } else {
      console.error('❌ Failed to send SMS:', response.data);
    }
  } catch (error) {
    console.error('❌ Error sending SMS via TextIt.biz:', error);
  }
};
