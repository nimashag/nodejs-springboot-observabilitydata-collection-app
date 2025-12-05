import axios from 'axios';

export const fetchAssignedOrders = async () => {
  return axios.get('/api/delivery/assigned-orders');
};

export const respondToAssignment = async (orderId: string, action: 'accept' | 'decline') => {
  return axios.post('/api/delivery/respond', { orderId, action });
};
