import React from 'react';
import { Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { DynamicList } from './DynamicList';

export interface TableColumn {
    key: string;
    label: string;
    type?: 'text' | 'select' | 'list' | 'textarea';
    options?: { value: string; label: string }[];
    width?: string;
}

interface DynamicTableProps {
    columns: TableColumn[];
    rows: Record<string, any>[];
    onChange: (rows: Record<string, any>[]) => void;
    onClauseChange?: (clause: string, rowIndex: number) => void;
    readOnly?: boolean;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
    columns,
    rows,
    onChange,
    onClauseChange,
    readOnly = false
}) => {
    const addRow = () => {
        if (readOnly) return;
        const newRow: Record<string, any> = { id: crypto.randomUUID() };
        columns.forEach(col => {
            if (col.type === 'list') {
                newRow[col.key] = [];
            } else if (col.type === 'select' && col.options) {
                newRow[col.key] = col.options[0]?.value;
            } else {
                newRow[col.key] = '';
            }
        });
        onChange([...rows, newRow]);
    };

    const removeRow = (id: string) => {
        if (readOnly) return;
        onChange(rows.filter(row => row.id !== id));
    };

    const updateRow = (id: string, key: string, value: any) => {
        if (readOnly) return;
        const updatedRows = rows.map(row =>
            row.id === id ? { ...row, [key]: value } : row
        );
        onChange(updatedRows);

        if (key === 'clause_ref' && onClauseChange) {
            const rowIndex = rows.findIndex(r => r.id === id);
            onClauseChange(value, rowIndex);
        }
    };

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="w-full border-separate border-spacing-0">
                    <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider w-16 border-b border-gray-100 first:rounded-tl-xl">#</th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider border-b border-gray-100 whitespace-nowrap group cursor-help transition-colors hover:text-primary"
                                    style={{ width: col.width }}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.label}
                                        {col.label.includes('Ref') && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                            ))}
                            {!readOnly && <th className="px-6 py-4 w-16 border-b border-gray-100 last:rounded-tr-xl"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map((row, index) => (
                            <tr key={row.id} className="group hover:bg-gray-50/50 transition-colors duration-200">
                                <td className="px-6 py-4 text-sm font-bold text-muted tabular-nums align-top pt-6">{index + 1}</td>
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 align-top">
                                        {col.type === 'list' ? (
                                            <div className="min-w-[250px]">
                                                <DynamicList
                                                    items={row[col.key] || []}
                                                    onChange={(items) => updateRow(row.id, col.key, items)}
                                                    readOnly={readOnly}
                                                    label=""
                                                    placeholder="Add evidence..."
                                                />
                                            </div>
                                        ) : col.type === 'select' && col.options ? (
                                            <div className="relative group/select">
                                                <select
                                                    value={row[col.key]}
                                                    disabled={readOnly}
                                                    onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                                                    className={`w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer font-medium text-sm shadow-sm hover:border-gray-300 ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                                >
                                                    {col.options.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 group-hover/select:text-primary transition-colors">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                </div>
                                            </div>
                                        ) : col.key === 'description' || col.type === 'textarea' ? (
                                            <textarea
                                                value={row[col.key] || ''}
                                                disabled={readOnly}
                                                onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                                                className={`w-full bg-white text-gray-700 border border-gray-200 rounded-xl py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm shadow-sm hover:border-gray-300 min-h-[80px] resize-y ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                                placeholder={readOnly ? '' : `Enter details...`}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={row[col.key] || ''}
                                                disabled={readOnly}
                                                onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                                                className={`w-full bg-white text-gray-700 border border-gray-200 rounded-xl py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm shadow-sm hover:border-gray-300 ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                                placeholder={readOnly ? '' : `Type here...`}
                                            />
                                        )}
                                    </td>
                                ))}
                                {!readOnly && (
                                    <td className="px-6 py-4 align-top pt-5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform hover:scale-105 active:scale-95"
                                            title="Remove Row"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + (readOnly ? 1 : 2)} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400 space-y-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                            <ArrowUpDown size={20} className="opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium">No items added yet</p>
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={addRow}
                                                className="text-primary text-xs font-bold hover:underline"
                                            >
                                                Add your first entry
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {!readOnly && (
                <div className="flex justify-start pl-2">
                    <button
                        type="button"
                        onClick={addRow}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all hover:border-primary hover:text-primary hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Plus size={12} className="text-gray-500 group-hover:text-primary transition-colors" />
                        </div>
                        <span>Add New Row</span>
                    </button>
                </div>
            )}
        </div>
    );
};
