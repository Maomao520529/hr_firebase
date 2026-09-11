// public/js/firebase-client-config.js
// 請至 Firebase Console > 專案設定 > 一般 > 你的應用程式 (Web) 取得設定值並替換以下內容
const firebaseConfig = {
  apiKey: "AIzaSyCbvY1s9R3ztrSnjv_EXWIUmVIb6AcPIL4",
  authDomain: "database-test-2459b.firebaseapp.com",
  databaseURL: "https://database-test-2459b-default-rtdb.firebaseio.com",
  projectId: "database-test-2459b",
  storageBucket: "database-test-2459b.firebasestorage.app",
  messagingSenderId: "941898685513",
  appId: "1:941898685513:web:fdb2b0aab703bc370fb398",
  measurementId: "G-T42TVKR0TT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
