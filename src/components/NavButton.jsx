import React from 'react';

export const NavButton = ({ label, isActive, onClick, isCategory }) => (
  <button 
    onClick={onClick} 
    style={{
      padding: isCategory ? '10px 25px' : '6px 15px',
      backgroundColor: isActive ? 'var(--theme-color)' : (isCategory ? 'transparent' : 'transparent'),
      border: isCategory ? '3px solid #F5F0E6' : `2px solid ${isActive ? '#F5F0E6' : 'var(--theme-color)'}`,
      color: isActive ? '#121212' : (isCategory ? '#F5F0E6' : 'var(--theme-color)'),
      fontFamily: '"Bungee", cursive',
      fontSize: isCategory ? 'clamp(0.8rem, 2vw, 1.2rem)' : '0.8rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      boxShadow: isCategory && isActive ? '3px 3px 0px #F5F0E6' : (isCategory ? `3px 3px 0px var(--theme-color)` : 'none'),
      transition: 'all 0.1s ease',
      flex: '0 1 auto' 
    }}
  >
    {label}
  </button>
);