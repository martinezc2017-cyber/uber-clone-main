import { v4 as uuidv4 } from 'uuid';
import pinoHttp from 'pino-http';

export const requestLogger = pinoHttp({
  genReqId: () => uuidv4(),
  customLogLevel: (res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
});
