/**
 * dsh-skill-panel — 主机半（v1.0 Phase 1）
 *
 *   GET  /list      技能列表 + 派生统计（invoked/autoLoaded/clicked），按衰减 score 排序
 *   GET  /audit     垃圾体检（只看实际使用 invoked/autoLoaded）
 *   GET  /stats     价值估算账本
 *   GET  /trash     回收站清单
 *   POST /event     记一条事件（clicked / invoked / auto_loaded）
 *   POST /propose   生成 diff 预览（不落盘）
 *   POST /apply     校验白名单 + 原子写 + 版本链（用户确认后落盘）
 *   POST /save      直接保存（白名单 + 原子写 + 版本链，向后兼容）
 *   POST /delete    移到 .trash/
 *   POST /restore   还原
 *   POST /purge     彻底删除
 *   POST /compose   内联组合成一个新技能
 */
import { readFile, writeFile, readdir, mkdir, stat, rename, rm, appendFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';

export const name = 'skill-panel';
export const inject = ['webServer'];

const STALE_DAYS = 30;
const NEW_GRACE_DAYS = 7;
const STUB_CHARS = 120;
const DUP_THRESHOLD = 0.55;
const HALF_LIFE_DAYS = 14;
const MAX_VERSIONS = 10;

/** frontmatter 白名单：agent/面板只能改这些键。 */
const FRONTMATTER_WHITELIST = new Set([
  'name', 'description', 'brief', 'whenToUse', 'prompt', 'savesTokens', 'audience',
]);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, code, value) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function parseFront(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (m === null) return { front: {}, body: text, rawFront: '' };
  const front = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv !== null) front[kv[1]] = kv[2].trim();
  }
  return { front, body: text.slice(m[0].length), rawFront: m[1] };
}

function parseSections(body) {
  const lines = body.split(/\r?\n/);
  const intro = [];
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h !== null) { cur = { title: h[1], lines: [] }; sections.push(cur); continue; }
    if (line.startsWith('# ')) continue;
    if (cur === null) { if (line.trim()) intro.push(line.trim()); continue; }
    cur.lines.push(line);
  }
  const pack = (arr) => arr.map((l) => l.replace(/^\s+/, '')).filter((l) => l.length > 0).join('\n');
  return {
    intro: pack(intro).slice(0, 400),
    sections: sections.map((s) => ({ title: s.title, text: pack(s.lines).slice(0, 800) }))
      .filter((s) => s.text.length > 0),
  };
}

function extractSteps(body) {
  const steps = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^\s*(?:\d+[.)]|[-*])\s+(.{1,160})$/.exec(line);
    if (m !== null) steps.push(m[1].trim());
    if (steps.length >= 40) break;
  }
  return steps;
}

function safeName(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined;
}

