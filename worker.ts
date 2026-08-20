export interface Env {
  LEADERBOARD: DurableObjectNamespace;
  CLOUDSAVE: DurableObjectNamespace;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  kills: number;
  time: number;
  character: string;
  date: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function notFound(): Response {
  return json({ error: 'Not found' }, 404);
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// ─── Leaderboard Durable Object ───
export class LeaderboardDO {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/submit') {
      const body = (await request.json()) as Partial<LeaderboardEntry>;
      const entry: LeaderboardEntry = {
        name: String(body.name || 'Unknown').slice(0, 20),
        score: Math.max(0, Math.floor(Number(body.score) || 0)),
        wave: Math.max(0, Math.floor(Number(body.wave) || 0)),
        kills: Math.max(0, Math.floor(Number(body.kills) || 0)),
        time: Math.max(0, Math.floor(Number(body.time) || 0)),
        character: String(body.character || 'scrapper').slice(0, 20),
        date: new Date().toISOString()
      };

      const stored = await this.state.storage.get<LeaderboardEntry[]>('scores');
      const scores: LeaderboardEntry[] = stored || [];
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const trimmed = scores.slice(0, 100);
      await this.state.storage.put('scores', trimmed);

      const rank = trimmed.findIndex(s => s === entry) + 1;
      return json({ success: true, rank: rank > 0 ? rank : undefined });
    }

    if (request.method === 'GET' && url.pathname === '/list') {
      const stored = await this.state.storage.get<LeaderboardEntry[]>('scores');
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
      return json({ scores: (stored || []).slice(0, limit) });
    }

    return notFound();
  }
}

// ─── Cloud Save Durable Object ───
export class CloudSaveDO {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const saveId = pathParts[0];
    if (!saveId) return notFound();

    if (request.method === 'POST') {
      const body = await request.json();
      await this.state.storage.put(`save:${saveId}`, body);
      return json({ success: true });
    }

    if (request.method === 'GET') {
      const data = await this.state.storage.get(`save:${saveId}`);
      if (data === undefined) return notFound();
      return json(data);
    }

    return notFound();
  }
}

// ─── Main Worker Entry ───
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const addCors = (res: Response): Response => {
      const h = new Headers(res.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    };

    // ── Leaderboard routes ──
    if (url.pathname.startsWith('/leaderboard')) {
      const id = env.LEADERBOARD.idFromName('global');
      const stub = env.LEADERBOARD.get(id);
      const innerPath = url.pathname.replace('/leaderboard', '') || '/list';
      const innerUrl = new URL(innerPath + url.search, url);
      const res = await stub.fetch(new Request(innerUrl, request));
      return addCors(res);
    }

    // ── Cloud Save routes ──
    if (url.pathname.startsWith('/save')) {
      const saveId = url.pathname.split('/')[2];
      if (!saveId) {
        return addCors(json({ error: 'Missing save ID' }, 400));
      }
      const id = env.CLOUDSAVE.idFromName(saveId);
      const stub = env.CLOUDSAVE.get(id);
      const innerUrl = new URL('/' + saveId + url.search, url);
      const res = await stub.fetch(new Request(innerUrl, request));
      return addCors(res);
    }

    return addCors(notFound());
  }
} satisfies ExportedHandler<Env>;
