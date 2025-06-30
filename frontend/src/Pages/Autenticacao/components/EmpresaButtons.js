// components/EmpresaButtons.js
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { styles } from "../styles/SelecaoEmpresaStyles";

const EmpresaButtons = ({
  empresas,
  empresaSelecionada,
  setEmpresaSelecionada,
  loadingButton,
  handleEntrarEmpresa,
  setEmpresaPredefinida,
}) => {
  if (empresas.length === 0)
    return <Text style={styles.infoText}>Nenhuma empresa disponível</Text>;

  if (loadingButton)
    return (
      <View style={styles.fullscreenLoading}>
        <ActivityIndicator size="large" color="#1792FE" />
        <Text style={styles.loadingText}>A entrar na empresa...</Text>
      </View>
    );

  return (
    <View style={styles.empresasGrid}>
      {empresas.map((empresa, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.empresaButton,
            empresaSelecionada === empresa.empresa &&
              styles.empresaButtonSelected,
          ]}
          onPress={() => {
            setEmpresaSelecionada(empresa.empresa);
            const empresaPredefinidaStorage = localStorage.getItem("empresaPredefinida");
            setEmpresaPredefinida(empresaPredefinidaStorage === empresa.empresa);
          }}
        >
          <Text
            style={[
              styles.empresaButtonText,
              empresaSelecionada === empresa.empresa &&
                styles.empresaButtonTextSelected,
            ]}
          >
            {empresa.empresa}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default EmpresaButtons;
