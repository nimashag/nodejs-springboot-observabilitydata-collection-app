import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    name: { type: String, required: true },
    price: { type: Number,required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
});

export const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
