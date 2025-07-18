import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import * as crypto from 'crypto';

// Conditional Stripe import - only load if needed
let stripe: any = null;
const initializeStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }
  return stripe;
};

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Types
interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  apiKey: string;
  subscriptionTier: 'starter' | 'professional' | 'team';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage: {
    executions: {
      used: number;
      limit: number;
      resetDate: admin.firestore.Timestamp;
    };
    files: {
      tracked: number;
      limit: number;
    };
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Generate secure API key
function generateApiKey(): string {
  return 'ccp_' + crypto.randomBytes(32).toString('hex');
}

// Developer Key Interface
interface DeveloperKeyData {
  apiKey: string;
  keyId: string;
  type: 'DEVELOPER';
  tier: 'UNLIMITED';
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
  permissions: {
    executions: 'UNLIMITED';
    fileTracking: 'UNLIMITED';
    memoryRetention: 'UNLIMITED';
    advancedFeatures: boolean;
  };
  usage: {
    totalExecutions: number;
    monthlyExecutions: number;
    lastUsed: admin.firestore.Timestamp | null;
  };
}

// Validate API key and get user (supports both regular users and developer keys)
async function validateApiKey(apiKey: string): Promise<UserData | DeveloperKeyData | null> {
  try {
    // First check if it's a developer key
    if (apiKey.startsWith('ccp_dev_')) {
      const devKeyQuery = await db.collection('developerKeys')
        .where('apiKey', '==', apiKey)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (!devKeyQuery.empty) {
        const devKey = devKeyQuery.docs[0].data() as DeveloperKeyData;

        // Update last used timestamp
        await devKeyQuery.docs[0].ref.update({
          'usage.lastUsed': admin.firestore.Timestamp.now(),
          'usage.totalExecutions': admin.firestore.FieldValue.increment(1)
        });

        return devKey;
      }
    }

    // Check regular user API keys
    const userQuery = await db.collection('users')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return null;
    }

    return userQuery.docs[0].data() as UserData;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

// Create or update user after authentication
app.post('/api/v1/users/create', async (req: any, res: any) => {
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
        apiKey: userDoc.data()?.apiKey 
      });
    }
    
    // Create new user with API key
    const apiKey = generateApiKey();
    const now = admin.firestore.Timestamp.now();
    const resetDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    );
    
    const userData: UserData = {
      uid,
      email,
      displayName: displayName || '',
      apiKey,
      subscriptionTier: 'starter', // Default to starter
      subscriptionStatus: 'inactive', // Inactive until payment
      usage: {
        executions: {
          used: 0,
          limit: 50, // New Starter limit ($29.99)
          resetDate
        },
        files: {
          tracked: 0,
          limit: 50 // New Starter limit ($29.99)
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
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user info by API key
app.get('/api/v1/users/me', async (req: any, res: any) => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }
    
    const user = await validateApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Don't return sensitive data
    const { apiKey: _, ...userInfo } = user;
    res.json(userInfo);
    
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRITICAL: Validate execution usage (UNGAMEABLE) - Supports Developer Keys
app.post('/api/v1/executions/validate', async (req: any, res: any) => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Handle Developer Keys (UNLIMITED ACCESS)
    if (apiKey.startsWith('ccp_dev_') && 'type' in user && user.type === 'DEVELOPER') {
      const devKey = user as DeveloperKeyData;

      if (devKey.status !== 'ACTIVE') {
        return res.status(403).json({
          error: 'Developer key inactive',
          message: 'This developer key has been deactivated'
        });
      }

      // Developer keys have unlimited access - no usage tracking needed
      return res.json({
        success: true,
        message: 'Developer execution validated',
        type: 'DEVELOPER',
        tier: 'UNLIMITED',
        usage: {
          used: devKey.usage.totalExecutions,
          limit: 'UNLIMITED',
          resetDate: null
        }
      });
    }

    // Handle Regular User Keys
    const regularUser = user as UserData;

    // Check subscription status
    if (regularUser.subscriptionStatus !== 'active') {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Please activate your subscription to use executions'
      });
    }

    // Check if usage limit exceeded
    if (regularUser.usage.executions.used >= regularUser.usage.executions.limit) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        message: `You have used ${regularUser.usage.executions.used}/${regularUser.usage.executions.limit} executions this month`,
        resetDate: regularUser.usage.executions.resetDate.toDate()
      });
    }

    // Increment usage atomically (CRITICAL FOR SECURITY)
    const userRef = db.collection('users').doc(regularUser.uid);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentUser = userDoc.data() as UserData;

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
    const updatedUser = await validateApiKey(apiKey) as UserData;

    res.json({
      success: true,
      message: 'Execution validated',
      type: 'USER',
      tier: updatedUser.subscriptionTier,
      usage: updatedUser.usage.executions
    });

  } catch (error) {
    console.error('Error validating execution:', error);

    if ((error as Error).message === 'Usage limit exceeded') {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        message: 'You have reached your monthly execution limit'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe webhook handler (SECURE) - Conditional loading
app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const stripeInstance = initializeStripe();

  if (!stripeInstance) {
    console.error('Stripe not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: any;

  try {
    event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('Received Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('Received Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful checkout
async function handleCheckoutCompleted(session: any) {
  const { customer, client_reference_id, metadata } = session;

  if (!client_reference_id) {
    console.error('No client_reference_id in checkout session');
    return;
  }

  // client_reference_id should be the Firebase UID
  const uid = client_reference_id;
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error('User not found for UID:', uid);
    return;
  }

  // Determine tier from metadata or session
  const tier = metadata?.tier || 'starter';

  await userRef.update({
    stripeCustomerId: customer,
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log(`Checkout completed for user ${uid}, tier: ${tier}`);
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userQuery = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userDoc = userQuery.docs[0];
  const userRef = userDoc.ref;

  // Determine tier from subscription metadata or price
  const tier = subscription.metadata?.tier || 'starter';
  const status = subscription.status === 'active' ? 'active' : 'inactive';

  // Update subscription and usage limits
  let limits;
  switch (tier) {
    case 'starter':
      limits = { executions: 50, files: 50 }; // $29.99/month
      break;
    case 'professional':
      limits = { executions: 700, files: 1000 }; // $199/month
      break;
    case 'team':
      limits = { executions: 1500, files: 2000 }; // $499/user/month
      break;
    default:
      limits = { executions: 50, files: 50 };
  }

  await userRef.update({
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    subscriptionTier: tier,
    'usage.executions.limit': limits.executions,
    'usage.files.limit': limits.files,
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log(`Subscription updated for customer ${customerId}: ${tier} (${status})`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;

  const userQuery = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userRef = userQuery.docs[0].ref;

  await userRef.update({
    subscriptionStatus: 'cancelled',
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log(`Subscription cancelled for customer ${customerId}`);
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: any) {
  console.log(`Payment succeeded for customer ${invoice.customer}`);
  // Additional logic for payment success if needed
}

// Handle failed payment
async function handlePaymentFailed(invoice: any) {
  console.log(`Payment failed for customer ${invoice.customer}`);
  // Additional logic for payment failure if needed
}

// Update subscription (legacy endpoint - keeping for backward compatibility)
app.post('/api/v1/subscriptions/update', async (req: any, res: any) => {
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

    // Update subscription and usage limits based on new pricing structure
    let limits;
    switch (tier) {
      case 'starter':
        limits = { executions: 50, files: 50 }; // $29.99/month
        break;
      case 'professional':
        limits = { executions: 700, files: 1000 }; // $199/month
        break;
      case 'team':
        limits = { executions: 1500, files: 2000 }; // $499/user/month
        break;
      default:
        limits = { executions: 50, files: 50 }; // Default to starter
    }

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

  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset monthly usage (called by scheduled function)
app.post('/api/v1/usage/reset', async (req: any, res: any) => {
  try {
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    const nextResetDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    
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
    
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the API
export const api = functions.https.onRequest(app);

// Scheduled function to reset usage monthly
export const resetMonthlyUsage = functions.pubsub
  .schedule('0 0 1 * *') // First day of every month at midnight
  .onRun(async (context) => {
    try {
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();
      const nextResetDate = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      
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
      
    } catch (error) {
      console.error('Error in scheduled usage reset:', error);
    }
  });
