import React from 'react';

export const Header = () => (
  <header style={{ textAlign: 'center', marginBottom: '40px' }}>
    <h1 style={{ 
      fontFamily: '"Bungee", cursive', fontSize: 'clamp(2.5rem, 8vw, 6rem)', 
      margin: 0, lineHeight: '1', color: '#F5F0E6',
      textShadow: `4px 4px 0px #000, 8px 8px 0px var(--theme-color)` 
    }}>
      CLARKY'S <br/><span style={{ color: 'var(--theme-color)' }}>PRINTHOUSE</span>
    </h1>
  </header>
);