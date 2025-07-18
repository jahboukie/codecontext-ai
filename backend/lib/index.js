"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMonthlyUsage = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Create Express app
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
// Generate secure API key
function generateApiKey() {
    return 'ccp_' + crypto_1.default.randomBytes(32).toString('hex');
}
// Validate API key and get user
async function validateApiKey(apiKey) {
    try {
        const userQuery = await db.collection('users')
            .where('apiKey', '==', apiKey)
            .limit(1)
            .get();
        if (userQuery.empty) {
            return null;
        }
        return userQuery.docs[0].data();
    }
    catch (error) {
        console.error('Error validating API key:', error);
        return null;
    }
}
// Create or update user after authentication
app.post('/api/v1/users/create', async (req, res) => {
    var _a;
    try {
        const { uid, email, displayName } = req.body;
        if (!uid || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if user already exists
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return res.json({
                message: 'User already exists',
                apiKey: (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.apiKey
            });
        }
        // Create new user with API key
        const apiKey = generateApiKey();
        const now = admin.firestore.Timestamp.now();
        const resetDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        );
        const userData = {
            uid,
            email,
            displayName: displayName || '',
            apiKey,
            subscriptionTier: 'starter', // Default to starter
            subscriptionStatus: 'inactive', // Inactive until payment
            usage: {
                executions: {
                    used: 0,
                    limit: 25, // Starter limit
                    resetDate
                },
                files: {
                    tracked: 0,
                    limit: 25 // Starter limit
                }
            },
            createdAt: now,
            updatedAt: now
        };
        await db.collection('users').doc(uid).set(userData);
        res.json({
            message: 'User created successfully',
            apiKey,
            subscriptionTier: userData.subscriptionTier,
            usage: userData.usage
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user info by API key
app.get('/api/v1/users/me', async (req, res) => {
    var _a;
    try {
        const apiKey = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!apiKey) {
            return res.status(401).json({ error: 'Missing API key' });
        }
        const user = await validateApiKey(apiKey);
        if (!user) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Don't return sensitive data
        const { apiKey: _ } = user, userInfo = __rest(user, ["apiKey"]);
        res.json(userInfo);
    }
    catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// CRITICAL: Validate execution usage (UNGAMEABLE)
app.post('/api/v1/executions/validate', async (req, res) => {
    var _a;
    try {
        const apiKey = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!apiKey) {
            return res.status(401).json({ error: 'Missing API key' });
        }
        const user = await validateApiKey(apiKey);
        if (!user) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Check subscription status
        if (user.subscriptionStatus !== 'active') {
            return res.status(403).json({
                error: 'Subscription required',
                message: 'Please activate your subscription to use executions'
            });
        }
        // Check if usage limit exceeded
        if (user.usage.executions.used >= user.usage.executions.limit) {
            return res.status(429).json({
                error: 'Usage limit exceeded',
                message: `You have used ${user.usage.executions.used}/${user.usage.executions.limit} executions this month`,
                resetDate: user.usage.executions.resetDate.toDate()
            });
        }
        // Increment usage atomically (CRITICAL FOR SECURITY)
        const userRef = db.collection('users').doc(user.uid);
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found');
            }
            const currentUser = userDoc.data();
            // Double-check limits in transaction
            if (currentUser.usage.executions.used >= currentUser.usage.executions.limit) {
                throw new Error('Usage limit exceeded');
            }
            // Increment usage
            transaction.update(userRef, {
                'usage.executions.used': admin.firestore.FieldValue.increment(1),
                'updatedAt': admin.firestore.Timestamp.now()
            });
        });
        // Return success with updated usage
        const updatedUser = await validateApiKey(apiKey);
        res.json({
            success: true,
            message: 'Execution validated',
            usage: updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.usage.executions
        });
    }
    catch (error) {
        console.error('Error validating execution:', error);
        if (error.message === 'Usage limit exceeded') {
            return res.status(429).json({
                error: 'Usage limit exceeded',
                message: 'You have reached your monthly execution limit'
            });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update subscription (called by Stripe webhooks)
app.post('/api/v1/subscriptions/update', async (req, res) => {
    try {
        const { uid, tier, status, stripeCustomerId, stripeSubscriptionId } = req.body;
        if (!uid || !tier || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Update subscription and usage limits
        const limits = tier === 'pro' ? { executions: 700, files: 1000 } : { executions: 25, files: 25 };
        await userRef.update({
            subscriptionTier: tier,
            subscriptionStatus: status,
            stripeCustomerId,
            stripeSubscriptionId,
            'usage.executions.limit': limits.executions,
            'usage.files.limit': limits.files,
            updatedAt: admin.firestore.Timestamp.now()
        });
        res.json({ message: 'Subscription updated successfully' });
    }
    catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Reset monthly usage (called by scheduled function)
app.post('/api/v1/usage/reset', async (req, res) => {
    try {
        const batch = db.batch();
        const now = admin.firestore.Timestamp.now();
        const nextResetDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        // Get all users whose reset date has passed
        const usersQuery = await db.collection('users')
            .where('usage.executions.resetDate', '<=', now)
            .get();
        usersQuery.docs.forEach((doc) => {
            batch.update(doc.ref, {
                'usage.executions.used': 0,
                'usage.executions.resetDate': nextResetDate,
                'updatedAt': now
            });
        });
        await batch.commit();
        res.json({
            message: 'Usage reset completed',
            usersReset: usersQuery.size
        });
    }
    catch (error) {
        console.error('Error resetting usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Export the API
exports.api = functions.https.onRequest(app);
// Scheduled function to reset usage monthly
exports.resetMonthlyUsage = functions.pubsub
    .schedule('0 0 1 * *') // First day of every month at midnight
    .onRun(async (context) => {
    try {
        const batch = db.batch();
        const now = admin.firestore.Timestamp.now();
        const nextResetDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        const usersQuery = await db.collection('users')
            .where('usage.executions.resetDate', '<=', now)
            .get();
        usersQuery.docs.forEach((doc) => {
            batch.update(doc.ref, {
                'usage.executions.used': 0,
                'usage.executions.resetDate': nextResetDate,
                'updatedAt': now
            });
        });
        await batch.commit();
        console.log(`Monthly usage reset completed for ${usersQuery.size} users`);
    }
    catch (error) {
        console.error('Error in scheduled usage reset:', error);
    }
});
//# sourceMappingURL=index.js.map