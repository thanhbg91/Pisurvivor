import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- ĐOẠN MÃ TÍCH HỢP PI SDK (ĐĂNG NHẬP) ---
declare const Pi: any;

async function authPiNetwork() {
  try {
    const scopes = ['username', 'payments'];
    const authResult = await Pi.authenticate(scopes, (payment: any) => {
      console.log("Tìm thấy giao dịch chưa hoàn tất:", payment);
    });
    console.log("Đăng nhập Pi thành công!", authResult);
    alert(`Chào mừng Pioneer: ${authResult.user.username}`);
  } catch (error) {
    console.error("Lỗi xác thực Pi Network:", error);
  }
}

if (typeof window !== 'undefined') {
  authPiNetwork();
}
// --- KẾT THÚC ĐOẠN MÃ PI SDK ---

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
