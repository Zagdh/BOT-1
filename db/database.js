const sqlite3 = require('sqlite3').verbose();

// Initialize SQLite3 Database
const db = new sqlite3.Database('./data/bot1.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQlite database.');
    }
});

module.exports = db;
