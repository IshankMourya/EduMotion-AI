'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createBrowserClient } from '@supabase/ssr';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['application/pdf'];

interface PDFUploaderProps {
  projectId: string;
  onUploadComplete?: (filePath: string, fileSize: number) => void;
  onError?: (error: string) => void;
}

export function PDFUploader({ projectId, onUploadComplete, onError }: PDFUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PDF files are accepted';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const errorMsg = rejectedFiles[0]?.errors[0]?.message || 'File rejected';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }, [validateFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);

      const response = await fetch('/api/backend/api/v1/upload/pdf', {
        method: 'POST',
        body: formData,
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const data = await response.json();
      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setUploadProgress(100);
      toast.success('PDF uploaded successfully');
      onUploadComplete?.(data.file_path, data.file_size);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
      onError?.(message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
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
    <Card className={isDragReject ? 'border-red-500' : isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''} {...getRootProps()}>
      <input {...getInputProps()} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-10 h-10 text-red-500" />
                <div>
                  <p className="font-medium truncate max-w-[300px]">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={removeFile} disabled={uploading}>
                <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {!uploading && !error && (
              <Button onClick={handleUpload} className="w-full" size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Upload to Server
              </Button>
            )}

            {uploading && uploadProgress === 100 && (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Upload complete!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center" role="button" tabIndex={0}>
            <Upload className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {isDragActive ? 'Drop the PDF here' : 'Drag & drop your PDF'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">or click to browse</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Max 50MB • PDF only</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}