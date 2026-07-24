/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogForm } from './components/LogForm';
import { History } from './components/History';
import { Analytics } from './components/Analytics';
import { Tracker } from './components/Tracker';
import { SleepLog, VariableDef } from './types';
import { subscribeToSleepLogs, subscribeToSchema, saveVariablesSchema, getVariablesSchema, getSleepLogs } from './services/db';
import { Moon, Activity, Clock, BarChart3, LayoutGrid } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'analytics' | 'tracker'>('log');
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [schema, setSchema] = useState<VariableDef[]>([]);
  const [editLog, setEditLog] = useState<SleepLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch to trigger any required migrations (like the label migration)
    Promise.all([getSleepLogs(), getVariablesSchema()]).then(() => {
      // Then subscribe for real-time updates
      const unsubLogs = subscribeToSleepLogs((newLogs) => {
        setLogs(newLogs);
        setLoading(false);
      });
      
      const unsubSchema = subscribeToSchema((newSchema) => {
        setSchema(newSchema);
      });

      return () => {
        unsubLogs();
        unsubSchema();
      };
    });
  }, []);

  const handleEdit = (log: SleepLog) => {
    setEditLog(log);
    setActiveTab('log');
  };

  const handleSaved = () => {
    setEditLog(null);
    setActiveTab('history');
  };

  const handleSchemaUpdate = async (newSchema: VariableDef[]) => {
    await saveVariablesSchema(newSchema);
    setSchema(newSchema);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SleepLab</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'log' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LogForm onSaved={handleSaved} editLog={editLog} logs={logs} schema={schema} onSchemaUpdate={handleSchemaUpdate} />
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <History logs={logs} schema={schema} onEdit={handleEdit} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Analytics logs={logs} schema={schema} />
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tracker logs={logs} schema={schema} />
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile & Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-around py-3">
            <button 
              onClick={() => { setActiveTab('log'); setEditLog(null); }}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'log' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Activity className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Log</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'history' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Clock className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">History</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <BarChart3 className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Analytics</span>
            </button>
            <button 
              onClick={() => setActiveTab('tracker')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === 'tracker' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <LayoutGrid className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Tracker</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

