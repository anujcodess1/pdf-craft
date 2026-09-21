let passwordModalEl = null;
let currentResolve = null;
let currentReject = null;
export function initPasswordModal() {
  passwordModalEl = document.getElementById('password-modal-backdrop');
  if (!passwordModalEl) return;
  const closeBtn = document.getElementById('btn-close-password');
  const cancelBtn = document.getElementById('btn-cancel-password');
  const submitBtn = document.getElementById('btn-submit-password');
  const input = document.getElementById('pdf-password-input');
  const toggleEye = document.getElementById('btn-toggle-password-visibility');
  const eyeIcon = document.getElementById('eye-icon');
  function handleCancel() {
    closePasswordModal();
    if (currentReject) {
      currentReject(new Error('Password prompt cancelled by user'));
      currentReject = null;
      currentResolve = null;
    }
  }
  function handleSubmit() {
    const val = input.value.trim();
    if (!val) {
      showPasswordError('Please enter a password');
      return;
    }
    const resolve = currentResolve;
    currentResolve = null;
    currentReject = null;
    closePasswordModal();
    if (resolve) resolve(val);
  }
  closeBtn?.addEventListener('click', handleCancel);
  cancelBtn?.addEventListener('click', handleCancel);
  submitBtn?.addEventListener('click', handleSubmit);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
    else if (e.key === 'Escape') handleCancel();
  });
  toggleEye?.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
      input.type = 'password';
      eyeIcon.className = 'fa-regular fa-eye';
    }
  });
}
export function promptPdfPassword(reasonCode = 1) {
  return new Promise((resolve, reject) => {
    if (!passwordModalEl) initPasswordModal();
    currentResolve = resolve;
    currentReject = reject;
    const input = document.getElementById('pdf-password-input');
    const errMsg = document.getElementById('password-error-msg');
    if (reasonCode === 2) {
      showPasswordError('Incorrect password. Please verify and try again.');
    } else {
      if (errMsg) {
        errMsg.style.display = 'none';
        errMsg.textContent = '';
      }
    }
    if (input) {
      input.value = '';
      input.type = 'password';
    }
    passwordModalEl?.classList.add('show');
    setTimeout(() => input?.focus(), 100);
  });
}
function showPasswordError(text) {
  const errMsg = document.getElementById('password-error-msg');
  if (errMsg) {
    errMsg.textContent = text;
    errMsg.style.display = 'block';
  }
}
export function closePasswordModal() {
  if (passwordModalEl) passwordModalEl.classList.remove('show');
}