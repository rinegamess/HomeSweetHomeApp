import { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Power, Zap, Play, CloudSun, ToggleLeft, ToggleRight, Settings, 
  Plus, Trash2, Bell, Heart, Smile, Mic, MicOff, Send, Volume2, 
  VolumeX, Sparkles, RefreshCw, Palette, Maximize2, Type, HelpCircle, 
  ArrowUp, ArrowDown, Check, X, Undo2 
} from 'lucide-react';
import { Device, Automation, NotificationItem } from '../types';
import { Language, translations } from '../lib/translations';

interface DashboardViewProps {
  language: Language;
  devices: Device[];
  automations: Automation[];
  notifications: NotificationItem[];
  onToggleDevice: (id: string) => void;
  onClearNotification: (id: string) => void;
  onQuickAction: (actionType: 'all-off' | 'all-on' | 'vacuum-start' | 'eco-mode') => void;
  onVoiceCommandSuccess: () => void;
  onAddNotification: (notif: { title: string; message: string; type: 'info' | 'warning' | 'success' }) => void;
  weatherCity: string;
  setWeatherCity: (city: string) => void;
  activeWeather: { temp: number; humidity: number; windSpeed: number; condition: string };
}

interface Widget {
  id: string;
  titleTr: string;
  titleEn: string;
  enabled: boolean;
  colSpan: number; // 4 | 6 | 8 | 12
  bgTheme: string; // 'default' | 'indigo' | 'ocean' | 'rose' | 'emerald' | 'amber' | 'neon'
  customTitleTr?: string;
  customTitleEn?: string;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'status-banner', titleTr: 'Ev Durumu Özeti', titleEn: 'Home Status Overview', enabled: true, colSpan: 12, bgTheme: 'indigo' },
  { id: 'ai-voice', titleTr: 'Yapay Zeka Sesli Asistan', titleEn: 'AI Voice Assistant (Sekreter)', enabled: true, colSpan: 6, bgTheme: 'neon' },
  { id: 'metrics', titleTr: 'Sistem Sayaçları', titleEn: 'System Counters', enabled: true, colSpan: 6, bgTheme: 'default' },
  { id: 'weather', titleTr: 'Hava Durumu Detayları', titleEn: 'Detailed Weather', enabled: true, colSpan: 4, bgTheme: 'ocean' },
  { id: 'shortcuts', titleTr: 'Kısayollar & Senaryolar', titleEn: 'Shortcuts & Scenes', enabled: true, colSpan: 4, bgTheme: 'default' },
  { id: 'alerts', titleTr: 'AI Bildirimleri & Analizler', titleEn: 'AI Alerts & Analytics', enabled: true, colSpan: 4, bgTheme: 'default' }
];

