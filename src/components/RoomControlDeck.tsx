import React, { useState } from 'react';
import { 
  Home, Lightbulb, Thermometer, Droplets, Film, Coffee, Moon, Sun, 
  Sparkles, AlertCircle, Plus, Trash2, X, Sofa, Bed, Tv, Bath, Music, 
  Gamepad2, Trees, Check, ChevronRight, Sliders, Power, ChevronDown, 
  CheckCircle, Hammer, Info, HelpCircle, Shield, Radio, Volume2, PlusCircle,
  Edit
} from 'lucide-react';
import { Device, RoomType, DeviceType } from '../types';
import { Language, translations } from '../lib/translations';

interface RoomControlDeckProps {
  language: Language;
  selectedRoom: string;
  devices: Device[];
  onToggleDevice?: (id: string) => void;
  onUpdateDeviceValue?: (id: string, value: string | number) => void;
  onAddDevice?: (device: Omit<Device, 'id' | 'lastActive' | 'automationEnabled'>) => Promise<any>;
  onRemoveDeviceFromRoom?: (id: string) => void;
  onDeleteRoom: (roomName: string) => void;
  onClose: () => void;
  renderRoomIcon: (iconName: string, className?: string) => React.ReactNode;
  onRenameDevice?: (id: string, newName: string) => Promise<boolean>;
}

