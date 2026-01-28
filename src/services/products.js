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
  const attributeHistory = {};

  // First, fetch the current product data to compare for changes
  const { data: oldProduct, error: fetchError } = await supabase
    .from('products')
    .select('unit, low_stock_threshold')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // If unit has changed, prepare history data
  if (oldProduct.unit !== data.unit) {
    attributeHistory.old_unit = oldProduct.unit;
    attributeHistory.new_unit = data.unit;
  }
  // If low_stock_threshold has changed, prepare history data
  if (oldProduct.low_stock_threshold !== data.low_stock_threshold) {
    attributeHistory.old_threshold = oldProduct.low_stock_threshold;
    attributeHistory.new_threshold = data.low_stock_threshold;
  }

  return { success: true, attributeHistory };
}



export async function updateProductPrice(product, newPrice, forceUpdate = false) {
  if (!forceUpdate) {
    // Validate new price against highest existing item cost
    const { data: maxCostData, error: maxCostError } = await supabase
      .from('stock_batches')
      .select('cost_price')
      .eq('product_id', product.id)
      .gt('remaining_quantity', 0) // <--- Only consider batches with remaining stock
      .order('cost_price', { ascending: false }) // Get highest cost first
      .limit(1)
      .single();

    if (maxCostError && maxCostError.code !== 'PGRST116') { // PGRST116 means "exact one row was not found"
      throw maxCostError; // Re-throw actual errors
    }

    if (maxCostData && newPrice < maxCostData.cost_price) {
      return {
        shouldConfirm: true,
        message: `New selling price (${newPrice.toFixed(2)}) is lower than the highest existing item cost (${maxCostData.cost_price.toFixed(2)}). If your selling price falls below any item cost in stock (batches - FIFO applied), you are certain to incur a loss (negative) when selling those units.
      
        If this is intentional, do you want to proceed anyway?`,
      };
    }
  }

  // No longer save history here directly
  // if (product.selling_price !== newPrice) {
  //   const { error: historyError } = await supabase
  //     .from('product_price_history')
  //     .insert({
  //       product_id: product.id,
  //       old_price: product.selling_price,
  //       new_price: newPrice,
  //     })
  
  //   if (historyError) throw historyError // Re-throw actual errors
  // }

  const priceHistory = {};

  if (!forceUpdate) {
    // Validate new price against highest existing item cost
    const { data: maxCostData, error: maxCostError } = await supabase
      .from('stock_batches')
      .select('cost_price')
      .eq('product_id', product.id)
      .gt('remaining_quantity', 0) // <--- Only consider batches with remaining stock
      .order('cost_price', { ascending: false }) // Get highest cost first
      .limit(1)
      .single();

    if (maxCostError && maxCostError.code !== 'PGRST116') { // PGRST116 means "exact one row was not found"
      throw maxCostError; // Re-throw actual errors
    }

    if (maxCostData && newPrice < maxCostData.cost_price) {
      return {
        success: false,
        shouldConfirm: true,
        message: `New selling price (${newPrice.toFixed(2)}) is lower than the highest existing item cost (${maxCostData.cost_price.toFixed(2)}). If your selling price falls below any item cost in stock (batches - FIFO applied), you are certain to incur a loss (negative) when selling those units.
      
        If this is intentional, do you want to proceed anyway?`,
      };
    }
  }
  
  // If price has changed, prepare history data
  if (product.selling_price !== newPrice) {
    priceHistory.old_price = product.selling_price;
    priceHistory.new_price = newPrice;
  }

  // Update product selling price
  const { error } = await supabase
    .from('products')
    .update({ selling_price: newPrice })
    .eq('id', product.id)

  if (error) throw error // Re-throw actual errors

  return { success: true, shouldConfirm: false, priceHistory };
}




// Consolidated function to log all product changes
export async function logProductChanges(productId, priceHistory, attributeHistory) {
  const payload = { product_id: productId };
  let hasChanges = false;

  // Add price changes if they exist
  if (priceHistory && (priceHistory.old_price !== undefined || priceHistory.new_price !== undefined)) {
    payload.old_price = priceHistory.old_price;
    payload.new_price = priceHistory.new_price;
    hasChanges = true;
  }

  // Add attribute changes if they exist
  if (attributeHistory) {
    if (attributeHistory.old_unit !== undefined || attributeHistory.new_unit !== undefined) {
      payload.old_unit = attributeHistory.old_unit;
      payload.new_unit = attributeHistory.new_unit;
      hasChanges = true;
    }
    if (attributeHistory.old_threshold !== undefined || attributeHistory.new_threshold !== undefined) {
      payload.old_threshold = attributeHistory.old_threshold;
      payload.new_threshold = attributeHistory.new_threshold;
      hasChanges = true;
    }
  }

  // Only insert if there are actual changes
  if (hasChanges) {
    const { error: historyError } = await supabase
      .from('product_price_history')
      .insert(payload);

    if (historyError) throw historyError;
  }
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