const fs = require('fs');
const path = require('path');

const plugins = [];
const PLUGINS_DIR = path.join(__dirname, 'plugins');
if (fs.existsSync(PLUGINS_DIR)) {
  for (const f of fs.readdirSync(PLUGINS_DIR)) {
    if (f.endsWith('.js')) {
      try {
        const mod = require(path.join(PLUGINS_DIR, f));
        if (mod && typeof mod.canHandle === 'function' && typeof mod.handle === 'function') {
          plugins.push(mod);
        }
      } catch (e) {
        console.error('Failed to load plugin', f, e);
      }
    }
  }
}

// sort by priority (lower number = higher priority)
plugins.sort((a,b) => (a.priority||100) - (b.priority||100));

module.exports = { plugins };