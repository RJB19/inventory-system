import { supabase } from './supabase';

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}



export async function updateProductPrice(product, newPrice) {
  // Save history
  const { error: historyError } = await supabase
    .from('product_price_history')
    .insert({
      product_id: product.id,
      old_price: product.selling_price,
      new_price: newPrice,
    })

  if (historyError) throw historyError

  // Update product
  const { error } = await supabase
    .from('products')
    .update({ selling_price: newPrice })
    .eq('id', product.id)

  if (error) throw error
}




export async function archiveProduct(productId) {
  // Check stock
  const { data: stock } = await supabase
    .from('stock_batches')
    .select('remaining_quantity')
    .eq('product_id', productId);

  const totalStock = stock?.reduce(
    (sum, s) => sum + Number(s.remaining_quantity),
    0
  );

  if (totalStock > 0) {
    throw new Error('Cannot archive product with existing stock');
  }

  // Archive product by setting archived_at
  const { error } = await supabase
    .from('products')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) throw error;
}

export async function unarchiveProduct(productId) {
  // Unarchive product by setting archived_at to null
  const { error } = await supabase
    .from('products')
    .update({ archived_at: null })
    .eq('id', productId);

  if (error) throw error;
}

export async function getSaleItems() {
  const { data: sales, error } = await supabase
    .from('sales')
    .select(
      `
      created_at,
      sale_items (
        quantity,
        selling_price,
        cost_price,
        products ( name, sku )
      )
    `
    )
    .is('cancelled_at', null) // Filter out cancelled sales
    .order('created_at', { ascending: false })

  if (error) throw error

  const saleItems = sales.flatMap(sale =>
    sale.sale_items.map(item => ({
      product_name: item.products.name,
      sku: item.products.sku,
      quantity: item.quantity,
      selling_price: item.selling_price,
      amount: item.quantity * item.selling_price,
      gross_profit: (item.quantity * item.selling_price) - item.cost_price,
      date: sale.created_at
    }))
  )

  return saleItems
}

export async function getStockInItems() {
  const { data: stockBatches, error } = await supabase
    .from('stock_batches')
    .select(
      `
      received_at,
      quantity,
      cost_price,
      products ( name, sku )
      `
    )
    .order('received_at', { ascending: false });

  if (error) throw error;

  const stockInItems = stockBatches.map(batch => ({
    product_name: batch.products.name,
    sku: batch.products.sku,
    quantity: batch.quantity,
    item_cost: batch.cost_price,
    total_cost: batch.quantity * batch.cost_price,
    date: batch.received_at,
  }));

  return stockInItems;
}