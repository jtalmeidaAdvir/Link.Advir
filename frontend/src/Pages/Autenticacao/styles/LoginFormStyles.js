// styles/LoginFormStyles.js
export const inputStyle = {
  borderRadius: '30px',
  padding: '10px 20px',
  width: '100%',
  fontSize: '1rem',
  border: '1px solid #ccc',
};

export const buttonStyle = {
  marginTop: '15px',
  borderRadius: '10px',
  padding: '20px',
  fontSize: '1.1rem',
  backgroundColor: '#1792FE',
  color: 'white',
  width: '100%',
  border: 'none',
};

export const errorStyle = {
  color: 'red',
  marginBottom: '20px',
  textAlign: 'center',
};


export const backgroundStyle = (imgUrl) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: '#d4e4ff',
  margin: 0,
  padding: 0,
  backgroundImage: `url(${imgUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
});

export const cardStyle = {
  maxWidth: '400px',
  width: '100%',
  padding: '20px',
  borderRadius: '15px',
};

export const logoContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '20px',
};

export const logoStyle = {
  width: '550px',
  height: 'auto',
};
