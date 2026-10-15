// JOMATH settings — edit this file only.
window.JOMATH_CONFIG = {
  // Public mode: question images and solutions are served as files from this site (no login needed).
  staticMode: true,
  // Students must sign in with Google before they can see or use the site
  requireLogin: true,
  // 1) Firebase: Project settings → Your apps → Web app → firebaseConfig
  firebase: {
    apiKey: "AIzaSyAj-uJ8B4zRnB7FRpwvvEhZsmA45JPY2GU",
    authDomain: "jomath-701cc.firebaseapp.com",
    projectId: "jomath-701cc",
    storageBucket: "jomath-701cc.firebasestorage.app",
    messagingSenderId: "593330198938",
    appId: "1:593330198938:web:89dc9f6282cb5a58cc4223"
  },
  // 2) Admin Google account(s) — must match the list in firestore.rules
  adminEmails: ["br4amer@icschools.ae"],
  // 3) CliQ details shown to students when they subscribe
  cliq: {
    alias: "JOMATH",          // your CliQ alias (or phone number)
    name: "عامر الدبوبي",       // account name the student will see in their bank app
    bank: ""                   // optional: bank name
  },
  // 4) Plans (price in JOD, days of access)
  plans: [
    { id: "month", name: "شهر",            price: 3,  days: 31 },
    { id: "term",  name: "فصل دراسي",       price: 10, days: 130 },
    { id: "year",  name: "سنة دراسية",      price: 18, days: 300 }
  ],
  // 5) Google AdSense — leave empty until AdSense approves the site
  adsense: { client: "", slot: "" },
  // Link to the official textbooks
  booksUrl: "https://nccd.gov.jo/Ar/Pages/textbooks"
};
