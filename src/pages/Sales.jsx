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
      setPage(1)
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

  const totalPages = Math.ceil(sales.length / pageSize)
  const startIndex = (page - 1) * pageSize
  const paginatedSales = sales.slice(startIndex, startIndex + pageSize)


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
            ) : paginatedSales.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No sales recorded
                </td>
              </tr>
            ) : (
              paginatedSales.map(sale => {
                const isCancelled = !!sale.cancelled_at;
                // Determine if the sale is within the 24-hour window and not cancelled
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
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>

            {/* Jump to Page Input */}
            <div className="flex items-center space-x-1 text-sm">
              <label htmlFor="jump-to-page-products">Go to page:</label>
              <input
                id="jump-to-page-products"
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
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
      </div>
    </div>
  )
}
