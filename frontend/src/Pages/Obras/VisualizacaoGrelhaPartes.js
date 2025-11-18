
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { secureStorage } from "../../utils/secureStorage";

const { width } = Dimensions.get("window");

const VisualizacaoGrelhaPartes = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState([]);
  const [registosPorObra, setRegistosPorObra] = useState({});
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [colaboradoresMap, setColaboradoresMap] = useState({});
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [tipoVista, setTipoVista] = useState("obra"); // "obra" ou "utilizador"

  useEffect(() => {
    carregarDados();
  }, [mesSelecionado, anoSelecionado]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = await secureStorage.getItem("painelAdminToken");
      const loginToken = await secureStorage.getItem("loginToken");
      const codRecursosHumanos = await secureStorage.getItem("codRecursosHumanos");
      
      // Buscar obras onde sou responsável
      const resObras = await fetch("https://backend.advir.pt/api/obra", {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      const todasObras = await resObras.json();
      
      // Filtrar obras onde sou responsável
      const obrasResponsavel = [];
      for (const obra of todasObras) {
        if (obra.codigo) {
          const responsavel = await fetchResponsavelObra(obra.codigo, token);
          if (responsavel === codRecursosHumanos) {
            obrasResponsavel.push(obra);
          }
        }
      }
      
      setObras(obrasResponsavel);

      // Buscar todos os registos de partes diárias
      const resPartes = await fetch(
        "https://backend.advir.pt/api/parte-diaria/cabecalhos",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const partes = await resPartes.json();

      // Agrupar por obra e dia
      const registosPorObraTemp = {};
      const colaboradoresSet = new Set();

      obrasResponsavel.forEach((obra) => {
        registosPorObraTemp[obra.id] = {};
      });

      partes.forEach((parte) => {
        const obraId = parte.ObraID;
        if (!registosPorObraTemp[obraId]) return;

        const data = new Date(parte.Data);
        if (
          data.getMonth() === mesSelecionado &&
          data.getFullYear() === anoSelecionado
        ) {
          const dia = data.getDate();
          
          parte.ParteDiariaItems?.forEach((item) => {
            const colaboradorId = item.ColaboradorID || item.Funcionario;
            if (colaboradorId) {
              colaboradoresSet.add(colaboradorId);
              
              if (!registosPorObraTemp[obraId][colaboradorId]) {
                registosPorObraTemp[obraId][colaboradorId] = {};
              }
              
              if (!registosPorObraTemp[obraId][colaboradorId][dia]) {
                registosPorObraTemp[obraId][colaboradorId][dia] = {
                  horas: 0,
                  integrado: parte.IntegradoERP,
                  itens: [],
                };
              }
              
              registosPorObraTemp[obraId][colaboradorId][dia].horas +=
                (item.NumHoras || 0) / 60;
              registosPorObraTemp[obraId][colaboradorId][dia].itens.push(item);
            }
          });
        }
      });

      setRegistosPorObra(registosPorObraTemp);

      // Buscar nomes dos colaboradores
      const colaboradoresMapTemp = {};
      for (const colabId of colaboradoresSet) {
        try {
          const nome = await obterNomeFuncionario(colabId, token);
          colaboradoresMapTemp[colabId] = nome || colabId;
        } catch (e) {
          colaboradoresMapTemp[colabId] = colabId;
        }
      }
      setColaboradoresMap(colaboradoresMapTemp);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponsavelObra = async (codigoObra, token) => {
    try {
      const urlempresa = await secureStorage.getItem("urlempresa");
      const response = await fetch(
        `https://webapiprimavera.advir.pt/listarObras/GetResponsavel/${encodeURIComponent(codigoObra)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            urlempresa: urlempresa,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return (
          data?.DataSet?.Table?.[0]?.CDU_AcessoUtilizador1 ||
          data?.DataSet?.Table?.[0]?.Nome ||
          null
        );
      }
    } catch (error) {
      console.error(`Erro ao buscar responsável da obra ${codigoObra}:`, error);
    }
    return null;
  };

  const obterNomeFuncionario = async (codFuncionario, token) => {
    try {
      const urlempresa = await secureStorage.getItem("urlempresa");
      const res = await fetch(
        `https://webapiprimavera.advir.pt/routesFaltas/GetNomeFuncionario/${codFuncionario}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            urlempresa,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data?.DataSet?.Table?.[0]?.Nome;
      }
    } catch (e) {
      console.error("Erro ao obter nome:", e);
    }
    return codFuncionario;
  };

  const diasDoMes = useMemo(() => {
    const ultimoDia = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => i + 1);
  }, [mesSelecionado, anoSelecionado]);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const abrirDetalhes = (obra, colaborador, dia, dados) => {
    setDetalheSelecionado({
      obra,
      colaborador,
      dia,
      dados,
    });
    setModalDetalhes(true);
  };

  const renderGrelhaPorUtilizador = (colaboradorId) => {
    const nomeColaborador = colaboradoresMap[colaboradorId] || colaboradorId;
    
    // Agregar registos deste colaborador em todas as obras
    const registosColaborador = {};
    let totalHoras = 0;
    
    obras.forEach((obra) => {
      const registosObra = registosPorObra[obra.id] || {};
      if (registosObra[colaboradorId]) {
        registosColaborador[obra.id] = registosObra[colaboradorId];
        totalHoras += Object.values(registosObra[colaboradorId]).reduce((sum, dia) => sum + dia.horas, 0);
      }
    });

    const obrasComRegistos = Object.keys(registosColaborador);

    if (obrasComRegistos.length === 0) {
      return null;
    }

    return (
      <View style={styles.obraCard}>
        <View style={styles.obraHeader}>
          <Text style={styles.obraNome}>{nomeColaborador}</Text>
          <Text style={styles.obraTotal}>Total: {totalHoras.toFixed(1)}h</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Cabeçalho com dias */}
            <View style={styles.headerRow}>
              <View style={[styles.headerCell, styles.nomeCell]}>
                <Text style={styles.headerText}>Obra</Text>
              </View>
              {diasDoMes.map((dia) => (
                <View key={dia} style={styles.headerCell}>
                  <Text style={styles.headerText}>{dia}</Text>
                </View>
              ))}
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Total</Text>
              </View>
            </View>

            {/* Linhas de obras */}
            {obrasComRegistos.map((obraId) => {
              const obra = obras.find((o) => o.id === Number(obraId));
              const registosObraColab = registosColaborador[obraId];
              const totalObra = Object.values(registosObraColab).reduce(
                (sum, dia) => sum + dia.horas,
                0
              );

              return (
                <View key={obraId} style={styles.dataRow}>
                  <View style={[styles.dataCell, styles.nomeCell]}>
                    <Text style={styles.nomeText} numberOfLines={1}>
                      {obra ? obra.nome : obraId}
                    </Text>
                  </View>
                  {diasDoMes.map((dia) => {
                    const registro = registosObraColab[dia];
                    return (
                      <TouchableOpacity
                        key={dia}
                        style={[
                          styles.dataCell,
                          registro && styles.dataCellWithData,
                          registro?.integrado && styles.dataCellIntegrado,
                        ]}
                        onPress={() =>
                          registro &&
                          abrirDetalhes(obra, nomeColaborador, dia, registro)
                        }
                      >
                        <Text
                          style={[
                            styles.dataCellText,
                            registro && styles.dataCellTextBold,
                          ]}
                        >
                          {registro ? `${registro.horas.toFixed(1)}h` : "-"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={[styles.dataCell, styles.totalCell]}>
                    <Text style={styles.totalText}>{totalObra.toFixed(1)}h</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderGrelha = (obra) => {
    const registosObra = registosPorObra[obra.id] || {};
    const colaboradores = Object.keys(registosObra);

    if (colaboradores.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sem registos para este mês</Text>
        </View>
      );
    }

    const totalHoras = colaboradores.reduce((acc, colabId) => {
      return acc + Object.values(registosObra[colabId]).reduce((sum, dia) => sum + dia.horas, 0);
    }, 0);

    return (
      <View style={styles.obraCard}>
        <View style={styles.obraHeader}>
          <Text style={styles.obraNome}>{obra.nome}</Text>
          <Text style={styles.obraTotal}>Total: {totalHoras.toFixed(1)}h</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Cabeçalho com dias */}
            <View style={styles.headerRow}>
              <View style={[styles.headerCell, styles.nomeCell]}>
                <Text style={styles.headerText}>Trabalhador</Text>
              </View>
              {diasDoMes.map((dia) => (
                <View key={dia} style={styles.headerCell}>
                  <Text style={styles.headerText}>{dia}</Text>
                </View>
              ))}
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Total</Text>
              </View>
            </View>

            {/* Linhas de colaboradores */}
            {colaboradores.map((colabId) => {
              const registosColab = registosObra[colabId];
              const totalColab = Object.values(registosColab).reduce(
                (sum, dia) => sum + dia.horas,
                0
              );

              return (
                <View key={colabId} style={styles.dataRow}>
                  <View style={[styles.dataCell, styles.nomeCell]}>
                    <Text style={styles.nomeText} numberOfLines={1}>
                      {colaboradoresMap[colabId] || colabId}
                    </Text>
                  </View>
                  {diasDoMes.map((dia) => {
                    const registro = registosColab[dia];
                    return (
                      <TouchableOpacity
                        key={dia}
                        style={[
                          styles.dataCell,
                          registro && styles.dataCellWithData,
                          registro?.integrado && styles.dataCellIntegrado,
                        ]}
                        onPress={() =>
                          registro &&
                          abrirDetalhes(obra, colaboradoresMap[colabId], dia, registro)
                        }
                      >
                        <Text
                          style={[
                            styles.dataCellText,
                            registro && styles.dataCellTextBold,
                          ]}
                        >
                          {registro ? `${registro.horas.toFixed(1)}h` : "-"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={[styles.dataCell, styles.totalCell]}>
                    <Text style={styles.totalText}>{totalColab.toFixed(1)}h</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1792FE" />
        <Text style={styles.loadingText}>A carregar registos...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#e3f2fd", "#bbdefb", "#90caf9"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('GestaoPartesDiarias')}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Visualização em Grelha</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {/* Filtros de mês/ano */}
        <View style={styles.filtrosContainer}>
          <TouchableOpacity
            style={styles.filtroButton}
            onPress={() => {
              if (mesSelecionado === 0) {
                setMesSelecionado(11);
                setAnoSelecionado(anoSelecionado - 1);
              } else {
                setMesSelecionado(mesSelecionado - 1);
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#1792FE" />
          </TouchableOpacity>

          <View style={styles.periodoContainer}>
            <Text style={styles.periodoText}>
              {meses[mesSelecionado]} {anoSelecionado}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filtroButton}
            onPress={() => {
              if (mesSelecionado === 11) {
                setMesSelecionado(0);
                setAnoSelecionado(anoSelecionado + 1);
              } else {
                setMesSelecionado(mesSelecionado + 1);
              }
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#1792FE" />
          </TouchableOpacity>
        </View>

        {/* Botões de seleção de vista */}
        <View style={styles.vistaContainer}>
          <TouchableOpacity
            style={[
              styles.vistaButton,
              tipoVista === "obra" && styles.vistaButtonActive,
            ]}
            onPress={() => setTipoVista("obra")}
          >
            <Ionicons
              name="business"
              size={20}
              color={tipoVista === "obra" ? "#fff" : "#1792FE"}
            />
            <Text
              style={[
                styles.vistaButtonText,
                tipoVista === "obra" && styles.vistaButtonTextActive,
              ]}
            >
              Por Obra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.vistaButton,
              tipoVista === "utilizador" && styles.vistaButtonActive,
            ]}
            onPress={() => setTipoVista("utilizador")}
          >
            <Ionicons
              name="people"
              size={20}
              color={tipoVista === "utilizador" ? "#fff" : "#1792FE"}
            />
            <Text
              style={[
                styles.vistaButtonText,
                tipoVista === "utilizador" && styles.vistaButtonTextActive,
              ]}
            >
              Por Utilizador
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de obras ou utilizadores */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tipoVista === "obra" ? (
            obras.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Sem obras</Text>
                <Text style={styles.emptySubtitle}>
                  Não há obras onde você é responsável
                </Text>
              </View>
            ) : (
              obras.map((obra) => (
                <View key={obra.id}>{renderGrelha(obra)}</View>
              ))
            )
          ) : (
            Object.keys(colaboradoresMap).length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Sem utilizadores</Text>
                <Text style={styles.emptySubtitle}>
                  Não há registos de utilizadores para este período
                </Text>
              </View>
            ) : (
              Object.keys(colaboradoresMap)
                .sort((a, b) => 
                  colaboradoresMap[a].localeCompare(colaboradoresMap[b], 'pt')
                )
                .map((colaboradorId) => (
                  <View key={colaboradorId}>
                    {renderGrelhaPorUtilizador(colaboradorId)}
                  </View>
                ))
            )
          )}
        </ScrollView>

        {/* Modal de detalhes */}
        <Modal
          visible={modalDetalhes}
          animationType="slide"
          transparent
          onRequestClose={() => setModalDetalhes(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes do Registo</Text>
                <TouchableOpacity onPress={() => setModalDetalhes(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {detalheSelecionado && (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detalheItem}>
                    <Text style={styles.detalheLabel}>Obra:</Text>
                    <Text style={styles.detalheValor}>
                      {detalheSelecionado.obra.nome}
                    </Text>
                  </View>
                  <View style={styles.detalheItem}>
                    <Text style={styles.detalheLabel}>Trabalhador:</Text>
                    <Text style={styles.detalheValor}>
                      {detalheSelecionado.colaborador}
                    </Text>
                  </View>
                  <View style={styles.detalheItem}>
                    <Text style={styles.detalheLabel}>Dia:</Text>
                    <Text style={styles.detalheValor}>
                      {detalheSelecionado.dia}/{mesSelecionado + 1}/{anoSelecionado}
                    </Text>
                  </View>
                  <View style={styles.detalheItem}>
                    <Text style={styles.detalheLabel}>Total Horas:</Text>
                    <Text style={styles.detalheValor}>
                      {detalheSelecionado.dados.horas.toFixed(1)}h
                    </Text>
                  </View>
                  <View style={styles.detalheItem}>
                    <Text style={styles.detalheLabel}>Estado:</Text>
                    <View
                      style={[
                        styles.estadoBadge,
                        {
                          backgroundColor: detalheSelecionado.dados.integrado
                            ? "#28a745"
                            : "#ffc107",
                        },
                      ]}
                    >
                      <Text style={styles.estadoText}>
                        {detalheSelecionado.dados.integrado
                          ? "Integrado"
                          : "Pendente"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itensTitle}>Itens:</Text>
                  {detalheSelecionado.dados.itens.map((item, idx) => (
                    <View key={idx} style={styles.itemCard}>
                      <Text style={styles.itemText}>
                        Item {idx + 1}: {(item.NumHoras / 60).toFixed(1)}h
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#1792FE",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  filtrosContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
  },
  filtroButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  periodoContainer: {
    flex: 1,
    alignItems: "center",
  },
  periodoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  vistaContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  vistaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1792FE",
    elevation: 2,
  },
  vistaButtonActive: {
    backgroundColor: "#1792FE",
    borderColor: "#1792FE",
  },
  vistaButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1792FE",
  },
  vistaButtonTextActive: {
    color: "#fff",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  obraCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    overflow: "hidden",
  },
  obraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1792FE",
  },
  obraNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  obraTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 2,
    borderBottomColor: "#1792FE",
  },
  headerCell: {
    width: 50,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
  nomeCell: {
    width: 150,
    alignItems: "flex-start",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dataCell: {
    width: 50,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
  dataCellWithData: {
    backgroundColor: "#e3f2fd",
  },
  dataCellIntegrado: {
    backgroundColor: "#c8e6c9",
  },
  dataCellText: {
    fontSize: 11,
    color: "#666",
  },
  dataCellTextBold: {
    fontWeight: "bold",
    color: "#333",
  },
  nomeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  totalCell: {
    backgroundColor: "#f9f9f9",
  },
  totalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1792FE",
  },
  emptyCard: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    maxHeight: 400,
  },
  detalheItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detalheLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  detalheValor: {
    fontSize: 14,
    color: "#333",
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  itensTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
});

export default VisualizacaoGrelhaPartes;
