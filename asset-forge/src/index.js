import { ADMIN_HTML } from './admin.js';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

const MESHY_ENDPOINT = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_BATCH_SIZE = 20;
const DEFAULT_POLYCOUNT = 6000;
const MAX_POLYCOUNT = 20000;
const STYLE_PROFILE = [
  'Polished stylized 3D game asset for Zaylins, a kid-safe open-world browser game.',
  'Rounded readable silhouette, clean proportions, colorful but believable materials, clean PBR surfaces.',
  'No logos, no brand names, no text, no floor, no background, no extra objects, isolated single asset.',
  'Optimized for real-time use in a Three.js web game.'
].join(' ');

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  const configured = env.ALLOWED_ORIGIN || '*';
  const requestOrigin = request.headers.get('origin');
  const allowOrigin = configured === '*' ? '*' : (requestOrigin === configured ? configured : 'null');
  headers.set('access-control-allow-origin', allowOrigin);
  headers.set('access-control-allow-headers', 'authorization, content-type, x-asset-forge-key');
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  headers.set('vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function safeEqual(left, right) {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function isAuthorized(request, env) {
  if (!env.ASSET_FORGE_ADMIN_KEY) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const direct = request.headers.get('x-asset-forge-key') || '';
  const supplied = bearer || direct;
  return supplied ? safeEqual(supplied, env.ASSET_FORGE_ADMIN_KEY) : false;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `asset-${crypto.randomUUID().slice(0, 8)}`;
}

function sanitizeCategory(value) {
  return slugify(value || 'uncategorized').slice(0, 48);
}

function clampPolycount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_POLYCOUNT;
  return Math.min(MAX_POLYCOUNT, Math.max(100, parsed));
}

function compilePrompt(asset) {
  const customStyle = typeof asset.styleProfile === 'string' ? asset.styleProfile.trim() : '';
  return `${asset.prompt.trim()} ${customStyle || STYLE_PROFILE}`.replace(/\s+/g, ' ').slice(0, 600);
}

function normalizeAsset(input) {
  if (!input || typeof input !== 'object') throw new Error('Each asset must be an object.');
  const name = String(input.name || '').trim();
  const prompt = String(input.prompt || '').trim();
  if (name.length < 2 || name.length > 120) throw new Error('Asset name must be 2 to 120 characters.');
  if (prompt.length < 10) throw new Error(`Prompt for "${name}" must be at least 10 characters.`);

  const id = crypto.randomUUID();
  return {
    id,
    name,
    slug: slugify(input.slug || name),
    category: sanitizeCategory(input.category),
    prompt,
    compiledPrompt: compilePrompt({ ...input, prompt }),
    targetPolycount: clampPolycount(input.targetPolycount),
    styleProfile: String(input.styleProfile || STYLE_PROFILE),
    provider: 'meshy',
  };
}

