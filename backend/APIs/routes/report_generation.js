const fs = require('fs');
const path = require('path');
const html_to_pdf = require('html-pdf-node');

app.post('/generate-report', async (req, res) => {
    const { titulo, conteudo, aluno_id, professor_id, nome_aluno } = req.body;

    // 1. Criar o HTML do PDF (Estilize como quiser)
    let htmlContent = `
        <h1>Relatório Escolar - SAPE</h1>
        <p><strong>Título:</strong> ${titulo}</p>
        <p><strong>Aluno:</strong> ${nome_aluno}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString()}</p>
        <hr>
        <div style="margin-top: 20px;">${conteudo}</div>
    `;

    let options = { format: 'A4' };
    let file = { content: htmlContent };

    try {
        // 2. Gerar o PDF
        const pdfBuffer = await html_to_pdf.generatePdf(file, options);
        
        // 3. Definir nome do arquivo e caminho
        const fileName = `relatorio_${Date.now()}_${aluno_id}.pdf`;
        const filePath = path.join(__dirname, 'reports', fileName);

        // 4. Salvar o arquivo na pasta 'reports'
        fs.writeFileSync(filePath, pdfBuffer);

        // 5. Salvar a referência no Banco de Dados
        db.run(
            `INSERT INTO reports (titulo, conteudo, aluno_id, professor_id, arquivo_path) VALUES (?, ?, ?, ?, ?)`,
            [titulo, conteudo, aluno_id, professor_id, fileName],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Relatório gerado com sucesso!", file: fileName });
            }
        );
    } catch (error) {
        res.status(500).json({ error: "Erro ao gerar PDF" });
    }
});