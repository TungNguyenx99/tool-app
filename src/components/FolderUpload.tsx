'use client';

import { useState, useRef } from 'react';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface ConversionResult {
  originalName: string;
  fileName: string;
  folder: string;
  mimeType: string;
  size: number;
}

interface UploadResult {
  message: string;
  files: string[];
  count: number;
  convertedImages?: ConversionResult[];
  convertedCount?: number;
  groupedResults?: Record<string, ConversionResult[]>;
  errors?: string[];
  zipData?: string;
}

interface DirectoryInputElement extends HTMLInputElement {
  webkitdirectory: boolean;
  directory: boolean;
}

export default function FolderUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const fileArray: UploadedFile[] = Array.from(fileList).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setFiles(fileArray);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();

      // Lấy files từ input
      if (fileInputRef.current?.files) {
        Array.from(fileInputRef.current.files).forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setUploadResult(result);

      if (response.ok) {
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ message: 'Lỗi khi upload', files: [], count: 0, errors: ['Lỗi khi upload'] });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadZip = () => {
    if (uploadResult?.zipData) {
      const zipBuffer = Buffer.from(uploadResult.zipData, 'base64');
      const blob = new Blob([zipBuffer], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted_images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Upload Folder & Chuyển đổi Ảnh sang WebP
        </h2>

        {/* Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📁</div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Kéo thả folder vào đây
              </p>
              <p className="text-sm text-gray-500 mt-2">
                hoặc click để chọn files
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              // @ts-expect-error - webkitdirectory and directory are valid HTML attributes
              webkitdirectory=""
              directory=""
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Chọn Files
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-blue-800">
                Tự động chuyển đổi ảnh sang WebP
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Tất cả ảnh (jpg, png, gif, bmp, tiff) sẽ được tự động chuyển đổi sang định dạng WebP với chất lượng cao
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Files đã chọn ({files.length})
            </h3>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500">📄</span>
                    <div>
                      <p className="font-medium text-gray-700">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
            >
              {isUploading ? 'Đang upload và chuyển đổi...' : 'Upload & Chuyển đổi'}
            </button>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="mt-6 space-y-4">
            {uploadResult.errors && uploadResult.errors.length > 0 ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <p className="font-medium">Lỗi:</p>
                <ul className="mt-2 space-y-1">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index} className="text-sm">• {error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                <p className="font-medium">Thành công!</p>
                <p>Đã upload {uploadResult.count} files</p>

                {uploadResult.convertedImages && uploadResult.convertedImages.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">Ảnh đã chuyển đổi ({uploadResult.convertedCount} files):</p>
                      {uploadResult.zipData && (
                        <button
                          onClick={downloadZip}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                        >
                          📦 Download All (ZIP)
                        </button>
                      )}
                    </div>

                    {uploadResult.groupedResults && (
                      <div className="space-y-4">
                        {Object.entries(uploadResult.groupedResults).map(([folder, images]) => (
                          <div key={folder} className="bg-white rounded-lg p-3 border border-green-200">
                            <h4 className="font-medium text-green-800 mb-2">
                              📁 {folder || 'Root'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {images.map((image, index) => (
                                <div key={index} className="text-sm bg-green-50 p-2 rounded">
                                  <p className="font-medium text-green-700">{image.fileName}</p>
                                  <p className="text-green-600 text-xs">Từ: {image.originalName}</p>
                                  <p className="text-green-600 text-xs">Size: {formatFileSize(image.size)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {uploadResult.files && uploadResult.files.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm font-medium">Files đã upload:</p>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <ul className="text-sm space-y-1">
                        {uploadResult.files.map((file, index) => (
                          <li key={index} className="ml-4">• {file}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
