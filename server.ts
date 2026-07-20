import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Device, KitchenItem, Automation, NotificationItem, PlatformConnection, DeviceType } from './src/types.js';

dotenv.config();

// Local Area Network (LAN) Direct Integrations (Tapo, Shelly, Tasmota, and REST)
import { loginDeviceByIp, cloudLogin } from 'tp-link-tapo-connect';
import net from 'net';

let googleHomeConfig = {
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  projectId: '',
  connected: false
};

let localConfig = {
  tapoEmail: process.env.TAPO_EMAIL || '',
  tapoPassword: process.env.TAPO_PASSWORD || '',
  pingTimeoutMs: 1000,
  connected: true
};

// Robust JSON sanitization helper to fix AI response formatting issues
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '');
    cleaned = cleaned.replace(/```$/, '');
    cleaned = cleaned.trim();
  }
  // Strip trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
  return cleaned;
}

// Direct socket verification for smart devices on LAN (Presence detection)
async function checkTcpPort(ip: string, port: number, timeout: number = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      if (!resolved) { resolve(true); resolved = true; }
      socket.destroy();
    });
    
    socket.on('timeout', () => {
      if (!resolved) { resolve(false); resolved = true; }
      socket.destroy();
    });
    
    socket.on('error', () => {
      if (!resolved) { resolve(false); resolved = true; }
      socket.destroy();
    });
    
    socket.connect(port, ip);
  });
}

// Scans typical ports of local smart plugs/lights to check if they're reachable
async function checkDeviceOnline(ip: string): Promise<boolean> {
  // Common local smart home ports: 80 (Shelly/Tasmota/HTTP), 8339 (Tapo), 6668 (Tuya), 443 (HTTPS), 554 (RTSP camera)
  const ports = [80, 8339, 6668, 443, 554];
  for (const port of ports) {
    try {
      const ok = await checkTcpPort(ip, port, 700);
      if (ok) return true;
    } catch {
      // Continue to next port
    }
  }
  return false;
}

// Scans all devices that have an IP Address configured to update their online/offline state
async function runLocalPresenceCheck(): Promise<{ success: boolean; deviceCount: number; log: string }> {
  let checkedCount = 0;
  let onlineCount = 0;
  for (const device of devices) {
    if (device.ipAddress) {
      checkedCount++;
      const isOnline = await checkDeviceOnline(device.ipAddress);
      if (device.isOnline !== isOnline) {
        device.isOnline = isOnline;
        device.lastActive = isOnline ? 'Şimdi (Ağda Algılandı)' : 'Çevrimdışı (Ağda Bulunamadı)';
      }
      if (isOnline) {
        onlineCount++;
        // If it's a Tapo device and we have Tapo credentials, let's query its exact on/off state!
        const brandLower = device.brand ? device.brand.toLowerCase() : '';
        if (brandLower === 'tapo' && localConfig.tapoEmail && localConfig.tapoPassword) {
          try {
            const session = await loginDeviceByIp(localConfig.tapoEmail, localConfig.tapoPassword, device.ipAddress);
            const info = await session.getDeviceInfo();
            device.isOn = info.device_on;
            device.isOnline = true;
          } catch (err: any) {
            console.warn(`[Background Tapo Poll Warning] Failed to poll state for ${device.name} at ${device.ipAddress}: ${err.message}`);
          }
        }
      }
    }
  }
  saveState();
  return {
    success: true,
    deviceCount: checkedCount,
    log: `Yerel ağdaki ${checkedCount} adet IP'li cihaz tarandı. ${onlineCount} tanesi aktif olarak tespit edildi.`
  };
}

// Run direct status check in the background every 40 seconds
setInterval(() => {
  runLocalPresenceCheck().catch(err => console.error('[LAN Presence Check Background Error]:', err));
}, 40000);


const app = express();
app.use(express.json());

const PORT = 3000;

const DATA_FILE = path.join(process.cwd(), 'smarthome_db.json');

// Default arrays to seed or fallback
const DEFAULT_DEVICES: Device[] = [
  { id: 'dev-1', name: 'Salon Akıllı Ampul', type: 'bulb', room: 'Salon', isOnline: true, isOn: false, energyConsumption: 0.01, lastActive: 'Bugün 20:15', automationEnabled: true, value: 75 },
  { id: 'dev-2', name: 'Mutfak Kahve Makinesi', type: 'socket', room: 'Mutfak', isOnline: true, isOn: false, energyConsumption: 0.85, lastActive: 'Dün 08:30', automationEnabled: false },
  { id: 'dev-3', name: 'Yatak Odası Klima', type: 'air_conditioner', room: 'Yatak Odası', isOnline: true, isOn: true, energyConsumption: 1.2, lastActive: 'Bugün 01:00', automationEnabled: true, value: 22 },
  { id: 'dev-4', name: 'Koridor LED Şerit', type: 'led_controller', room: 'Koridor', isOnline: true, isOn: false, energyConsumption: 0.05, lastActive: 'Bugün 21:00', automationEnabled: true, value: 'Warm White' },
  { id: 'dev-5', name: 'Akıllı Robot Süpürge', type: 'robot_vacuum', room: 'Koridor', isOnline: true, isOn: false, batteryLevel: 85, lastActive: 'Bugün 15:00', automationEnabled: true, value: 'Şarj Oluyor' },
  { id: 'dev-6', name: 'Salon Hava Temizleyici', type: 'air_purifier', room: 'Salon', isOnline: true, isOn: true, energyConsumption: 0.15, lastActive: 'Bugün 00:30', automationEnabled: true, value: 'Oto' },
  { id: 'dev-7', name: 'Salon Vantilatör', type: 'fan', room: 'Salon', isOnline: false, isOn: false, lastActive: '3 gün önce', automationEnabled: false },
  { id: 'dev-8', name: 'Salon Akıllı TV', type: 'tv', room: 'Salon', isOnline: true, isOn: false, energyConsumption: 0.22, lastActive: 'Dün 23:00', automationEnabled: false },
  { id: 'dev-9', name: 'Yatak Odası Akıllı Hoparlör', type: 'speaker', room: 'Yatak Odası', isOnline: true, isOn: true, lastActive: 'Bugün 22:00', automationEnabled: false, value: 40 },
  { id: 'dev-10', name: 'Mutfak Stor Perde', type: 'curtains', room: 'Mutfak', isOnline: true, isOn: false, batteryLevel: 92, lastActive: 'Bugün 07:00', automationEnabled: true, value: 100 },
  { id: 'dev-11', name: 'Giriş Kapısı Sensörü', type: 'door_sensor', room: 'Koridor', isOnline: true, isOn: false, batteryLevel: 98, lastActive: 'Bugün 22:15', automationEnabled: true, value: 'Kapalı' },
  { id: 'dev-12', name: 'Banyo Su Sızıntı Sensörü', type: 'water_sensor', room: 'Banyo', isOnline: true, isOn: false, batteryLevel: 100, lastActive: 'Sürekli Aktif', automationEnabled: true, value: 'Kuru' },
  { id: 'dev-13', name: 'Salon Sıcaklık Sensörü', type: 'temperature_sensor', room: 'Salon', isOnline: true, isOn: true, batteryLevel: 90, lastActive: 'Sürekli Aktif', automationEnabled: true, value: 24 },
  { id: 'dev-14', name: 'Yatak Odası Nem Sensörü', type: 'humidity_sensor', room: 'Yatak Odası', isOnline: true, isOn: true, batteryLevel: 91, lastActive: 'Sürekli Aktif', automationEnabled: true, value: 55 },
  { id: 'dev-15', name: 'Bahçe Akıllı Projektör', type: 'bulb', room: 'Bahçe', isOnline: true, isOn: false, energyConsumption: 0.18, lastActive: 'Dün 22:00', automationEnabled: true },
];

