import React, { useState } from 'react';
import { registerUser } from '../services/api';

const RegisterPage: React.FC = () => {
  const [nombre_usuario, setNombreUsuario] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [contraseña, setContraseña] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerUser({ nombre_usuario, email, contraseña });
      alert('Usuario registrado exitosamente');
      setNombreUsuario('');
      setEmail('');
      setContraseña('');
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      alert('Error al registrar usuario. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h2 style={{ marginBottom: '20px' }}>Registro</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '300px',
          gap: '15px',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <input
          type="text"
          placeholder="Usuario"
          value={nombre_usuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contraseña}
          onChange={(e) => setContraseña(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
          required
        />
        <button
          type="submit"
          style={{
            padding: '10px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007BFF',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          disabled={loading}
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;