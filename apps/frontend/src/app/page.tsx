import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase-server';

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            EduMotion AI
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Transform your educational notes into animated narrated videos using local AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <FeatureCard
            icon="FileText"
            title="Upload PDF"
            description="Drag and drop your educational notes. We extract text, tables, and diagrams using Docling."
          />
          <FeatureCard
            icon="Brain"
            title="Local AI Analysis"
            description="Qwen3 27B runs locally via Ollama to create storyboards and explanations from your content."
          />
          <FeatureCard
            icon="Film"
            title="Animated Video"
            description="Remotion renders programmatic animations. Piper TTS adds narration. FFmpeg produces the final MP4."
          />
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Runs entirely on your MacBook Air M5. No cloud AI APIs required.
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon: IconName, title, description }: { icon: string; title: string; description: string }) {
  const icons: Record<string, React.ReactNode> = {
    FileText: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    Brain: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    Film: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-left">
      <div className="text-blue-600 dark:text-blue-400 mb-4">{icons[IconName]}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}