const DEFAULT_KITCHEN_ITEMS: KitchenItem[] = [
  { id: 'kt-1', name: 'Yarım Yağlı Süt', category: 'İçecek', isMissing: false, quantity: '2 Adet' },
  { id: 'kt-2', name: 'Köy Yumurtası', category: 'Kahvaltılık', isMissing: false, quantity: '15 Adet' },
  { id: 'kt-3', name: 'Tost Ekmeği', category: 'Kahvaltılık', isMissing: true },
  { id: 'kt-4', name: 'Pilavlık Pirinç', category: 'Bakliyat', isMissing: false, quantity: '1 Kg' },
  { id: 'kt-5', name: 'Spagetti Makarna', category: 'Bakliyat', isMissing: false, quantity: '3 Paket' },
  { id: 'kt-6', name: 'Bulaşık Deterjanı', category: 'Temizlik', isMissing: true },
  { id: 'kt-7', name: 'Süzme Peynir', category: 'Kahvaltılık', isMissing: false, quantity: '500g' },
  { id: 'kt-8', name: 'Taze Muz', category: 'Meyve', isMissing: false, quantity: '1 Salkım' },
  { id: 'kt-9', name: 'Dana Kıyma', category: 'Et', isMissing: true },
  { id: 'kt-10', name: 'Dondurulmuş Pizza', category: 'Dondurulmuş', isMissing: false, quantity: '2 Adet' },
];

const DEFAULT_AUTOMATIONS: Automation[] = [
  { id: 'aut-1', name: 'Gece Tasarruf Modu', active: true, triggerType: 'time', triggerCondition: '23:00', actionDeviceId: 'dev-1', actionType: 'turn_off' },
  { id: 'aut-2', name: 'Sıcaklık Kontrol Klima', active: true, triggerType: 'sensor_temp', triggerCondition: '> 26', actionDeviceId: 'dev-3', actionType: 'turn_on' },
  { id: 'aut-3', name: 'Nem Alıcı Oto Başlat', active: false, triggerType: 'sensor_humidity', triggerCondition: '> 65', actionDeviceId: 'dev-6', actionType: 'set_value', actionValue: 'Yüksek Hız' },
  { id: 'aut-4', name: 'Kapı Açıldığında Giriş Işığı', active: true, triggerType: 'sensor_door', triggerCondition: 'Açık', actionDeviceId: 'dev-4', actionType: 'turn_on' },
];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { id: 'nt-1', title: 'Hoş Geldiniz', message: 'SmartHome AI Platformu başarıyla başlatıldı.', type: 'success', timestamp: 'Bugün 02:00', isRead: false },
  { id: 'nt-2', title: 'Eksik Ürün Uyarısı', message: 'Mutfak listenizde Dana Kıyma ve Tost Ekmeği eksik olarak işaretlendi.', type: 'warning', timestamp: 'Bugün 01:30', isRead: false },
  { id: 'nt-3', title: 'Enerji Tasarrufu Önerisi', message: 'Yatak odası kliması son 4 saattir çalışıyor. Sıcaklığı 24 dereceye ayarlamak %10 tasarruf sağlar.', type: 'info', timestamp: 'Dün 22:00', isRead: true },
];

const DEFAULT_PLATFORMS: PlatformConnection[] = [
  { id: 'plt-1', name: 'Home Assistant', connected: true, type: 'homeassistant', deviceCount: 8 },
  { id: 'plt-2', name: 'Tuya Smart', connected: true, type: 'tuya', deviceCount: 4 },
  { id: 'plt-3', name: 'Xiaomi Home', connected: false, type: 'xiaomi', deviceCount: 0 },
  { id: 'plt-4', name: 'Matter Hub', connected: true, type: 'matter', deviceCount: 3 },
  { id: 'plt-5', name: 'Google Home', connected: true, type: 'google', deviceCount: 15 },
  { id: 'plt-6', name: 'Amazon Alexa', connected: false, type: 'alexa', deviceCount: 0 },
  { id: 'plt-7', name: 'Shelly REST', connected: true, type: 'shelly', deviceCount: 2 },
  { id: 'plt-8', name: 'MQTT Broker', connected: true, type: 'mqtt', deviceCount: 10 },
];

// Initialize live state pointers
let devices: Device[] = [];
let kitchenItems: KitchenItem[] = [];
let automations: Automation[] = [];
let notifications: NotificationItem[] = [];
let platforms: PlatformConnection[] = [];

// Unified Persistence Helpers
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      devices = parsed.devices || DEFAULT_DEVICES;
      kitchenItems = parsed.kitchenItems || DEFAULT_KITCHEN_ITEMS;
      automations = parsed.automations || DEFAULT_AUTOMATIONS;
      notifications = parsed.notifications || DEFAULT_NOTIFICATIONS;
      platforms = parsed.platforms || DEFAULT_PLATFORMS;
      if (parsed.googleHomeConfig) {
        googleHomeConfig = { ...googleHomeConfig, ...parsed.googleHomeConfig };
      }
      if (parsed.localConfig) {
        localConfig = { ...localConfig, ...parsed.localConfig };
      }
      console.log('[Persistence] Loaded smart home state from smarthome_db.json');
    } else {
      devices = [...DEFAULT_DEVICES];
      kitchenItems = [...DEFAULT_KITCHEN_ITEMS];
      automations = [...DEFAULT_AUTOMATIONS];
      notifications = [...DEFAULT_NOTIFICATIONS];
      platforms = [...DEFAULT_PLATFORMS];
      saveState();
      console.log('[Persistence] Initialized smarthome_db.json with default seed data');
    }
  } catch (err) {
    console.error('[Persistence] Error loading state, falling back to defaults:', err);
    devices = [...DEFAULT_DEVICES];
    kitchenItems = [...DEFAULT_KITCHEN_ITEMS];
    automations = [...DEFAULT_AUTOMATIONS];
    notifications = [...DEFAULT_NOTIFICATIONS];
    platforms = [...DEFAULT_PLATFORMS];
  }
}

function saveState() {
  try {
    const dataToSave = {
      devices,
      kitchenItems,
      automations,
      notifications,
      platforms,
      googleHomeConfig,
      localConfig
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (err) {
    console.error('[Persistence] Error saving state:', err);
  }
}

// Load state immediately on import
loadState();

// Weather Data Mock
const weatherData = {
  temp: 28,
  condition: 'Güneşli',
  humidity: 45,
  windSpeed: 12,
  city: 'İstanbul'
};

// Lazy initialize Google GenAI helper
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }
  return aiClient;
}

// REST API GET Endpoints
app.get('/api/devices', async (req, res) => {
  res.json(devices);
});

app.get('/api/kitchen-stock', (req, res) => {
  res.json(kitchenItems);
});

app.get('/api/automations', (req, res) => {
  res.json(automations);
});

app.get('/api/notifications', (req, res) => {
  res.json(notifications);
});

app.get('/api/platforms', (req, res) => {
  res.json(platforms);
});

app.get('/api/weather', (req, res) => {
  res.json(weatherData);
});

