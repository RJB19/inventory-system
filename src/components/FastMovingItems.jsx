import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { supabase } from '../services/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

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
      saleItems.forEach((item) => {
        if (!quantityMap[item.product_name]) {
          quantityMap[item.product_name] = {
            name: item.product_name,
            value: 0,
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          fetchFastMovingItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const chartData = {
    labels: items.map((item) => item.name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: items.map((item) => item.value),
        backgroundColor: COLORS,
        borderColor: COLORS,
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We will use a custom legend
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += `${context.parsed} sold`;
            }
            return label;
          },
        },
      },
    },
  };

  if (loading) {
    return <p className="text-center p-4">Loading fast-moving items...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">Top 5 Fast-Moving Items</h3>
        <p className="text-center text-gray-500">
          No fast-moving items to display.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Top 5 Fast-Moving Items</h3>
      <div style={{ height: '200px' }}>
        <Pie data={chartData} options={chartOptions} />
      </div>
      {/* Custom Legend */}
      <div className="mt-4 ml-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-start">
            <span
              className="w-4 h-4 mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></span>
            <span>{`Top ${index + 1}: ${item.name} (${item.value} sold)`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}