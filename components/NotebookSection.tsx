import React, { useState, useRef, useEffect } from 'react';
import { Note, AudioBlogState } from '../types';
import { generateAudioBlog } from '../services/geminiService';
import { decodeBase64, decodeAudioData, encodeWAV } from '../services/audioUtils';

interface NotebookSectionProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

export const NotebookSection: React.FC<NotebookSectionProps> = ({ notes, onDelete }) => {
  const [blogState, setBlogState] = useState<AudioBlogState>({ status: 'idle' });
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.playbackRate.value = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleGenerateBlog = async () => {
    if (notes.length === 0) return;
    try {
      setBlogState({ status: 'generating_audio' });
      const { audioBase64 } = await generateAudioBlog(notes, selectedVoice);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const rawBytes = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(rawBytes, ctx, 24000, 1);
      setBlogState({ status: 'idle', audioData: audioBuffer });
    } catch (error) {
      setBlogState({ status: 'error' });
    }
  };

  const playBlog = async () => {
    if (!blogState.audioData || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    
    setBlogState(prev => ({ ...prev, status: 'playing' }));
    const source = audioContextRef.current.createBufferSource();
    source.buffer = blogState.audioData;
    source.playbackRate.value = playbackSpeed;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
        setBlogState(prev => ({ ...prev, status: 'idle' }));
        currentSourceRef.current = null;
    };
    currentSourceRef.current = source;
    source.start();
  };

  const downloadAudio = () => {
    if (!blogState.audioData) return;
    const wavBlob = encodeWAV(blogState.audioData.getChannelData(0), blogState.audioData.sampleRate);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingotube-notebook-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Study Notebook
            <span className="ml-auto bg-orange-200 text-orange-800 text-xs py-1 px-2 rounded-full">{notes.length} items</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {notes.length === 0 ? (
            <div className="text-center text-gray-400 py-10"><p>No notes yet.</p><p className="text-sm">Click words in the transcript to add them.</p></div>
        ) : (
            notes.map((note) => (
                <div key={note.id} className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden group transition-all hover:shadow-md ${note.type === 'word' ? 'border-orange-100' : 'border-indigo-100'}`}>
                    <div className={`px-4 py-2 flex justify-between items-center ${note.type === 'word' ? 'bg-orange-50' : 'bg-indigo-50'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${note.type === 'word' ? 'text-orange-500' : 'text-indigo-500'}`}>
                            {note.type}
                        </span>
                        <button onClick={() => onDelete(note.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <div className="font-bold text-gray-900 text-xl leading-tight mb-2">{note.original}</div>
                        {note.translation && (
                            <div className="flex gap-2 items-start mb-3">
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold py-0.5 px-1.5 rounded mt-0.5">Meaning</span>
                                <div className="text-sm text-slate-700 font-medium">{note.translation}</div>
                            </div>
                        )}
                        {note.context && (
                            <div className="mt-2 pt-2 border-t border-gray-50">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Context Usage</span>
                                <div className="text-xs text-slate-500 leading-relaxed italic line-clamp-2">"{note.context}"</div>
                            </div>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>

      <div className="p-5 bg-white border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
        <div>
             <div className="flex justify-between items-end mb-3">
                <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Voice & Speed</label>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    {SPEED_OPTIONS.map(s => (
                        <button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${playbackSpeed === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}x</button>
                    ))}
                </div>
             </div>
             <div className="grid grid-cols-5 gap-2">
                 {VOICES.map(v => (
                    <button key={v} onClick={() => setSelectedVoice(v)} disabled={blogState.status !== 'idle'} className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 border-2 ${selectedVoice === v ? 'border-orange-400 bg-orange-50 text-orange-700 transform scale-105 shadow-sm' : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${selectedVoice === v ? 'bg-orange-200 text-orange-600' : 'bg-gray-200 text-white'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        <span className="text-[10px] font-bold">{v}</span>
                    </button>
                 ))}
             </div>
        </div>

        {blogState.audioData ? (
            <div className="flex gap-2 animate-fade-in">
                <button onClick={playBlog} disabled={blogState.status === 'playing'} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${blogState.status === 'playing' ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600'}`}>
                    {blogState.status === 'playing' ? <span className="flex items-center gap-2"><span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>Playing...</span> : <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Play Blog</>}
                </button>
                <button onClick={downloadAudio} className="px-4 py-3 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-800 shadow-lg flex items-center justify-center transition-transform hover:-translate-y-0.5"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                <button onClick={() => setBlogState({ status: 'idle' })} className="px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">✕</button>
            </div>
        ) : (
            <button onClick={handleGenerateBlog} disabled={notes.length === 0 || blogState.status.startsWith('generating')} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 group ${notes.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'}`}>
                {blogState.status === 'generating_audio' ? <div className="flex items-center gap-2"><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</div> : <><span className="text-sm">Create Audio Review</span><svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></>}
            </button>
        )}
      </div>
    </div>
  );
};
