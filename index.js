const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const webhook = require('./handlers/webhook');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(helmet());
app.use(bodyParser.json({ limit: '200kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.post('/', webhook);
app.get('/', (req, res) => res.send('AutoResponder webhook running. POST JSON to /'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
