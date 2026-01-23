import { useEffect, useState } from 'react';
import { getSaleItems } from '../services/products';
import { formatPrice } from '../utils/formatPrice';
import { supabase } from '../services/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function HighProfitItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define a color palette for the pie chart segments (same as FastMovingItems for consistency)
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  async function fetchHighProfitItems() {
    setLoading(true);
    try {
      const saleItems = await getSaleItems();

      // Aggregate by product_name and map to { name, value } for the chart
      const profitMap = {};
      saleItems.forEach((item) => {
        if (!profitMap[item.product_name]) {
          profitMap[item.product_name] = {
            name: item.product_name,
            value: 0,
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          fetchHighProfitItems();
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
        label: 'Gross Profit',
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
              label += formatPrice(context.parsed);
            }
            return label;
          },
        },
      },
    },
  };

  if (loading) {
    return <p className="text-center p-4">Loading high-profit items...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">Top 5 High-Profit Items</h3>
        <p className="text-center text-gray-500">
          No high-profit items to display.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Top 5 High-Profit Items</h3>
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
            <span>{`Top ${index + 1}: ${item.name} (${formatPrice(
              item.value
            )})`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}