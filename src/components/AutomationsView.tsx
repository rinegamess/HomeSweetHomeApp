import React, { useState } from 'react';
import { GitBranch, Clock, Thermometer, Droplets, Key, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Device, Automation } from '../types';
import { Language, translations } from '../lib/translations';

interface AutomationsViewProps {
  language: Language;
  devices: Device[];
  automations: Automation[];
  onCreateAutomation: (automation: Omit<Automation, 'id' | 'active'>) => void;
  onToggleAutomation: (id: string) => void;
  onDeleteAutomation: (id: string) => void;
}

export default function AutomationsView({
  language,
  devices,
  automations,
  onCreateAutomation,
  onToggleAutomation,
  onDeleteAutomation
}: AutomationsViewProps) {
  const t = translations[language];

  // Forms State
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'time' | 'sensor_temp' | 'sensor_humidity' | 'sensor_door' | 'schedule'>('time');
  const [triggerCondition, setTriggerCondition] = useState('22:00');
  const [actionDeviceId, setActionDeviceId] = useState(devices[0]?.id || '');
  const [actionType, setActionType] = useState<'turn_on' | 'turn_off' | 'set_value'>('turn_on');
  const [actionValue, setActionValue] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(language === 'tr' ? 'Lütfen otomasyona geçerli bir isim verin!' : 'Please provide a valid name!');
      return;
    }
    
    onCreateAutomation({
      name,
      triggerType,
      triggerCondition,
      actionDeviceId,
      actionType,
      actionValue: actionValue || undefined
    });

    // Reset Form
    setName('');
    setTriggerCondition('22:00');
    setActionType('turn_on');
    setActionValue('');
    setIsCreating(false);
    setFormError(null);
  };

  // Helper to resolve device names
  const getDeviceName = (id: string) => {
    const dev = devices.find(d => d.id === id);
    return dev ? dev.name : 'Unknown Device';
  };

  // Helper trigger icons
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'time':
      case 'schedule':
        return <Clock className="w-4 h-4 text-sky-500" />;
      case 'sensor_temp':
        return <Thermometer className="w-4 h-4 text-orange-500" />;
      case 'sensor_humidity':
        return <Droplets className="w-4 h-4 text-indigo-500" />;
      case 'sensor_door':
        return <Key className="w-4 h-4 text-amber-500" />;
      default:
        return <GitBranch className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">
          {t.automationsTitle}
        </h2>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            {t.newAutomationBtn}
          </button>
        )}
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-3xl bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 shadow-lg space-y-4 animate-slideDown"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">
              {t.newAutomationBtn}
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {t.cancelBtn}
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-xs font-semibold bg-rose-50 text-rose-600 p-3 rounded-xl">
              <AlertCircle className="w-4.5 h-4.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Automation Name */}
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">{t.automationName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'tr' ? 'Örn: Gece Salonu Kapat' : 'e.g. Turn Off Salon Night'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* IF Trigger Section */}
            <div className="p-4 rounded-2xl bg-sky-50/20 dark:bg-sky-950/10 border border-sky-100/30 dark:border-sky-900/10 space-y-3">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block">{t.ifCondition}</span>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.triggerType}</label>
                <select
                  value={triggerType}
                  onChange={(e: any) => {
                    const type = e.target.value;
                    setTriggerType(type);
                    // Autofill sensible trigger condition values
                    if (type === 'time') setTriggerCondition('22:00');
                    else if (type === 'sensor_temp') setTriggerCondition('> 26');
                    else if (type === 'sensor_humidity') setTriggerCondition('> 70');
                    else if (type === 'sensor_door') setTriggerCondition('Açık');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300"
                >
                  <option value="time">{t.triggerTime}</option>
                  <option value="sensor_temp">{t.triggerTemp}</option>
                  <option value="sensor_humidity">{t.triggerHumidity}</option>
                  <option value="sensor_door">{t.triggerDoor}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.triggerValue}</label>
                <input
                  type="text"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                  placeholder="e.g. 23:30 or > 25"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            {/* THEN Action Section */}
            <div className="p-4 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10 space-y-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">{t.thenAction}</span>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.targetDevice}</label>
                <select
                  value={actionDeviceId}
                  onChange={(e) => setActionDeviceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">{t.actionType}</label>
                  <select
                    value={actionType}
                    onChange={(e: any) => setActionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300"
                  >
                    <option value="turn_on">Aç (ON)</option>
                    <option value="turn_off">Kapat (OFF)</option>
                    <option value="set_value">Değer Ayarla</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">{t.actionValue}</label>
                  <input
                    type="text"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder="e.g. 22 or 70%"
                    disabled={actionType !== 'set_value'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-polish-dark-header text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              {t.createBtn}
            </button>
          </div>
        </form>
      )}

      {/* Automations Rules List */}
      <div className="space-y-4">
        {automations.map(aut => (
          <div
            key={aut.id}
            className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
              aut.active
                ? 'bg-white dark:bg-polish-dark-card border-slate-200/60 dark:border-slate-800/80 shadow-xs'
                : 'bg-slate-50/50 dark:bg-polish-dark-card/40 border-slate-200/40 dark:border-slate-800/40 opacity-60'
            }`}
          >
            {/* Rule Left Block */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${
                aut.active ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
              }`}>
                <GitBranch className="w-5 h-5" />
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">
                  {aut.name}
                </h4>
                
                {/* Visual Logic Flow Representation */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2 font-sans text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
                    {getTriggerIcon(aut.triggerType)}
                    <span>IF: {aut.triggerType.replace('sensor_', '').toUpperCase()} ({aut.triggerCondition})</span>
                  </span>
                  
                  <span className="text-slate-400 font-bold">➔</span>
                  
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold">
                    THEN: {getDeviceName(aut.actionDeviceId)} • {
                      aut.actionType === 'turn_on' ? 'AÇ' : aut.actionType === 'turn_off' ? 'KAPAT' : `AYARLA (${aut.actionValue})`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Rule Action Controllers */}
            <div className="flex items-center gap-3 self-end md:self-center">
              {/* Active Switch Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">{t.activeStatus}</span>
                <button
                  onClick={() => onToggleAutomation(aut.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    aut.active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-polish-dark-header'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      aut.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => onDeleteAutomation(aut.id)}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Otomasyonu Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
