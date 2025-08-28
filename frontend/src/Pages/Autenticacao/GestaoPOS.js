
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaEyeSlash,
    FaComputer,
    FaBuilding,
    FaUser,
    FaEnvelope,
    FaKey,
    FaToggleOn,
    FaToggleOff
} from 'react-icons/fa6';

const GestaoPOS = () => {
    const [posList, setPosList] = useState([]);
    const [obras, setObras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPOS, setEditingPOS] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        email: '',
        password: '',
        obra_predefinida_id: '',
        ativo: true
    });

    useEffect(() => {
        fetchPOS();
        fetchObras();
    }, []);

    const fetchPOS = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/pos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setPosList(data);
            }
        } catch (error) {
            console.error('Erro ao carregar POS:', error);
            alert('Erro ao carregar lista de POS');
        } finally {
            setLoading(false);
        }
    };

    const fetchObras = async () => {
        try {
            const token = localStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/obra', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const empresaId = localStorage.getItem('empresa_id');
                const obrasDaEmpresa = data.filter(o => o.empresa_id == empresaId);
                setObras(obrasDaEmpresa);
            }
        } catch (error) {
            console.error('Erro ao carregar obras:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('loginToken');
            const empresaId = localStorage.getItem('empresa_id');
            
            const url = editingPOS 
                ? `https://backend.advir.pt/api/pos/${editingPOS.id}`
                : 'https://backend.advir.pt/api/pos';
            
            const method = editingPOS ? 'PUT' : 'POST';
            
            const body = {
                ...formData,
                empresa_id: empresaId
            };

            // Se estamos editando e não há nova password, remover do body
            if (editingPOS && !formData.password) {
                delete body.password;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                alert(editingPOS ? 'POS atualizado com sucesso!' : 'POS criado com sucesso!');
                setShowModal(false);
                resetForm();
                fetchPOS();
            } else {
                const error = await response.json();
                alert(error.message || 'Erro ao salvar POS');
            }
        } catch (error) {
            console.error('Erro ao salvar POS:', error);
            alert('Erro ao salvar POS');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pos) => {
        setEditingPOS(pos);
        setFormData({
            nome: pos.nome,
            codigo: pos.codigo,
            email: pos.email,
            password: '',
            obra_predefinida_id: pos.obra_predefinida_id,
            ativo: pos.ativo
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja eliminar este POS?')) return;

        try {
            const token = localStorage.getItem('loginToken');
            const response = await fetch(`https://backend.advir.pt/api/pos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('POS eliminado com sucesso!');
                fetchPOS();
            } else {
                alert('Erro ao eliminar POS');
            }
        } catch (error) {
            console.error('Erro ao eliminar POS:', error);
            alert('Erro ao eliminar POS');
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            codigo: '',
            email: '',
            password: '',
            obra_predefinida_id: '',
            ativo: true
        });
        setEditingPOS(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    return (
        <div className="container-fluid py-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h4 className="mb-0">
                                <FaComputer className="me-2" />
                                Gestão de POS
                            </h4>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowModal(true)}
                            >
                                <FaPlus className="me-2" />
                                Novo POS
                            </button>
                        </div>
                        <div className="card-body">
                            {loading && (
                                <div className="text-center py-4">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Carregando...</span>
                                    </div>
                                </div>
                            )}

                            <div className="table-responsive">
                                <table className="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Código</th>
                                            <th>Email</th>
                                            <th>Obra Predefinida</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posList.map(pos => (
                                            <tr key={pos.id}>
                                                <td>
                                                    <FaUser className="me-2 text-muted" />
                                                    {pos.nome}
                                                </td>
                                                <td>
                                                    <code>{pos.codigo}</code>
                                                </td>
                                                <td>
                                                    <FaEnvelope className="me-2 text-muted" />
                                                    {pos.email}
                                                </td>
                                                <td>
                                                    <FaBuilding className="me-2 text-muted" />
                                                    {pos.ObraPredefinida?.nome || 'N/A'}
                                                </td>
                                                <td>
                                                    {pos.ativo ? (
                                                        <span className="badge bg-success">
                                                            <FaToggleOn className="me-1" />
                                                            Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-danger">
                                                            <FaToggleOff className="me-1" />
                                                            Inativo
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary me-2"
                                                        onClick={() => handleEdit(pos)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDelete(pos.id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {posList.length === 0 && !loading && (
                                    <div className="text-center py-4 text-muted">
                                        Nenhum POS encontrado
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para criar/editar POS */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingPOS ? 'Editar POS' : 'Novo POS'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseModal}
                                ></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Nome do POS</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Código</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.codigo}
                                            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Password {editingPOS && '(deixe vazio para manter a atual)'}
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            required={!editingPOS}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Obra Predefinida</label>
                                        <select
                                            className="form-control"
                                            value={formData.obra_predefinida_id}
                                            onChange={(e) => setFormData({...formData, obra_predefinida_id: e.target.value})}
                                            required
                                        >
                                            <option value="">Selecione uma obra</option>
                                            {obras.map(obra => (
                                                <option key={obra.id} value={obra.id}>
                                                    {obra.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={formData.ativo}
                                            onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                                        />
                                        <label className="form-check-label">
                                            POS Ativo
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCloseModal}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestaoPOS;
