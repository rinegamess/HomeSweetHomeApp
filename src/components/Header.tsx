import { useState, useEffect } from 'react';
import { Sun, Moon, Laptop, Languages, AlertTriangle, CloudSun, Bell } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  title: string;
  notificationsCount: number;
  onNotificationsClick: () => void;
}

export default function Header({
  language,
  setLanguage,
  theme,
  setTheme,
  title,
  notificationsCount,
  onNotificationsClick
}: HeaderProps) {
  const t = translations[language];
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  return (
    <header className="sticky top-0 z-30 flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 gap-4 bg-white/80 dark:bg-polish-dark-header/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 transition-colors duration-300">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          {dateStr}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Real-time Clock Badge */}
        <div className="flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-polish-dark-card text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold shadow-xs transition-all border border-slate-200/50 dark:border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
          {time}
        </div>

        {/* Local Weather Badge */}
        <div className="flex items-center px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/20 text-xs font-medium shadow-xs transition-all">
          <CloudSun className="w-4 h-4 mr-1.5" />
          <span>28°C, {language === 'tr' ? 'Güneşli' : 'Sunny'}</span>
        </div>

        {/* Notifications Button */}
        <button
          onClick={onNotificationsClick}
          className="relative p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-polish-dark-card border border-slate-200/40 dark:border-slate-800/60 cursor-pointer transition-all"
        >
          <Bell className="w-4.5 h-4.5" />
          {notificationsCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
              {notificationsCount}
            </span>
          )}
        </button>

        {/* Language Switcher */}
        <div className="flex items-center border border-slate-200/80 dark:border-slate-800/80 rounded-full p-0.5 bg-slate-100/55 dark:bg-polish-dark-card">
          <button
            onClick={() => setLanguage('tr')}
            className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
              language === 'tr'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            TR
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
              language === 'en'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme Switcher Segmented Control */}
        <div className="flex items-center border border-slate-200/80 dark:border-slate-800/80 rounded-full p-0.5 bg-slate-100/55 dark:bg-polish-dark-card">
          <button
            onClick={() => setTheme('light')}
            title={t.themeLight}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-white text-amber-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            title={t.themeDark}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-indigo-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('system')}
            title={t.themeSystem}
            className={`p-1.5 rounded-full cursor-pointer transition-all ${
              theme === 'system'
                ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
