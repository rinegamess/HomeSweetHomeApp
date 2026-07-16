import React, { useState, useEffect } from 'react';
import { 
  Home, Lightbulb, Thermometer, Droplets, Film, Coffee, Moon, Sun, 
  Sparkles, AlertCircle, Plus, Trash2, X, Sofa, Bed, Tv, Bath, Music, 
  Gamepad2, Trees, Check, ChevronRight, Sliders, Power, ChevronDown, 
  CheckCircle, Hammer, Info, HelpCircle, Shield, Radio, Volume2, PlusCircle,
  Edit
} from 'lucide-react';
import { Device, RoomType, DeviceType, CustomRoom } from '../types';
import { Language, translations } from '../lib/translations';
import RoomControlDeck from './RoomControlDeck';

interface RoomsViewProps {
  language: Language;
  devices: Device[];
  rooms: CustomRoom[];
  setRooms: React.Dispatch<React.SetStateAction<CustomRoom[]>>;
  onTriggerScene: (room: RoomType, scene: 'cinema' | 'cozy' | 'eco') => void;
  onToggleDevice?: (id: string) => void;
  onUpdateDeviceValue?: (id: string, value: string | number) => void;
  onAddDevice?: (device: Omit<Device, 'id' | 'lastActive' | 'automationEnabled'>) => Promise<any>;
  onDeleteDevice?: (id: string) => void;
  onRemoveDeviceFromRoom?: (id: string) => void;
  onRenameDevice?: (id: string, newName: string) => Promise<boolean>;
  onRenameRoom?: (oldName: string, newName: string) => Promise<boolean>;
}

const AVAILABLE_ICONS = [
  { name: 'Sofa', icon: Sofa, labelTr: 'Koltuk / Salon', labelEn: 'Sofa / Living' },
  { name: 'ChefHat', icon: Coffee, labelTr: 'Mutfak / Yemek', labelEn: 'Kitchen / Dining' },
  { name: 'Bed', icon: Bed, labelTr: 'Yatak Odası', labelEn: 'Bed / Sleeping' },
  { name: 'Home', icon: Home, labelTr: 'Giriş / Antre', labelEn: 'Home / Foyer' },
  { name: 'Bath', icon: Bath, labelTr: 'Banyo / Islak Alan', labelEn: 'Bath / Wet Area' },
  { name: 'Trees', icon: Trees, labelTr: 'Bahçe / Balkon', labelEn: 'Garden / Balcony' },
  { name: 'Tv', icon: Tv, labelTr: 'Sinema / Eğlence', labelEn: 'Cinema / Media' },
  { name: 'Music', icon: Music, labelTr: 'Müzik / Ses', labelEn: 'Music / Audio' },
  { name: 'Gamepad2', icon: Gamepad2, labelTr: 'Oyun / Eğlence', labelEn: 'Game Room' },
  { name: 'Coffee', icon: Coffee, labelTr: 'Kahve / Mutfak', labelEn: 'Coffee / Break' }
];

const AVAILABLE_THEMES = [
  { id: 'indigo', border: 'hover:border-indigo-400 dark:hover:border-indigo-500/50', nameTr: 'İndigo', nameEn: 'Indigo', colorClass: 'bg-indigo-500' },
  { id: 'amber', border: 'hover:border-amber-400 dark:hover:border-amber-500/50', nameTr: 'Kehribar', nameEn: 'Amber', colorClass: 'bg-amber-500' },
  { id: 'purple', border: 'hover:border-purple-400 dark:hover:border-purple-500/50', nameTr: 'Mor', nameEn: 'Purple', colorClass: 'bg-purple-500' },
  { id: 'sky', border: 'hover:border-sky-400 dark:hover:border-sky-500/50', nameTr: 'Gök Mavisi', nameEn: 'Sky', colorClass: 'bg-sky-400' },
  { id: 'emerald', border: 'hover:border-emerald-400 dark:hover:border-emerald-500/50', nameTr: 'Zümrüt', nameEn: 'Emerald', colorClass: 'bg-emerald-500' },
  { id: 'teal', border: 'hover:border-teal-400 dark:hover:border-teal-500/50', nameTr: 'Turkuaz', nameEn: 'Teal', colorClass: 'bg-teal-500' },
  { id: 'rose', border: 'hover:border-rose-400 dark:hover:border-rose-500/50', nameTr: 'Gül Kurusu', nameEn: 'Rose', colorClass: 'bg-rose-400' },
  { id: 'default', border: 'hover:border-slate-400 dark:hover:border-slate-500/50', nameTr: 'Nötr Klasik', nameEn: 'Neutral', colorClass: 'bg-slate-400' }
];

