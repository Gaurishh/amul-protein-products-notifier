import React from 'react';

function UnsubscribeButton({ onUnsubscribe, className = '' }) {
  return (
    <button onClick={onUnsubscribe} className={`UnsubscribeButton ${className}`.trim()}>
      Unsubscribe
    </button>
  );
}

export default UnsubscribeButton;
