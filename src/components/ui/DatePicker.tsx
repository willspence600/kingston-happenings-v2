'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
} from 'date-fns';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  required,
  className = '',
  id: providedId,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parsed = parseISO(value);
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = providedId || generatedId;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Update current month when value changes
  useEffect(() => {
    if (value) {
      const parsed = parseISO(value);
      if (isValid(parsed)) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: React.JSX.Element[] = [];
    let days: React.JSX.Element[] = [];
    let day = startDate;

    // Day headers
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = value && isSameDay(day, parseISO(value));
        const isDisabled = isDateDisabled(day);
        const isToday = isSameDay(day, new Date());

        days.push(
          <button
            key={day.toString()}
            type="button"
            onClick={() => handleDateSelect(currentDay)}
            disabled={isDisabled}
            className={`w-8 h-8 text-sm rounded-lg transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground font-medium'
                : isToday
                ? 'bg-primary/10 text-primary font-medium'
                : isCurrentMonth
                ? 'text-foreground hover:bg-muted'
                : 'text-muted-foreground/50'
            } ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {format(day, 'd')}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="p-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <span className="font-medium text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayHeaders.map((d) => (
            <div key={d} className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">{rows}</div>
      </div>
    );
  };

  const displayValue = value
    ? format(parseISO(value), 'MMM d, yyyy')
    : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <CalendarIcon
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
        />
        <input
          type="text"
          id={inputId}
          readOnly
          required={required}
          value={displayValue}
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[280px]">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
}

