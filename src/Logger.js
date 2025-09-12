const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'crawler.log');

// Vymažeme starý log soubor při každém spuštění
try {
  fs.writeFileSync(logFile, '');
} catch (err) {
  console.error("Nepodařilo se vymazat crawler.log:", err);
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: logFile })
  ],
});

module.exports = logger;
