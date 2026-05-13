import React, { useState, useEffect } from 'react';

const CATEGORY_COLORS = {
  peptides: '#14B8A6',
  accessories: '#FF007F',
  gear: '#FF4500',
  default: '#00E5FF'
};

export default function App() {
  const [catalogue, setCatalogue] = useState({});
  const [activeCategory, setActiveCategory] = useState("");
  const [activeProduct, setActiveProduct] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    fetch('catalogue.json')
      .then(res => res.json())
      .then(data => {
        setCatalogue(data);
        const firstCategory = Object.keys(data)[0];
        if (firstCategory) {
          setActiveCategory(firstCategory);
          const firstProduct = Object.keys(data[firstCategory].products)[0];
          setActiveProduct(firstProduct);
        }
      });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCategoryClick = (catKey) => {
    setActiveCategory(catKey);
    const firstProduct = Object.keys(catalogue[catKey].products)[0];
    setActiveProduct(firstProduct);
  };

  const currentCategoryData = catalogue[activeCategory];
  const currentThemeColor = CATEGORY_COLORS[activeCategory] || CATEGORY_COLORS.default;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#121212', 
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)',
      color: '#F5F0E6', 
      padding: isMobile ? '20px 10px' : '40px 20px',
      overflowX: 'hidden'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bungee&family=Space+Mono:wght@400;700&display=swap');
          .nav-scroll::-webkit-scrollbar { display: none; }
          .nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <header style={{ marginBottom: isMobile ? '30px' : '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontFamily: '"Bungee", cursive',
          fontSize: isMobile ? '3rem' : 'clamp(4rem, 12vw, 8rem)', 
          margin: 0, 
          lineHeight: '1',
          color: '#F5F0E6', 
          textShadow: isMobile ? `3px 3px 0px #000, 5px 5px 0px ${currentThemeColor}` : `4px 4px 0px #000, 8px 8px 0px ${currentThemeColor}`,
          transition: 'all 0.3s ease'
        }}>
          CLARKY'S <br/>
          <span style={{ color: currentThemeColor }}>PRINTHOUSE</span>
        </h1>
      </header>

      <main style={{ maxWidth: '1500px', width: '100%', margin: '0 auto' }}>
        
        {/* Tier 1: Category Nav - Fixed Centering */}
        <div className="nav-scroll" style={{ 
          display: 'flex', 
          overflowX: 'auto',
          gap: '15px', 
          marginBottom: '20px', 
          padding: '10px 5px',
          justifyContent: 'center' // Changed to center for better mobile alignment
        }}>
          {Object.keys(catalogue).map(catKey => {
            const isCatActive = activeCategory === catKey;
            const btnColor = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.default;
            return (
              <button 
                key={catKey} 
                onClick={() => handleCategoryClick(catKey)}
                style={{
                  padding: isMobile ? '8px 20px' : '12px 35px',
                  backgroundColor: isCatActive ? btnColor : '#1A1A1A',
                  border: '3px solid #F5F0E6',
                  color: isCatActive ? '#121212' : '#F5F0E6',
                  fontFamily: '"Bungee", cursive',
                  fontSize: isMobile ? '1.2rem' : '2rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isCatActive ? '3px 3px 0px #F5F0E6' : `3px 3px 0px ${btnColor}`,
                }}
              >
                {catalogue[catKey].displayName}
              </button>
            );
          })}
        </div>

        {/* Tier 2: Product Nav - Fixed Centering */}
        {currentCategoryData && (
          <div className="nav-scroll" style={{ 
            display: 'flex', 
            overflowX: 'auto',
            gap: '10px', 
            marginBottom: '30px', 
            padding: '10px 5px',
            justifyContent: 'center' // Changed to center
          }}>
            {Object.keys(currentCategoryData.products).map(prodKey => {
              const isProdActive = activeProduct === prodKey;
              return (
                <button 
                  key={prodKey} 
                  onClick={() => setActiveProduct(prodKey)}
                  style={{
                    padding: '6px 15px',
                    backgroundColor: isProdActive ? '#F5F0E6' : 'transparent',
                    border: `2px solid ${isProdActive ? '#F5F0E6' : currentThemeColor}`,
                    color: isProdActive ? '#121212' : currentThemeColor,
                    fontFamily: '"Bungee", cursive',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {currentCategoryData.products[prodKey].displayName}
                </button>
              );
            })}
          </div>
        )}

        {/* Product Detail */}
        {currentCategoryData && activeProduct && (
          <div style={{ 
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            backgroundColor: currentThemeColor, 
            border: isMobile ? '3px solid #F5F0E6' : '4px solid #F5F0E6', 
            boxShadow: isMobile ? '8px 8px 0px #000' : '12px 12px 0px #000',
          }}>
            <div style={{ 
              flex: 1,
              backgroundColor: '#121212', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              borderBottom: isMobile ? `3px solid ${currentThemeColor}` : 'none'
            }}>
              <img 
                src={currentCategoryData.products[activeProduct].photo} 
                style={{ width: '100%', maxHeight: isMobile ? '350px' : 'none', objectFit: 'contain', display: 'block' }} 
                alt="Product" 
              />
            </div>

            <div style={{ 
              flex: 1,
              backgroundColor: '#1A1A1A', 
              padding: isMobile ? '25px 15px' : '40px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center' 
            }}>
              <h2 style={{ 
                fontFamily: '"Bungee", cursive', 
                fontSize: isMobile ? '1.8rem' : 'clamp(2rem, 4vw, 3.5rem)', 
                margin: '0 0 20px 0', 
                color: currentThemeColor, 
                textShadow: '2px 2px 0px #000, 4px 4px 0px #F5F0E6', 
                textAlign: 'center'
              }}>
                {currentCategoryData.products[activeProduct].displayName}
              </h2>
              <div style={{ 
                fontFamily: '"Space Mono", monospace', 
                fontSize: isMobile ? '0.85rem' : '0.95rem', 
                color: '#F5F0E6', 
                lineHeight: '1.6', 
                whiteSpace: 'pre-wrap',
                padding: isMobile ? '20px 15px' : '35px', 
                backgroundColor: '#121212', 
                border: `2px dashed ${currentThemeColor}`, 
                textAlign: 'left'
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