import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface DynamicListProps {
    items: { id: string; text: string }[];
    onChange: (items: { id: string; text: string }[]) => void;
    placeholder?: string;
    label: string;
    readOnly?: boolean;
}

export const DynamicList: React.FC<DynamicListProps> = ({
    items,
    onChange,
    placeholder = 'Enter item...',
    label,
    readOnly = false
}) => {
    const addItem = () => {
        if (readOnly) return;
        onChange([...items, { id: crypto.randomUUID(), text: '' }]);
    };

    const removeItem = (id: string) => {
        if (readOnly) return;
        onChange(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, text: string) => {
        if (readOnly) return;
        onChange(items.map(item => item.id === id ? { ...item, text } : item));
    };

    return (
        <div className="space-y-3">
            {label && <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{label}</label>}
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-center group animate-in slide-in-from-left-2 duration-300">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-muted border border-gray-100 shadow-sm">
                            {index + 1}
                        </div>
                        <input
                            type="text"
                            value={item.text}
                            disabled={readOnly}
                            onChange={(e) => updateItem(item.id, e.target.value)}
                            placeholder={placeholder}
                            className={`input-modern flex-1 ${readOnly ? 'opacity-70' : ''}`}
                        />
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 shadow-sm hover:shadow-md"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 text-accent bg-accent/5 hover:bg-accent/10 rounded-xl text-sm font-bold transition-all ml-11"
                >
                    <Plus size={16} />
                    <span>Add Item</span>
                </button>
            )}
        </div>
    );
};
