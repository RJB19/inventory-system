import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'


export default function StockInForm({ onSuccess, onClose }) {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [searchTerm, setSearchTerm] = useState(''); // State for filtering
  const [displaySearchTerm, setDisplaySearchTerm] = useState(''); // State for input display
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProductSellingPrice, setSelectedProductSellingPrice] = useState(null); // New state
  const [costPriceError, setCostPriceError] = useState(''); // New state
  const [showPrepopulatedCostNote, setShowPrepopulatedCostNote] = useState(false); // New state
  const [loading, setLoading] = useState(false); // New state

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, selling_price, archived_at')
      .is('archived_at', null)
    const sortedProducts = (data || []).sort((a, b) => a.name.localeCompare(b.name));
    setProducts(sortedProducts);
  }

  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Explicit sort after filtering


  async function handleSubmit(e) {
    e.preventDefault()

    if (!productId) {
      alert('Please select a product from the list.');
      return;
    }
    if (costPriceError) { // Prevent submission if there's an error
      if (!confirm(costPriceError + ' Do you want to proceed anyway?')) {
        return;
      }
    }

    setLoading(true); // Start loading

    try {
      const { error } = await supabase.from('stock_batches').insert({
        product_id: productId,
        quantity: Number(quantity),
        remaining_quantity: Number(quantity),
        cost_price: Number(costPrice),
        received_at: new Date()
      })

      if (error) {
        alert(error.message)
        return
      }

      alert('Stock added successfully')

      // 🔥 THIS IS THE IMPORTANT PART
      if (typeof onSuccess === 'function') {
        onSuccess(productId)
      }


      setProductId('')
      setQuantity('')
      setCostPrice('')
      setSearchTerm('');
      setDisplaySearchTerm(''); // Clear display search term on submit
      setShowDropdown(false);
      setSelectedProductSellingPrice(null); // Clear selling price
      setCostPriceError(''); // Clear any error
      setShowPrepopulatedCostNote(false); // Clear the note on submit
    } catch (error) {
      console.error('Submission error:', error);
      alert('An unexpected error occurred during submission.');
    } finally {
      setLoading(false); // End loading
    }
  }

  const validateCostPrice = (price, sellingPrice) => {
    if (sellingPrice && Number(price) > sellingPrice) {
      setCostPriceError('Cost price is greater than selling price.');
    } else {
      setCostPriceError('');
    }
  };

  const handleSelectProduct = async (product) => {
    setProductId(product.id);
    setDisplaySearchTerm(`${product.name} (${product.sku})`); // Update display term
    setSearchTerm(''); // Clear filter search term to show all on re-open
    setShowDropdown(false);

    let latestSellingPrice = null;
    let latestCostPrice = '';

    // --- Fetch latest selling price ---
    const { data: sellingPriceData, error: sellingPriceError } = await supabase
      .from('products')
      .select('selling_price')
      .eq('id', product.id)
      .single();

    if (sellingPriceError) {
      console.error('Error fetching latest selling price:', sellingPriceError.message);
      setCostPriceError('Could not fetch latest selling price. Please try again.');
    } else if (sellingPriceData) {
      latestSellingPrice = sellingPriceData.selling_price;
      setSelectedProductSellingPrice(latestSellingPrice);
    } else {
      setCostPriceError('Selling price not found for this product.');
    }

    // --- Fetch latest cost price ---
    const { data: costPriceData, error: costPriceError } = await supabase
      .from('stock_batches')
      .select('cost_price')
      .eq('product_id', product.id)
      .order('received_at', { ascending: false })
      .limit(1)
      .single();

    if (costPriceError && costPriceError.code !== 'PGRST116') { // Ignore "exact one row was not found" errors
      console.error('Error fetching latest cost price:', costPriceError.message);
    } else if (costPriceData) {
      latestCostPrice = costPriceData.cost_price;
    }

    setCostPrice(latestCostPrice);
    setShowPrepopulatedCostNote(latestCostPrice !== ''); // Show note if cost price is found

    // --- Validate with the new values ---
    validateCostPrice(latestCostPrice, latestSellingPrice);
  };
  
  const handleToggleDropdown = () => {
    if (!showDropdown && productId) { // If dropdown is closed and a product is selected
      setSearchTerm(''); // Clear filter to show all products
      setDisplaySearchTerm(''); // Clear display to show placeholder and all options
      setProductId(''); // Also clear selected product so user can re-select
    } else if (!showDropdown && displaySearchTerm) { // If dropdown is closed, user typed but not selected
      setSearchTerm(displaySearchTerm); // Use what's in display for filtering
    }
    setShowDropdown(prev => !prev);
  }

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDisplaySearchTerm(value);
    setSearchTerm(value); // Use value for filtering
    setProductId(''); // Clear selected product when typing
    setShowDropdown(true); // Always show dropdown when typing
    setSelectedProductSellingPrice(null); // Clear selling price when product search changes
    setCostPriceError(''); // Clear any cost price error
    setShowPrepopulatedCostNote(false); // Clear the note when product selection changes
  };

  const handleCostPriceChange = (e) => {
    const value = e.target.value;
    setCostPrice(value);
    validateCostPrice(value, selectedProductSellingPrice);
    setShowPrepopulatedCostNote(false); // Hide note when user starts typing
  };

  return (
    
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold">Add Stock</h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Search or Select Product"
          className="w-full border p-2 rounded pr-10" // Added pr-10 for button
          value={displaySearchTerm} // Use displaySearchTerm for input value
          onChange={handleInputChange}
          onFocus={() => {
            if (productId) { // If a product is already selected, clear searchTerm to show all options initially
              setSearchTerm('');
            } else if (displaySearchTerm) { // If user typed but not selected, set searchTerm to displaySearchTerm
              setSearchTerm(displaySearchTerm);
            }
            setShowDropdown(true);
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 100)} // Delay to allow click on items
          required
        />
        <button
          type="button"
          onClick={handleToggleDropdown}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
        >
          {showDropdown ? (
            // Up arrow
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 f0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            // Down arrow
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
                  {p.name} ({p.sku})
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Warning for unselected product */}
      {!productId && displaySearchTerm && (
        <p className="text-sm text-red-500">Please select a product from the list.</p>
      )}

      {productId && !products.some(p => p.id === productId && displaySearchTerm === `${p.name} (${p.sku})`) && ( // Corrected warning logic
        <p className="text-sm text-orange-500">Selected product: {displaySearchTerm}. Ensure it matches a list item.</p>
      )}

      <input
        type="number"
        placeholder="Quantity"
        className="w-full border p-2 rounded"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        required
      />

      <input
        type="number"
        step="any"
        placeholder="Cost price per item"
        className="w-full border p-2 rounded"
        value={costPrice}
        onChange={handleCostPriceChange}
        required
      />
      {showPrepopulatedCostNote && (
        <p className="text-sm text-gray-500 mt-1">Pre-populated from last stock entry</p>
      )}
      {costPriceError && <p className="text-sm text-red-500">{costPriceError}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
          Close
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Adding Stock...' : 'Add Stock'}
        </button>
      </div>
    </form>
  )
}