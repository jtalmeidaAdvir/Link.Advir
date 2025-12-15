
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
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { secureStorage } from "../../utils/secureStorage";
import { PieChart, BarChart } from "react-native-chart-kit";

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
  const [tipoVista, setTipoVista] = useState("obra"); // "obra", "utilizador", "dashboard", "relatorios"
  const [especialidadesMap, setEspecialidadesMap] = useState({});
  const [classesMap, setClassesMap] = useState({});
  const [dadosEstatisticos, setDadosEstatisticos] = useState({});
  const [obraSelecionadaDashboard, setObraSelecionadaDashboard] = useState(null);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [pesquisa, setPesquisa] = useState("");

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
      // Mapas para armazenar ClasseID e SubEmpID por colaborador
      const classeIdPorColaborador = {};
      const subEmpIdPorColaborador = {};

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

              // Armazenar ClasseID e SubEmpID do item (pegar o primeiro encontrado)
              if (item.ClasseID && !classeIdPorColaborador[colaboradorId]) {
                classeIdPorColaborador[colaboradorId] = item.ClasseID;
              }
              if (item.SubEmpID && !subEmpIdPorColaborador[colaboradorId]) {
                subEmpIdPorColaborador[colaboradorId] = item.SubEmpID;
              }

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

      // Carregar todas as classes e especialidades de uma vez (mais eficiente)
      const [todasClassesMap, todasEspecialidadesMap] = await Promise.all([
        carregarTodasClasses(token),
        carregarTodasEspecialidades(token),
      ]);

      console.log('📊 Classes carregadas:', Object.keys(todasClassesMap).length);
      console.log('📊 Especialidades carregadas:', Object.keys(todasEspecialidadesMap).length);
      console.log('📊 Exemplo de classe:', Object.entries(todasClassesMap)[0]);
      console.log('📊 Exemplo de especialidade:', Object.entries(todasEspecialidadesMap)[0]);

      // Buscar nomes dos colaboradores e mapear classes/especialidades
      const colaboradoresMapTemp = {};
      const especialidadesMapTemp = {};
      const classesMapTemp = {};

      for (const colabId of colaboradoresSet) {
        try {
          // Buscar nome do colaborador
          const nome = await obterNomeFuncionario(colabId, token);
          colaboradoresMapTemp[colabId] = nome || colabId;

          // Mapear nome da classe usando o mapa carregado
          if (classeIdPorColaborador[colabId]) {
            const classeId = classeIdPorColaborador[colabId];
            const nomeClasse = todasClassesMap[classeId];
            classesMapTemp[colabId] = nomeClasse || `Classe ${classeId}`;

            if (!nomeClasse) {
              console.log(`⚠️ Classe não encontrada - ColabID: ${colabId}, ClasseID: ${classeId}`);
            }
          } else {
            classesMapTemp[colabId] = "Não definida";
          }

          // Mapear nome da especialidade usando o mapa carregado
          if (subEmpIdPorColaborador[colabId]) {
            const subEmpId = subEmpIdPorColaborador[colabId];
            const nomeEspecialidade = todasEspecialidadesMap[subEmpId];
            especialidadesMapTemp[colabId] = nomeEspecialidade || `Especialidade ${subEmpId}`;

            if (!nomeEspecialidade) {
              console.log(`⚠️ Especialidade não encontrada - ColabID: ${colabId}, SubEmpID: ${subEmpId}`);
            }
          } else {
            especialidadesMapTemp[colabId] = "Não definida";
          }
        } catch (e) {
          console.error(`Erro ao obter dados do colaborador ${colabId}:`, e);
          colaboradoresMapTemp[colabId] = colabId;
          especialidadesMapTemp[colabId] = "Não definida";
          classesMapTemp[colabId] = "Não definida";
        }
      }
      setColaboradoresMap(colaboradoresMapTemp);
      setEspecialidadesMap(especialidadesMapTemp);
      setClassesMap(classesMapTemp);

      // Calcular estatísticas
      calcularEstatisticas(registosPorObraTemp, colaboradoresMapTemp, especialidadesMapTemp, classesMapTemp, obrasResponsavel);
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
        return data?.DataSet?.Table?.[0]?.Nome || codFuncionario;
      }
    } catch (e) {
      console.error("Erro ao obter nome do funcionário:", e);
    }
    return codFuncionario;
  };

  const carregarTodasClasses = async (token, tentativas = 3) => {
    for (let i = 0; i < tentativas; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${tentativas} - Carregando classes...`);
        const urlempresa = await secureStorage.getItem("urlempresa");

        const res = await fetch(
          "https://webapiprimavera.advir.pt/routesFaltas/GetListaClasses",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              urlempresa,
            },
          }
        );

        console.log('📡 Status da resposta Classes:', res.status);

        if (res.ok) {
          const data = await res.json();
          console.log('📦 Dados recebidos Classes:', data);

          const table = data?.DataSet?.Table;
          console.log('📊 Table Classes:', Array.isArray(table) ? `Array com ${table.length} itens` : typeof table);

          const classesMap = {};

          if (Array.isArray(table)) {
            table.forEach((item, idx) => {
              if (idx < 3) {
                console.log(`📋 Item ${idx} da classe:`, item);
              }
              if (item.ClasseId) {
                classesMap[item.ClasseId] = item.Descricao || item.Classe || `Classe ${item.ClasseId}`;
              }
            });
            console.log(`✅ ${Object.keys(classesMap).length} classes mapeadas com sucesso`);
            return classesMap;
          } else {
            console.warn('⚠️ Table não é array:', table);
          }
        } else {
          console.error('❌ Resposta não OK:', res.status, res.statusText);
        }
      } catch (e) {
        console.error(`❌ Erro na tentativa ${i + 1} ao carregar classes:`, e);
        if (i < tentativas - 1) {
          console.log(`⏳ Aguardando 1s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    console.error('❌ Falha ao carregar classes após todas as tentativas');
    return {};
  };

  const carregarTodasEspecialidades = async (token, tentativas = 3) => {
    for (let i = 0; i < tentativas; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${tentativas} - Carregando especialidades...`);
        const urlempresa = await secureStorage.getItem("urlempresa");

        const res = await fetch(
          "https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              urlempresa,
            },
          }
        );

        console.log('📡 Status da resposta Especialidades:', res.status);

        if (res.ok) {
          const data = await res.json();
          console.log('📦 Dados recebidos Especialidades:', data);

          const table = data?.DataSet?.Table;
          console.log('📊 Table Especialidades:', Array.isArray(table) ? `Array com ${table.length} itens` : typeof table);

          const especialidadesMap = {};

          if (Array.isArray(table)) {
            table.forEach((item, idx) => {
              if (idx < 3) {
                console.log(`📋 Item ${idx} da especialidade:`, item);
              }
              if (item.SubEmpId) {
                especialidadesMap[item.SubEmpId] = item.Descricao || item.SubEmp || `Especialidade ${item.SubEmpId}`;
              }
            });
            console.log(`✅ ${Object.keys(especialidadesMap).length} especialidades mapeadas com sucesso`);
            return especialidadesMap;
          } else {
            console.warn('⚠️ Table não é array:', table);
          }
        } else {
          console.error('❌ Resposta não OK:', res.status, res.statusText);
        }
      } catch (e) {
        console.error(`❌ Erro na tentativa ${i + 1} ao carregar especialidades:`, e);
        if (i < tentativas - 1) {
          console.log(`⏳ Aguardando 1s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    console.error('❌ Falha ao carregar especialidades após todas as tentativas');
    return {};
  };

  const calcularEstatisticas = (registos, colaboradores, especialidades, classes, obrasLista) => {
    const stats = {};

    obrasLista.forEach((obra) => {
      const registosObra = registos[obra.id] || {};

      const estatisticasObra = {
        totalHoras: 0,
        porEspecialidade: {},
        porClasse: {},
        porColaborador: {},
        diasTrabalhados: new Set(),
        colaboradoresUnicos: new Set(),
      };

      Object.keys(registosObra).forEach((colabId) => {
        const especialidade = especialidades[colabId] || "Não definida";
        const classe = classes[colabId] || "Não definida";
        const nome = colaboradores[colabId] || colabId;

        estatisticasObra.colaboradoresUnicos.add(colabId);

        Object.entries(registosObra[colabId]).forEach(([dia, dados]) => {
          const horas = dados.horas;
          estatisticasObra.totalHoras += horas;
          estatisticasObra.diasTrabalhados.add(dia);

          // Por especialidade
          if (!estatisticasObra.porEspecialidade[especialidade]) {
            estatisticasObra.porEspecialidade[especialidade] = { horas: 0, colaboradores: new Set() };
          }
          estatisticasObra.porEspecialidade[especialidade].horas += horas;
          estatisticasObra.porEspecialidade[especialidade].colaboradores.add(colabId);

          // Por classe
          if (!estatisticasObra.porClasse[classe]) {
            estatisticasObra.porClasse[classe] = { horas: 0, colaboradores: new Set() };
          }
          estatisticasObra.porClasse[classe].horas += horas;
          estatisticasObra.porClasse[classe].colaboradores.add(colabId);

          // Por colaborador
          if (!estatisticasObra.porColaborador[nome]) {
            estatisticasObra.porColaborador[nome] = { horas: 0, dias: new Set() };
          }
          estatisticasObra.porColaborador[nome].horas += horas;
          estatisticasObra.porColaborador[nome].dias.add(dia);
        });
      });

      // Converter Sets para números
      estatisticasObra.diasTrabalhados = estatisticasObra.diasTrabalhados.size;
      estatisticasObra.colaboradoresUnicos = estatisticasObra.colaboradoresUnicos.size;

      Object.keys(estatisticasObra.porEspecialidade).forEach(esp => {
        estatisticasObra.porEspecialidade[esp].colaboradores = estatisticasObra.porEspecialidade[esp].colaboradores.size;
      });

      Object.keys(estatisticasObra.porClasse).forEach(cls => {
        estatisticasObra.porClasse[cls].colaboradores = estatisticasObra.porClasse[cls].colaboradores.size;
      });

      Object.keys(estatisticasObra.porColaborador).forEach(nome => {
        estatisticasObra.porColaborador[nome].dias = estatisticasObra.porColaborador[nome].dias.size;
      });

      stats[obra.id] = estatisticasObra;
    });

    setDadosEstatisticos(stats);
  };

  const diasDoMes = useMemo(() => {
    const ultimoDia = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => i + 1);
  }, [mesSelecionado, anoSelecionado]);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Filtrar obras baseado na pesquisa
  const obrasFiltradas = useMemo(() => {
    if (!pesquisa.trim()) return obras;

    const termoPesquisa = pesquisa.toLowerCase().trim();
    return obras.filter(obra =>
      obra.nome?.toLowerCase().includes(termoPesquisa) ||
      obra.codigo?.toLowerCase().includes(termoPesquisa)
    );
  }, [obras, pesquisa]);

  // Filtrar colaboradores baseado na pesquisa
  const colaboradoresFiltrados = useMemo(() => {
    if (!pesquisa.trim()) return Object.keys(colaboradoresMap);

    const termoPesquisa = pesquisa.toLowerCase().trim();
    return Object.keys(colaboradoresMap).filter(colabId =>
      colaboradoresMap[colabId]?.toLowerCase().includes(termoPesquisa) ||
      colabId?.toLowerCase().includes(termoPesquisa)
    );
  }, [colaboradoresMap, pesquisa]);

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

  const renderDashboardObra = (obra) => {
    const stats = dadosEstatisticos[obra.id];
    if (!stats || stats.totalHoras === 0) {
      return (
        <View >
          <Text style={styles.emptyText}></Text>
        </View>
      );
    }

    // Dados para gráfico de pizza - Especialidades
    const coresEspecialidades = ['#1792FE', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'];
    const dadosEspecialidades = Object.entries(stats.porEspecialidade).map(([esp, dados], idx) => ({
      name: esp,
      horas: dados.horas,
      color: coresEspecialidades[idx % coresEspecialidades.length],
      legendFontColor: '#333',
      legendFontSize: 12,
    }));

    // Dados para gráfico de pizza - Classes
    const coresClasses = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2'];
    const dadosClasses = Object.entries(stats.porClasse).map(([classe, dados], idx) => ({
      name: classe,
      horas: dados.horas,
      color: coresClasses[idx % coresClasses.length],
      legendFontColor: '#333',
      legendFontSize: 12,
    }));

    // Top 5 colaboradores
    const topColaboradores = Object.entries(stats.porColaborador)
      .sort((a, b) => b[1].horas - a[1].horas)
      .slice(0, 5);

    return (
      <View style={styles.dashboardCard}>
        <View style={styles.dashboardHeader}>
          <MaterialCommunityIcons name="chart-box" size={24} color="#fff" />
          <Text style={styles.dashboardTitle}>{obra.nome}</Text>
        </View>

        {/* Métricas principais */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <MaterialCommunityIcons name="clock-outline" size={32} color="#1792FE" />
            <Text style={styles.metricValue}>{stats.totalHoras.toFixed(1)}h</Text>
            <Text style={styles.metricLabel}>Total de Horas</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialCommunityIcons name="account-group" size={32} color="#28a745" />
            <Text style={styles.metricValue}>{stats.colaboradoresUnicos}</Text>
            <Text style={styles.metricLabel}>Colaboradores</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialCommunityIcons name="calendar-check" size={32} color="#ffc107" />
            <Text style={styles.metricValue}>{stats.diasTrabalhados}</Text>
            <Text style={styles.metricLabel}>Dias Trabalhados</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialCommunityIcons name="chart-line" size={32} color="#dc3545" />
            <Text style={styles.metricValue}>
              {(stats.totalHoras / stats.diasTrabalhados).toFixed(1)}h
            </Text>
            <Text style={styles.metricLabel}>Média/Dia</Text>
          </View>
        </View>

        {/* Gráfico de Especialidades */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Horas por Especialidade</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <PieChart
              data={dadosEspecialidades}
              width={width - 60}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="horas"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </ScrollView>
          {/* Tabela de detalhes */}
          <View style={styles.detailTable}>
            {Object.entries(stats.porEspecialidade).map(([esp, dados]) => (
              <View key={esp} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{esp}</Text>
                <Text style={styles.detailValue}>
                  {dados.horas.toFixed(1)}h ({dados.colaboradores} pessoas)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gráfico de Classes */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Horas por Classe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <PieChart
              data={dadosClasses}
              width={width - 60}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="horas"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </ScrollView>
          {/* Tabela de detalhes */}
          <View style={styles.detailTable}>
            {Object.entries(stats.porClasse).map(([classe, dados]) => (
              <View key={classe} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{classe}</Text>
                <Text style={styles.detailValue}>
                  {dados.horas.toFixed(1)}h ({dados.colaboradores} pessoas)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Colaboradores */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Top 5 Colaboradores</Text>
          {topColaboradores.map(([nome, dados], idx) => (
            <View key={nome} style={styles.rankingItem}>
              <View style={styles.rankingPosition}>
                <Text style={styles.rankingNumber}>{idx + 1}</Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingName}>{nome}</Text>
                <Text style={styles.rankingStats}>
                  {dados.horas.toFixed(1)}h em {dados.dias} dias
                </Text>
              </View>
              <View style={styles.rankingBar}>
                <View
                  style={[
                    styles.rankingBarFill,
                    {
                      width: `${(dados.horas / stats.totalHoras) * 100}%`,
                      backgroundColor: coresEspecialidades[idx],
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Botão para relatório detalhado */}
        <TouchableOpacity
          style={styles.relatorioButton}
          onPress={() => {
            setObraSelecionadaDashboard(obra);
            setModalRelatorio(true);
          }}
        >
          <MaterialCommunityIcons name="file-document" size={20} color="#fff" />
          <Text style={styles.relatorioButtonText}>Ver Relatório Completo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGrelha = (obra) => {
    const registosObra = registosPorObra[obra.id] || {};
    const colaboradores = Object.keys(registosObra);

    if (colaboradores.length === 0) {
      return (
        <View >
          <Text style={styles.emptyText}></Text>
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
        {/* Header Fixo */}
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

        {/* Scroll Principal - Contém tudo abaixo do header */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={true}
        >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.vistaScrollContainer}
          contentContainerStyle={styles.vistaContainer}
        >
          <TouchableOpacity
            style={[
              styles.vistaButton,
              tipoVista === "obra" && styles.vistaButtonActive,
            ]}
            onPress={() => setTipoVista("obra")}
          >
            <Ionicons
              name="business"
              size={18}
              color={tipoVista === "obra" ? "#fff" : "#1792FE"}
            />
            <Text
              style={[
                styles.vistaButtonText,
                tipoVista === "obra" && styles.vistaButtonTextActive,
              ]}
            >
              Obra
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
              size={18}
              color={tipoVista === "utilizador" ? "#fff" : "#1792FE"}
            />
            <Text
              style={[
                styles.vistaButtonText,
                tipoVista === "utilizador" && styles.vistaButtonTextActive,
              ]}
            >
              Colab.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.vistaButton,
              tipoVista === "dashboard" && styles.vistaButtonActive,
            ]}
            onPress={() => setTipoVista("dashboard")}
          >
            <MaterialCommunityIcons
              name="chart-box"
              size={18}
              color={tipoVista === "dashboard" ? "#fff" : "#1792FE"}
            />
            <Text
              style={[
                styles.vistaButtonText,
                tipoVista === "dashboard" && styles.vistaButtonTextActive,
              ]}
            >
              Dash
            </Text>
          </TouchableOpacity>
        </ScrollView>

          {/* Barra de Pesquisa */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  tipoVista === "obra"
                    ? "Pesquisar obra..."
                    : tipoVista === "utilizador"
                    ? "Pesquisar utilizador..."
                    : "Pesquisar obra..."
                }
                placeholderTextColor="#999"
                value={pesquisa}
                onChangeText={setPesquisa}
              />
              {pesquisa.length > 0 && (
                <TouchableOpacity onPress={() => setPesquisa("")}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Lista de obras ou utilizadores */}
          <View style={styles.contentContainer}>
          {tipoVista === "obra" ? (
            obrasFiltradas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>
                  {pesquisa ? "Nenhuma obra encontrada" : "Sem obras"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {pesquisa
                    ? `Nenhuma obra corresponde a "${pesquisa}"`
                    : "Não há obras onde você é responsável"}
                </Text>
              </View>
            ) : (
              obrasFiltradas.map((obra) => (
                <View key={obra.id}>{renderGrelha(obra)}</View>
              ))
            )
          ) : tipoVista === "utilizador" ? (
            colaboradoresFiltrados.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>
                  {pesquisa ? "Nenhum utilizador encontrado" : "Sem utilizadores"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {pesquisa
                    ? `Nenhum utilizador corresponde a "${pesquisa}"`
                    : "Não há registos de utilizadores para este período"}
                </Text>
              </View>
            ) : (
              colaboradoresFiltrados
                .sort((a, b) =>
                  colaboradoresMap[a].localeCompare(colaboradoresMap[b], 'pt')
                )
                .map((colaboradorId) => (
                  <View key={colaboradorId}>
                    {renderGrelhaPorUtilizador(colaboradorId)}
                  </View>
                ))
            )
          ) : tipoVista === "dashboard" ? (
            obrasFiltradas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="chart-box" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>
                  {pesquisa ? "Nenhuma obra encontrada" : "Sem dados"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {pesquisa
                    ? `Nenhuma obra corresponde a "${pesquisa}"`
                    : "Não há obras para mostrar estatísticas"}
                </Text>
              </View>
            ) : (
              obrasFiltradas.map((obra) => (
                <View key={obra.id}>{renderDashboardObra(obra)}</View>
              ))
            )
          ) : null}
          </View>
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

        {/* Modal de Relatório Completo */}
        <Modal
          visible={modalRelatorio}
          animationType="slide"
          transparent
          onRequestClose={() => setModalRelatorio(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: width * 0.95, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="file-document" size={24} color="#1792FE" />
                <Text style={styles.modalTitle}>Relatório Detalhado</Text>
                <TouchableOpacity onPress={() => setModalRelatorio(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {obraSelecionadaDashboard && dadosEstatisticos[obraSelecionadaDashboard.id] && (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.relatorioHeader}>
                    <Text style={styles.relatorioObraNome}>
                      {obraSelecionadaDashboard.nome}
                    </Text>
                    <Text style={styles.relatorioPeriodo}>
                      {meses[mesSelecionado]} {anoSelecionado}
                    </Text>
                  </View>

                  {/* Resumo Executivo */}
                  <View style={styles.relatorioSection}>
                    <Text style={styles.relatorioSectionTitle}>
                      📊 Resumo Executivo
                    </Text>
                    <View style={styles.relatorioGrid}>
                      <View style={styles.relatorioMetric}>
                        <Text style={styles.relatorioMetricLabel}>Total de Horas</Text>
                        <Text style={styles.relatorioMetricValue}>
                          {dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras.toFixed(1)}h
                        </Text>
                      </View>
                      <View style={styles.relatorioMetric}>
                        <Text style={styles.relatorioMetricLabel}>Colaboradores</Text>
                        <Text style={styles.relatorioMetricValue}>
                          {dadosEstatisticos[obraSelecionadaDashboard.id].colaboradoresUnicos}
                        </Text>
                      </View>
                      <View style={styles.relatorioMetric}>
                        <Text style={styles.relatorioMetricLabel}>Dias Trabalhados</Text>
                        <Text style={styles.relatorioMetricValue}>
                          {dadosEstatisticos[obraSelecionadaDashboard.id].diasTrabalhados}
                        </Text>
                      </View>
                      <View style={styles.relatorioMetric}>
                        <Text style={styles.relatorioMetricLabel}>Média Diária</Text>
                        <Text style={styles.relatorioMetricValue}>
                          {(dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras /
                            dadosEstatisticos[obraSelecionadaDashboard.id].diasTrabalhados).toFixed(1)}h
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Detalhamento por Especialidade */}
                  <View style={styles.relatorioSection}>
                    <Text style={styles.relatorioSectionTitle}>
                      👷 Detalhamento por Especialidade
                    </Text>
                    {Object.entries(dadosEstatisticos[obraSelecionadaDashboard.id].porEspecialidade)
                      .sort((a, b) => b[1].horas - a[1].horas)
                      .map(([esp, dados]) => (
                        <View key={esp} style={styles.relatorioItem}>
                          <View style={styles.relatorioItemHeader}>
                            <Text style={styles.relatorioItemTitle}>{esp}</Text>
                            <Text style={styles.relatorioItemHoras}>
                              {dados.horas.toFixed(1)}h
                            </Text>
                          </View>
                          <View style={styles.relatorioItemDetails}>
                            <Text style={styles.relatorioItemDetailText}>
                              {dados.colaboradores} colaborador{dados.colaboradores > 1 ? 'es' : ''}
                            </Text>
                            <Text style={styles.relatorioItemDetailText}>
                              {((dados.horas / dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras) * 100).toFixed(1)}% do total
                            </Text>
                          </View>
                          <View style={styles.relatorioProgressBar}>
                            <View
                              style={[
                                styles.relatorioProgressFill,
                                {
                                  width: `${(dados.horas / dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                  </View>

                  {/* Detalhamento por Classe */}
                  <View style={styles.relatorioSection}>
                    <Text style={styles.relatorioSectionTitle}>
                      🎯 Detalhamento por Classe
                    </Text>
                    {Object.entries(dadosEstatisticos[obraSelecionadaDashboard.id].porClasse)
                      .sort((a, b) => b[1].horas - a[1].horas)
                      .map(([classe, dados]) => (
                        <View key={classe} style={styles.relatorioItem}>
                          <View style={styles.relatorioItemHeader}>
                            <Text style={styles.relatorioItemTitle}>{classe}</Text>
                            <Text style={styles.relatorioItemHoras}>
                              {dados.horas.toFixed(1)}h
                            </Text>
                          </View>
                          <View style={styles.relatorioItemDetails}>
                            <Text style={styles.relatorioItemDetailText}>
                              {dados.colaboradores} colaborador{dados.colaboradores > 1 ? 'es' : ''}
                            </Text>
                            <Text style={styles.relatorioItemDetailText}>
                              {((dados.horas / dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras) * 100).toFixed(1)}% do total
                            </Text>
                          </View>
                          <View style={styles.relatorioProgressBar}>
                            <View
                              style={[
                                styles.relatorioProgressFill,
                                {
                                  width: `${(dados.horas / dadosEstatisticos[obraSelecionadaDashboard.id].totalHoras) * 100}%`,
                                  backgroundColor: '#28a745',
                                },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                  </View>

                  {/* Ranking de Colaboradores Completo */}
                  <View style={styles.relatorioSection}>
                    <Text style={styles.relatorioSectionTitle}>
                      🏆 Ranking Completo de Colaboradores
                    </Text>
                    {Object.entries(dadosEstatisticos[obraSelecionadaDashboard.id].porColaborador)
                      .sort((a, b) => b[1].horas - a[1].horas)
                      .map(([nome, dados], idx) => (
                        <View key={nome} style={styles.relatorioColabItem}>
                          <View style={styles.relatorioColabPosition}>
                            <Text style={styles.relatorioColabNumber}>#{idx + 1}</Text>
                          </View>
                          <View style={styles.relatorioColabInfo}>
                            <Text style={styles.relatorioColabNome}>{nome}</Text>
                            <View style={styles.relatorioColabStats}>
                              <Text style={styles.relatorioColabStat}>
                                ⏱️ {dados.horas.toFixed(1)}h
                              </Text>
                              <Text style={styles.relatorioColabStat}>
                                📅 {dados.dias} dias
                              </Text>
                              <Text style={styles.relatorioColabStat}>
                                📊 {(dados.horas / dados.dias).toFixed(1)}h/dia
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalRelatorio(false)}
              >
                <Text style={styles.modalCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
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
  vistaScrollContainer: {
    maxHeight: 60,
  },
  vistaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  vistaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1792FE",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  vistaButtonActive: {
    backgroundColor: "#1792FE",
    borderColor: "#1792FE",
  },
  vistaButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1792FE",
    whiteSpace: "nowrap",
  },
  vistaButtonTextActive: {
    color: "#fff",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 4,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
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
  // Estilos do Dashboard
  dashboardCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    overflow: "hidden",
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#1792FE",
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  metricBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1792FE",
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  chartSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  detailTable: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: "#666",
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  rankingPosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1792FE",
    alignItems: "center",
    justifyContent: "center",
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  rankingStats: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  rankingBar: {
    width: 80,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  rankingBarFill: {
    height: "100%",
    backgroundColor: "#1792FE",
  },
  relatorioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1792FE",
    padding: 14,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  relatorioButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Estilos do Modal de Relatório
  relatorioHeader: {
    backgroundColor: "#1792FE",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  relatorioObraNome: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  relatorioPeriodo: {
    fontSize: 14,
    color: "#e3f2fd",
  },
  relatorioSection: {
    marginBottom: 24,
  },
  relatorioSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  relatorioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  relatorioMetric: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  relatorioMetricLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  relatorioMetricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1792FE",
  },
  relatorioItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  relatorioItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  relatorioItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  relatorioItemHoras: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1792FE",
  },
  relatorioItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  relatorioItemDetailText: {
    fontSize: 12,
    color: "#666",
  },
  relatorioProgressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  relatorioProgressFill: {
    height: "100%",
    backgroundColor: "#1792FE",
  },
  relatorioColabItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  relatorioColabPosition: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1792FE",
    alignItems: "center",
    justifyContent: "center",
  },
  relatorioColabNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  relatorioColabInfo: {
    flex: 1,
  },
  relatorioColabNome: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  relatorioColabStats: {
    flexDirection: "row",
    gap: 12,
  },
  relatorioColabStat: {
    fontSize: 12,
    color: "#666",
  },
  modalCloseButton: {
    backgroundColor: "#1792FE",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default VisualizacaoGrelhaPartes;
