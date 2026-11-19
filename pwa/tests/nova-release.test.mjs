import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const release = source.match(/const RELEASE = '([^']+)'/)?.[1];
const origin = 'https://datacore.example';

function worker(fetcher, content = {}) {
  const handlers = {};
  const calls = [];
  const cache = {
    match: async request => content[typeof request === 'string' ? request : request.url],
    addAll: async requests => calls.push(...requests.map(request => request.url)),
  };
  runInNewContext(source.replace("const RUNTIME = './';", `const RUNTIME = './${release}/';`), {
    self: {
      location: { origin },
      registration: { scope: origin + '/' },
      addEventListener: (name, listener) => { handlers[name] = listener; },
      skipWaiting: () => {},
    },
    caches: { open: async () => cache },
    fetch: fetcher,
    URL,
    Request,
    Response,
  });
  return {
    calls,
    install: () => new Promise(resolve => handlers.install({ waitUntil: promise => resolve(promise) })),
    request(path, mode = 'navigate') {
      let response;
      handlers.fetch({
        request: { url: origin + path, method: 'GET', mode },
        respondWith: value => { response = value; },
      });
      return response;
    },
  };
}

test('las navegaciones obtienen la edición publicada y mantienen un respaldo completo sin conexión', async () => {
  const cache = { [origin + '/index.html']: 'offline shell' };
  const online = worker(async (_request, options) => {
    assert.equal(options.cache, 'no-cache');
    return 'current network shell';
  }, cache);
  const offline = worker(async () => { throw new Error('offline'); }, cache);
  for (const link of ['/', '/index.html', '/actualizada.html']) {
    assert.equal(await online.request(link), 'current network shell');
    assert.equal(await offline.request(link), 'offline shell');
  }
});

test('la caché solo intercepta recursos de su propio paquete y nunca la API', async () => {
  const style = `/${release}/nova-shell.css`;
  const runtime = worker(async () => assert.fail('The cached asset should be used'), {
    [origin + style]: 'current style',
  });
  await runtime.install();
  assert.ok(runtime.calls.includes(origin + style));
  assert.equal(await runtime.request(style, 'cors'), 'current style');
  assert.equal(runtime.request('/nova-shell.css?v=legacy', 'cors'), undefined);
  assert.equal(runtime.request(style + '?v=unknown', 'cors'), undefined);
  assert.equal(runtime.request('/api/assistant', 'cors'), undefined);
});
