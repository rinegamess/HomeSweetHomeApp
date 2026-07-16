import { Info, Shield, Award, Cpu, Code, Cpu as HubIcon, Camera, Key, Zap, Flame, Dog, Leaf, Sun, BatteryCharging, CalendarDays, ClipboardList } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface AboutViewProps {
  language: Language;
}

export default function AboutView({ language }: AboutViewProps) {
  const t = translations[language];

  // Future modules with details
  const upcomingModules = [
    { nameTr: 'Güvenlik Kameraları', nameEn: 'Security Cameras', descTr: 'Çoklu RTSP IP kamera yayını ve canlı hareket bildirimleri.', descEn: 'Multi-stream RTSP IP camera support with motion logs.', icon: Camera, status: 'v2.0' },
    { nameTr: 'Yüz Tanıma', nameEn: 'Face Recognition', descTr: 'Kameralarda AI yüz tanıma ile kişiye özel karşılama senaryoları.', descEn: 'AI face recognition to trigger custom welcome greetings.', icon: Shield, status: 'v2.1' },
    { nameTr: 'Enerji Analizi Grafikleri', nameEn: 'Energy Consumption Graphs', descTr: 'Drizzle/SQL destekli detaylı haftalık/aylık elektrik kullanım grafikleri.', descEn: 'SQL-backed weekly/monthly electricity analytics charts.', icon: Zap, status: 'v2.0' },
    { nameTr: 'Akıllı Kapı Kilidi', nameEn: 'Smart Door Lock', descTr: 'Uzaktan şifreli kilit açma ve geçici misafir anahtarı üretimi.', descEn: 'Remote unlock codes and temporary guest access tokens.', icon: Key, status: 'v2.2' },
    { nameTr: 'Evcil Hayvan Takibi', nameEn: 'Pet Tracking', descTr: 'Otomatik mama kapları kontrolü ve evcil hayvan GPS tasması entegrasyonu.', descEn: 'Automated pet feeders and GPS collar integration.', icon: Dog, status: 'v2.3' },
    { nameTr: 'Akıllı Bahçe Entegrasyonu', nameEn: 'Smart Garden & Irrigation', descTr: 'Toprak nem sensörüne bağlı otomatik bahçe sulama vanaları.', descEn: 'Automated soil-moisture responsive irrigation valves.', icon: Leaf, status: 'v2.4' },
    { nameTr: 'Güneş Enerjisi Takibi', nameEn: 'Solar & Photovoltaics', descTr: 'İnverter üretimi ve akü doluluk oranı canlı paneli.', descEn: 'Live grid solar generation and power wall status panel.', icon: Sun, status: 'v2.5' },
    { nameTr: 'Araç Şarj İstasyonu', nameEn: 'EV Charger Integration', descTr: 'Elektrikli araç şarj hızı kontrolü ve planlı gece şarjı.', descEn: 'EV charge rate controller with scheduled night rates.', icon: BatteryCharging, status: 'v2.2' },
    { nameTr: 'Takvim & Ajanda', nameEn: 'Smart Calendar', descTr: 'Mutfak ekranı Google Takvim / iCloud senkronizasyonu.', descEn: 'Kitchen console Google Calendar / iCloud synchronization.', icon: CalendarDays, status: 'v2.1' },
    { nameTr: 'Notlar & Yapılacaklar', nameEn: 'Notes & Todos', descTr: 'Mutfak için dijital yapışkan notlar ve ortak yapılacaklar listesi.', descEn: 'Digital sticky notes and shared family todo lists.', icon: ClipboardList, status: 'v2.0' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Code className="w-5.5 h-5.5 text-indigo-500 shrink-0" />
              <h3 className="text-base font-bold font-display text-slate-800 dark:text-slate-100">
                {t.platformSpecs}
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              {t.specsBody}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-polish-dark-header/60 border border-indigo-100/30 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 shrink-0 space-y-2 w-full md:w-64 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Version:</span>
              <span className="font-bold">v1.4.0 (Stable)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Framework:</span>
              <span className="font-bold">React 19 + Vite</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Build System:</span>
              <span className="font-bold">Tailwind CSS v4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Engine Core:</span>
              <span className="font-bold">Google Gemini 3.5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Future Roadmap Grid */}
      <div>
        <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100 mb-4 px-1">
          {t.futureModules}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingModules.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-5 rounded-2xl bg-slate-50/50 dark:bg-polish-dark-card border border-slate-200/40 dark:border-slate-850 hover:bg-white dark:hover:bg-polish-dark-header/80 transition-all flex flex-col justify-between h-40"
              >
                <div className="flex gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-polish-dark-header border border-slate-200/20 text-indigo-500 shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">
                      {language === 'tr' ? item.nameTr : item.nameEn}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-slate-400 mt-1">
                      {language === 'tr' ? item.descTr : item.descEn}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-bold font-sans">
                    {item.status} Pipeline
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
