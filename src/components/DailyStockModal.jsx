import React, { useState, useEffect } from 'react';
import { getSaleItems, getStockInItems } from '../services/products'; // Import both functions
import { formatPrice } from '../utils/formatPrice';

export default function DailyStockModal({ selectedDate, onClose }) {
  const [stockInDetails, setStockInDetails] = useState([]);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalStockInCost, setTotalStockInCost] = useState(0); // New state
  const [totalSalesAmount, setTotalSalesAmount] = useState(0); // New state
  const [totalGrossProfit, setTotalGrossProfit] = useState(0); // New state



  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        const allSaleItems = await getSaleItems();
        const allStockInItems = await getStockInItems();

        const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

        // Filter sales for the selected date
        const filteredSales = allSaleItems.filter(item => {
          const itemDate = new Date(item.date);
          const itemDateStr = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
          return itemDateStr === selectedDateStr;
        });
        setSaleDetails(filteredSales);
        setTotalSalesAmount(filteredSales.reduce((sum, item) => sum + item.amount, 0)); // Calculate total sales
        setTotalGrossProfit(filteredSales.reduce((sum, item) => sum + item.gross_profit, 0)); // Calculate total gross profit

        // Filter stock-in for the selected date
        const filteredStockIn = allStockInItems.filter(item => {
          const itemDate = new Date(item.date);
          const itemDateStr = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
          return itemDateStr === selectedDateStr;
        });

        setStockInDetails(filteredStockIn); // Use filteredStockIn directly
        // Calculate total stock-in cost from *original* filtered items
        setTotalStockInCost(filteredStockIn.reduce((sum, item) => sum + item.total_cost, 0));
      } catch (error) {
        console.error('Error fetching daily stock details:', error.message);
      } finally {
        setLoading(false);
      }
    }

    if (selectedDate) {
      fetchDetails();
    }
  }, [selectedDate]);

  if (!selectedDate) return null; // Don't render if no date is selected

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-[95vw] max-w-lg md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-2xl font-bold">Details for {formattedDate}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-3xl leading-none font-semibold">&times;</button>
        </div>

        {loading ? (
          <p className="text-center p-4">Loading details...</p>
        ) : (
          <div className="space-y-6">
            {/* Stock In Section */}
            <div>
              <h4 className="text-xl font-semibold mb-2 text-black-700">Stock In</h4>
              {stockInDetails.length === 0 ? (
                <p>No stock-in recorded for this day.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border text-left">Product</th>
                        <th className="p-2 border text-left">SKU</th>
                        <th className="p-2 border text-right">Qty</th>
                        <th className="p-2 border text-right">Item Cost</th>
                        <th className="p-2 border text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockInDetails.map((item, index) => ( // stockInDetails is now individual items
                        <tr key={index} className="border-t"> {/* Use index for key when not aggregated */}
                          <td className="p-2 border">{item.product_name}</td>
                          <td className="p-2 border">{item.sku || '-'}</td>
                          <td className="p-2 border text-right">{item.quantity}</td>
                          <td className="p-2 border text-right">{formatPrice(item.item_cost)}</td> {/* Item Cost */}
                          <td className="p-2 border text-right">{formatPrice(item.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {stockInDetails.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="4" className="p-2 border text-right">Today's Total Cost:</td> {/* colSpan adjusted to 4 */}
                          <td className="p-2 border text-right">{formatPrice(totalStockInCost)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Sales (Stock Out) Section */}
            <div>
              <h4 className="text-xl font-semibold mb-2 text-green-700">Sales (Stock Out)</h4>
              {saleDetails.length === 0 ? (
                <p>No sales recorded for this day.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border text-left">Product</th>
                        <th className="p-2 border text-left">SKU</th>
                        <th className="p-2 border text-right">Qty</th>
                        <th className="p-2 border text-right">Selling Price</th>
                        <th className="p-2 border text-right">Total Sold</th>
                        <th className="p-2 border text-right">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleDetails.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 border">{item.product_name}</td>
                          <td className="p-2 border">{item.sku || '-'}</td>
                          <td className="p-2 border text-right">{item.quantity}</td>
                          <td className="p-2 border text-right">{formatPrice(item.selling_price)}</td>
                          <td className="p-2 border text-right">{formatPrice(item.amount)}</td>
                          <td className="p-2 border text-right">{formatPrice(item.gross_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {saleDetails.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="4" className="p-2 border text-right">Today's Total Sale:</td>
                          <td className="p-2 border text-right">{formatPrice(totalSalesAmount)}</td>
                          <td></td> {/* Empty cell for Gross Profit column */}
                        </tr>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="4" className="p-2 border text-right">Today's Total Gross Profit:</td>
                          <td></td> {/* Empty cell for Total Sold column */}
                          <td className="p-2 border text-right">{formatPrice(totalGrossProfit)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
