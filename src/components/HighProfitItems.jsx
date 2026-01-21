import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { formatPrice } from '../utils/formatPrice'; // Reverted Import
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Recharts imports

export default function HighProfitItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define a color palette for the pie chart segments (same as FastMovingItems for consistency)
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  async function fetchHighProfitItems() {
    setLoading(true);
    try {
      const saleItems = await getSaleItems();

      // Aggregate by product_name and map to { name, value } for Recharts Pie
      const profitMap = {};
      saleItems.forEach(item => {
        if (!profitMap[item.product_name]) {
          profitMap[item.product_name] = {
            name: item.product_name,
            value: 0 // Renamed from profit to value for Recharts
          };
        }
        profitMap[item.product_name].value += item.gross_profit;
      });

      const sortedItems = Object.values(profitMap)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Get top 5

      setItems(sortedItems);
    } catch (error) {
      console.error('Error fetching high-profit items:', error.message);
      setItems([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHighProfitItems();

    const subscription = supabase
      .channel('high_profit_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
        fetchHighProfitItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return <p className="text-center p-4">Loading high-profit items...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">Top 5 High-Profit Items</h3>
        <p className="text-center text-gray-500">No high-profit items to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Top 5 High-Profit Items</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={items}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {items.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [formatPrice(value), 'Profit']} />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}