export default function DashboardView({
  language,
  devices,
  automations,
  notifications,
  onToggleDevice,
  onClearNotification,
  onQuickAction,
  onVoiceCommandSuccess,
  onAddNotification,
  weatherCity,
  setWeatherCity,
  activeWeather
}: DashboardViewProps) {
  const t = translations[language];

  // Load custom widgets config from localStorage or use DEFAULT_WIDGETS
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('smarthome_widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure 'ai-voice' widget is present in old configurations
        if (Array.isArray(parsed) && !parsed.some(w => w.id === 'ai-voice')) {
          const aiVoiceWidget: Widget = { 
            id: 'ai-voice', 
            titleTr: 'Yapay Zeka Sesli Asistan', 
            titleEn: 'AI Voice Assistant (Sekreter)', 
            enabled: true, 
            colSpan: 6, 
            bgTheme: 'neon' 
          };
          const bannerIdx = parsed.findIndex(w => w.id === 'status-banner');
          if (bannerIdx !== -1) {
            parsed.splice(bannerIdx + 1, 0, aiVoiceWidget);
          } else {
            parsed.push(aiVoiceWidget);
          }
        }
        return parsed;
      } catch (e) {
        console.error('Error loading widgets:', e);
      }
    }
    return DEFAULT_WIDGETS;
  });

  const [isEditingWidgets, setIsEditingWidgets] = useState(false);

  // AI Voice Assistant Customization state
  const [aiVoiceConfig, setAiVoiceConfig] = useState(() => {
    const saved = localStorage.getItem('smarthome_ai_voice_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing AI voice config:', e);
      }
    }
    return {
      avatarStyle: 'orb', // 'orb' | 'wave' | 'retro-mic' | 'ring'
      personalityName: language === 'tr' ? 'Sekreter' : 'Secretary',
      voicePitch: 'normal', // 'normal' | 'high' | 'deep' | 'robot'
      glowColor: 'purple', // 'blue' | 'purple' | 'emerald' | 'neon' | 'none'
      wakeWord: 'SEKRETER'
    };
  });
  const [showVoiceCustomizer, setShowVoiceCustomizer] = useState(false);

  // Weather input state (Zonguldak default, dynamically customizable)
  const [citySearchInput, setCitySearchInput] = useState('');

  const handleCityChange = () => {
    if (citySearchInput.trim()) {
      const formattedCity = citySearchInput.trim();
      setWeatherCity(formattedCity);
      localStorage.setItem('smarthome_weather_city', formattedCity);
      setCitySearchInput('');
      onAddNotification({
        title: language === 'tr' ? 'Hava Durumu Değiştirildi' : 'Weather Location Updated',
        message: language === 'tr' 
          ? `Hava durumu konumu ${formattedCity} olarak güncellendi.` 
          : `Weather location changed to ${formattedCity}.`,
        type: 'success'
      });
    }
  };

  const saveAiVoiceConfig = (newConfig: typeof aiVoiceConfig) => {
    setAiVoiceConfig(newConfig);
    localStorage.setItem('smarthome_ai_voice_config', JSON.stringify(newConfig));
  };

  // AI Voice Widget Local States
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [voiceReply, setVoiceReply] = useState<string>(
    language === 'tr' 
      ? 'Merhaba! Ben ev asistanın Sekreter. Sana nasıl yardımcı olabilirim? "Salon lambasını aç" veya "Mutfakta süt var mı?" diyebilirsin.' 
      : 'Hello! I am your Sekreter AI. How can I help you today? You can ask "Turn on salon light" or "Is there milk in the kitchen?".'
  );
  const [lastUserCommand, setLastUserCommand] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  // MediaRecorder states for fallback on iPad/iOS
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderStreamRef = useRef<MediaStream | null>(null);

  // Speech Recognition Reference
  const recognitionRef = useRef<any>(null);

  // Stats computation
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.isOnline && d.isOn).length;
  const offlineDevices = devices.filter(d => !d.isOnline).length;
  const closedDevices = devices.filter(d => d.isOnline && !d.isOn).length;

  const lastWorkingDevice = devices
    .filter(d => d.isOnline && d.isOn)
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive))[0] || devices[0];

  const lastAutomation = automations.filter(a => a.active)[0] || automations[0];

  // TTS Speech Synthesis Helper
  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'tr' ? 'tr-TR' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(language === 'tr' ? 'tr' : 'en'));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS SpeechSynthesis error in dashboard widget:', err);
    }
  };

  // MediaRecorder start/stop helpers
  const startAudioRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      audioChunksRef.current = [];
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        if (recorderStreamRef.current) {
          recorderStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setIsAiProcessing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            await handleSendAudioCommand(base64Data, recorder.mimeType);
          };
        } catch (err) {
          console.error("FileReader error:", err);
          setIsAiProcessing(false);
        }
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecordingAudio(true);
      setIsListening(true);
      
      // Auto-stop after 8 seconds
      setTimeout(() => {
        if (recorder && recorder.state === 'recording') {
          recorder.stop();
          setIsRecordingAudio(false);
          setIsListening(false);
        }
      }, 8000);
      
    } catch (err: any) {
      console.error("MediaRecorder start failed:", err);
      setMicError(language === 'tr' 
        ? 'Mikrofon izni alınamadı veya engellendi.' 
        : 'Microphone permission denied or blocked.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
      setIsListening(false);
    }
  };

  const handleSendAudioCommand = async (base64Audio: string, mimeTypeString: string) => {
    setIsAiProcessing(true);
    setLastUserCommand(language === 'tr' ? '🎤 Sesli Komut' : '🎤 Voice Command');
    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: mimeTypeString,
          language: language,
          history: []
        })
      });

      const data = await response.json();
      setIsAiProcessing(false);

      if (data.success) {
        setVoiceReply(data.reply);
        speakText(data.reply);

        // Notify App.tsx to instantly fetch state
        onVoiceCommandSuccess();

        onAddNotification({
          title: language === 'tr' ? 'Sekreter AI (Hızlı Ses)' : 'Sekreter AI (Quick Voice)',
          message: data.reply,
          type: 'success'
        });
      } else {
        throw new Error(data.reply || 'Voice command parsing failed');
      }
    } catch (err: any) {
      setIsAiProcessing(false);
      console.error("Audio Command Error:", err);
      const errReply = language === 'tr'
        ? 'Ses kaydı gönderildi ancak asistan tarafından çözümlenemedi.'
        : 'Audio was sent but assistant failed to transcribe/process it.';
      setVoiceReply(errReply);
      speakText(errReply);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Bypassing Web Speech API restriction by falling back to MediaRecorder audio transmission!
      if (isRecordingAudio) {
        stopAudioRecording();
      } else {
        startAudioRecording();
      }
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        setMicError(null);
        
        // Stop any speaking speech to avoid interference
        try { window.speechSynthesis.cancel(); } catch (e) {}

        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = language === 'tr' ? 'tr-TR' : 'en-US';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onerror = (event: any) => {
          console.error('Dashboard Speech Error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setMicError(language === 'tr' ? 'Mikrofon izni reddedildi.' : 'Microphone permission denied.');
          } else {
            setMicError(language === 'tr' ? `Hata: ${event.error}` : `Error: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = async (event: any) => {
          const resultText = event.results[0][0].transcript.trim();
          if (resultText) {
            handleSendVoiceCommand(resultText);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error('Dashboard mic trigger error:', err);
        setMicError(language === 'tr' ? `Mikrofon başlatılamadı: ${err.message || err}` : `Could not start microphone: ${err.message || err}`);
      }
    }
  };

  const handleSendVoiceCommand = async (commandString: string) => {
    if (!commandString.trim()) return;

    setLastUserCommand(commandString);
    setIsAiProcessing(true);
    setVoiceInput('');

    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandString,
          language: language,
          history: []
        })
      });

      const data = await response.json();
      setIsAiProcessing(false);

      if (data.success) {
        setVoiceReply(data.reply);
        speakText(data.reply);

        // Notify App.tsx to instantly fetch state
        onVoiceCommandSuccess();

        onAddNotification({
          title: language === 'tr' ? 'Sekreter AI (Hızlı Ses)' : 'Sekreter AI (Quick Voice)',
          message: data.reply,
          type: 'success'
        });
      } else {
        throw new Error(data.error || 'Response error');
      }
    } catch (err) {
      setIsAiProcessing(false);
      console.error('Dashboard AI Voice command error:', err);
      const errReply = language === 'tr' 
        ? 'Üzgünüm, komut işlenirken bir ağ bağlantı hatası oluştu.' 
        : 'Sorry, I encountered a connection issue.';
      setVoiceReply(errReply);
      speakText(errReply);
    }
  };

  // Save Widget Changes Helper
  const saveWidgets = (updatedWidgets: Widget[]) => {
    setWidgets(updatedWidgets);
    localStorage.setItem('smarthome_widgets', JSON.stringify(updatedWidgets));
  };

  // Reorder widgets
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    saveWidgets(updated);
  };

  // Toggle single widget visibility
  const toggleWidgetEnabled = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    saveWidgets(updated);
  };

  // Update widget column span
  const updateWidgetColSpan = (id: string, colSpan: number) => {
    const updated = widgets.map(w => w.id === id ? { ...w, colSpan } : w);
    saveWidgets(updated);
  };

  // Update widget background theme
  const updateWidgetTheme = (id: string, bgTheme: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, bgTheme } : w);
    saveWidgets(updated);
  };

  // Update widget customized title
  const updateWidgetTitle = (id: string, text: string) => {
    const updated = widgets.map(w => {
      if (w.id === id) {
        if (language === 'tr') {
          return { ...w, customTitleTr: text };
        } else {
          return { ...w, customTitleEn: text };
        }
      }
      return w;
    });
    saveWidgets(updated);
  };

  // Reset to default widgets layout
  const resetWidgets = () => {
    saveWidgets(DEFAULT_WIDGETS);
  };

  // List of quick command suggestion chips for the dashboard AI widget
  const suggestionCommands = language === 'tr' ? [
    'Salon ışığını kapat',
    'Mutfakta ne var?',
    'Süpürgeyi çalıştır',
    'Klimayı 24 derece yap'
  ] : [
    'Turn off salon light',
    'What is in the kitchen?',
    'Start robot vacuum',
    'Set AC to 24 degrees'
  ];

  return (
    <div className="space-y-6">
      {/* Interactive Widget Designer Panel (Visible in Edit/Design Mode) */}
      {isEditingWidgets && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-polish-dark-header/40 border border-slate-200 dark:border-slate-800/80 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              {language === 'tr' ? 'Widget Düzenleme ve Stil Masası' : 'Widget Arrangement & Styling Deck'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={resetWidgets}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/40 dark:border-slate-850"
              >
                <Undo2 className="w-3 h-3" />
                {t.resetWidgets}
              </button>
              <button
                onClick={() => setIsEditingWidgets(false)}
                className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
          
          <div className="space-y-3.5">
            {widgets.map((widget, index) => {
              const widgetTitle = language === 'tr' 
                ? (widget.customTitleTr || widget.titleTr) 
                : (widget.customTitleEn || widget.titleEn);
              
              return (
                <div 
                  key={widget.id}
                  className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-polish-dark-card border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
                >
                  {/* Left Side: Drag and title control */}
                  <div className="flex items-center gap-3 w-full lg:w-1/3">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveWidget(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-30 cursor-pointer"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp className="w-3 h-3 text-slate-600 dark:text-slate-350" />
                      </button>
                      <button
                        onClick={() => moveWidget(index, 'down')}
                        disabled={index === widgets.length - 1}
                        className="p-1 rounded-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-30 cursor-pointer"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown className="w-3 h-3 text-slate-600 dark:text-slate-350" />
                      </button>
                    </div>

                    {/* Enable Checkbox & Custom title input */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWidgetEnabled(widget.id)}
                          className="flex items-center"
                        >
                          {widget.enabled ? (
                            <ToggleRight className="w-7 h-7 text-indigo-600 cursor-pointer" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-600 cursor-pointer" />
                          )}
                        </button>
                        <span className={`text-xs font-bold truncate ${widget.enabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                          {widgetTitle}
                        </span>
                      </div>
                      
                      {widget.enabled && (
                        <div className="flex items-center gap-1.5 pl-9">
                          <Type className="w-3 h-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder={language === 'tr' ? 'Özel isim girin...' : 'Rename widget...'}
                            value={language === 'tr' ? (widget.customTitleTr || '') : (widget.customTitleEn || '')}
                            onChange={(e) => updateWidgetTitle(widget.id, e.target.value)}
                            className="text-[11px] w-full bg-slate-50 dark:bg-polish-dark-header border border-slate-200/60 dark:border-slate-800/80 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Section: Width Selector & Background Theme Selector */}
                  {widget.enabled && (
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                      {/* Width selection */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          {language === 'tr' ? 'Widget Genişliği' : 'Widget Width'}
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-polish-dark-header/80 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                          {[4, 6, 8, 12].map(span => (
                            <button
                              key={span}
                              onClick={() => updateWidgetColSpan(widget.id, span)}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all ${
                                widget.colSpan === span
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {span === 12 ? '1/1' : span === 8 ? '2/3' : span === 6 ? '1/2' : '1/3'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Theme selection */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          {language === 'tr' ? 'Kart Teması' : 'Card Theme'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { code: 'default', color: 'bg-slate-200 border-slate-300', label: 'Klasik' },
                            { code: 'indigo', color: 'bg-indigo-500 border-indigo-400', label: 'İndigo' },
                            { code: 'ocean', color: 'bg-sky-400 border-sky-300', label: 'Okyanus' },
                            { code: 'rose', color: 'bg-rose-500 border-rose-400', label: 'Günbatımı' },
                            { code: 'emerald', color: 'bg-emerald-500 border-emerald-400', label: 'Eko Yeşil' },
                            { code: 'amber', color: 'bg-amber-400 border-amber-300', label: 'Sıcak' },
                            { code: 'neon', color: 'bg-slate-900 border-indigo-600', label: 'Neon' }
                          ].map(tObj => (
                            <button
                              key={tObj.code}
                              onClick={() => updateWidgetTheme(widget.id, tObj.code)}
                              className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${tObj.color} ${
                                widget.bgTheme === tObj.code ? 'ring-2 ring-indigo-500 scale-105' : 'ring-0'
                              }`}
                              title={tObj.label}
                            >
                              {widget.bgTheme === tObj.code && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right Side status indicator */}
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0 font-mono self-end lg:self-center">
                    {widget.enabled ? `col-${widget.colSpan} / theme-${widget.bgTheme}` : 'DEVRE DIŞI / DISABLED'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {widgets
          .filter(widget => widget.enabled)
          .map((widget) => {
            const customTitle = language === 'tr' 
              ? (widget.customTitleTr || widget.titleTr) 
              : (widget.customTitleEn || widget.titleEn);

            // Determine Responsive Column Span class
            let colSpanClass = 'md:col-span-12';
            if (widget.colSpan === 4) colSpanClass = 'md:col-span-4';
            if (widget.colSpan === 6) colSpanClass = 'md:col-span-6';
            if (widget.colSpan === 8) colSpanClass = 'md:col-span-8';

            // Determine Color Theme Theme Background Classes
            let bgThemeClass = 'bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs text-slate-800 dark:text-slate-100';
            let titleColorClass = 'text-slate-800 dark:text-slate-200';
            let subTitleColorClass = 'text-slate-400';
            
            if (widget.bgTheme === 'indigo') {
              bgThemeClass = 'bg-linear-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/10 border-0';
              titleColorClass = 'text-white';
              subTitleColorClass = 'text-indigo-100';
            } else if (widget.bgTheme === 'ocean') {
              bgThemeClass = 'bg-linear-to-b from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-400/10 border-0';
              titleColorClass = 'text-white';
              subTitleColorClass = 'text-sky-100';
            } else if (widget.bgTheme === 'rose') {
              bgThemeClass = 'bg-linear-to-br from-rose-500 via-pink-500 to-orange-400 text-white shadow-lg shadow-rose-500/10 border-0';
              titleColorClass = 'text-white';
              subTitleColorClass = 'text-rose-100';
            } else if (widget.bgTheme === 'emerald') {
              bgThemeClass = 'bg-linear-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/10 border-0';
              titleColorClass = 'text-white';
              subTitleColorClass = 'text-emerald-100';
            } else if (widget.bgTheme === 'amber') {
              bgThemeClass = 'bg-linear-to-tr from-amber-400 to-yellow-300 text-slate-900 shadow-md border-0';
              titleColorClass = 'text-slate-900';
              subTitleColorClass = 'text-slate-700';
            } else if (widget.bgTheme === 'neon') {
              bgThemeClass = 'bg-slate-950 border-2 border-indigo-500/75 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.22)]';
              titleColorClass = 'text-indigo-300';
              subTitleColorClass = 'text-indigo-400/80';
            }

            return (
              <div 
                key={widget.id} 
                className={`p-6 rounded-3xl transition-all duration-300 ease-in-out hover:shadow-md ${colSpanClass} ${bgThemeClass}`}
              >
                {/* WIDGET CONTENT ROUTER */}
                
                {/* Status Banner */}
                {widget.id === 'status-banner' && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md">
                        <Smile className="w-8 h-8 text-white animate-bounce" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold leading-tight">
                          {customTitle}
                        </h2>
                        <p className="text-sm mt-1 opacity-90 font-sans">
                          {t.homeStatusHealthySub}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{t.homeStatusHealthy}</span>
                      </div>
                      <button
                        onClick={() => setIsEditingWidgets(!isEditingWidgets)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/10 cursor-pointer transition-all shadow-xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Dashboard\'ı Düzenle' : 'Edit Dashboard'}</span>
                      </button>
                    </div>
                  </div>
                )}

                 {/* AI Voice Assistant compact widget */}
                 {widget.id === 'ai-voice' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <h3 className={`text-sm font-bold font-display ${titleColorClass}`}>
                          {aiVoiceConfig.personalityName} {language === 'tr' ? 'Sesli Asistanı' : 'Voice Assistant'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Customizer Toggle Button */}
                        <button
                          onClick={() => setShowVoiceCustomizer(!showVoiceCustomizer)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            showVoiceCustomizer 
                              ? 'bg-purple-500/25 text-purple-400 border-purple-500/40 shadow-xs' 
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title={language === 'tr' ? 'Asistan Tasarımını Değiştir' : 'Customize Assistant Design'}
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setTtsEnabled(!ttsEnabled)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            ttsEnabled 
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title={language === 'tr' ? 'Sesli Okuma (TTS)' : 'Voice synthesis (TTS)'}
                        >
                          {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* AI ASSISTANT CUSTOM DESIGN CONTROL CARD */}
                    {showVoiceCustomizer && (
                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 animate-fadeIn text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                            {language === 'tr' ? 'Asistan Görünüm & Ses Tasarımcısı' : 'Assistant Look & Sound Designer'}
                          </span>
                          <button 
                            onClick={() => setShowVoiceCustomizer(false)}
                            className="text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                              {language === 'tr' ? 'Asistan Adı' : 'Assistant Name'}
                            </label>
                            <input
                              type="text"
                              value={aiVoiceConfig.personalityName}
                              onChange={(e) => saveAiVoiceConfig({ ...aiVoiceConfig, personalityName: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                              {language === 'tr' ? 'Uyandırma Sözcüğü' : 'Wake Word'}
                            </label>
                            <input
                              type="text"
                              value={aiVoiceConfig.wakeWord}
                              onChange={(e) => saveAiVoiceConfig({ ...aiVoiceConfig, wakeWord: e.target.value.toUpperCase() })}
                              className="w-full bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                              {language === 'tr' ? 'Avatar Stili' : 'Avatar Style'}
                            </label>
                            <select
                              value={aiVoiceConfig.avatarStyle}
                              onChange={(e) => saveAiVoiceConfig({ ...aiVoiceConfig, avatarStyle: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                            >
                              <option value="orb">{language === 'tr' ? 'Kozmik Küre' : 'Cosmic Orb'}</option>
                              <option value="wave">{language === 'tr' ? 'Ses Dalgaları' : 'Equalizer Wave'}</option>
                              <option value="retro-mic">{language === 'tr' ? 'Klasik Mikrofon' : 'Vintage Mic'}</option>
                              <option value="ring">{language === 'tr' ? 'Hologram Çemberi' : 'Tech Ring'}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                              {language === 'tr' ? 'Ses Tonu' : 'Voice Tone'}
                            </label>
                            <select
                              value={aiVoiceConfig.voicePitch}
                              onChange={(e) => saveAiVoiceConfig({ ...aiVoiceConfig, voicePitch: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                            >
                              <option value="normal">{language === 'tr' ? 'Doğal / Melodik' : 'Natural / Melodic'}</option>
                              <option value="high">{language === 'tr' ? 'Cıvıl Cıvıl (Yüksek)' : 'Energetic (High)'}</option>
                              <option value="deep">{language === 'tr' ? 'Tok / Karizmatik' : 'Deep / Warm'}</option>
                              <option value="robot">{language === 'tr' ? 'Sibernetik (Robot)' : 'Cybernetic (Robot)'}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Microphone Visual Wave / Status Area */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 text-center space-y-3">
                      {isListening ? (
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="flex items-end gap-1.5 h-6">
                            <div className="w-1 bg-indigo-500 rounded-full h-2 animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 bg-purple-500 rounded-full h-4 animate-bounce" style={{ animationDelay: '0.3s' }} />
                            <div className="w-1 bg-indigo-500 rounded-full h-6 animate-bounce" style={{ animationDelay: '0.5s' }} />
                            <div className="w-1 bg-purple-500 rounded-full h-3 animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1 bg-indigo-500 rounded-full h-5 animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase font-mono animate-pulse">
                            {language === 'tr' ? 'DİNLENİYOR...' : 'LISTENING...'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-0.5">
                          <p className={`text-[9px] uppercase font-mono tracking-wider ${subTitleColorClass}`}>
                            {language === 'tr' ? `Asistanınız ${aiVoiceConfig.personalityName} Hazır` : `${aiVoiceConfig.personalityName} is Active`}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {language === 'tr' ? `Yazın, dokunun veya "${aiVoiceConfig.wakeWord}" deyin` : `Type, click, or speak "${aiVoiceConfig.wakeWord}"`}
                          </span>
                        </div>
                      )}

                      {/* Pulsing Glowing AI Avatar Visualizer */}
                      <div className="relative flex items-center justify-center">
                        {/* Glowing aura layers */}
                        <div className={`absolute rounded-full filter blur-xl transition-all duration-700 ${
                          isListening
                            ? 'w-40 h-40 animate-pulse opacity-45'
                            : 'w-32 h-32 opacity-20'
                        } ${
                          aiVoiceConfig.glowColor === 'blue' ? 'bg-blue-500' :
                          aiVoiceConfig.glowColor === 'emerald' ? 'bg-emerald-500' :
                          aiVoiceConfig.glowColor === 'neon' ? 'bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.5)]' :
                          aiVoiceConfig.glowColor === 'none' ? 'bg-transparent' :
                          'bg-indigo-500'
                        }`}></div>

                        <div className={`relative flex items-center justify-center w-28 h-28 rounded-full border-2 shadow-xl transition-all duration-500 cursor-pointer ${
                          isListening
                            ? 'bg-slate-950 border-indigo-400 ring-4 ring-indigo-500/20'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                        onClick={toggleMic}
                        >
                          {/* Dynamic Avatar Renderers */}
                          {aiVoiceConfig.avatarStyle === 'orb' && (
                            <div className="relative flex items-center justify-center">
                              <div className={`absolute w-16 h-16 rounded-full border border-indigo-500/30 ${isListening ? 'animate-ping' : ''}`}></div>
                              <div className="w-12 h-12 rounded-full bg-radial from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                              </div>
                            </div>
                          )}

                          {aiVoiceConfig.avatarStyle === 'wave' && (
                            <div className="flex items-end justify-center gap-1 h-10">
                              <div className="w-1 bg-indigo-500 rounded-full h-5 animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-1 bg-purple-500 rounded-full h-8 animate-bounce" style={{ animationDelay: '0.3s' }} />
                              <div className="w-1 bg-indigo-400 rounded-full h-4 animate-bounce" style={{ animationDelay: '0.5s' }} />
                              <div className="w-1 bg-purple-400 rounded-full h-7 animate-bounce" style={{ animationDelay: '0.2s' }} />
                              <div className="w-1 bg-indigo-500 rounded-full h-5 animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                          )}

                          {aiVoiceConfig.avatarStyle === 'retro-mic' && (
                            <div className="relative p-3 rounded-full border border-slate-700/80 bg-slate-900 text-slate-300">
                              <Mic className="w-6 h-6 text-indigo-400" />
                            </div>
                          )}

                          {aiVoiceConfig.avatarStyle === 'ring' && (
                            <div className="relative flex items-center justify-center">
                              <div className="absolute w-20 h-20 rounded-full border border-dashed border-indigo-500/60 animate-spin"></div>
                              <div className="absolute w-16 h-16 rounded-full border border-dotted border-purple-500/60 animate-spin" style={{ animationDirection: 'reverse' }}></div>
                              <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                      </div>

                      {micError && (
                        <div className="space-y-1 px-2">
                          <p className="text-[10px] text-rose-400 font-semibold">{micError}</p>
                        </div>
                      )}
                    </div>

                    {/* Speech response bubble */}
                    <div className="space-y-1.5">
                      {lastUserCommand && (
                        <div className="flex justify-end">
                          <div className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-2xl rounded-tr-sm max-w-[85%] font-medium shadow-xs">
                            "{lastUserCommand}"
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 bg-slate-900/30 dark:bg-polish-dark-header/40 p-3 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                        <Cpu className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 font-mono block">
                            {aiVoiceConfig.personalityName} AI
                          </span>
                          {isAiProcessing ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                              <span>{language === 'tr' ? 'Düşünüyor...' : 'Processing...'}</span>
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed text-slate-200">
                              {voiceReply}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Suggestion Pills */}
                    <div className="space-y-1">
                      <span className={`text-[10px] uppercase font-bold tracking-wider block ${subTitleColorClass}`}>
                        {language === 'tr' ? 'Hızlı Komutlar' : 'Quick Suggestions'}
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {suggestionCommands.map((cmd, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => handleSendVoiceCommand(cmd)}
                            disabled={isAiProcessing}
                            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-polish-dark-header/80 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer transition-colors disabled:opacity-40"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional typed input console */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/20 dark:border-slate-800/20">
                      <input
                        type="text"
                        placeholder={language === 'tr' ? 'Alternatif olarak yazın...' : 'Or type your command...'}
                        value={voiceInput}
                        onChange={(e) => setVoiceInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendVoiceCommand(voiceInput)}
                        disabled={isAiProcessing}
                        className="flex-grow bg-slate-100 dark:bg-polish-dark-header/60 border border-slate-200/40 dark:border-slate-850 px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleSendVoiceCommand(voiceInput)}
                        disabled={isAiProcessing || !voiceInput.trim()}
                        className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* System Metrics Counters */}
                {widget.id === 'metrics' && (
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold font-display ${titleColorClass}`}>{customTitle}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{t.connectedDevices}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className={`text-2xl font-bold font-display ${titleColorClass}`}>{totalDevices}</span>
                          <span className="text-[10px] text-indigo-500 font-bold">100% OK</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{t.activeDevices}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-bold font-display text-emerald-500">{activeDevices}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">
                            {language === 'tr' ? 'Çalışıyor' : 'Running'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{t.inactiveDevices}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-bold font-display text-slate-400">{closedDevices}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[9px] font-bold">
                            {language === 'tr' ? 'Uykuda' : 'Standby'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{language === 'tr' ? 'Çevrimdışı' : 'Offline'}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-2xl font-bold font-display text-rose-500">{offlineDevices}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-bold">
                            {language === 'tr' ? 'Sorun Yok' : 'No Issue'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {/* Sub stats: Last Active Device */}
                      <div className="p-3 rounded-2xl bg-slate-50/40 dark:bg-slate-900/15 border border-slate-200/20 dark:border-slate-800/20">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">{t.lastActiveDevice}</span>
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${titleColorClass}`}>{lastWorkingDevice?.name || 'Yok'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{lastWorkingDevice?.room}</p>
                          </div>
                        </div>
                      </div>

                      {/* Sub stats: Last automation */}
                      <div className="p-3 rounded-2xl bg-slate-50/40 dark:bg-slate-900/15 border border-slate-200/20 dark:border-slate-800/20">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">{t.lastAutomation}</span>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-500 shrink-0" />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${titleColorClass}`}>{lastAutomation?.name || 'Aktif Yok'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{lastAutomation ? lastAutomation.triggerType : 'Boş'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weather widget */}
                {widget.id === 'weather' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xs uppercase font-bold tracking-wider opacity-85 font-sans`}>{customTitle}</h3>
                      <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-md uppercase tracking-wider">{activeWeather.condition}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-5xl font-display font-bold leading-none">{activeWeather.temp}°</span>
                        <span className="text-sm font-semibold block mt-1.5">{weatherCity}</span>
                      </div>
                      <CloudSun className="w-16 h-16 text-amber-200 drop-shadow-sm animate-pulse shrink-0" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-xs">
                      <div>
                        <span className="opacity-75 block">{t.humidity}</span>
                        <span className="font-bold text-sm block mt-0.5">%{activeWeather.humidity}</span>
                      </div>
                      <div>
                        <span className="opacity-75 block">{t.wind}</span>
                        <span className="font-bold text-sm block mt-0.5">{activeWeather.windSpeed} km/h</span>
                      </div>
                    </div>

                    {/* Dynamic City Search/Change Input */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10">
                      <input 
                        type="text" 
                        placeholder={language === 'tr' ? 'Şehir ara...' : 'Search city...'} 
                        value={citySearchInput}
                        onChange={(e) => setCitySearchInput(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-xl bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/10 text-white placeholder-white/60 focus:outline-hidden transition-all font-sans"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCityChange(); }}
                      />
                      <button 
                        onClick={handleCityChange}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors shrink-0 animate-pulse"
                      >
                        {language === 'tr' ? 'Seç' : 'Set'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Shortcuts & Quick actions */}
                {widget.id === 'shortcuts' && (
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold font-display ${titleColorClass}`}>{customTitle}</h3>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        onClick={() => onQuickAction('all-off')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 text-left font-semibold text-xs cursor-pointer transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{language === 'tr' ? 'Tüm Lambaları Kapat' : 'Turn Off All Lights'}</p>
                          <p className="text-[10px] text-rose-500 mt-0.5 font-normal truncate">{language === 'tr' ? 'Enerjiyi koru' : 'Save general energy'}</p>
                        </div>
                        <Power className="w-4 h-4 text-rose-500 shrink-0" />
                      </button>

                      <button
                        onClick={() => onQuickAction('vacuum-start')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/25 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 text-left font-semibold text-xs cursor-pointer transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{language === 'tr' ? 'Süpürge Başlat' : 'Start Vacuum'}</p>
                          <p className="text-[10px] text-indigo-500 mt-0.5 font-normal truncate">{language === 'tr' ? 'Temizliği tetikle' : 'Trigger vacuum'}</p>
                        </div>
                        <Play className="w-4 h-4 text-indigo-500 shrink-0" />
                      </button>

                      <button
                        onClick={() => onQuickAction('eco-mode')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 text-left font-semibold text-xs cursor-pointer transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{language === 'tr' ? 'Eko Tasarruf Modu' : 'Eco Saving Mode'}</p>
                          <p className="text-[10px] text-emerald-500 mt-0.5 font-normal truncate">{language === 'tr' ? 'Optimum tasarruf' : 'Optimize heating'}</p>
                        </div>
                        <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                      </button>

                      <button
                        onClick={() => onQuickAction('all-on')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/25 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100/50 dark:border-sky-900/30 text-left font-semibold text-xs cursor-pointer transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{language === 'tr' ? 'Giriş Karşılaması' : 'Welcome Home Mode'}</p>
                          <p className="text-[10px] text-sky-500 mt-0.5 font-normal truncate">{language === 'tr' ? 'Giriş lambalarını aç' : 'Open entryways'}</p>
                        </div>
                        <Smile className="w-4 h-4 text-sky-500 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Alerts & notifications widget */}
                {widget.id === 'alerts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
                        <h3 className={`text-sm font-bold font-display ${titleColorClass}`}>{customTitle}</h3>
                      </div>
                      {notifications.some(n => !n.isRead) && (
                        <button
                          onClick={() => onClearNotification('all')}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
                        >
                          {t.markAllRead}
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                        <Smile className="w-8 h-8 opacity-40 mb-2" />
                        <p className="text-xs">{t.emptyAlerts}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                              notif.isRead
                                ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-900 text-slate-400'
                                : notif.type === 'warning'
                                ? 'bg-amber-50/70 dark:bg-amber-950/15 border-amber-100/50 dark:border-amber-900/25 text-slate-700 dark:text-slate-300'
                                : notif.type === 'success'
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/15 border-emerald-100/50 dark:border-emerald-900/25 text-slate-700 dark:text-slate-300'
                                : 'bg-indigo-50/70 dark:bg-indigo-950/15 border-indigo-100/50 dark:border-indigo-900/25 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                              notif.isRead
                                ? 'bg-slate-300'
                                : notif.type === 'warning'
                                ? 'bg-amber-500'
                                : notif.type === 'success'
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500 animate-pulse'
                            }`}></span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{notif.title}</p>
                              <p className="text-[11px] leading-relaxed mt-0.5">{notif.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block font-sans">{notif.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
      </div>
    </div>
  );
}
