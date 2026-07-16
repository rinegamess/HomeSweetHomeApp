import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Laptop, Languages, AlertTriangle, CloudSun, Bell, Sparkles, Check, X, Info } from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { NotificationItem } from '../types';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  title: string;
  notificationsCount: number;
  onNotificationsClick: () => void;
  weatherCity: string;
  weatherCondition: string;
  weatherTemp: number;
  notifications: NotificationItem[];
  onClearNotification: (id: string) => void;
}

export default function Header({
  language,
  setLanguage,
  theme,
  setTheme,
  title,
  notificationsCount,
  onNotificationsClick,
  weatherCity,
  weatherCondition,
  weatherTemp,
  notifications,
  onClearNotification
}: HeaderProps) {
  const t = translations[language];
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <span>{weatherTemp}°C, {weatherCity} ({weatherCondition})</span>
        </div>

        {/* Notifications Button & Dropdown Wrapper */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-polish-dark-card border border-slate-200/40 dark:border-slate-800/60 cursor-pointer transition-all"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
                {notificationsCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden flex flex-col transition-all duration-200">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  {language === 'tr' ? 'Bildirimler ve Güncellemeler' : 'Notifications & Updates'}
                </div>
                {notificationsCount > 0 && (
                  <button
                    onClick={() => {
                      onClearNotification('all');
                      setShowDropdown(false);
                    }}
                    className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {language === 'tr' ? 'Tümünü Temizle' : 'Clear All'}
                  </button>
                )}
              </div>

              {/* Scrollable content container */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. Special "Son Yapılan Değişiklikler" section */}
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10">
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {language === 'tr' ? 'Son Yapılan Sistem Değişiklikleri' : 'Recent System Updates'}
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>
                        {language === 'tr'
                          ? 'Mutfak envanteri artık Sekreter AI sesli/yazılı asistanla (miktar ve işlem belirterek) güncellenebiliyor.'
                          : 'Kitchen stock is fully manageable via Sekreter AI (with amount and actions).'}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>
                        {language === 'tr'
                          ? 'Mobil tarayıcılar için ses tanıma ve sürekli dinleme uyumluluğu iyileştirildi.'
                          : 'Speech recognition compatibility has been improved for mobile browsers.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>
                        {language === 'tr'
                          ? 'Üst bar hava durumu göstergesi ile Dashboard hava durumu seçimi tamamen senkronize edildi.'
                          : 'Top bar weather display is now fully synced with your selected city.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>
                        {language === 'tr'
                          ? 'Gelişmiş tema entegrasyonu: Varsayılan olarak cihaz (Sistem) tercihi seçili gelir.'
                          : 'System theme integration: Default option automatically adapts to device preferences.'}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 2. System notifications / Alerts list */}
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {language === 'tr' ? 'Aktif bildirim bulunmuyor.' : 'No active notifications.'}
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 flex gap-2.5 transition-colors ${
                        item.isRead ? 'opacity-65' : 'bg-slate-50/20 dark:bg-slate-800/10'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.type === 'success' ? (
                          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : item.type === 'warning' ? (
                          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.title}
                          </h4>
                          <span className="text-[9px] text-slate-400 shrink-0">{item.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {item.message}
                        </p>
                        {!item.isRead && (
                          <button
                            onClick={() => onClearNotification(item.id)}
                            className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium hover:underline mt-1 block cursor-pointer"
                          >
                            {language === 'tr' ? 'Okundu İşaretle' : 'Mark as Read'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
