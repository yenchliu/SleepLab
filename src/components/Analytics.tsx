import React, { useMemo, useState } from 'react';
import { SleepLog, VariableDef } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Info, Zap, ChevronRight, X } from 'lucide-react';

interface Props {
  logs: SleepLog[];
  schema: VariableDef[];
}

export function Analytics({ logs, schema }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const chartData = useMemo(() => {
    return logs.map(log => ({
      date: format(parseISO(log.date), 'MMM d'),
      score: log.watch_sleep_score,
      quality: log.subjective_quality * 10, // Scale 1-10 to 10-100 for comparison
    })).reverse(); // Oldest to newest
  }, [logs]);

  const variableImpact = useMemo(() => {
    if (logs.length < 3) return []; // Need some data

    const booleanVariables = schema.filter(v => v.type === 'boolean');

    const impacts = booleanVariables.map(v => {
      const logsTrue = logs.filter(l => Boolean(l[v.id]));
      const logsFalse = logs.filter(l => !Boolean(l[v.id]));

      const n1 = logsTrue.length;
      const n2 = logsFalse.length;

      const avgTrue = n1 > 0 ? logsTrue.reduce((acc, l) => acc + l.watch_sleep_score, 0) / n1 : 0;
      const avgFalse = n2 > 0 ? logsFalse.reduce((acc, l) => acc + l.watch_sleep_score, 0) / n2 : 0;

      const varTrue = n1 > 1 ? logsTrue.reduce((acc, l) => acc + Math.pow(l.watch_sleep_score - avgTrue, 2), 0) / (n1 - 1) : 0;
      const varFalse = n2 > 1 ? logsFalse.reduce((acc, l) => acc + Math.pow(l.watch_sleep_score - avgFalse, 2), 0) / (n2 - 1) : 0;

      let isSignificant = false;
      let tStat = 0;
      if (n1 >= 2 && n2 >= 2) {
         const denom = Math.sqrt(varTrue / n1 + varFalse / n2);
         if (denom > 0) {
            tStat = (avgTrue - avgFalse) / denom;
            isSignificant = Math.abs(tStat) > 2.0; // Approximation for p < 0.05
         }
      }

      return {
        label: v.label,
        key: v.id,
        impact: avgTrue - avgFalse,
        avgTrue,
        avgFalse,
        varTrue,
        varFalse,
        tStat,
        countTrue: n1,
        countFalse: n2,
        valid: n1 > 0 && n2 > 0,
        isSignificant
      };
    }).filter(v => v.valid).sort((a, b) => b.impact - a.impact);

    return impacts;
  }, [logs, schema]);

  const optimalRoutine = useMemo(() => {
    if (logs.length < 7) return null; // Require 7 days

    const positiveRoutines = variableImpact.filter(v => v.impact > 0 && v.isSignificant);
    const negativeRoutines = variableImpact.filter(v => v.impact < 0 && v.isSignificant);

    return { positiveRoutines, negativeRoutines };
  }, [variableImpact, logs.length]);

  return (
    <>
      <div className="space-y-8 pb-10">
        {/* Trend Chart */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Sleep Trends</h3>
        <div className="h-72 w-full">
          {logs.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" name="Watch Score" dataKey="score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line yAxisId="left" type="monotone" name="Subj. Quality (x10)" dataKey="quality" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Info className="w-8 h-8 mb-2 text-gray-400" />
              <p>Log at least 2 days of sleep to see trends.</p>
            </div>
          )}
        </div>
      </div>

      {/* Variable Impact */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">Variable Impact Analysis</h3>
        <p className="text-sm text-gray-500 mb-6">Difference in average sleep score when boolean variable is True vs False.</p>
        
        {variableImpact.length > 0 ? (
          <div className="space-y-4">
            {variableImpact.map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                  {item.isSignificant && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Significant</span>}
                </span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-16 text-right ${item.impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.impact > 0 ? '+' : ''}{item.impact.toFixed(1)}
                  </span>
                  {item.impact > 0 ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Need variance in your logs (some days True, some days False) for your toggle variables to calculate impact.
          </div>
        )}
      </div>

      {/* Optimal Routine */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 shadow-xl sm:rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/10 rounded-lg">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-xl leading-6 font-bold">Ultimate Recommendation</h3>
        </div>
        
        {!optimalRoutine ? (
          <p className="text-indigo-100 text-sm">
            We need at least 7 days of sleep logs to generate a statistically significant optimal routine. 
            Keep tracking! ({logs.length}/7 days)
          </p>
        ) : (
          <div className="space-y-6">
            <p className="text-indigo-100 text-sm">
              Based on your historical data, here is the exact combination of variables that yields the highest sleep scores.
            </p>
            
            <div className="bg-white/10 rounded-xl p-5 border border-white/10">
              <h4 className="font-semibold mb-4 text-emerald-300">✅ Do these (Positive Impact)</h4>
              <ul className="space-y-2">
                {optimalRoutine.positiveRoutines.length > 0 ? (
                  optimalRoutine.positiveRoutines.map(r => (
                    <li key={r.key} className="flex items-center text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-3"></span>
                      {r.label} <span className="opacity-60 ml-2 text-xs">(+{r.impact.toFixed(1)} pts)</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm opacity-60 italic">Not enough strong positive data yet.</li>
                )}
              </ul>
            </div>

            <div className="bg-white/10 rounded-xl p-5 border border-white/10">
              <h4 className="font-semibold mb-4 text-rose-300">❌ Avoid these (Negative Impact)</h4>
              <ul className="space-y-2">
                {optimalRoutine.negativeRoutines.length > 0 ? (
                  optimalRoutine.negativeRoutines.map(r => (
                    <li key={r.key} className="flex items-center text-sm">
                      <span className="w-2 h-2 rounded-full bg-rose-400 mr-3"></span>
                      {r.label} <span className="opacity-60 ml-2 text-xs">({r.impact.toFixed(1)} pts)</span>
                    </li>
                  ))
                ) : (
                   <li className="text-sm opacity-60 italic">Not enough strong negative data yet.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* View Details Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Info className="w-4 h-4" />
          View Analysis Details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Details Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}>
          <div 
            className="fixed inset-x-0 bottom-0 z-[101] mt-24 flex flex-col rounded-t-[20px] bg-white shadow-2xl max-h-[85vh] mx-auto w-full max-w-2xl animate-in slide-in-from-bottom-full duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Statistical Breakdown</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-12">
              <p className="text-sm text-gray-600 mb-6">
                This app uses Welch's t-test to determine if there is a statistically significant difference (p &lt; 0.05, represented by |t| &gt; 2.0) in your average watch sleep scores when a daily habit is present versus absent.
              </p>
              
              <div className="space-y-6">
                {variableImpact.length > 0 ? variableImpact.map(item => (
                  <div key={item.key} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">{item.label}</h4>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${item.isSignificant ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                        {item.isSignificant ? 'Significant' : 'Not Significant'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">When True (n={item.countTrue})</div>
                        <div className="font-semibold text-gray-800">{item.avgTrue.toFixed(1)} avg</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">When False (n={item.countFalse})</div>
                        <div className="font-semibold text-gray-800">{item.avgFalse.toFixed(1)} avg</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                      <div><span className="font-medium">Impact:</span> <span className={item.impact > 0 ? 'text-green-600' : 'text-red-600'}>{item.impact > 0 ? '+' : ''}{item.impact.toFixed(2)}</span></div>
                      <div><span className="font-medium">t-Statistic:</span> {item.tStat.toFixed(2)}</div>
                      <div><span className="font-medium">Var (T/F):</span> {item.varTrue.toFixed(1)} / {item.varFalse.toFixed(1)}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-10">Insufficient data for statistical analysis.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
