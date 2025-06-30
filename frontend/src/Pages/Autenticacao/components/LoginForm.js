import React from 'react';
import RecuperarPasswordLink from './RecuperarPasswordLink';

const LoginForm = ({ email, setEmail, password, setPassword, errorMessage, handleLogin, t }) => {
  return (
    <form onSubmit={handleLogin}>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            borderRadius: '30px',
            padding: '10px 20px',
            width: '100%',
            marginBottom: '10px',
            fontSize: '1rem',
            border: '1px solid #ccc',
          }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="password"
          placeholder={t("Login.TxtPass")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            borderRadius: '30px',
            padding: '10px 20px',
            width: '100%',
            fontSize: '1rem',
            border: '1px solid #ccc',
          }}
        />
      </div>

      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      <RecuperarPasswordLink/>

      <button
        type="submit"
        style={{
          marginTop: '15px',
          borderRadius: '10px',
          padding: '20px',
          fontSize: '1.1rem',
          backgroundColor: '#1792FE',
          color: 'white',
          width: '100%',
          border: 'none',
          alignContent: 'center',
        }}
      >
        {t("Login.BtLogin")}
      </button>
    </form>
  );
};

export default LoginForm;
