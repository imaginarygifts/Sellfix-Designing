importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyATNHNTN0S_otYHNGuydqOjcr1AhCgD6yc",
  authDomain: "imaginary-gifts.firebaseapp.com",
  projectId: "imaginary-gifts",
  storageBucket: "imaginary-gifts.firebasestorage.app",
  messagingSenderId: "759826392629",
  appId: "1:759826392629:web:9d9bbe53c8ab36ad07737c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {

  self.registration.showNotification(payload.notification.title,{
    body: payload.notification.body,
    icon: "/img/logo.png"
  });

});