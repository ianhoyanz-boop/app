import React, { useState, useEffect } from 'react';

interface InputSectionProps {
  onStart: (url: string) => Promise<void>;
}

export const InputSection: React.FC<InputSectionProps> = ({ onStart }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Clear progress if component unmounts or resets
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setStatusText('');
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setProgress(5);
    setStatusText('Initializing connection...');

    // Simulate progress while waiting for API
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Hold at 90% until done
        const inc = Math.random() * 8; 
        const next = prev + inc;
        
        // Dynamic status updates based on progress simulation
        if (next > 20 && next < 45) setStatusText('Searching for transcript...');
        else if (next >= 45 && next < 70) setStatusText('Parsing text content...');
        else if (next >= 70) setStatusText('Preparing AI audio engine...');
        
        return Math.min(next, 90);
      });
    }, 600);

    try {
      await onStart(url);
      setProgress(100);
      setStatusText('Ready!');
    } catch (e) {
      // Error is handled by parent (alert), but we catch here to ensure cleanup happens
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center animate-fade-in relative z-10">
      
      {/* Decorative background blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="mb-12 relative">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-sm tracking-wide uppercase">
            AI-Powered Learning
        </div>
        <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
          Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Real Content</span>
        </h1>
        <p className="text-slate-500 text-xl max-w-2xl mx-auto leading-relaxed">
          Paste a YouTube URL. We'll extract the exact content, generate audio, and create an interactive study guide for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex flex-col bg-white rounded-2xl p-2 shadow-xl ring-1 ring-slate-900/5">
          <div className="flex items-center">
            <div className="pl-4 text-slate-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <input
              type="text"
              className="w-full px-4 py-5 text-xl bg-transparent outline-none text-slate-900 placeholder-slate-400 font-medium disabled:opacity-50"
              placeholder="Paste YouTube Link (e.g. youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
            {!isLoading && (
                <button
                type="submit"
                className="min-w-[140px] py-4 px-8 rounded-xl font-bold text-white text-lg transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5"
                >
                Start
                </button>
            )}
          </div>
          
          {isLoading && (
             <div className="px-4 pb-4 pt-2">
                 <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                     <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                     ></div>
                 </div>
                 <div className="flex justify-between items-center text-sm font-medium">
                     <span className="text-indigo-600 animate-pulse">{statusText}</span>
                     <span className="text-slate-400">{Math.round(progress)}%</span>
                 </div>
             </div>
          )}
        </div>
      </form>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl opacity-80">
          <div className="flex flex-col gap-2 p-4 rounded-2xl hover:bg-white/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h3 className="font-bold text-slate-900">Audio Sync</h3>
              <p className="text-sm text-slate-500">Listen to the content with perfectly synchronized highlighting.</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-2xl hover:bg-white/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <h3 className="font-bold text-slate-900">Fill-in Practice</h3>
              <p className="text-sm text-slate-500">Switch to Practice mode to test your listening by filling in blanks.</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-2xl hover:bg-white/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h3 className="font-bold text-slate-900">Download Notes</h3>
              <p className="text-sm text-slate-500">Save words and sentences, then download a custom audio review.</p>
          </div>
      </div>
    </div>
  );
};
