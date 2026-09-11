// public/js/register.js
const msgEl = document.getElementById('msg');

document.getElementById('registerBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;

  msgEl.textContent = '';
  msgEl.className = 'msg';

  if (!email || !password) {
    msgEl.textContent = '請輸入 Email 與密碼';
    msgEl.classList.add('error');
    return;
  }
  if (password.length < 6) {
    msgEl.textContent = '密碼至少需要 6 碼';
    msgEl.classList.add('error');
    return;
  }
  if (password !== password2) {
    msgEl.textContent = '兩次輸入的密碼不一致';
    msgEl.classList.add('error');
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    msgEl.textContent = '註冊成功，正在導向登入頁...';
    msgEl.classList.add('success');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
  } catch (err) {
    msgEl.textContent = '註冊失敗：' + translateError(err.code);
    msgEl.classList.add('error');
  }
});

function translateError(code) {
  const map = {
    'auth/email-already-in-use': '此 Email 已被註冊',
    'auth/invalid-email': 'Email 格式不正確',
    'auth/weak-password': '密碼強度不足',
  };
  return map[code] || code;
}
