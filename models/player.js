const db = require('../db/database');

function now() { return Date.now(); }

function parseRow(row) {
  if (!row) return null;
  return Object.assign({}, row, { data: row.data ? JSON.parse(row.data) : {} });
}

const getBySender = (sender) => {
  const row = db.prepare('SELECT * FROM players WHERE sender = ?').get(sender);
  return parseRow(row);
};

const createOrGet = (sender, displayName) => {
  let p = getBySender(sender);
  if (p) return p;
  const ts = now();
  const initialData = {
    welcomeShown: false,
    notifications: [],
    nickname: null,
    coins: 0,
    pendingNickname: null
  };
  db.prepare(`INSERT INTO players (sender, display_name, state, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(sender, displayName || sender, 'new', JSON.stringify(initialData), ts, ts);
  return getBySender(sender);
};

const update = (sender, fields) => {
  const currentRow = db.prepare('SELECT * FROM players WHERE sender = ?').get(sender);
  if (!currentRow) return null;
  let dataObj = currentRow.data ? JSON.parse(currentRow.data) : {};
  if (fields.data) {
    dataObj = Object.assign({}, dataObj, fields.data);
    delete fields.data;
  }
  const setParts = [];
  const vals = [];
  for (const k of Object.keys(fields)) {
    setParts.push(`${k} = ?`);
    vals.push(fields[k]);
  }
  // ensure data column present
  setParts.push('data = ?');
  vals.push(JSON.stringify(dataObj));
  vals.push(now()); // updated_at
  vals.push(sender);
  const sql = `UPDATE players SET ${setParts.join(', ')} , updated_at = ? WHERE sender = ?`;
  db.prepare(sql).run(...vals);
  return getBySender(sender);
};

const normalizeNick = (nick) => {
  if (!nick) return '';
  return nick.toString().trim().toLowerCase();
};

const isNicknameTaken = (nickname) => {
  if (!nickname) return { taken: false };
  const n = normalizeNick(nickname);
  const rows = db.prepare('SELECT sender, data FROM players').all();
  for (const r of rows) {
    if (!r.data) continue;
    try {
      const d = JSON.parse(r.data);
      if (d.nickname && normalizeNick(d.nickname) === n) return { taken: true, by: r.sender };
    } catch (e) { /* ignore parse errors */ }
  }
  return { taken: false };
};

const findByNickname = (nickname) => {
  if (!nickname) return null;
  const n = normalizeNick(nickname);
  const rows = db.prepare('SELECT * FROM players').all();
  for (const r of rows) {
    try {
      const d = r.data ? JSON.parse(r.data) : {};
      if (d.nickname && normalizeNick(d.nickname) === n) return parseRow(Object.assign({}, r, { data: JSON.stringify(d) }));
    } catch (e) { }
  }
  return null;
};

const setPendingNickname = (sender, nickname) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  data.pendingNickname = nickname;
  return update(sender, { data });
};

const clearPendingNickname = (sender) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  delete data.pendingNickname;
  return update(sender, { data });
};

const confirmNickname = (sender) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  const nick = data.pendingNickname;
  if (!nick) return null;
  data.nickname = nick;
  delete data.pendingNickname;
  return update(sender, { data });
};

const addCoins = (sender, amount = 0) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  data.coins = (data.coins || 0) + amount;
  return update(sender, { data });
};

const addNotification = (sender, notificationText) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  data.notifications = data.notifications || [];
  data.notifications.push({ text: notificationText, at: now() });
  return update(sender, { data });
};

const popNotifications = (sender) => {
  const p = getBySender(sender);
  if (!p) return [];
  const data = p.data || {};
  const notes = data.notifications || [];
  data.notifications = [];
  update(sender, { data });
  return notes;
};

const setWelcomeShown = (sender, shown = true) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  data.welcomeShown = !!shown;
  return update(sender, { data });
};

const finalizeRegistration = (sender, kingdom) => {
  const p = getBySender(sender);
  if (!p) return null;
  const data = p.data || {};
  data.registeredAt = now();
  return update(sender, { state: 'registered', kingdom: kingdom || p.kingdom, data });
};

const setExpectation = (sender, expected_type, expected_meta = {}, ttlMs = 5*60*1000) => {
  const until = Date.now() + ttlMs;
  return update(sender, {
    expected_type,
    expected_meta: JSON.stringify(expected_meta),
    expected_until: until
  });
};

const clearExpectation = (sender) => update(sender, { expected_type: null, expected_meta: null, expected_until: null });

const setKingdomFromGroup = (sender, groupName) => {
  if (!groupName) return update(sender, {});
  const name = groupName.toUpperCase();
  const mapping = {
    'FALORYA KINGDOM': 'فالوريا',
    'AZMAR KINGDOM': 'ازمار',
    'DIVALA KINGDOM': 'ديفالا'
  };
  let matched = null;
  for (const key of Object.keys(mapping)) {
    if (name.includes(key)) { matched = mapping[key]; break; }
  }
  if (!matched) {
    const arabic = { 'فالوريا':'فالوريا', 'ازمار':'ازمار', 'ديفالا':'ديفالا' };
    for (const k of Object.keys(arabic)) {
      if (groupName.includes(k)) { matched = arabic[k]; break; }
    }
  }
  if (matched) {
    return update(sender, { kingdom: matched });
  }
  return update(sender, {});
};

module.exports = {
  getBySender,
  createOrGet,
  update,
  isNicknameTaken,
  findByNickname,
  setPendingNickname,
  clearPendingNickname,
  confirmNickname,
  addCoins,
  addNotification,
  popNotifications,
  setWelcomeShown,
  finalizeRegistration,
  setExpectation,
  clearExpectation,
  setKingdomFromGroup
};
