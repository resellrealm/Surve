// Supabase client placeholder — will be configured when backend is set up
// For now, the app uses mock data from mockData.ts

// import { createClient } from '@supabase/supabase-js';
// import * as SecureStore from 'expo-secure-store';
// import { Platform } from 'react-native';
//
// const ExpoSecureStoreAdapter = {
//   getItem: (key: string) => SecureStore.getItemAsync(key),
//   setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
//   removeItem: (key: string) => SecureStore.deleteItemAsync(key),
// };
//
// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

export const supabase = null;
