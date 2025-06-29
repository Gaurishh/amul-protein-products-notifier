const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api'; // Adjust as needed

export async function checkUser(email) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function getProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
}

export async function subscribeUser(email, products) {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, products }),
  });
  return res.json();
}

export async function updateUser(email, products) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products }),
  });
  return res.json();
}

export async function unsubscribeUser(email) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  return res.json();
}