import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatPrice'

export default function StockInHistory() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  async function fetchBatches() {
    const { data } = await supabase
      .from('stock_batches')
      .select(
        `
        id,
        quantity,
        cost_price,
        received_at,
        products ( name, sku )
      `
      )
      .order('received_at', { ascending: false })

    setBatches(data || [])
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchBatches()

    const subscription = supabase
      .channel('stock_in_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_batches' }, payload => {
        fetchBatches()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const totalPages = Math.ceil(batches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentBatches = batches.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-lg font-semibold mb-3">Stock In History</h2>

      {loading && <p>Loading...</p>}
      
      {!loading && batches.length === 0 && (
        <p className="text-gray-500">No stock entries yet.</p>
      )}

      {!loading && batches.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Product Name</th>
                <th className="p-3 border text-left">SKU</th>
                <th className="p-3 border text-right">Quantity</th>
                <th className="p-3 border text-right">Item Cost</th>
                <th className="p-3 border text-right">Total Cost</th>
                <th className="p-3 border text-left">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentBatches.map(batch => (
                <tr key={batch.id} className="border-t">
                  <td className="p-3 border">{batch.products?.name}</td>
                  <td className="p-3 border">{batch.products?.sku}</td>
                  <td className="p-3 border text-right">{batch.quantity}</td>
                  <td className="p-3 border text-right">
                    {formatPrice(batch.cost_price)}
                  </td>
                  <td className="p-3 border text-right">
                    {formatPrice(batch.quantity * batch.cost_price)}
                  </td>
                  <td className="p-3 border">
                    {new Date(batch.received_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && batches.length > 0 && totalPages > 1 && (
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
              <label htmlFor="jump-to-page-stock">Go to page:</label>
              <input
                id="jump-to-page-stock"
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
    </div>
  )
}
