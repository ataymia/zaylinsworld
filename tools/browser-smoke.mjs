#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const HOST = '127.0.0.1';
const PORT = 4173;
const APP_URL = `http://${HOST}:${PORT}/`;
const CDP_PORT = 9222;
const CHROME_PATH = process.env.CHROME_PATH || process.env.CHROME || process.env.GOOGLE_CHROME_BIN;

if (!CHROME_PATH) {
  console.error('CHROME_PATH is required. CI installs Chrome with browser-actions/setup-chrome.');
  process.exit(1);
}

const children = [];
const userDataDir = mkdtempSync(join(tmpdir(), 'zaylins-chrome-'));

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(options.env || {}) },
  });
  children.push(child);
  return child;
}

async function waitForUrl(url, timeoutMs = 30000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket connection timed out')), 10000);
      this.socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener('error', (event) => { clearTimeout(timer); reject(event.error || new Error('CDP WebSocket error')); }, { once: true });
    });
    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result || {});
      return;
    }
    if (!message.method) return;
    for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
  }

  on(method, listener) {
    const list = this.listeners.get(method) || [];
    list.push(listener);
    this.listeners.set(method, list);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 20000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try { this.socket?.close(); } catch { /* ignore */ }
  }
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function waitForExpression(client, expression, label, timeoutMs = 45000) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    try {
      lastValue = await evaluate(client, expression);
      if (lastValue) return lastValue;
    } catch {
      // The page may still be navigating or rebuilding the execution context.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}

function runtimeExceptionText(params) {
  const details = params.exceptionDetails || {};
  return details.exception?.description || details.text || 'Unknown page exception';
}

async function main() {
  let client;
  const runtimeErrors = [];
  const preview = start(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
    'run', 'preview', '--', '--host', HOST, '--port', String(PORT), '--strictPort',
  ]);
  preview.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  preview.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  try {
    await waitForUrl(APP_URL, 30000);

    const chrome = start(CHROME_PATH, [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--mute-audio',
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ]);
    chrome.stderr.on('data', (chunk) => {
      const text = String(chunk);
      if (/DevTools listening/.test(text)) process.stdout.write(`[chrome] ${text}`);
    });

    await waitForUrl(`http://${HOST}:${CDP_PORT}/json/version`, 20000);
    const tabResponse = await fetch(`http://${HOST}:${CDP_PORT}/json/new?${encodeURIComponent(APP_URL)}`, { method: 'PUT' });
    if (!tabResponse.ok) throw new Error(`Could not create Chrome tab: ${tabResponse.status}`);
    const tab = await tabResponse.json();

    client = new CdpClient(tab.webSocketDebuggerUrl);
    await client.connect();
    client.on('Runtime.exceptionThrown', (params) => runtimeErrors.push(runtimeExceptionText(params)));
    client.on('Runtime.consoleAPICalled', (params) => {
      if (!['error', 'assert'].includes(params.type)) return;
      const text = (params.args || []).map((arg) => arg.value || arg.description || '').join(' ');
      runtimeErrors.push(`console.${params.type}: ${text}`);
    });
    client.on('Log.entryAdded', ({ entry }) => {
      if (entry?.level === 'error') runtimeErrors.push(`log.error: ${entry.text}`);
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Page.navigate', { url: APP_URL });

    await waitForExpression(
      client,
      `(() => {
        const button = document.getElementById('creator-enter');
        const creator = document.getElementById('creator');
        const loading = document.getElementById('loading');
        const loadingHidden = !loading || getComputedStyle(loading).display === 'none' || loading.classList.contains('hidden');
        return document.readyState === 'complete' && !!button && !!creator && !creator.classList.contains('hidden') && loadingHidden;
      })()`,
      'creator screen to become interactive',
      60000,
    );

    await evaluate(client, `document.getElementById('creator-enter').click(); true`);

    await waitForExpression(
      client,
      `(() => {
        const status = window.__ZW_SKIN_STATUS__;
        return !!status && status.player.attempted >= 1 && !['pending', 'loading'].includes(status.player.mode);
      })()`,
      'player skin attempt to complete',
      60000,
    );

    await waitForExpression(
      client,
      `(() => {
        const status = window.__ZW_SKIN_STATUS__;
        return !!status && status.npc.cap > 0 && status.npc.attempted > 0;
      })()`,
      'capped civilian skin loading to start',
      60000,
    );

    const snapshot = await evaluate(client, `(() => ({
      player: window.__ZW_SKIN_STATUS__?.player,
      npc: window.__ZW_SKIN_STATUS__?.npc,
      cop: window.__ZW_SKIN_STATUS__?.cop,
      canvas: !!document.getElementById('game'),
      creatorHidden: document.getElementById('creator')?.classList.contains('hidden'),
      loadingDisplay: getComputedStyle(document.getElementById('loading')).display,
      location: document.getElementById('loc-box')?.textContent,
    }))()`);

    if (!snapshot.canvas || !snapshot.creatorHidden) {
      throw new Error(`Starter Town did not enter play mode: ${JSON.stringify(snapshot)}`);
    }
    if (!snapshot.player?.proceduralMotion && snapshot.player?.usableClips === 0 && snapshot.player?.mode === 'glb') {
      throw new Error(`GLB player has neither usable clips nor procedural motion: ${JSON.stringify(snapshot.player)}`);
    }

    const fatalErrors = [...new Set(runtimeErrors)].filter((text) => {
      return !/favicon\.ico|ERR_BLOCKED_BY_CLIENT/i.test(text);
    });
    if (fatalErrors.length) {
      throw new Error(`Browser runtime errors:\n${fatalErrors.map((error) => `- ${error}`).join('\n')}`);
    }

    console.log('\nStarter Town browser smoke passed.');
    console.log(JSON.stringify(snapshot, null, 2));
  } finally {
    client?.close();
    for (const child of children.reverse()) {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
    }
    await delay(300);
    for (const child of children.reverse()) {
      if (!child.killed) {
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
      }
    }
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
