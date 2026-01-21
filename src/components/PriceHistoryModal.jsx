import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatPrice'

export default function PriceHistoryModal({ productId, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_price_history')
        .select('old_price, new_price, changed_at')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false })

      if (error) {
        alert(error.message)
      } else {
        setHistory(data)
      }
      setLoading(false)
    }

    if (productId) {
      fetchHistory()
    }
  }, [productId])

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white max-w-sm rounded-lg shadow-lg p-6 border-2 border-gray-400"
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'white' }}
      >
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-gray-200">Price History</h2>

        {loading ? (
          <p>Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500">No price changes recorded.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full border border-gray-300 border-collapse">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="border p-2 text-right">Old Price</th>
                  <th className="border p-2 text-right">New Price</th>
                  <th className="border p-2 text-left">Date Changed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="border p-2 text-right">
                      {formatPrice(h.old_price)}
                    </td>
                    <td className="border p-2 text-right">
                      {formatPrice(h.new_price)}
                    </td>
                    <td className="border p-2">
                      {new Date(h.changed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-right mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
