import React, { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from "date-fns";

const DateRangePicker = ({ startDate, endDate, onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState(startDate);
  const [selectedEnd, setSelectedEnd] = useState(endDate);
  const [selecting, setSelecting] = useState(false);
  const pickerRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const handleDateClick = (date) => {
    if (!selecting || !selectedStart) {
      setSelectedStart(date);
      setSelectedEnd(null);
      setSelecting(true);
    } else {
      if (date < selectedStart) {
        setSelectedStart(date);
        setSelectedEnd(selectedStart);
      } else {
        setSelectedEnd(date);
      }
      setSelecting(false);
      onRangeChange({ start: selectedStart, end: date });
      setIsOpen(false);
    }
  };

  const isInRange = (date) => {
    if (!selectedStart || !selectedEnd) return false;
    return isWithinInterval(date, { start: selectedStart, end: selectedEnd });
  };

  const formatDisplayDate = () => {
    if (selectedStart && selectedEnd) {
      return `${format(selectedStart, "MMM d, yyyy")} - ${format(selectedEnd, "MMM d, yyyy")}`;
    }
    if (selectedStart) {
      return `${format(selectedStart, "MMM d, yyyy")} - Select end date`;
    }
    return "Select date range";
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <FiCalendar className="mr-2 h-5 w-5 text-gray-400" />
        {formatDisplayDate()}
      </button>

      {isOpen && (
        <div className="absolute mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1"
              >
                {day}
              </div>
            ))}

            {getDaysInMonth().map((date, i) => {
              const isSelected =
                (selectedStart && isSameDay(date, selectedStart)) ||
                (selectedEnd && isSameDay(date, selectedEnd));
              const inRange = isInRange(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);

              return (
                <button
                  key={i}
                  onClick={() => handleDateClick(date)}
                  className={`
                    p-2 text-sm rounded-full transition-colors
                    ${!isCurrentMonth && "text-gray-400 dark:text-gray-600"}
                    ${isSelected && "bg-primary-600 text-white hover:bg-primary-700"}
                    ${inRange && !isSelected && "bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"}
                    ${!isSelected && !inRange && isCurrentMonth && "hover:bg-gray-100 dark:hover:bg-gray-700"}
                  `}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={() => {
                setSelectedStart(null);
                setSelectedEnd(null);
                setSelecting(false);
                onRangeChange({ start: null, end: null });
                setIsOpen(false);
              }}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
