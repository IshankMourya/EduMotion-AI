export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  pdf_path?: string;
  pdf_size?: number;
  pdf_pages?: number;
  status: ProjectStatus;
  storyboard_json?: Storyboard;
  video_path?: string;
  video_duration_sec?: number;
  video_size?: number;
  thumbnail_path?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | 'draft'
  | 'uploaded'
  | 'extracting'
  | 'extracted'
  | 'analyzing'
  | 'storyboard_ready'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface Storyboard {
  scenes: Scene[];
  total_duration_sec: number;
  metadata: {
    pdf_title: string;
    pdf_pages: number;
    generated_at: string;
    model: string;
  };
}

export interface Scene {
  id: string;
  title: string;
  narration: string;
  visual_spec: VisualSpec;
  duration_sec: number;
  order: number;
}

export interface VisualSpec {
  type: 'title' | 'concept' | 'diagram' | 'code' | 'chart' | 'summary';
  props: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PDFChunk {
  id: string;
  project_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
  embedding?: number[];
  page_number?: number;
  created_at: string;
}