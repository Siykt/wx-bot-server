import winston, { format } from 'winston';

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf((info) => `${info.level} ${info.timestamp}: ${info.message}`)
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log', maxFiles: 5, maxsize: 5242880, tailable: true }),
    new winston.transports.Console({
      level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf((info) => `${info.level} ${info.timestamp}: ${info.message}`)
      ),
    }),
  ],
});

export default logger;
