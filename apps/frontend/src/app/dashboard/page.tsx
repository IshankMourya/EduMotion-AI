'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatFileSize, formatDuration, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, Upload, FileText, Video, Trash2, RefreshCw, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from 'sonner';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({ title: newTitle.trim(), status: 'draft' })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert('Failed to create project');
    } else {
      setNewTitle('');
      router.push(`/dashboard/projects/${data.id}`);
    }
    setCreating(false);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Failed to delete project');
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your educational video projects</p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first educational video project</p>
            <Button onClick={() => router.push('/dashboard/projects/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={() => handleDeleteProject(project.id)}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}

interface Project {
  id: string;
  title: string;
  status: string;
  pdf_size?: number;
  pdf_pages?: number;
  video_duration_sec?: number;
  video_path?: string;
  thumbnail_path?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

function ProjectCard({ project, onDelete, onClick }: { project: Project; onDelete: () => void; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg truncate">{project.title}</CardTitle>
        <Badge className={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {project.pdf_pages && (
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {project.pdf_pages} pages
            </span>
          )}
          {project.pdf_size && (
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {formatFileSize(project.pdf_size)}
            </span>
          )}
          {project.video_duration_sec && (
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {formatDuration(project.video_duration_sec)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClick}>Open Project</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}