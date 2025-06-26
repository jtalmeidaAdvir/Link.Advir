import React from "react";
import { View, Text, Picker, TouchableOpacity } from "react-native";
import styles from "../../Styles/PandIByTecnicoStyles";

const TecnicoFilterControls = ({
  isAdmin,
  tecnicoID,
  setTecnicoID,
  filtro,
  setFiltro,
  ano,
  setAno,
  mes,
  setMes,
  semana,
  setSemana,
  anoAtual,
  loading,
  fetchData,
  getWeeksInMonth
}) => {
  return (
    <View style={styles.controlsContainer}>
      <View style={styles.controlBox}>
        <Text style={styles.controlLabel}>Técnico:</Text>
        {isAdmin ? (
          <Picker
            selectedValue={tecnicoID}
            onValueChange={setTecnicoID}
            style={styles.picker}
          >
            <Picker.Item label="Selecione um Técnico" value="" />
            <Picker.Item label="José Alves" value="001" />
            <Picker.Item label="José Vale" value="002" />
            <Picker.Item label="Jorge Almeida" value="003" />
            <Picker.Item label="Vitor Mendes" value="004" />
          </Picker>
        ) : (
          <Text style={{ padding: 10, fontSize: 16 }}>{tecnicoID}</Text>
        )}
      </View>

      <View style={styles.controlRow}>
        <View style={styles.controlBox}>
          <Text style={styles.controlLabel}>Filtro:</Text>
          <Picker
            selectedValue={filtro}
            onValueChange={setFiltro}
            style={styles.picker}
          >
            <Picker.Item label="Semana" value="semana" />
            <Picker.Item label="Mês" value="mes" />
            <Picker.Item label="Anual" value="anual" />
          </Picker>
        </View>

        <View style={styles.controlBox}>
          <Text style={styles.controlLabel}>Ano:</Text>
          <Picker
            selectedValue={ano}
            onValueChange={(value) => {
              const anoValue = parseInt(value);
              setAno(anoValue);
              if (filtro === "semana") {
                const semanas = getWeeksInMonth(mes, anoValue);
                if (!semanas.includes(semana)) setSemana(semanas[0]);
              }
            }}
            style={styles.picker}
          >
            <Picker.Item label={(anoAtual - 1).toString()} value={anoAtual - 1} />
            <Picker.Item label={anoAtual.toString()} value={anoAtual} />
            <Picker.Item label={(anoAtual + 1).toString()} value={anoAtual + 1} />
          </Picker>
        </View>
      </View>

      {(filtro === "mes" || filtro === "semana") && (
        <View style={styles.controlRow}>
          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>Mês:</Text>
            <Picker
              selectedValue={mes}
              onValueChange={(value) => {
                const mesValue = parseInt(value);
                setMes(mesValue);
                if (filtro === "semana") {
                  const semanas = getWeeksInMonth(mesValue, ano);
                  if (!semanas.includes(semana)) setSemana(semanas[0]);
                }
              }}
              style={styles.picker}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <Picker.Item
                  key={m}
                  label={`${m} - ${new Date(0, m - 1).toLocaleString("default", { month: "long" })}`}
                  value={m}
                />
              ))}
            </Picker>
          </View>

          {filtro === "semana" && (
            <View style={styles.controlBox}>
              <Text style={styles.controlLabel}>Semana:</Text>
              <Picker
                selectedValue={semana}
                onValueChange={(value) => setSemana(parseInt(value))}
                style={styles.picker}
              >
                {getWeeksInMonth(mes, ano).map((s) => (
                  <Picker.Item key={s} label={`Semana ${s}`} value={s} />
                ))}
              </Picker>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={fetchData}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "A carregar..." : "Obter Dados"}
        </Text>
      </TouchableOpacity>

      {loading && (
        <Text style={styles.loadingInfo}>
          A carregar dados, por favor aguarde...
        </Text>
      )}
    </View>
  );
};

export default TecnicoFilterControls;
