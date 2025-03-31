import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-container">
      <Header /> {/* Agregamos el Header */}

      {/* Línea blanca */}
      <hr className="line-white" />

      <div className="content">
        {/* Contenido del lado izquierdo */}
        <div className="left-content">
          <h2>El mejor Truco del Mundo</h2>
          <p>
            Trucho es una aplicación creada por los estudiantes Marco Schenker e Ignacio Gaspar
          </p>
          <button className="button-orange">Jugá sin Registrarte</button>
          <div className="learn-truco">
            <img src="/videoLogo.png" alt="Video" className="video-icon" />
            <a
              href="https://www.youtube.com/watch?v=Nw8UFka_2i4&ab_channel=PoppularJuegos"
              target="_blank"
              rel="noopener noreferrer"
              className="learn-truco-text"
            >
              Aprendé a jugar al Truco
            </a>
          </div>
        </div>

        {/* Contenido del lado derecho */}
        <div className="right-content">
          <Link to="/register">
            <button className="button-register">Sign Up</button>
          </Link>
          <div className="account-text-container">
            <div className="line-black"></div>
            <p className="account-text">‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎  
               ¿Ya tenés una cuenta?</p>
            <div className="line-black"></div>
          </div>
          <Link to="/login">
            <button className="button-login">Login</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