// REST API MUTATIONS WITH LAN INTEGRATION
app.post('/api/devices/toggle', async (req, res) => {
  const { id } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    device.isOn = !device.isOn;
    device.lastActive = 'Şimdi';

    const ip = device.ipAddress;
    const brandLower = device.brand ? device.brand.toLowerCase() : '';
    const hasTapoCredentials = !!(localConfig.tapoEmail && localConfig.tapoPassword);

    if (ip || (brandLower === 'tapo' && hasTapoCredentials)) {
      console.log(`[LAN/Cloud Control] Toggling physical device ${device.name} (Brand: ${device.brand || 'REST'}) to ${device.isOn ? 'ON' : 'OFF'}`);
      
      try {
        if (brandLower === 'tapo') {
          if (hasTapoCredentials) {
            let controlled = false;
            // 1. Try local IP control first if we have an IP
            if (ip) {
              try {
                console.log(`[LAN Tapo] Attempting local IP control at ${ip}...`);
                const session = await loginDeviceByIp(localConfig.tapoEmail, localConfig.tapoPassword, ip);
                if (device.isOn) {
                  await session.turnOn();
                } else {
                  await session.turnOff();
                }
                device.lastActive = 'Şimdi (Tapo Yerel)';
                controlled = true;
                console.log(`[LAN Tapo] Successfully controlled Tapo locally at ${ip}`);
              } catch (err: any) {
                console.warn(`[LAN Tapo Control Warning] Local IP control failed: ${err.message}. Trying Cloud fallback...`);
              }
            }
            
            // 2. Try cloud control fallback if not controlled locally
            if (!controlled) {
              try {
                console.log(`[Cloud Tapo] Attempting cloud control fallback for device ${device.name}...`);
                const cloud = await cloudLogin(localConfig.tapoEmail, localConfig.tapoPassword);
                const cloudDevices = await cloud.listDevices();
                
                // Find device by deviceId or name
                const targetId = device.id.startsWith('tapo-') ? device.id.slice(5) : device.id;
                const cloudDev = cloudDevices.find((cd: any) => cd.deviceId === targetId || cd.alias === device.name);
                
                if (cloudDev) {
                  const devHandler = cloud.getTapoDevice(cloudDev);
                  if (device.isOn) {
                    await devHandler.turnOn();
                  } else {
                    await devHandler.turnOff();
                  }
                  device.lastActive = 'Şimdi (Tapo Bulut)';
                  controlled = true;
                  console.log(`[Cloud Tapo] Successfully controlled Tapo via Cloud`);
                } else {
                  console.warn(`[Cloud Tapo] Device with ID "${targetId}" or name "${device.name}" not found in cloud list.`);
                }
              } catch (err: any) {
                console.error('[Cloud Tapo Fallback Error]:', err.message);
              }
            }
            
            if (!controlled) {
              device.lastActive = 'Şimdi (Yerel/Bulut Başarısız - Sanal Değişti)';
            }
          } else {
            device.lastActive = 'Şimdi (Tapo Şifresi Yok)';
          }
        } else if (brandLower === 'shelly' && ip) {
          const onStr = device.isOn ? 'on' : 'off';
          const onBool = device.isOn;
          try {
            // Shelly Gen 1 REST API
            await fetch(`http://${ip}/relay/0?turn=${onStr}`, { method: 'GET', signal: AbortSignal.timeout(1000) });
            device.lastActive = 'Şimdi (Shelly G1 Yerel)';
          } catch {
            try {
              // Shelly Gen 2 RPC API
              await fetch(`http://${ip}/rpc/Switch.Set?id=0&on=${onBool}`, { method: 'GET', signal: AbortSignal.timeout(1000) });
              device.lastActive = 'Şimdi (Shelly G2 Yerel)';
            } catch (err2: any) {
              console.warn(`[LAN Shelly Control Warning] Shelly failed: ${err2.message}`);
              device.lastActive = 'Şimdi (Yerel Başarısız - Sanal Değişti)';
            }
          }
        } else if (brandLower === 'tasmota' || brandLower === 'sonoff') {
          const cmdStr = device.isOn ? 'ON' : 'OFF';
          try {
            await fetch(`http://${ip}/cm?cmnd=Power%20${cmdStr}`, { method: 'GET', signal: AbortSignal.timeout(1000) });
            device.lastActive = 'Şimdi (Tasmota Yerel)';
          } catch (err: any) {
            console.warn(`[LAN Tasmota Control Warning] Tasmota failed: ${err.message}`);
            device.lastActive = 'Şimdi (Yerel Başarısız - Sanal Değişti)';
          }
        } else if (brandLower === 'xiaomi' && ip) {
          try {
            await fetch(`http://${ip}/api/miio/control?on=${device.isOn}`, { method: 'POST', signal: AbortSignal.timeout(1000) }).catch(() => {});
            device.lastActive = `Şimdi (Xiaomi Yerel ${device.isOn ? 'Açık' : 'Kapalı'})`;
          } catch (err: any) {
            device.lastActive = 'Şimdi (Ağ/IP)';
          }
        } else if (brandLower === 'tuya' && ip) {
          try {
            await fetch(`http://${ip}/tuya/control?turn=${device.isOn ? 'on' : 'off'}`, { method: 'GET', signal: AbortSignal.timeout(1000) }).catch(() => {});
            device.lastActive = `Şimdi (Tuya Yerel ${device.isOn ? 'Açık' : 'Kapalı'})`;
          } catch (err: any) {
            device.lastActive = 'Şimdi (Ağ/IP)';
          }
        } else {
          // Generic local endpoint or REST control (supports Tasmota/WLED/DIY ESP8266 or similar)
          const actionPath = device.isOn ? 'on' : 'off';
          try {
            await fetch(`http://${ip}/${actionPath}`, { method: 'GET', signal: AbortSignal.timeout(1000) });
            device.lastActive = 'Şimdi (REST Yerel)';
          } catch {
            try {
              await fetch(`http://${ip}/toggle`, { method: 'POST', signal: AbortSignal.timeout(1000) });
              device.lastActive = 'Şimdi (REST Toggle Yerel)';
            } catch (err: any) {
              console.log(`[LAN Generic REST Info] Generic REST request completed or failed: ${err.message}`);
              device.lastActive = 'Şimdi (Ağ/IP)';
            }
          }
        }
      } catch (err: any) {
        console.error('[LAN Control Global Error]:', err.message);
      }
    }

    saveState();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

app.post('/api/devices/value', (req, res) => {
  const { id, value } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    device.value = value;
    device.lastActive = 'Şimdi';
    saveState();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

app.post('/api/devices/automation-toggle', (req, res) => {
  const { id } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    device.automationEnabled = !device.automationEnabled;
    saveState();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

app.post('/api/devices/update-room', (req, res) => {
  const { id, room } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    device.room = room || ''; // empty string represents unassigned/removed from room
    saveState();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

// Device Create and Delete Endpoints
app.post('/api/devices', (req, res) => {
  const { name, type, room, isOnline, isOn, value, ipAddress, brand, model } = req.body;
  if (!name || !type || !room) {
    return res.status(400).json({ success: false, error: 'Name, type, and room are required' });
  }

  const isSensor = type.includes('sensor');
  const newDevice: Device = {
    id: `dev-${Date.now()}`,
    name,
    type,
    room,
    isOnline: isOnline !== undefined ? !!isOnline : true,
    isOn: isOn !== undefined ? !!isOn : false,
    lastActive: 'Şimdi (Eklendi)',
    automationEnabled: false,
    value: value !== undefined ? value : (isSensor ? (type === 'temperature_sensor' ? 24 : type === 'humidity_sensor' ? 55 : 'Normal') : (type === 'bulb' || type === 'led_controller' ? 75 : type === 'speaker' ? 40 : undefined)),
    energyConsumption: isSensor ? undefined : 0.01,
    batteryLevel: isSensor || type === 'curtains' ? 100 : undefined,
    ipAddress: ipAddress || undefined,
    brand: brand || undefined,
    model: model || undefined
  };

  devices.push(newDevice);
  saveState();
  res.json({ success: true, device: newDevice });
});

app.delete('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = devices.length;
  devices = devices.filter(d => d.id !== id);
  if (devices.length < initialLen) {
    saveState();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

// Update or Rename Device
app.put('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const { name, room } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    if (name !== undefined) device.name = name;
    if (room !== undefined) device.room = room;
    saveState();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

// Rename Room across all devices
app.post('/api/rooms/rename', (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) {
    return res.status(400).json({ success: false, error: 'oldName and newName are required' });
  }
  devices.forEach(d => {
    if (d.room && d.room.toLowerCase() === oldName.toLowerCase()) {
      d.room = newName;
    }
  });
  saveState();
  res.json({ success: true, devices });
});

// Kitchen Stock CRUD
app.post('/api/kitchen-stock', (req, res) => {
  const { name, category, quantity, isMissing } = req.body;
  const newItem: KitchenItem = {
    id: `kt-${Date.now()}`,
    name,
    category,
    quantity: quantity || undefined,
    isMissing: !!isMissing
  };
  kitchenItems.push(newItem);
  saveState();
  res.json({ success: true, item: newItem });
});

app.put('/api/kitchen-stock/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, isMissing } = req.body;
  const itemIndex = kitchenItems.findIndex(k => k.id === id);
  if (itemIndex !== -1) {
    kitchenItems[itemIndex] = {
      ...kitchenItems[itemIndex],
      name: name !== undefined ? name : kitchenItems[itemIndex].name,
      category: category !== undefined ? category : kitchenItems[itemIndex].category,
      quantity: quantity !== undefined ? quantity : kitchenItems[itemIndex].quantity,
      isMissing: isMissing !== undefined ? isMissing : kitchenItems[itemIndex].isMissing
    };
    saveState();
    res.json({ success: true, item: kitchenItems[itemIndex] });
  } else {
    res.status(404).json({ success: false, error: 'Item not found' });
  }
});

app.delete('/api/kitchen-stock/:id', (req, res) => {
  const { id } = req.params;
  kitchenItems = kitchenItems.filter(k => k.id !== id);
  saveState();
  res.json({ success: true });
});

// Automation CRUD
app.post('/api/automations', (req, res) => {
  const { name, triggerType, triggerCondition, actionDeviceId, actionType, actionValue } = req.body;
  const newAut: Automation = {
    id: `aut-${Date.now()}`,
    name,
    active: true,
    triggerType,
    triggerCondition,
    actionDeviceId,
    actionType,
    actionValue
  };
  automations.push(newAut);
  saveState();
  res.json({ success: true, automation: newAut });
});

app.post('/api/automations/toggle', (req, res) => {
  const { id } = req.body;
  const aut = automations.find(a => a.id === id);
  if (aut) {
    aut.active = !aut.active;
    saveState();
    res.json({ success: true, automation: aut });
  } else {
    res.status(404).json({ success: false, error: 'Automation not found' });
  }
});

app.delete('/api/automations/:id', (req, res) => {
  const { id } = req.params;
  automations = automations.filter(a => a.id !== id);
  saveState();
  res.json({ success: true });
});

// Platform Connections
app.post('/api/platforms/toggle', (req, res) => {
  const { id } = req.body;
  const platform = platforms.find(p => p.id === id);
  if (platform) {
    platform.connected = !platform.connected;
    if (!platform.connected) {
      platform.deviceCount = 0;
    } else {
      // Restore some mock devices
      platform.deviceCount = platform.type === 'google' ? 15 : Math.floor(Math.random() * 8) + 2;
    }
    saveState();
    res.json({ success: true, platform });
  } else {
    res.status(404).json({ success: false, error: 'Platform not found' });
  }
});

// AI Notification triggers / Reset Notifications
app.post('/api/notifications/read', (req, res) => {
  const { id } = req.body;
  if (id === 'all') {
    notifications.forEach(n => n.isRead = true);
  } else {
    const notif = notifications.find(n => n.id === id);
    if (notif) notif.isRead = true;
  }
  saveState();
  res.json({ success: true });
});

// Local Heuristic Parser for high availability fallback
function localHeuristicParser(command: string, currentLanguage: 'tr' | 'en') {
  const cmd = command.toLowerCase().trim();
  let reply = '';
  const deviceUpdates: any[] = [];
  const stockUpdates: any[] = [];

  // Helper to find device by name/room keywords
  const findDeviceByKeyword = (cmdStr: string) => {
    let matchedDevice = devices.find(d => 
      cmdStr.includes(d.name.toLowerCase()) || 
      d.name.toLowerCase().includes(cmdStr) ||
      (d.brand && cmdStr.includes(d.brand.toLowerCase())) ||
      (d.model && cmdStr.includes(d.model.toLowerCase()))
    );
    if (!matchedDevice) {
      const roomsList = ['salon', 'mutfak', 'yatak odası', 'koridor', 'banyo', 'bahçe', 'bedroom', 'living room', 'kitchen', 'corridor', 'bathroom', 'garden'];
      const typesList = [
        { keys: ['lamba', 'ampul', 'ışık', 'projektör', 'led', 'aydınlatma', 'bulb', 'light', 'lamp'], type: 'bulb' },
        { keys: ['kahve', 'priz', 'soket', 'coffee', 'socket', 'plug'], type: 'socket' },
        { keys: ['klima', 'air conditioner', 'ac'], type: 'air_conditioner' },
        { keys: ['süpürge', 'robot', 'vacuum', 'cleaner'], type: 'robot_vacuum' },
        { keys: ['tv', 'televizyon', 'television'], type: 'tv' },
        { keys: ['hoparlör', 'speaker', 'ses', 'sound'], type: 'speaker' },
        { keys: ['perde', 'stor', 'curtains', 'blind'], type: 'curtains' },
        { keys: ['hava', 'temizleyici', 'purifier', 'air purifier'], type: 'air_purifier' },
        { keys: ['vantilatör', 'fan', 'pervane'], type: 'fan' }
      ];

      let foundRoom = roomsList.find(r => cmdStr.includes(r));
      let foundTypeObj = typesList.find(tObj => tObj.keys.some(k => cmdStr.includes(k)));

      // normalise room for comparison
      let searchRoom = foundRoom;
      if (searchRoom === 'living room') searchRoom = 'salon';
      if (searchRoom === 'kitchen') searchRoom = 'mutfak';
      if (searchRoom === 'bedroom') searchRoom = 'yatak odası';
      if (searchRoom === 'corridor') searchRoom = 'koridor';
      if (searchRoom === 'bathroom') searchRoom = 'banyo';
      if (searchRoom === 'garden') searchRoom = 'bahçe';

      if (searchRoom && foundTypeObj) {
        matchedDevice = devices.find(d => d.room.toLowerCase() === searchRoom!.toLowerCase() && d.type === foundTypeObj!.type);
      } else if (foundTypeObj) {
        matchedDevice = devices.find(d => d.type === foundTypeObj!.type);
      }
    }
    return matchedDevice;
  };

  const isTurnOn = cmd.includes('aç') || cmd.includes('çalıştır') || cmd.includes('başlat') || cmd.includes('turn on') || cmd.includes('start') || cmd.includes('aktif et') || cmd.includes('open');
  const isTurnOff = cmd.includes('kapat') || cmd.includes('kapa') || cmd.includes('durdur') || cmd.includes('turn off') || cmd.includes('stop') || cmd.includes('pasif et') || cmd.includes('close');

  const matchedDevice = findDeviceByKeyword(cmd);

  if (matchedDevice && (isTurnOn || isTurnOff)) {
    const targetState = isTurnOn;
    deviceUpdates.push({
      id: matchedDevice.id,
      isOn: targetState
    });
    reply = currentLanguage === 'tr'
      ? `Tabii ki, yerel yedek asistan motoru üzerinden "${matchedDevice.name}" cihazını ${targetState ? 'açtım' : 'kapattım'}.`
      : `Understood, I have turned ${targetState ? 'on' : 'off'} the "${matchedDevice.name}" using the fallback engine.`;
  }
  else if (matchedDevice && (cmd.includes('derece') || cmd.includes('sıcaklık') || cmd.includes('volüm') || cmd.includes('ses') || cmd.includes('temp') || cmd.includes('degree') || cmd.includes('volume') || /\d+/.test(cmd))) {
    const numbers = cmd.match(/\d+/);
    if (numbers) {
      const val = parseInt(numbers[0], 10);
      deviceUpdates.push({
        id: matchedDevice.id,
        isOn: true,
        value: val
      });
      reply = currentLanguage === 'tr'
        ? `Tabii ki, "${matchedDevice.name}" değerini ${val} olarak ayarladım. (Yedek Motor)`
        : `Sure, I have set the "${matchedDevice.name}" value to ${val}. (Fallback Motor)`;
    }
  }
  else if (cmd.includes('ekle') || cmd.includes('add') || cmd.includes('koy') || cmd.includes('alındı')) {
    let productName = '';
    const cleanCmd = cmd.replace(/ekle|add|koy|alındı/g, '').trim();
    const words = cleanCmd.split(' ');
    const filteredWords = words.filter(w => !/\d+/.test(w) && !['adet', 'kg', 'paket', 'gram', 'litre', 'tane', 'pcs', 'bag', 'pack'].includes(w));
    productName = filteredWords.join(' ').trim();
    if (productName.length > 2) {
      productName = productName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const numberMatch = cmd.match(/\d+/);
      const unit = cmd.includes('kg') ? 'Kg' : cmd.includes('paket') || cmd.includes('pack') ? 'Paket' : 'Adet';
      const quantity = numberMatch ? `${numberMatch[0]} ${unit}` : '1 Adet';

      stockUpdates.push({
        action: 'add',
        name: productName,
        quantity: quantity,
        category: 'Atıştırmalık'
      });
      reply = currentLanguage === 'tr'
        ? `Mutfak listesine "${productName}" (${quantity}) başarıyla ekledim.`
        : `Successfully added "${productName}" (${quantity}) to kitchen stock.`;
    }
  }
  else if (cmd.includes('sil') || cmd.includes('çıkar') || cmd.includes('kaldır') || cmd.includes('remove') || cmd.includes('tükendi') || cmd.includes('delete') || cmd.includes('bitti')) {
    let searchName = cmd.replace(/sil|çıkar|kaldır|remove|tükendi|delete|bitti/g, '').trim();
    const matchedStockItem = kitchenItems.find(k => searchName.includes(k.name.toLowerCase()) || k.name.toLowerCase().includes(searchName));
    if (matchedStockItem) {
      stockUpdates.push({
        action: 'remove',
        name: matchedStockItem.name
      });
      reply = currentLanguage === 'tr'
        ? `Mutfak listesinden "${matchedStockItem.name}" ürününü çıkardım.`
        : `Removed "${matchedStockItem.name}" from the kitchen stock list.`;
    } else {
      reply = currentLanguage === 'tr'
        ? `Mutfak stoğunda "${searchName}" adında eşleşen bir ürün bulamadım.`
        : `Could not find any kitchen product matching "${searchName}" to remove.`;
    }
  }
  else {
    reply = currentLanguage === 'tr'
      ? `İsteğinizi tam olarak anlayamadım ancak yardımcı olmaya hazırım. Cihaz kontrolü için "klimayı aç", mutfak için "süt ekle" diyebilirsiniz.`
      : `I couldn't fully parse the request. You can say "turn on AC" or "add milk" to control the smart home features.`;
  }

  return { reply, deviceUpdates, stockUpdates };
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      console.warn(`[Gemini API] Retry attempt ${attempt}/${maxRetries} failed:`, err.message || err);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 600;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

// AI Assistant endpoint: Handle voice (audio) or text command using Gemini!
app.post('/api/ai/command', async (req, res) => {
  const { command, history, language, audio, mimeType } = req.body;

  // We need either a command string or an audio payload to proceed
  if (!command && !audio) {
    return res.status(400).json({ success: false, error: 'Command or audio payload is required' });
  }

  // Detect language properly, prioritize requested UI language, fallback to command heuristics
  let detectedLanguage = language || 'tr';
  if (!language && command) {
    const isTurkishHeuristic = !/[a-zA-Z]/.test(command) || 
      command.toLowerCase().includes('aç') || 
      command.toLowerCase().includes('kapat') || 
      command.toLowerCase().includes('ekle') || 
      command.toLowerCase().includes('sil') ||
      command.toLowerCase().includes('çalıştır') ||
      command.toLowerCase().includes('bitti') ||
      command.toLowerCase().includes('tükendi') ||
      command.toLowerCase().includes('var mı');
    detectedLanguage = isTurkishHeuristic ? 'tr' : 'en';
  }

  const ai = getAi();
  if (!ai) {
    // If no AI client, fallback to local text heuristics (audio cannot be resolved locally)
    if (audio) {
      return res.json({
        success: false,
        reply: detectedLanguage === 'tr' 
          ? 'Mikrofon kaydı alındı ancak çözümlenmesi için yapay zeka servisine bağlanamadım.' 
          : 'Audio recorded but failed to connect to AI for transcription.'
      });
    }

    const parsed = localHeuristicParser(command, detectedLanguage);
    
    // Apply local updates immediately to state
    if (parsed.deviceUpdates && Array.isArray(parsed.deviceUpdates)) {
      parsed.deviceUpdates.forEach((up: any) => {
        const device = devices.find(d => d.id === up.id);
        if (device) {
          if (up.isOn !== undefined) device.isOn = up.isOn;
          if (up.value !== undefined) device.value = up.value;
          device.lastActive = 'Şimdi (Yedek)';
        }
      });
    }

    if (parsed.stockUpdates && Array.isArray(parsed.stockUpdates)) {
      parsed.stockUpdates.forEach((up: any) => {
        const itemIndex = kitchenItems.findIndex(k => 
          k.name.toLowerCase() === up.name.toLowerCase() ||
          k.name.toLowerCase().includes(up.name.toLowerCase()) ||
          up.name.toLowerCase().includes(k.name.toLowerCase())
        );
        if (up.action === 'remove' && itemIndex !== -1) {
          // Fallback simple remove: set isMissing to true
          kitchenItems[itemIndex].isMissing = true;
        } else if (up.action === 'add') {
          if (itemIndex !== -1) {
            if (up.quantity) kitchenItems[itemIndex].quantity = up.quantity;
            kitchenItems[itemIndex].isMissing = false;
          } else {
            kitchenItems.push({
              id: `kt-${Date.now()}-${Math.random()}`,
              name: up.name,
              category: up.category || 'Atıştırmalık',
              isMissing: false,
              quantity: up.quantity || '1 Adet'
            });
          }
        }
      });
    }

    saveState();
    return res.json({
      success: true,
      reply: parsed.reply,
      deviceUpdates: parsed.deviceUpdates,
      stockUpdates: parsed.stockUpdates
    });
  }

  // Inject current system state into context
  const systemContext = `
Sen "SEKRETER" adında akıllı ve son derece kibar bir akıllı ev yapay zeka asistanısın.
Kullanıcı seninle Türkçe veya İngilizce konuşuyor. Dil tercihi şu anda: ${detectedLanguage === 'tr' ? 'Türkçe (Turkish)' : 'İngilizce (English)'}. Lütfen buna uygun dilde yanıt ver.
Eğer dil tercihi Türkçe ise, reply alanı KESİNLİKLE Türkçe olmalıdır. Asla İngilizce yanıt verme!
Eğer dil tercihi İngilizce ise, reply alanı KESİNLİKLE İngilizce olmalıdır. Asla Türkçe yanıt verme!
Sistemin güncel durum verileri aşağıdadır:

AKILLI EV CİHAZLARI:
${JSON.stringify(devices, null, 2)}

MUTFAK ENVANTERİ (KİTCHEN STOCK):
${JSON.stringify(kitchenItems, null, 2)}

AKTİF OTOMASYONLAR:
${JSON.stringify(automations, null, 2)}

HAVA DURUMU: ${JSON.stringify(weatherData)}
GÜNCEL SAAT: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
GÜNCEL TARİH: ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

GÖREVLERİN:
1. Kullanıcının komutunu analiz et. (Eğer ses kaydı gönderildiyse ses kaydını dinleyerek komutu/isteği çöz).
2. Eğer bir cihazı açma, kapatma, derece veya değer ayarlama isteği varsa (örn. "salondaki klimayı 22 derece yap", "klimayı aç", "süpürgeyi çalıştır", "lamba kapat" vb.), bunu anla ve "deviceUpdates" dizisinde belirt. Cihaz ID'si ile eşleşmelidir.
3. Eğer mutfak stoğuna dair bir şey soruyorsa (örn: "süt var mı?", "ekmek eksik mi?") mutfak envanterini incele, doğru bilgiyi ver.
4. Mutfak stoğuna yeni bir şey eklemek ("add"), var olanı güncellemek ("update") veya bir ürünü bitti/tükendi/eksik olarak işaretlemek veya silmek ("remove") isterse "stockUpdates" dizisini kullan. 
   - Örneğin "5 adet yumurta ekle" dendiğinde action: "add", name: "Köy Yumurtası" veya "Yumurta", quantity: "5 Adet" olmalıdır.
   - Örneğin "süt tükendi", "sütü çıkar", "süt bitti" dendiğinde action: "update" veya "remove" ile "isMissing": true olmalıdır.
   - Mutfak kategorileri şunlardan biri olmalıdır: 'Temizlik', 'Bakliyat', 'İçecek', 'Kahvaltılık', 'Et', 'Sebze', 'Meyve', 'Dondurulmuş', 'Atıştırmalık'.
5. Kullanıcıya sesli asistan gibi sıcak, kibar, samimi ve net bir dille yanıt ("reply") ver.

SADECE VE SADECE aşağıdaki JSON şemasına uygun çıktı üret. Çıktı geçerli bir JSON olmalıdır:
{
  "reply": "Kullanıcıya söylenecek doğal cevap metni",
  "deviceUpdates": [
    { "id": "değişecek cihaz ID'si", "isOn": true/false (isteğe bağlı), "value": "yeni değeri örn. 22 veya 'Şarj Oluyor' (isteğe bağlı)" }
  ],
  "stockUpdates": [
    { "action": "add" | "remove" | "update", "name": "ürün adı", "quantity": "miktar örn. 5 Adet veya 2 Kg (isteğe bağlı)", "category": "Kategori (isteğe bağlı)", "isMissing": true/false (isteğe bağlı) }
  ]
}
  `;

  try {
    let contentsPayload: any;

    if (audio) {
      contentsPayload = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audio
              }
            },
            {
              text: `Kullanıcının bu ses kaydındaki komutunu veya sorusunu dinle ve anla. Onu en uygun şekilde akıllı ev asistanı olarak cevapla. ${detectedLanguage === 'tr' ? 'Lütfen Türkçe cevap ver.' : 'Please answer in English.'} Lütfen sadece belirtilen JSON formatında yanıt ver.`
            }
          ]
        }
      ];
    } else {
      const formattedHistory = (history || []).slice(-6).map((h: any) => {
        return `${h.role === 'user' ? 'Kullanıcı' : 'Sekreter'}: ${h.text}`;
      }).join('\n');

      const prompt = `
Sistem Durumları ve Kurallar:
- Dil Tercihi: ${detectedLanguage === 'tr' ? 'Türkçe (TR)' : 'İngilizce (EN)'}
- Lütfen kesinlikle ${detectedLanguage === 'tr' ? 'TÜRKÇE' : 'ENGLISH'} dilinde yanıt ver. Asla İngilizce kelimelerle karışık Türkçe veya Türkçe kelimelerle karışık İngilizce cevap verme.

Konuşma Geçmişi:
${formattedHistory}

Kullanıcının Son Komutu: "${command}"

Lütfen JSON formatında yanıt ver.`;
      contentsPayload = prompt;
    }

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.5-flash',
      contents: contentsPayload,
      config: {
        systemInstruction: systemContext,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Kullanıcıya söylenecek sıcak ve kibar doğal cevap metni (dil tercihine göre Türkçe veya İngilizce).'
            },
            deviceUpdates: {
              type: Type.ARRAY,
              description: 'Güncellenmesi gereken akıllı ev cihazlarının listesi',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Cihaz IDsi' },
                  isOn: { type: Type.BOOLEAN, description: 'Cihazın açık/kapalı durumu' },
                  value: { type: Type.STRING, description: 'Cihazın yeni değeri (sıcaklık, parlaklık, vb.)' }
                },
                required: ['id']
              }
            },
            stockUpdates: {
              type: Type.ARRAY,
              description: 'Güncellenmesi veya eklenmesi/silinmesi gereken mutfak stoklarının listesi',
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: 'Yapılacak eylem: "add", "remove" veya "update"' },
                  name: { type: Type.STRING, description: 'Ürün adı' },
                  quantity: { type: Type.STRING, description: 'Miktar veya birim bilgisi' },
                  category: { type: Type.STRING, description: 'Ürün kategorisi' },
                  isMissing: { type: Type.BOOLEAN, description: 'Eğer ürün tükendiyse/eksikse true' }
                },
                required: ['action', 'name']
              }
            }
          },
          required: ['reply']
        },
        temperature: 0.7
      }
    });

    const resultText = response && response.text ? response.text : '{}';
    const parsed = JSON.parse(resultText.trim());

    // Apply device updates in-memory
    if (parsed.deviceUpdates && Array.isArray(parsed.deviceUpdates)) {
      parsed.deviceUpdates.forEach((up: any) => {
        const device = devices.find(d => d.id === up.id);
        if (device) {
          if (up.isOn !== undefined) device.isOn = up.isOn;
          if (up.value !== undefined) device.value = up.value;
          device.lastActive = 'Şimdi (AI ile)';
          
          // Generate notification
          notifications.unshift({
            id: `nt-${Date.now()}-${Math.random()}`,
            title: 'AI Cihaz Kontrolü',
            message: `"${device.name}" cihazı Sekreter tarafından güncellendi: ${device.isOn ? 'Açık' : 'Kapalı'} ${device.value ? `(${device.value})` : ''}`,
            type: 'info',
            timestamp: 'Az Önce',
            isRead: false
          });
        }
      });
    }

    // Apply stock updates in-memory
    if (parsed.stockUpdates && Array.isArray(parsed.stockUpdates)) {
      parsed.stockUpdates.forEach((up: any) => {
        const itemIndex = kitchenItems.findIndex(k => 
          k.name.toLowerCase() === up.name.toLowerCase() || 
          k.name.toLowerCase().includes(up.name.toLowerCase()) || 
          up.name.toLowerCase().includes(k.name.toLowerCase())
        );

        if (up.action === 'remove' || up.isMissing === true) {
          if (itemIndex !== -1) {
            // Mark missing instead of deletion, so it stays on the shopping list!
            kitchenItems[itemIndex].isMissing = true;
          }
        } else if (up.action === 'add' || up.action === 'update') {
          if (itemIndex !== -1) {
            if (up.quantity !== undefined && up.quantity !== null) {
              kitchenItems[itemIndex].quantity = up.quantity;
            } else if (!kitchenItems[itemIndex].quantity) {
              kitchenItems[itemIndex].quantity = '1 Adet';
            }
            if (up.category) {
              kitchenItems[itemIndex].category = up.category;
            }
            kitchenItems[itemIndex].isMissing = false;
          } else {
            kitchenItems.push({
              id: `kt-${Date.now()}-${Math.random()}`,
              name: up.name,
              category: up.category || 'Atıştırmalık',
              isMissing: false,
              quantity: up.quantity || '1 Adet'
            });
          }
        } else {
          // Fallback support
          if (itemIndex !== -1) {
            if (up.isMissing !== undefined) {
              kitchenItems[itemIndex].isMissing = up.isMissing;
              if (up.isMissing) {
                kitchenItems[itemIndex].quantity = undefined;
              }
            }
          } else if (up.isMissing) {
            kitchenItems.push({
              id: `kt-${Date.now()}-${Math.random()}`,
              name: up.name,
              category: up.category || 'Atıştırmalık',
              isMissing: true
            });
          }
        }
      });
    }

    saveState();
    res.json({
      success: true,
      reply: parsed.reply,
      deviceUpdates: parsed.deviceUpdates || [],
      stockUpdates: parsed.stockUpdates || []
    });

  } catch (error: any) {
    console.error('Gemini API Error (Initiating fallback):', error);
    if (audio) {
      return res.json({
        success: false,
        reply: detectedLanguage === 'tr'
          ? 'Ses kaydı işlenirken hata oluştu. Lütfen yazarak deneyin.'
          : 'An error occurred while processing the audio. Please try typing.'
      });
    }

    // Silent failover to Local Heuristic Parser!
    const fallbackParsed = localHeuristicParser(command, detectedLanguage);
    
    // Apply local updates immediately to state
    if (fallbackParsed.deviceUpdates && Array.isArray(fallbackParsed.deviceUpdates)) {
      fallbackParsed.deviceUpdates.forEach((up: any) => {
        const device = devices.find(d => d.id === up.id);
        if (device) {
          if (up.isOn !== undefined) device.isOn = up.isOn;
          if (up.value !== undefined) device.value = up.value;
          device.lastActive = 'Şimdi (Yedek)';
        }
      });
    }

    if (fallbackParsed.stockUpdates && Array.isArray(fallbackParsed.stockUpdates)) {
      fallbackParsed.stockUpdates.forEach((up: any) => {
        const itemIndex = kitchenItems.findIndex(k => 
          k.name.toLowerCase() === up.name.toLowerCase() ||
          k.name.toLowerCase().includes(up.name.toLowerCase()) ||
          up.name.toLowerCase().includes(k.name.toLowerCase())
        );
        if (up.action === 'remove') {
          if (itemIndex !== -1) {
            kitchenItems[itemIndex].isMissing = true;
          }
        } else if (up.action === 'add') {
          if (itemIndex !== -1) {
            if (up.quantity) kitchenItems[itemIndex].quantity = up.quantity;
            kitchenItems[itemIndex].isMissing = false;
          } else {
            kitchenItems.push({
              id: `kt-${Date.now()}-${Math.random()}`,
              name: up.name,
              category: up.category || 'Atıştırmalık',
              isMissing: false,
              quantity: up.quantity || '1 Adet'
            });
          }
        }
      });
    }

    saveState();
    res.json({
      success: true,
      reply: fallbackParsed.reply,
      deviceUpdates: fallbackParsed.deviceUpdates,
      stockUpdates: fallbackParsed.stockUpdates
    });
  }
});

