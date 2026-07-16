import { useState, useEffect, useRef } from 'react';
import { MessageSquareCode, Mic, MicOff, Send, Volume2, VolumeX, Sparkles, RefreshCw, Play, Clock, HelpCircle } from 'lucide-react';
import { Device, KitchenItem, Automation } from '../types';
import { Language, translations } from '../lib/translations';

interface VoiceAssistantProps {
  language: Language;
  devices: Device[];
  kitchenStock: KitchenItem[];
  automations: Automation[];
  onVoiceCommandSuccess: (updates: { deviceUpdates?: any[]; stockUpdates?: any[] }) => void;
  onAddNotification: (notif: { title: string; message: string; type: 'info' | 'warning' | 'success' }) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function VoiceAssistant({
  language,
  devices,
  kitchenStock,
  automations,
  onVoiceCommandSuccess,
  onAddNotification
}: VoiceAssistantProps) {
  const t = translations[language];

  // Conversation history
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 'ch-1', role: 'assistant', text: language === 'tr' ? 'Merhaba! Ben ev asistanın Sekreter. Beni uyandırmak için mikrofonu açıp "SEKRETER" diyebilir veya doğrudan yazabilirsiniz.' : 'Hello! I am your Sekreter AI. Turn on the mic and speak "SEKRETER" or write directly.', timestamp: '02:00' }
  ]);

  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Web Speech API Ref
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quick command suggestions
  const quickCommands = language === 'tr' ? [
    'Sekreter, salon ışığını kapat.',
    'Mutfakta süt var mı?',
    'Bugün hava nasıl?',
    'Saat kaç?',
    'Robot süpürgeyi çalıştır.'
  ] : [
    'Secretary, turn off salon lights.',
    'Is there milk in the kitchen?',
    'How is the weather today?',
    'What time is it?',
    'Start robot vacuum.'
  ];

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiProcessing]);

  // Voice synthesis helper (TTS)
  const speakText = (text: string) => {
    if (!isTtsEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'tr' ? 'tr-TR' : 'en-US';
      
      // Attempt to load premium voices if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(language === 'tr' ? 'tr' : 'en'));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS SpeechSynthesis error:', err);
    }
  };

  // Toggle continuous mic listening / dynamic mobile recognition
  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError(language === 'tr'
        ? 'Bu tarayıcıda ses tanıma desteklenmiyor.'
        : 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setIsWakeWordDetected(false);
    } else {
      try {
        setMicError(null);
        
        // Cancel any active speech to avoid feedback
        try { window.speechSynthesis.cancel(); } catch (e) {}

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

        const rec = new SpeechRecognition();
        rec.continuous = !isMobile; // Mobile Safari crashes with continuous: true
        rec.interimResults = false;
        rec.lang = language === 'tr' ? 'tr-TR' : 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          setMicError(null);
        };

        rec.onerror = (event: any) => {
          console.error('VoiceAssistant Speech Error:', event.error);
          setIsListening(false);
          setIsWakeWordDetected(false);
          if (event.error === 'not-allowed') {
            setMicError(t.micDisabledError);
          } else {
            setMicError(language === 'tr' ? `Hata: ${event.error}` : `Error: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
          setIsWakeWordDetected(false);
        };

        rec.onresult = async (event: any) => {
          const lastIndex = event.results.length - 1;
          const resultText = event.results[lastIndex][0].transcript.trim();
          if (!resultText) return;

          if (isMobile) {
            // Mobile: bypass wake word to send directly
            handleSendCommand(resultText);
          } else {
            // Desktop: wake word flow
            const lowerText = resultText.toLowerCase();
            const isWakeWord = lowerText.includes('sekreter') || lowerText.includes('secretary');

            if (!isWakeWordDetected) {
              if (isWakeWord) {
                setIsWakeWordDetected(true);
                const feedback = language === 'tr' ? 'Seni dinliyorum.' : 'I am listening.';
                
                setChatHistory(prev => [...prev, {
                  id: `msg-${Date.now()}`,
                  role: 'user',
                  text: resultText,
                  timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                }]);

                speakText(feedback);
                
                setChatHistory(prev => [...prev, {
                  id: `msg-feedback-${Date.now()}`,
                  role: 'assistant',
                  text: feedback,
                  timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                }]);

                const cmdIndex = lowerText.indexOf('sekreter') !== -1 
                  ? lowerText.indexOf('sekreter') + 'sekreter'.length 
                  : lowerText.indexOf('secretary') + 'secretary'.length;
                  
                const commandSlice = resultText.slice(cmdIndex).trim().replace(/^[,.]/, '').trim();
                if (commandSlice.length > 2) {
                  handleSendCommand(commandSlice);
                }
              }
            } else {
              setIsWakeWordDetected(false);
              handleSendCommand(resultText);
            }
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error('Mic start error:', err);
        setMicError(language === 'tr' ? `Mikrofon başlatılamadı: ${err.message || err}` : `Could not start microphone: ${err.message || err}`);
      }
    }
  };

  // Submit Command to server backend
  const handleSendCommand = async (commandString: string) => {
    if (!commandString.trim()) return;

    // Add user message to UI
    const userMsgId = `msg-${Date.now()}`;
    setChatHistory(prev => {
      // Prevent duplicate rendering of the voice command if already rendered
      if (prev.some(m => m.text === commandString && m.role === 'user')) return prev;
      return [...prev, {
        id: userMsgId,
        role: 'user',
        text: commandString,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      }];
    });

    setIsAiProcessing(true);
    setTextInput('');

    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandString,
          history: chatHistory.map(h => ({ role: h.role, text: h.text }))
        })
      });

      const data = await response.json();
      setIsAiProcessing(false);

      if (data.success) {
        // Add AI message
        setChatHistory(prev => [...prev, {
          id: `msg-ai-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }]);

        // Trigger TTS read
        speakText(data.reply);

        // Notify parent about state modifications
        onVoiceCommandSuccess({
          deviceUpdates: data.deviceUpdates || [],
          stockUpdates: data.stockUpdates || []
        });

        // Add success notification
        onAddNotification({
          title: 'Sekreter AI İşlemi',
          message: data.reply,
          type: 'success'
        });

      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err: any) {
      setIsAiProcessing(false);
      console.error('AI Command Error:', err);
      // Fallback response
      const errReply = language === 'tr' 
        ? 'Üzgünüm, komut işlenirken yapay zeka servisine bağlanamadım.' 
        : 'Sorry, I faced a network issue connecting to my brain.';
      
      setChatHistory(prev => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        text: errReply,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(errReply);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-140px)]">
      
      {/* LEFT COLUMN: Visual Orb & Mic control */}
      <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs flex flex-col items-center justify-between h-full">
        <div className="w-full text-center space-y-1">
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider font-sans">
            Continuous Wake Word Console
          </span>
          <p className="text-xs text-slate-400 mt-2">
            {t.wakeWordLabel}: <span className="font-bold text-slate-700 dark:text-slate-300">"SEKRETER"</span>
          </p>
        </div>

        {/* Pulsing Glowing AI Orb Visualizer */}
        <div className="relative flex items-center justify-center py-8">
          {/* Glowing layers */}
          <div className={`absolute rounded-full filter blur-xl opacity-30 transition-all duration-700 ${
            isWakeWordDetected
              ? 'w-56 h-56 bg-emerald-500 scale-125'
              : isListening
              ? 'w-48 h-48 bg-indigo-500 animate-pulse'
              : 'w-40 h-40 bg-slate-300'
          }`}></div>

          <div className={`relative flex items-center justify-center w-36 h-36 rounded-full border-4 shadow-xl transition-all duration-500 ${
            isWakeWordDetected
              ? 'bg-linear-to-tr from-emerald-400 to-teal-500 border-emerald-300 shadow-emerald-500/20'
              : isListening
              ? 'bg-linear-to-tr from-indigo-500 to-purple-600 border-indigo-400 shadow-indigo-500/20'
              : 'bg-slate-100 dark:bg-polish-dark-header border-slate-200 dark:border-slate-800/80'
          }`}>
            <MessageSquareCode className={`w-14 h-14 ${
              isWakeWordDetected || isListening ? 'text-white animate-pulse' : 'text-slate-400'
            }`} />
          </div>

          {/* Sound Wave Bars when listening */}
          {isListening && (
            <div className="absolute -bottom-2 flex items-center gap-1.5 h-10">
              <div className="w-1 bg-indigo-500 rounded-full h-8 ai-wave-bar" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 bg-indigo-400 rounded-full h-10 ai-wave-bar" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-1 bg-purple-500 rounded-full h-6 ai-wave-bar" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-1 bg-indigo-500 rounded-full h-9 ai-wave-bar" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 bg-purple-400 rounded-full h-5 ai-wave-bar" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>

        {/* Mic Activation Trigger */}
        <div className="w-full flex flex-col items-center gap-4">
          <button
            onClick={toggleMic}
            className={`p-5 rounded-full cursor-pointer transition-all duration-300 ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
            }`}
          >
            {isListening ? <MicOff className="w-7 h-7 animate-pulse" /> : <Mic className="w-7 h-7" />}
          </button>

          <div className="text-center">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isListening ? t.listeningActive : (language === 'tr' ? 'Mikrofonu Başlat' : 'Start Microphone')}
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1">
              {t.wakeWordHint}
            </p>
          </div>

          {micError && (
            <div className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 rounded-2xl text-center border border-rose-100/50 dark:border-rose-900/30 max-w-xs space-y-1">
              <p>{micError}</p>
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {language === 'tr'
                    ? '💡 iPad/iOS üzerinde mikrofon izinleri iframe içinde kısıtlıdır. Sesi kullanmak için sağ üstteki "Yeni Sekmede Aç" butonu ile uygulamayı açın.'
                    : '💡 On iPad/iOS, microphone use is restricted inside frames. Click "Open in New Tab" at the top-right to run the app in a standalone window.'}
                </p>
              )}
            </div>
          )}

          {/* Voice Output synthesis Toggle */}
          <button
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
              isTtsEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-polish-dark-header border-slate-200 text-slate-400'
            }`}
          >
            {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{t.voiceSynthesis}: {isTtsEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat screen and Quick Simulators */}
      <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs flex flex-col justify-between h-full">
        
        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1 max-h-[28rem]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans block text-center border-b border-slate-50 dark:border-slate-900 pb-2">
            {t.historyTitle}
          </span>
          
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                  : 'bg-slate-100 dark:bg-polish-dark-header text-slate-700 dark:text-slate-300 rounded-bl-none border border-slate-200/20 dark:border-slate-800/25'
              }`}>
                {msg.text}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 font-sans">{msg.timestamp}</span>
            </div>
          ))}

          {/* AI Loader bubble */}
          {isAiProcessing && (
            <div className="flex flex-col items-start mr-auto max-w-[85%]">
              <div className="p-3 bg-slate-100 dark:bg-polish-dark-header text-slate-400 rounded-2xl rounded-bl-none flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span className="text-[11px] animate-pulse">Sekreter düşünüyor...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom text Input and Quick Simulators */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-900/60 pt-4 mt-auto">
          {/* Quick simulation buttons (so they can fully test commands with 1-click) */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Hızlı Simülatör Tuşları (1-Tıkla AI Test)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleSendCommand(cmd)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-polish-dark-header dark:hover:bg-indigo-950/20 text-[10px] text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/40 dark:border-slate-850 cursor-pointer text-left transition-colors max-w-full truncate"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Text typing field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand(textInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t.typePlaceholder}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isAiProcessing}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer transition-all shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
