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
    low_stock_threshold: 10,
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await createProduct({
      ...form,
      selling_price: Number(form.selling_price),
      low_stock_threshold: Number(form.low_stock_threshold),
    });

    setForm({
      name: '',
      sku: '',
      unit: '',
      unit_description: '',
      selling_price: '',
      low_stock_threshold: 10,
    });

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">Add New Product</h2>

      <input name="name" placeholder="Product name" className="w-full border rounded p-2" onChange={handleChange} value={form.name} required />
      <input name="sku" placeholder="SKU" className="w-full border rounded p-2" onChange={handleChange} value={form.sku} />
      <input name="unit" placeholder="Unit (sack, piece)" className="w-full border rounded p-2" onChange={handleChange} value={form.unit} required />
      <input name="unit_description" placeholder="Item description (25kg)" className="w-full border rounded p-2" onChange={handleChange} value={form.unit_description} />
      <input name="selling_price" type="number" placeholder="Selling price" className="w-full border rounded p-2" onChange={handleChange} value={form.selling_price} required />
      <input name="low_stock_threshold" type="number" placeholder="Low stock alert" className="w-full border rounded p-2" onChange={handleChange} value={form.low_stock_threshold} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
          Close
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Save Product
        </button>
      </div>
    </form>
  );
}
