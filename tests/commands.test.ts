import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
type Command = (name: string, tab?: { id?: number }) => Promise<void>;
function host(response: unknown, fail = false) {
  let command!: Command;
  const messages: unknown[] = [], badges: { tabId: number; text: string }[] = [], titles: string[] = [];
  let queries = 0;
  const chrome = {
    commands: { onCommand: { addListener: (fn: Command) => { command = fn; } } },
    tabs: { query: async () => { ++queries; return [{ id: 42 }]; } },
    runtime: { sendMessage: async (value: unknown) => { messages.push(value); if (fail) throw new Error('No receiver'); return response; } },
    action: { setBadgeText: async (value: { tabId: number; text: string }) => { badges.push(value); }, setBadgeBackgroundColor: async () => {}, setTitle: async (value: { title: string }) => { titles.push(value.title); } },
  };
  runInNewContext(readFileSync('apps/chrome-extension/dist/background.js', 'utf8'), { chrome, Date });
  return { run: (name: string, tab?: { id?: number }) => command(name, tab), messages, badges, titles, queries: () => queries };
}
test('real bundled commands handler forwards active tab and clears missing-DevTools guidance only on acknowledged delivery', async () => {
  const h = host({ handled: true }); await h.run('figcheck-pick', { id: 12 });
  const m = h.messages[0] as { tabId: number; issuedAt: number; type: string };
  assert.equal(m.tabId, 12); assert.equal(m.type, 'figcheck-pick'); assert.ok(Date.now() - m.issuedAt < 1000);
  assert.equal(h.badges[0].text, ''); assert.equal(h.queries(), 0);
});
test('missing commands tab uses permission-free active ID lookup; other commands do nothing', async () => {
  const h = host({ handled: true }); await h.run('other'); assert.equal(h.messages.length, 0);
  await h.run('figcheck-pick'); assert.equal((h.messages[0] as { tabId: number }).tabId, 42); assert.equal(h.queries(), 1);
});
test('closed or unacknowledged DevTools gives honest F12 badge, without claiming picker started', async () => {
  for (const failure of [false, true]) { const h = host(undefined, failure); await h.run('figcheck-pick', { id: 12 }); assert.equal(h.badges[0].text, 'F12'); assert.ok(h.titles[0].includes('F12')); }
});
test('cool-neutral UI labels and semantic status text meet numerical contrast', () => {
  const theme = readFileSync('packages/ui/theme.css','utf8');
  const palettes = [theme.split('*{')[0].split(':root[data-theme=dark]')[0], theme.split(':root[data-theme=dark]')[1].split('}')[0]];
  for (const palette of palettes) {
  const token = (name: string) => new RegExp(`--${name}:(#[0-9a-f]{6})`).exec(palette)![1];
  function lum(hex: string) { const c = [1,3,5].map(n => parseInt(hex.slice(n,n+2),16)/255).map(v => v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4); return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722; }
  function contrast(a: string,b: string) { const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  for (const [fg,bg] of [['text','bg'],['muted','surface'],['quiet','surface'],['bad','bg'],['good','bg'],['danger','bg']]) assert.ok(contrast(token(fg),token(bg))>=4.5, `${fg}/${bg}`);
  for(const bg of ['accent','accent-hover','accent-active'])assert.ok(contrast(token('on-accent'),token(bg))>=4.5);assert.ok(contrast(token('focus'),token('bg'))>=3);assert.ok(contrast(token('quiet'),token('surface-raised'))>=4.5);
  assert.ok(contrast(token('on-accent'),token('selected-bg'))>=4.5);
  assert.ok(['#272c33','#e5e9ef'].includes(token('accent')));for(const name of ['bg','surface-raised','hover','text','muted','quiet','accent','accent-hover','accent-active','on-accent','selected-bg','icon','link','check','focus','good']){const c=[1,3,5].map(i=>parseInt(token(name).slice(i,i+2),16));assert.ok(Math.max(...c)-Math.min(...c)<=20,name+' near neutral');}for(const fg of ['link','icon'])assert.ok(contrast(token(fg),token('bg'))>=4.5);assert.notEqual(token('accent'),token('danger'));assert.notEqual(token('accent'),token('bad'));assert.notEqual(token('accent'),token('good'));
  }
});