// Local Network Integration REST API Endpoints
app.get('/api/local-lan/config', (req, res) => {
  res.json({
    tapoEmail: localConfig.tapoEmail,
    tapoPassword: localConfig.tapoPassword ? '••••••••' : '',
    pingTimeoutMs: localConfig.pingTimeoutMs,
    connected: localConfig.connected
  });
});

app.post('/api/local-lan/config', (req, res) => {
  const { tapoEmail, tapoPassword, pingTimeoutMs, connected } = req.body;
  
  if (tapoEmail !== undefined) localConfig.tapoEmail = tapoEmail;
  if (tapoPassword !== undefined && !tapoPassword.includes('••••')) {
    localConfig.tapoPassword = tapoPassword;
  }
  if (pingTimeoutMs !== undefined) localConfig.pingTimeoutMs = pingTimeoutMs;
  if (connected !== undefined) {
    localConfig.connected = connected;
    const platform = platforms.find(p => p.type === 'local');
    if (platform) {
      platform.connected = connected;
    }
  }
  
  saveState();
  res.json({
    success: true,
    config: {
      tapoEmail: localConfig.tapoEmail,
      tapoPassword: localConfig.tapoPassword ? '••••••••' : '',
      pingTimeoutMs: localConfig.pingTimeoutMs,
      connected: localConfig.connected
    }
  });
});

