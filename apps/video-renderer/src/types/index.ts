export interface VisualSpec {
  type: 'title' | 'concept' | 'diagram' | 'code' | 'chart' | 'summary';
  props: Record<string, unknown>;
}

export interface Scene {
  id: string;
  title: string;
  narration: string;
  visual_spec: VisualSpec;
  duration_sec: number;
  order: number;
}

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

export interface VideoProps {
  storyboard: Storyboard;
  width?: number;
  height?: number;
  fps?: number;
}