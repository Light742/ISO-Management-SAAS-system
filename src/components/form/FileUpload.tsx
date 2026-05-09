import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface FileUploadProps {
    files: { name: string; url: string }[];
    onFilesChange: (files: { name: string; url: string }[]) => void;
    onUpload: (file: File) => Promise<string>;
    disabled?: boolean;
    readOnly?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    files,
    onFilesChange,
    onUpload,
    disabled = false,
    readOnly = false
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Combine disabled and readOnly
    const isDisabled = disabled || readOnly;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isDisabled) return;
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        try {
            const newFiles = [...files];
            for (const file of Array.from(selectedFiles)) {
                if (file.type !== 'application/pdf') {
                    alert(`${file.name} is not a PDF file. Skipping.`);
                    continue;
                }

                const url = await onUpload(file);
                newFiles.push({ name: file.name, url });
            }
            onFilesChange(newFiles);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        if (isDisabled) return;
        onFilesChange(files.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                disabled={isDisabled}
                className="hidden"
            />

            {!isDisabled && (
                <div
                    onClick={() => !isDisabled && !uploading && inputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                        ${uploading ? 'bg-gray-50 border-gray-200 cursor-wait' : 'bg-white border-gray-100 hover:border-accent hover:bg-accent/5'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed hidden' : ''}
                    `}
                >
                    <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors
                        ${uploading ? 'bg-accent/10 text-accent' : 'bg-gray-50 text-muted group-hover:bg-accent group-hover:text-white'}
                    `}>
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm">
                            {uploading ? 'Uploading Documents...' : 'Click to Upload PDF'}
                        </p>
                        <p className="text-xs text-muted mt-1">Maximum file size: 10MB</p>
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-soft hover:shadow-premium transition-all animate-in slide-in-from-bottom-2 duration-300"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold truncate pr-4">{file.name}</p>
                                    <p className="text-[10px] text-muted uppercase font-bold tracking-wider">PDF Document</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-colors"
                                >
                                    View
                                </a>
                                {!isDisabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isDisabled && files.length === 0 && (
                <div className="text-center py-8 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                    <p className="text-sm text-muted">No attachments.</p>
                </div>
            )}
        </div>
    );
};
