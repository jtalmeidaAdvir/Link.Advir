import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const RecuperarPasswordLink = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  return (
    <div style={{ textAlign: 'center', marginTop: '10px' }}>
      <a
        onClick={() => navigation.navigate('RecuperarPassword')}
        style={{
          color: '#1792FE',
          fontSize: '14px',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        {t("Login.LinkRecoverPass")}
      </a>
    </div>
  );
};

export default RecuperarPasswordLink;
