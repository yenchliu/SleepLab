import React, { useState } from 'react';
import { VariableDef, VariableType } from '../types';
import { X, Plus, GripVertical, Settings2, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  schema: VariableDef[];
  onClose: () => void;
  onSave: (newSchema: VariableDef[]) => void;
}

export function VariablesEditor({ isOpen, schema, onClose, onSave }: Props) {
  const [editingSchema, setEditingSchema] = useState<VariableDef[]>([...schema]);

  if (!isOpen) return null;

  const handleAdd = () => {
    setEditingSchema([
      ...editingSchema,
      {
        id: `custom_var_${Date.now()}`,
        label: 'New Variable',
        type: 'boolean',
      }
    ]);
  };

  const handleRemove = (id: string) => {
    setEditingSchema(editingSchema.filter(v => v.id !== id));
  };

  const handleChange = (id: string, field: keyof VariableDef, value: any) => {
    setEditingSchema(editingSchema.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Edit Log Variables</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {editingSchema.map((item, index) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleChange(item.id, 'label', e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data Type</label>
                  <select
                    value={item.type}
                    onChange={(e) => handleChange(item.id, 'type', e.target.value as VariableType)}
                    className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  >
                    <option value="boolean">Toggle (Yes/No)</option>
                    <option value="number">Number</option>
                    <option value="time">Time (Hr/Min)</option>
                    <option value="slider">Slider (1-10)</option>
                    <option value="select">Dropdown (Select)</option>
                  </select>
                </div>

                {item.type === 'select' && (
                  <div className="w-full">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
                    <input
                      type="text"
                      value={item.options?.join(', ') || ''}
                      onChange={(e) => handleChange(item.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''))}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                      placeholder="e.g. morning, afternoon, evening"
                    />
                  </div>
                )}

                <div className="flex justify-end w-full sm:w-auto pt-5 sm:pt-6">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove Variable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAdd}
            className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Variable
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(editingSchema);
              onClose();
            }}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
