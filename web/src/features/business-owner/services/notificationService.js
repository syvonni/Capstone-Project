import { get, post } from '@/lib/http.js';

const BASE_PATH = '/api/business-owner/notifications';

/**
 * Convert URL base64 to Uint8Array
 * @param {string} base64String - Base64 string
 * @returns {Uint8Array} Converted array
 */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get notifications for a business
 * @param {string} businessId - The ID of the business
 */
export async function getNotifications(businessId) {
  const res = await get(`${BASE_PATH}/${businessId}`);
  return res || [];
}

/**
 * Mark a notification as read
 * @param {string} notificationId - The ID of the notification
 */
export async function markNotificationAsRead(notificationId) {
  const res = await post(`${BASE_PATH}/${notificationId}/read`);
  return res;
}

/**
 * Delete a notification
 * @param {string} notificationId - The ID of the notification
 */
export async function deleteNotification(notificationId) {
  const res = await post(`${BASE_PATH}/${notificationId}/delete`);
  return res;
}

/**
 * Get notification preferences for a business
 * @param {string} businessId - The ID of the business
 */
export async function getNotificationPreferences(businessId) {
  const res = await get(`${BASE_PATH}/${businessId}/preferences`);
  return res;
}

/**
 * Update notification preferences for a business
 * @param {string} businessId - The ID of the business
 * @param {object} preferences - The preferences data
 */
export async function updateNotificationPreferences(businessId, preferences) {
  const res = await post(`${BASE_PATH}/${businessId}/preferences`, preferences);
  return res;
}

/**
 * Mark all notifications as read for a business
 * @param {string} businessId - The ID of the business
 */
export async function markAllNotificationsAsRead(businessId) {
  const res = await post(`${BASE_PATH}/${businessId}/read-all`);
  return res;
}

/**
 * Get notification history for a business
 * @param {string} businessId - The ID of the business
 */
export async function getNotificationHistory(businessId) {
  const res = await get(`${BASE_PATH}/${businessId}/history`);
  return res || [];
}

/**
 * Subscribe to real-time notifications
 * @param {string} businessId - The ID of the business
 * @param {string} socketId - The socket connection ID
 */
export async function subscribeToNotifications(businessId, socketId) {
  const res = await post(`${BASE_PATH}/${businessId}/subscribe`, { socketId });
  return res;
}

/**
 * Unsubscribe from real-time notifications
 * @param {string} businessId - The ID of the business
 * @param {string} socketId - The socket connection ID
 */
export async function unsubscribeFromNotifications(businessId, socketId) {
  const res = await post(`${BASE_PATH}/${businessId}/unsubscribe`, { socketId });
  return res;
}

// ===== PUSH NOTIFICATION FUNCTIONS =====

/**
 * Register for push notifications
 * @param {string} businessId - Business ID
 * @returns {Promise} Registration result
 */
export const registerForPushNotifications = async (businessId) => {
  // Check if push notifications are supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser');
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Get existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlB64ToUint8Array(
        'BEl62iUYgWJy92EMlw9Kq9bJ8P9dReQyB1LGNgYvbB7jKq3mJ9Q8J5e9J8P9dReQyB1LGNgYvbB7jKq3mJ9Q8J5e9'
      );

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // Send subscription to server
    const response = await post(`${BASE_PATH}/${businessId}/push-register`, {
      subscription: subscription.toJSON()
    });

    return response;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    throw error;
  }
};

/**
 * Unregister from push notifications
 * @param {string} businessId - Business ID
 * @returns {Promise} Unregistration result
 */
export const unregisterFromPushNotifications = async (businessId) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      const res = await post(`${BASE_PATH}/${businessId}/push-unregister`, {
        subscription: subscription.toJSON()
      });
      return res || { success: true };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to unregister from push notifications:', error);
    throw error;
  }
};

/**
 * Get push notifications for a business
 * @param {string} businessId - Business ID
 * @returns {Promise} Notifications data
 */
export const getPushNotifications = async (businessId) => {
  try {
    const response = await get(`${BASE_PATH}/${businessId}/push-notifications`);
    return response || { notifications: [] };
  } catch (error) {
    console.error('Failed to get push notifications:', error);
    return { notifications: [] };
  }
};

/**
 * Check notification permission status
 * @returns {string} Permission status
 */
export const getNotificationPermission = () => {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

/**
 * Request notification permission
 * @returns {Promise<string>} Permission status
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return 'unsupported';
};

/**
 * Show local notification (fallback)
 * @param {string} title - Notification title
 * @param {object} options - Notification options
 */
export const showLocalNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};