export default function RoomControlDeck({
  language,
  selectedRoom,
  devices,
  onToggleDevice,
  onUpdateDeviceValue,
  onAddDevice,
  onRemoveDeviceFromRoom,
  onDeleteRoom,
  onClose,
  renderRoomIcon,
  onRenameDevice
}: RoomControlDeckProps) {
  const t = translations[language];

  // Quick Device Add form state
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<DeviceType>('bulb');
  const [newDevValue, setNewDevValue] = useState<string | number>('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Safe Confirmations (solving blocked window.confirm in iframe sandbox)
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'active' | 'disabled'>('all');
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
  const [confirmRemoveDeviceId, setConfirmRemoveDeviceId] = useState<string | null>(null);

  // Device Renaming state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [tempDeviceName, setTempDeviceName] = useState<string>('');

  // Toast Display Helper
  const showToastMessage = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Helper to get room specific device stats
  const getRoomStats = (roomName: string) => {
    const roomDevices = devices.filter(d => d.room.toLowerCase() === roomName.toLowerCase());
    const activeCount = roomDevices.filter(d => d.isOnline && d.isOn).length;

    // Retrieve temperature if room has temperature sensor, else default to realistic ambient
    const tempSensor = roomDevices.find(d => d.type === 'temperature_sensor');
    const temp = tempSensor && tempSensor.isOnline ? tempSensor.value : roomName === 'Mutfak' ? 22 : roomName === 'Bahçe' ? 26 : 24;

    // Retrieve humidity if room has humidity sensor
    const humSensor = roomDevices.find(d => d.type === 'humidity_sensor');
    const humidity = humSensor && humSensor.isOnline ? humSensor.value : roomName === 'Mutfak' ? 50 : roomName === 'Banyo' ? 68 : 45;

    return { activeCount, temp, humidity, totalCount: roomDevices.length, roomDevices };
  };

  const { totalCount, roomDevices } = getRoomStats(selectedRoom);

  const filteredRoomDevices = roomDevices.filter(device => {
    return statusFilter === 'all' ||
      (statusFilter === 'online' && device.isOnline) ||
      (statusFilter === 'offline' && !device.isOnline) ||
      (statusFilter === 'active' && device.isOn) ||
      (statusFilter === 'disabled' && !device.isOn);
  });

  // Quick Device Addition directly into Selected Room
  const handleDirectAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName.trim() || !onAddDevice) return;

    const isSensor = newDevType.includes('sensor');
    const devicePayload = {
      name: newDevName.trim(),
      type: newDevType,
      room: selectedRoom,
      isOnline: true,
      isOn: isSensor ? true : false,
      value: newDevValue || (isSensor ? (newDevType === 'temperature_sensor' ? 24 : newDevType === 'humidity_sensor' ? 45 : 'Kuru') : undefined)
    };

    const success = await onAddDevice(devicePayload);
    if (success) {
      setNewDevName('');
      setNewDevValue('');
      setIsAddingDevice(false);
      showToastMessage(
        language === 'tr' ? 'Yeni cihaz odaya başarıyla eklendi!' : 'New device successfully added to the room!',
        'success'
      );
    } else {
      showToastMessage(
        language === 'tr' ? 'Cihaz eklenirken bir hata oluştu.' : 'Error adding device.',
        'error'
      );
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/70 dark:border-slate-800 shadow-sm animate-fadeIn space-y-6">
      {/* Toast Alert Banner inside view */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white p-4 rounded-2xl shadow-xl animate-slideDown max-w-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-rose-500 text-white p-4 rounded-2xl shadow-xl animate-slideDown max-w-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Control Center Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
            {renderRoomIcon(selectedRoom, "w-6 h-6")}
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              <span className="truncate">{selectedRoom} {language === 'tr' ? 'Kontrol Masası' : 'Control Deck'}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                {totalCount} {language === 'tr' ? 'Cihaz' : 'Devices'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {language === 'tr' ? 'Bu odadaki tüm akıllı cihazları anlık kontrol edin' : 'Control room specific smart devices instantly'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons: Add device, Delete room, Close deck */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddingDevice(!isAddingDevice)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
              isAddingDevice 
                ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {language === 'tr' ? 'Yeni Cihaz Ekle' : 'Add Device'}
          </button>
          
          {confirmDeleteRoom ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-full border border-rose-150 dark:border-rose-900/40 text-[10px]">
              <span className="text-rose-600 dark:text-rose-400 font-bold px-1.5">{language === 'tr' ? 'Oda silinsin mi?' : 'Delete room?'}</span>
              <button
                type="button"
                onClick={() => {
                  onDeleteRoom(selectedRoom);
                  setConfirmDeleteRoom(false);
                }}
                className="px-2 py-0.5 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full cursor-pointer text-[9px]"
              >
                {language === 'tr' ? 'Evet' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteRoom(false)}
                className="px-2 py-0.5 font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full cursor-pointer text-[9px]"
              >
                {language === 'tr' ? 'Hayır' : 'No'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteRoom(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/35 text-rose-600 dark:text-rose-400 rounded-full cursor-pointer transition-colors"
              title={language === 'tr' ? 'Odayı Sil' : 'Delete Room'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'tr' ? 'Odayı Sil' : 'Delete Room'}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
            title={language === 'tr' ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Direct Device Add Form (Inner Collapsible) */}
      {isAddingDevice && onAddDevice && (
        <form 
          onSubmit={handleDirectAddDevice}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              {language === 'tr' ? 'Odaya Doğrudan Cihaz Tanımla' : 'Provision Device directly to Room'}
            </h4>
            <button 
              type="button" 
              onClick={() => setIsAddingDevice(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {language === 'tr' ? 'Cihaz Adı' : 'Device Name'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'tr' ? 'Örn: Akıllı Priz' : 'e.g. Smart Socket'}
                value={newDevName}
                onChange={(e) => setNewDevName(e.target.value)}
                className="w-full bg-white dark:bg-polish-dark-card border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {language === 'tr' ? 'Cihaz Türü' : 'Device Type'}
              </label>
              <select
                value={newDevType}
                onChange={(e) => setNewDevType(e.target.value as DeviceType)}
                className="w-full bg-white dark:bg-polish-dark-card border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="bulb">{language === 'tr' ? 'Akıllı Ampul / Işık' : 'Smart Bulb'}</option>
                <option value="socket">{language === 'tr' ? 'Akıllı Priz' : 'Smart Outlet / Socket'}</option>
                <option value="led_controller">{language === 'tr' ? 'LED Kontrolcü' : 'LED Strip Controller'}</option>
                <option value="air_conditioner">{language === 'tr' ? 'Klima' : 'Air Conditioner'}</option>
                <option value="air_purifier">{language === 'tr' ? 'Hava Temizleyici' : 'Air Purifier'}</option>
                <option value="robot_vacuum">{language === 'tr' ? 'Robot Süpürge' : 'Robot Vacuum'}</option>
                <option value="temperature_sensor">{language === 'tr' ? 'Sıcaklık Sensörü' : 'Temperature Sensor'}</option>
                <option value="humidity_sensor">{language === 'tr' ? 'Nem Sensörü' : 'Humidity Sensor'}</option>
                <option value="camera">{language === 'tr' ? 'Güvenlik Kamerası' : 'IP Security Camera'}</option>
                <option value="speaker">{language === 'tr' ? 'Akıllı Hoparlör' : 'Smart Speaker'}</option>
                <option value="tv">{language === 'tr' ? 'Akıllı TV' : 'Smart Television'}</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-xs"
              >
                {language === 'tr' ? 'Cihazı Ekle' : 'Add Device'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Dynamic Device Status Filters inside Room Deck */}
      {roomDevices.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-1 bg-slate-50/55 dark:bg-polish-dark-header/40 w-full">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mr-1">
            {language === 'tr' ? 'Cihaz Filtreleri:' : 'Device Filters:'}
          </span>
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
              className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                statusFilter === item.id
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Room Device list */}
      {roomDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl text-center text-slate-400">
          <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-xs font-bold">{language === 'tr' ? 'Bu odada henüz hiçbir cihaz tanımlanmamış.' : 'No devices have been set up in this room yet.'}</p>
          <p className="text-[10px] mt-1 max-w-xs">{language === 'tr' ? 'Yukarıdaki "+ Yeni Cihaz Ekle" butonuna basarak anında ekleyebilirsiniz.' : 'Use the "+ Add Device" button above to register one now.'}</p>
        </div>
      ) : filteredRoomDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl text-center text-slate-400">
          <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-xs font-bold">{language === 'tr' ? 'Aranan kritere uygun cihaz bulunamadı.' : 'No devices found matching the filter.'}</p>
          <button onClick={() => setStatusFilter('all')} className="mt-2 text-xs font-bold text-indigo-500 hover:underline cursor-pointer">
            {language === 'tr' ? 'Filtreyi Temizle' : 'Clear Filter'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRoomDevices.map(device => {
            const isSensor = device.type.includes('sensor');
            
            return (
              <div 
                key={device.id}
                className={`p-4 rounded-2xl border transition-all ${
                  device.isOnline
                    ? device.isOn 
                      ? 'bg-slate-50/50 dark:bg-slate-900/40 border-indigo-200 dark:border-indigo-950/50 shadow-xs' 
                      : 'bg-white dark:bg-polish-dark-card border-slate-200/60 dark:border-slate-800/80'
                    : 'bg-slate-100/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      device.isOn 
                        ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-slate-50 dark:bg-polish-dark-header border border-slate-100 dark:border-slate-800 text-slate-400'
                    }`}>
                      {device.type === 'bulb' && <Lightbulb className="w-4 h-4" />}
                      {device.type === 'socket' && <Power className="w-4 h-4" />}
                      {device.type === 'led_controller' && <Sliders className="w-4 h-4" />}
                      {device.type === 'air_conditioner' && <Thermometer className="w-4 h-4" />}
                      {device.type === 'temperature_sensor' && <Thermometer className="w-4 h-4 text-orange-500" />}
                      {device.type === 'humidity_sensor' && <Droplets className="w-4 h-4 text-sky-500" />}
                      {device.type === 'tv' && <Tv className="w-4 h-4" />}
                      {device.type === 'speaker' && <Volume2 className="w-4 h-4" />}
                      {device.type === 'camera' && <Radio className="w-4 h-4 text-rose-500" />}
                      {(!['bulb', 'socket', 'led_controller', 'air_conditioner', 'temperature_sensor', 'humidity_sensor', 'tv', 'speaker', 'camera'].includes(device.type)) && <Sliders className="w-4 h-4" />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      {editingDeviceId === device.id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (tempDeviceName.trim() && tempDeviceName.trim() !== device.name && onRenameDevice) {
                              const success = await onRenameDevice(device.id, tempDeviceName.trim());
                              if (success) {
                                showToastMessage(
                                  language === 'tr' ? 'Cihaz başarıyla yeniden adlandırıldı!' : 'Device successfully renamed!',
                                  'success'
                                );
                              } else {
                                showToastMessage(
                                  language === 'tr' ? 'Cihaz adlandırılırken hata oluştu.' : 'Error renaming device.',
                                  'error'
                                );
                              }
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
                        <div className="flex items-center gap-1.5 group/title">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">{device.name}</h4>
                          {onRenameDevice && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeviceId(device.id);
                                setTempDeviceName(device.name);
                              }}
                              className="p-0.5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                              title={language === 'tr' ? 'Cihazı Yeniden Adlandır' : 'Rename Device'}
                            >
                              <Edit className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">
                        {device.type.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Power Toggle Switch / Sensor Readout Badge */}
                  <div className="shrink-0">
                    {isSensor ? (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                        {device.value}
                      </span>
                    ) : (
                      onToggleDevice && (
                        <button
                          onClick={() => onToggleDevice(device.id)}
                          disabled={!device.isOnline}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            device.isOn 
                              ? 'bg-emerald-500 border-emerald-400 text-white' 
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Interactive Controls inside Card */}
                {device.isOnline && device.isOn && !isSensor && (
                  <div className="mt-3 pt-3 border-t border-slate-200/30 dark:border-slate-800/40 space-y-2">
                    {(device.type === 'bulb' || device.type === 'led_controller') && typeof device.value === 'number' && onUpdateDeviceValue && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{language === 'tr' ? 'Parlaklık Seviyesi' : 'Brightness Level'}</span>
                          <span className="font-mono text-indigo-500 font-bold">{device.value}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={device.value}
                          onChange={(e) => onUpdateDeviceValue(device.id, parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {device.type === 'air_conditioner' && typeof device.value === 'number' && onUpdateDeviceValue && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">{language === 'tr' ? 'Hedef Isı' : 'Target Temp'}</span>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                          <button
                            type="button"
                            onClick={() => onUpdateDeviceValue(device.id, (device.value as number) - 1)}
                            className="w-5.5 h-5.5 rounded-md hover:bg-white dark:hover:bg-slate-750 text-[11px] font-bold text-slate-600 dark:text-slate-350 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 px-1">{device.value}°C</span>
                          <button
                            type="button"
                            onClick={() => onUpdateDeviceValue(device.id, (device.value as number) + 1)}
                            className="w-5.5 h-5.5 rounded-md hover:bg-white dark:hover:bg-slate-750 text-[11px] font-bold text-slate-600 dark:text-slate-350 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {device.type === 'speaker' && typeof device.value === 'number' && onUpdateDeviceValue && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{language === 'tr' ? 'Ses Seviyesi' : 'Speaker Volume'}</span>
                          <span className="font-mono text-indigo-500 font-bold">{device.value}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={device.value}
                          onChange={(e) => onUpdateDeviceValue(device.id, parseInt(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Offline notification banner */}
                {!device.isOnline && (
                  <div className="mt-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">
                    <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{t.deviceOffline}</span>
                  </div>
                )}

                {/* Metrics */}
                {device.isOnline && device.batteryLevel !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>{t.battery}</span>
                    <span className={`font-mono ${device.batteryLevel < 20 ? 'text-rose-500 font-extrabold animate-pulse' : 'text-emerald-500'}`}>
                      %{device.batteryLevel}
                    </span>
                  </div>
                )}

                {device.isOnline && device.energyConsumption !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>{language === 'tr' ? 'Tüketim' : 'Usage'}</span>
                    <span className="font-mono text-slate-500">{device.energyConsumption} kWh</span>
                  </div>
                )}

                {/* Remove device from room (unassign) button */}
                {onRemoveDeviceFromRoom && (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800/60 flex justify-end">
                    {confirmRemoveDeviceId === device.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/10 p-1 rounded-lg border border-rose-100 dark:border-rose-900/30 text-[10px]">
                        <span className="text-rose-600 dark:text-rose-400 font-bold px-1">{language === 'tr' ? 'Odadan çıkarılsın mı?' : 'Remove from room?'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveDeviceFromRoom(device.id);
                            setConfirmRemoveDeviceId(null);
                          }}
                          className="px-2 py-0.5 font-bold bg-rose-600 text-white rounded-md cursor-pointer hover:bg-rose-750 transition-colors text-[9px]"
                        >
                          {language === 'tr' ? 'Evet' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveDeviceId(null)}
                          className="px-2 py-0.5 font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-[9px]"
                        >
                          {language === 'tr' ? 'Hayır' : 'No'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveDeviceId(device.id)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        {language === 'tr' ? 'Odadan Kaldır' : 'Remove from Room'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
