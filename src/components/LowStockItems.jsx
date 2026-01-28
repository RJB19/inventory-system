import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import LowStockBadge from './LowStockBadge'

export default function LowStockItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchLowStockItems() {
    const { data: productsData, error } = await supabase
      .from('products')
      .select('id, name, sku, low_stock_threshold, archived_at') // Also select archived_at to be safe
      .is('archived_at', null) // Filter out archived products

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const { data: stockData } = await supabase
      .from('stock_batches')
      .select('product_id, remaining_quantity')

    const stockMap = {}
    stockData?.forEach(row => {
      stockMap[row.product_id] =
        (stockMap[row.product_id] || 0) + Number(row.remaining_quantity)
    })

    const merged = productsData.map(p => ({
      ...p,
      total_stock: stockMap[p.id] || 0,
    }))

    const lowStockItems = merged
      .filter(p => p.total_stock <= p.low_stock_threshold)
      .sort((a, b) => a.total_stock - b.total_stock) // Sort from zero to top

    setItems(lowStockItems)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchLowStockItems()

    const salesSubscription = supabase
      .channel('low_stock_items_sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
        fetchLowStockItems()
      })
      .subscribe()
      
    const stockSubscription = supabase
      .channel('low_stock_items_stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_batches' }, payload => {
        fetchLowStockItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(salesSubscription)
      supabase.removeChannel(stockSubscription)
    }
  }, [])

  if (loading) {
    return <p>Loading low stock items...</p>
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Low Stock Items</h3>
      {items.length === 0 ? (
        <p className="text-gray-500">No items are low on stock.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {items.map(item => (
            <li key={item.id} className="py-2 flex justify-between items-center">
              <div>
                <span className="font-semibold">{item.name}</span>
                <span className="text-sm text-gray-500 ml-2">({item.sku})</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-red-600 mr-2">
                  {item.total_stock} left
                </span>
                <LowStockBadge stock={item.total_stock} threshold={item.low_stock_threshold} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
