import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {t.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
