import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { supabase } from '../services/supabase';

export default function ProductMetrics() {
  const [metrics, setMetrics] = useState({
    highProfitSlowMoving: [],
    fastMovingLowProfit: [],
    goldenProducts: [],
  });
  const [loading, setLoading] = useState(true);

  async function fetchProductMetrics() {
    setLoading(true);
    try {
      const saleItems = await getSaleItems();

      const productData = {};

      saleItems.forEach((item) => {
        if (!productData[item.product_name]) {
          productData[item.product_name] = {
            name: item.product_name,
            quantity: 0,
            profit: 0,
          };
        }
        productData[item.product_name].quantity += item.quantity;
        productData[item.product_name].profit += item.gross_profit;
      });

      const allProducts = Object.values(productData);

      const top5FastMoving = [...allProducts]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(p => p.name);

      const top5HighProfit = [...allProducts]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)
        .map(p => p.name);

      const fastMovingSet = new Set(top5FastMoving);
      const highProfitSet = new Set(top5HighProfit);

      const highProfitSlowMoving = top5HighProfit.filter(p => !fastMovingSet.has(p));
      const fastMovingLowProfit = top5FastMoving.filter(p => !highProfitSet.has(p));
      const goldenProducts = top5FastMoving.filter(p => highProfitSet.has(p));

      setMetrics({
        highProfitSlowMoving,
        fastMovingLowProfit,
        goldenProducts,
      });

    } catch (error) {
      console.error('Error fetching product metrics:', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProductMetrics();

    const subscription = supabase
      .channel('product_metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
        fetchProductMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return <p className="text-center p-4">Loading product metrics...</p>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h3 className="text-lg font-bold mb-4">Product Performance Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Golden Products */}
        <div>
          <h4 className="font-semibold text-lg mb-2">🏆 Golden Products</h4>
          <p className="text-sm text-gray-600 mb-2">High Profit & Fast Moving</p>
          <ul className="list-disc list-inside bg-green-50 p-3 rounded-lg">
            {metrics.goldenProducts.length > 0 ? (
              metrics.goldenProducts.map(name => <li key={name}>{name}</li>)
            ) : (
              <p className="text-gray-500">None in Top 5 of both.</p>
            )}
          </ul>
        </div>

        {/* High Profit, Slow Moving */}
        <div>
          <h4 className="font-semibold text-lg mb-2">💎 Hidden Gems</h4>
          <p className="text-sm text-gray-600 mb-2">High Profit, Not Fast Moving</p>
           <p className="text-xs text-gray-500 mb-2">Consider promoting these items.</p>
          <ul className="list-disc list-inside bg-blue-50 p-3 rounded-lg">
            {metrics.highProfitSlowMoving.length > 0 ? (
              metrics.highProfitSlowMoving.map(name => <li key={name}>{name}</li>)
            ) : (
              <p className="text-gray-500">None in Top 5 Profit only.</p>
            )}
          </ul>
        </div>

        {/* Fast Moving, Low Profit */}
        <div>
          <h4 className="font-semibold text-lg mb-2">🏃‍♂️ Workhorses</h4>
          <p className="text-sm text-gray-600 mb-2">Fast Moving, Not High Profit</p>
          <p className="text-xs text-gray-500 mb-2">Review pricing or costs.</p>
          <ul className="list-disc list-inside bg-yellow-50 p-3 rounded-lg">
            {metrics.fastMovingLowProfit.length > 0 ? (
              metrics.fastMovingLowProfit.map(name => <li key={name}>{name}</li>)
            ) : (
              <p className="text-gray-500">None in Top 5 Moving only.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
