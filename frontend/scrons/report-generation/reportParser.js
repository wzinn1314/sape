(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.reportParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/[\t\u00a0]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function normalizeForMatch(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extractAfterLabel(text, labels, fallback = '') {
    const normalized = normalizeText(text);
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const labelVariants = labels.map((label) => normalizeForMatch(label));

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const compactLine = normalizeForMatch(line);
      const matchedLabel = labelVariants.find((label) => compactLine.includes(label));

      if (!matchedLabel) continue;

      const withoutLabel = line.replace(new RegExp(labels.map(escapeRegExp).join('|'), 'i'), '').replace(/^[:\-\s]+/, '').trim();
      if (withoutLabel) {
        return withoutLabel.replace(/\s+/g, ' ');
      }

      const nextChunk = lines.slice(index + 1, index + 4).join(' ').trim();
      return nextChunk || fallback;
    }

    const wholeText = normalized;
    const regex = new RegExp(`(${labels.map(escapeRegExp).join('|')})\\s*[:\-]?\\s*([\\s\\S]{0,900})`, 'i');
    const match = wholeText.match(regex);
    if (match && match[2]) {
      return match[2].replace(/\s+/g, ' ').trim();
    }

    return fallback;
  }

  function findValue(lines, labels, fallback = '') {
    const regex = new RegExp(labels.map(escapeRegExp).join('|'), 'i');

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line || !regex.test(line)) continue;

      const withoutLabel = line.replace(regex, '').replace(/^[:\-\s]+/, '').trim();
      if (withoutLabel) return withoutLabel.replace(/\s+/g, ' ');

      const nextLines = lines.slice(index + 1, index + 3).join(' ').trim();
      return nextLines || fallback;
    }

    return fallback;
  }

  function parseEstudoDeCaso(text) {
    const normalized = normalizeText(text);
    return {
      alunoIdade: extractAfterLabel(normalized, ['nome do aluno', 'aluno', 'nome', 'idade'], ''),
      serieTurma: extractAfterLabel(normalized, ['ano', 'série', 'serie', 'turma'], ''),
      data: extractAfterLabel(normalized, ['data do estudo', 'data', 'data do caso'], ''),
      demandas: extractAfterLabel(normalized, ['identificação das demandas individuais e das barreiras enfrentadas', 'demandas', 'barreiras', 'demanda'], ''),
      contexto: extractAfterLabel(normalized, ['análise do contexto escolar e das barreiras', 'contexto escolar', 'contexto', 'barreiras'], ''),
      potencialidades: extractAfterLabel(normalized, ['identificação das potencialidades e das demandas de apoio', 'potencialidades', 'apoio'], ''),
      estrategias: extractAfterLabel(normalized, ['definição de estratégias e recursos de acessibilidade', 'estratégias', 'estrategias', 'acessibilidade', 'recursos'], ''),
      consideracoes: extractAfterLabel(normalized, ['considerações finais e indicação para pei', 'considerações finais', 'pei', 'indicação'], '')
    };
  }

  function parseCronograma(text) {
    const normalized = normalizeText(text);
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const horarioDia = findValue(lines, ['hora', 'dia da semana', 'horário', 'horario'], '');
    const duracao = findValue(lines, ['duração do atendimento', 'duracao do atendimento', 'duração', 'duracao', 'tempo', 'minutos', 'horas'], '');
    const frequencia = findValue(lines, ['frequência do atendimento semanal', 'frequencia do atendimento semanal', 'frequência', 'frequencia', 'vezes', 'semanal'], '');
    const tipo = findValue(lines, ['tipo de atendimento', 'individual', 'coletivo', 'sala de aula'], '');
    const composicao = findValue(lines, ['composição do atendimento', 'composicao do atendimento', 'sala de recursos', 'libras', 'braile', 'intérprete', 'mediador', 'hospitalar'], '');

    return {
      horarioDia: horarioDia.replace(/\s+/g, ' ').trim(),
      duracao: duracao.replace(/\s+/g, ' ').trim(),
      frequencia: frequencia.replace(/\s+/g, ' ').trim(),
      tipo: tipo.replace(/\s+/g, ' ').trim(),
      composicao: composicao.replace(/\s+/g, ' ').trim()
    };
  }

  function parseAtividades(text) {
    const normalized = normalizeText(text);
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      dataAtividade: findValue(lines, ['data', 'atividade', 'registro'], ''),
      avancos: findValue(lines, ['avanços', 'avancos', 'progresso'], ''),
      dificuldades: findValue(lines, ['dificuldades', 'dificuldade', 'obstáculo'], ''),
      avaliacaoArea: findValue(lines, ['área', 'area', 'avaliação', 'avaliacao'], ''),
      avaliacaoEstrategia: findValue(lines, ['estratégia', 'estrategia', 'estratégias', 'estrategias'], '')
    };
  }

  function parseDiagnostico(text) {
    const normalized = normalizeText(text);
    return {
      checklistSummary: normalized.slice(0, 1800)
    };
  }

  function extractStructuredData(text, reportType) {
    const normalized = normalizeText(text);
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const base = {
      rawText: normalized,
      summary: normalized.slice(0, 1800),
      recommendations: ''
    };

    if (!reportType) return base;

    if (reportType === 'Estudo de Caso') {
      return {
        ...base,
        ...parseEstudoDeCaso(normalized)
      };
    }

    if (reportType === 'Cronograma de Atendimento') {
      return {
        ...base,
        ...parseCronograma(normalized)
      };
    }

    if (reportType === 'Registro de Atividades Realizadas no Atendimento') {
      return {
        ...base,
        ...parseAtividades(normalized)
      };
    }

    return {
      ...base,
      ...parseDiagnostico(normalized)
    };
  }

  return {
    normalizeText,
    findValue,
    extractStructuredData
  };
});
