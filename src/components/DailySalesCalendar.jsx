import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { getSaleItems, getStockInItems } from '../services/products'; // Import both functions
import { getAllSchedules } from '../services/schedule'; // New Import
import { formatPrice } from '../utils/formatPrice';
import DailyStockModal from './DailyStockModal'; // Import the new modal component
import DailySalesSummaryModal from './DailySalesSummaryModal'; // New Import
import ScheduleInputModal from './ScheduleInputModal'; // New Import
import ScheduleDetailsModal from './ScheduleDetailsModal'; // New Import

export default function DailySalesCalendar({ dailyData, loading, fetchDailySalesData }) { // Accept props
  const [selectedDayForModal, setSelectedDayForModal] = useState(null);
  const [showSalesSummaryModalForDate, setShowSalesSummaryModalForDate] = useState(null);
  const [showScheduleInputModalForDate, setShowScheduleInputModalForDate] = useState(null);
  const [showScheduleDetailsModalForDate, setShowScheduleDetailsModalForDate] = useState(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // dailyData is now coming from props, so internal fetching useEffect is removed
  // fetchDailySalesData is now coming from props

  const renderDayCellContent = (dayCell) => {
    const jsDate = dayCell.date;
    const dateStr = `${jsDate.getFullYear()}-${(jsDate.getMonth() + 1).toString().padStart(2, '0')}-${jsDate.getDate().toString().padStart(2, '0')}`;
    const data = dailyData[dateStr] || { sales: 0, profit: 0, hasStockActivity: false, hasSchedule: false }; // Provide default data if none exists

    const hasSalesData = (data.sales > 0 || data.profit > 0);
    const hasStockActivity = data.hasStockActivity;
    const hasScheduleData = data.hasSchedule;

    return (
      <div className="flex flex-col h-full py-0.5">
        <div className="text-xs sm:text-sm font-semibold text-right pr-0.5">{dayCell.dayNumberText}</div>
        <div className="flex flex-col items-end text-[0.6rem] sm:text-xs px-0.5 py-0">
          {screenWidth >= 640 && hasSalesData && (
            <>
              <span className="text-green-700 font-medium">{formatPrice(data.sales)}</span>
              <span className="text-blue-700">{formatPrice(data.profit)}</span>
            </>
          )}
          {screenWidth < 640 && hasSalesData && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSalesSummaryModalForDate(jsDate);
              }}
              className="mt-0.5 px-1 py-0 bg-blue-200 text-blue-700 rounded-full text-[0.5rem] sm:text-xs hover:bg-blue-300"
            >
              Sales
            </button>
          )}
          {hasStockActivity && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDayForModal(jsDate);
              }}
              className="mt-0.5 px-1 py-0 bg-gray-200 text-gray-700 rounded-full text-[0.5rem] sm:text-xs hover:bg-gray-300"
            >
              Stocks
            </button>
          )}
          {hasScheduleData && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowScheduleDetailsModalForDate(jsDate);
              }}
              className="mt-0.5 px-1 py-0 bg-purple-200 text-purple-700 rounded-full text-[0.5rem] sm:text-xs hover:bg-purple-300"
            >
              Scheduled
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowScheduleInputModalForDate(jsDate);
            }}
            className="mt-0.5 px-1 py-0 bg-indigo-200 text-indigo-700 rounded-full text-[0.5rem] sm:text-xs hover:bg-indigo-300"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center p-4">Loading daily sales calendar...</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Daily Tracker</h2>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: ''
        }}
        dayCellContent={renderDayCellContent}
        height="auto" // Adjust height to content
      />
      {selectedDayForModal && (
        <DailyStockModal
          selectedDate={selectedDayForModal}
          onClose={() => setSelectedDayForModal(null)}
        />
      )}
      {showSalesSummaryModalForDate && (
        <DailySalesSummaryModal
          selectedDate={showSalesSummaryModalForDate}
          dailyDataForDate={dailyData[showSalesSummaryModalForDate.getFullYear() + '-' + (showSalesSummaryModalForDate.getMonth() + 1).toString().padStart(2, '0') + '-' + showSalesSummaryModalForDate.getDate().toString().padStart(2, '0')]}
          onClose={() => setShowSalesSummaryModalForDate(null)}
        />
      )}
      {showScheduleInputModalForDate && (
        <ScheduleInputModal
          selectedDate={showScheduleInputModalForDate}
          onClose={() => setShowScheduleInputModalForDate(null)}
          onSaveSuccess={fetchDailySalesData} // Refresh data after saving schedule
        />
      )}
      {showScheduleDetailsModalForDate && (
        <ScheduleDetailsModal
          selectedDate={showScheduleDetailsModalForDate}
          onClose={() => setShowScheduleDetailsModalForDate(null)}
          onUpdateSuccess={fetchDailySalesData} // Add this prop
        />
      )}
    </div>
  );
}