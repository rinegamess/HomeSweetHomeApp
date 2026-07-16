import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { translations, Language } from './lib/translations';
import { Device, KitchenItem, Automation, NotificationItem, PlatformConnection, RoomType, CustomRoom } from './types';

const DEFAULT_ROOMS: CustomRoom[] = [
  { name: 'Salon', bg: 'indigo', icon: 'Sofa' },
  { name: 'Mutfak', bg: 'amber', icon: 'ChefHat' },
  { name: 'Yatak Odası', bg: 'purple', icon: 'Bed' },
  { name: 'Koridor', bg: 'sky', icon: 'Home' },
  { name: 'Banyo', bg: 'emerald', icon: 'Bath' },
  { name: 'Bahçe', bg: 'teal', icon: 'Trees' },
];

// Modular view components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import DevicesView from './components/DevicesView';
import RoomsView from './components/RoomsView';
import AutomationsView from './components/AutomationsView';
import KitchenView from './components/KitchenView';
import SettingsView from './components/SettingsView';
import AboutView from './components/AboutView';
import VoiceAssistant from './components/VoiceAssistant';

export default function App() {
  // Global View States
  const [language, setLanguage] = useState<Language>('tr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core smart home collection states
  const [devices, setDevices] = useState<Device[]>([]);
  const [kitchenStock, setKitchenStock] = useState<KitchenItem[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [rooms, setRooms] = useState<CustomRoom[]>(() => {
    const saved = localStorage.getItem('smarthome_rooms_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing custom rooms:', e);
      }
    }
    return DEFAULT_ROOMS;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Persist Rooms on Change
  useEffect(() => {
    localStorage.setItem('smarthome_rooms_list', JSON.stringify(rooms));
  }, [rooms]);

  // Sync Theme Choice immediately to document wrapper
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System choice
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Synchronise system theme media listener if set to system
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  // Initial database load from server REST API
  const fetchStateFromServer = async () => {
    try {
      const [devRes, kitRes, autRes, notRes, pltRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/kitchen-stock'),
        fetch('/api/automations'),
        fetch('/api/notifications'),
        fetch('/api/platforms')
      ]);

      const [devData, kitData, autData, notData, pltData] = await Promise.all([
        devRes.json(),
        kitRes.json(),
        autRes.json(),
        notRes.json(),
        pltRes.json()
      ]);

      setDevices(devData);
      setKitchenStock(kitData);
      setAutomations(autData);
      setNotifications(notData);
      setPlatforms(pltData);
      setIsLoading(false);
    } catch (err) {
      console.warn('API Server disconnected or loading. Operating offline using cached memory...');
      // Fallback in-memory initialisation if offline / preview load is delayed
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStateFromServer();
    // Poll state every 10 seconds to keep widgets active
    const pollInterval = setInterval(fetchStateFromServer, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // API MUTATION: Device Toggle
  const handleToggleDevice = async (id: string) => {
    // Optimistic UI update
    setDevices(prev =>
      prev.map(d => (d.id === id ? { ...d, isOn: !d.isOn, lastActive: 'Şimdi' } : d))
    );

    try {
      const res = await fetch('/api/devices/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        // Apply actual server state
        setDevices(prev => prev.map(d => (d.id === id ? data.device : d)));
      }
    } catch (err) {
      console.error('Device toggle error, falling back to local memory:', err);
    }
  };

  // API MUTATION: Device Value update (brightness, volume, temperature)
  const handleUpdateDeviceValue = async (id: string, value: string | number) => {
    setDevices(prev =>
      prev.map(d => (d.id === id ? { ...d, value } : d))
    );

    try {
      const res = await fetch('/api/devices/value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.map(d => (d.id === id ? data.device : d)));
      }
    } catch (err) {
      console.error('Device value update error:', err);
    }
  };

  // API MUTATION: Device Automation enabled toggle
  const handleToggleDeviceAutomation = async (id: string) => {
    setDevices(prev =>
      prev.map(d => (d.id === id ? { ...d, automationEnabled: !d.automationEnabled } : d))
    );

    try {
      const res = await fetch('/api/devices/automation-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.map(d => (d.id === id ? data.device : d)));
      }
    } catch (err) {
      console.error('Device automation toggle error:', err);
    }
  };

  // API MUTATION: Add Device
  const handleAddDevice = async (device: Omit<Device, 'id' | 'lastActive' | 'automationEnabled'>) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(device)
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => [...prev, data.device]);
        handleAddNotification({
          title: language === 'tr' ? 'Yeni Cihaz Eklendi' : 'New Device Added',
          message: language === 'tr' 
            ? `"${data.device.name}" başarıyla ${data.device.room} odasına eklendi.` 
            : `"${data.device.name}" was successfully added to ${data.device.room}.`,
          type: 'success'
        });
        return true;
      }
    } catch (err) {
      console.error('Device add error:', err);
    }
    return false;
  };

  // API MUTATION: Delete Device
  const handleDeleteDevice = async (id: string) => {
    const targetDevice = devices.find(d => d.id === id);
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.filter(d => d.id !== id));
        if (targetDevice) {
          handleAddNotification({
            title: language === 'tr' ? 'Cihaz Kaldırıldı' : 'Device Removed',
            message: language === 'tr'
              ? `"${targetDevice.name}" sistemden kaldırıldı.`
              : `"${targetDevice.name}" was removed from the system.`,
            type: 'warning'
          });
        }
        return true;
      }
    } catch (err) {
      console.error('Device delete error:', err);
    }
    return false;
  };

  // API MUTATION: Remove Device from Room (unassign room)
  const handleRemoveDeviceFromRoom = async (id: string) => {
    try {
      const res = await fetch('/api/devices/update-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, room: '' })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, room: '' } : d));
        handleAddNotification({
          title: language === 'tr' ? 'Cihaz Odadan Kaldırıldı' : 'Device Removed from Room',
          message: language === 'tr' 
            ? 'Cihaz odadan çıkarıldı ancak genel cihazlar sayfasında duruyor.' 
            : 'Device was removed from the room but remains in the devices tab.',
          type: 'info'
        });
        return true;
      }
    } catch (err) {
      console.error('Remove device from room error:', err);
    }
    return false;
  };

  // API MUTATION: Rename Device
  const handleRenameDevice = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.map(d => (d.id === id ? { ...d, name: newName } : d)));
        handleAddNotification({
          title: language === 'tr' ? 'Cihaz Yeniden Adlandırıldı' : 'Device Renamed',
          message: language === 'tr'
            ? `Cihazın adı "${newName}" olarak güncellendi.`
            : `Device name updated to "${newName}".`,
          type: 'success'
        });
        return true;
      }
    } catch (err) {
      console.error('Device rename error:', err);
    }
    return false;
  };

  // API MUTATION: Rename Room (across devices)
  const handleRenameRoom = async (oldName: string, newName: string) => {
    try {
      const res = await fetch('/api/rooms/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.map(d => (d.room && d.room.toLowerCase() === oldName.toLowerCase() ? { ...d, room: newName } : d)));
        handleAddNotification({
          title: language === 'tr' ? 'Oda Yeniden Adlandırıldı' : 'Room Renamed',
          message: language === 'tr'
            ? `"${oldName}" odası "${newName}" olarak güncellendi.`
            : `Room "${oldName}" renamed to "${newName}".`,
          type: 'success'
        });
        return true;
      }
    } catch (err) {
      console.error('Room rename error:', err);
    }
    return false;
  };

  // TRIGGER ROOM SCENES (Aggregates multiple devices controls)
  const handleTriggerScene = async (room: RoomType, scene: 'cinema' | 'cozy' | 'eco') => {
    const roomDevices = devices.filter(d => d.room === room);
    
    // Perform complex client-side scenes simulations, then update server state
    const updatedDevs = await Promise.all(roomDevices.map(async (dev) => {
      let updatedIsOn = dev.isOn;
      let updatedVal = dev.value;

      if (scene === 'cinema') {
        if (dev.type === 'bulb' || dev.type === 'led_controller') {
          updatedIsOn = true;
          updatedVal = 15; // cozy dim
        } else if (dev.type === 'tv') {
          updatedIsOn = true;
        } else if (dev.type === 'speaker') {
          updatedIsOn = true;
          updatedVal = 25;
        } else if (dev.type === 'curtains') {
          updatedVal = 0; // Close curtains
        }
      } else if (scene === 'cozy') {
        if (dev.type === 'bulb' || dev.type === 'led_controller') {
          updatedIsOn = true;
          updatedVal = 'Warm Glow';
        } else if (dev.type === 'air_conditioner') {
          updatedIsOn = true;
          updatedVal = 23;
        } else if (dev.type === 'speaker') {
          updatedIsOn = true;
          updatedVal = 30;
        }
      } else if (scene === 'eco') {
        if (dev.type === 'bulb' || dev.type === 'led_controller' || dev.type === 'tv') {
          updatedIsOn = false;
        } else if (dev.type === 'air_conditioner') {
          updatedIsOn = true;
          updatedVal = 25; // eco save temp
        } else if (dev.type === 'air_purifier') {
          updatedVal = 'Eko';
        }
      }

      // Sync changes back to server database
      try {
        await fetch('/api/devices/value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dev.id, value: updatedVal })
        });
        if (updatedIsOn !== dev.isOn) {
          await fetch('/api/devices/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dev.id })
          });
        }
      } catch (err) {
        console.warn('Scene device sync failed. Offline mode active.');
      }

      return { ...dev, isOn: updatedIsOn, value: updatedVal, lastActive: 'Senaryo ile' };
    }));

    // Update state
    setDevices(prev => prev.map(d => {
      const match = updatedDevs.find(ud => ud.id === d.id);
      return match ? match : d;
    }));

    // Post local Notification
    handleAddNotification({
      title: `${room} Senaryosu`,
      message: `"${scene.toUpperCase()}" modu uygulandı. Oda cihazları otomatik düzenlendi.`,
      type: 'success'
    });
  };

  // API MUTATION: Add Kitchen Item
  const handleAddKitchenItem = async (item: Omit<KitchenItem, 'id'>) => {
    try {
      const res = await fetch('/api/kitchen-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const data = await res.json();
      if (data.success) {
        setKitchenStock(prev => [...prev, data.item]);
      }
    } catch (err) {
      console.error('Kitchen add error:', err);
    }
  };

  // API MUTATION: Update Kitchen Item (mark missing or change quantity)
  const handleUpdateKitchenItem = async (id: string, updates: Partial<KitchenItem>) => {
    // Optimistic
    setKitchenStock(prev => prev.map(k => (k.id === id ? { ...k, ...updates } : k)));

    try {
      const res = await fetch(`/api/kitchen-stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setKitchenStock(prev => prev.map(k => (k.id === id ? data.item : k)));
      }
    } catch (err) {
      console.error('Kitchen update error:', err);
    }
  };

  // API MUTATION: Delete Kitchen Item
  const handleDeleteKitchenItem = async (id: string) => {
    setKitchenStock(prev => prev.filter(k => k.id !== id));
    try {
      await fetch(`/api/kitchen-stock/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Kitchen delete error:', err);
    }
  };

  // API MUTATION: Create Automation
  const handleCreateAutomation = async (newAut: Omit<Automation, 'id' | 'active'>) => {
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAut)
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => [...prev, data.automation]);
      }
    } catch (err) {
      console.error('Automation creation error:', err);
    }
  };

  // API MUTATION: Toggle Automation active status
  const handleToggleAutomation = async (id: string) => {
    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, active: !a.active } : a))
    );

    try {
      const res = await fetch('/api/automations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => prev.map(a => (a.id === id ? data.automation : a)));
      }
    } catch (err) {
      console.error('Automation toggle error:', err);
    }
  };

  // API MUTATION: Delete Automation
  const handleDeleteAutomation = async (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Automation delete error:', err);
    }
  };

  // API MUTATION: Toggle Platform Connection
  const handleTogglePlatform = async (id: string) => {
    setPlatforms(prev =>
      prev.map(p => (p.id === id ? { ...p, connected: !p.connected } : p))
    );

    try {
      const res = await fetch('/api/platforms/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setPlatforms(prev => prev.map(p => (p.id === id ? data.platform : p)));
      }
    } catch (err) {
      console.error('Platform toggle error:', err);
    }
  };

  // Local Notifications handlers
  const handleAddNotification = (notif: { title: string; message: string; type: 'info' | 'warning' | 'success' }) => {
    const newNotif: NotificationItem = {
      id: `nt-${Date.now()}`,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      timestamp: 'Az Önce',
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleClearNotification = async (id: string) => {
    if (id === 'all') {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } else {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    }

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.error('Notification clear error:', err);
    }
  };

  // Quick Action triggers on Dashboard
  const handleQuickAction = (actionType: 'all-off' | 'all-on' | 'vacuum-start' | 'eco-mode') => {
    if (actionType === 'all-off') {
      // Turn off all bulb & led devices
      devices.forEach(d => {
        if ((d.type === 'bulb' || d.type === 'led_controller') && d.isOn) {
          handleToggleDevice(d.id);
        }
      });
      handleAddNotification({
        title: 'Tasarruf Kararı',
        message: 'Ev genelindeki tüm aydınlatmalar kapatıldı.',
        type: 'success'
      });
    } else if (actionType === 'vacuum-start') {
      const vacuum = devices.find(d => d.type === 'robot_vacuum');
      if (vacuum && !vacuum.isOn) {
        handleToggleDevice(vacuum.id);
        handleUpdateDeviceValue(vacuum.id, 'Temizliyor');
      }
      handleAddNotification({
        title: 'Robot Temizlik',
        message: 'Akıllı süpürge koridor temizliği için başlatıldı.',
        type: 'info'
      });
    } else if (actionType === 'eco-mode') {
      devices.forEach(d => {
        if (d.type === 'air_conditioner') {
          handleUpdateDeviceValue(d.id, 25);
        } else if (d.type === 'air_purifier') {
          handleUpdateDeviceValue(d.id, 'Sessiz Eko');
        }
      });
      handleAddNotification({
        title: 'Sistem Enerji Tasarrufu',
        message: 'İklimlendirme cihazları enerji tasarruf moduna alındı.',
        type: 'success'
      });
    } else if (actionType === 'all-on') {
      // Turn on entry lights
      const foyer = devices.find(d => d.id === 'dev-4'); // koridor led
      if (foyer && !foyer.isOn) {
        handleToggleDevice(foyer.id);
      }
      const salonBulb = devices.find(d => d.id === 'dev-1'); // salon bulb
      if (salonBulb && !salonBulb.isOn) {
        handleToggleDevice(salonBulb.id);
      }
      handleAddNotification({
        title: 'Eve Giriş Karşılaması',
        message: 'Giriş ve salon aydınlatması hoş geldiniz senaryosu ile açıldı.',
        type: 'success'
      });
    }
  };

  // Callback when AI Voice command successfully executed and modified server state
  const handleVoiceCommandSuccess = () => {
    // Instantly refresh local state from server to display latest adjustments
    fetchStateFromServer();
  };

  // Helper to determine title of current view
  const getViewTitle = () => {
    const tDict = translations[language];
    switch (activeView) {
      case 'dashboard':
        return tDict.menuDashboard;
      case 'devices':
        return tDict.menuDevices;
      case 'rooms':
        return tDict.menuRooms;
      case 'automations':
        return tDict.menuAutomations;
      case 'kitchen':
        return tDict.menuKitchen;
      case 'ai-assistant':
        return tDict.menuAiAssistant;
      case 'settings':
        return tDict.menuSettings;
      case 'about':
        return tDict.menuAbout;
      default:
        return 'SmartHome AI';
    }
  };

  const onlineDevicesCount = devices.filter(d => d.isOnline).length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-polish-dark-bg flex text-slate-800 dark:text-polish-dark-text transition-colors duration-300">
      
      {/* Responsive Left Sidebar / Mobile Drawer navigation */}
      <Sidebar
        language={language}
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onlineCount={onlineDevicesCount}
      />

      {/* Main Panel Content container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Dynamic header present at top of every single view */}
        <Header
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          title={getViewTitle()}
          notificationsCount={unreadNotificationsCount}
          onNotificationsClick={() => {
            setActiveView('dashboard');
            // Flash notification alerts list
            const element = document.getElementById('alerts');
            element?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Inner Content Render */}
        <main className="flex-grow p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold animate-pulse">
                {language === 'tr' ? 'SmartHome AI Sistemleri Senkronize Ediliyor...' : 'Synchronizing SmartHome AI databases...'}
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {activeView === 'dashboard' && (
                <DashboardView
                  language={language}
                  devices={devices}
                  automations={automations}
                  notifications={notifications}
                  onToggleDevice={handleToggleDevice}
                  onClearNotification={handleClearNotification}
                  onQuickAction={handleQuickAction}
                  onVoiceCommandSuccess={handleVoiceCommandSuccess}
                  onAddNotification={handleAddNotification}
                />
              )}

              {activeView === 'devices' && (
                <DevicesView
                  language={language}
                  devices={devices}
                  rooms={rooms}
                  onToggleDevice={handleToggleDevice}
                  onUpdateDeviceValue={handleUpdateDeviceValue}
                  onToggleDeviceAutomation={handleToggleDeviceAutomation}
                  onAddDevice={handleAddDevice}
                  onDeleteDevice={handleDeleteDevice}
                  onRenameDevice={handleRenameDevice}
                />
              )}

              {activeView === 'rooms' && (
                <RoomsView
                  language={language}
                  devices={devices}
                  rooms={rooms}
                  setRooms={setRooms}
                  onTriggerScene={handleTriggerScene}
                  onToggleDevice={handleToggleDevice}
                  onUpdateDeviceValue={handleUpdateDeviceValue}
                  onAddDevice={handleAddDevice}
                  onDeleteDevice={handleDeleteDevice}
                  onRemoveDeviceFromRoom={handleRemoveDeviceFromRoom}
                  onRenameDevice={handleRenameDevice}
                  onRenameRoom={handleRenameRoom}
                />
              )}

              {activeView === 'automations' && (
                <AutomationsView
                  language={language}
                  devices={devices}
                  automations={automations}
                  onCreateAutomation={handleCreateAutomation}
                  onToggleAutomation={handleToggleAutomation}
                  onDeleteAutomation={handleDeleteAutomation}
                />
              )}

              {activeView === 'kitchen' && (
                <KitchenView
                  language={language}
                  kitchenStock={kitchenStock}
                  onAddKitchenItem={handleAddKitchenItem}
                  onUpdateKitchenItem={handleUpdateKitchenItem}
                  onDeleteKitchenItem={handleDeleteKitchenItem}
                />
              )}

              {activeView === 'ai-assistant' && (
                <VoiceAssistant
                  language={language}
                  devices={devices}
                  kitchenStock={kitchenStock}
                  automations={automations}
                  onVoiceCommandSuccess={handleVoiceCommandSuccess}
                  onAddNotification={handleAddNotification}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  language={language}
                  platforms={platforms}
                  onTogglePlatform={handleTogglePlatform}
                />
              )}

              {activeView === 'about' && (
                <AboutView language={language} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
