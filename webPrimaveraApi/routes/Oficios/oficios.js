const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os"); // Para pegar o diretório do usuário

const app = express();
const upload = multer({ dest: "uploads/" }); // Armazenando arquivos temporariamente na pasta 'uploads'

router.post("/save-pdf", upload.fields([{ name: 'file', maxCount: 1 }, { name: 'anexos', maxCount: 10 }]), (req, res) => {
    // Verifique se o arquivo PDF foi enviado
    if (!req.files || !req.files.file) {
        return res.status(400).send("Nenhum arquivo PDF foi enviado.");
    }

    // Verifique se o código foi enviado no corpo da requisição
    let codigo = req.body.codigo;
    if (!codigo) {
        return res.status(400).send("Código não fornecido.");
    }
    codigo = codigo.replace(/\//g, '_');
    const tempPathPdf = req.files.file[0].path; // Caminho temporário do PDF
    const desktopPath = path.join('\\\\192.168.16.241', 'Departamentos', '02.Obras'); // Caminho da rede
    const oficiosDir = path.join(desktopPath, 'TesteAdvirOficios'); // Caminho para a pasta 'Oficios'
    const oficioFolder = path.join(oficiosDir, codigo); // Caminho para a pasta do ofício

    // Verifique se o diretório 'Oficios' existe, se não, crie-o
    if (!fs.existsSync(oficiosDir)) {
        fs.mkdirSync(oficiosDir, { recursive: true });
    }

    // Verifique se o diretório para o ofício existe, se não, crie-o
    if (!fs.existsSync(oficioFolder)) {
        fs.mkdirSync(oficioFolder, { recursive: true });
    }

    // Use o código para nomear o arquivo PDF
    const targetPathPdf = path.join(oficioFolder, `${codigo}.pdf`); // O nome do arquivo PDF será igual ao código

    // Mova o arquivo PDF para a pasta do ofício
    fs.copyFile(tempPathPdf, targetPathPdf, (err) => {
        if (err) {
            console.error("Erro ao copiar o PDF:", err);
            return res.status(500).send("Erro ao salvar o PDF.");
        }
    
        // Apaga o arquivo temporário após copiar
        fs.unlink(tempPathPdf, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Erro ao apagar o arquivo temporário:", unlinkErr);
                // Ainda assim retorna sucesso porque o PDF foi salvo
            }
        });
    
        console.log("PDF salvo com sucesso:", targetPathPdf);
        // Processa os anexos
        if (req.files.anexos) {
            req.files.anexos.forEach((anexo, index) => {
                const tempPathAnexo = anexo.path;
                const targetPathAnexo = path.join(oficioFolder, `${codigo}_anexo_${index + 1}${path.extname(anexo.originalname)}`);
    
                fs.copyFile(tempPathAnexo, targetPathAnexo, (err) => {
                    if (err) {
                        console.error(`Erro ao copiar o anexo ${index + 1}:`, err);
                        return res.status(500).send(`Erro ao salvar o anexo ${index + 1}.`);
                    }
    
                    fs.unlink(tempPathAnexo, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Erro ao apagar o anexo temporário:", unlinkErr);
                        }
                    });
                });
            });
        }
    
        res.status(200).send(`PDF e anexos salvos com sucesso na pasta '${codigo}' dentro de 'Oficios' no destino de rede!`);
    });
    
});

router.post("/Criar", async (req, res) => {
    try {
        // Obter o token de autenticação do cabeçalho
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Obter a URL da empresa do cabeçalho usando a função getEmpresaUrl
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Extraindo os parâmetros do corpo da requisição
        const { codigo, assunto, data, remetente, email, texto1, texto2, template, createdby, texto3, obra, donoObra, Morada, Localidade, CodPostal, CodPostalLocal, anexos, texto4, texto5, estado } = req.body;

        // Construindo a URL da API
        const apiUrl = `http://${urlempresa}/WebApi/Word/Criar`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto1,
            texto2,
            template,
            createdby,
            texto3,
            obra,
            donoObra,
            Morada,
            Localidade,
            CodPostal,
            CodPostalLocal,
            anexos,
            texto4,
            texto5,
            estado,
        };
        console.log('Dados a serem enviados:', requestData);

        // Chamada para a API externa para criar o ofício
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verificar status da resposta da API externa
        if (response.status === 200) {
            console.log('Ofício criado na API externa com sucesso.');
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Ofício não encontrado.'
            });
        } else {
            return res.status(response.status).json({
                error: 'Falha ao criar o ofício.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao criar ofício:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao criar o ofício',
            details: error.message
        });
    }
});

// Fun��o para obter o `urlempresa` usando o `painelAdminToken`
async function getEmpresaUrl(req) {
    try {
        console.log('Cabe�alhos recebidos:', req.headers);  // Verificando os cabe�alhos
        const urlempresa = req.headers['urlempresa'];  // Obtendo o urlempresa do cabe�alho
        if (!urlempresa) {
            throw new Error('URL da empresa n�o fornecido.');
        }
        return urlempresa;  // Retorna o urlempresa diretamente
    } catch (error) {
        console.error('Erro ao obter o URL da empresa:', error.message);
        throw new Error('Erro ao obter o URL da empresa');
    }
}

router.get('/Listar', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Listar`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Realiza a chamada para listar as interven��es
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autentica��o
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma interven��o encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar interven��es.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar interven��es:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar interven��es',
            details: error.message
        });
    }
});

router.put('/atualizar', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }
        // Extraindo os parâmetros do corpo da requisição
        const { codigo, assunto, data, remetente, email, texto1, texto2, template, createdby, texto3, obra, donoObra, Morada, Localidade, CodPostal, CodPostalLocal, anexos, texto4, texto5 } = req.body;

        // Extraindo os par�metros do corpo da requisi��o
        const requestData = {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto1,
            texto2,
            template,
            createdby,
            texto3,
            obra,
            donoObra,
            Morada,
            Localidade,
            CodPostal,
            CodPostalLocal,
            anexos,
            texto4,
            texto5,
        };


        // Monta a URL completa para listar interven��es


        const apiUrl = `http://${urlempresa}/WebApi/Word/Atualizar`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        console.log('Dados a serem enviados:', requestData);


        // Chamada para a API para criar a interven��o
        const response = await axios.put(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/Eliminar/:Codigo', async (req, res) => {
    try {
        const { Codigo } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Eliminar/${Codigo}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/Detalhes/:Codigo', async (req, res) => {
    try {
        const { Codigo } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Detalhes/${Codigo}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/ListarObras', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/ListarObras`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Realiza a chamada para listar as interven��es
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autentica��o
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma interven��o encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar interven��es.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar interven��es:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar interven��es',
            details: error.message
        });
    }
});

router.get('/ListarEntidades', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/ListarEntidades`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Realiza a chamada para listar as interven��es
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autentica��o
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma interven��o encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar interven��es.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar interven��es:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar interven��es',
            details: error.message
        });
    }
});

router.get('/GetId', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/DaUltimoID`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Realiza a chamada para listar as interven��es
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autentica��o
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma interven��o encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar interven��es.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar interven��es:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar interven��es',
            details: error.message
        });
    }
});

router.get('/GetEntidade/:entidadeId', async (req, res) => {
    try {
        const { entidadeId } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/GetEntidade/${entidadeId}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/GetEmail/:entidadeId', async (req, res) => {
    try {
        const { entidadeId } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/GetEmail/${entidadeId}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/GetEntidadeCode/:obraCode', async (req, res) => {
    try {
        const { obraCode } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/GetEntidadeCode/${obraCode}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});


module.exports = router;