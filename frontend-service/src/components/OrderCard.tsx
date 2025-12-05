import React from "react";
import { Minus, Plus, Trash } from "lucide-react";

const OrderCard = ({ order }: { order: any }) => {
  return (
    <div className="relative group">
      {/* Tooltip */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition bg-white text-black text-sm px-2 py-1 rounded shadow z-10">
        Order ID: {order.id}
      </div>

      {/* Card */}
      <div className="w-full max-w-md p-4 rounded-2xl border border-gray-200 bg-white shadow-[rgba(0,0,0,0.1)_0px_10px_20px] hover:shadow-[rgba(0,0,0,0.15)_0px_15px_30px] transform transition-all duration-300">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            {/* Restaurant & Items */}
            <div>
              <h3 className="text-lg font-semibold">
                {order.restaurantId?.name || "Restaurant"}
              </h3>
              <ul className="mt-2 space-y-2">
                {order.items.map((item: any, index: number) => (
                  <li
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="font-bold">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <button className="h-6 w-6 p-0 rounded bg-gray-200 hover:bg-gray-300 transition">
                        <Minus className="h-4 w-4 text-gray-700" />
                      </button>
                      <span>{item.quantity}</span>
                      <button className="h-6 w-6 p-0 rounded bg-gray-200 hover:bg-gray-300 transition">
                        <Plus className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Delete */}
            <button className="text-red-500 hover:text-red-600 transition">
              <Trash className="w-5 h-5" />
            </button>
          </div>

          {/* Amount */}
          <div className="text-right text-lg font-semibold text-gray-700">
            LKR {order.totalAmount.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
