import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, Note, StudyMode, Lesson } from '../types';
import { translateContent, generateSegmentAudio } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../services/audioUtils';

interface PlayerSectionProps {
  lesson: Lesson;
  audioContext: AudioContext; 
  onAddNote: (note: Omit<Note, 'id' | 'timestamp'>) => void;
}

export const PlayerSection: React.FC<PlayerSectionProps> = ({ lesson, audioContext, onAddNote }) => {
  // State for content
  const [segments, setSegments] = useState<TranscriptSegment[]>(lesson.transcript);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  
  // State for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingSegmentId, setLoadingSegmentId] = useState<number | null>(null); // Track which specific segment is loading
  
  // Audio Engine Refs
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferCache = useRef<Map<number, AudioBuffer>>(new Map());
  const isPlayingRef = useRef(false); // Ref for immediate access in callbacks
  
  // UI State
  const [selectedWord, setSelectedWord] = useState<{word: string, x: number, y: number} | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('standard');
  const [showTranslation, setShowTranslation] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Initial Sync
  useEffect(() => {
    setSegments(lesson.transcript);
    setActiveSegmentIndex(null);
    stopAudio();
    audioBufferCache.current.clear();
  }, [lesson.title]);

  // Sync translations when they arrive
  useEffect(() => {
    setSegments(prev => prev.map(p => {
        const updated = lesson.transcript.find(t => t.id === p.id);
        return updated ? { ...p, textZh: updated.textZh } : p;
    }));
  }, [lesson.transcript]);

  // Auto-scroll
  useEffect(() => {
    if (activeSegmentIndex !== null) {
      const element = document.getElementById(`segment-${activeSegmentIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIndex]);

  // --------------- AUDIO LOGIC ---------------

  const stopAudio = () => {
    if (currentSourceRef.current) {
        try {
            currentSourceRef.current.stop();
            currentSourceRef.current.disconnect();
        } catch (e) {
            // Ignore errors if already stopped
        }
        currentSourceRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setLoadingSegmentId(null);
  };

  const getAudioBuffer = async (index: number): Promise<AudioBuffer | null> => {
    const segment = segments[index];
    if (!segment) return null;

    // Check cache first
    if (audioBufferCache.current.has(segment.id)) {
        return audioBufferCache.current.get(segment.id)!;
    }

    try {
        setLoadingSegmentId(segment.id);
        const base64 = await generateSegmentAudio(segment.textEn);
        const rawBytes = decodeBase64(base64);
        // Gemini TTS is 24kHz mono usually, ensure matches audioUtils defaults or context
        const buffer = await decodeAudioData(rawBytes, audioContext, 24000, 1);
        
        audioBufferCache.current.set(segment.id, buffer);
        setLoadingSegmentId(null);
        return buffer;
    } catch (e) {
        console.error("Failed to generate/decode audio", e);
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

    // Resume context if needed (browser policy)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    // Stop previous
    if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch(e){}
    }

    setActiveSegmentIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;

    const buffer = await getAudioBuffer(index);

    // If user stopped playback while we were loading, don't start
    if (!isPlayingRef.current) return;

    if (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
            // Only continue if we are still "playing" (wasn't stopped manually)
            // and this specific source was the one playing
            if (isPlayingRef.current && autoContinue) {
                playSegment(index + 1, true);
            } else if (!autoContinue) {
                setIsPlaying(false);
                isPlayingRef.current = false;
            }
        };

        currentSourceRef.current = source;
        source.start(0);

        // Pre-fetch next
        if (autoContinue && index + 1 < segments.length) {
            getAudioBuffer(index + 1);
        }
    } else {
        // Skip on error? Or stop.
        stopAudio();
        alert("Failed to play audio for this segment.");
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
        stopAudio();
    } else {
        const nextIndex = activeSegmentIndex !== null ? activeSegmentIndex : 0;
        playSegment(nextIndex, true);
    }
  };

  const handleSegmentClick = (index: number) => {
    if (activeSegmentIndex === index && isPlaying) {
        stopAudio();
    } else {
        playSegment(index, true);
    }
  };

  // --------------- TEXT INTERACTIONS ---------------

  const handleWordClick = (e: React.MouseEvent, word: string, context: string) => {
    e.stopPropagation();
    stopAudio(); // Pause when interacting

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const leftPos = Math.min(rect.left, window.innerWidth - 250); 
    setSelectedWord({ word, x: leftPos, y: rect.top - 60 });
  };

  const saveSelectedWord = async () => {
    if (!selectedWord) return;
    const contextSegment = segments.find(s => s.textEn.includes(selectedWord.word));
    let translation = "";
    try {
        translation = await translateContent(selectedWord.word);
    } catch (e) {
        console.error("Translation failed", e);
    }
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

  const handleAnswerChange = (key: string, value: string) => {
      setUserAnswers(prev => ({ ...prev, [key]: value }));
  };

  // --------------- RENDER HELPER ---------------

  const renderText = (segment: TranscriptSegment, index: number, isActive: boolean) => {
    const words = segment.textEn.split(' ');
    
    return (
        <div className={`text-lg leading-relaxed flex flex-wrap gap-x-1.5 gap-y-2 items-center ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
            {words.map((word, idx) => {
                const cleanWord = word.replace(/[.,;!?"]/g, '');
                const shouldHide = studyMode === 'practice' && 
                                   cleanWord.length > 2 && 
                                   ((index + idx) % 2 !== 0);

                if (shouldHide) {
                    const inputKey = `${segment.id}-${idx}`;
                    const userAnswer = userAnswers[inputKey] || '';
                    
                    let inputStatusClass = "border-slate-300 focus:border-indigo-500 bg-white";
                    if (showQuizResults) {
                        const isCorrect = userAnswer.toLowerCase().trim() === cleanWord.toLowerCase().trim();
                        inputStatusClass = isCorrect 
                            ? "border-green-500 bg-green-50 text-green-700" 
                            : "border-red-400 bg-red-50 text-red-700";
                    }

                    const widthChars = Math.max(3, cleanWord.length, userAnswer.length);
                    
                    return (
                        <div key={idx} className="inline-flex items-center relative group/input">
                             <input 
                                type="text"
                                value={userAnswer}
                                onChange={(e) => handleAnswerChange(inputKey, e.target.value)}
                                className={`h-9 px-2 rounded border-2 outline-none transition-all text-center font-mono text-sm shadow-sm ${inputStatusClass}`}
                                style={{ 
                                    minWidth: '60px',
                                    width: `${widthChars + 2}ch` 
                                }}
                                onClick={(e) => e.stopPropagation()} 
                                autoComplete="off"
                            />
                            {word.length > cleanWord.length && (
                                <span className="ml-0.5">{word.replace(cleanWord, '')}</span>
                            )}
                        </div>
                    );
                }

                return (
                    <span 
                        key={idx}
                        className="hover:text-indigo-600 hover:underline decoration-2 underline-offset-2 cursor-pointer transition-colors"
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
      
      {/* Playback Controls & Header */}
      <div className="bg-slate-900 p-4 shadow-md z-10 space-y-4">
        <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <button 
                    onClick={togglePlay}
                    className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors shadow-lg shadow-indigo-500/30
                        ${isPlaying ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                    `}
                >
                    {loadingSegmentId && !isPlaying ? (
                        /* Case where we are loading but haven't started playing implies initial load, but usually isPlaying is true during load. 
                           Checking active segment's loading state: */
                         <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-7 h-7 pl-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <div className="overflow-hidden">
                    <h3 className="font-semibold text-lg opacity-95 truncate max-w-[200px]">{lesson.title}</h3>
                    <p className="text-xs text-slate-400">
                        AI Audio Generation • {segments.length} Segments
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`p-2.5 rounded-xl transition-colors ${showTranslation ? 'bg-indigo-600/80 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    title="Toggle Translation"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                </button>
            </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-between items-center gap-4">
            <div className="flex flex-1 bg-slate-800 p-1.5 rounded-xl">
                <button 
                    onClick={() => { setStudyMode('standard'); setShowQuizResults(false); }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${studyMode === 'standard' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    Read
                </button>
                <button 
                    onClick={() => setStudyMode('practice')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${studyMode === 'practice' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    Practice
                </button>
            </div>

            {studyMode === 'practice' && (
                <button
                    onClick={() => setShowQuizResults(!showQuizResults)}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border ${
                        showQuizResults 
                        ? 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600' 
                        : 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                    }`}
                >
                    {showQuizResults ? 'Hide' : 'Check'}
                </button>
            )}
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50 relative">
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const isThisLoading = loadingSegmentId === segment.id;

          return (
            <div 
              key={segment.id}
              id={`segment-${index}`}
              className={`p-6 rounded-2xl transition-all duration-300 border-l-4 group cursor-pointer ${
                isActive 
                  ? 'bg-white border-indigo-500 shadow-lg ring-1 ring-black/5 transform scale-[1.01]' 
                  : 'bg-transparent border-transparent hover:bg-white/60 hover:border-slate-300'
              }`}
              onClick={() => handleSegmentClick(index)}
            >
              <div className="mb-2 flex gap-4">
                 {/* Play indicator/button for each segment */}
                 <div className="pt-1.5 flex-shrink-0">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                         {isThisLoading ? (
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
                    
                    {/* Translation Logic */}
                    {showTranslation && (
                        <div className={`mt-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {segment.textZh ? (
                                <p className={`text-base font-light leading-relaxed ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                                    {segment.textZh}
                                </p>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                    Translating...
                                </div>
                            )}
                        </div>
                    )}
                 </div>
              </div>
            </div>
          );
        })}
        
        {/* End of content spacing */}
        <div className="h-20"></div>
      </div>

      {/* Floating Word Action */}
      {selectedWord && (
        <div 
            className="fixed bg-slate-900 text-white text-sm py-3 px-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 animate-bounce-in min-w-[200px] ring-1 ring-white/10"
            style={{ left: selectedWord.x, top: selectedWord.y }}
        >
            <div className="flex justify-between items-center mb-1 border-b border-gray-700 pb-2">
                 <span className="font-bold text-indigo-300 text-lg">"{selectedWord.word}"</span>
                 <button 
                    onClick={() => setSelectedWord(null)}
                    className="text-gray-400 hover:text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center"
                >
                    ✕
                </button>
            </div>
            
            <button 
                onClick={saveSelectedWord}
                className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3"
            >
                <span className="bg-indigo-500 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white font-bold">Word</span>
                <span>Save Definition</span>
            </button>
            
            <button 
                onClick={saveSelectedSentence}
                className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3"
            >
                <span className="bg-emerald-500 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white font-bold">Sent.</span>
                <span>Save Sentence</span>
            </button>
        </div>
      )}
    </div>
  );
};
