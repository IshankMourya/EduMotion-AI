import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    extracting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    extracted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    analyzing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    analyzed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    generating_storyboard: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    storyboard_ready: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    approved_for_render: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    rendering: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[status] || colors.draft;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    uploaded: 'Uploaded',
    extracting: 'Extracting',
    extracted: 'Extracted',
    analyzing: 'Analyzing',
    analyzed: 'Analyzed',
    generating_storyboard: 'Generating Storyboard',
    storyboard_ready: 'Storyboard Ready',
    approved_for_render: 'Approved for Render',
    rendering: 'Rendering',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status] || status;
}