app.post('/api/local-lan/scan', async (req, res) => {
  const presenceResult = await runLocalPresenceCheck();
  let cloudLog = '';
  
  if (localConfig.tapoEmail && localConfig.tapoPassword) {
    try {
      console.log(`[Tapo Cloud Sync] Logging in for ${localConfig.tapoEmail}...`);
      const cloud = await cloudLogin(localConfig.tapoEmail, localConfig.tapoPassword);
      const cloudDevices = await cloud.listDevices();
      console.log(`[Tapo Cloud Sync] Found ${cloudDevices.length} devices in Tapo cloud.`);
      
      let newCount = 0;
      let updatedCount = 0;
      
      for (const cd of cloudDevices) {
        const id = `tapo-${cd.deviceId}`;
        let existing = devices.find(d => d.id === id || (d.brand === 'Tapo' && d.name === cd.alias));
        
        let type: DeviceType = 'socket';
        const modelLower = (cd.deviceModel || '').toLowerCase();
        const typeLower = (cd.deviceType || '').toLowerCase();
        if (modelLower.startsWith('l') || typeLower.includes('bulb') || typeLower.includes('light')) {
          type = 'bulb';
        } else if (modelLower.startsWith('p') || typeLower.includes('plug') || typeLower.includes('switch')) {
          type = 'socket';
        } else if (typeLower.includes('camera')) {
          type = 'camera';
        } else if (typeLower.includes('hub')) {
          type = 'speaker';
        }
        
        const ipAddress = cd.ip || undefined;
        let isOn = cd.status === 1; // Default/fallback state
        
        // If device has an IP and we have credentials, try to query exact state
        if (ipAddress) {
          try {
            console.log(`[Tapo Sync Poll] Fetching real-time state for ${cd.alias || cd.deviceName} at ${ipAddress}...`);
            const session = await loginDeviceByIp(localConfig.tapoEmail, localConfig.tapoPassword, ipAddress);
            const info = await session.getDeviceInfo();
            isOn = info.device_on;
          } catch (err: any) {
            console.warn(`[Tapo Sync Poll Warning] Local status handshake failed, falling back to cloud status: ${err.message}`);
          }
        }
        
        if (existing) {
          existing.id = id; // Ensure consistent ID
          if (ipAddress && !existing.ipAddress) {
            existing.ipAddress = ipAddress;
          }
          existing.brand = 'Tapo';
          existing.model = cd.deviceModel;
          existing.isOnline = cd.status === 1;
          existing.isOn = isOn;
          updatedCount++;
        } else {
          devices.push({
            id,
            name: cd.alias || cd.deviceName || 'Tapo Cihazı',
            type,
            room: 'Salon',
            isOnline: cd.status === 1,
            isOn: isOn,
            lastActive: 'Tapo Buluttan Senkronize Edildi',
            automationEnabled: false,
            brand: 'Tapo',
            model: cd.deviceModel,
            ipAddress: ipAddress
          });
          newCount++;
        }
      }
      
      if (newCount > 0 || updatedCount > 0) {
        saveState();
      }
      
      cloudLog = `Tapo Bulut hesabınızdan ${cloudDevices.length} cihaz tespit edildi (${newCount} yeni cihaz eklendi, ${updatedCount} cihaz güncellendi).`;
    } catch (err: any) {
      console.error('[Tapo Cloud Sync Error]:', err);
      cloudLog = `Tapo Bulut eşitleme hatası: ${err.message || err}`;
    }
  } else {
    cloudLog = 'Tapo e-posta ve şifreniz girilmediği için bulut senkronizasyonu atlandı.';
  }
  
  res.json({
    success: true,
    deviceCount: presenceResult.deviceCount,
    log: `${presenceResult.log}\n\n[Tapo Bulut]: ${cloudLog}`
  });
});

