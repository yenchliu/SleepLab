import React, { useMemo, useState } from 'react';
import { SleepLog, VariableDef } from '../types';
import { format, parseISO, subDays, startOfDay, getDay, addDays, isSameDay } from 'date-fns';

interface Props {
  logs: SleepLog[];
  schema: VariableDef[];
}

export function Tracker({ logs, schema }: Props) {
  const [timeRange, setTimeRange] = useState<number>(30); // days

  const today = startOfDay(new Date());

  const heatMapData = useMemo(() => {
    const startDate = subDays(today, timeRange - 1);
    const startDayOfWeek = getDay(startDate); // 0 = Sun, 1 = Mon ... 6 = Sat
    const padDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const totalCells = padDays + timeRange;
    const cells = [];

    for (let i = 0; i < totalCells; i++) {
      if (i < padDays) {
        cells.push(null);
      } else {
        const currentDate = addDays(startDate, i - padDays);
        const log = logs.find(l => isSameDay(parseISO(l.date), currentDate));
        cells.push({
          date: currentDate,
          log: log || null
        });
      }
    }
    
    return cells;
  }, [logs, timeRange, today]);

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Helper to get max value for scaling numeric types
  const maxValues = useMemo(() => {
    const maxVals: Record<string, number> = {};
    schema.forEach(v => {
      if (v.type === 'number' || v.type === 'time' || v.type === 'slider') {
        let max = 0;
        logs.forEach(l => {
          const val = Number(l[v.id]) || 0;
          if (val > max) max = val;
        });
        maxVals[v.id] = max || 1; // avoid division by zero
      }
    });
    return maxVals;
  }, [schema, logs]);

  const getCellColor = (v: VariableDef, log: SleepLog | null) => {
    if (!log) return 'bg-gray-100'; // No data
    
    const val = log[v.id];
    
    if (v.type === 'boolean') {
      return val ? 'bg-indigo-500' : 'bg-gray-100';
    }
    
    // For numeric/time/slider types, scale opacity based on max value
    const numVal = Number(val) || 0;
    if (numVal === 0) return 'bg-gray-100';
    
    const max = maxValues[v.id] || 1;
    const ratio = numVal / max;
    
    if (ratio > 0.66) return 'bg-indigo-700';
    if (ratio > 0.33) return 'bg-indigo-500';
    return 'bg-indigo-300';
  };

  const getTooltipText = (v: VariableDef, log: SleepLog | null) => {
    if (!log) return 'No entry';
    const val = log[v.id];
    
    if (v.type === 'boolean') {
      return val ? 'Yes' : 'No';
    }
    
    if (v.type === 'time') {
      const hrs = Math.floor(val);
      const mins = Math.round((val - hrs) * 60);
      return `${hrs}h ${mins}m`;
    }
    
    return val !== undefined ? String(val) : 'None';
  };

  const columns = Math.ceil(heatMapData.length / 7);

  // We want the grid to always fit within the container on mobile, even for 120 days.
  // 120 days = ~18 columns. We will use flex with dynamic min-width or just flex-1 for cells to let them shrink slightly if needed, but 10-12px usually fits.
  // We'll use a fixed percentage or responsive grid.
  
  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center bg-white p-4 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <h2 className="text-lg font-medium text-gray-900">Habit Tracker</h2>
        <select 
          value={timeRange} 
          onChange={e => setTimeRange(Number(e.target.value))}
          className="rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
        >
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={60}>Last 60 Days</option>
          <option value={120}>Last 120 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {schema.map(v => (
          <div key={v.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-4 sm:p-5 flex flex-col w-full overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{v.label}</h3>
            
            <div className="flex w-full">
              {/* Day Labels */}
              <div className="grid grid-rows-7 gap-[3px] pr-2 text-[10px] text-gray-400 font-medium mt-4 shrink-0">
                {daysOfWeek.map((d, i) => (
                  <div key={i} className="flex items-center justify-end h-[13px] leading-none">{d}</div>
                ))}
              </div>
              
              {/* Heatmap Grid */}
              <div className="flex-1 relative overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Month labels */}
                <div className="h-4 relative mb-1 min-w-max">
                  {Array.from({ length: columns }).map((_, colIndex) => {
                    const cellsInCol = heatMapData.slice(colIndex * 7, colIndex * 7 + 7);
                    const firstOfMonthCell = cellsInCol.find(c => c && c.date.getDate() === 1);
                    
                    if (firstOfMonthCell) {
                      const leftPx = colIndex * 16; // w-[13px] + gap-[3px] = 16px
                      return (
                        <div key={colIndex} className="absolute whitespace-nowrap text-[10px] text-gray-500" style={{ left: `${leftPx}px` }}>
                          {format(firstOfMonthCell.date, 'MMM')}
                        </div>
                      );
                    }
                    
                    // Show month label on the first column if no 1st of month is found yet
                    if (colIndex === 0) {
                      const firstValid = cellsInCol.find(c => c);
                      if (firstValid) {
                        return (
                          <div key={colIndex} className="absolute whitespace-nowrap text-[10px] text-gray-500" style={{ left: `0px` }}>
                            {format(firstValid.date, 'MMM')}
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>

                <div className="grid grid-rows-7 grid-flow-col gap-[3px] justify-start min-w-max">
                  {heatMapData.map((cell, idx) => {
                    if (!cell) {
                      return <div key={idx} className="w-[13px] h-[13px] rounded-[3px]" />;
                    }
                    
                    const isFirstOfMonth = cell.date.getDate() === 1;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`w-[13px] h-[13px] rounded-[3px] cursor-pointer transition-colors hover:ring-1 hover:ring-gray-400 ${getCellColor(v, cell.log)} ${isFirstOfMonth ? 'border-[1.5px] border-gray-300' : ''} group relative`}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-90 shadow-sm pointer-events-none">
                          {format(cell.date, 'MMM d, yyyy')} • {getTooltipText(v, cell.log)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Legend for non-boolean variables */}
            {v.type !== 'boolean' && (
              <div className="mt-4 flex items-center justify-end gap-3 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-[2px] bg-gray-100 border border-gray-200"></div>
                  <span>None</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-[2px] bg-indigo-300"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-[2px] bg-indigo-500"></div>
                  <span>Med</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-[2px] bg-indigo-700"></div>
                  <span>High</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
