import { LayoutDashboard, Cpu, Home, GitBranch, ChefHat, MessageSquareCode, Settings, Info, Menu, X, Power, Radio } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface SidebarProps {
  language: Language;
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onlineCount: number;
}

export default function Sidebar({
  language,
  activeView,
  setActiveView,
  isOpen,
  setIsOpen,
  onlineCount
}: SidebarProps) {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.menuDashboard, icon: LayoutDashboard },
    { id: 'devices', label: t.menuDevices, icon: Cpu },
    { id: 'rooms', label: t.menuRooms, icon: Home },
    { id: 'automations', label: t.menuAutomations, icon: GitBranch },
    { id: 'kitchen', label: t.menuKitchen, icon: ChefHat },
    { id: 'ai-assistant', label: t.menuAiAssistant, icon: MessageSquareCode, badge: 'SEKRETER' },
    { id: 'settings', label: t.menuSettings, icon: Settings },
    { id: 'about', label: t.menuAbout, icon: Info },
  ];

  return (
    <>
      {/* Mobile Menu Hamburger Button */}
      <div className="md:hidden fixed top-4 left-4 z-45">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-xl bg-white dark:bg-polish-dark-card text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 shadow-md cursor-pointer hover:scale-105 transition-all"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Layout */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-polish-dark-sidebar text-slate-800 dark:text-slate-100 flex flex-col justify-between border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 py-6">
          {/* Logo Section */}
          <div className="px-6 pb-6 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
                <Radio className="w-5.5 h-5.5 text-white animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h2 className="text-[17px] font-display font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Home Sweet Home
                </h2>
                <span className="text-[9px] font-semibold font-sans text-indigo-500 dark:text-indigo-400 tracking-wider uppercase">
                  powered by Recep
                </span>
              </div>
            </div>
            {/* Close button inside mobile drawer */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105 text-slate-400 group-hover:text-slate-200'
                    }`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-indigo-50 dark:bg-indigo-500/35 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Section */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-polish-dark-card border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Local Hub Server</p>
              <p className="text-[10px] text-slate-500">
                {onlineCount} {language === 'tr' ? 'Cihaz Çevrimiçi' : 'Devices Online'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        ></div>
      )}
    </>
  );
}
