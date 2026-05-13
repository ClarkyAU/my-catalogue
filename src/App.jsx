import React, { useState, useEffect } from 'react';

// Define our dynamic theme colors based on category names
const CATEGORY_COLORS = {
  peptides: '#14B8A6',     // Retro Teal
  accessories: '#FF007F',  // Cyberpunk Pink
  gear: '#FF4500',         // Hazard Orange
  default: '#00E5FF'       // Fallback Cyan
};

export default function App() {
  const [catalogue, setCatalogue] = useState({});
  const [activeCategory, setActiveCategory] = useState("");
  const [activeProduct, setActiveProduct] = useState(null);

  useEffect(() => {
    fetch('catalogue.json')
      .then(res => res.json())
      .then(data => {
        setCatalogue(data);
        const firstCategory = Object.keys(data)[0];
        if (firstCategory) {
          setActiveCategory(firstCategory);
        }
      });
  }, []);

  // Handlers
  const handleCategoryClick = (catKey) => {
    setActiveCategory(catKey);
    setActiveProduct(null); // Reset to the grid view when changing categories
  };

  // Get current active data
  const currentCategoryData = catalogue[activeCategory];
  const currentThemeColor = CATEGORY_COLORS[activeCategory] || CATEGORY_COLORS.default;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#121212', 
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)',
      color: '#F5F0E6', 
      padding: '40px 20px',
      overflowX: 'hidden'
    }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Space+Mono:wght@400;700&display=swap');`}
      </style>

      {/* Main Header */}
      <header style={{ marginBottom: '40px', textAlign: 'center', paddingTop: '20px' }}>
        <h1 style={{ 
          fontFamily: '"Bungee", cursive',
          fontSize: 'clamp(4rem, 12vw, 8rem)', 
          margin: 0, 
          lineHeight: '0.9',
          color: '#F5F0E6', 
          textShadow: `4px 4px 0px #000, 8px 8px 0px ${currentThemeColor}`,
          transition: 'text-shadow 0.3s ease'
        }}>
          CLARKY'S <br/>
          <span style={{ color: currentThemeColor, textShadow: '4px 4px 0px #000, 8px 8px 0px #F5F0E6', transition: 'color 0.3s ease' }}>
            PRINTHOUSE
          </span>
        </h1>
      </header>

      <main style={{ maxWidth: '1500px', width: '95%', margin: '0 auto' }}>
        
        {/* Tier 1: Category Navigation */}
        <div style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px', justifyContent: 'center' 
        }}>
          {Object.keys(catalogue).map(catKey => {
            const isCatActive = activeCategory === catKey;
            const btnColor = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.default;
            return (
              <button 
                key={catKey} 
                onClick={() => handleCategoryClick(catKey)}
                style={{
                  padding: '12px 35px',
                  backgroundColor: isCatActive ? btnColor : '#1A1A1A',
                  border: '4px solid #F5F0E6',
                  color: isCatActive ? '#121212' : '#F5F0E6',
                  fontFamily: '"Bungee", cursive',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                  boxShadow: isCatActive ? '4px 4px 0px #F5F0E6' : `4px 4px 0px ${btnColor}`,
                  transform: isCatActive ? 'translate(-2px, -2px)' : 'none'
                }}
              >
                {catalogue[catKey].displayName}
              </button>
            );
          })}
        </div>

        {/* System Terminal Breadcrumbs */}
        {currentCategoryData && (
          <div style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '1.2rem',
            color: currentThemeColor,
            marginBottom: '40px',
            padding: '15px 20px',
            backgroundColor: '#0a0a0a',
            border: `2px solid ${currentThemeColor}`,
            boxShadow: `4px 4px 0px #000`,
            display: 'inline-block'
          }}>
            <span style={{ color: '#F5F0E6' }}>SYS &gt; PRINTHOUSE &gt; </span> 
            {currentCategoryData.displayName} 
            {activeProduct && <span style={{ color: '#F5F0E6' }}> &gt; {currentCategoryData.products[activeProduct].displayName}.EXE</span>}
            {!activeProduct && <span style={{ color: '#F5F0E6' }}> &gt; INDEX.DIR</span>}
            <span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
            <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
          </div>
        )}

        {/* View Router: Show Grid or Detail */}
        {currentCategoryData && !activeProduct && (
          // === DIRECTORY GRID VIEW ===
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '30px' 
          }}>
            {Object.keys(currentCategoryData.products).map(prodKey => {
              const prod = currentCategoryData.products[prodKey];
              return (
                <div 
                  key={prodKey}
                  onClick={() => setActiveProduct(prodKey)}
                  style={{
                    backgroundColor: currentThemeColor,
                    border: '4px solid #F5F0E6',
                    boxShadow: '8px 8px 0px #000',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-4px, -4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ height: '250px', backgroundColor: '#121212', overflow: 'hidden' }}>
                    <img src={prod.photo} alt={prod.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.1) brightness(0.95)' }} />
                  </div>
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1A1A1A', flexGrow: 1, borderTop: `4px solid ${currentThemeColor}` }}>
                    <h3 style={{ fontFamily: '"Bungee", cursive', fontSize: '1.8rem', color: currentThemeColor, margin: 0, textShadow: '2px 2px 0px #000' }}>
                      {prod.displayName}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentCategoryData && activeProduct && (
          // === PRODUCT DETAIL VIEW ===
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '8px',
            backgroundColor: currentThemeColor, border: '4px solid #F5F0E6', boxShadow: '12px 12px 0px #000' 
          }}>
            <div style={{ backgroundColor: '#121212', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img 
                src={currentCategoryData.products[activeProduct].photo} 
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'contrast(1.1) brightness(0.95)' }} 
                alt="Product" 
              />
            </div>
            <div style={{ backgroundColor: '#1A1A1A', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ 
                fontFamily: '"Bungee", cursive', fontSize: 'clamp(2rem, 4vw, 3.5rem)', margin: '0 0 30px 0', lineHeight: '1.1',
                color: currentThemeColor, textShadow: '3px 3px 0px #000, 6px 6px 0px #F5F0E6', textAlign: 'center' 
              }}>
                {currentCategoryData.products[activeProduct].displayName}
              </h2>
              <div style={{ 
                fontFamily: '"Space Mono", monospace', fontSize: '1.05rem', color: '#F5F0E6', lineHeight: '2', letterSpacing: '0.5px', whiteSpace: 'pre-wrap',
                padding: '35px', backgroundColor: '#121212', border: `2px dashed ${currentThemeColor}`, textAlign: 'left'
              }}>
                {currentCategoryData.products[activeProduct].description}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}