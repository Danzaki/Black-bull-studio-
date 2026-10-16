// Indexer na sababbin pairs (pump.fun): yana karanta chain ta WebSocket kuma yana rubuta a Supabase.
// Babu dependency. Yana buƙatar Node 22 ko sama.
const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const MINT_AUTH = 'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WATCH = process.env.WATCH || MINT_AUTH;
if (!HELIUS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing HELIUS_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const KEEP_HOURS = 24;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const stats = { notifs: 0, creates: 0, saved: 0, fallback: 0, errors: 0 };
const queue = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const clean = (v) => (typeof v === 'string' ? v.replace(/\u0000/g, '').slice(0, 300) : null);

function b58(buf) {
  let n = 0n;
  for (const byte of buf) n = n * 256n + BigInt(byte);
  let s = '';
  while (n > 0n) {
    s = ALPHABET[Number(n % 58n)] + s;
    n /= 58n;
  }
  for (const byte of buf) {
    if (byte === 0) s = '1' + s;
    else break;
  }
  return s;
}

// Yana karanta CreateEvent daga "Program data" na logs (name, symbol, uri, mint, bonding curve, creator)
function parseEvent(logs) {
  for (const line of logs) {
    if (!line.startsWith('Program data: ')) continue;
    try {
      const buf = Buffer.from(line.slice(14), 'base64');
      let o = 8;
      const str = () => {
        const len = buf.readUInt32LE(o);
        o += 4;
        if (len > 400 || o + len > buf.length) throw new Error('bad');
        const v = buf.toString('utf8', o, o + len);
        o += len;
        return v;
      };
      const name = str();
      const symbol = str();
      const uri = str();
      if (!/^(https?:|ipfs:)/.test(uri) || buf.length < o + 96) continue;
      return {
        name,
        symbol,
        uri,
        mint: b58(buf.subarray(o, o + 32)),
        bondingCurve: b58(buf.subarray(o + 32, o + 64)),
        creator: b58(buf.subarray(o + 64, o + 96)),
      };
    } catch {}
  }
  return null;
}

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

// Idan karanta event ya kasa, a ɗauko mint daga transaction kai tsaye
async function mintFromTx(signature) {
  for (let i = 0; i < 5; i++) {
    const tx = await rpc('getTransaction', [
      signature,
      { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
    ]).catch(() => null);
    if (tx) {
      const ix = tx.transaction.message.instructions.find((x) => x.programId === PUMP_PROGRAM);
      const mint = ix?.accounts?.[0];
      const creator = tx.transaction.message.accountKeys?.[0]?.pubkey ?? null;
      return mint ? { mint, creator } : null;
    }
    await sleep(500);
  }
  return null;
}

async function onNotification(value, slot) {
  stats.notifs++;
  if (value.err) return;
  const logs = value.logs || [];
  const isCreate = logs.some(
    (l) => l === 'Program log: Instruction: Create' || l === 'Program log: Instruction: CreateV2'
  );
  if (!isCreate) return;
  stats.creates++;

  let info = parseEvent(logs);
  if (!info) {
    const t = await mintFromTx(value.signature);
    if (!t) {
      stats.errors++;
      return;
    }
    info = { name: null, symbol: null, uri: null, mint: t.mint, bondingCurve: null, creator: t.creator };
    stats.fallback++;
  }

  console.log('+', info.symbol || '?', info.mint);
  queue.push({
    mint: info.mint,
    name: clean(info.name),
    symbol: clean(info.symbol),
    uri: clean(info.uri),
    creator: info.creator,
    bonding_curve: info.bondingCurve,
    signature: value.signature,
    slot: slot ?? null,
    source: 'pumpfun',
  });
}

async function flush() {
  if (!queue.length) return;
  const rows = queue.splice(0, queue.length);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/new_pairs?on_conflict=mint`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (res.ok) {
      stats.saved += rows.length;
    } else {
      stats.errors++;
      console.error('supabase', res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    stats.errors++;
    console.error('supabase fetch failed:', e.message);
  }
}

async function cleanup() {
  const cutoff = new Date(Date.now() - KEEP_HOURS * 3600 * 1000).toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/new_pairs?created_at=lt.${encodeURIComponent(cutoff)}`, {
    method: 'DELETE',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
  }).catch(() => {});
}

let ws;
let lastMsg = Date.now();
let backoff = 1000;

function connect() {
  ws = new WebSocket(WS_URL);
  ws.addEventListener('open', () => {
    backoff = 1000;
    lastMsg = Date.now();
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'logsSubscribe',
        params: [{ mentions: [WATCH] }, { commitment: 'confirmed' }],
      })
    );
    console.log('connected, watching', WATCH);
  });
  ws.addEventListener('message', (ev) => {
    lastMsg = Date.now();
    let m;
    try {
      m = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    } catch {
      return;
    }
    if (m.method === 'logsNotification') {
      const r = m.params?.result;
      if (r?.value) void onNotification(r.value, r.context?.slot);
    } else if (m.id === 1 && m.error) {
      console.error('subscribe error:', JSON.stringify(m.error));
    }
  });
  ws.addEventListener('close', () => {
    console.log('closed, retrying in', backoff, 'ms');
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30000);
  });
  ws.addEventListener('error', () => {
    try {
      ws.close();
    } catch {}
  });
}

setInterval(flush, 1000);
setInterval(cleanup, 30 * 60 * 1000);
setInterval(() => {
  if (ws && ws.readyState === 1 && Date.now() - lastMsg > 120000) ws.close();
}, 30000);
setInterval(() => {
  console.log(
    `[${new Date().toISOString().slice(11, 19)}] notifs=${stats.notifs} creates=${stats.creates} saved=${stats.saved} fallback=${stats.fallback} errors=${stats.errors}`
  );
  if (stats.notifs === 0 && Date.now() - lastMsg > 90000) {
    console.log('No events yet. Try program mode: WATCH=' + PUMP_PROGRAM + ' (heavier on data)');
  }
}, 30000);

void cleanup();
connect();