export default function RoomsView({
  language,
  devices,
  rooms,
  setRooms,
  onTriggerScene,
  onToggleDevice,
  onUpdateDeviceValue,
  onAddDevice,
  onDeleteDevice,
  onRemoveDeviceFromRoom,
  onRenameDevice,
  onRenameRoom
}: RoomsViewProps) {
  const t = translations[language];

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Filter state for Rooms and Confirmation (blocked window.confirm in iframe sandbox)
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | 'online' | 'offline' | 'active' | 'disabled'>('all');
  const [confirmDeleteRoomName, setConfirmDeleteRoomName] = useState<string | null>(null);

  // Editing Room states
  const [editingRoomName, setEditingRoomName] = useState<string | null>(null);
  const [tempRoomName, setTempRoomName] = useState<string>('');

  // Add Room form state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBg, setNewRoomBg] = useState<'indigo' | 'amber' | 'purple' | 'sky' | 'emerald' | 'teal' | 'rose' | 'default'>('indigo');
  const [newRoomIcon, setNewRoomIcon] = useState<'Home' | 'Sofa' | 'Bed' | 'ChefHat' | 'Trees' | 'Tv' | 'Bath' | 'Music' | 'Coffee' | 'Film'>('Sofa');

  // Quick Device Add form state inside selected room
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<DeviceType>('bulb');
  const [newDevValue, setNewDevValue] = useState<string | number>('');

  // Helper to render dynamic room icons
  const renderRoomIcon = (iconName: string, className: string = "w-5.5 h-5.5") => {
    switch (iconName) {
      case 'Home': return <Home className={className} />;
      case 'Sofa': return <Sofa className={className} />;
      case 'Bed': return <Bed className={className} />;
      case 'ChefHat': return <Coffee className={className} />; // map Coffee to ChefHat if custom
      case 'Trees': return <Trees className={className} />;
      case 'Tv': return <Tv className={className} />;
      case 'Bath': return <Bath className={className} />;
      case 'Music': return <Music className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Film': return <Film className={className} />;
      default: return <Home className={className} />;
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

  // Handle Scenario triggers
  const handleSceneTrigger = (roomName: string, scene: 'cinema' | 'cozy' | 'eco') => {
    onTriggerScene(roomName, scene);
    let msg = '';
    if (scene === 'cinema') msg = `[${roomName}] ${t.sceneCinemaApplied}`;
    if (scene === 'cozy') msg = `[${roomName}] ${t.sceneCozyApplied}`;
    if (scene === 'eco') msg = `[${roomName}] ${t.sceneEcoApplied}`;

    showToastMessage(msg, 'success');
  };

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

  // Add Dynamic Room Handler
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newRoomName.trim();
    if (!trimmedName) return;

    // Check if duplicate name exists
    const duplicate = rooms.some(r => r.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      showToastMessage(
        language === 'tr' ? 'Bu isimde bir oda zaten mevcut!' : 'A room with this name already exists!',
        'error'
      );
      return;
    }

    const newRoom: CustomRoom = {
      name: trimmedName,
      bg: newRoomBg,
      icon: newRoomIcon
    };

    setRooms(prev => [...prev, newRoom]);
    setNewRoomName('');
    setIsAddingRoom(false);
    showToastMessage(
      language === 'tr' ? `"${trimmedName}" odası başarıyla oluşturuldu!` : `"${trimmedName}" room was successfully created!`,
      'success'
    );
  };

  // Delete Room Handler
  const handleDeleteRoom = (roomName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent opening details
    
    setRooms(prev => prev.filter(r => r.name.toLowerCase() !== roomName.toLowerCase()));
    
    if (selectedRoom?.toLowerCase() === roomName.toLowerCase()) {
      setSelectedRoom(null);
    }

    showToastMessage(
      language === 'tr' ? `"${roomName}" odası silindi.` : `"${roomName}" room was deleted.`,
      'success'
    );
  };

  // Rename Room Handler
  const handleRenameRoomInternal = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    if (rooms.some(r => r.name.toLowerCase() === newName.toLowerCase())) {
      showToastMessage(
        language === 'tr' 
          ? `"${newName}" adında bir oda zaten mevcut!` 
          : `A room named "${newName}" already exists!`,
        'error'
      );
      return;
    }

    if (onRenameRoom) {
      const success = await onRenameRoom(oldName, newName);
      if (!success) {
        showToastMessage(
          language === 'tr' ? 'Oda adı güncellenirken bir hata oluştu.' : 'Error renaming room.',
          'error'
        );
        return;
      }
    }

    setRooms(prev => prev.map(r => r.name.toLowerCase() === oldName.toLowerCase() ? { ...r, name: newName } : r));

    if (selectedRoom?.toLowerCase() === oldName.toLowerCase()) {
      setSelectedRoom(newName);
    }

    showToastMessage(
      language === 'tr' ? 'Oda adı başarıyla güncellendi!' : 'Room name updated successfully!',
      'success'
    );
  };

  // Quick Device Addition directly into Selected Room
  const handleDirectAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !newDevName.trim() || !onAddDevice) return;

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
    <div className="space-y-6">
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

      {/* Header Panel with Quick Add Room Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 px-6 py-4 rounded-3xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-500" />
            {t.roomsTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'tr' ? 'Ev bölümlerini yönetin ve odaya özel cihazları anlık kontrol edin' : 'Manage your home divisions and instantly control room specific smart devices'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddingRoom(!isAddingRoom);
            if (isAddingRoom) setNewRoomName('');
          }}
          className={`flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-bold rounded-full cursor-pointer transition-all self-start sm:self-center ${
            isAddingRoom 
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/10' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/15'
          }`}
        >
          {isAddingRoom ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAddingRoom ? (language === 'tr' ? 'İptal Et' : 'Cancel') : (language === 'tr' ? 'Yeni Oda Ekle' : 'Add New Room')}
        </button>
      </div>

      {/* Add Room Collapsible Form */}
      {isAddingRoom && (
        <form 
          onSubmit={handleCreateRoom}
          className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border-2 border-dashed border-slate-200 dark:border-slate-800/80 space-y-5 animate-fadeIn"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Name and Theme */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {language === 'tr' ? 'Oda Adı' : 'Room Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'tr' ? 'Örn: Çalışma Odası, Çocuk Odası...' : 'e.g. Study Room, Kids Room...'}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-polish-dark-header border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {language === 'tr' ? 'Oda Stil Teması' : 'Room Color Theme'}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVAILABLE_THEMES.map(themeObj => (
                    <button
                      key={themeObj.id}
                      type="button"
                      onClick={() => setNewRoomBg(themeObj.id as any)}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        newRoomBg === themeObj.id 
                          ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-slate-50/50 dark:bg-polish-dark-header/40 border-slate-200/50 dark:border-slate-850 text-slate-500'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${themeObj.colorClass}`} />
                      <span className="truncate max-w-full text-[9px]">{language === 'tr' ? themeObj.nameTr : themeObj.nameEn}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Icon selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'tr' ? 'Oda Sembolü / İkon' : 'Room Symbol / Icon'}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {AVAILABLE_ICONS.map(iObj => {
                  const Icon = iObj.icon;
                  return (
                    <button
                      key={iObj.name}
                      type="button"
                      onClick={() => setNewRoomIcon(iObj.name as any)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        newRoomIcon === iObj.name
                          ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 scale-102 font-bold'
                          : 'bg-slate-50/50 dark:bg-polish-dark-header/40 border-slate-200/50 dark:border-slate-850 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-[9px] font-sans truncate max-w-full">{language === 'tr' ? iObj.labelTr : iObj.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setIsAddingRoom(false);
                setNewRoomName('');
              }}
              className="px-4.5 py-2.5 text-xs font-bold rounded-xl cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {language === 'tr' ? 'Geri Dön' : 'Go Back'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/10 transition-colors"
            >
              {language === 'tr' ? 'Odayı Oluştur' : 'Build Room'}
            </button>
          </div>
        </form>
      )}

      {/* Room Status Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-3xl shadow-xs justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          {language === 'tr' ? 'Odaları Filtrele:' : 'Filter Rooms:'}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 border border-slate-200/80 dark:border-slate-800/80 rounded-full p-1 bg-slate-100/55 dark:bg-polish-dark-header/60 w-full sm:w-auto">
          {[
            { id: 'all', label: language === 'tr' ? 'Tüm Odalar' : 'All Rooms' },
            { id: 'online', label: language === 'tr' ? 'Çevrimiçi Cihazlı' : 'With Online Devices' },
            { id: 'offline', label: language === 'tr' ? 'Çevrimdışı Cihazlı' : 'With Offline Devices' },
            { id: 'active', label: language === 'tr' ? 'Aktif Cihazlı' : 'With Active Devices' },
            { id: 'disabled', label: language === 'tr' ? 'Devre Dışı Cihazlı' : 'With Disabled Devices' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setRoomStatusFilter(item.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                roomStatusFilter === item.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Adaptive Side-by-Side Rooms and Devices Grid Layout */}
      <div className={selectedRoom ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "space-y-6"}>
        
        {/* Rooms Listing List (Left column if room selected, else standard grid layout) */}
        <div className={selectedRoom ? "lg:col-span-4 space-y-4" : ""}>
          <div className={selectedRoom ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {(() => {
              const filteredRooms = rooms.filter(room => {
                const { roomDevices } = getRoomStats(room.name);
                if (roomStatusFilter === 'all') return true;
                if (roomStatusFilter === 'online') return roomDevices.some(d => d.isOnline);
                if (roomStatusFilter === 'offline') return roomDevices.some(d => !d.isOnline);
                if (roomStatusFilter === 'active') return roomDevices.some(d => d.isOnline && d.isOn);
                if (roomStatusFilter === 'disabled') return roomDevices.some(d => !d.isOn);
                return true;
              });

              if (filteredRooms.length === 0) {
                return (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 opacity-45 mb-2 text-indigo-500" />
                    <p className="text-xs font-bold">{language === 'tr' ? 'Filtreye uygun oda bulunamadı.' : 'No rooms matching the selected status filter.'}</p>
                    <button onClick={() => setRoomStatusFilter('all')} className="mt-2 text-xs font-bold text-indigo-500 hover:underline cursor-pointer">
                      {language === 'tr' ? 'Filtreyi Sıfırla' : 'Reset Filter'}
                    </button>
                  </div>
                );
              }

              return filteredRooms.map(room => {
                const { activeCount, temp, humidity, totalCount } = getRoomStats(room.name);
                const borderClass = AVAILABLE_THEMES.find(tObj => tObj.id === room.bg)?.border || 'hover:border-indigo-400';
                const isSelected = selectedRoom?.toLowerCase() === room.name.toLowerCase();

                return (
                  <div
                    key={room.name}
                    onClick={() => setSelectedRoom(isSelected ? null : room.name)}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer relative group ${
                      isSelected 
                        ? 'bg-indigo-50/50 dark:bg-polish-dark-header border-indigo-500 ring-2 ring-indigo-500/20' 
                        : 'bg-white dark:bg-polish-dark-card border-slate-200/60 dark:border-slate-800/80'
                    } ${borderClass} ${selectedRoom ? 'h-auto py-4.5' : 'h-80'}`}
                  >
                    {/* Floating Delete & Rename button - with safe inline confirmation */}
                    {!selectedRoom && (
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {editingRoomName !== room.name && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoomName(room.name);
                              setTempRoomName(room.name);
                            }}
                            className="p-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title={language === 'tr' ? 'Odayı Yeniden Adlandır' : 'Rename Room'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {confirmDeleteRoomName === room.name ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-xl border border-rose-200 dark:border-rose-900/30 text-[10px]">
                            <span className="text-rose-600 dark:text-rose-400 font-bold px-1">{language === 'tr' ? 'Sil?' : 'Delete?'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteRoom(room.name);
                                setConfirmDeleteRoomName(null);
                              }}
                              className="px-1.5 py-0.5 font-bold bg-rose-600 text-white rounded-md cursor-pointer text-[9px]"
                            >
                              {language === 'tr' ? 'Evet' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRoomName(null)}
                              className="px-1.5 py-0.5 font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md cursor-pointer text-[9px]"
                            >
                              {language === 'tr' ? 'Hayır' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRoomName(room.name)}
                            className="p-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title={language === 'tr' ? 'Odayı Sil' : 'Delete Room'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="group-children">
                      {/* Room Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-2 rounded-2xl bg-slate-50 dark:bg-polish-dark-header border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 shrink-0">
                            {renderRoomIcon(room.icon, "w-5 h-5 text-indigo-500")}
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingRoomName === room.name ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (tempRoomName.trim() && tempRoomName.trim() !== room.name) {
                                    handleRenameRoomInternal(room.name, tempRoomName.trim());
                                  }
                                  setEditingRoomName(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1"
                              >
                                <input
                                  type="text"
                                  value={tempRoomName}
                                  onChange={e => setTempRoomName(e.target.value)}
                                  className="px-2 py-0.5 text-xs border border-indigo-300 dark:border-indigo-500 rounded-lg bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-24 sm:w-28"
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
                                  onClick={() => setEditingRoomName(null)}
                                  className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-center gap-1.5 group/title">
                                <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                  {room.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRoomName(room.name);
                                    setTempRoomName(room.name);
                                  }}
                                  className="p-0.5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity"
                                  title={language === 'tr' ? 'Odayı Yeniden Adlandır' : 'Rename Room'}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 font-semibold font-sans mt-0.5">
                              {totalCount} {language === 'tr' ? 'cihaz kurulu' : 'devices installed'}
                            </p>
                          </div>
                        </div>

                        {/* Active Devices Count */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          activeCount > 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {activeCount} {t.activeDevicesLabel}
                        </span>
                      </div>

                      {/* Temperature and Humidity Row */}
                      <div className={`grid grid-cols-2 gap-3 ${selectedRoom ? 'mt-3.5' : 'mt-6'}`}>
                        <div className="p-2 py-2 rounded-2xl bg-slate-50/80 dark:bg-polish-dark-header/65 border border-slate-100 dark:border-slate-900/60 flex items-center gap-2">
                          <Thermometer className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans truncate">{t.tempLabel}</span>
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">{temp}°C</span>
                          </div>
                        </div>

                        <div className="p-2 py-2 rounded-2xl bg-slate-50/80 dark:bg-polish-dark-header/65 border border-slate-100 dark:border-slate-900/60 flex items-center gap-2">
                          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans truncate">{t.humidityLabel}</span>
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">%{humidity}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Room Quick Scenarios Panel - Hidden when room is selected to prevent sidebar clutter */}
                    {!selectedRoom && (
                      <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/40 mt-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">
                            {t.quickSceneTitle}
                          </h4>
                          <span className="text-[9px] text-indigo-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => setSelectedRoom(isSelected ? null : room.name)}>
                            {language === 'tr' ? 'Cihazları Gör' : 'See Devices'} <ChevronRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleSceneTrigger(room.name, 'cinema')}
                            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-polish-dark-header dark:hover:bg-slate-850/85 text-[10px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            <Film className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>{t.sceneCinema}</span>
                          </button>

                          <button
                            onClick={() => handleSceneTrigger(room.name, 'cozy')}
                            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-polish-dark-header dark:hover:bg-slate-850/85 text-[10px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>{t.sceneCozy}</span>
                          </button>

                          <button
                            onClick={() => handleSceneTrigger(room.name, 'eco')}
                            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-polish-dark-header dark:hover:bg-slate-850/85 text-[10px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                            <span>{t.sceneEco}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Selected Room Interactive Control Center (Side Panel layout) */}
        {selectedRoom && (
          <div className="lg:col-span-8">
            <RoomControlDeck
              language={language}
              selectedRoom={selectedRoom}
              devices={devices}
              onToggleDevice={onToggleDevice}
              onUpdateDeviceValue={onUpdateDeviceValue}
              onAddDevice={onAddDevice}
              onRemoveDeviceFromRoom={onRemoveDeviceFromRoom}
              onDeleteRoom={(roomName) => handleDeleteRoom(roomName)}
              onClose={() => setSelectedRoom(null)}
              renderRoomIcon={renderRoomIcon}
              onRenameDevice={onRenameDevice}
            />
          </div>
        )}
      </div>
    </div>
  );
}
