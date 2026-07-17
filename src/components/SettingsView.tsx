import { useState, useEffect, FormEvent } from 'react';
import { ToggleLeft, ToggleRight, Radio, Shield, Settings, Sparkles, Key, CloudLightning, RefreshCw, Volume2, BellRing, Save, HelpCircle } from 'lucide-react';
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

  // Local LAN Configuration States
  const [localConfigState, setLocalConfigState] = useState({
    tapoEmail: '',
    tapoPassword: '',
    pingTimeoutMs: 1500,
    connected: false
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Free/Smart text import states
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetch('/api/local-lan/config')
      .then(res => res.json())
      .then(data => setLocalConfigState(data))
      .catch(err => console.error('Error loading Local LAN config:', err));
  }, []);

  const handleImportTextDevices = async () => {
    if (!importText.trim()) {
      setImportStatus(language === 'tr' ? 'Lütfen en azından birkaç cihaz ismi veya IP yazın.' : 'Please type at least some device names or IPs.');
      return;
    }
    setIsImporting(true);
    setImportStatus(language === 'tr' ? 'Cihazlarınız yerel analiz ve yapay zeka ile aktarılıyor...' : 'Analyzing and importing your devices via local network and AI...');
    try {
      const res = await fetch('/api/local-lan/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, language })
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(data.log || (language === 'tr' ? 'Cihazlarınız başarıyla aktarıldı!' : 'Devices successfully imported!'));
        setImportText('');
        const platform = platforms.find(p => p.type === 'local');
        if (platform) {
          platform.connected = true;
          platform.deviceCount = (platform.deviceCount || 0) + data.importedCount;
        }
      } else {
        setImportStatus(`Hata: ${data.error}`);
      }
    } catch (err: any) {
      setImportStatus(`Hata: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveLocalConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus(language === 'tr' ? 'Kaydediliyor...' : 'Saving...');
    try {
      const res = await fetch('/api/local-lan/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfigState)
      });
      const data = await res.json();
      if (data.success) {
        setLocalConfigState(data.config);
        setSaveStatus(language === 'tr' ? 'Ayarlar başarıyla kaydedildi!' : 'Configuration successfully saved!');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      setSaveStatus(language === 'tr' ? 'Kaydetme hatası.' : 'Saving failed.');
    }
  };

  const handleScanLocalDevices = async () => {
    setIsSyncing(true);
    setSyncStatus(language === 'tr' ? 'Yerel cihazlar IP adresleri üzerinden taranıyor...' : 'Scanning local devices via IP addresses...');
    try {
      const res = await fetch('/api/local-lan/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(data.log || (language === 'tr' ? 'Tarama başarıyla tamamlandı!' : 'Scan completed successfully!'));
        setLocalConfigState(prev => ({ ...prev, connected: true }));
      } else {
        setSyncStatus(`Hata: ${data.error}`);
      }
    } catch (err: any) {
      setSyncStatus(`Hata: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

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

        {/* Local Network & IP-Based Integration Details Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CloudLightning className="w-5.5 h-5.5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
                  {language === 'tr' ? 'Yerel Ağ (LAN IP) Entegrasyonu' : 'Local Network (LAN IP) Integration'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {language === 'tr' ? 'Cihazları bulut bağlantısı olmadan doğrudan IP adresleriyle kontrol edin' : 'Control and ping smart devices directly via their local static IP addresses'}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${localConfigState.connected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800/50'}`}>
              {localConfigState.connected ? (language === 'tr' ? 'Aktif Tarama' : 'Active Scanning') : (language === 'tr' ? 'Beklemede' : 'Idle')}
            </span>
          </div>

          <form onSubmit={handleSaveLocalConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'tr' ? 'Tapo E-Posta (Yerel Kontrol İçin)' : 'Tapo E-Mail (For Local Control)'}
              </label>
              <input
                type="text"
                placeholder="ornek@mail.com"
                value={localConfigState.tapoEmail}
                onChange={e => setLocalConfigState({ ...localConfigState, tapoEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-200 font-sans focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'tr' ? 'Tapo Şifre (Kriptolu Saklanır)' : 'Tapo Password (Secured)'}
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••"
                value={localConfigState.tapoPassword}
                onChange={e => setLocalConfigState({ ...localConfigState, tapoPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-200 font-sans focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'tr' ? 'Ping Zaman Aşımı (Milisaniye)' : 'Ping/Scan Timeout (ms)'}
              </label>
              <input
                type="number"
                placeholder="1500"
                value={localConfigState.pingTimeoutMs}
                onChange={e => setLocalConfigState({ ...localConfigState, pingTimeoutMs: parseInt(e.target.value) || 1500 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-200 font-mono focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'tr' ? 'Tapo yerel prizleri kontrol etmek için mobil uygulama kullanıcı adı ve şifrenizi girin.' : 'Enter your Tapo App credentials to authorize direct IP switch controls.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {language === 'tr' ? 'Ayarları Kaydet' : 'Save Config'}
                </button>
                <button
                  type="button"
                  onClick={handleScanLocalDevices}
                  disabled={isSyncing}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {language === 'tr' ? 'Ağdaki Durumları Tara' : 'Scan Network Status'}
                </button>
              </div>
            </div>
          </form>

          {saveStatus && (
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{saveStatus}</p>
          )}

          {syncStatus && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200/50 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
              {syncStatus}
            </div>
          )}
        </div>

        {/* AI Powered Free/Easy Local IP Device Importer Card */}
        <div className="p-6 rounded-3xl bg-linear-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-indigo-950/20 dark:via-polish-dark-card dark:to-purple-950/10 border border-indigo-100 dark:border-indigo-950/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
                  {language === 'tr' ? 'Yerel IP & Cihaz Aktarıcı (Yapay Zeka)' : 'Local IP & Device Importer (AI Powered)'}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'tr' ? 'Statik IP adreslerine sahip yerel akıllı cihazlarınızı tek seferde sisteme aktarın' : 'Batch import local devices with static IPs, brands, and names instantly using AI'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
              {language === 'tr' ? 'Yapay Zeka Destekli' : 'AI Powered'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {language === 'tr' 
              ? 'Ağınızda sabit IP ataması yaptığınız akıllı priz, klima, lamba, sensör gibi cihazları IP adresi, odası ve markasıyla birlikte aşağıya yazarak saniyeler içinde sisteme ekleyebilirsiniz.'
              : 'Add devices that you have assigned static IPs in your local network (plugs, bulbs, ACs, sensors) by describing or pasting them below.'}
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400">
                {language === 'tr' ? 'IP ve Cihaz Listesi / Metin Açıklaması' : 'IP & Device List or Freeform Description'}
              </label>
              <textarea
                rows={4}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={language === 'tr' 
                  ? "Örn:\n- 192.168.1.200 ipsinde salon Tapo akıllı priz var\n- Mutfaktaki Shelly röle IP: 192.168.1.105\n- Yatak odası Tasmota lamba 192.168.1.110" 
                  : "E.g.:\n- Salon Tapo smart plug at IP 192.168.1.200\n- Kitchen Shelly relay IP: 192.168.1.105\n- Bedroom Tasmota light 192.168.1.110"}
                className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-white/80 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-200 font-sans focus:border-indigo-500 focus:outline-hidden placeholder:text-slate-400/70"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[10px] text-slate-400 leading-relaxed max-w-[280px]">
                💡 {language === 'tr' 
                  ? 'Girdiğiniz her satırdaki IP adresleri, markalar ve oda adları akıllı algoritmalarla çözümlenerek cihaz listesine eklenir.' 
                  : 'IP addresses, brands, and room names in each line will be parsed and registered automatically.'}
              </div>
              <button
                type="button"
                onClick={handleImportTextDevices}
                disabled={isImporting}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-400 disabled:to-purple-400 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isImporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {language === 'tr' ? 'Yapay Zeka ile Aktar' : 'Import with AI'}
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/20 text-[11px] text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed whitespace-pre-wrap">
              {importStatus}
            </div>
          )}
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
