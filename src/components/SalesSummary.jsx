import { useEffect, useState } from 'react'
import { formatPrice } from '../utils/formatPrice' // supabase import is no longer needed
// getSaleItems is no longer needed as dailyData comes as prop

export default function SalesSummary({ dailyData, loading }) {
  const [summary, setSummary] = useState({
    today: { sales: 0, profit: 0 },
    week: { sales: 0, profit: 0 },
    month: { sales: 0, profit: 0 },
  });

  useEffect(() => {
    if (!loading && Object.keys(dailyData).length > 0) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to start week from Monday
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let todaySales = 0;
      let todayProfit = 0;
      let weekSales = 0;
      let weekProfit = 0;
      let monthSales = 0;
      let monthProfit = 0;

      Object.entries(dailyData).forEach(([dateStr, data]) => {
        const itemDate = new Date(dateStr); // dateStr is YYYY-MM-DD local

        if (itemDate.getTime() >= todayStart.getTime()) {
          todaySales += data.sales;
          todayProfit += data.profit;
        }
        if (itemDate.getTime() >= weekStart.getTime()) {
          weekSales += data.sales;
          weekProfit += data.profit;
        }
        if (itemDate.getTime() >= monthStart.getTime()) {
          monthSales += data.sales;
          monthProfit += data.profit;
        }
      });

      setSummary({
        today: { sales: todaySales, profit: todayProfit },
        week: { sales: weekSales, profit: weekProfit },
        month: { sales: monthSales, profit: monthProfit },
      });
    } else if (!loading && Object.keys(dailyData).length === 0) {
        // If no data, set summaries to zero
        setSummary({
            today: { sales: 0, profit: 0 },
            week: { sales: 0, profit: 0 },
            month: { sales: 0, profit: 0 },
        });
    }
  }, [dailyData, loading]); // Recalculate when dailyData or loading changes

  if (loading) {
    return <p>Loading summary...</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold">Today</h3>
        <p>Total Sales: {formatPrice(summary.today.sales)}</p>
        <p>Gross Profit: {formatPrice(summary.today.profit)}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold">This Week</h3>
        <p>Total Sales: {formatPrice(summary.week.sales)}</p>
        <p>Gross Profit: {formatPrice(summary.week.profit)}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold">This Month</h3>
        <p>Total Sales: {formatPrice(summary.month.sales)}</p>
        <p>Gross Profit: {formatPrice(summary.month.profit)}</p>
      </div>
    </div>
  )
}