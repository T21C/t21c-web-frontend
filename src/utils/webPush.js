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

const DEVICE_KEY_STORAGE = 'tuf.push.deviceKey';

export function getPushDeviceKey() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (existing) return existing;
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return null;
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, created);
    return created;
  } catch {
    return null;
  }
}

async function readLocalSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

async function postSubscription(subscription, locale, intent) {
  const {data} = await api.post(routes.notifications.pushSubscribe(), {
    ...subscription.toJSON(),
    locale,
    deviceKey: getPushDeviceKey(),
    intent,
  });
  return data ?? {};
}

export async function clearLocalPushSubscription() {
  const subscription = await readLocalSubscription();
  if (!subscription) return;
  try {
    await subscription.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function subscribeCurrentBrowser(locale) {
  if (!isPushSupported()) {
    return {permission: 'denied', unsupported: true, attached: false};
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {permission, unsupported: false, attached: false};
  }
  const {available, publicKey} = await fetchPushAvailability();
  if (!available || !publicKey) {
    return {permission, unsupported: true, attached: false};
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
  const data = await postSubscription(subscription, locale, 'attach');
  return {permission, unsupported: false, attached: Boolean(data.attached)};
}

export async function refreshCurrentBrowser(locale) {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return {attached: false, revoked: false};
  }
  const subscription = await readLocalSubscription();
  if (!subscription) return {attached: false, revoked: false};
  const data = await postSubscription(subscription, locale, 'refresh');
  if (data.revoked) {
    await clearLocalPushSubscription();
    return {attached: false, revoked: true};
  }
  return {attached: Boolean(data.attached), revoked: false};
}

export async function unsubscribeCurrentBrowser() {
  if (!isPushSupported()) return;
  const subscription = await readLocalSubscription();
  if (subscription) {
    try {
      await api.delete(routes.notifications.pushSubscribe(), {
        data: {endpoint: subscription.endpoint},
      });
    } catch {
      /* still drop the local subscription */
    }
  }
  await clearLocalPushSubscription();
}

export async function syncPushLocale(locale) {
  await refreshCurrentBrowser(locale);
}
