import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { formatPrice } from '../utils/formatPrice';

export default function AllSales() {
  const [saleItems, setSaleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchSaleItems() {
      try {
        const items = await getSaleItems();
        setSaleItems(items);
      } catch (error) {
        console.error('Error fetching sale items:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSaleItems();
  }, []);

  const totalPages = Math.ceil(saleItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = saleItems.slice(startIndex, startIndex + itemsPerPage);



  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-3">Stock Out History</h2>
      {loading ? (
        <p>Loading...</p>
      ) : saleItems.length === 0 ? (
        <p>No sales found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left">Product</th>
                  <th className="p-3 border text-left">SKU</th>
                  <th className="p-3 border text-right">Quantity</th>
                  <th className="p-3 border text-right">Selling Price</th>
                  <th className="p-3 border text-right">Total Sold Amount</th>
                  <th className="p-3 border text-right">Gross Profit</th>
                  <th className="p-3 border text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 border">{item.product_name}</td>
                    <td className="p-3 border">{item.sku}</td>
                    <td className="p-3 border text-right">{item.quantity}</td>
                    <td className="p-3 border text-right">{formatPrice(item.selling_price)}</td>
                    <td className="p-3 border text-right">{formatPrice(item.amount)}</td>
                    <td className="p-3 border text-right">{formatPrice(item.gross_profit)}</td>
                    <td className="p-3 border">{new Date(item.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 space-y-2 md:space-y-0">
              {/* Page Info */}
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Prev
                </button>

                {/* Jump to Page Input */}
                <div className="flex items-center space-x-1 text-sm">
                  <label htmlFor="jump-to-page">Go to page:</label>
                  <input
                    id="jump-to-page"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={e => {
                      let pageNum = parseInt(e.target.value, 10);
                      if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
                      if (pageNum > totalPages) pageNum = totalPages;
                      setCurrentPage(pageNum);
                    }}
                    className="w-16 border rounded p-1 text-center"
                  />
                </div>

                <button
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
