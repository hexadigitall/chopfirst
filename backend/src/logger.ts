import pino from 'pino';

const isVercel = !!process.env.VERCEL;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isVercel ? 'info' : 'debug'),
  transport: isVercel ? undefined : {
    target: 'pino/file',
    options: { destination: 1 },
  },
  formatters: {
    level(label) { return { level: label }; },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
