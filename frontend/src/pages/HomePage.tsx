import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-container">
      <Header /> {/* Header arriba a la izquierda */}
      <div className='background'>
      <h1 className="title">El mejor Truco del Mundo</h1>
      <p className="text">
        Trucho es una aplicación creada por los estudiantes Marco Schenker e Ignacio Gaspar.
      </p>
      <button className="button button-orange">Jugá sin Registrarte</button>
      <Link to="/register">
        <button className="button button-register">Registrarse</button>
      </Link>
      <div className="account-text-container">
        <div className="line-black"></div>
        <p className="account-text">¿Ya tenés una cuenta?</p>
        <div className="line-black"></div>
      </div>

      <Link to="/login">
        <button className="button button-login">Iniciar Sesión</button>
      </Link>
      </div>
            {/* Sección de Reglas */}
            <div className="rules-container">
        <img src="/videoLogo.png" alt="Video" className="video-icon" />
        <a
          href="https://www.youtube.com/watch?v=Nw8UFka_2i4&ab_channel=PoppularJuegos"
          target="_blank"
          rel="noopener noreferrer"
          className="rules-link"
        >
          Aprendé a jugar al Truco
        </a>
      </div>
    </div>
  );
}

export default HomePage;
