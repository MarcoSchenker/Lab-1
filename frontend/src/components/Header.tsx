import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <div className="header-component">
      <Link to="/" className="header-link">
        <img src="/CardLogo.png" alt="Logo" className="logo" />
        <h1 className="title">Trucho</h1>
      </Link>
    </div>
  );
};

export default Header;