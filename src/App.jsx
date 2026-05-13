import React, { useState, useEffect } from 'react';

export default function App() {
  const [catalogue, setCatalogue] = useState({});
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    fetch('catalogue.json')
      .then(res => res.json())
      .then(data => {
        setCatalogue(data);
        if (Object.keys(data).length > 0) setActiveTab(Object.keys(data)[0]);
      });
  }, []);

  const currentProduct = catalogue[activeTab];

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', padding: '40px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: '900', fontStyle: 'italic', margin: 0, letterSpacing: '-2px' }}>
          CLARKY'S <span style={{ color: '#3b82f6' }}>PRINTHOUSE</span>
        </h1>
      </header>

      <main style={{ maxWidth: '1200px' }}>
        {/* Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '50px', borderBottom: '1px solid #222' }}>
          {Object.keys(catalogue).map(key => (
            <button 
              key={key} 
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 0', background: 'transparent',
                border: 'none', borderBottom: activeTab === key ? '4px solid #3b82f6' : '4px solid transparent',
                color: activeTab === key ? '#fff' : '#444',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', textTransform: 'uppercase'
              }}
            >
              {catalogue[key].displayName}
            </button>
          ))}
        </div>

        {currentProduct && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '60px' }}>
            {/* Image */}
            <img src={currentProduct.photo} style={{ width: '100%', display: 'block' }} alt="Print" />
            
            {/* Content */}
            <div style={{ paddingTop: '10px' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: '900', margin: '0 0 20px 0', textTransform: 'uppercase' }}>
                {currentProduct.displayName}
              </h2>
              <p style={{ 
                fontSize: '1.2rem', 
                color: '#bbb', 
                lineHeight: '1.6', 
                margin: 0, 
                whiteSpace: 'pre-wrap' // This fixes the line breaks from your text file
              }}>
                {currentProduct.description}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}