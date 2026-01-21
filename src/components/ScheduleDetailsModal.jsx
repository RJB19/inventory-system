import React, { useState, useEffect, useCallback } from 'react';
import { getSchedulesByDate, updateSchedule, deleteSchedule } from '../services/schedule';

export default function ScheduleDetailsModal({ selectedDate, onClose, onUpdateSuccess }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedSchedules = await getSchedulesByDate(selectedDate);
      setSchedules(fetchedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchSchedules();
    }
  }, [selectedDate, fetchSchedules]);

  const handleEdit = (schedule) => {
    setEditingScheduleId(schedule.id);
    setEditedTitle(schedule.title);
    setEditedDescription(schedule.description || '');
  };

  const handleSave = async (id) => {
    try {
      await updateSchedule(id, { title: editedTitle, description: editedDescription });
      alert('Schedule updated successfully!');
      setEditingScheduleId(null); // Exit edit mode
      fetchSchedules(); // Re-fetch to show updated list
      onUpdateSuccess(); // Notify parent
    } catch (error) {
      console.error('Error updating schedule:', error.message);
      alert('Failed to update schedule.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    try {
      await deleteSchedule(id);
      alert('Schedule deleted successfully!');
      fetchSchedules(); // Re-fetch to show updated list
      onUpdateSuccess(); // Notify parent
      // If the last schedule for the day is deleted, perhaps close modal?
      // Or if this was the last schedule, the parent will update hasSchedule flag
    } catch (error) {
      console.error('Error deleting schedule:', error.message);
      alert('Failed to delete schedule.');
    }
  };


  if (!selectedDate) return null;

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-[90vw] max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold">Schedules for {formattedDate}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-3xl leading-none font-semibold">&times;</button>
        </div>

        {loading ? (
          <p className="text-center p-4">Loading schedules...</p>
        ) : (
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <p>No schedules planned for this day.</p>
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="border-b pb-2 last:border-b-0">
                  {editingScheduleId === schedule.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="w-full border rounded p-2"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                      <textarea
                        rows="3"
                        className="w-full border rounded p-2"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                      ></textarea>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingScheduleId(null)}
                          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(schedule.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <p className="font-semibold text-lg">{schedule.title}</p>
                      {schedule.description && (
                        <p className="text-sm text-gray-600">{schedule.description}</p>
                      )}
                      <p className="text-xs text-gray-400">Created: {new Date(schedule.created_at).toLocaleString()}</p>
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
