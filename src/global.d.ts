/// <reference types="vite/client" />

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        // Основные методы
        initData: string;
        initDataUnsafe: any;
        version: string;
        platform: string;
        
        // Методы для проверки версий
        isVersionAtLeast(version: string): boolean;
        
        // Методы для работы с ссылками
        openLink(url: string, options?: { try_instant_view?: boolean }): void;
        openTelegramLink(url: string): void;
        
        // Новые методы (Bot API 8.0+)
        shareMessage(params: { text: string; url?: string }): void;
        
        // Попапы и диалоги
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
        
        // Другие свойства
        themeParams: any;
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        viewportHeight: number;
        
        // Компоненты
        MainButton: any;
        BackButton: any;
        SettingsButton: any;
        HapticFeedback: any;
      };
    };
  }
}

// Ваши существующие модули остаются без изменений
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.webm' {
  const src: string
  export default src
}

declare module '*.tgs' {
  const src: string
  export default src
}

declare module '*.lottie' {
  const src: string
  export default src
}

declare module 'jszip' {
  class JSZip {
    files: { [key: string]: JSZipObject }
    loadAsync(data: ArrayBuffer | Uint8Array | Blob): Promise<JSZip>
    file(name: string): JSZipObject | null
  }
  export default JSZip
  export interface JSZipObject {
    async(type: 'string'): Promise<string>
    async(type: 'uint8array'): Promise<Uint8Array>
  }
}

export {}