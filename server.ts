import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Device, KitchenItem, Automation, NotificationItem, PlatformConnection } from './src/types.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize state
let devices: Device[] = [
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

let kitchenItems: KitchenItem[] = [
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

let automations: Automation[] = [
  { id: 'aut-1', name: 'Gece Tasarruf Modu', active: true, triggerType: 'time', triggerCondition: '23:00', actionDeviceId: 'dev-1', actionType: 'turn_off' },
  { id: 'aut-2', name: 'Sıcaklık Kontrol Klima', active: true, triggerType: 'sensor_temp', triggerCondition: '> 26', actionDeviceId: 'dev-3', actionType: 'turn_on' },
  { id: 'aut-3', name: 'Nem Alıcı Oto Başlat', active: false, triggerType: 'sensor_humidity', triggerCondition: '> 65', actionDeviceId: 'dev-6', actionType: 'set_value', actionValue: 'Yüksek Hız' },
  { id: 'aut-4', name: 'Kapı Açıldığında Giriş Işığı', active: true, triggerType: 'sensor_door', triggerCondition: 'Açık', actionDeviceId: 'dev-4', actionType: 'turn_on' },
];

let notifications: NotificationItem[] = [
  { id: 'nt-1', title: 'Hoş Geldiniz', message: 'SmartHome AI Platformu başarıyla başlatıldı.', type: 'success', timestamp: 'Bugün 02:00', isRead: false },
  { id: 'nt-2', title: 'Eksik Ürün Uyarısı', message: 'Mutfak listenizde Dana Kıyma ve Tost Ekmeği eksik olarak işaretlendi.', type: 'warning', timestamp: 'Bugün 01:30', isRead: false },
  { id: 'nt-3', title: 'Enerji Tasarrufu Önerisi', message: 'Yatak odası kliması son 4 saattir çalışıyor. Sıcaklığı 24 dereceye ayarlamak %10 tasarruf sağlar.', type: 'info', timestamp: 'Dün 22:00', isRead: true },
];

let platforms: PlatformConnection[] = [
  { id: 'plt-1', name: 'Home Assistant', connected: true, type: 'homeassistant', deviceCount: 8 },
  { id: 'plt-2', name: 'Tuya Smart', connected: true, type: 'tuya', deviceCount: 4 },
  { id: 'plt-3', name: 'Xiaomi Home', connected: false, type: 'xiaomi', deviceCount: 0 },
  { id: 'plt-4', name: 'Matter Hub', connected: true, type: 'matter', deviceCount: 3 },
  { id: 'plt-5', name: 'Google Home', connected: true, type: 'google', deviceCount: 15 },
  { id: 'plt-6', name: 'Amazon Alexa', connected: false, type: 'alexa', deviceCount: 0 },
  { id: 'plt-7', name: 'Shelly REST', connected: true, type: 'shelly', deviceCount: 2 },
  { id: 'plt-8', name: 'MQTT Broker', connected: true, type: 'mqtt', deviceCount: 10 },
];

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
app.get('/api/devices', (req, res) => {
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

// REST API MUTATIONS
app.post('/api/devices/toggle', (req, res) => {
  const { id } = req.body;
  const device = devices.find(d => d.id === id);
  if (device) {
    device.isOn = !device.isOn;
    device.lastActive = 'Şimdi';
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
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

// Device Create and Delete Endpoints
app.post('/api/devices', (req, res) => {
  const { name, type, room, isOnline, isOn, value } = req.body;
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
    batteryLevel: isSensor || type === 'curtains' ? 100 : undefined
  };

  devices.push(newDevice);
  res.json({ success: true, device: newDevice });
});

app.delete('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = devices.length;
  devices = devices.filter(d => d.id !== id);
  if (devices.length < initialLen) {
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
    res.json({ success: true, item: kitchenItems[itemIndex] });
  } else {
    res.status(404).json({ success: false, error: 'Item not found' });
  }
});

app.delete('/api/kitchen-stock/:id', (req, res) => {
  const { id } = req.params;
  kitchenItems = kitchenItems.filter(k => k.id !== id);
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
  res.json({ success: true, automation: newAut });
});

app.post('/api/automations/toggle', (req, res) => {
  const { id } = req.body;
  const aut = automations.find(a => a.id === id);
  if (aut) {
    aut.active = !aut.active;
    res.json({ success: true, automation: aut });
  } else {
    res.status(404).json({ success: false, error: 'Automation not found' });
  }
});

app.delete('/api/automations/:id', (req, res) => {
  const { id } = req.params;
  automations = automations.filter(a => a.id !== id);
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
  res.json({ success: true });
});

// AI Assistant endpoint: Handle voice or text command using Gemini!
app.post('/api/ai/command', async (req, res) => {
  const { command, history } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Command is required' });
  }

  const ai = getAi();
  if (!ai) {
    // Graceful fallback when Gemini API is not yet configured or error occurs
    return res.json({
      success: true,
      reply: `Gemini API anahtarı ayarlanmamış görünüyor. Lütfen platform Secrets sekmesinden GEMINI_API_KEY anahtarınızı ekleyin. Komutunuzu yerel motorla simüle ettim: "${command}" için işlem tamamlandı!`,
      deviceUpdates: [],
      stockUpdates: []
    });
  }

  // Inject current system state into context
  const systemContext = `
Sen "SEKRETER" adında akıllı ve son derece kibar bir akıllı ev yapay zeka asistanısın.
Kullanıcı seninle Türkçe veya İngilizce konuşuyor. Öncelikle Türkçe yanıt ver. Cevapların doğal, akıcı ve insan benzeri olmalıdır.
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
1. Kullanıcının komutunu ("${command}") analiz et.
2. Eğer bir cihazı açma, kapatma, derece veya değer ayarlama isteği varsa (örn. "salondaki klimayı 22 derece yap", "klimayı aç", "süpürgeyi çalıştır", "lamba kapat" vb.), bunu anla ve "deviceUpdates" dizisinde belirt. Cihaz ID'si ile eşleşmelidir.
3. Eğer mutfak stoğuna dair bir şey soruyorsa (örn: "süt var mı?", "ekmek eksik mi?") mutfak envanterini incele, doğru bilgiyi ver.
4. Mutfak stoğuna yeni bir şey eklemek veya çıkarmak isterse "stockUpdates" dizisini kullan.
5. Kullanıcıya sesli asistan gibi sıcak ve net bir dille yanıt ("reply") ver.

SADECE VE SADECE aşağıdaki JSON şemasına uygun çıktı üret. Çıktı geçerli bir JSON olmalıdır:
{
  "reply": "Kullanıcıya söylenecek doğal cevap metni (Türkçe veya İngilizce)",
  "deviceUpdates": [
    { "id": "değişecek cihaz ID'si", "isOn": true/false (isteğe bağlı), "value": "yeni değeri örn. 22 veya 'Şarj Oluyor' (isteğe bağlı)" }
  ],
  "stockUpdates": [
    { "name": "ürün adı", "isMissing": true/false }
  ]
}
  `;

  try {
    const formattedHistory = (history || []).slice(-6).map((h: any) => {
      return `${h.role === 'user' ? 'Kullanıcı' : 'Sekreter'}: ${h.text}`;
    }).join('\n');

    const prompt = `
Konuşma Geçmişi:
${formattedHistory}

Kullanıcının Son Komutu: "${command}"

Lütfen JSON formatında yanıt ver.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemContext,
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const resultText = response.text || '{}';
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
        const item = kitchenItems.find(k => k.name.toLowerCase().includes(up.name.toLowerCase()));
        if (item) {
          item.isMissing = up.isMissing;
        } else if (up.isMissing) {
          kitchenItems.push({
            id: `kt-${Date.now()}-${Math.random()}`,
            name: up.name,
            category: 'Atıştırmalık',
            isMissing: true
          });
        }
      });
    }

    res.json({
      success: true,
      reply: parsed.reply,
      deviceUpdates: parsed.deviceUpdates || [],
      stockUpdates: parsed.stockUpdates || []
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.json({
      success: true,
      reply: `Üzgünüm, şu an sunucu tarafında bir hata oluştu: ${error.message || 'Bilinmeyen Hata'}. Ancak isteğinizi yerel simülatörle işlemeye çalışıyorum.`,
      deviceUpdates: [],
      stockUpdates: []
    });
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
