import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatPrice'
import { calculateFifo } from '../utils/fifo'

export default function SaleForm({ onClose, onSaved }) {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('') // Renamed from selectedProductId
  const [cart, setCart] = useState([])
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)

  // Combobox specific states
  const [searchTerm, setSearchTerm] = useState('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, selling_price, sku, archived_at') // Added archived_at
      .is('archived_at', null) // Filter out archived products

    const { data: stockData } = await supabase
      .from('stock_batches')
      .select('product_id, remaining_quantity')

    const stockMap = {}
    stockData?.forEach(row => {
      stockMap[row.product_id] =
        (stockMap[row.product_id] || 0) + row.remaining_quantity
    })

    setProducts(
      productsData
        .map(p => ({ ...p, stock: stockMap[p.id] || 0 }))
        .filter(p => p.stock > 0) // Keep existing stock filter
    )
  }

  // Combobox helper functions
  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Explicit sort after filtering

  const handleSelectProduct = (product) => {
    setProductId(product.id);
    setDisplaySearchTerm(`${product.name} (${product.sku})`);
    setSearchTerm('');
    setShowDropdown(false);
  };
  
  const handleToggleDropdown = () => {
    if (!showDropdown && productId) {
      setSearchTerm('');
      setDisplaySearchTerm('');
      setProductId('');
    } else if (!showDropdown && displaySearchTerm) {
      setSearchTerm(displaySearchTerm);
    }
    setShowDropdown(prev => !prev);
  }

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDisplaySearchTerm(value);
    setSearchTerm(value);
    setProductId('');
    setShowDropdown(true);
  };


  function addToCart() {
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      alert('Quantity must be at least 1')
      return
    }

    const product = products.find(p => p.id === productId) // Use productId
    if (!product) return

    const existing = cart.find(i => i.id === product.id)

    if (existing?.cancelled) {
      alert('This item was cancelled and cannot be re-added.')
      return
    }

    const alreadyInCart = existing ? existing.quantity : 0

    if (alreadyInCart + qty > product.stock) {
      alert(`Only ${product.stock} items available in stock`)
      return
    }

    setCart(prev => {
      if (existing) {
        return prev.map(i =>
          i.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: qty,
          sku: product.sku
        }
      ]
    })

    setQuantity('')
    setSelectedProductId('')
  }

  const total = cart
    .filter(i => !i.cancelled)
    .reduce((sum, i) => sum + i.quantity * i.price, 0)

  async function confirmSale() {
    const activeItems = cart.filter(i => !i.cancelled)

    if (activeItems.length === 0) {
      alert('Add at least one item to cart')
      return
    }

    setLoading(true)

    try {
      // Final stock check
      for (const item of activeItems) {
        const { data: stockData } = await supabase
          .from('stock_batches')
          .select('remaining_quantity')
          .eq('product_id', item.id)

        const totalStock = stockData.reduce(
          (sum, b) => sum + b.remaining_quantity,
          0
        )

        if (item.quantity > totalStock) {
          alert(`Not enough stock for ${item.name}`)
          setLoading(false)
          return
        }
      }

      // Create sale
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({ total_amount: total })
        .select()
        .single()

      if (error) throw error

      // Save items + deduct stock
      for (const item of activeItems) {
        const { data: batches } = await supabase
          .from('stock_batches')
          .select('*')
          .eq('product_id', item.id)
          .gt('remaining_quantity', 0)
          .order('received_at', { ascending: true })

        const { costOfGoodsSold, updatedBatches } = calculateFifo(
          batches,
          item.quantity
        )

        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          selling_price: item.price,
          cost_price: costOfGoodsSold
        })

        for (const batch of updatedBatches) {
          await supabase
            .from('stock_batches')
            .update({ remaining_quantity: batch.remaining_quantity })
            .eq('id', batch.id)
        }
      }

      setCart([])
      onSaved()
      onClose()
    } catch (err) {
      alert(err.message || 'Failed to save sale')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Record Sale</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Product Combobox */}
        <div className="relative col-span-2 md:col-span-1">
          <input
            type="text"
            placeholder="Search or Select Product"
            className="w-full border p-2 rounded pr-10"
            value={displaySearchTerm}
            onChange={handleInputChange}
            onFocus={() => {
              if (productId) {
                setSearchTerm('');
              } else if (displaySearchTerm) {
                setSearchTerm(displaySearchTerm);
              }
              setShowDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
            required
          />
          <button
            type="button"
            onClick={handleToggleDropdown}
            className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
          >
            {showDropdown ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {showDropdown && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <li className="p-2 text-gray-500">No products found.</li>
              ) : (
                filteredProducts.map(p => (
                  <li
                    key={p.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => handleSelectProduct(p)}
                  >
                    {p.name} ({p.sku}) (Stock: {p.stock})
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Quantity Input (remains) */}
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="border p-2 rounded"
          placeholder="Quantity"
        />

        {/* Add Button (remains) */}
        <button
          onClick={addToCart}
          className="bg-blue-600 text-white rounded px-4"
          disabled={!productId || !quantity || loading}
        >
          Add
        </button>
      </div>

      {/* Warning for unselected product */}
      {!productId && displaySearchTerm && (
        <p className="text-sm text-red-500">Please select a product from the list.</p>
      )}

      {productId && !products.some(p => p.id === productId && displaySearchTerm === `${p.name} (${p.sku})`) && (
        <p className="text-sm text-orange-500">Selected product: {displaySearchTerm}. Ensure it matches a list item.</p>
      )}

      <div>
        {cart.length === 0 ? (
          <p className="text-gray-500">No items added</p>
        ) : (
          cart.map(item => {
            const isCancelled = item.cancelled

            return (
              <div
                key={item.id}
                className={`flex justify-between items-center border-b py-2 ${
                  isCancelled ? 'opacity-50 line-through' : ''
                }`}
              >
                <div>
                  <div className="font-medium">
                    {item.name}
                    {isCancelled && (
                      <span className="ml-2 text-xs text-red-600 font-semibold">
                        (Cancelled)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} × {formatPrice(item.price)}
                  </div>
                </div>

                {!isCancelled && (
                  <button
                    onClick={() =>
                      setCart(prev =>
                        prev.map(i =>
                          i.id === item.id
                            ? { ...i, cancelled: true }
                            : i
                        )
                      )
                    }
                    className="text-red-600 hover:underline text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="text-right font-bold">
        Total: {formatPrice(total)}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 border rounded">
          Close
        </button>

        <button
          onClick={confirmSale}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Save Sale
        </button>
      </div>
    </div>
  )
}