function bigrams(text) {
  const s = String(text || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
  const set = new Set();
  for (let i = 0; i + 1 < s.length; i++) set.add(s.slice(i, i + 2));
  return set;
}

function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

function deriveBrief(text, fallback) {
  const s = String(text || '').trim();
  if (s.length === 0) return fallback || '';
  const head = s.split(/[：:，,。.；;、|｜]/)[0].trim();
  const base = head.length >= 4 ? head : s;
  return base.length > 18 ? base.slice(0, 18) + '…' : base;
}

/** 简单行 diff：公共前缀/后缀，返回删除行与新增行。 */
function diffLines(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  let i = 0;
  while (i < A.length && i < B.length && A[i] === B[i]) i++;
  let j = 0;
  while (j < A.length - i && j < B.length - i && A[A.length - 1 - j] === B[B.length - 1 - j]) j++;
  const removed = A.slice(i, A.length - j);
  const added = B.slice(i, B.length - j);
  return { removed, added, removedCount: removed.length, addedCount: added.length };
}

/** 校验 frontmatter 白名单；返回未知键数组。 */
function checkFrontmatter(text) {
  const { front } = parseFront(text);
  return Object.keys(front).filter((k) => !FRONTMATTER_WHITELIST.has(k));
}

export function apply(ctx, config) {
  const dshHome = process.env.DSH_HOME && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME : join(homedir(), '.dsh');
  const root = (config && typeof config.skillsRoot === 'string' && config.skillsRoot.length > 0)
    ? config.skillsRoot : join(dshHome, 'skills');
  const eventsFile = join(root, '.events.jsonl');
  const trashDir = join(root, '.trash');

  /* ---------- 事件日志 ---------- */

  async function appendEvent(evt) {
    try {
      await appendFile(eventsFile, JSON.stringify(evt) + '\n', 'utf8');
      return true;
    } catch { return false; }
  }

  async function readEvents(skillId) {
    let lines = [];
    try { lines = (await readFile(eventsFile, 'utf8')).split('\n'); } catch { return []; }
    const out = [];
    for (const l of lines) {
      if (!l.trim()) continue;
      try {
        const e = JSON.parse(l);
        if (!skillId || e.skillId === skillId) out.push(e);
      } catch { /* 跳过坏行 */ }
    }
    return out;
  }

  function deriveStats(events) {
    const s = { invoked: 0, autoLoaded: 0, clicked: 0, lastInvokedAt: 0, lastUsedAt: 0, lastClickedAt: 0 };
    for (const e of events) {
      const ts = typeof e.ts === 'number' ? e.ts : 0;
      if (e.type === 'invoked') { s.invoked++; s.lastInvokedAt = Math.max(s.lastInvokedAt, ts); s.lastUsedAt = Math.max(s.lastUsedAt, ts); }
      else if (e.type === 'auto_loaded') { s.autoLoaded++; s.lastUsedAt = Math.max(s.lastUsedAt, ts); }
      else if (e.type === 'clicked') { s.clicked++; s.lastClickedAt = Math.max(s.lastClickedAt, ts); }
    }
    return s;
  }

  function decayScore(events, now) {
    let s = 0;
    for (const e of events) {
      const w = e.type === 'invoked' ? 1.0 : e.type === 'auto_loaded' ? 1.0 : 0.1;
      const age = Math.max(0, (now - (typeof e.ts === 'number' ? e.ts : 0)) / 86400000);
      s += w * Math.pow(0.5, age / HALF_LIFE_DAYS);
    }
    return s;
  }

  /* ---------- 原子写 + 版本链 ---------- */

  async function atomicWrite(file, content) {
    const tmp = join(dirname(file), `.${basename(file)}.tmp-${process.pid}-${Date.now()}`);
    await writeFile(tmp, content, 'utf8');
    await rename(tmp, file);
  }

  async function snapshotVersion(file) {
    try {
      const prev = await readFile(file, 'utf8');
      const dir = dirname(file);
      const base = basename(file);
      let max = 0;
      try {
        for (const e of await readdir(dir)) {
          const m = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.v(\\d+)$`).exec(e);
          if (m) max = Math.max(max, parseInt(m[1], 10));
        }
      } catch { /* 无版本 */ }
      const next = max + 1;
      await writeFile(join(dir, `${base}.v${next}`), prev, 'utf8');
      // 只留最近 MAX_VERSIONS 版
      const versions = [];
      for (const e of await readdir(dir)) {
        const m = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.v(\\d+)$`).exec(e);
        if (m) versions.push(parseInt(m[1], 10));
      }
      versions.sort((a, b) => b - a);
      for (const n of versions.slice(MAX_VERSIONS)) {
        await rm(join(dir, `${base}.v${n}`), { force: true }).catch(() => {});
      }
      return next;
    } catch { return 0; }
  }

  /* ---------- 技能加载 ---------- */

  async function loadSkill(entry) {
    let file, kind;
    if (entry.isDirectory()) { file = join(root, entry.name, 'SKILL.md'); kind = 'bundle'; }
    else if (entry.name.toLowerCase().endsWith('.md')) { file = join(root, entry.name); kind = 'flat'; }
    else return undefined;

    let raw, mtimeMs = 0;
    try {
      const info = await stat(file);
      if (!info.isFile()) return undefined;
      mtimeMs = info.mtimeMs;
      raw = await readFile(file, 'utf8');
    } catch { return undefined; }

    const id = kind === 'bundle' ? entry.name : entry.name.replace(/\.md$/i, '');
    const { front, body } = parseFront(raw);
    const { intro, sections } = parseSections(body);
    return {
      id, kind, file, mtimeMs,
      name: front.name ?? id,
      description: front.description ?? '',
      brief: front.brief ?? deriveBrief(front.description, id),
      whenToUse: front.whenToUse ?? '',
      prompt: front.prompt ?? '',
      savesTokens: Number(front.savesTokens) > 0 ? Number(front.savesTokens) : 0,
      audience: front.audience ?? 'user',
      content: raw, intro, sections,
      steps: extractSteps(body),
      chars: body.trim().length,
    };
  }

  async function listSkills() {
    let entries;
    try { entries = await readdir(root, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const sk = await loadSkill(entry);
      if (sk !== undefined && sk.audience !== 'agent') out.push(sk);
    }
    const now = Date.now();
    for (const sk of out) {
      const events = await readEvents(sk.id);
      sk.stats = deriveStats(events);
      sk.score = decayScore(events, now);
    }
    out.sort((a, b) => (b.score - a.score) || (b.stats.lastUsedAt - a.stats.lastUsedAt) || a.name.localeCompare(b.name));
    return out;
  }

  async function resolvePath(id) {
    const bundle = join(root, id, 'SKILL.md');
    try { await stat(bundle); return { file: bundle, dir: join(root, id), kind: 'bundle' }; } catch { /* next */ }
    const flat = join(root, `${id}.md`);
    try { await stat(flat); return { file: flat, dir: undefined, kind: 'flat' }; } catch { return undefined; }
  }

  function audit(skills, now) {
    const day = 86400000;
    const unused = [], stale = [], stub = [], dup = [];
    for (const s of skills) {
      const ageDays = Math.round((now - (s.mtimeMs || now)) / day);
      const idleDays = s.stats.lastUsedAt > 0 ? Math.round((now - s.stats.lastUsedAt) / day) : undefined;
      // 只看实际使用：invoked / auto_loaded 才算"用过"
      const used = s.stats.invoked > 0 || s.stats.autoLoaded > 0;
      if (!used && ageDays >= NEW_GRACE_DAYS) unused.push({ id: s.id, name: s.name, ageDays });
      if (used && idleDays !== undefined && idleDays >= STALE_DAYS) {
        stale.push({ id: s.id, name: s.name, invoked: s.stats.invoked, idleDays });
      }
      if (s.chars > 0 && s.chars < STUB_CHARS) stub.push({ id: s.id, name: s.name, chars: s.chars });
    }
    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i], b = skills[j];
        const sc = Math.max(
          similarity(a.description, b.description),
          similarity(a.name, b.name),
          similarity(a.content.slice(0, 600), b.content.slice(0, 600)) * 0.9,
        );
        if (sc >= DUP_THRESHOLD) {
          dup.push({ a: a.id, b: b.id, aName: a.name, bName: b.name, score: Math.round(sc * 100) / 100 });
        }
      }
    }
    dup.sort((x, y) => y.score - x.score);
    return { unused, stale, stub, dup, total: skills.length };
  }

  function composeMarkdown(list, name, description) {
    const p = [];
    p.push('---');
    p.push('name: ' + name);
    p.push('description: ' + (description || list.map((s) => s.name).join(' → ')));
    p.push('whenToUse: 需要依次完成「' + list.map((s) => s.name).join('」「') + '」时。');
    const first = list[0].prompt && list[0].prompt.trim().length > 0 ? list[0].prompt.trim() : '';
    if (first.length > 0) p.push('prompt: ' + first);
    p.push('---');
    p.push('');
    p.push('# ' + name);
    p.push('');
    p.push('按顺序执行下列阶段，上一个完成后再开始下一个。');
    list.forEach((s, i) => {
      p.push('');
      p.push('## 阶段 ' + (i + 1) + '：' + s.name);
      if (s.description) p.push(s.description);
      const steps = s.steps.length > 0 ? s.steps : s.sections.flatMap((x) => x.text.split('\n').filter(Boolean));
      if (steps.length > 0) { p.push(''); steps.forEach((t, k) => p.push((k + 1) + '. ' + t)); }
    });
    p.push('');
    return p.join('\n');
  }

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: '/api/skill-panel',
      handler: async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://127.0.0.1');
          const route = url.pathname.replace(/^\/api\/skill-panel/, '') || '/';

          if (req.method === 'GET' && route === '/list') {
            sendJson(res, 200, { ok: true, root, skills: await listSkills() });
            return;
          }
          if (req.method === 'GET' && route === '/audit') {
            sendJson(res, 200, { ok: true, report: audit(await listSkills(), Date.now()) });
            return;
          }
          if (req.method === 'GET' && route === '/stats') {
            const skills = await listSkills();
            const used = skills.filter((s) => s.stats.invoked > 0 || s.stats.autoLoaded > 0).length;
            const totalInvocations = skills.reduce((n, s) => n + s.stats.invoked + s.stats.autoLoaded, 0);
            const totalClicks = skills.reduce((n, s) => n + s.stats.clicked, 0);
            const savedTokens = skills.reduce((n, s) => n + (s.savesTokens || 0) * (s.stats.invoked + s.stats.autoLoaded), 0);
            sendJson(res, 200, {
              ok: true,
              stats: {
                skills: skills.length, used,
                totalInvocations, totalClicks,
                savedTokens,
                top: skills.slice(0, 3).map((s) => ({ name: s.name, used: s.stats.invoked + s.stats.autoLoaded, saved: (s.savesTokens || 0) * (s.stats.invoked + s.stats.autoLoaded) })),
              },
            });
            return;
          }
          if (req.method === 'GET' && route === '/trash') {
            const entries = [];
            try {
              for (const e of await readdir(trashDir, { withFileTypes: true })) {
                let mtimeMs = 0;
                try { mtimeMs = (await stat(join(trashDir, e.name))).mtimeMs; } catch { /* ignore */ }
                const at = e.name.lastIndexOf('__');
                entries.push({ entry: e.name, id: at > 0 ? e.name.slice(0, at) : e.name, deletedAt: at > 0 ? e.name.slice(at + 2) : '', mtimeMs });
              }
            } catch { /* 空 */ }
            entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
            sendJson(res, 200, { ok: true, trashDir, entries });
            return;
          }

          if (req.method !== 'POST') { sendJson(res, 404, { ok: false, error: '未知路由 ' + req.method + ' ' + route }); return; }
          const payload = JSON.parse((await readBody(req)) || '{}');

          if (route === '/event') {
            const id = safeName(payload.skillId ?? payload.id);
            const type = payload.type === 'invoked' || payload.type === 'auto_loaded' || payload.type === 'clicked'
              ? payload.type : 'clicked';
            if (id === undefined) { sendJson(res, 400, { ok: false, error: 'bad skillId' }); return; }
            const okWrite = await appendEvent({
              ts: Date.now(),
              skillId: id,
              type,
              source: typeof payload.source === 'string' ? payload.source : 'panel',
              sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '',
              ok: payload.ok !== false,
              durMs: typeof payload.durMs === 'number' ? payload.durMs : undefined,
            });
            sendJson(res, 200, { ok: okWrite });
            return;
          }

          if (route === '/propose') {
            const id = safeName(payload.id);
            const content = payload.content;
            if (id === undefined || typeof content !== 'string') { sendJson(res, 400, { ok: false, error: '需要 id 与 content' }); return; }
            const found = await resolvePath(id);
            let old = '';
            if (found !== undefined) { try { old = await readFile(found.file, 'utf8'); } catch { /* 新技能 */ } }
            const bad = checkFrontmatter(content);
            sendJson(res, 200, { ok: true, diff: diffLines(old, content), unknownKeys: bad, isNew: found === undefined });
            return;
          }

          if (route === '/apply' || route === '/save') {
            const id = safeName(payload.id);
            const content = payload.content;
            if (id === undefined || typeof content !== 'string') { sendJson(res, 400, { ok: false, error: '需要 id 与 content' }); return; }
            const bad = checkFrontmatter(content);
            if (bad.length > 0) {
              sendJson(res, 400, { ok: false, error: 'frontmatter 含白名单外字段：' + bad.join(', ') });
              return;
            }
            const found = await resolvePath(id);
            const file = found !== undefined ? found.file : join(root, id, 'SKILL.md');
            if (found === undefined) await mkdir(join(root, id), { recursive: true });
            const version = await snapshotVersion(file);
            await atomicWrite(file, content);
            sendJson(res, 200, { ok: true, file, version });
            return;
          }

          if (route === '/delete') {
            const id = safeName(payload.id);
            if (id === undefined) { sendJson(res, 400, { ok: false, error: 'bad id' }); return; }
            const found = await resolvePath(id);
            if (found === undefined) { sendJson(res, 404, { ok: false, error: '找不到技能 ' + id }); return; }
            const dest = join(trashDir, id + '__' + new Date().toISOString().replace(/[:.]/g, '-'));
            try { await mkdir(trashDir, { recursive: true }); await rename(found.kind === 'bundle' ? found.dir : found.file, dest); }
            catch (e) { sendJson(res, 500, { ok: false, error: '移入回收站失败：' + String(e.message || e) }); return; }
            sendJson(res, 200, { ok: true, movedTo: dest });
            return;
          }

          if (route === '/restore') {
            const entry = typeof payload.entry === 'string' ? payload.entry : '';
            if (!/^[A-Za-z0-9_-]{1,64}__[0-9TZ-]+$/.test(entry)) { sendJson(res, 400, { ok: false, error: 'bad entry' }); return; }
            const id = entry.slice(0, entry.lastIndexOf('__'));
            const to = join(root, id);
            try { await stat(to); sendJson(res, 409, { ok: false, error: '同名技能已存在' }); return; } catch { /* ok */ }
            try { await rename(join(trashDir, entry), to); } catch (e) { sendJson(res, 500, { ok: false, error: '还原失败：' + String(e.message || e) }); return; }
            sendJson(res, 200, { ok: true, restoredTo: to });
            return;
          }

          if (route === '/purge') {
            const entry = typeof payload.entry === 'string' ? payload.entry : '';
            if (!/^[A-Za-z0-9_-]{1,64}__[0-9TZ-]+$/.test(entry)) { sendJson(res, 400, { ok: false, error: 'bad entry' }); return; }
            try { await rm(join(trashDir, entry), { recursive: true, force: true }); } catch (e) { sendJson(res, 500, { ok: false, error: String(e.message || e) }); return; }
            sendJson(res, 200, { ok: true });
            return;
          }

          if (route === '/compose') {
            const ids = Array.isArray(payload.ids) ? payload.ids.filter((x) => safeName(x) !== undefined) : [];
            const cname = safeName(payload.name);
            if (ids.length < 2) { sendJson(res, 400, { ok: false, error: '至少选 2 个技能' }); return; }
            if (cname === undefined) { sendJson(res, 400, { ok: false, error: '名字只能用字母数字-_' }); return; }
            const all = await listSkills();
            const picked = ids.map((id) => all.find((s) => s.id === id)).filter(Boolean);
            if (picked.length !== ids.length) { sendJson(res, 400, { ok: false, error: '有技能找不到了' }); return; }
            if ((await resolvePath(cname)) !== undefined) { sendJson(res, 409, { ok: false, error: '已存在同名技能：' + cname }); return; }
            const md = composeMarkdown(picked, cname, typeof payload.description === 'string' ? payload.description : '');
            await mkdir(join(root, cname), { recursive: true });
            await atomicWrite(join(root, cname, 'SKILL.md'), md);
            sendJson(res, 200, { ok: true, id: cname, file: join(root, cname, 'SKILL.md') });
            return;
          }

          if (route === '/invoke') {
            const iid = safeName(payload.skillId);
            if (iid === undefined) { sendJson(res, 400, { ok: false, error: 'bad skillId' }); return; }
            const ifound = await resolvePath(iid);
            if (ifound === undefined) { sendJson(res, 404, { ok: false, error: '找不到技能 ' + iid }); return; }
            await appendEvent({ ts: Date.now(), skillId: iid, type: 'invoked', source: typeof payload.source === 'string' ? payload.source : 'api', sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '', ok: true });
            const isk = (await listSkills()).find((s) => s.id === iid);
            const ictx = payload.context && typeof payload.context === 'object' ? payload.context : {};
            sendJson(res, 200, { ok: true, skill: isk, prompt: isk ? isk.prompt : '', context: ictx });
            return;
          }

          sendJson(res, 404, { ok: false, error: '未知路由 ' + req.method + ' ' + route });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error && error.message ? error.message : error) });
        }
      },
    })
  );
}

// 供测试使用
export { parseSections, extractSteps, similarity, bigrams, diffLines, checkFrontmatter, FRONTMATTER_WHITELIST };
