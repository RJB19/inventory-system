import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FastMovingItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define a color palette for the pie chart segments
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  async function fetchFastMovingItems() {
    setLoading(true);
    try {
      const saleItems = await getSaleItems();

      const quantityMap = {};
      saleItems.forEach(item => {
        if (!quantityMap[item.product_name]) {
          quantityMap[item.product_name] = {
            name: item.product_name,
            value: 0
          };
        }
        quantityMap[item.product_name].value += item.quantity;
      });

      const sortedItems = Object.values(quantityMap)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setItems(sortedItems);
    } catch (error) {
      console.error('Error fetching fast-moving items:', error.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFastMovingItems();

    const subscription = supabase
      .channel('fast_moving_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
        fetchFastMovingItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return <p className="text-center p-4">Loading fast-moving items...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">Top 5 Fast-Moving Items</h3>
        <p className="text-center text-gray-500">No fast-moving items to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Top 5 Fast-Moving Items</h3>
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
          <Tooltip formatter={(value) => [`${value} sold`, 'Quantity']} />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}