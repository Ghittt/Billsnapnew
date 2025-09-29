// Analytics types for Google Analytics
declare global {
  function gtag(command: 'config' | 'event', targetId: string, config?: any): void;
  function gtag(command: 'event', eventName: string, parameters?: {
    event_category?: string;
    event_label?: string;
    value?: number;
    [key: string]: any;
  }): void;
}

export {};