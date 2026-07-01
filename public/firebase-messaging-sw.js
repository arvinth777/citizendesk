// Minimal service worker to prevent Firebase Messaging registration error
// See https://firebase.google.com/docs/cloud-messaging/js/receive for background messaging setup
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Received push message', event);
});
