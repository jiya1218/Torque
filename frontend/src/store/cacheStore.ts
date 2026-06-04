import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheState {
  cache: Record<string, any>;
  setCache: (key: string, data: any) => Promise<void>;
  loadCache: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  cache: {},
  setCache: async (key, data) => {
    const newCache = { ...get().cache, [key]: data };
    set({ cache: newCache });
    try {
      await AsyncStorage.setItem('@app_cache', JSON.stringify(newCache));
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  },
  loadCache: async () => {
    try {
      const val = await AsyncStorage.getItem('@app_cache');
      if (val) {
        set({ cache: JSON.parse(val) });
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }
  },
  clearCache: async () => {
    set({ cache: {} });
    try {
      await AsyncStorage.removeItem('@app_cache');
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }
  }
}));
