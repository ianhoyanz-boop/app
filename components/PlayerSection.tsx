import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, Note, StudyMode, Lesson } from '../types';
import { translateContent, generateSegmentAudio } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../services/audioUtils';

interface PlayerSectionProps {
  lesson: Lesson;
  audioContext: AudioContext; 
  onAddNote: (note: Omit<Note, 'id' | 'timestamp'>) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

export const PlayerSection: React.FC<PlayerSectionProps> = ({ lesson, audioContext, onAddNote }) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>(lesson.transcript);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingSegmentId, setLoadingSegmentId] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferCache = useRef<Map<number, AudioBuffer>>(new Map());
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);

  const [selectedWord, setSelectedWord] = useState<{word: string, x: number, y: number} | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('standard');
  const [showTranslation, setShowTranslation] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  useEffect(() => {
    speedRef.current = playbackSpeed;
    if (currentSourceRef.current) {
      currentSourceRef.current.playbackRate.value = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    setSegments(lesson.transcript);
    setActiveSegmentIndex(null);
    stopAudio();
    audioBufferCache.current.clear();
  }, [lesson.title]);

  useEffect(() => {
    setSegments(prev => prev.map(p => {
        const updated = lesson.transcript.find(t => t.id === p.id);
        return updated ? { ...p, textZh: updated.textZh } : p;
    }));
  }, [lesson.transcript]);

  useEffect(() => {
    if (activeSegmentIndex !== null) {
      const element = document.getElementById(`segment-${activeSegmentIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIndex]);

  const stopAudio = () => {
    if (currentSourceRef.current) {
        try {
            currentSourceRef.current.stop();
            currentSourceRef.current.disconnect();
        } catch (e) {}
        currentSourceRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setLoadingSegmentId(null);
  };

  const getAudioBuffer = async (index: number): Promise<AudioBuffer | null> => {
    const segment = segments[index];
    if (!segment) return null;
    if (audioBufferCache.current.has(segment.id)) {
        return audioBufferCache.current.get(segment.id)!;
    }
    try {
        setLoadingSegmentId(segment.id);
        const base64 = await generateSegmentAudio(segment.textEn);
        const rawBytes = decodeBase64(base64);
        const buffer = await decodeAudioData(rawBytes, audioContext, 24000, 1);
        audioBufferCache.current.set(segment.id, buffer);
        setLoadingSegmentId(null);
        return buffer;
    } catch (e) {
        setLoadingSegmentId(null);
        return null;
    }
  };

  const playSegment = async (index: number, autoContinue: boolean = true) => {
    if (index >= segments.length) {
        stopAudio();
        setActiveSegmentIndex(null);
        return;
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
    if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch(e){}
    }
    setActiveSegmentIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;
    const buffer = await getAudioBuffer(index);
    if (!isPlayingRef.current) return;
    if (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = speedRef.current;
        source.connect(audioContext.destination);
        source.onended = () => {
            if (isPlayingRef.current && autoContinue) {
                playSegment(index + 1, true);
            } else if (!autoContinue) {
                setIsPlaying(false);
                isPlayingRef.current = false;
            }
        };
        currentSourceRef.current = source;
        source.start(0);
        if (autoContinue && index + 1 < segments.length) getAudioBuffer(index + 1);
    } else {
        stopAudio();
    }
  };

  const togglePlay = () => {
    if (isPlaying) stopAudio();
    else playSegment(activeSegmentIndex !== null ? activeSegmentIndex : 0, true);
  };

  const handleSegmentClick = (index: number) => {
    if (activeSegmentIndex === index && isPlaying) stopAudio();
    else playSegment(index, true);
  };

  const handleWordClick = (e: React.MouseEvent, word: string, context: string) => {
    e.stopPropagation();
    stopAudio(); 
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const leftPos = Math.min(rect.left, window.innerWidth - 250); 
    setSelectedWord({ word, x: leftPos, y: rect.top - 60 });
  };

  const saveSelectedWord = async () => {
    if (!selectedWord) return;
    const contextSegment = segments.find(s => s.textEn.includes(selectedWord.word));
    let translation = "";
    try { translation = await translateContent(selectedWord.word); } catch (e) {}
    onAddNote({
      original: selectedWord.word,
      type: 'word',
      context: contextSegment?.textEn,
      translation: translation
    });
    setSelectedWord(null);
  };

  const saveSelectedSentence = () => {
    if (!selectedWord) return;
    const contextSegment = segments.find(s => s.textEn.includes(selectedWord.word));
    if (contextSegment) {
        onAddNote({
            original: contextSegment.textEn,
            type: 'sentence',
            translation: contextSegment.textZh
        });
    }
    setSelectedWord(null);
  };

  const renderText = (segment: TranscriptSegment, index: number, isActive: boolean) => {
    const words = segment.textEn.split(' ');
    return (
        <div className={`text-lg leading-relaxed flex flex-wrap gap-x-1.5 gap-y-2 items-center ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
            {words.map((word, idx) => {
                const cleanWord = word.replace(/[.,;!?"]/g, '');
                const shouldHide = studyMode === 'practice' && cleanWord.length > 2 && ((idx + index) % 3 === 0);
                if (shouldHide) {
                    const inputKey = `${segment.id}-${idx}`;
                    const userAnswer = userAnswers[inputKey] || '';
                    let inputStatusClass = "border-slate-200 focus:border-indigo-500 bg-white";
                    let isCorrect = false;
                    if (showQuizResults) {
                        isCorrect = userAnswer.toLowerCase().trim() === cleanWord.toLowerCase().trim();
                        inputStatusClass = isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700";
                    }
                    const widthChars = Math.max(4, cleanWord.length, userAnswer.length);
                    return (
                        <div key={idx} className="inline-flex items-center relative group/input">
                             {showQuizResults && !isCorrect && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-bounce-in z-20 whitespace-nowrap">
                                    {cleanWord}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-rose-600"></div>
                                </div>
                             )}
                             <input 
                                type="text"
                                value={userAnswer}
                                onChange={(e) => setUserAnswers(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                className={`h-9 px-2 rounded-lg border-2 outline-none transition-all text-center font-mono text-sm shadow-sm ${inputStatusClass}`}
                                style={{ minWidth: '70px', width: `${widthChars + 1}ch` }}
                                onClick={(e) => e.stopPropagation()} 
                                autoComplete="off"
                                placeholder="..."
                            />
                            {word.length > cleanWord.length && (
                                <span className="ml-0.5 opacity-60 font-serif">{word.replace(cleanWord, '')}</span>
                            )}
                        </div>
                    );
                }
                return (
                    <span 
                        key={idx}
                        className="hover:text-indigo-600 hover:underline decoration-2 underline-offset-4 cursor-pointer transition-colors"
                        onClick={(e) => handleWordClick(e, cleanWord, segment.textEn)}
                    >
                        {word}
                    </span>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white shadow-xl rounded-2xl border border-gray-100">
      <div className="bg-slate-900 p-4 shadow-md z-10 space-y-4">
        <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <button 
                    onClick={togglePlay}
                    className={`w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-lg shadow-indigo-500/30
                        ${isPlaying ? 'bg-indigo-500 hover:bg-indigo-600 scale-95' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}
                    `}
                >
                    {loadingSegmentId ? (
                         <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-7 h-7 pl-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <div className="overflow-hidden">
                    <h3 className="font-semibold text-lg opacity-95 truncate max-w-[180px]">{lesson.title}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Speed:</span>
                        <div className="flex bg-slate-800 rounded-md p-0.5">
                            {SPEED_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setPlaybackSpeed(s)}
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${playbackSpeed === s ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setShowTranslation(!showTranslation)}
                className={`p-2.5 rounded-xl transition-all ${showTranslation ? 'bg-indigo-600/80 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            </button>
        </div>

        <div className="flex justify-between items-center gap-4">
            <div className="flex flex-1 bg-slate-800 p-1.5 rounded-xl">
                <button onClick={() => { setStudyMode('standard'); setShowQuizResults(false); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${studyMode === 'standard' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Read</button>
                <button onClick={() => setStudyMode('practice')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${studyMode === 'practice' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Practice</button>
            </div>
            {studyMode === 'practice' && (
                <button onClick={() => setShowQuizResults(!showQuizResults)} className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border ${showQuizResults ? 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600' : 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'}`}>
                    {showQuizResults ? 'Hide Answers' : 'Check Answers'}
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50 relative">
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          return (
            <div key={segment.id} id={`segment-${index}`} className={`p-6 rounded-2xl transition-all duration-300 border-l-4 group cursor-pointer ${isActive ? 'bg-white border-indigo-500 shadow-lg ring-1 ring-black/5 transform scale-[1.01]' : 'bg-transparent border-transparent hover:bg-white/60 hover:border-slate-300'}`} onClick={() => handleSegmentClick(index)}>
              <div className="mb-2 flex gap-4">
                 <div className="pt-1.5 flex-shrink-0">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                         {loadingSegmentId === segment.id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : isActive && isPlaying ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
                         ) : (
                            <svg className="w-4 h-4 pl-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         )}
                     </div>
                 </div>
                 <div className="flex-1">
                    {renderText(segment, index, isActive)}
                    {showTranslation && (
                        <div className={`mt-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {segment.textZh ? <p className={`text-base font-light leading-relaxed ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>{segment.textZh}</p> : <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>Translating...</div>}
                        </div>
                    )}
                 </div>
              </div>
            </div>
          );
        })}
        <div className="h-20"></div>
      </div>

      {selectedWord && (
        <div className="fixed bg-slate-900 text-white text-sm py-3 px-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 animate-bounce-in min-w-[200px] ring-1 ring-white/10" style={{ left: selectedWord.x, top: selectedWord.y }}>
            <div className="flex justify-between items-center mb-1 border-b border-gray-700 pb-2">
                 <span className="font-bold text-indigo-300 text-lg">"{selectedWord.word}"</span>
                 <button onClick={() => setSelectedWord(null)} className="text-gray-400 hover:text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center">✕</button>
            </div>
            <button onClick={saveSelectedWord} className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3"><span className="bg-indigo-500 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white font-bold">Word</span><span>Save Definition</span></button>
            <button onClick={saveSelectedSentence} className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3"><span className="bg-emerald-500 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white font-bold">Sent.</span><span>Save Sentence</span></button>
        </div>
      )}
    </div>
  );
};
