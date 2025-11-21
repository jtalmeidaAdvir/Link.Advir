import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    RefreshControl,
    TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { secureStorage } from "../../utils/secureStorage";
import { StyleSheet } from "react-native";

const PartesDiariasJPA = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [registosPonto, setRegistosPonto] = useState([]);
    const [obras, setObras] = useState([]);
    const [estatisticas, setEstatisticas] = useState(null);
    const [mesAno, setMesAno] = useState({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
    });
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [tipoVisualizacao, setTipoVisualizacao] = useState("utilizador"); // 'utilizador' ou 'obra'
    const [editingCell, setEditingCell] = useState(null); // { userId, obraId, dia }
    const [editValue, setEditValue] = useState("");

    // Dias do mês
    const diasDoMes = useMemo(() => {
        const diasNoMes = new Date(mesAno.ano, mesAno.mes, 0).getDate();
        return Array.from({ length: diasNoMes }, (_, i) => i + 1);
    }, [mesAno.mes, mesAno.ano]);

    // Carregar dados
    const carregarDados = useCallback(async () => {
        try {
            const token = await secureStorage.getItem("loginToken");

            // Carregar registos de ponto JPA
            const urlRegistos = `https://backend.advir.pt/api/parte-diaria-jpa/cabecalhos?mes=${mesAno.mes}&ano=${mesAno.ano}`;

            const respRegistos = await fetch(urlRegistos, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!respRegistos.ok) throw new Error("Erro ao carregar registos JPA");

            const registos = await respRegistos.json();
            setRegistosPonto(registos);

            // Carregar estatísticas
            const urlStats = `https://backend.advir.pt/api/parte-diaria-jpa/estatisticas?mes=${mesAno.mes}&ano=${mesAno.ano}`;

            const respStats = await fetch(urlStats, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (respStats.ok) {
                const stats = await respStats.json();
                setEstatisticas(stats);
            }

            // Extrair obras únicas
            const obrasUnicas = new Map();
            registos.forEach((r) => {
                if (r.Obra && !obrasUnicas.has(r.Obra.id)) {
                    obrasUnicas.set(r.Obra.id, {
                        id: r.Obra.id,
                        nome: r.Obra.nome || `Obra ${r.Obra.id}`,
                        localizacao: r.Obra.localizacao || "",
                    });
                }
            });
            setObras(Array.from(obrasUnicas.values()));

        } catch (error) {
            console.error("Erro ao carregar dados JPA:", error);
            Alert.alert("Erro", "Não foi possível carregar os dados da JPA");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [mesAno]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        carregarDados();
    }, [carregarDados]);

    // Agrupar registos por utilizador
    const dadosPorUtilizador = useMemo(() => {
        const grupos = new Map();

        registosPonto.forEach((registo) => {
            if (!registo.Obra || !registo.User) return;

            const obraId = registo.Obra.id;
            const userId = registo.User.id;
            const key = `${userId}-${obraId}`;

            if (!grupos.has(key)) {
                grupos.set(key, {
                    obraId,
                    obraNome: registo.Obra.nome || `Obra ${obraId}`,
                    userId,
                    userName: registo.User.nome,
                    horasPorDia: Object.fromEntries(diasDoMes.map(d => [d, 0])),
                    registos: [],
                });
            }

            grupos.get(key).registos.push(registo);
        });

        // Calcular horas por dia
        grupos.forEach((grupo) => {
            const registosPorDia = new Map();

            grupo.registos.forEach((r) => {
                const data = new Date(r.timestamp);
                const dia = data.getDate();

                if (!registosPorDia.has(dia)) {
                    registosPorDia.set(dia, []);
                }

                registosPorDia.get(dia).push(r);
            });

            registosPorDia.forEach((registosDia, dia) => {
                // Verificar se algum registo deste dia foi editado manualmente
                const registoEditado = registosDia.find(r => r.editadoManualmente && r.horasEditadas !== undefined);

                if (registoEditado) {
                    // Usar o valor editado manualmente
                    grupo.horasPorDia[dia] = registoEditado.horasEditadas;
                } else {
                    // Calcular normally
                    const eventosOrdenados = registosDia.sort((a, b) => 
                        new Date(a.timestamp) - new Date(b.timestamp)
                    );

                    let totalMinutosDia = 0;
                    let ultimaEntrada = null;

                    eventosOrdenados.forEach((reg) => {
                        if (reg.tipo === 'entrada') {
                            ultimaEntrada = new Date(reg.timestamp);
                        } else if (reg.tipo === 'saida' && ultimaEntrada) {
                            const saida = new Date(reg.timestamp);
                            const diffMs = saida - ultimaEntrada;
                            const diffMinutos = Math.round(diffMs / (1000 * 60));

                            if (diffMinutos > 0 && diffMinutos < 1440) {
                                totalMinutosDia += diffMinutos;
                            }

                            ultimaEntrada = null;
                        }
                    });

                    grupo.horasPorDia[dia] = totalMinutosDia;
                }
            });
        });

        const porUtilizador = new Map();
        grupos.forEach((grupo) => {
            if (!porUtilizador.has(grupo.userId)) {
                porUtilizador.set(grupo.userId, {
                    userId: grupo.userId,
                    userName: grupo.userName,
                    obras: [],
                });
            }
            porUtilizador.get(grupo.userId).obras.push(grupo);
        });

        return porUtilizador;
    }, [registosPonto, diasDoMes]);

    // Agrupar registos por obra
    const dadosPorObra = useMemo(() => {
        const grupos = new Map();

        registosPonto.forEach((registo) => {
            if (!registo.Obra || !registo.User) return;

            const obraId = registo.Obra.id;
            const userId = registo.User.id;
            const key = `${obraId}-${userId}`;

            if (!grupos.has(key)) {
                grupos.set(key, {
                    obraId,
                    obraNome: registo.Obra.nome || `Obra ${obraId}`,
                    userId,
                    userName: registo.User.nome,
                    horasPorDia: Object.fromEntries(diasDoMes.map(d => [d, 0])),
                    registos: [],
                });
            }

            grupos.get(key).registos.push(registo);
        });

        // Calcular horas por dia
        grupos.forEach((grupo) => {
            const registosPorDia = new Map();

            grupo.registos.forEach((r) => {
                const data = new Date(r.timestamp);
                const dia = data.getDate();

                if (!registosPorDia.has(dia)) {
                    registosPorDia.set(dia, []);
                }

                registosPorDia.get(dia).push(r);
            });

            registosPorDia.forEach((registosDia, dia) => {
                // Verificar se algum registo deste dia foi editado manualmente
                const registoEditado = registosDia.find(r => r.editadoManualmente && r.horasEditadas !== undefined);

                if (registoEditado) {
                    // Usar o valor editado manualmente
                    grupo.horasPorDia[dia] = registoEditado.horasEditadas;
                } else {
                    // Calcular normalmente
                    const eventosOrdenados = registosDia.sort((a, b) => 
                        new Date(a.timestamp) - new Date(b.timestamp)
                    );

                    let totalMinutosDia = 0;
                    let ultimaEntrada = null;

                    eventosOrdenados.forEach((reg) => {
                        if (reg.tipo === 'entrada') {
                            ultimaEntrada = new Date(reg.timestamp);
                        } else if (reg.tipo === 'saida' && ultimaEntrada) {
                            const saida = new Date(reg.timestamp);
                            const diffMs = saida - ultimaEntrada;
                            const diffMinutos = Math.round(diffMs / (1000 * 60));

                            if (diffMinutos > 0 && diffMinutos < 1440) {
                                totalMinutosDia += diffMinutos;
                            }

                            ultimaEntrada = null;
                        }
                    });

                    grupo.horasPorDia[dia] = totalMinutosDia;
                }
            });
        });

        const porObra = new Map();
        grupos.forEach((grupo) => {
            if (!porObra.has(grupo.obraId)) {
                porObra.set(grupo.obraId, {
                    obraId: grupo.obraId,
                    obraNome: grupo.obraNome,
                    utilizadores: [],
                });
            }
            porObra.get(grupo.obraId).utilizadores.push(grupo);
        });

        return porObra;
    }, [registosPonto, diasDoMes]);

    // Filtrar dados
    const dadosFiltrados = useMemo(() => {
        if (tipoVisualizacao === "utilizador") {
            if (obraSelecionada === null || obraSelecionada === undefined) {
                return dadosPorUtilizador;
            }

            const obraIdNumber = Number(obraSelecionada);
            const filtrado = new Map();

            dadosPorUtilizador.forEach((userGroup, userId) => {
                const obrasDoUtilizador = userGroup.obras.filter(
                    obra => Number(obra.obraId) === obraIdNumber
                );

                if (obrasDoUtilizador.length > 0) {
                    filtrado.set(userId, {
                        userId: userGroup.userId,
                        userName: userGroup.userName,
                        obras: obrasDoUtilizador,
                    });
                }
            });

            return filtrado;
        } else {
            if (obraSelecionada === null || obraSelecionada === undefined) {
                return dadosPorObra;
            }

            const obraIdNumber = Number(obraSelecionada);
            const obraData = dadosPorObra.get(obraIdNumber);

            if (!obraData) return new Map();

            const filtrado = new Map();
            filtrado.set(obraIdNumber, obraData);
            return filtrado;
        }
    }, [dadosPorUtilizador, dadosPorObra, obraSelecionada, tipoVisualizacao]);

    // Formatar horas
    const formatarHorasMinutos = (minutos) => {
        if (minutos === 0) return "-";
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        if (horas === 0) return `${mins}m`;
        if (mins === 0) return `${horas}h`;
        return `${horas}h${mins.toString().padStart(2, "0")}`;
    };

    // Iniciar edição de célula
    const iniciarEdicao = (userId, obraId, dia, minutosAtuais) => {
        setEditingCell({ userId, obraId, dia });
        const horas = Math.floor(minutosAtuais / 60);
        const mins = minutosAtuais % 60;
        setEditValue(`${horas}:${mins.toString().padStart(2, "0")}`);
    };

    // Salvar edição
    const salvarEdicao = () => {
        if (!editingCell) {
            setEditingCell(null);
            return;
        }

        // Se não há valor, cancelar
        if (!editValue || editValue.trim() === '') {
            setEditingCell(null);
            setEditValue("");
            return;
        }

        // Parsear o valor editado (formato: "9:20" ou "9.33" ou "9")
        let novoMinutos = 0;

        if (editValue.includes(':')) {
            const [horas, mins] = editValue.split(':').map(v => parseInt(v) || 0);
            novoMinutos = horas * 60 + mins;
        } else if (editValue.includes('.')) {
            const horas = parseFloat(editValue) || 0;
            novoMinutos = Math.round(horas * 60);
        } else {
            const horas = parseInt(editValue) || 0;
            novoMinutos = horas * 60;
        }

        // Atualizar os dados localmente
        setRegistosPonto(prevRegistos => {
            // Criar uma cópia dos registos
            const novosRegistos = [...prevRegistos];

            // Encontrar o registo correspondente
            const index = novosRegistos.findIndex(r => 
                r.User && r.Obra &&
                r.User.id === editingCell.userId && 
                r.Obra.id === editingCell.obraId &&
                new Date(r.timestamp).getDate() === editingCell.dia
            );

            if (index !== -1) {
                // Atualizar registo existente
                novosRegistos[index] = {
                    ...novosRegistos[index],
                    horasEditadas: novoMinutos,
                    editadoManualmente: true,
                };
            } else {
                // Criar novo registo se não existir
                const dataRegisto = new Date(mesAno.ano, mesAno.mes - 1, editingCell.dia, 9, 0, 0);
                
                // Encontrar dados do utilizador e obra
                const userInfo = Array.from(dadosPorUtilizador.values())
                    .find(u => u.userId === editingCell.userId);
                const obraInfo = obras.find(o => o.id === editingCell.obraId);

                novosRegistos.push({
                    id: `temp-${Date.now()}`,
                    timestamp: dataRegisto.toISOString(),
                    tipo: 'entrada',
                    horasEditadas: novoMinutos,
                    editadoManualmente: true,
                    User: {
                        id: editingCell.userId,
                        nome: userInfo?.userName || 'Utilizador',
                    },
                    Obra: {
                        id: editingCell.obraId,
                        nome: obraInfo?.nome || 'Obra',
                        localizacao: obraInfo?.localizacao || '',
                    },
                });
            }
            
            Alert.alert(
                "Edição Local",
                `Horas atualizadas para ${formatarHorasMinutos(novoMinutos)}\n\nNota: Esta alteração é apenas local. Implemente a sincronização com o backend para persistir os dados.`,
                [{ text: "OK" }]
            );

            return novosRegistos;
        });

        setEditingCell(null);
        setEditValue("");
    };

    // Função para integrar dados (placeholder)
    const integrarDados = () => {
        Alert.alert(
            "Em Desenvolvimento",
            "A funcionalidade de integração ainda está a ser implementada.",
            [{ text: "OK" }]
        );
    };

    // Cancelar edição
    const cancelarEdicao = () => {
        setEditingCell(null);
        setEditValue("");
    };

    const renderHeader = () => (
        <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.header}>
            <SafeAreaView>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>JPA Partes Diárias</Text>
                        <Text style={styles.headerSubtitle}>
                            {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString("pt-PT", {
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity onPress={integrarDados} style={styles.integrarButton}>
                            <MaterialCommunityIcons name="database-sync" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                            <Ionicons name="refresh" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    const renderControls = () => (
        <View style={styles.controlsCard}>
            {/* Seletor de Mês */}
            <View style={styles.monthSelectorContainer}>
                <Text style={styles.sectionLabel}>Período</Text>
                <View style={styles.monthSelector}>
                    <TouchableOpacity
                        style={styles.monthButton}
                        onPress={() => {
                            const novoMes = mesAno.mes === 1 ? 12 : mesAno.mes - 1;
                            const novoAno = mesAno.mes === 1 ? mesAno.ano - 1 : mesAno.ano;
                            setMesAno({ mes: novoMes, ano: novoAno });
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#2196F3" />
                    </TouchableOpacity>

                    <View style={styles.monthDisplay}>
                        <Text style={styles.monthText}>
                            {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString("pt-PT", {
                                month: "long",
                            }).toUpperCase()}
                        </Text>
                        <Text style={styles.yearText}>{mesAno.ano}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.monthButton}
                        onPress={() => {
                            const novoMes = mesAno.mes === 12 ? 1 : mesAno.mes + 1;
                            const novoAno = mesAno.mes === 12 ? mesAno.ano + 1 : mesAno.ano;
                            setMesAno({ mes: novoMes, ano: novoAno });
                        }}
                    >
                        <Ionicons name="chevron-forward" size={24} color="#2196F3" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Toggle de Visualização */}
            <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Visualização</Text>
                <View style={styles.filterButtonsGroup}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            tipoVisualizacao === "utilizador" && styles.filterButtonActive,
                        ]}
                        onPress={() => setTipoVisualizacao("utilizador")}
                    >
                        <Ionicons
                            name="people"
                            size={16}
                            color={tipoVisualizacao === "utilizador" ? "#fff" : "#2196F3"}
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                tipoVisualizacao === "utilizador" && styles.filterButtonTextActive,
                            ]}
                        >
                            Por Utilizador
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            tipoVisualizacao === "obra" && styles.filterButtonActive,
                        ]}
                        onPress={() => setTipoVisualizacao("obra")}
                    >
                        <MaterialCommunityIcons
                            name="office-building"
                            size={16}
                            color={tipoVisualizacao === "obra" ? "#fff" : "#2196F3"}
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                tipoVisualizacao === "obra" && styles.filterButtonTextActive,
                            ]}
                        >
                            Por Obra
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filtros */}
            {obras.length > 0 && (
                <View style={styles.filtersRow}>
                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Obra</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={obraSelecionada}
                                onValueChange={(value) => setObraSelecionada(value)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Todas as obras" value={null} />
                                {obras.map((obra) => (
                                    <Picker.Item
                                        key={obra.id}
                                        label={obra.nome}
                                        value={obra.id}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderEstatisticas = () => {
        return null;
    };

    const renderVisualizacaoPorUtilizador = () => {
        if (dadosFiltrados.size === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialCommunityIcons name="calendar-blank" size={80} color="#BDBDBD" />
                    </View>
                    <Text style={styles.emptyText}>Nenhum registo encontrado</Text>
                    <Text style={styles.emptySubText}>
                        Não existem registos para o período selecionado
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.dataContainer}>
                {Array.from(dadosFiltrados.values()).map((userGroup) => (
                    <View key={userGroup.userId} style={styles.obraCard}>
                        <View style={styles.obraCardHeader}>
                            <View style={styles.obraHeaderLeft}>
                                <View style={styles.obraIcon}>
                                    <MaterialCommunityIcons
                                        name="account"
                                        size={24}
                                        color="#2196F3"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.obraTitle}>{userGroup.userName}</Text>
                                    <Text style={styles.obraSubtitle}>
                                        {userGroup.obras.length} obra
                                        {userGroup.obras.length !== 1 ? "s" : ""}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                <View style={styles.tableHeaderRow}>
                                    <View style={[styles.tableCell, styles.tableCellFixed]}>
                                        <Text style={styles.tableHeaderText}>Obra</Text>
                                    </View>
                                    {diasDoMes.map((dia) => (
                                        <View key={dia} style={[styles.tableCell, styles.tableCellDay]}>
                                            <Text style={styles.tableHeaderText}>{dia}</Text>
                                        </View>
                                    ))}
                                    <View style={[styles.tableCell, styles.tableCellTotal]}>
                                        <Text style={styles.tableHeaderText}>Total</Text>
                                    </View>
                                </View>

                                {userGroup.obras.map((obra, obraIndex) => {
                                    const totalHoras = diasDoMes.reduce(
                                        (total, dia) => total + (obra.horasPorDia[dia] || 0), // Ensure obra.horasPorDia[dia] is not undefined
                                        0
                                    );

                                    return (
                                        <View
                                            key={`${obra.userId}-${obra.obraId}`}
                                            style={[
                                                styles.tableDataRow,
                                                obraIndex % 2 === 0 && styles.tableRowEven,
                                            ]}
                                        >
                                            <View style={[styles.tableCell, styles.tableCellFixed]}>
                                                <Text style={styles.tableCellText} numberOfLines={1}>
                                                    {obra.obraNome}
                                                </Text>
                                            </View>

                                            {diasDoMes.map((dia) => {
                                                const horas = obra.horasPorDia[dia] || 0; // Ensure horas is not undefined
                                                const isEditing = editingCell?.userId === obra.userId && 
                                                                  editingCell?.obraId === obra.obraId && 
                                                                  editingCell?.dia === dia;

                                                return (
                                                    <TouchableOpacity
                                                        key={`${obra.obraId}-${dia}`}
                                                        style={[
                                                            styles.tableCell,
                                                            styles.tableCellDay,
                                                            horas > 0 && styles.tableCellWithHours,
                                                            isEditing && styles.tableCellEditing,
                                                        ]}
                                                        onPress={() => {
                                                            if (!isEditing) {
                                                                iniciarEdicao(obra.userId, obra.obraId, dia, horas);
                                                            }
                                                        }}
                                                        activeOpacity={0.6}
                                                    >
                                                        {isEditing ? (
                                                            <TextInput
                                                                style={styles.editInput}
                                                                value={editValue}
                                                                onChangeText={setEditValue}
                                                                onBlur={salvarEdicao}
                                                                onSubmitEditing={salvarEdicao}
                                                                autoFocus
                                                                keyboardType="default"
                                                                placeholder="0:00"
                                                            />
                                                        ) : (
                                                            <Text
                                                                style={[
                                                                    styles.tableCellText,
                                                                    horas > 0 && styles.tableCellHoursText,
                                                                    horas === 0 && { color: '#BDBDBD' },
                                                                ]}
                                                            >
                                                                {formatarHorasMinutos(horas)}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}

                                            <View style={[styles.tableCell, styles.tableCellTotal]}>
                                                <Text style={styles.tableCellTotalText}>
                                                    {formatarHorasMinutos(totalHoras)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                ))}
            </View>
        );
    };

    const renderVisualizacaoPorObra = () => {
        if (dadosFiltrados.size === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialCommunityIcons name="calendar-blank" size={80} color="#BDBDBD" />
                    </View>
                    <Text style={styles.emptyText}>Nenhum registo encontrado</Text>
                    <Text style={styles.emptySubText}>
                        Não existem registos para o período selecionado
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.dataContainer}>
                {Array.from(dadosFiltrados.values()).map((obraGroup) => (
                    <View key={obraGroup.obraId} style={styles.obraCard}>
                        <View style={styles.obraCardHeader}>
                            <View style={styles.obraHeaderLeft}>
                                <View style={styles.obraIcon}>
                                    <MaterialCommunityIcons
                                        name="office-building"
                                        size={24}
                                        color="#2196F3"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.obraTitle}>{obraGroup.obraNome}</Text>
                                    <Text style={styles.obraSubtitle}>
                                        {obraGroup.utilizadores.length} utilizador
                                        {obraGroup.utilizadores.length !== 1 ? "es" : ""}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                <View style={styles.tableHeaderRow}>
                                    <View style={[styles.tableCell, styles.tableCellFixed]}>
                                        <Text style={styles.tableHeaderText}>Utilizador</Text>
                                    </View>
                                    {diasDoMes.map((dia) => (
                                        <View key={dia} style={[styles.tableCell, styles.tableCellDay]}>
                                            <Text style={styles.tableHeaderText}>{dia}</Text>
                                        </View>
                                    ))}
                                    <View style={[styles.tableCell, styles.tableCellTotal]}>
                                        <Text style={styles.tableHeaderText}>Total</Text>
                                    </View>
                                </View>

                                {obraGroup.utilizadores.map((utilizador, userIndex) => {
                                    const totalHoras = diasDoMes.reduce(
                                        (total, dia) => total + (utilizador.horasPorDia[dia] || 0), // Ensure utilizador.horasPorDia[dia] is not undefined
                                        0
                                    );

                                    return (
                                        <View
                                            key={`${utilizador.obraId}-${utilizador.userId}`}
                                            style={[
                                                styles.tableDataRow,
                                                userIndex % 2 === 0 && styles.tableRowEven,
                                            ]}
                                        >
                                            <View style={[styles.tableCell, styles.tableCellFixed]}>
                                                <Text style={styles.tableCellText} numberOfLines={1}>
                                                    {utilizador.userName}
                                                </Text>
                                            </View>

                                            {diasDoMes.map((dia) => {
                                                const horas = utilizador.horasPorDia[dia] || 0; // Ensure horas is not undefined
                                                const isEditing = editingCell?.userId === utilizador.userId && 
                                                                  editingCell?.obraId === utilizador.obraId && 
                                                                  editingCell?.dia === dia;

                                                return (
                                                    <TouchableOpacity
                                                        key={`${utilizador.userId}-${dia}`}
                                                        style={[
                                                            styles.tableCell,
                                                            styles.tableCellDay,
                                                            horas > 0 && styles.tableCellWithHours,
                                                            isEditing && styles.tableCellEditing,
                                                        ]}
                                                        onPress={() => {
                                                            if (!isEditing) {
                                                                iniciarEdicao(utilizador.userId, utilizador.obraId, dia, horas);
                                                            }
                                                        }}
                                                        activeOpacity={0.6}
                                                    >
                                                        {isEditing ? (
                                                            <TextInput
                                                                style={styles.editInput}
                                                                value={editValue}
                                                                onChangeText={setEditValue}
                                                                onBlur={salvarEdicao}
                                                                onSubmitEditing={salvarEdicao}
                                                                autoFocus
                                                                keyboardType="default"
                                                                placeholder="0:00"
                                                            />
                                                        ) : (
                                                            <Text
                                                                style={[
                                                                    styles.tableCellText,
                                                                    horas > 0 && styles.tableCellHoursText,
                                                                    horas === 0 && { color: '#BDBDBD' },
                                                                ]}
                                                            >
                                                                {formatarHorasMinutos(horas)}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}

                                            <View style={[styles.tableCell, styles.tableCellTotal]}>
                                                <Text style={styles.tableCellTotalText}>
                                                    {formatarHorasMinutos(totalHoras)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text style={styles.loadingText}>A carregar dados da JPA...</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
            <SafeAreaView style={styles.container}>
                {renderHeader()}
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {renderControls()}
                    {renderEstatisticas()}
                    {tipoVisualizacao === "utilizador" 
                        ? renderVisualizacaoPorUtilizador() 
                        : renderVisualizacaoPorObra()
                    }
                    <View style={{ height: 30 }} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
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
    headerTextContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
        textTransform: "capitalize",
    },
    headerButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    integrarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(76, 175, 80, 0.9)",
        alignItems: "center",
        justifyContent: "center",
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        flex: 1,
    },
    controlsCard: {
        backgroundColor: "#fff",
        margin: 15,
        borderRadius: 16,
        padding: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    monthSelectorContainer: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    monthSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F5F5F5",
        borderRadius: 12,
        padding: 10,
    },
    monthButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    monthDisplay: {
        alignItems: "center",
    },
    monthText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2196F3",
        letterSpacing: 1,
    },
    yearText: {
        fontSize: 14,
        color: "#757575",
        marginTop: 2,
    },
    filtersRow: {
        gap: 20,
    },
    filterItem: {
        marginBottom: 15,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    filterButtonsGroup: {
        flexDirection: "row",
        gap: 8,
    },
    filterButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "#F5F5F5",
        gap: 6,
    },
    filterButtonActive: {
        backgroundColor: "#2196F3",
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    filterButtonTextActive: {
        color: "#fff",
    },
    pickerWrapper: {
        backgroundColor: "#F5F5F5",
        borderRadius: 10,
        overflow: "hidden",
    },
    picker: {
        height: 50,
    },

    dataContainer: {
        marginHorizontal: 15,
        gap: 15,
    },
    obraCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 15,
    },
    obraCardHeader: {
        backgroundColor: "#F5F5F5",
        padding: 16,
        borderBottomWidth: 2,
        borderBottomColor: "#2196F3",
    },
    obraHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    obraIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#E3F2FD",
        alignItems: "center",
        justifyContent: "center",
    },
    obraTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#212121",
    },
    obraSubtitle: {
        fontSize: 13,
        color: "#757575",
        marginTop: 2,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#2196F3",
        borderBottomWidth: 2,
        borderBottomColor: "#1976D2",
    },
    tableDataRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    tableRowEven: {
        backgroundColor: "#FAFAFA",
    },
    tableCell: {
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    tableCellFixed: {
        width: 140,
        alignItems: "flex-start",
        backgroundColor: "#F5F5F5",
        borderRightWidth: 1,
        borderRightColor: "#E0E0E0",
    },
    tableCellDay: {
        width: 60,
    },
    tableCellTotal: {
        width: 80,
        backgroundColor: "#E3F2FD",
        borderLeftWidth: 2,
        borderLeftColor: "#2196F3",
    },
    tableCellWithHours: {
        backgroundColor: "#E8F5E9",
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tableCellText: {
        fontSize: 13,
        color: "#424242",
    },
    tableCellHoursText: {
        fontWeight: "600",
        color: "#2196F3",
    },
    tableCellTotalText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#2196F3",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#424242",
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: "#757575",
        textAlign: "center",
        paddingHorizontal: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#2196F3",
        marginTop: 16,
        fontWeight: "500",
    },
    tableCellEditing: {
        backgroundColor: "#FFF9C4",
        borderWidth: 2,
        borderColor: "#FFC107",
    },
    editInput: {
        width: "100%",
        height: 40,
        textAlign: "center",
        fontSize: 13,
        fontWeight: "600",
        color: "#2196F3",
        backgroundColor: "#fff",
        borderRadius: 4,
        paddingHorizontal: 4,
    },
});

export default PartesDiariasJPA;