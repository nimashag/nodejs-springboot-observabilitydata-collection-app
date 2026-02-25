import mongoose from 'mongoose';
import { mongooseQueryTracker } from './mongoosePlugin';

mongoose.plugin(mongooseQueryTracker);
