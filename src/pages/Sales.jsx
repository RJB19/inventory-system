import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import SaleForm from '../components/SaleForm'
import { formatPrice } from '../utils/formatPrice'
import { useAuth } from '../utils/AuthContext'; // Import useAuth

export default function Sales() {
  const { user } = useAuth(); // Get user from AuthContext
  const [open, setOpen] = useState(false)
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // State for filters
  const [idFilter, setIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        display_id,
        created_at,
        total_amount,
        cancelled_at,
        sale_items (
          id,
          product_id,
          quantity,
          selling_price,
          products ( name, sku )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) alert(error.message)
    else {
      setSales(data)
      setPage(1) // Reset to first page when new data is fetched
    }

    setLoading(false)
  }

  async function cancelSale(sale) {
    if (sale.cancelled_at) return

    if (!confirm('Cancel this sale and restore stock?')) return

    const { data: items, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id)

    if (error) {
      alert(error.message)
      return
    }

    // Restore stock (reverse FIFO)
    for (const item of items) {
      let remaining = item.quantity

      const { data: batches } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('product_id', item.product_id)
        .order('received_at', { ascending: false })

      for (const batch of batches) {
        if (remaining <= 0) break

        const toAdd = Math.min(remaining, item.quantity)

        await supabase
          .from('stock_batches')
          .update({
            remaining_quantity: batch.remaining_quantity + toAdd
          })
          .eq('id', batch.id)

        remaining -= toAdd
      }
    }

    // Mark sale as cancelled
    const { error: cancelError } = await supabase
      .from('sales')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', sale.id)

    if (cancelError) {
      alert(cancelError.message)
      return
    }

    fetchSales()
  }

  // Helper function to check if sale is within 24 hours
  const isWithin24Hours = (createdAt) => {
    const now = new Date();
    const saleDate = new Date(createdAt);
    const diffInMilliseconds = now - saleDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    return diffInHours < 24;
  };

  // Apply filters to the sales data
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const isIdMatch = idFilter ? sale.display_id.includes(idFilter) : true;
    
    // Date filtering: ensure both start and end dates are valid and comparison is made
    const isStartDateMatch = startDateFilter ? saleDate >= new Date(startDateFilter) : true;
    // For endDateFilter, we want to include the entire day, so we set time to end of day
    const isEndDateMatch = endDateFilter ? saleDate <= new Date(endDateFilter + 'T23:59:59.999Z') : true;

    return isIdMatch && isStartDateMatch && isEndDateMatch;
  });

  // Pagination logic now uses filteredSales
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + pageSize);

  const handleFilterChange = () => {
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-center">Sales</h1>

      {!open && (
        <div className="flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg"
          >
            Record Sale
          </button>
        </div>
      )}

      {open && (
        <SaleForm
          onClose={() => setOpen(false)}
          onSaved={fetchSales}
        />
      )}

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Filter Sales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ID Filter */}
          <div>
            <label htmlFor="id-filter" className="block text-sm font-medium text-gray-700">Filter by ID</label>
            <input
              type="text"
              id="id-filter"
              value={idFilter}
              onChange={(e) => { setIdFilter(e.target.value); handleFilterChange(); }}
              placeholder="Enter Sale ID..."
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Start Date Filter */}
          <div>
            <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              id="start-date-filter"
              value={startDateFilter}
              onChange={(e) => { setStartDateFilter(e.target.value); handleFilterChange(); }}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              id="end-date-filter"
              value={endDateFilter}
              onChange={(e) => { setEndDateFilter(e.target.value); handleFilterChange(); }}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">ID</th>
              <th className="p-3 border">Items</th>
              <th className="p-3 border text-right">Total</th>
              <th className="p-3 border">Date</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? ( // Use filteredSales.length to check if any sales match criteria
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No sales found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedSales.map(sale => {
                const isCancelled = !!sale.cancelled_at;
                const canCancel = !isCancelled && isWithin24Hours(sale.created_at);

                return (
                  <tr
                    key={sale.id}
                    className={`border-t align-top ${
                      isCancelled
                        ? 'opacity-50 bg-red-50 line-through'
                        : ''
                    }`}
                  >
                    <td className="p-3 border font-mono">
                      {sale.display_id}
                      {isCancelled && (
                        <div className="text-xs text-red-600 font-bold">
                          CANCELLED
                        </div>
                      )}
                    </td>

                    <td className="p-3 border space-y-1">
                      {sale.sale_items.map(item => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-4"
                        >
                          <div>
                            <div className="font-medium">
                              {item.products.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              SKU: {item.products.sku || '-'}
                            </div>
                            <div className="text-xs">
                              {item.quantity} × ₱
                              {item.selling_price.toFixed(2)}
                            </div>
                          </div>

                          <div className="font-semibold">
                            {formatPrice(
                              item.quantity * item.selling_price
                            )}
                          </div>
                        </div>
                      ))}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {formatPrice(sale.total_amount)}
                    </td>

                    <td className="p-3 border text-sm">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>

                    <td className="p-3 border">
                      {user?.role === 'admin' && canCancel && (
                        <button
                          onClick={() => cancelSale(sale)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center mt-4">
        <div className="mb-2">
          Page {page} of {totalPages}
        </div>

        <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={page === 1 || filteredSales.length === 0} // Disable if no sales or on first page
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>

            {/* Jump to Page Input */}
            <div className="flex items-center space-x-1 text-sm">
              <label htmlFor="jump-to-page-sales">Go to page:</label>
              <input
                id="jump-to-page-sales"
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={e => {
                  let pageNum = parseInt(e.target.value, 10);
                  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
                  if (pageNum > totalPages) pageNum = totalPages;
                  setPage(pageNum);
                }}
                className="w-16 border rounded p-1 text-center"
              />
            </div>

            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={page === totalPages || filteredSales.length === 0} // Disable if no sales or on last page
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
      </div>
    </div>
  )
}