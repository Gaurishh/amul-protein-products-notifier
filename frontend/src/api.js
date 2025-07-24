const API_BASE = process.env.REACT_APP_BACKEND_API_BASE;
// const API_BASE = 'http://localhost:8000/api';

export async function checkUser(email) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function getProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
}

export async function subscribeUser(email, products, pincode) {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, products, pincode }),
  });
  return res.json();
}

export async function updateUser(email, products, pincode) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, pincode }),
  });
  return res.json();
}

export async function unsubscribeUser(email) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function verifyPincode(pincode) {
  const res = await fetch(`${API_BASE}/verify-pincode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode }),
  });
  return res.json();
}

export async function checkUserByToken(token) {
  const res = await fetch(`${API_BASE}/user-by-token?token=${encodeURIComponent(token)}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function unsubscribeUserByToken(token) {
  const res = await fetch(`${API_BASE}/unsubscribe?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
  return res.json();
}