// Free/Smart Text-based Import for Local LAN IP-based devices!
app.post('/api/local-lan/import-text', async (req, res) => {
  const { text, language } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Text content is required' });
  }

  const currentLanguage = language || 'tr';
  const ai = getAi();
  let importedDevices: Device[] = [];

  if (!ai) {
    // Fallback heuristic parser for offline compatibility or when API key is missing
    const lines = text.split(/[\n;]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 2);
    lines.forEach((line: string, idx: number) => {
      const lower = line.toLowerCase();
      let type: DeviceType = 'bulb';
      let room = 'Salon';
      let brand: string | undefined = undefined;
      let ipAddress: string | undefined = undefined;

      // Extract IP address if present
      const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        ipAddress = ipMatch[1];
      }

      if (lower.includes('mutfak') || lower.includes('kitchen')) room = 'Mutfak';
      else if (lower.includes('yatak') || lower.includes('bedroom')) room = 'Yatak Odası';
      else if (lower.includes('banyo') || lower.includes('bath')) room = 'Banyo';
      else if (lower.includes('bahçe') || lower.includes('garden')) room = 'Bahçe';
      else if (lower.includes('koridor') || lower.includes('hall')) room = 'Koridor';

      if (lower.includes('tapo')) brand = 'Tapo';
      else if (lower.includes('shelly')) brand = 'Shelly';
      else if (lower.includes('tasmota') || lower.includes('sonoff')) brand = 'Tasmota';
      else if (lower.includes('xiaomi') || lower.includes('miji') || lower.includes('roborock')) brand = 'Xiaomi';
      else if (lower.includes('tuya') || lower.includes('smartlife')) brand = 'Tuya';

      if (lower.includes('priz') || lower.includes('soket') || lower.includes('plug')) type = 'socket';
      else if (lower.includes('klima') || lower.includes('ac') || lower.includes('air cond')) type = 'air_conditioner';
      else if (lower.includes('led') || lower.includes('şerit')) type = 'led_controller';
      else if (lower.includes('süpürge') || lower.includes('vacuum') || lower.includes('robot')) type = 'robot_vacuum';
      else if (lower.includes('tv') || lower.includes('televizyon')) type = 'tv';
      else if (lower.includes('hoparlör') || lower.includes('speaker') || lower.includes('ses')) type = 'speaker';
      else if (lower.includes('perde') || lower.includes('stor') || lower.includes('curtain')) type = 'curtains';
      else if (lower.includes('temizleyici') || lower.includes('purifier')) type = 'air_purifier';
      else if (lower.includes('fan') || lower.includes('vantilatör')) type = 'fan';
      else if (lower.includes('kamera') || lower.includes('camera')) type = 'camera';
      else if (lower.includes('kapı') || lower.includes('pencere') || lower.includes('sensör') || lower.includes('sensor')) type = 'door_sensor';

      const isSensor = type.includes('sensor');
      importedDevices.push({
        id: `imported-${Date.now()}-${idx}`,
        name: line.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/, '').replace(/(tapo|shelly|tasmota|sonoff|xiaomi|tuya|smartlife|miji)/gi, '').replace(/[,;\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim() || 'Akıllı Cihaz',
        type,
        room,
        isOnline: true,
        isOn: false,
        lastActive: 'Metinden Aktarıldı',
        automationEnabled: false,
        value: isSensor ? ((type as string) === 'temperature_sensor' ? 24 : (type as string) === 'humidity_sensor' ? 55 : 'Kapalı') : (type === 'bulb' ? 75 : undefined),
        brand: brand,
        ipAddress: ipAddress
      });
    });

    devices.push(...importedDevices);
    saveState();
    return res.json({
      success: true,
      importedCount: importedDevices.length,
      devices: importedDevices,
      log: `${importedDevices.length} adet cihaz yerel analiz yöntemiyle başarıyla eklenmiştir!`
    });
  }

  try {
    const prompt = `
      Sen akıllı ev asistanı entegrasyon arayüzüsün. Kullanıcı yerel ağındaki (LAN) akıllı cihazların listesini, IP adreslerini veya el yazısı metnini gönderdi.
      Kullanıcı metni: ${JSON.stringify(text)}
      
      Görevin:
      Bu metindeki tüm akıllı ev cihazlarını tespit et. Her birini geçerli birer "Device" nesnesi olarak ayrıştır.
      Cihaz türü ("type") KESİNLİKLE şu değerlerden biri olmalıdır:
      'socket' (priz, anahtar), 'bulb' (lamba, ampul, projektör), 'led_controller' (led şeritler), 'air_purifier' (hava temizleyici), 'robot_vacuum' (robot süpürge), 'air_conditioner' (klima), 'fan' (vantilatör, fan), 'door_sensor' (kapı, pencere sensörü), 'water_sensor' (su sensörü), 'humidity_sensor' (nem sensörü), 'temperature_sensor' (sıcaklık sensörü), 'curtains' (perde, stor), 'camera' (kamera), 'tv' (televizyon), 'speaker' (hoparlör, ses sistemi).
      
      Metinde geçen IP adreslerini (örn: 192.168.1.200) doğru bir şekilde tespit edip "ipAddress" alanına ata.
      Her cihaz için oda ismini ("room") türkçe olarak belirle (örn: 'Salon', 'Mutfak', 'Yatak Odası', 'Koridor', 'Banyo', 'Bahçe'). Eğer bulunamazsa 'Salon' yap.
      Markaları (Tapo, Xiaomi, Tuya, Shelly, Tasmota, Sonoff vb.) ve modelleri algıla.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            devices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  room: { type: Type.STRING },
                  ipAddress: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  model: { type: Type.STRING }
                },
                required: ["name", "type"]
              }
            }
          },
          required: ["devices"]
        }
      }
    });

    const textResult = response.text || '{"devices":[]}';
    const parsed = JSON.parse(textResult);
    const rawList = parsed.devices || [];

    rawList.forEach((rawDev: any, idx: number) => {
      const type = rawDev.type || 'bulb';
      const isSensor = type.includes('sensor');
      const newDev: Device = {
        id: `imported-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        name: rawDev.name || 'Bilinmeyen Cihaz',
        type: type,
        room: rawDev.room || 'Salon',
        isOnline: true,
        isOn: false,
        lastActive: 'LAN Metin Aktarımı',
        automationEnabled: false,
        value: isSensor ? (type === 'temperature_sensor' ? 24 : type === 'humidity_sensor' ? 55 : 'Kapalı') : (type === 'bulb' ? 75 : undefined),
        brand: rawDev.brand || undefined,
        model: rawDev.model || undefined,
        ipAddress: rawDev.ipAddress || undefined
      };
      importedDevices.push(newDev);
    });

    if (importedDevices.length > 0) {
      devices.push(...importedDevices);
      saveState();
    }

    res.json({
      success: true,
      importedCount: importedDevices.length,
      devices: importedDevices,
      log: `${importedDevices.length} adet yerel IP cihazı başarıyla çözümlenip sisteme dahil edilmiştir!`
    });

  } catch (err: any) {
    console.error('[Import Text Error]:', err);
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/local-lan/command', async (req, res) => {
  const { command, language } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Command text is required' });
  }
  
  const currentLanguage = language || 'tr';
  const ai = getAi();
  
  if (!ai) {
    const parsed = localHeuristicParser(command, currentLanguage);
    if (parsed.deviceUpdates) {
      parsed.deviceUpdates.forEach((up: any) => {
        const d = devices.find(x => x.id === up.id);
        if (d) {
          if (up.isOn !== undefined) d.isOn = up.isOn;
          if (up.value !== undefined) d.value = up.value;
          d.lastActive = 'Şimdi (Sesle)';
        }
      });
    }
    saveState();
    return res.json({ success: true, reply: parsed.reply, deviceUpdates: parsed.deviceUpdates });
  }
  
  try {
    const prompt = `
      Sen Yerel Ağ Akıllı Ev Asistanı'sın. Kullanıcı yerel ağındaki (LAN) akıllı cihazları senin üzerinden kontrol ediyor.
      Şu anda kullanıcının evindeki cihazlar: ${JSON.stringify(devices, null, 2)}.
      Kullanıcının gönderdiği komut: ${JSON.stringify(command)}.
      Dil: ${currentLanguage === 'tr' ? 'Türkçe' : 'İngilizce'}.
      
      Eğer komut bir cihazı açma, kapatma veya değer ayarlamaya yönelikse bunu anla ve JSON olarak çıktı ver.
      Cevap formatın sadece şu JSON olmalıdır:
      {
        "reply": "Kullanıcıya söylenecek onay metni (örn: 'Tabii, Salon Akıllı Ampulünü açıyorum')",
        "deviceUpdates": [
          { "id": "cihaz_id_si", "isOn": true/false, "value": "varsa yeni değeri" }
        ]
      }
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    const text = response.text || '{}';
    const parsed = JSON.parse(cleanJsonString(text));
    
    if (parsed.deviceUpdates && Array.isArray(parsed.deviceUpdates)) {
      parsed.deviceUpdates.forEach((up: any) => {
        const d = devices.find(x => x.id === up.id);
        if (d) {
          if (up.isOn !== undefined) d.isOn = up.isOn;
          if (up.value !== undefined) d.value = up.value;
          d.lastActive = 'Şimdi (Sesle)';
        }
      });
      saveState();
    }
    
    res.json({ success: true, reply: parsed.reply, deviceUpdates: parsed.deviceUpdates });
  } catch (err: any) {
    console.error('[LAN Assistant Command Error]:', err);
    res.json({ success: false, error: err.message });
  }
});

// Vite middleware and Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Home Express Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
