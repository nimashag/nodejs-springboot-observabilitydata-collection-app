import { useEffect, useState } from 'react';
import axios from 'axios';
import DriverLayout from './DriverLayout';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiBase, userUrl, restaurantUrl, orderUrl, deliveryUrl } from "../../../api";

interface Delivery {
  _id: string;
  orderId: string;
  restaurantLocation: string;
  deliveryLocation: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: 'Pending' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled';
  acceptStatus: 'Pending' | 'Accepted' | 'Declined';
}

const DriverMyDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDeliveryId, setModalDeliveryId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'PickedUp' | 'Delivered' | 'Cancelled' | null>(null);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${deliveryUrl}/api/delivery/my-deliveries`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setDeliveries(res.data);
      } catch (error) {
        console.error('Error fetching deliveries', error);
        toast.error('Failed to fetch deliveries.');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  const confirmAction = (deliveryId: string, action: 'PickedUp' | 'Delivered' | 'Cancelled') => {
    setModalDeliveryId(deliveryId);
    setModalAction(action);
    setShowModal(true);
  };

  const handleConfirmedUpdate = async () => {
    if (!modalDeliveryId || !modalAction) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${deliveryUrl}/api/delivery/delivery/${modalDeliveryId}/status`, 
        { status: modalAction },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(`Delivery marked as ${modalAction}`);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating delivery status', error);
      toast.error('Failed to update delivery status.');
    } finally {
      setShowModal(false);
    }
  };

  const ongoingDeliveries = deliveries.filter(
    (d) => d.acceptStatus === 'Accepted' 
  );

  const completedDeliveries = deliveries.filter(
    (d) => d.status === 'Delivered' || d.status === 'Cancelled'
  );

  const statusBadge = (status: Delivery['status']) => {
    switch (status) {
      case 'Assigned':
        return <span className="inline-block bg-yellow-300 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold">Assigned</span>;
      case 'PickedUp':
        return <span className="inline-block bg-blue-300 text-blue-900 px-3 py-1 rounded-full text-xs font-semibold">Picked Up</span>;
      case 'Delivered':
        return <span className="inline-block bg-green-300 text-green-900 px-3 py-1 rounded-full text-xs font-semibold">Delivered</span>;
      case 'Cancelled':
        return <span className="inline-block bg-red-300 text-red-900 px-3 py-1 rounded-full text-xs font-semibold">Cancelled</span>;
      default:
        return null;
    }
  };

  if (loading) return <div className="p-6">Loading deliveries...</div>;

  return (
    <DriverLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">My Deliveries</h1>

        {/* Ongoing Deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Ongoing Deliveries</h2>
          {ongoingDeliveries.length === 0 ? (
            <p>No ongoing deliveries at the moment.</p>
          ) : (
            <div className="grid gap-6">
              {ongoingDeliveries.map((delivery) => (
                <div key={delivery._id} className="border p-4 rounded shadow-md bg-white">
                  <p><strong>Restaurant:</strong> {delivery.restaurantLocation}</p>
                  <p><strong>Customer Delivery Address:</strong> {delivery.deliveryAddress?.street}, {delivery.deliveryAddress?.city}</p>
                  <p><strong>Status:</strong> {statusBadge(delivery.status)}</p>

                  <div className="flex gap-3 mt-4">
                    {delivery.status === 'Assigned' && (
                      <button
                        onClick={() => confirmAction(delivery._id, 'PickedUp')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {delivery.status === 'PickedUp' && (
                      <button
                        onClick={() => confirmAction(delivery._id, 'Delivered')}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    <button
                      onClick={() => confirmAction(delivery._id, 'Cancelled')}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                    >
                      Cancel Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Deliveries */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Completed Deliveries</h2>
          {completedDeliveries.length === 0 ? (
            <p>No completed deliveries yet.</p>
          ) : (
            <div className="grid gap-6">
              {completedDeliveries.map((delivery) => (
                <div key={delivery._id} className="border p-4 rounded shadow-md bg-gray-100">
                  <p><strong>Restaurant:</strong> {delivery.restaurantLocation}</p>
                  <p><strong>Customer Delivery Address:</strong> {delivery.deliveryAddress?.street}, {delivery.deliveryAddress?.city}</p>
                  <p><strong>Status:</strong> {statusBadge(delivery.status)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ✅ Custom Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md text-center w-96">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                {modalAction === 'PickedUp' ? 'Confirm Pick Up' : modalAction === 'Delivered' ? 'Confirm Delivery' : 'Cancel Delivery'}
              </h2>
              <p className="mb-6">Are you sure you want to mark this delivery as <strong>{modalAction}</strong>?</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleConfirmedUpdate}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DriverLayout>
  );
};

export default DriverMyDeliveries;