async function readJsonBody(request) {
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) throw new Error('Request body is too large.');
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function insertJob(env, asset) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO asset_jobs (
      id, name, slug, category, prompt, compiled_prompt, style_profile,
      target_polycount, provider, status, progress, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)
  `).bind(
    asset.id,
    asset.name,
    asset.slug,
    asset.category,
    asset.prompt,
    asset.compiledPrompt,
    asset.styleProfile,
    asset.targetPolycount,
    asset.provider,
    now,
    now,
  ).run();
}

async function updateJob(env, jobId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const columns = [...keys.map((key) => `${key} = ?`), 'updated_at = ?'];
  const values = [...keys.map((key) => patch[key]), new Date().toISOString(), jobId];
  await env.DB.prepare(`UPDATE asset_jobs SET ${columns.join(', ')} WHERE id = ?`).bind(...values).run();
}

function assetUrls(row, requestUrl) {
  const origin = new URL(requestUrl).origin;
  return {
    ...row,
    model_url: row.model_key ? `${origin}/assets/${row.model_key}` : null,
    thumbnail_url: row.thumbnail_key ? `${origin}/assets/${row.thumbnail_key}` : null,
  };
}

async function readLimitedText(response, limit = 4096) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (output.length < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return output.slice(0, limit);
}

async function meshyRequest(env, path, init = {}) {
  if (!env.MESHY_API_KEY) throw new NonRetryableError('MESHY_API_KEY is not configured.');
  const headers = new Headers(init.headers || {});
  headers.set('authorization', `Bearer ${env.MESHY_API_KEY}`);
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(`${MESHY_ENDPOINT}${path}`, { ...init, headers });
  if (!response.ok) {
    const message = await readLimitedText(response, 1000);
    const permanent = [400, 401, 402, 403, 404].includes(response.status);
    const errorMessage = `Meshy ${response.status}: ${message || response.statusText}`;
    if (permanent) throw new NonRetryableError(errorMessage);
    throw new Error(errorMessage);
  }
  return response.json();
}

async function createPreviewTask(env, asset) {
  const existing = await env.DB.prepare('SELECT provider_preview_id FROM asset_jobs WHERE id = ?')
    .bind(asset.id).first();
  if (existing?.provider_preview_id) return existing.provider_preview_id;

  const result = await meshyRequest(env, '', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'preview',
      prompt: asset.compiledPrompt,
      ai_model: 'latest',
      should_remesh: true,
      topology: 'triangle',
      target_polycount: asset.targetPolycount,
      target_formats: ['glb'],
      moderation: true,
      alpha_thumbnail: true,
      auto_size: true,
      origin_at: 'bottom',
    }),
  });
  if (!result?.result) throw new Error('Meshy did not return a preview task ID.');
  await updateJob(env, asset.id, {
    provider_preview_id: result.result,
    status: 'generating_preview',
    progress: 2,
  });
  return result.result;
}

async function createRefineTask(env, asset, previewTaskId) {
  const existing = await env.DB.prepare('SELECT provider_refine_id FROM asset_jobs WHERE id = ?')
    .bind(asset.id).first();
  if (existing?.provider_refine_id) return existing.provider_refine_id;

  const result = await meshyRequest(env, '', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'refine',
      preview_task_id: previewTaskId,
      ai_model: 'latest',
      enable_pbr: true,
      remove_lighting: true,
      texture_prompt: asset.compiledPrompt,
      target_formats: ['glb'],
      alpha_thumbnail: true,
      auto_size: true,
      origin_at: 'bottom',
      moderation: true,
    }),
  });
  if (!result?.result) throw new Error('Meshy did not return a refine task ID.');
  await updateJob(env, asset.id, {
    provider_refine_id: result.result,
    status: 'generating_texture',
    progress: 52,
  });
  return result.result;
}

async function waitForTask(step, env, asset, taskId, phase) {
  const baseProgress = phase === 'preview' ? 2 : 52;
  const span = phase === 'preview' ? 47 : 42;

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const task = await step.do(
      `poll ${phase} ${attempt}`,
      { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' }, timeout: '1 minute' },
      async () => {
        const current = await meshyRequest(env, `/${taskId}`);
        if (current.status === 'FAILED' || current.status === 'CANCELED') {
          throw new NonRetryableError(current.task_error?.message || `${phase} task ${current.status}.`);
        }
        return current;
      },
    );

    const providerProgress = Number(task.progress || 0);
    const mappedProgress = Math.min(baseProgress + span, baseProgress + Math.round((providerProgress / 100) * span));
    await step.do(`record ${phase} progress ${attempt}`, async () => {
      await updateJob(env, asset.id, { progress: mappedProgress });
    });

    if (task.status === 'SUCCEEDED') return task;
    await step.sleep(`wait for ${phase} ${attempt}`, '15 seconds');
  }

  await step.do(`fail ${phase} timeout`, async () => {
    throw new NonRetryableError(`${phase} generation timed out.`);
  });
}

async function storeRemoteFile(env, sourceUrl, key, contentType, metadata) {
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) throw new Error(`Could not download generated file: ${response.status}`);
  await env.ASSETS.put(key, response.body, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: metadata,
  });
}

export class AssetGenerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const asset = event.payload;

    try {
      const previewTaskId = await step.do(
        'create preview task',
        { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' }, timeout: '2 minutes' },
        async () => createPreviewTask(this.env, asset),
      );

      await waitForTask(step, this.env, asset, previewTaskId, 'preview');

      const refineTaskId = await step.do(
        'create refine task',
        { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' }, timeout: '2 minutes' },
        async () => createRefineTask(this.env, asset, previewTaskId),
      );

      const refined = await waitForTask(step, this.env, asset, refineTaskId, 'refine');
      const modelUrl = refined.model_urls?.glb;
      const thumbnailUrl = refined.alpha_thumbnail_url || refined.thumbnail_url;
      if (!modelUrl) throw new NonRetryableError('Meshy completed without returning a GLB URL.');

      const modelKey = `generated/${asset.category}/${asset.slug}-${asset.id}.glb`;
      const thumbnailKey = thumbnailUrl ? `previews/${asset.category}/${asset.slug}-${asset.id}.png` : null;

      await step.do(
        'store generated glb',
        { retries: { limit: 4, delay: '15 seconds', backoff: 'exponential' }, timeout: '10 minutes' },
        async () => storeRemoteFile(this.env, modelUrl, modelKey, 'model/gltf-binary', {
          jobId: asset.id,
          name: asset.name,
          category: asset.category,
          provider: asset.provider,
        }),
      );

      if (thumbnailUrl && thumbnailKey) {
        await step.do(
          'store preview image',
          { retries: { limit: 4, delay: '10 seconds', backoff: 'exponential' }, timeout: '5 minutes' },
          async () => storeRemoteFile(this.env, thumbnailUrl, thumbnailKey, 'image/png', {
            jobId: asset.id,
            name: asset.name,
          }),
        );
      }

      const completed = await step.do('publish catalog entry', async () => {
        const now = new Date().toISOString();
        const credits = Number(refined.consumed_credits || 0);
        await this.env.DB.batch([
          this.env.DB.prepare(`
            INSERT INTO asset_catalog (
              id, name, slug, category, prompt, model_key, thumbnail_key,
              provider, provider_task_id, target_polycount, consumed_credits,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              model_key = excluded.model_key,
              thumbnail_key = excluded.thumbnail_key,
              consumed_credits = excluded.consumed_credits,
              updated_at = excluded.updated_at
          `).bind(
            asset.id,
            asset.name,
            asset.slug,
            asset.category,
            asset.prompt,
            modelKey,
            thumbnailKey,
            asset.provider,
            refineTaskId,
            asset.targetPolycount,
            credits,
            now,
            now,
          ),
          this.env.DB.prepare(`
            UPDATE asset_jobs
            SET status = 'completed', progress = 100, model_key = ?, thumbnail_key = ?,
                consumed_credits = ?, error = NULL, updated_at = ?
            WHERE id = ?
          `).bind(modelKey, thumbnailKey, credits, now, asset.id),
        ]);
        return { id: asset.id, modelKey, thumbnailKey, credits };
      });

      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await step.do('record workflow failure', async () => {
        await updateJob(this.env, asset.id, { status: 'failed', error: message.slice(0, 2000) });
      });
      throw error;
    }
  }
}

async function handleCreateJob(request, env) {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, { status: 401 });
  const asset = normalizeAsset(await readJsonBody(request));
  await insertJob(env, asset);
  await env.ASSET_WORKFLOW.create({ id: asset.id, params: asset });
  return json({ job: asset }, { status: 202 });
}

async function handleCreateBatch(request, env) {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await readJsonBody(request);
  const inputs = Array.isArray(body) ? body : body.assets;
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('Provide a non-empty assets array.');
  if (inputs.length > MAX_BATCH_SIZE) throw new Error(`A batch may contain at most ${MAX_BATCH_SIZE} assets.`);

  const assets = inputs.map(normalizeAsset);
  for (const asset of assets) await insertJob(env, asset);
  await env.ASSET_WORKFLOW.createBatch(assets.map((asset) => ({ id: asset.id, params: asset })));
  return json({ jobs: assets, count: assets.length }, { status: 202 });
}

async function handleListJobs(request, env) {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '50', 10)));
  const status = url.searchParams.get('status');
  const query = status
    ? env.DB.prepare('SELECT * FROM asset_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?').bind(status, limit)
    : env.DB.prepare('SELECT * FROM asset_jobs ORDER BY created_at DESC LIMIT ?').bind(limit);
  const rows = await query.all();
  return json({ jobs: rows.results.map((row) => assetUrls(row, request.url)) });
}

async function handleGetJob(request, env, id) {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, { status: 401 });
  const row = await env.DB.prepare('SELECT * FROM asset_jobs WHERE id = ?').bind(id).first();
  return row ? json({ job: assetUrls(row, request.url) }) : json({ error: 'Job not found' }, { status: 404 });
}

async function handleCatalog(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const limit = Math.min(250, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '100', 10)));
  const query = category
    ? env.DB.prepare('SELECT * FROM asset_catalog WHERE category = ? ORDER BY created_at DESC LIMIT ?').bind(sanitizeCategory(category), limit)
    : env.DB.prepare('SELECT * FROM asset_catalog ORDER BY created_at DESC LIMIT ?').bind(limit);
  const rows = await query.all();
  return json({ assets: rows.results.map((row) => assetUrls(row, request.url)) });
}

async function handleAsset(request, env, key) {
  const object = await env.ASSETS.get(key, { range: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('access-control-allow-origin', '*');
  return new Response(object.body, { status: object.range ? 206 : 200, headers });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method === 'GET' && path === '/') {
    return new Response(ADMIN_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  if (request.method === 'GET' && path === '/health') {
    return json({
      ok: true,
      service: 'zta-asset-forge',
      meshyConfigured: Boolean(env.MESHY_API_KEY),
      adminConfigured: Boolean(env.ASSET_FORGE_ADMIN_KEY),
      time: new Date().toISOString(),
    });
  }
  if (request.method === 'POST' && path === '/api/jobs') return handleCreateJob(request, env);
  if (request.method === 'POST' && path === '/api/jobs/batch') return handleCreateBatch(request, env);
  if (request.method === 'GET' && path === '/api/jobs') return handleListJobs(request, env);
  if (request.method === 'GET' && path.startsWith('/api/jobs/')) return handleGetJob(request, env, path.slice('/api/jobs/'.length));
  if (request.method === 'GET' && path === '/api/catalog') return handleCatalog(request, env);
  if (request.method === 'GET' && path.startsWith('/assets/')) return handleAsset(request, env, path.slice('/assets/'.length));

  return json({ error: 'Not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      return withCors(await route(request, env), request, env);
    } catch (error) {
      console.error(JSON.stringify({ event: 'request_error', message: error instanceof Error ? error.message : String(error) }));
      const response = json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 400 });
      return withCors(response, request, env);
    }
  },
};
