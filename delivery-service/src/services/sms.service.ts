import axios from 'axios';

// TextIt API endpoint and credentials
const TEXTIT_API_URL = ' https://api.textit.biz/';
const TEXTIT_API_KEY = '2204gkd1611443b55dtd1576adh8708'; 

// Function to send SMS
export const sendSMS = async (to: string, message: string) => {
  try {
    const response = await axios.post(
      TEXTIT_API_URL,
      {
        // Parameters for sending the message
        to: '+94778964821',  
        text: message,  // The content of the message
      },
      {
        headers: {
            'X-API-VERSION': 'V1',  // TextIt API version
            'Authorization': `Basic ${TEXTIT_API_KEY}`,  // Authorization header with API key
            'Content-Type': 'application/json'  // Set the content type to JSON
          }
      }
    );
    
    // Check the response to ensure the message was sent
    console.log('SMS sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
};
