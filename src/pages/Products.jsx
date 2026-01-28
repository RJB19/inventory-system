import { useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import ProductForm from '../components/ProductForm'
import EditProductForm from '../components/EditProductForm'
import {
  archiveProduct,
  unarchiveProduct,
  updateProductPrice,
  updateProduct,
  logProductChanges,
} from '../services/products'
import PriceHistoryModal from '../components/PriceHistoryModal'
import { formatPrice } from '../utils/formatPrice'
import StockInForm from '../components/StockInForm'
import { useAuth } from '../utils/AuthContext';

export default function Products() {
  const { user } = useAuth(); // Get user from AuthContext
  const [activeProducts, setActiveProducts] = useState([])
  const [archivedProducts, setArchivedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [tempPrice, setTempPrice] = useState('')
  const [tempUnit, setTempUnit] = useState('')
  const [tempThreshold, setTempThreshold] = useState('')
  const [savingPrice, setSavingPrice] = useState(false); // New state
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 200
  const [showPriceHistory, setShowPriceHistory] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [showStockInForm, setShowStockInForm] = useState(false); // New state
  const [showProductForm, setShowProductForm] = useState(false); // New state
  const [highlightedThreshold, setHighlightedThreshold] = useState({ productId: null, timer: null });
  const [highlightedUnit, setHighlightedUnit] = useState({ productId: null, timer: null });
  const [highlightedPrice, setHighlightedPrice] = useState({ productId: null, timer: null });
  const [highlightedRow, setHighlightedRow] = useState({ productId: null, timer: null });
  const [highlightedStock, setHighlightedStock] = useState({ productId: null, timer: null });

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProductDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownRef])

  async function fetchProducts() {
    setLoading(true)
    const { data: productsData, error } = await supabase
      .from('products')
      .select('id, name, sku, unit, selling_price, low_stock_threshold, archived_at')

    if (error) {
      alert(error.message)
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

    const sortedActive = merged
      .filter(p => !p.archived_at)
      .sort((a, b) => a.name.localeCompare(b.name))

    setActiveProducts(sortedActive)
    setArchivedProducts(merged.filter(p => p.archived_at))
    setLoading(false)
  }

  const handleProductSelection = productId => {
    setSelectedProducts(prevSelected =>
      prevSelected.includes(productId)
        ? prevSelected.filter(id => id !== productId)
        : [...prevSelected, productId]
    )
  }

  const filteredProducts = activeProducts.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    const matchLowStock =
      !lowStockOnly || p.total_stock <= p.low_stock_threshold
    const matchProduct =
      selectedProducts.length === 0 || selectedProducts.includes(p.id)
    return matchSearch && matchLowStock && matchProduct
  })

  useEffect(() => {
    setPage(1)
  }, [search, lowStockOnly, selectedProducts])

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (page - 1) * pageSize
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + pageSize
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 mt-5">
      {/* Forms */}
      <div className="flex flex-row justify-center gap-4 mb-8"> {/* Added justify-center */}
        {!showStockInForm && !showProductForm && ( /* Added !showProductForm condition */
          <div> {/* Removed justify-center */}
            <button
              onClick={() => setShowStockInForm(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg"
            >
              Add Stock
            </button>
          </div>
        )}
        {showStockInForm && (
          <div className="bg-white rounded shadow p-4"> {/* Removed mb-4 */}
            <StockInForm
              onSuccess={(updatedProductId) => {
                fetchProducts();
                setShowStockInForm(false);
                // Clear existing timer if any
                if (highlightedStock.timer) {
                  clearTimeout(highlightedStock.timer);
                }
                // Set highlight for 3 minutes
                const timer = setTimeout(() => {
                  setHighlightedStock({ productId: null, timer: null });
                }, 180000); // 3 minutes
                setHighlightedStock({ productId: updatedProductId, timer });
              }}
              onClose={() => setShowStockInForm(false)}
            />
          </div>
        )}

        {!showProductForm && !showStockInForm && ( /* Added !showStockInForm condition */
          <div> {/* Removed justify-center */}
            <button
              onClick={() => setShowProductForm(true)}
              className="px-3 py-1 bg-green-600 text-white rounded-lg"
            >
              Add New Product
            </button>
          </div>
        )}
        {showProductForm && (
          <div className="bg-white rounded shadow p-4"> {/* Removed mb-4 */}
            <ProductForm
              onSuccess={(newProductId) => {
                fetchProducts();
                setShowProductForm(false);
                // Clear existing timer if any
                if (highlightedRow.timer) {
                  clearTimeout(highlightedRow.timer);
                }
                // Set highlight for 3 minutes
                const timer = setTimeout(() => {
                  setHighlightedRow({ productId: null, timer: null });
                }, 180000); // 3 minutes
                setHighlightedRow({ productId: newProductId, timer });
              }}
              onClose={() => setShowProductForm(false)}
            />
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold">Active Products</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search name or SKU"
          className="border p-2 rounded w-full md:w-1/3"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="relative w-full md:w-1/3" ref={dropdownRef}>
          <button
            onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
            className="border p-2 rounded w-full text-left"
          >
            {selectedProducts.length > 0
              ? `${selectedProducts.length} products selected`
              : 'Filter by Product'}
          </button>
          {isProductDropdownOpen && (
            <div
              className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1"
              style={{ backgroundColor: 'white' }}
            >
              <div className="max-h-48 overflow-y-auto">
                {activeProducts.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => handleProductSelection(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <div className="p-2 border-t flex justify-end gap-2">
                <button
                  onClick={() => setSelectedProducts([])}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsProductDropdownOpen(false)}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

            {/* Product List */}
            <div className="bg-white rounded shadow p-4">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">Product</th>
                        <th className="border p-2">SKU</th>
                        <th className="border p-2">Unit</th>
                        <th className="border p-2">Selling Price</th>
                        <th className="border p-2">Stock</th>
                        <th className="border p-2">Threshold</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map(p => (
                        <tr key={p.id} className={`${highlightedRow.productId === p.id ? 'bg-green-200 transition-colors duration-1000' : ''}`}>
                          <td className="border p-2">{p.name}</td>
                          <td className="border p-2 text-center">{p.sku || '-'}</td>
                          <td className={`border p-2 text-center ${highlightedUnit.productId === p.id ? 'bg-yellow-200 transition-colors duration-1000' : ''}`}>
                            {editingProductId === p.id ? (
                              <input
                                type="text"
                                className="border rounded px-2 py-1 w-24 text-center"
                                value={tempUnit}
                                onChange={e => setTempUnit(e.target.value)}
                              />
                            ) : (
                              p.unit || '-'
                            )}
                          </td>
                          <td className={`border p-2 text-right ${highlightedPrice.productId === p.id ? 'bg-green-200 transition-colors duration-1000' : ''}`}>
                            {editingProductId === p.id ? (
                              <input
                                type="number"
                                className="border rounded px-2 py-1 w-24 text-right"
                                value={tempPrice}
                                onChange={e => setTempPrice(e.target.value)}
                              />
                            ) : (
                              formatPrice(p.selling_price)
                            )}
                          </td>
                          <td className={`border p-2 text-center ${highlightedStock.productId === p.id ? 'bg-blue-200 transition-colors duration-1000' : ''}`}>{p.total_stock}</td>
                          <td className={`border p-2 text-center ${highlightedThreshold.productId === p.id ? 'bg-yellow-200 transition-colors duration-1000' : ''}`}>
                            {editingProductId === p.id ? (
                              <input
                                type="number"
                                className="border rounded px-2 py-1 w-24 text-center"
                                value={tempThreshold}
                                onChange={e => setTempThreshold(e.target.value)}
                              />
                            ) : (
                              p.low_stock_threshold
                            )}
                          </td>
                          <td className="border p-2 text-center">
                            {p.total_stock === 0 ? (
                              <span style={{ color: 'red' }}>Zero Stock</span>
                            ) : p.total_stock <= p.low_stock_threshold ? (
                              <span style={{ color: 'orange' }}>Low Stock</span>
                            ) : (
                              <span>In Stock</span>
                            )}
                          </td>
                          <td className="border p-2 text-center">
                            {user?.role === 'admin' ? (
                              editingProductId === p.id ? (
                                <>
                                  <button
                                    className="text-green-600 mr-2"
                                    onClick={async () => {
                                      setSavingPrice(true); // Start saving
                                      try {
                                                                                                                                                    const priceUpdateResult = await updateProductPrice(p, Number(tempPrice));
                                                                                                                
                                                                                                                                                    let finalPriceUpdateResult = priceUpdateResult;
                                                                                                                                                    if (priceUpdateResult.shouldConfirm) {
                                                                                                                                                      if (window.confirm(priceUpdateResult.message)) {
                                                                                                                                                        finalPriceUpdateResult = await updateProductPrice(p, Number(tempPrice), true); // Force update
                                                                                                                                                      } else {
                                                                                                                                                        // If user cancels confirmation, stay in edit mode
                                                                                                                                                        return;
                                                                                                                                                      }
                                                                                                                                                    }
                                                                                                                
                                                                                                                                                    if (finalPriceUpdateResult.success) {
                                                                                                                                                      const productUpdateResult = await updateProduct(p.id, { unit: tempUnit, low_stock_threshold: Number(tempThreshold) });
                                                                                                                
                                                                                                                                                      if (productUpdateResult.success) {
                                                                                                                                                        // Log all changes at once
                                                                                                                                                        await logProductChanges(p.id, finalPriceUpdateResult.priceHistory, productUpdateResult.attributeHistory);
                                                                                                                
                                                                                                                                                        setEditingProductId(null);
                                                                                                                                                        fetchProducts();
                                                                                                                
                                                                                                                                                        // Highlight logic for Unit
                                                                                                                                                        if (p.unit !== tempUnit) {
                                                                                                                                                          if (highlightedUnit.timer) {
                                                                                                                                                            clearTimeout(highlightedUnit.timer);
                                                                                                                                                          }
                                                                                                                                                          const unitTimer = setTimeout(() => {
                                                                                                                                                            setHighlightedUnit({ productId: null, timer: null });
                                                                                                                                                          }, 180000); // 3 minutes
                                                                                                                                                          setHighlightedUnit({ productId: p.id, timer: unitTimer });
                                                                                                                                                        }
                                                                                                                
                                                                                                                                                        // Highlight logic for Stock Threshold
                                                                                                                                                        if (p.low_stock_threshold !== Number(tempThreshold)) {
                                                                                                                                                          if (highlightedThreshold.timer) {
                                                                                                                                                            clearTimeout(highlightedThreshold.timer);
                                                                                                                                                          }
                                                                                                                                                          const thresholdTimer = setTimeout(() => {
                                                                                                                                                            setHighlightedThreshold({ productId: null, timer: null });
                                                                                                                                                          }, 180000); // 3 minutes
                                                                                                                                                          setHighlightedThreshold({ productId: p.id, timer: thresholdTimer });
                                                                                                                                                        }
                                                                                                                
                                                                                                                                                        // Highlight logic for Selling Price
                                                                                                                                                        if (p.selling_price !== Number(tempPrice)) {
                                                                                                                                                          if (highlightedPrice.timer) {
                                                                                                                                                            clearTimeout(highlightedPrice.timer);
                                                                                                                                                          }
                                                                                                                                                          const priceTimer = setTimeout(() => {
                                                                                                                                                            setHighlightedPrice({ productId: null, timer: null });
                                                                                                                                                          }, 180000); // 3 minutes
                                                                                                                                                          setHighlightedPrice({ productId: p.id, timer: priceTimer });
                                                                                                                                                        }
                                                                                                                                                      } else {
                                                                                                                                                        alert('Failed to update product attributes.');
                                                                                                                                                      }
                                                                                                                                                    } else {
                                                                                                                                                      alert('Failed to update selling price.');
                                                                                                                                                    }                                      } catch (err) {
                                        alert(err.message);
                                        // Stay in edit mode if an error occurs
                                      } finally {
                                        setSavingPrice(false); // End saving
                                      }
                                    }}
                                    disabled={savingPrice}
                                  >
                                    {savingPrice ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    className="text-gray-600"
                                    onClick={() => setEditingProductId(null)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="text-blue-600 hover:underline"
                                  onClick={() => {
                                                                                                        setEditingProductId(p.id)
                                                                                                        setTempPrice(p.selling_price)
                                                                                                        setTempUnit(p.unit)
                                                                                                        setTempThreshold(p.low_stock_threshold)                                  }}
                                >
                                  Edit
                                </button>
                              )
                            ) : null}
                            {user?.role === 'admin' && p.total_stock === 0 && (
                              <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Archive "${p.name}"? It will be hidden from the main list.`
                                    )
                                  )
                                    return
                                  try {
                                    await archiveProduct(p.id)
                                    fetchProducts()
                                  } catch (err) {
                                    alert(err.message)
                                  }
                                }}
                                className="text-red-600 hover:underline ml-2"
                              >
                                Archive
                              </button>
                            )}
                            <button
                              onClick={() => setShowPriceHistory(p.id)}
                              className="text-gray-600 hover:underline ml-2"
                            >
                              History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
      {/* Pagination & Modals */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 space-y-2 md:space-y-0">
          {/* Page Info */}
          <div className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>

          {/* Pagination Controls */}
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
      )}
      {showPriceHistory && (
        <PriceHistoryModal
          productId={showPriceHistory}
          onClose={() => setShowPriceHistory(null)}
        />
      )}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={fetchProducts}
        />
      )}

      {/* Archived Products Section */}
      {archivedProducts.length > 0 && user?.role === 'admin' && ( // Only show archived section to admin
        <div className="mt-8">
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
            />
            Show Archived Products ({archivedProducts.length})
          </label>
          {showArchived && (
            <div className="bg-white rounded shadow p-4">
              <h2 className="text-xl font-bold mb-4">Archived Products</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Product</th>
                      <th className="border p-2">SKU</th>
                      <th className="border p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedProducts.map(p => (
                      <tr key={p.id}>
                        <td className="border p-2">{p.name}</td>
                        <td className="border p-2 text-center">
                          {p.sku || '-'}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={async () => {
                              await unarchiveProduct(p.id)
                              fetchProducts()
                            }}
                            className="text-green-600 hover:underline"
                          >
                            Unarchive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
