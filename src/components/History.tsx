import React, { useRef, useState } from 'react';
import { SleepLog, VariableDef } from '../types';
import { deleteSleepLog, clearAllSleepLogs, importSleepLogs } from '../services/db';
import { Trash2, Edit2, CheckCircle2, XCircle, Download, Upload, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  logs: SleepLog[];
  schema: VariableDef[];
  onEdit: (log: SleepLog) => void;
}

export function History({ logs, schema, onEdit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    if (confirmDeleteDate) {
      await deleteSleepLog(confirmDeleteDate);
      setConfirmDeleteDate(null);
    }
  };

  const handleClearAllConfirm = async () => {
    await clearAllSleepLogs();
    setIsConfirmClearOpen(false);
  };

  const getExpectedHeaders = () => {
    const coreKeys = ['date', 'total_sleep_time', 'deep_sleep_time', 'awakenings', 'watch_sleep_score', 'subjective_quality'];
    const dynamicKeys = schema.map(v => v.id);
    return [...coreKeys, ...dynamicKeys];
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No logs to export.");
      return;
    }
    
    const headers = getExpectedHeaders();

    // Rows
    const rows = logs.map(log => {
      return headers.map(key => {
        let val = log[key];
        if (val === undefined) val = '';
        if (typeof val === 'string') return `"${val}"`;
        return val;
      }).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sleeplab_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          alert("Invalid CSV file: No data rows found.");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = getExpectedHeaders();
        const newLogs: SleepLog[] = [];

        // Strict validation: check if all expected columns are present
        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          alert(`Invalid CSV file: Missing required columns:\n${missingHeaders.join(', ')}`);
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const log: any = {};
          
          headers.forEach((header, index) => {
            let val: any = values[index];
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(Number(val)) && val !== '') val = Number(val);
            log[header] = val;
          });
          
          if (log.date && log.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            newLogs.push(log as SleepLog);
          } else {
             console.warn(`Row ${i} skipped: Invalid date format.`);
          }
        }

        if (newLogs.length > 0) {
          await importSleepLogs(newLogs);
          alert(`Successfully imported ${newLogs.length} logs!`);
        } else {
          alert("No valid rows found to import.");
        }
      } catch (err) {
        console.error("Error parsing CSV", err);
        alert("Failed to parse CSV file. Please make sure it matches the export format.");
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const BoolIcon = ({ value }: { value: boolean }) => (
    value ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" /> : <XCircle className="w-4 h-4 text-red-400 inline" />
  );

  const displaySchemaFields = schema.slice(0, 2); // Show max 2 custom columns

  return (
    <div className="space-y-4 pb-10">
      <ConfirmModal 
        isOpen={!!confirmDeleteDate}
        title="Delete Log"
        message="Are you sure you want to delete this sleep log? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteDate(null)}
      />

      <ConfirmModal 
        isOpen={isConfirmClearOpen}
        title="Clear All Logs"
        message="⚠️ WARNING: This will permanently delete ALL your sleep logs. Are you absolutely sure?"
        confirmText="Clear All"
        confirmColor="red"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end items-center bg-white p-4 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <button 
          onClick={handleExportCSV}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <Download className="w-4 h-4 text-gray-500" />
          Export CSV
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <Upload className="w-4 h-4 text-gray-500" />
          Import CSV
        </button>
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImportCSV}
        />

        <button 
          onClick={() => setIsConfirmClearOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Clear All
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Historical Data</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">All recorded sleep entries.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Score</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Quality</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden md:table-cell">Total (h)</th>
                {displaySchemaFields.map(v => (
                  <th key={v.id} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell whitespace-nowrap">
                    {v.label}
                  </th>
                ))}
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                    No sleep logs found. Start tracking today!
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.date} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {format(parseISO(log.date), 'MMM d, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        log.watch_sleep_score >= 80 ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                        log.watch_sleep_score >= 65 ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' : 
                        'bg-red-50 text-red-700 ring-red-600/10'
                      }`}>
                        {log.watch_sleep_score}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{log.subjective_quality}/10</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden md:table-cell">{log.total_sleep_time}</td>
                    
                    {displaySchemaFields.map(v => (
                      <td key={v.id} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {v.type === 'boolean' ? <BoolIcon value={!!log[v.id]} /> : log[v.id]}
                      </td>
                    ))}

                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button onClick={() => onEdit(log)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => setConfirmDeleteDate(log.date)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
