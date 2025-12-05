import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    available: { type: Boolean, default: false, required: true },
    address: { type: String, required: true },
    location: { type: String, required: true },
    image: { type: String, required: true }
});

export const Restaurant = mongoose.model('Restaurant', RestaurantSchema);
