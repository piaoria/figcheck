import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
export function startFixture(port = 4173) {
  const main = createServer(async (req, res) => {
    if (req.url !== '/' && req.url !== '/fixture.html') { res.writeHead(404); res.end('Not found'); return; }
    res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(await readFile(new URL('../fixtures/fixture.html', import.meta.url)));
  });
  const foreign = createServer((req,res) => { res.setHeader('Content-Type','text/css'); res.end('.cross-origin { color: rgb(1, 2, 3); }'); });
  return new Promise(resolve => main.listen(port, '127.0.0.1', () => foreign.listen(port + 1, '127.0.0.1', () => resolve({ main, foreign }))));
}
if (process.argv[1]?.endsWith('fixture-server.mjs')) { await startFixture(); console.log('FigCheck fixture: http://127.0.0.1:4173 (stop with Ctrl+C)'); }
