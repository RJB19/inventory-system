import { useState } from 'react';
import { createProduct } from '../services/products';
import EditProductForm from '../components/EditProductForm'



export default function ProductForm({ onSuccess, onClose }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: '',
    unit_description: '',
    selling_price: '',
    low_stock_threshold: '',
  });
  const [loading, setLoading] = useState(false); // New state

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true); // Start loading

    try {
      const data = await createProduct({
        ...form,
        selling_price: Number(form.selling_price),
        low_stock_threshold: Number(form.low_stock_threshold || 0), // Convert to Number, default to 0 if empty
      });
  
      setForm({
        name: '',
        sku: '',
        unit: '',
        unit_description: '',
        selling_price: '',
        low_stock_threshold: '', // Clear to empty string after successful submission
      });
  
      onSuccess(data.id);
    } catch (error) {
      console.error('Submission error:', error);
      alert('An unexpected error occurred during product creation.');
    } finally {
      setLoading(false); // End loading
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">Add New Product</h2>

      <input name="name" placeholder="Product name" className="w-full border rounded p-2" onChange={handleChange} value={form.name} required />
      <input name="sku" placeholder="SKU" className="w-full border rounded p-2" onChange={handleChange} value={form.sku} />
      <input name="unit" placeholder="Unit (1kg, 25kg, 1bag, Piece and etc..)" className="w-full border rounded p-2" onChange={handleChange} value={form.unit} required />
      {/* <input name="unit_description" placeholder="Item description (25kg)" className="w-full border rounded p-2" onChange={handleChange} value={form.unit_description} /> */}
      <input name="selling_price" type="number" step="any" placeholder="Selling price" className="w-full border rounded p-2" onChange={handleChange} value={form.selling_price} required />
      <input name="low_stock_threshold" type="number" placeholder="Low stock alert threshold" className="w-full border rounded p-2" onChange={handleChange} value={form.low_stock_threshold} required />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
          Close
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Saving Product...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
