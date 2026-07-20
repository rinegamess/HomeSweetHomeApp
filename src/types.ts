export type DeviceType =
  | 'socket'
  | 'bulb'
  | 'led_controller'
  | 'air_purifier'
  | 'robot_vacuum'
  | 'air_conditioner'
  | 'fan'
  | 'door_sensor'
  | 'water_sensor'
  | 'humidity_sensor'
  | 'temperature_sensor'
  | 'curtains'
  | 'camera'
  | 'tv'
  | 'speaker';

export type RoomType = string;

export interface CustomRoom {
  name: string;
  bg: 'indigo' | 'amber' | 'purple' | 'sky' | 'emerald' | 'teal' | 'rose' | 'default';
  icon: 'Home' | 'Sofa' | 'Bed' | 'ChefHat' | 'Trees' | 'Tv' | 'Bath' | 'Music' | 'Coffee' | 'Film';
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  room: RoomType;
  isOnline: boolean;
  isOn: boolean;
  batteryLevel?: number; // percentage, e.g. for sensors
  energyConsumption?: number; // in kWh
  lastActive: string;
  automationEnabled: boolean;
  value?: string | number; // e.g. brightness 70%, temperature 22
  ipAddress?: string; // e.g. "192.168.1.45"
  brand?: string;     // e.g. "Tapo", "Tuya"
  model?: string;     // e.g. "P100"
  temperature?: number; // temperature read from air purifiers/sensors
  humidity?: number;    // humidity read from air purifiers/sensors
  airQualityIndex?: number; // AQI/PM2.5 value for air purifiers
}

export type KitchenCategory =
  | 'Temizlik'
  | 'Bakliyat'
  | 'İçecek'
  | 'Kahvaltılık'
  | 'Et'
  | 'Sebze'
  | 'Meyve'
  | 'Dondurulmuş'
  | 'Atıştırmalık';

export interface KitchenItem {
  id: string;
  name: string;
  category: KitchenCategory;
  isMissing: boolean;
  quantity?: string; // Optional quantity
}

export interface Automation {
  id: string;
  name: string;
  active: boolean;
  triggerType: 'time' | 'sensor_temp' | 'sensor_humidity' | 'sensor_door' | 'schedule';
  triggerCondition: string; // e.g. "22:00", "> 25", "open"
  actionDeviceId: string;
  actionType: 'turn_on' | 'turn_off' | 'set_value';
  actionValue?: string | number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alarm';
  timestamp: string;
  isRead: boolean;
  isVoice?: boolean;
}

export interface PlatformConnection {
  id: string;
  name: string;
  connected: boolean;
  type: 'tuya' | 'smartlife' | 'xiaomi' | 'homeassistant' | 'shelly' | 'esphome' | 'matter' | 'google' | 'alexa' | 'mqtt' | 'rest' | 'local';
  deviceCount: number;
}
