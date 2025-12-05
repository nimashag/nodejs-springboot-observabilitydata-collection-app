import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Allowed user roles
export type UserRole = 'customer' | 'restaurantAdmin' | 'deliveryPersonnel' | 'appAdmin';

// User document interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
  phone?: string;
  address?: string;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'restaurantAdmin', 'deliveryPersonnel', 'appAdmin'],
      required: true,
    },
    isApproved: { type: Boolean, default: false },

    phone: { type: String },
    address: { type: String },

  },
  { timestamps: true }
);

// Password hashing
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default model<IUser>('User', userSchema);
