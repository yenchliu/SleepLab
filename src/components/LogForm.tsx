import React, { useState, useEffect } from 'react';
import { SleepLog, INITIAL_LOG, VariableDef } from '../types';
import { saveSleepLog } from '../services/db';
import { Settings2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { VariablesEditor } from './VariablesEditor';

interface Props {
  onSaved: () => void;
  editLog?: SleepLog | null;
  logs: SleepLog[];
  schema: VariableDef[];
  onSchemaUpdate: (schema: VariableDef[]) => void;
}

export function TimePicker({ title, value, onChange }: { title: string, value: number, onChange: (v: number) => void }) {
  const hours = Math.floor(value || 0);
  const minutes = Math.round(((value || 0) - hours) * 60);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    onChange(val + minutes / 60);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    onChange(hours + val / 60);
  };

  return (
    <div className="flex flex-col">
      <label className="block text-sm font-medium text-gray-700 mb-2">{title}</label>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input 
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            max="24"
            value={value === 0 && hours === 0 ? '' : hours}
            onChange={handleHoursChange}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            className="block w-full rounded-md border-0 py-2.5 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-center bg-white font-bold text-lg"
          />
          <span className="absolute right-3 top-3.5 text-gray-400 text-xs font-medium pointer-events-none">hr</span>
        </div>
        <span className="text-xl font-bold text-gray-400">:</span>
        <div className="flex-1 relative">
          <input 
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            max="59"
            value={value === 0 && minutes === 0 ? '' : minutes}
            onChange={handleMinutesChange}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            className="block w-full rounded-md border-0 py-2.5 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-center bg-white font-bold text-lg"
          />
          <span className="absolute right-3 top-3.5 text-gray-400 text-xs font-medium pointer-events-none">min</span>
        </div>
      </div>
    </div>
  );
}

export function LogForm({ onSaved, editLog, logs, schema, onSchemaUpdate }: Props) {
  const [log, setLog] = useState<SleepLog>(INITIAL_LOG);
  const [isSaving, setIsSaving] = useState(false);
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (editLog) {
      setLog(editLog);
    } else {
      setLog({ ...INITIAL_LOG, date: new Date().toISOString().split('T')[0] });
    }
  }, [editLog]);

  const saveCurrentLog = async () => {
    setIsSaving(true);
    try {
      await saveSleepLog(log);
      onSaved();
      if (!editLog) {
        setLog({ ...INITIAL_LOG, date: new Date().toISOString().split('T')[0] });
      }
    } catch (error) {
      console.error('Failed to save log', error);
      alert('Failed to save log. See console for details.');
    } finally {
      setIsSaving(false);
      setIsOverwriteOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editLog || editLog.date !== log.date) {
      const exists = logs.some(l => l.date === log.date);
      if (exists) {
        setIsOverwriteOpen(true);
        return;
      }
    }

    await saveCurrentLog();
  };

  const handleDynamicChange = (id: string, value: any) => {
    setLog(prev => ({ ...prev, [id]: value }));
  };

  const renderDynamicField = (v: VariableDef) => {
    const val = log[v.id];
    
    if (v.type === 'boolean') {
      const isChecked = Boolean(val);
      return (
        <div key={v.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <span className="text-gray-700 font-medium text-sm">{v.label}</span>
          <button
            type="button"
            onClick={() => handleDynamicChange(v.id, !isChecked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isChecked ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      );
    }
    
    if (v.type === 'number') {
      return (
        <div key={v.id} className="py-3 border-b border-gray-100 last:border-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">{v.label}</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={val !== undefined ? val : ''}
            onChange={e => handleDynamicChange(v.id, e.target.value === '' ? '' : Number(e.target.value))}
            onFocus={e => e.target.select()}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 px-3 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          />
        </div>
      );
    }
    
    if (v.type === 'time') {
      return (
        <div key={v.id} className="py-3 border-b border-gray-100 last:border-0">
          <TimePicker title={v.label} value={val || 0} onChange={newVal => handleDynamicChange(v.id, newVal)} />
        </div>
      );
    }

    if (v.type === 'slider') {
      return (
        <div key={v.id} className="py-3 border-b border-gray-100 last:border-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">{v.label}</label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min={v.min || 1}
              max={v.max || 10}
              value={val || (v.min || 1)}
              onChange={e => handleDynamicChange(v.id, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-lg font-bold text-indigo-600 w-8 text-center">{val || (v.min || 1)}</span>
          </div>
        </div>
      );
    }

    if (v.type === 'select') {
      return (
        <div key={v.id} className="py-3 border-b border-gray-100 last:border-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">{v.label}</label>
          <select
            value={val || ''}
            onChange={e => handleDynamicChange(v.id, e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 px-3 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white"
          >
            <option value="">-- Select --</option>
            {v.options?.map(opt => (
              <option key={opt} value={opt} className="capitalize">{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isOverwriteOpen}
        title="Overwrite Log?"
        message={`A sleep log for ${log.date} already has been recorded. Do you want to overwrite it?`}
        confirmText="Overwrite"
        confirmColor="red"
        onConfirm={saveCurrentLog}
        onCancel={() => setIsOverwriteOpen(false)}
      />

      <VariablesEditor 
        isOpen={isEditorOpen}
        schema={schema}
        onClose={() => setIsEditorOpen(false)}
        onSave={onSchemaUpdate}
      />

      <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 max-w-2xl mx-auto w-full">
        <div className="px-4 py-6 sm:p-8">
          <h2 className="text-xl font-semibold leading-7 text-gray-900 mb-6">
            {editLog ? 'Edit Sleep Log' : 'New Sleep Log'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Date</label>
              <div className="mt-2">
                <input
                  type="date"
                  required
                  value={log.date}
                  onChange={e => setLog({ ...log, date: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Variables</h3>
                <button 
                  type="button" 
                  onClick={() => setIsEditorOpen(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Edit Items
                </button>
              </div>
              
              {schema.map(v => renderDynamicField(v))}
              {schema.length === 0 && (
                <div className="text-sm text-gray-500 py-4 text-center">No variables defined. Click 'Edit Items' to add some.</div>
              )}
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2">Sleep Metrics</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TimePicker
                  title="Total Sleep"
                  value={log.total_sleep_time}
                  onChange={v => setLog({ ...log, total_sleep_time: v })}
                />
                
                <TimePicker
                  title="Deep Sleep"
                  value={log.deep_sleep_time}
                  onChange={v => setLog({ ...log, deep_sleep_time: v })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700">Awakenings</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={log.awakenings}
                    onChange={e => setLog({ ...log, awakenings: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) })}
                    onFocus={e => e.target.select()}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 px-3 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Watch Score (0-100)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="100"
                    required
                    value={log.watch_sleep_score}
                    onChange={e => setLog({ ...log, watch_sleep_score: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10) })}
                    onFocus={e => e.target.select()}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 px-3 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Subjective Quality (1-10)</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      required
                      value={log.subjective_quality}
                      onChange={e => setLog({ ...log, subjective_quality: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-lg font-bold text-indigo-600 w-8 text-center">{log.subjective_quality}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Log'}
          </button>
        </div>
      </form>
    </>
  );
}
