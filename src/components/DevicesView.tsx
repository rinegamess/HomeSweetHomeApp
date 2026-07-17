import { useState, useEffect, FormEvent } from 'react';
import { Power, Zap, Battery, Clock, ToggleLeft, ToggleRight, Lightbulb, Tv, Sliders, Fan, Wind, HelpCircle, Thermometer, Droplets, Volume2, Key, HelpCircle as HelpIcon, Camera, Eye, Plus, Trash2, X, Check, RefreshCw, Edit } from 'lucide-react';
import { Device, DeviceType, RoomType, CustomRoom } from '../types';
import { Language, translations } from '../lib/translations';

interface DevicesViewProps {
  language: Language;
  devices: Device[];
  rooms?: CustomRoom[];
  onToggleDevice: (id: string) => void;
  onUpdateDeviceValue: (id: string, value: string | number) => void;
  onToggleDeviceAutomation: (id: string) => void;
  onAddDevice: (device: Omit<Device, 'id' | 'lastActive' | 'automationEnabled'>) => Promise<boolean>;
  onDeleteDevice: (id: string) => Promise<boolean>;
  onRenameDevice?: (id: string, newName: string) => Promise<boolean>;
}

export default function DevicesView({
  language,
  devices,
  rooms = [],
  onToggleDevice,
  onUpdateDeviceValue,
  onToggleDeviceAutomation,
  onAddDevice,
  onDeleteDevice,
  onRenameDevice
}: DevicesViewProps) {
  const t = translations[language];

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [room, setRoom] = useState<RoomType>('Salon');
  const [type, setType] = useState<DeviceType>('bulb');
  const [isOnline, setIsOnline] = useState(true);
  const [isOn, setIsOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  // Filter States
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'active' | 'disabled'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Renaming state variables
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [tempDeviceName, setTempDeviceName] = useState<string>('');

  // Dynamic Rooms List derived from rooms prop
  const roomsList = ['all', ...rooms.map(r => r.name)];

  // Ensure default form room is always a valid room from the rooms list
  useEffect(() => {
    const validRooms = rooms.map(r => r.name);
    if (validRooms.length > 0 && !validRooms.includes(room)) {
      setRoom(validRooms[0]);
    }
  }, [rooms, room]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const success = await onAddDevice({
      name: name.trim(),
      room,
      type,
      isOnline,
      isOn: type.includes('sensor') ? true : isOn,
      ipAddress: ipAddress.trim() || undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
    });

    if (success) {
      setName('');
      setIpAddress('');
      setBrand('');
      setModel('');
      setIsFormOpen(false);
    }
    setIsSubmitting(false);
  };

  // Filter Devices
  const filteredDevices = devices.filter(device => {
    const matchesRoom = roomFilter === 'all' || device.room === roomFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && device.isOnline) ||
      (statusFilter === 'offline' && !device.isOnline) ||
      (statusFilter === 'active' && device.isOn) ||
      (statusFilter === 'disabled' && !device.isOn);
    return matchesRoom && matchesStatus;
  });

  // Helper to select icon for each device type
  const getDeviceIcon = (type: DeviceType, isOn: boolean) => {
    const iconClass = `w-6 h-6 ${isOn ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`;
    switch (type) {
      case 'bulb':
      case 'led_controller':
        return <Lightbulb className={iconClass} />;
      case 'socket':
        return <Zap className={iconClass} />;
      case 'air_conditioner':
        return <Thermometer className={iconClass} />;
      case 'air_purifier':
        return <Wind className={iconClass} />;
      case 'fan':
        return <Fan className={iconClass} />;
      case 'robot_vacuum':
        return <Sliders className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      case 'speaker':
        return <Volume2 className={iconClass} />;
      case 'door_sensor':
        return <Key className={iconClass} />;
      case 'water_sensor':
        return <Droplets className={iconClass} />;
      case 'temperature_sensor':
        return <Thermometer className={iconClass} />;
      case 'humidity_sensor':
        return <Droplets className={iconClass} />;
      case 'camera':
        return <Camera className={iconClass} />;
      default:
        return <HelpCircle className={iconClass} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs transition-colors">
        {/* Room filtering capsules */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {roomsList.map(room => (
            <button
              key={room}
              onClick={() => setRoomFilter(room)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                roomFilter === room
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-polish-dark-header/60 text-slate-600 dark:text-slate-400 border border-transparent dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {room === 'all' ? t.filterAll : room}
            </button>
          ))}
        </div>

        {/* Right side controls: Status filter + Add Device Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
          {/* Status filters */}
          <div className="flex flex-wrap items-center gap-1.5 border border-slate-200/80 dark:border-slate-800/80 rounded-full p-1 bg-slate-100/55 dark:bg-polish-dark-header/60 w-full sm:w-auto">
            {[
              { id: 'all', label: language === 'tr' ? 'Tümü' : 'All' },
              { id: 'online', label: language === 'tr' ? 'Çevrimiçi' : 'Online' },
              { id: 'offline', label: language === 'tr' ? 'Çevrimdışı' : 'Offline' },
              { id: 'active', label: language === 'tr' ? 'Aktif' : 'Active' },
              { id: 'disabled', label: language === 'tr' ? 'Devre Dışı' : 'Disabled' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  statusFilter === item.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Add Device Trigger Button */}
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer transition-colors w-full sm:w-auto justify-center shrink-0"
          >
            {isFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isFormOpen ? (language === 'tr' ? 'Kapat' : 'Close') : (language === 'tr' ? 'Cihaz Ekle' : 'Add Device')}
          </button>
        </div>
      </div>

      {/* Add Device Form Card */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-md shadow-indigo-500/5 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              {language === 'tr' ? 'Yeni Akıllı Cihaz Tanımla' : 'Configure New Smart Device'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 animate-pulse"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Device Name input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'Cihaz Adı' : 'Device Name'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'tr' ? 'Örn: Salon Lambası, Klima' : 'e.g. Living Room Lamp'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Room selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'Bulunduğu Oda' : 'Room Location'}
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value as RoomType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {roomsList.filter(r => r !== 'all').map(r => (
                  <option key={r} value={r as RoomType}>{r}</option>
                ))}
              </select>
            </div>

            {/* Device Type selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'Cihaz Türü' : 'Device Type'}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DeviceType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="bulb">{language === 'tr' ? '💡 Akıllı Ampul' : '💡 Smart Bulb'}</option>
                <option value="socket">{language === 'tr' ? '🔌 Akıllı Priz' : '🔌 Smart Socket'}</option>
                <option value="led_controller">{language === 'tr' ? '🌈 LED Şerit' : '🌈 LED Controller'}</option>
                <option value="air_conditioner">{language === 'tr' ? '❄️ Klima' : '❄️ Air Conditioner'}</option>
                <option value="robot_vacuum">{language === 'tr' ? '🧹 Robot Süpürge' : '🧹 Robot Vacuum'}</option>
                <option value="air_purifier">{language === 'tr' ? '🌀 Hava Temizleyici' : '🌀 Air Purifier'}</option>
                <option value="fan">{language === 'tr' ? '💨 Vantilatör' : '💨 Fan'}</option>
                <option value="tv">{language === 'tr' ? '📺 Akıllı TV' : '📺 Smart TV'}</option>
                <option value="speaker">{language === 'tr' ? '🔊 Akıllı Hoparlör' : '🔊 Smart Speaker'}</option>
                <option value="curtains">{language === 'tr' ? '🏁 Stor Perde' : '🏁 Smart Curtains'}</option>
                <option value="camera">{language === 'tr' ? '📷 Güvenlik Kamerası' : '📷 Security Camera'}</option>
                <option value="door_sensor">{language === 'tr' ? '🔑 Kapı Sensörü' : '🔑 Door Sensor'}</option>
                <option value="water_sensor">{language === 'tr' ? '💧 Sızıntı Sensörü' : '💧 Leak Sensor'}</option>
                <option value="temperature_sensor">{language === 'tr' ? '🌡️ Sıcaklık Sensörü' : '🌡️ Temp Sensor'}</option>
                <option value="humidity_sensor">{language === 'tr' ? '💦 Nem Sensörü' : '💦 Humidity Sensor'}</option>
              </select>
            </div>
          </div>

          {/* Network & Brand Setup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'IP Adresi (İsteğe Bağlı)' : 'IP Address (Optional)'}
              </label>
              <input
                type="text"
                placeholder="Örn: 192.168.1.105"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'Marka (İsteğe Bağlı)' : 'Brand (Optional)'}
              </label>
              <input
                type="text"
                placeholder="Örn: Tapo, Tuya"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tr' ? 'Model (İsteğe Bağlı)' : 'Model (Optional)'}
              </label>
              <input
                type="text"
                placeholder="Örn: P100"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Additional Setup Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Status toggle (Online/Offline) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200/40 dark:border-slate-800/40">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'tr' ? 'Bağlantı Durumu' : 'Connection Status'}
                </span>
                <p className="text-[10px] text-slate-400">
                  {language === 'tr' ? 'Cihaz ağa bağlı ve çevrimiçi başlasın.' : 'Device starts as connected to network.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className="flex items-center"
              >
                {isOnline ? (
                  <ToggleRight className="w-8 h-8 text-indigo-600 cursor-pointer" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 cursor-pointer" />
                )}
              </button>
            </div>

            {/* Power toggle (On/Off) - Disabled for sensors */}
            {!type.includes('sensor') && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200/40 dark:border-slate-800/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'tr' ? 'Başlangıç Gücü' : 'Initial Power'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {language === 'tr' ? 'Cihaz açık olarak başlatılsın.' : 'Device starts in active state.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOn(!isOn)}
                  className="flex items-center"
                >
                  {isOn ? (
                    <ToggleRight className="w-8 h-8 text-indigo-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 cursor-pointer" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer"
            >
              {language === 'tr' ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/10 cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {language === 'tr' ? 'Cihazı Kaydet' : 'Save Device'}
            </button>
          </div>
        </form>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map(device => {
          const isSensor = device.type.includes('sensor');
          const isInteractive = device.isOnline && !isSensor;

          return (
            <div
              key={device.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-72 group relative overflow-hidden ${
                !device.isOnline
                  ? 'bg-slate-50/50 dark:bg-polish-dark-card/40 border-slate-200/40 dark:border-slate-900/40 opacity-60'
                  : device.isOn
                  ? 'bg-white dark:bg-polish-dark-card border-indigo-200/80 dark:border-indigo-600/50 shadow-md shadow-indigo-500/5'
                  : 'bg-white dark:bg-polish-dark-card border-slate-200/60 dark:border-slate-800/80 shadow-xs'
              }`}
            >
              {/* Delete Confirmation Full-Card Overlay */}
              {confirmDeleteId === device.id && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-3xl z-10 flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
                  <Trash2 className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 px-2 leading-normal">
                    {language === 'tr' ? `"${device.name}" silinsin mi?` : `Delete "${device.name}"?`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 mb-4">
                    {language === 'tr' ? 'Bu işlem geri alınamaz.' : 'This action cannot be undone.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteDevice(device.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/15 transition-all cursor-pointer"
                    >
                      {language === 'tr' ? 'Evet, Sil' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all cursor-pointer"
                    >
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-3 rounded-2xl transition-colors shrink-0 ${
                      !device.isOnline
                        ? 'bg-slate-200/50 dark:bg-slate-800/40'
                        : device.isOn
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500'
                        : 'bg-slate-100 dark:bg-polish-dark-header/60 text-slate-500'
                    }`}>
                      {getDeviceIcon(device.type, device.isOn)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingDeviceId === device.id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (tempDeviceName.trim() && tempDeviceName.trim() !== device.name && onRenameDevice) {
                              await onRenameDevice(device.id, tempDeviceName.trim());
                            }
                            setEditingDeviceId(null);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={tempDeviceName}
                            onChange={e => setTempDeviceName(e.target.value)}
                            className="px-2 py-0.5 text-xs border border-indigo-300 dark:border-indigo-500 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeviceId(null)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1 group/title">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display truncate max-w-[120px] sm:max-w-[150px]">
                            {device.name}
                          </h4>
                          {onRenameDevice && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeviceId(device.id);
                                setTempDeviceName(device.name);
                              }}
                              className="p-0.5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                              title={language === 'tr' ? 'Cihazı Yeniden Adlandır' : 'Rename Device'}
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{device.room || (language === 'tr' ? 'Oda Yok' : 'No Room')}</p>
                    </div>
                  </div>

                   {/* Card Controls on Right */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(device.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                      title={language === 'tr' ? 'Cihazı Kaldır' : 'Remove Device'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* On/Off Switch Button */}
                    {isInteractive && (
                      <button
                        onClick={() => onToggleDevice(device.id)}
                        className={`p-2 rounded-xl cursor-pointer transition-all ${
                          device.isOn
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            : 'bg-slate-100 dark:bg-polish-dark-header text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title={t.quickToggle}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {device.isOnline ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                      {language === 'tr' ? 'Cihaz aktif durumda' : 'Device is active'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                      {language === 'tr' ? 'Cihaz pasif durumda' : 'Device is passive'}
                    </span>
                  )}

                  {isSensor && device.isOnline && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                      SENSÖR
                    </span>
                  )}

                  {device.brand && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase">
                      {device.brand} {device.model}
                    </span>
                  )}

                  {device.ipAddress && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-350 text-[9px] font-mono">
                      {device.ipAddress}
                    </span>
                  )}
                </div>

                {/* Battery & Energy Stats */}
                <div className="flex items-center gap-4 mt-4 font-sans text-[10px] text-slate-400">
                  {device.batteryLevel !== undefined && (
                    <div className="flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{device.batteryLevel}%</span>
                    </div>
                  )}
                  {device.energyConsumption !== undefined && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{device.energyConsumption} kWh</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{device.lastActive}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Value / Control Panel */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-900/60 mt-auto">
                {/* Specific Device Type Interactive Controls */}
                {device.isOnline && device.isOn && (
                  <div className="space-y-3">
                    {/* Bulb / Led control brightness slider */}
                    {(device.type === 'bulb' || device.type === 'led_controller') && device.value !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold">{t.brightness}</span>
                          <span className="font-mono">{device.value}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={device.value as number}
                          onChange={(e) => onUpdateDeviceValue(device.id, parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    )}

                    {/* AC control temperature setters */}
                    {device.type === 'air_conditioner' && device.value !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">{t.tempSet}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onUpdateDeviceValue(device.id, (device.value as number) - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                            {device.value}°C
                          </span>
                          <button
                            onClick={() => onUpdateDeviceValue(device.id, (device.value as number) + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Speaker volume controller */}
                    {device.type === 'speaker' && device.value !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold">{t.volumeSet}</span>
                          <span className="font-mono">{device.value}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={device.value as number}
                          onChange={(e) => onUpdateDeviceValue(device.id, parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    )}

                    {/* Sensor or other readout value */}
                    {!['bulb', 'led_controller', 'air_conditioner', 'speaker'].includes(device.type) && (
                      device.value === 1 || device.value === '1' || String(device.value) === '1' || String(device.value).toLowerCase() === 'aktif' || String(device.value).toLowerCase() === 'açık' || device.type === 'socket' || device.value === undefined ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-1">
                          {language === 'tr' ? 'Cihaz aktif (açık) durumda.' : 'Device is currently powered on.'}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold">{t.stateText}</span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {device.value}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Display passive state when bulb/ac is off */}
                {device.isOnline && !device.isOn && (
                  <p className="text-[11px] text-slate-400 italic text-center py-1">
                    {language === 'tr' ? 'Cihaz pasif (kapalı) durumda.' : 'Device is currently powered off.'}
                  </p>
                )}

                {/* Non-interactive Sensor Reading (e.g. Temperature / Humidity / Door) */}
                {device.isOnline && isSensor && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t.stateText}</span>
                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      {device.value} {device.type === 'temperature_sensor' ? '°C' : device.type === 'humidity_sensor' ? '%' : ''}
                    </span>
                  </div>
                )}

                {/* Automation sync toggle */}
                {device.isOnline && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/30 pt-3 mt-3 text-[10px] text-slate-400 font-sans">
                    <span>{t.automation}</span>
                    <button
                      onClick={() => onToggleDeviceAutomation(device.id)}
                      className="flex items-center gap-1 cursor-pointer hover:text-indigo-500 transition-colors"
                    >
                      {device.automationEnabled ? (
                        <>
                          <span className="text-emerald-500 font-bold">{language === 'tr' ? 'AKTİF' : 'ACTIVE'}</span>
                          <ToggleRight className="w-5.5 h-5.5 text-emerald-500" />
                        </>
                      ) : (
                        <>
                          <span>{language === 'tr' ? 'DEVRE DIŞI' : 'DISABLED'}</span>
                          <ToggleLeft className="w-5.5 h-5.5 text-slate-300" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
