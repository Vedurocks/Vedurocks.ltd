const mongoose = require('mongoose');

// In-memory fallback for quick testing
const memoryUsers = new Map();

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    password: { 
        type: String,
        select: false // Don't include password in queries by default
    },
    provider: { 
        type: String, 
        enum: ['github', 'email'],
        required: true
    },
    providerId: String,
    avatar: String,
    username: String,
    bio: String,
    location: String,
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method for memory fallback
userSchema.statics.findByEmail = async function(email) {
    if (mongoose.connection.readyState !== 1) {
        return memoryUsers.get(email.toLowerCase()) || null;
    }
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.createUser = async function(userData) {
    if (mongoose.connection.readyState !== 1) {
        const user = { ...userData, _id: Date.now().toString() };
        memoryUsers.set(userData.email.toLowerCase(), user);
        return user;
    }
    return this.create(userData);
};

module.exports = mongoose.model('User', userSchema);
