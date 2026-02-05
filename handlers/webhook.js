const Player = require('../models/player');
const { plugins } = require('./plugins/registry');

function cleanText(s) { return s ? s.toString().trim() : ''; }

function parseGroupParticipant(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const separators = [' إلى ', ' to ', ' -> ', ' => '];
  for (const sep of separators) {
    if (raw.includes(sep)) {
      const parts = raw.split(sep).map(s => s.trim());
      if (parts.length >= 2) return { participant: parts[0], group: parts.slice(1).join(sep).trim() };
    }
  }
  return { participant: raw.trim(), group: null };
}

module.exports = (req, res) => {
  try {
    const body = req.body || {};
    const q = body.query || {};
    const rawSender = q.sender || 'unknown';
    const sender = rawSender;
    const message = cleanText(q.message || '');
    const isGroup = !!q.isGroup;
    const groupParticipant = q.groupParticipant || '';
    const parsed = parseGroupParticipant(groupParticipant);
    const groupName = (parsed && parsed.group) || groupParticipant;

    // create or get player
    let player = Player.createOrGet(sender, q.sender || sender);
    // If expectation expired, clear it
    if (player && player.expected_until && Date.now() > player.expected_until) {
      Player.clearExpectation(sender);
      player = Player.getBySender(sender);
    }

    // set kingdom from group if possible
    Player.setKingdomFromGroup(sender, groupName);

    // incoming wrapper
    const incoming = {
      body,
      query: q,
      rawText: message,
      sender,
      isGroup,
      groupName,
      normalizedQuery: Object.assign({}, q)
    };

    // context helpers
    let chosenReply = null;
    const ctx = {
      reply: (msg) => {
        chosenReply = typeof msg === 'string' ? msg : (msg.message || JSON.stringify(msg));
        return { message: chosenReply };
      }
    };

    // dispatch to plugins in priority order; first plugin that produces a reply wins
    for (const p of plugins) {
      try {
        if (typeof p.canHandle === 'function' && p.canHandle(incoming, player)) {
          const result = p.handle(incoming, player, ctx);
          if (chosenReply) break;
        }
      } catch (e) {
        console.error('Plugin error', e);
      }
    }

    // if plugin produced no reply, send empty replies array
    if (!chosenReply) return res.json({ replies: [] });

    // attach notifications if any (concatenate) — notifications are shown when user sends any message
    const notes = Player.popNotifications(sender) || [];
    if (notes.length > 0) {
      const notifText = '🔔═🔔اشعارات جديدة 🔔 ═🔔\n' + notes.map(n => n.text).join('\n' + ' ═ ═ ═ ═ ═ ═ ═ ═ ═  \n');
      chosenReply = chosenReply + '\n\n' + notifText;
    }

    console.log('Reply to', sender, chosenReply);
    return res.json({ replies: [ { message: chosenReply } ] });

  } catch (err) {
    console.error('Webhook error', err);
    return res.status(500).json({ replies: [] });
  }
};