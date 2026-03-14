import React, { useState, useRef, useEffect } from 'react';
import { AppView, Note, Lesson } from './types';
import { InputSection } from './components/InputSection';
import { PlayerSection } from './components/PlayerSection';
import { NotebookSection } from './components/NotebookSection';
import { EventsSection } from './components/EventsSection';
import { generateLesson, translateTranscriptBatch } from './services/geminiService';
import { getActiveReminders } from './services/eventService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [reminderCount, setReminderCount] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Check for active reminders periodically
  useEffect(() => {
    const checkReminders = () => {
      const active = getActiveReminders();
      setReminderCount(active.filter(r => r.level === 'urgent' || r.level === 'important').length);
    };
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (input: string) => {
    try {
        const { title, transcript } = await generateLesson(input);

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const lessonData: Lesson = { title, transcript };
        setCurrentLesson(lessonData);
        setView(AppView.PLAYER);

        translateTranscriptBatch(transcript).then(translatedTranscript => {
            setCurrentLesson(prev => {
                if (!prev) return null;
                return { ...prev, transcript: translatedTranscript };
            });
        });

    } catch (error) {
        console.error("Failed to generate lesson", error);
        alert("Failed to generate lesson. Please check the URL or try a different video.");
    }
  };

  const handleAddNote = (newNote: Omit<Note, 'id' | 'timestamp'>) => {
    const note: Note = {
      ...newNote,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setNotes(prev => [note, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">

      {/* Header/Nav */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.LANDING)}>
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            LT
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">LingoTube</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Events/Weekend Planner Button */}
          <button
            onClick={() => setView(AppView.EVENTS)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === AppView.EVENTS
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="hidden sm:inline">周末探索</span>
            <span className="sm:hidden">🎉</span>
            {reminderCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-red-500 text-white">
                {reminderCount}
              </span>
            )}
          </button>

          {view === AppView.PLAYER && (
            <button
              onClick={() => setShowNotebook(!showNotebook)}
              className="md:hidden relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
               {notes.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-20 h-screen box-border pb-4 px-4 md:px-8 max-w-7xl mx-auto">

        {view === AppView.LANDING && (
          <InputSection onStart={handleStart} />
        )}

        {view === AppView.PLAYER && currentLesson && (
          <div className="h-full flex gap-6 relative">
            <div className={`flex-1 h-full transition-all duration-300 ${showNotebook ? 'hidden md:block' : 'block'}`}>
              <PlayerSection
                lesson={currentLesson}
                audioContext={audioContextRef.current!}
                onAddNote={handleAddNote}
              />
            </div>
            <div className={`
                fixed md:static inset-0 z-30 bg-white md:bg-transparent md:w-96
                transform transition-transform duration-300 ease-in-out
                ${showNotebook ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                md:block h-full pt-20 md:pt-0
            `}>
                <div className="h-full md:h-full relative">
                    <button
                        onClick={() => setShowNotebook(false)}
                        className="md:hidden absolute top-[-50px] right-4 bg-gray-200 p-2 rounded-full"
                    >
                        ✕
                    </button>
                    <NotebookSection notes={notes} onDelete={handleDeleteNote} />
                </div>
            </div>
          </div>
        )}

        {view === AppView.EVENTS && (
          <EventsSection />
        )}
      </main>
    </div>
  );
};

export default App;
