/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Settings, History, Sparkles, Key, 
  ChevronRight, AlertCircle, Eye, EyeOff, Languages,
  RefreshCw, Info, CheckCircle2
} from 'lucide-react';
import { getVocabBySRS, getRecentMistakes, getRandomVocab } from './services/wanikani';
import { generateStory } from './services/gemini';
import { GeneratedStory, WaniKaniItem, JLPTLevel, StoryLength } from './types';
import { ChevronDown, ChevronUp } from 'lucide-react';

type GenerationCategory = 'Recent Mistakes' | 'Lower SRS Stages' | 'Apprentice' | 'Guru' | 'Master' | 'Burned' | 'Random';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GenerationCategory>('Apprentice');
  const [offsets, setOffsets] = useState<Record<GenerationCategory, number>>({
    'Recent Mistakes': 0,
    'Lower SRS Stages': 0,
    'Apprentice': 0,
    'Guru': 0,
    'Master': 0,
    'Burned': 0,
    'Random': 0
  });
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<GeneratedStory['segments'][0]['vocab'] | null>(null);
  
  // Settings
  const [targetLevel, setTargetLevel] = useState<JLPTLevel>('JLPT N2');
  const [storyLength, setStoryLength] = useState<StoryLength>('2-5 sentences');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Load API key from localStorage if it exists
  useEffect(() => {
    const savedKey = localStorage.getItem('wanikani_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setStayLoggedIn(true);
      setIsConfigured(true);
    }
  }, []);

  const handleConnect = () => {
    if (stayLoggedIn) {
      localStorage.setItem('wanikani_api_key', apiKey);
    } else {
      localStorage.removeItem('wanikani_api_key');
    }
    setIsConfigured(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('wanikani_api_key');
    setApiKey('');
    setIsConfigured(false);
    setCurrentStory(null);
  };

  const handleGenerate = async (useNextItems: boolean = false) => {
    setIsLoading(true);
    try {
      const currentOffset = useNextItems ? offsets[selectedCategory] + 15 : 0;
      let items: WaniKaniItem[] = [];
      switch (selectedCategory) {
        case 'Recent Mistakes':
          items = await getRecentMistakes(apiKey, 15, currentOffset);
          break;
        case 'Lower SRS Stages':
          items = await getVocabBySRS(apiKey, [1, 2], 15, currentOffset);
          break;
        case 'Apprentice':
          items = await getVocabBySRS(apiKey, [1, 2, 3, 4], 15, currentOffset);
          break;
        case 'Guru':
          items = await getVocabBySRS(apiKey, [5, 6], 15, currentOffset);
          break;
        case 'Master':
          items = await getVocabBySRS(apiKey, [7], 15, currentOffset);
          break;
        case 'Burned':
          items = await getVocabBySRS(apiKey, [9], 15, currentOffset);
          break;
        case 'Random':
          items = await getRandomVocab(apiKey);
          break;
      }

      if (items.length === 0) {
        if (useNextItems) {
          alert(`No more items found for category: ${selectedCategory}. Resetting to the beginning.`);
          setOffsets(prev => ({ ...prev, [selectedCategory]: 0 }));
          return;
        }
        alert(`No items found for category: ${selectedCategory}. Try another one!`);
        return;
      }

      const story = await generateStory(items, targetLevel, storyLength);
      setCurrentStory(story);
      setShowTranslation(false);
      setSelectedVocab(null);
      
      if (useNextItems) {
        setOffsets(prev => ({ ...prev, [selectedCategory]: currentOffset }));
      } else {
        setOffsets(prev => ({ ...prev, [selectedCategory]: 0 }));
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate story. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a]/10 px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
            <BookOpen size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight">Story Weaver</span>
        </div>
        {isConfigured && (
          <div className="flex gap-6 text-sm uppercase tracking-widest font-sans font-semibold opacity-60">
            <button onClick={() => { setCurrentStory(null); setSelectedVocab(null); }} className="hover:opacity-100 transition-opacity">Dashboard</button>
            <button onClick={handleLogout} className="hover:opacity-100 transition-opacity flex items-center gap-1">
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!isConfigured ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 text-center py-12"
            >
              <header className="space-y-4">
                <h1 className="text-6xl font-light leading-tight">
                  Master vocabulary through <br />
                  <span className="font-bold">contextual storytelling.</span>
                </h1>
                <p className="text-xl opacity-60 max-w-2xl mx-auto font-sans">
                  Connect your WaniKani account to generate short stories using the specific kanji and vocabulary you struggle with most.
                </p>
              </header>

              <div className="max-w-md mx-auto bg-white p-8 rounded-[32px] shadow-xl shadow-black/5 space-y-6">
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-sans font-bold opacity-40 flex items-center gap-2">
                      <Key size={12} /> WaniKani API Token (v2)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your personal access token..."
                      className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/10 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${stayLoggedIn ? 'bg-[#5A5A40] border-[#5A5A40]' : 'border-[#1a1a1a]/20 group-hover:border-[#5A5A40]'}`}>
                      {stayLoggedIn && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={stayLoggedIn}
                      onChange={(e) => setStayLoggedIn(e.target.checked)}
                    />
                    <span className="text-sm font-sans opacity-60">Stay logged in</span>
                  </label>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!apiKey}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4a4a35] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  Connect Account <ChevronRight size={18} />
                </button>

                <div className="pt-4 border-t border-[#1a1a1a]/5 flex items-start gap-3 text-left">
                  <AlertCircle size={16} className="text-[#5A5A40] shrink-0 mt-0.5" />
                  <p className="text-xs opacity-60 font-sans leading-relaxed">
                    Don't have a token? Generate one in your <a href="https://www.wanikani.com/settings/personal_access_tokens" target="_blank" rel="noreferrer" className="underline hover:text-[#5A5A40]">WaniKani Settings</a>.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : !currentStory ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h2 className="text-4xl font-bold">Welcome back.</h2>
                  <p className="opacity-60 font-sans">Select a category for your short story.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Generation Options */}
                <div className="space-y-6">
                  <h3 className="text-xs uppercase tracking-widest font-sans font-bold opacity-40 flex items-center gap-2">
                    <Sparkles size={14} /> Select a category for your short story.
                  </h3>
                  <div className="bg-white p-8 rounded-[32px] border border-[#1a1a1a]/5 space-y-4">
                    {(['Recent Mistakes', 'Lower SRS Stages', 'Apprentice', 'Guru', 'Master', 'Burned', 'Random'] as GenerationCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-6 py-4 rounded-2xl font-sans font-semibold transition-all flex items-center justify-between group ${selectedCategory === cat ? 'bg-[#5A5A40] text-white' : 'bg-[#f5f5f0] hover:bg-[#5A5A40]/10'}`}
                      >
                        {cat}
                        <ChevronRight size={16} className={`transition-transform ${selectedCategory === cat ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handleGenerate(false)}
                      disabled={isLoading}
                      className="w-full mt-4 bg-[#1a1a1a] text-white py-4 rounded-full font-sans font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isLoading ? 'Generating...' : 'Generate Story'}
                    </button>
                  </div>
                </div>

                {/* Settings Card */}
                <div className="space-y-6">
                  <button 
                    onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                    className="w-full text-xs uppercase tracking-widest font-sans font-bold opacity-40 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Settings size={14} /> Settings</span>
                    {isSettingsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {isSettingsExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[#5A5A40] text-white p-8 rounded-[32px] space-y-6">
                          <div className="space-y-3">
                            <label className="text-xs uppercase tracking-widest font-sans font-bold opacity-60">Target Level</label>
                            <div className="flex flex-wrap gap-2">
                              {(['JLPT N3', 'JLPT N2', 'JLPT N1'] as JLPTLevel[]).map(level => (
                                <button
                                  key={level}
                                  onClick={() => setTargetLevel(level)}
                                  className={`px-4 py-2 rounded-full text-xs font-sans font-bold border transition-all ${targetLevel === level ? 'bg-white text-[#5A5A40] border-white' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs uppercase tracking-widest font-sans font-bold opacity-60">Length</label>
                            <div className="flex flex-wrap gap-2">
                              {(['2-5 sentences', '5-7 sentences'] as StoryLength[]).map(len => (
                                <button
                                  key={len}
                                  onClick={() => setStoryLength(len)}
                                  className={`px-4 py-2 rounded-full text-xs font-sans font-bold border transition-all ${storyLength === len ? 'bg-white text-[#5A5A40] border-white' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
                                >
                                  {len}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isSettingsExpanded && (
                    <div className="bg-[#5A5A40]/5 p-8 rounded-[32px] border border-dashed border-[#5A5A40]/20 text-center">
                      <p className="text-sm font-sans opacity-40 italic">Click "Settings" to customize your experience.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="story"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => { setCurrentStory(null); setSelectedVocab(null); }}
                  className="text-sm font-sans font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
                >
                  ← Back to Dashboard
                </button>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowFurigana(!showFurigana)}
                    className={`p-2 rounded-full transition-all ${showFurigana ? 'bg-[#5A5A40] text-white' : 'bg-white text-[#1a1a1a] border border-[#1a1a1a]/10'}`}
                    title="Toggle Furigana"
                  >
                    <span className="font-bold text-xs px-1">あ</span>
                  </button>
                  <button 
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`p-2 rounded-full transition-all ${showTranslation ? 'bg-[#5A5A40] text-white' : 'bg-white text-[#1a1a1a] border border-[#1a1a1a]/10'}`}
                    title="Toggle Translation"
                  >
                    <Languages size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[48px] shadow-2xl shadow-black/5 space-y-8 md:space-y-12 relative">
                <header className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold">{currentStory.title}</h2>
                  <div className="h-1 w-12 bg-[#5A5A40] mx-auto rounded-full opacity-20" />
                </header>

                <div className="text-xl md:text-3xl leading-[2] md:leading-[2.5] text-center">
                  {currentStory.segments.map((segment, idx) => (
                    <span key={idx} className="inline-block">
                      {segment.vocab ? (
                        <button
                          onClick={() => {
                            console.log('Vocab clicked:', segment.vocab);
                            setSelectedVocab(segment.vocab!);
                          }}
                          className={`relative group cursor-pointer z-10 transition-all ${segment.isTarget ? 'font-bold bg-yellow-100/80 px-1 rounded-sm' : ''}`}
                        >
                          <ruby className={`transition-colors ${selectedVocab?.characters === segment.vocab.characters ? 'text-[#5A5A40]' : 'hover:text-[#5A5A40]'}`}>
                            {segment.text}
                            {showFurigana && (
                              <rt className="text-[10px] md:text-xs opacity-60 font-sans font-normal tracking-normal">
                                {segment.vocab.reading}
                              </rt>
                            )}
                          </ruby>
                          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#5A5A40] scale-x-0 group-hover:scale-x-100 transition-transform origin-left opacity-30" />
                        </button>
                      ) : (
                        <span className={segment.isTarget ? 'font-bold bg-yellow-100/80 px-1 rounded-sm' : ''}>{segment.text}</span>
                      )}
                    </span>
                  ))}
                </div>

                <AnimatePresence>
                  {showTranslation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[#1a1a1a]/5 pt-6 md:pt-8"
                    >
                      <p className="text-base md:text-lg opacity-60 italic text-center font-sans leading-relaxed">
                        {currentStory.translation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vocab Detail Popup */}
                <AnimatePresence>
                  {selectedVocab && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl w-[95%] md:w-[90%] max-w-sm flex items-center gap-4 md:gap-6 z-20"
                    >
                      <div className="text-3xl md:text-4xl font-bold shrink-0">{selectedVocab.characters}</div>
                      <div className="space-y-1 overflow-hidden">
                        <div className="text-[10px] uppercase tracking-widest opacity-40 font-sans font-bold">WaniKani Level {selectedVocab.level}</div>
                        <div className="text-base md:text-lg font-bold truncate">{selectedVocab.reading}</div>
                        <div className="text-xs md:text-sm opacity-60 truncate font-sans">{selectedVocab.meaning}</div>
                      </div>
                      <button 
                        onClick={() => setSelectedVocab(null)}
                        className="ml-auto p-2 opacity-40 hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col md:flex-row justify-center gap-4">
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={isLoading}
                  className="bg-white text-[#1a1a1a] border border-[#1a1a1a]/10 px-8 md:px-12 py-3 md:py-4 rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#f5f5f0] transition-colors flex items-center justify-center gap-3 text-sm md:text-base"
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {isLoading ? 'Generating...' : 'Regenerate Same'}
                </button>
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={isLoading || selectedCategory === 'Random'}
                  className="bg-[#5A5A40] text-white px-8 md:px-12 py-3 md:py-4 rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4a4a35] transition-colors flex items-center justify-center gap-3 shadow-lg shadow-[#5A5A40]/20 text-sm md:text-base disabled:opacity-30"
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                  {isLoading ? 'Generating...' : `Next 15 Items (${selectedCategory})`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-[#5A5A40]/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-[#5A5A40]/5 blur-3xl" />
      </div>
    </div>
  );
}
