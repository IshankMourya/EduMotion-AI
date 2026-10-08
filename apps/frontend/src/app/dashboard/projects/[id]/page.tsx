'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatFileSize, getStatusColor, getStatusLabel } from '@/lib/utils';
import { FileText, Video, RefreshCw, Play, Trash2, Eye, Download, MoreHorizontal, Target, Lightbulb, BookOpen, Code2, AlertTriangle, Clock, Users, CheckCircle, XCircle, Film, Loader2, AlertCircle, MessageSquare, Send, Loader } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster, toast } from 'sonner';
import { PDFUploader } from '@/components/projects/pdf-uploader';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function apiCall(endpoint: string, method: string = 'POST', body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${BACKEND_URL}/api/v1/process${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  return response.json();
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);

  const fetchProject = useCallback(async () => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (error) {
      console.error(error);
      toast.error('Failed to load project');
      router.push('/dashboard');
    } else {
      setProject(data);
    }
    setLoading(false);
  }, [projectId, router]);

  // Poll for progress updates when processing
  useEffect(() => {
    if (project && (project.status === 'extracting' || project.status === 'analyzing' || 
        project.status === 'generating_storyboard' || project.status === 'rendering')) {
      setPolling(true);
    } else {
      setPolling(false);
    }
  }, [project?.status]);

  useEffect(() => {
    if (!polling) return;
    
    const interval = setInterval(() => {
      fetchProject();
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, [polling, fetchProject]);

  const handleUploadComplete = (filePath: string, fileSize: number) => {
    fetchProject();
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleProcess = async () => {
    if (!project) return;
    setProcessing(true);
    try {
      await apiCall('/pdf', 'POST', { projectId });
      toast.success('Processing started');
      fetchProject();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!project) return;
    setProcessing(true);
    try {
      await apiCall('/analyze', 'POST', { projectId });
      toast.success('Analysis started');
      fetchProject();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to start analysis');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!project) return;
    setProcessing(true);
    try {
      await apiCall('/storyboard', 'POST', { projectId });
      toast.success('Storyboard generation started');
      fetchProject();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to start storyboard generation');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveStoryboard = async () => {
    if (!project) return;
    setProcessing(true);
    try {
      await apiCall(`/storyboard/${projectId}/approve`, 'POST');
      toast.success('Storyboard approved for rendering');
      fetchProject();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve storyboard');
    } finally {
      setProcessing(false);
    }
  };

  const handleRender = async () => {
    if (!project) return;
    setProcessing(true);
    try {
      await apiCall('/video', 'POST', { projectId });
      toast.success('Rendering started');
      fetchProject();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to start rendering');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) toast.error('Failed to delete');
    else router.push('/dashboard');
  };

  if (loading) return <ProjectDetailSkeleton />;

  const isProcessing = project?.status === 'extracting' || project?.status === 'analyzing' || 
                       project?.status === 'generating_storyboard' || project?.status === 'rendering';
  const isCompleted = project?.status === 'completed';
  const isFailed = project?.status === 'failed';

  return (
<div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project?.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {project?.status === 'draft' ? 'Upload a PDF to get started' : `Status: ${getStatusLabel(project?.status || '')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={getStatusColor(project?.status || '')}>{getStatusLabel(project?.status || '')}</Badge>
          </div>
        </div>

        {/* Progress Bar */}
        {(isProcessing || project?.progress !== undefined) && project && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Progress</CardTitle>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {project.progress !== undefined ? `${project.progress}%` : '—'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={project.progress || 0} className="h-3" />
                {project.progress_message && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.progress_message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {project?.status === 'draft' || project?.status === 'uploaded' ? (
            <PDFUploader
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
          ) : (
            <ProjectInfo project={project!} />
          )}

          {project?.status === 'extracted' && (
            <Card>
              <CardHeader>
                <CardTitle>Ready for Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleProcess} disabled={processing} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {processing ? 'Analyzing...' : 'Analyze Document with Qwen3'}
                </Button>
              </CardContent>
            </Card>
          )}

          {project?.status === 'analyzing' && (
            <Card>
              <CardHeader>
                <CardTitle>Analyzing with Qwen3...</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600 dark:text-gray-300">Qwen3 is analyzing your document...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {project?.status === 'analyzed' && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerateStoryboard} disabled={processing} className="w-full">
                  <Film className="w-4 h-4 mr-2" />
                  {processing ? 'Generating...' : 'Generate Storyboard'}
                </Button>
              </CardContent>
            </Card>
          )}

          {project?.status === 'generating_storyboard' && (
            <Card>
              <CardHeader>
                <CardTitle>Generating Storyboard...</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600 dark:text-gray-300">Qwen3 is creating your storyboard...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {(project?.status === 'storyboard_ready' || project?.status === 'approved_for_render' || project?.status === 'completed') && project.storyboard_json && (
            <StoryboardPreview
              storyboard={project.storyboard_json}
              status={project.status}
              onApprove={handleApproveStoryboard}
              onRender={handleRender}
              processing={processing}
            />
          )}

          {(project?.status === 'analyzed' || project?.status === 'storyboard_ready' || project?.status === 'approved_for_render') && !project.storyboard_json && (
            <Card>
              <CardHeader>
                <CardTitle>Ready for Storyboard</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerateStoryboard} disabled={processing} className="w-full">
                  <Film className="w-4 h-4 mr-2" />
                  {processing ? 'Generating...' : 'Generate Storyboard'}
                </Button>
              </CardContent>
            </Card>
          )}

          {project?.status === 'approved_for_render' && !project.storyboard_json && (
            <Card>
              <CardHeader>
                <CardTitle>Approved for Rendering</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRender} disabled={processing} className="w-full">
                  <Video className="w-4 h-4 mr-2" />
                  {processing ? 'Rendering...' : 'Render Video'}
                </Button>
              </CardContent>
            </Card>
          )}

          {project?.status === 'completed' && project.video_path && (
            <VideoPlayerSection project={project} />
          )}

          {/* Chat Interface - Available for completed projects and any project with extracted content */}
          {(project?.status === 'completed' || project?.status === 'analyzed' || project?.status === 'storyboard_ready' || project?.status === 'approved_for_render') && (
            <ChatInterface projectId={projectId} />
          )}
        </div>

        <div className="space-y-4">
          <ProjectActions project={project!} onDelete={handleDelete} />
          {project?.pdf_path && <ProjectFiles project={project} />}
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}

interface Project {
  id: string;
  title: string;
  description?: string;
  pdf_path?: string;
  pdf_size?: number;
  pdf_pages?: number;
  status: string;
  storyboard_json?: StoryboardData;
  analysis_json?: AnalysisResult;
  video_path?: string;
  video_duration_sec?: number;
  video_size?: number;
  thumbnail_path?: string;
  error_message?: string;
  progress?: number;
  progress_message?: string;
  created_at: string;
  updated_at: string;
}

interface AnalysisResult {
  title: string;
  summary: string;
  learning_objectives: string[];
  key_concepts: string[];
  definitions: Record<string, string>;
  examples: string[];
  difficult_topics: string[];
  estimated_duration_minutes: number;
  target_audience: string;
}

function ProjectInfo({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="PDF Pages" value={project.pdf_pages?.toString() || '—'} />
          <InfoRow label="PDF Size" value={project.pdf_size ? formatFileSize(project.pdf_size) : '—'} />
          <InfoRow label="Video Duration" value={project.video_duration_sec ? `${project.video_duration_sec}s` : '—'} />
          <InfoRow label="Video Size" value={project.video_size ? formatFileSize(project.video_size) : '—'} />
        </div>
        {project.error_message && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{project.error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisDisplay({ analysis }: { analysis: AnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Document Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{analysis.title}</h4>
          <p className="text-gray-600 dark:text-gray-300">{analysis.summary}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AnalysisSection
            title="Learning Objectives"
            icon={<Target className="w-5 h-5 text-blue-500" />}
            items={analysis.learning_objectives}
          />
          <AnalysisSection
            title="Key Concepts"
            icon={<Lightbulb className="w-5 h-5 text-yellow-500" />}
            items={analysis.key_concepts}
          />
          <AnalysisSection
            title="Examples"
            icon={<Code2 className="w-5 h-5 text-green-500" />}
            items={analysis.examples}
          />
          <AnalysisSection
            title="Difficult Topics"
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            items={analysis.difficult_topics}
          />
        </div>

        <div>
          <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            Definitions
          </h5>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(analysis.definitions).map(([term, definition]) => (
              <div key={term} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">{term}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{definition}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Est. {analysis.estimated_duration_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {analysis.target_audience}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisSection({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h5>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface StoryboardScene {
  id: string;
  order: number;
  title: string;
  narration: string;
  body_text: string;
  visual_type: string;
  visual_description: string;
  source_reference: string;
  duration_seconds: number;
}

interface StoryboardData {
  scenes: StoryboardScene[];
  total_duration_seconds: number;
  metadata: Record<string, any>;
}

function StoryboardPreview({
  storyboard,
  status,
  onApprove,
  onRender,
  processing,
}: {
  storyboard: StoryboardData;
  status: string;
  onApprove: () => void;
  onRender: () => void;
  processing: boolean;
}) {
  const canApprove = status === 'storyboard_ready';
  const canRender = status === 'approved_for_render' || status === 'completed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            Storyboard Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {storyboard.scenes.length} scenes · {storyboard.total_duration_seconds}s
            </span>
            {canApprove && (
              <Button onClick={onApprove} disabled={processing} size="sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {canRender && !processing && (
              <Button onClick={onRender} variant="default" size="sm">
                <Video className="w-4 h-4 mr-2" />
                Render Video
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {storyboard.scenes.map((scene, index) => (
            <SceneCard key={scene.id} scene={scene} index={index + 1} />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Total: {storyboard.scenes.length} scenes</span>
          <span>Estimated: {storyboard.total_duration_seconds}s ({Math.round(storyboard.total_duration_seconds / 60)}m {storyboard.total_duration_seconds % 60}s)</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SceneCard({ scene, index }: { scene: StoryboardScene; index: number }) {
  const visualTypeColors: Record<string, string> = {
    title: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    concept: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    diagram: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    code: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    chart: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    summary: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-semibold text-gray-900 dark:text-white">{scene.title}</h5>
            <span className={`px-2 py-0.5 text-xs rounded-full ${visualTypeColors[scene.visual_type] || 'bg-gray-100 text-gray-700'}`}>
              {scene.visual_type}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {scene.duration_seconds}s
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{scene.narration}</p>
          <div className="grid gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <span className="font-medium">Visual:</span> {scene.visual_description}
            </div>
            <div>
              <span className="font-medium">Source:</span> {scene.source_reference}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function VideoPlayerSection({ project }: { project: Project }) {
  const [signedUrl, setSignedUrl] = useState<string>('');

  useEffect(() => {
    if (project.video_path) {
      supabase.storage.from('videos').createSignedUrl(project.video_path, 3600).then(({ data }) => {
        if (data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    }
  }, [project.video_path]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <video
          src={signedUrl}
          controls
          className="w-full rounded-lg bg-black"
          poster={project.thumbnail_path}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(signedUrl, '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="outline" onClick={() => {
            const a = document.createElement('a');
            a.href = signedUrl;
            a.download = `${project.title}.mp4`;
            a.click();
          }}>
            <Download className="w-4 h-4 mr-2" />
            Download MP4
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectActions({ project, onDelete }: { project: Project; onDelete: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <MoreHorizontal className="w-4 h-4" />
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {project.status === 'completed' && project.video_path && (
              <>
                <DropdownMenuItem>
                  <Play className="w-4 h-4 mr-2" />
                  Play Video
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download MP4
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              View Storyboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

function ProjectFiles({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {project.pdf_path && (
          <FileRow name={`${project.title}.pdf`} size={project.pdf_size} icon={<FileText className="w-4 h-4" />} />
        )}
        {project.video_path && (
          <FileRow name={`${project.title}.mp4`} size={project.video_size} icon={<Video className="w-4 h-4" />} />
        )}
      </CardContent>
    </Card>
  );
}

function FileRow({ name, size, icon }: { name: string; size?: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className="text-gray-500">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-gray-500">{size ? formatFileSize(size) : '—'}</p>
      </div>
    </div>
  );
}

function ChatInterface({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await apiCall(`/chat/${projectId}/history`);
      setMessages(response);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setLoading(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      project_id: projectId,
      user_id: '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await apiCall(`/chat/${projectId}`, 'POST', { message: userMessage });
      
      // Replace temp message with actual response
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        {
          ...tempUserMsg,
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: response.response,
        }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Chat with Document
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm">Start a conversation about your document</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${msg.id}-${idx}`}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about the document..."
            disabled={loading}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(e))}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="sm"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function ProjectDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card><CardContent className="py-12"><div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mx-auto" /></CardContent></Card>
        </div>
        <div><Card><CardContent className="py-8"><div className="h-8 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" /></CardContent></Card></div>
      </div>
    </div>
  );
}