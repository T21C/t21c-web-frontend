import api from '@/utils/api';
import {routes} from '@/api/routes';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getPushPermission() {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function fetchPushAvailability() {
  try {
    const {data} = await api.get(routes.notifications.pushVapidKey());
    return {available: true, publicKey: data.publicKey};
  } catch (error) {
    if (error?.response?.status === 404) {
      return {available: false, publicKey: null};
    }
    throw error;
  }
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register('/sw.js', {scope: '/'});
}

export async function subscribeCurrentBrowser(locale) {
  if (!isPushSupported()) {
    return {permission: 'denied', unsupported: true};
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {permission, unsupported: false};
  }
  const {available, publicKey} = await fetchPushAvailability();
  if (!available || !publicKey) {
    return {permission, unsupported: true};
  }
  await registerPushServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await api.post(routes.notifications.pushSubscribe(), {
    ...subscription.toJSON(),
    locale,
  });
  return {permission, unsupported: false};
}

export async function unsubscribeCurrentBrowser() {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await api.delete(routes.notifications.pushSubscribe(), {
      data: {endpoint: subscription.endpoint},
    });
  } catch {
    /* still drop the local subscription */
  }
  try {
    await subscription.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function syncPushLocale(locale) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.post(routes.notifications.pushSubscribe(), {
    ...subscription.toJSON(),
    locale,
  });
}
