import { compactBox } from '../../../packages/ui/compact-box';
import { icons } from '../../../packages/ui/property-icon';
import { measureBoxes } from './measurement';
import { pagePicker } from './picker';
export interface PickerState { token: string; active: boolean; pinned?:boolean; sequence: number; selected: boolean; message: string; forget?: boolean }
/** One owner per inspected DevTools session, independent of which panel is visible. */
export function createPickerController(publish: (state: PickerState) => void) {
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
  let epoch = 0, origin: 'button' | 'command' | undefined, lastShortcut = 0;
  let state: PickerState = { token, active: false, sequence: 0, selected: false, message: '' };
  function action(op: 'start' | 'stop' | 'pulse' | 'clear', message?: string): Promise<PickerState> {
    const current = ++epoch;
    if (op === 'start') state = { ...state, active: true };
    if (op === 'stop' || op === 'clear') { state = { ...state, active: false, pinned:false }; origin = undefined; }
    return new Promise(resolve => chrome.devtools.inspectedWindow.eval(`(${pagePicker.toString()})(${JSON.stringify(op)},${JSON.stringify(token)},${current},${measureBoxes.toString()},${compactBox.toString()},${JSON.stringify(icons)})`, (value, error) => {
      if (current !== epoch) { resolve(state); return; }
      const v = value as Partial<PickerState> | undefined;
      if (error?.isException || error?.isError || !v || typeof v.active !== 'boolean' || !Number.isSafeInteger(v.sequence) || typeof v.message !== 'string') {
        state = { token, active: false, sequence: 0, selected: false, message: '이 페이지에서 요소 선택을 실행할 수 없어요. 일반 웹페이지에서 다시 시도하세요.' };
      } else state = { token, active: v.active, pinned:v.pinned===true, sequence: v.sequence!, selected: v.selected === true, message: message ?? v.message.slice(0,500), forget: op === 'clear' };
      if (!state.active) origin = undefined;
      publish(state); resolve(state);
    }));
  }
  const timer = setInterval(() => { if (state.active||state.pinned) void action('pulse'); }, 250);
  return {
    async toggle(from: 'button' | 'command', shortcut = false) {
      if (shortcut && Date.now() - lastShortcut < 250) return state;
      if (shortcut) lastShortcut = Date.now();
      if (state.active) return action('stop');
      origin = from; return action('start');
    },
    cancel: () => action('stop'),
    clear: (message?: string) => action('clear', message),
    hide: () => { if (origin === 'button'||state.pinned) void action('stop'); },
    refresh: () => publish(state),
    dispose: () => { clearInterval(timer); void action('clear'); },
  };
}
