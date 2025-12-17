import app from './app';
import connectDB from './config/db';
import dotenv from 'dotenv';
import { logError, logInfo } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3002;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            logInfo('server.started', { port: PORT });
        });
    })
    .catch((error) => {
        logError('server.start.failure', { port: PORT }, error as Error);
        process.exit(1);
    });
