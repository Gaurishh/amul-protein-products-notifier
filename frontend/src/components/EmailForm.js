import React, { useState } from 'react';

function EmailForm({ onSubmit }) {
  const [email, setEmail] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({ email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Enter your email:
        <input
          type="email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
        />
      </label>
      <button type="submit">Continue</button>
    </form>
  );
}

export default EmailForm;