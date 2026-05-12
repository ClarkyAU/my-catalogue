import React, { useState, useEffect } from 'react';

export default function App() {
  const [catalogue, setCatalogue] = useState({});
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    fetch('/catalogue.json')
      .then(res => res.json())
      .then(data => {
        setCatalogue(data);
        if (Object.keys(data).length > 0) setActiveTab(Object.keys(data)[0]);
      });
  }, []);

  const currentProduct = catalogue[activeTab];

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: '900', fontStyle: 'italic' }}>
          CLARKY'S <span style={{ color: '#3b82f6' }}>PRINTHOUSE</span>
        </h1>
      </header>

      {/* Pill Menu */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
        {Object.keys(catalogue).map(key => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 25px', borderRadius: '20px', border: 'none',
              background: activeTab === key ? '#3b82f6' : '#1e293b',
              color: '#fff', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {catalogue[key].displayName}
          </button>
        ))}
      </div>

      {/* Product Display */}
      {currentProduct && (
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#0f172a', borderRadius: '20px', padding: '20px', border: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>{currentProduct.displayName}</h2>
          <img src={currentProduct.photo} style={{ width: '100%', borderRadius: '15px' }} alt={currentProduct.displayName} />
        </div>
      )}
    </div>
  );
}