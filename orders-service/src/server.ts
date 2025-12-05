import app from './app';
import connectDB from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3002;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Orders service running on port ${PORT}`);
    });
});
