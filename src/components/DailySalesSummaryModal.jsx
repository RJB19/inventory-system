import React from 'react';
import { formatPrice } from '../utils/formatPrice';

export default function DailySalesSummaryModal({ selectedDate, dailyDataForDate, onClose }) {
  if (!selectedDate || !dailyDataForDate) return null;

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-[90vw] max-w-sm shadow-lg rounded-md bg-white"> {/* Smaller modal */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold">Summary for {formattedDate}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-3xl leading-none font-semibold">&times;</button>
        </div>

        <div className="space-y-4">
          <p>Total Sales: <span className="font-semibold text-green-700">{formatPrice(dailyDataForDate.sales)}</span></p>
          <p>Gross Profit: <span className="font-semibold text-blue-700">{formatPrice(dailyDataForDate.profit)}</span></p>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
