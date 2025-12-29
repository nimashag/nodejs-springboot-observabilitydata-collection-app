import httpClient from '../utils/httpClient';

export const fetchAssignedOrders = async () => {
  return httpClient.get('/api/delivery/assigned-orders');
};

export const respondToAssignment = async (orderId: string, action: 'accept' | 'decline') => {
  return httpClient.post('/api/delivery/respond', { orderId, action });
};
