import { useState } from 'react';
import { ToggleLeft, ToggleRight, Radio, Shield, Settings, Sparkles, Key, CloudLightning, RefreshCw, Volume2, BellRing, Save } from 'lucide-react';
import { PlatformConnection } from '../types';
import { Language, translations } from '../lib/translations';

interface SettingsViewProps {
  language: Language;
  platforms: PlatformConnection[];
  onTogglePlatform: (id: string) => void;
}

export default function SettingsView({
  language,
  platforms,
  onTogglePlatform
}: SettingsViewProps) {
  const t = translations[language];

  // Forms states
  const [aiPersona, setAiPersona] = useState<'polite' | 'warm' | 'minimal'>('polite');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [pushNotif, setPushNotif] = useState(true);
  const [toastNotif, setToastNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(true);

  // Backup restore simulations
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleBackup = () => {
    setBackupStatus(language === 'tr' ? 'Yedek hazırlanıyor...' : 'Preparing backup file...');
    setTimeout(() => {
      setBackupStatus(language === 'tr' ? 'Yedekleme dosyası başarıyla indirildi! (smarthome_backup.json)' : 'Backup downloaded successfully! (smarthome_backup.json)');
    }, 1500);
  };

  const handleRestore = () => {
    setRestoreStatus(language === 'tr' ? 'Yedek yükleniyor...' : 'Uploading backup...');
    setTimeout(() => {
      setRestoreStatus(language === 'tr' ? 'Sistem yedekten geri yüklendi! Yapılandırmalar yenilendi.' : 'System restored from backup! Configuration synchronized.');
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Integrations & Connections */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Platforms List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Radio className="w-5.5 h-5.5 text-indigo-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
              {t.connections}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {platforms.map(platform => (
              <div
                key={platform.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  platform.connected
                    ? 'bg-white dark:bg-polish-dark-card border-emerald-200/50 dark:border-emerald-950/45 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-polish-dark-header border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold font-display text-slate-800 dark:text-slate-100 leading-none">
                    {platform.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${platform.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-[10px] text-slate-400">
                      {platform.connected ? `${platform.deviceCount} ${language === 'tr' ? 'cihaz senkronize' : 'devices synced'}` : t.disconnected}
                    </span>
                  </div>
                </div>

                {/* Connection switch */}
                <button
                  onClick={() => onTogglePlatform(platform.id)}
                  className="cursor-pointer"
                >
                  {platform.connected ? (
                    <ToggleRight className="w-9 h-9 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Backup and Restore panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <RefreshCw className="w-5 h-5 text-indigo-500 shrink-0" />
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
              {t.backupRestore}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200/40 dark:border-slate-800/40">
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {language === 'tr' ? 'Tüm akıllı ev yapılandırma dosyalarınızı, otomasyonlarınızı ve mutfak envanterinizi indirin.' : 'Download all smart home configurations, custom automation rules, and kitchen stocks.'}
              </p>
              <button
                onClick={handleBackup}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                {t.backupBtn}
              </button>
              {backupStatus && <p className="text-[10px] font-semibold text-emerald-600 mt-2">{backupStatus}</p>}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200/40 dark:border-slate-800/40">
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {language === 'tr' ? 'Önceden indirdiğiniz bir yedekleme JSON dosyasını sisteme yükleyerek geri getirin.' : 'Upload a previously saved smart backup JSON file to restore settings.'}
              </p>
              <button
                onClick={handleRestore}
                className="w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                {t.restoreBtn}
              </button>
              {restoreStatus && <p className="text-[10px] font-semibold text-emerald-600 mt-2">{restoreStatus}</p>}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: AI Configuration & Notifications preferences */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* AI Preferences */}
        <div className="p-6 rounded-3xl bg-linear-to-b from-slate-50 to-indigo-50/30 dark:from-polish-dark-card dark:to-indigo-950/15 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
              {t.apiKeys}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/40 dark:border-emerald-900/20 flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {t.apiKeyStatusOk}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400">{t.aiPersona}</label>
              <select
                value={aiPersona}
                onChange={(e: any) => setAiPersona(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="polite">{t.aiPersonaPolite}</option>
                <option value="warm">{t.aiPersonaWarm}</option>
                <option value="minimal">{t.aiPersonaMinimal}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>AI Creativity (Temp)</span>
                <span className="font-mono">{aiTemperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={aiTemperature}
                onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Notifications setup */}
        <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <BellRing className="w-5 h-5 text-indigo-500 shrink-0" />
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
              {t.notificationsSetup}
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{t.pushNotif}</p>
                <p className="text-[10px] text-slate-400">Mobile & tablet alerts</p>
              </div>
              <button onClick={() => setPushNotif(!pushNotif)} className="cursor-pointer">
                {pushNotif ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{t.toastNotif}</p>
                <p className="text-[10px] text-slate-400">Onscreen banner popups</p>
              </div>
              <button onClick={() => setToastNotif(!toastNotif)} className="cursor-pointer">
                {toastNotif ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{t.soundNotif}</p>
                <p className="text-[10px] text-slate-400">Text-to-speech speaker outputs</p>
              </div>
              <button onClick={() => setSoundNotif(!soundNotif)} className="cursor-pointer">
                {soundNotif ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
