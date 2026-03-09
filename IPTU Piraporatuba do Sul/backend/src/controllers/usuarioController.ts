import { Request, Response } from "express";
import db from "../database";

/*
Função simples para sanitizar texto
Remove possíveis tags HTML que poderiam gerar XSS
*/
function sanitizeInput(text: string): string {
    return text.replace(/<[^>]*>?/gm, "");
}

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log(`Recebendo login para email: ${email}`);

    try {

        /*
        🔒 Correção de SQL Injection
        Antes:
        SELECT * FROM usuario WHERE email = 'valor' AND senha = 'valor'

        Agora usamos parâmetros ($1, $2)
        */
        const query = `
            SELECT * 
            FROM usuario 
            WHERE email = $1 AND senha = $2
        `;

        const result = await db.query(query, [email, password]);

        if (result.rowCount && result.rowCount > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: "Falha no login" });
        }

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const novoLogin = async (req: Request, res: Response) => {
    let { email, password, nome } = req.body;

    /*
    🔒 Sanitização contra XSS
    Remove possíveis scripts ou HTML
    */
    nome = sanitizeInput(nome);

    const nomeNormalizado = normalizarNome(nome);

    try {

        const queryNomeIptuExiste = `
            SELECT * 
            FROM iptu 
            WHERE nome = $1
        `;

        const iptuResult = await db.query(queryNomeIptuExiste, [nomeNormalizado]);

        if (iptuResult.rowCount && iptuResult.rowCount > 0) {

            const queryInsert = `
                INSERT INTO usuario (email, senha, nome, tipo_usuario_id)
                VALUES ($1, $2, $3, 3)
                RETURNING id
            `;

            const resultInsert = await db.query(queryInsert, [email, password, nome]);

            const userId = resultInsert.rows[0].id;

            const queryUpdateTabelaIptu = `
                UPDATE iptu 
                SET usuario_id = $1 
                WHERE nome = $2
            `;

            const resultUpdate = await db.query(queryUpdateTabelaIptu, [
                userId,
                nomeNormalizado
            ]);

            if (resultUpdate.rowCount && resultUpdate.rowCount > 0) {
                res.json({ success: true, userId });
            } else {
                res.status(500).json({ success: false, message: "Erro ao atualizar IPTU" });
            }

        } else {
            res.status(404).json({
                success: false,
                message: `Nome '${nome}' não encontrado no cadastro de munícipes`
            });
        }

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const atualizarIptu = async (req: Request, res: Response) => {

    const { usuarioId, novoValor } = req.body;

    try {

        /*
        🔒 Correção de SQL Injection
        */
        const query = `
            UPDATE iptu 
            SET valor = $1 
            WHERE usuario_id = $2
        `;

        await db.query(query, [novoValor, usuarioId]);

        res.json({ message: "IPTU atualizado" });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getIptuPorIdUsuario = async (req: Request, res: Response) => {

    const { usuarioId } = req.body;

    try {

        /*
        🔒 Query parametrizada
        */
        const query = `
            SELECT * 
            FROM iptu 
            WHERE usuario_id = $1
        `;

        const result = await db.query(query, [usuarioId]);

        res.json({ iptu: result.rows });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export function normalizarNome(nome: string): string {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}