import { isColorFormat } from '../../../packages/ui/color';
import { extractNode } from './extract';
import { VERSION, type DesignDocument } from '../../../packages/core/src/index';
import { BUILD, PROTOCOL, type Request, type HostMessage } from './protocol';

let session = '', requestId = 0, sequence = 0;
const themeKey = 'figcheck.theme.v1';
let themeRevision = 0;
let latestThemeRequest = 0;
let themeWrites: Promise<void> = Promise.resolve();
async function loadTheme(readySession: string) {
  const revision = themeRevision;
  try {
    const saved: unknown = await figma.clientStorage.getAsync(themeKey);
    if (session === readySession && revision === themeRevision && (saved === 'light' || saved === 'dark')) send({ type: 'theme', theme: saved, themeRevision: 0 });
  } catch { /* Host default remains usable if storage is unavailable. */ }
}
const colorKey='figcheck.color-format.v1';let colorRevision=0,latestColorRequest=0;let colorWrites:Promise<void>=Promise.resolve();
async function loadColorFormat(owner:string){
  const revision=colorRevision;try{const value:unknown=await figma.clientStorage.getAsync(colorKey);if(owner===session&&revision===colorRevision&&isColorFormat(value))send({type:'color-format',colorFormat:value,colorRevision:0});}catch{/* RGB default stays usable. */}
}
let startupError: { message: string; detail: string } | undefined;
function errorInfo(error: unknown) {
  return { message: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000), detail: error instanceof Error ? (error.stack || error.message).slice(0, 4000) : String(error).slice(0, 4000) };
}
function send(message: Omit<HostMessage, 'protocol' | 'session' | 'requestId' | 'sequence' | 'build'>) {
  if (!session) return;
  figma.ui.postMessage({ ...message, protocol: PROTOCOL, session, requestId, sequence: ++sequence, build: BUILD });
}
/** Entire API read is inside try: even currentPage/selection failures receive an error response. */
function snapshot() {
  if (!session) return; // UI explicitly announces that its message listener is ready.
  try {
    if (startupError) { send({ type: 'state', state: 'error', ...startupError }); return; }
    send({ type: 'state', state: 'extracting' });
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) { send({ type: 'state', state: selection.length ? 'multiple-selection' : 'empty-selection', selectionCount: selection.length }); return; }
    const profile = figma.root.documentColorProfile;
    const document: DesignDocument = { schemaVersion: VERSION, source: 'figma', colorProfile: profile === 'SRGB' ? 'SRGB' : profile === 'DISPLAY_P3' ? 'DISPLAY_P3' : 'UNKNOWN', exportedAt: new Date().toISOString(), nodes: [extractNode(selection[0], figma.mixed, profile)] };
    send({ type: 'state', state: 'complete', document });
  } catch (error) {
    const info = errorInfo(error);
    console.error('[FigCheck ' + BUILD + '] extract: ' + info.message);
    send({ type: 'state', state: 'error', ...info });
  }
}
// Install the receiver before showUI: a fast UI-ready event must never be lost.
figma.ui.onmessage = (value: unknown) => {
  if (!value || typeof value !== 'object') return;
  const m = value as Partial<Request>;
  if (m.protocol !== PROTOCOL || typeof m.session !== 'string' || !m.session || m.session.length > 128 || !Number.isSafeInteger(m.requestId) || !m.requestId || m.requestId < 1) return;
  if (m.type === 'ready') {
    if (m.session === session && m.requestId <= requestId) return;
    session = m.session; requestId = m.requestId; latestThemeRequest = 0; latestColorRequest = 0;
    send({ type: 'ready' }); snapshot(); void loadTheme(session); void loadColorFormat(session); return;
  }
  if (m.session !== session || m.requestId < requestId) return;
  if(m.type==='color-set'){
    if(!isColorFormat(m.colorFormat)||!Number.isSafeInteger(m.colorRevision)||m.colorRevision!<=latestColorRequest)return;
    const value=m.colorFormat,revision=m.colorRevision!,owner=session;latestColorRequest=revision;++colorRevision;
    colorWrites=colorWrites.then(async()=>{let failed=false;try{await figma.clientStorage.setAsync(colorKey,value);}catch{failed=true;}if(owner===session)send({type:'color-format',colorFormat:value,colorRevision:revision,colorError:failed});});return;
  }
  if (m.type === 'theme-set') {
    if ((m.theme !== 'light' && m.theme !== 'dark') || !Number.isSafeInteger(m.themeRevision) || m.themeRevision! <= latestThemeRequest) return;
    const value = m.theme, revision = m.themeRevision!, owner = session;
    latestThemeRequest = revision;
    ++themeRevision;
    // Serialize writes: the last toggle must win even when clientStorage is asynchronous.
    themeWrites = themeWrites.then(async () => {
      let failed = false;
      try { await figma.clientStorage.setAsync(themeKey, value); } catch { failed = true; }
      if (session === owner) send({ type: 'theme', theme: value, themeRevision: revision, themeError: failed });
    });
    return;
  }
  if (m.type === 'refresh') { requestId = m.requestId; snapshot(); }
  if (m.type === 'close') figma.closePlugin();
};
try { figma.on('selectionchange', snapshot); }
catch (error) { startupError = errorInfo(error); console.error('[FigCheck ' + BUILD + '] selectionchange: ' + startupError.message); }
try { figma.showUI(__html__, { width: 440, height: 640, themeColors: true, title: 'FigCheck ' + BUILD }); }
catch (error) { console.error('[FigCheck ' + BUILD + '] showUI: ' + errorInfo(error).detail); throw error; }
