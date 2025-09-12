import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyEmailByToken, checkUserByToken } from '../api';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function VerifyEmailPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = query.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing token');
      return;
    }

    (async () => {
      try {
        const res = await verifyEmailByToken(token);
        if (res && res.success) {
          setStatus('success');
          setMessage('Email verified successfully! You will now be notified for the selected products.');
        } else {
          setStatus('error');
          setMessage(res && res.error ? res.error : 'Verification failed');
        }
      } catch (e) {
        setStatus('error');
        setMessage('Verification failed');
      }
    })();
  }, [query, navigate]);

  return (
    <div className="app-container">
      <div className="logo-title-row">
        <img src="/amul-logo.png" alt="Amul Logo" className="amul-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Amul Protein Products Notifier</h1>
      </div>
      <div className="confirmation-screen">
        <p>{message}</p>
      </div>
    </div>
  );
}

export default VerifyEmailPage;


