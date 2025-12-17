import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logError, logInfo } from '../utils/logger';

dotenv.config();

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/my-app';
    try {
        await mongoose.connect(mongoUri);
        logInfo('db.connected', { uri: mongoUri });
    } catch (error) {
        logError('db.connection.error', { uri: mongoUri }, error as Error);
        process.exit(1);
    }
};

export default connectDB;
