const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function loadData() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n'); }
function send(res, status, body, type = 'application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); }
function parseBody(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function publicFile(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.normalize(path.join(ROOT, requested));
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (error, content) => error ? send(res, 404, { error: 'Not found' }) : send(res, 200, content, MIME[path.extname(file)] || 'application/octet-stream'));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const data = loadData();
      if (req.method === 'GET' && req.url === '/api/state') return send(res, 200, data);
      if (req.method === 'POST' && req.url === '/api/check-in') {
        const body = await parseBody(req);
        const collection = body.type === 'habit' ? data.habits : data.rooms;
        const item = collection.find(entry => entry.id === body.id);
        if (!item) return send(res, 404, { error: 'Item not found' });
        if (item.checkedToday) return send(res, 409, { error: 'Already checked in today' });
        item.checkedToday = true;
        if (body.type === 'room') {
          item.yourStreak += 1;
          item.yourRank = Math.max(1, item.yourRank - (item.yourRank > 1 ? 1 : 0));
          const player = item.leaderboard.find(entry => entry.you);
          if (player) { player.score += 1; player.streak += 1; }
        } else {
          item.streak += 1;
          item.totalCheckins += 1;
        }
        data.activity.unshift({ text: `You checked in to ${item.name}`, time: 'Just now', type: 'check' });
        data.activity = data.activity.slice(0, 6);
        saveData(data);
        return send(res, 200, { item, user: data.user, activity: data.activity });
      }
      if (req.method === 'POST' && req.url === '/api/habits') {
        const body = await parseBody(req);
        if (!body.name?.trim()) return send(res, 400, { error: 'Habit name is required' });
        const habit = { id: crypto.randomUUID(), name: body.name.trim(), frequency: body.frequency || 'Daily', streak: 0, bestStreak: 0, totalCheckins: 0, color: body.color || 'coral', checkedToday: false, history: [false, false, false, false, false, false, false] };
        data.habits.push(habit); saveData(data); return send(res, 201, habit);
      }
      if (req.method === 'POST' && req.url === '/api/rooms') {
        const body = await parseBody(req);
        if (!body.name?.trim() || !body.topic?.trim()) return send(res, 400, { error: 'Room name and goal are required' });
        const room = { id: crypto.randomUUID(), name: body.name.trim(), topic: body.topic.trim(), status: 'waiting', daysLeft: Number(body.days) || 14, totalDays: Number(body.days) || 14, pot: (Number(body.entryFee) || 0) * (Number(body.maxParticipants) || 8), participants: 1, maxParticipants: Number(body.maxParticipants) || 8, yourRank: 1, yourStreak: 0, checkedToday: false, color: 'yellow', leaderboard: [{ name: data.user.name, initials: data.user.initials, score: 0, streak: 0, you: true }] };
        data.rooms.unshift(room); saveData(data); return send(res, 201, room);
      }
      return send(res, 404, { error: 'API route not found' });
    }
    publicFile(req, res);
  } catch (error) { send(res, 500, { error: error.message }); }
});
server.listen(PORT, () => console.log(`Habit Arena running at http://localhost:${PORT}`));
