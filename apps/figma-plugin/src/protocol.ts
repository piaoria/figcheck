import type { ColorFormat } from '../../../packages/ui/color';
import type { DesignDocument } from '../../../packages/core/src/index';
export const BUILD = '0.3.23';
export const PROTOCOL = 'figcheck-plugin-1';
export const RESPONSE_TIMEOUT_MS = 8000;
export interface Request { protocol: typeof PROTOCOL; session: string; requestId: number; type: 'ready' | 'refresh' | 'close' | 'theme-set' | 'color-set'; colorFormat?: ColorFormat; colorRevision?: number; theme?: 'light' | 'dark'; themeRevision?: number }
export interface HostMessage {
  protocol: typeof PROTOCOL; session: string; requestId: number; sequence: number; build: string;
  type: 'ready' | 'state' | 'theme' | 'color-format'; colorFormat?: ColorFormat; colorRevision?: number; colorError?: boolean; theme?: 'light' | 'dark'; themeRevision?: number; themeError?: boolean; state?: 'extracting' | 'empty-selection' | 'multiple-selection' | 'complete' | 'error';
  selectionCount?: number; document?: DesignDocument; message?: string; detail?: string;
}
