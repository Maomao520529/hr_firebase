// public/js/login.js
const msgEl = document.getElementById('msg');

// 若已登入，直接進儀表板
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = '/dashboard.html';
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  msgEl.textContent = '';
  msgEl.className = 'msg';

  if (!email || !password) {
    msgEl.textContent = '請輸入 Email 與密碼';
    msgEl.classList.add('error');
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = '/dashboard.html';
  } catch (err) {
    msgEl.textContent = '登入失敗：' + translateError(err.code);
    msgEl.classList.add('error');
  }
});

function translateError(code) {
  const map = {
    'auth/invalid-email': 'Email 格式不正確',
    'auth/user-not-found': '找不到此帳號',
    'auth/wrong-password': '密碼錯誤',
    'auth/invalid-credential': '帳號或密碼錯誤',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試',
  };
  return map[code] || code;
}
