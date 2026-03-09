import { Request, Response } from "express";
import db from "../database";

/*
Sanitização básica para evitar XSS armazenado.
Remove qualquer tag HTML.
*/
function sanitizeInput(text: string): string {
    return text.replace(/<[^>]*>?/gm, "");
}

export const criarComentario = async (req: Request, res: Response) => {

    let { texto, usuarioId } = req.body;

    /*
    🔒 Prevenção de XSS armazenado
    Remove possíveis scripts antes de salvar
    */
    texto = sanitizeInput(texto);

    try {

        /*
        🔒 Correção de SQL Injection
        Query parametrizada
        */
        const query = `
            INSERT INTO comentario (texto, usuario_id)
            VALUES ($1, $2)
        `;

        await db.query(query, [texto, usuarioId]);

        res.status(201).json({ message: "Comentário criado" });

    } catch (err: any) {

        res.status(500).json({ error: err.message });

    }
};

export const listarComentarios = async (_req: Request, res: Response) => {

    try {

        const result = await db.query(`
            SELECT id, texto, usuario_id
            FROM comentario
        `);

        res.json(result.rows);

    } catch (err: any) {

        res.status(500).json({ error: err.message });

    }
};