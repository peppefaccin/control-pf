'use strict';
/* CONTROL PF — versão web (celular e navegador). Mesmos dados do app do Mac, sincronizados pelo GitHub. */
(() => {
  const CH = { dados: 'controlpf.dados', sync: 'controlpf.sync', ui: 'controlpf.ui' };
  const SEM_CLIENTE = 'Sem cliente';
  const TIPOS = ['Vídeo', 'Foto', 'Design', 'Outro'];
  const ABAS = [['timer', 'TIMER'], ['historico', 'HISTÓRICO'], ['tarefas', 'TAREFAS'], ['notas', 'NOTAS']];
  const PERIODOS = [['semana', 'Esta semana'], ['mes', 'Este mês'], ['mesPassado', 'Mês passado'], ['tudo', 'Tudo']];
  const REPO_PADRAO = 'control-pf-dados';

  // ---------- ícones ----------
  const svg = (w, corpo, extra = '') =>
    `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${extra}>${corpo}</svg>`;
  const I = {
    play: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    pausa: '<svg width="22" height="22" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/></svg>',
    stop: '<svg width="18" height="18" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor"/></svg>',
    mais: svg(12, '<path d="M12 5v14M5 12h14"/>', 'stroke-width="2"'),
    x: svg(12, '<path d="M6 6l12 12M18 6L6 18"/>'),
    check: svg(11, '<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
    lixo: svg(15, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    girar: svg(11, '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>', 'stroke-width="2"'),
    ajustes: svg(18, '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
    timer: svg(20, '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>'),
    historico: svg(20, '<path d="M5 20V11M12 20V4M19 20v-7"/>'),
    tarefas: svg(20, '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    notas: svg(20, '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/>'),
  };

  // ---------- utilidades ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isoDe = (d) => new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
  const agoraISO = () => isoDe(new Date());
  const t = (s) => (s ? Date.parse(s) || 0 : 0);
  const pad = (n) => String(n).padStart(2, '0');
  const soma = (l) => l.reduce((a, s) => a + (s.segundos || 0), 0);
  const achar = (lista, id) => lista.find((x) => x.id === id);
  const lerJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const gravarJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem espaço */ } };

  function novoId() {
    if (crypto.randomUUID) return crypto.randomUUID().toUpperCase();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`.toUpperCase();
  }

  function relogio(s) {
    s = Math.max(0, Math.floor(s));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }
  function duracao(s) {
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${pad(r)}` : `${h}h`;
  }
  const fmt = (d, op) => new Intl.DateTimeFormat('pt-BR', op).format(d).replace(/\./g, '');
  const hora = (iso) => fmt(new Date(iso), { hour: '2-digit', minute: '2-digit' });
  const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const inicioDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  function dia(x) {
    const d = new Date(x), h = new Date(), o = new Date();
    o.setDate(o.getDate() - 1);
    if (mesmoDia(d, h)) return 'Hoje';
    if (mesmoDia(d, o)) return 'Ontem';
    return fmt(d, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function diaCurto(x) {
    const d = new Date(x), h = new Date(), o = new Date(), a = new Date();
    o.setDate(o.getDate() - 1); a.setDate(a.getDate() + 1);
    if (mesmoDia(d, h)) return 'Hoje';
    if (mesmoDia(d, o)) return 'Ontem';
    if (mesmoDia(d, a)) return 'Amanhã';
    return fmt(d, { day: 'numeric', month: 'short' });
  }
  const inputData = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const inputDataHora = (iso) => { const d = new Date(iso); return `${inputData(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const deInputData = (v) => { const [y, m, d] = v.split('-').map(Number); return isoDe(new Date(y, m - 1, d, 12)); };

  function avisar(texto) {
    const a = $('#aviso');
    a.textContent = texto;
    a.classList.add('ver');
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => a.classList.remove('ver'), 2600);
  }

  function baixarArquivo(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- dados ----------
  function vazio() {
    return {
      versao: 1, sessoes: [], tarefas: [], notas: [], apagados: {},
      timer: { cliente: '', projeto: '', tipo: 'Vídeo', acumulado: 0, editado: '1970-01-01T00:00:00Z' },
    };
  }
  function normalizarDados(d) {
    const v = vazio();
    d = d || {};
    return {
      ...v, ...d,
      sessoes: Array.isArray(d.sessoes) ? d.sessoes : [],
      tarefas: Array.isArray(d.tarefas) ? d.tarefas : [],
      notas: Array.isArray(d.notas) ? d.notas : [],
      apagados: d.apagados && typeof d.apagados === 'object' ? d.apagados : {},
      timer: { ...v.timer, ...(d.timer || {}) },
    };
  }

  let dados = normalizarDados(lerJSON(CH.dados));
  const ui = Object.assign(
    { aba: 'timer', periodo: 'mes', filtroCliente: '', notaSel: null, editandoNota: false, verFeitas: false, semente: 0, modal: null },
    (({ aba, periodo }) => ({ ...(aba ? { aba } : {}), ...(periodo ? { periodo } : {}) }))(lerJSON(CH.ui) || {}),
  );
  let cfg = lerJSON(CH.sync);
  const sync = { ok: true, texto: '', quando: null, ocupado: false, pendente: false, agendado: null };

  const guardar = () => gravarJSON(CH.dados, dados);
  const guardarUI = () => gravarJSON(CH.ui, { aba: ui.aba, periodo: ui.periodo });
  function salvarLocal() { guardar(); agendarSync(4000); }
  function mudou() { salvarLocal(); render(true); }

  function apagarItem(lista, id) {
    dados[lista] = dados[lista].filter((x) => x.id !== id);
    dados.apagados[id] = agoraISO();
  }

  function clientes() {
    const ev = [...dados.sessoes.map((s) => [t(s.inicio), s.cliente]), ...dados.tarefas.map((x) => [t(x.criada), x.cliente])]
      .sort((a, b) => b[0] - a[0]);
    const vistos = new Set(), lista = [];
    for (const [, c] of ev) {
      const n = (c || '').trim();
      if (!n || n === SEM_CLIENTE || vistos.has(n.toLowerCase())) continue;
      vistos.add(n.toLowerCase()); lista.push(n);
    }
    return lista;
  }

  // ---------- timer ----------
  function decorrido() {
    const tm = dados.timer;
    return (tm.acumulado || 0) + (tm.rodandoDesde ? Math.max(0, (Date.now() - t(tm.rodandoDesde)) / 1000) : 0);
  }
  function tocarTimer() { dados.timer.editado = agoraISO(); }
  function play() {
    const tm = dados.timer;
    if (tm.rodandoDesde) return;
    if (!tm.inicioSessao) tm.inicioSessao = agoraISO();
    tm.rodandoDesde = agoraISO();
    tocarTimer(); mudou();
  }
  function acumular() {
    const tm = dados.timer;
    if (!tm.rodandoDesde) return;
    tm.acumulado = (tm.acumulado || 0) + Math.max(0, (Date.now() - t(tm.rodandoDesde)) / 1000);
    delete tm.rodandoDesde;
  }
  function pausar() { acumular(); tocarTimer(); mudou(); }
  function limparTimer() {
    const tm = dados.timer;
    delete tm.inicioSessao; delete tm.rodandoDesde; delete tm.data;
    tm.acumulado = 0;
    tocarTimer();
  }
  function parar() {
    acumular();
    const tm = dados.timer;
    if (tm.inicioSessao && tm.acumulado >= 1) {
      const agora = agoraISO();
      dados.sessoes.push({
        id: novoId(), cliente: (tm.cliente || '').trim() || SEM_CLIENTE, projeto: (tm.projeto || '').trim(), tipo: tm.tipo || 'Vídeo',
        data: tm.data || tm.inicioSessao, inicio: tm.inicioSessao, fim: agora, segundos: tm.acumulado, editado: agora,
      });
      avisar(`Salvo: ${duracao(tm.acumulado)}`);
    }
    limparTimer(); mudou();
  }
  function totalHoje() {
    const h = new Date(), tm = dados.timer;
    const base = soma(dados.sessoes.filter((s) => mesmoDia(new Date(s.data), h)));
    const timerHoje = tm.inicioSessao && mesmoDia(new Date(tm.data || tm.inicioSessao), h);
    return base + (timerHoje ? decorrido() : 0);
  }

  // ---------- telas ----------
  function vSessao(s) {
    return `<button class="sessao" data-acao="editar-sessao" data-id="${esc(s.id)}">
      <span class="hora num">${hora(s.inicio)}–${hora(s.fim)}</span>
      <span style="min-width:0"><span class="cli">${esc(s.cliente)}</span><span class="sub">${esc([s.tipo, s.projeto].filter(Boolean).join(' · '))}</span></span>
      <span class="dur num">${duracao(s.segundos)}</span></button>`;
  }

  function vHoje() {
    const h = new Date();
    const hoje = dados.sessoes.filter((s) => mesmoDia(new Date(s.data), h)).sort((a, b) => t(b.inicio) - t(a.inicio));
    return `<div class="cabeca-lateral"><span class="rotulo">Hoje</span><span class="total-hoje num" data-total-hoje>${duracao(totalHoje())}</span></div>
      ${hoje.length ? hoje.map(vSessao).join('') : '<p class="dica">Nenhum tempo salvo hoje ainda.</p>'}`;
  }

  function vTimer() {
    const tm = dados.timer, ativo = !!tm.inicioSessao, rod = !!tm.rodandoDesde;
    const atual = (tm.cliente || '').trim().toLowerCase();
    const outros = clientes().filter((c) => c.toLowerCase() !== atual).slice(0, 8);
    const status = rod ? 'Gravando' : ativo ? 'Pausado' : 'Pronto para começar';
    return `<div class="duas"><section class="principal"><div class="pilha">
      <div>
        <div class="status"><span class="ponto" data-ponto></span><span class="rotulo">${status}</span></div>
        <div class="relogio-grande num" data-relogio>${relogio(decorrido())}</div>
        <div class="botoes">
          <button class="redondo cheio" data-acao="alternar" aria-label="${rod ? 'Pausar' : 'Começar'}">${rod ? I.pausa : I.play}</button>
          <button class="redondo" data-acao="parar" ${ativo ? '' : 'disabled'} aria-label="Parar e salvar">${I.stop}</button>
          ${ativo ? `<button class="botao" data-acao="descartar">DESCARTAR</button><span class="comecou">começou às ${hora(tm.inicioSessao)}</span>` : ''}
        </div>
      </div>
      <hr class="linha-h">
      <div class="bloco"><span class="rotulo">Cliente</span>
        <input class="campo grande" data-campo="timer-cliente" placeholder="Nome do cliente" value="${esc(tm.cliente)}" autocomplete="off" autocapitalize="words">
        ${outros.length ? `<div class="chips">${outros.map((c) => `<button class="chip" data-acao="cliente-chip" data-valor="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="bloco"><span class="rotulo">Projeto</span>
        <input class="campo" data-campo="timer-projeto" placeholder="Ex.: reels de novembro, ensaio" value="${esc(tm.projeto)}" autocomplete="off">
      </div>
      <div class="linha-tipo-dia">
        <div class="bloco"><span class="rotulo">Tipo</span><div class="chips">${TIPOS.map((tp) => `<button class="chip ${tm.tipo === tp ? 'ativo' : ''}" data-acao="tipo" data-valor="${tp}">${tp}</button>`).join('')}</div></div>
        <div class="bloco"><span class="rotulo">Dia</span><input type="date" class="campo-data" data-campo="timer-data" value="${inputData(tm.data || tm.inicioSessao || agoraISO())}"></div>
      </div>
    </div></section><aside class="lateral">${vHoje()}</aside></div>`;
  }

  function intervalo(p) {
    const h = new Date();
    if (p === 'semana') {
      const d = inicioDia(h);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const f = new Date(d); f.setDate(f.getDate() + 7);
      return [d, f];
    }
    if (p === 'mes') return [new Date(h.getFullYear(), h.getMonth(), 1), new Date(h.getFullYear(), h.getMonth() + 1, 1)];
    if (p === 'mesPassado') return [new Date(h.getFullYear(), h.getMonth() - 1, 1), new Date(h.getFullYear(), h.getMonth(), 1)];
    return null;
  }
  function filtradas() {
    const iv = intervalo(ui.periodo);
    return dados.sessoes
      .filter((s) => { const d = new Date(s.data); return (!iv || (d >= iv[0] && d < iv[1])) && (!ui.filtroCliente || s.cliente === ui.filtroCliente); })
      .sort((a, b) => t(b.inicio) - t(a.inicio));
  }
  function agrupaSoma(lista, chave) {
    const m = new Map();
    for (const s of lista) m.set(chave(s), (m.get(chave(s)) || 0) + (s.segundos || 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  function vResumo(lista) {
    const total = soma(lista);
    const dias = new Set(lista.map((s) => inicioDia(new Date(s.data)).getTime())).size;
    const barras = (arr) => arr.map(([n, seg]) => `<div class="barra-resumo"><div class="topo-barra"><span>${esc(n)}</span><span class="num">${duracao(seg)}</span></div>
      <div class="trilho"><div class="cheia" style="width:${total ? ((seg / total) * 100).toFixed(1) : 0}%"></div></div></div>`).join('');
    return `<div class="acoes"><button class="botao cheio" data-acao="lancar">+ LANÇAR TEMPO</button>
        <button class="botao" data-acao="exportar" ${lista.length ? '' : 'disabled'}>EXPORTAR</button></div>
      <span class="rotulo">Total</span><p class="total-grande num">${duracao(total)}</p>
      <p class="dica">${lista.length} ${lista.length === 1 ? 'sessão' : 'sessões'} · ${dias} ${dias === 1 ? 'dia' : 'dias'}${dias ? ` · média ${duracao(total / dias)}/dia` : ''}</p>
      ${lista.length ? `<hr class="linha-h sep-resumo"><div class="rotulo" style="margin-bottom:14px">Por cliente</div>${barras(agrupaSoma(lista, (s) => s.cliente))}
      <hr class="linha-h sep-resumo"><div class="rotulo" style="margin-bottom:14px">Por tipo</div>${barras(agrupaSoma(lista, (s) => s.tipo))}` : ''}`;
  }

  function vHistorico() {
    const lista = filtradas();
    const grupos = new Map();
    for (const s of lista) {
      const k = inicioDia(new Date(s.data)).getTime();
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(s);
    }
    const todos = [...new Set(dados.sessoes.map((s) => s.cliente))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const filtros = `<div class="filtros"><div class="chips">${PERIODOS.map(([id, nome]) => `<button class="chip ${ui.periodo === id ? 'ativo' : ''}" data-acao="periodo" data-valor="${id}">${nome}</button>`).join('')}</div>
      <select class="campo-data" data-campo="filtro-cliente"><option value="">Todos os clientes</option>${todos.map((c) => `<option value="${esc(c)}" ${c === ui.filtroCliente ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
    const corpo = lista.length
      ? `<div class="lista-hist">${[...grupos.entries()].map(([k, ss]) => `<div class="cabeca-dia"><span class="rotulo">${esc(dia(k))}</span><span class="num">${duracao(soma(ss))}</span></div>${ss.map(vSessao).join('')}`).join('')}</div>`
      : '<div style="padding:40px 36px"><p class="vazio-titulo">Nada por aqui.</p><p class="vazio-texto">Use o timer ou “+ Lançar tempo” para registrar um trabalho.</p></div>';
    return `<div class="duas"><section style="min-width:0">${filtros}${corpo}</section><aside class="lateral">${vResumo(lista)}</aside></div>`;
  }

  function tarefasAbertas() {
    return dados.tarefas.filter((x) => !x.feita).sort((a, b) => {
      if (a.prazo && b.prazo) return t(a.prazo) - t(b.prazo);
      if (a.prazo) return -1;
      if (b.prazo) return 1;
      return t(b.criada) - t(a.criada);
    });
  }

  function vTarefa(x) {
    const atrasada = x.prazo && !x.feita && new Date(x.prazo) < inicioDia(new Date());
    return `<div class="tarefa ${x.feita ? 'feita' : ''}">
      <button class="check ${x.feita ? 'feito' : ''}" data-acao="toggle-tarefa" data-id="${esc(x.id)}" aria-label="Marcar como feita">${x.feita ? I.check : ''}</button>
      <input class="texto" data-campo="tarefa-texto" data-id="${esc(x.id)}" value="${esc(x.texto)}">
      ${x.cliente || (x.prazo && !x.feita) ? `<span class="meta">
        ${x.cliente ? `<span class="etiqueta">${esc(x.cliente)}</span>` : ''}
        ${x.prazo && !x.feita ? `<span class="prazo ${atrasada ? 'atrasada' : ''}">${atrasada ? 'atrasada · ' : ''}${diaCurto(x.prazo)}</span>` : ''}</span>` : ''}
      <button class="apagar" data-acao="apagar-tarefa" data-id="${esc(x.id)}" aria-label="Apagar">${I.x}</button></div>`;
  }

  const GERAIS = [
    ['Fazer backup dos brutos no SSD', 'Organização'], ['Arquivar os projetos já entregues', 'Organização'],
    ['Conferir os prazos da semana', 'Organização'], ['Organizar as notas e ideias soltas', 'Organização'],
    ['Limpar o render cache do DaVinci', 'Mac'], ['Esvaziar a pasta Downloads', 'Mac'],
    ['Separar 3 fotos novas para o portfólio', 'Portfólio'], ['Atualizar o catálogo de serviços', 'Portfólio'],
    ['Postar um bastidor no Instagram', 'Instagram'], ['Planejar os posts da semana', 'Instagram'],
    ['Montar um reel com material antigo', 'Instagram'], ['Responder as mensagens de clientes', 'Clientes'],
    ['Mandar um orçamento que está parado', 'Clientes'], ['Pedir um depoimento a um cliente satisfeito', 'Clientes'],
    ['Revisar os gastos da semana', 'Finanças'], ['Conferir pagamentos que ainda não caíram', 'Finanças'],
    ['Estudar uma técnica de cor por 30 min', 'Estudo'], ['Criar um preset novo no Lightroom', 'Estudo'],
    ['Testar uma LUT nova num projeto antigo', 'Estudo'], ['Ver 3 referências de edição e anotar ideias', 'Estudo'],
    ['Separar músicas para os próximos vídeos', 'Música'], ['Fotografar algo só por diversão', 'Criativo'],
    ['Fazer o treino do dia', 'Saúde'], ['Sair para uma corrida curta', 'Saúde'],
  ];
  function sorteio(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let z = Math.imul(a ^ (a >>> 15), 1 | a);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sugestoes() {
    const h = new Date();
    const abertas = new Set(dados.tarefas.filter((x) => !x.feita).map((x) => x.texto.toLowerCase()));
    const doDados = [];
    const [iniMes, fimMes] = intervalo('mes');
    const porCli = new Map();
    for (const s of dados.sessoes) {
      const d = new Date(s.data);
      if (d >= iniMes && d < fimMes && s.cliente !== SEM_CLIENTE) porCli.set(s.cliente, (porCli.get(s.cliente) || 0) + s.segundos);
    }
    [...porCli.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, seg]) => seg >= 3600)
      .forEach(([c, seg]) => doDados.push({ texto: `Conferir as horas e cobrar ${c}`, motivo: `${duracao(seg)} registradas este mês`, cliente: c }));
    const ult = new Map();
    for (const s of dados.sessoes) if (s.cliente !== SEM_CLIENTE && t(s.data) > (ult.get(s.cliente) || 0)) ult.set(s.cliente, t(s.data));
    [...ult.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, d]) => {
      const dias = Math.floor((Date.now() - d) / 86400000);
      if (dias >= 21) doDados.push({ texto: `Mandar mensagem para ${c}`, motivo: `Último trabalho há ${dias} dias`, cliente: c });
    });
    const atrasadas = dados.tarefas.filter((x) => !x.feita && x.prazo && new Date(x.prazo) < inicioDia(h)).length;
    if (atrasadas) doDados.unshift({ texto: atrasadas === 1 ? 'Resolver a tarefa atrasada' : `Rever as ${atrasadas} tarefas atrasadas`, motivo: 'Prazos', cliente: '' });

    const rnd = sorteio(Math.floor(inicioDia(h).getTime() / 86400000) * 7919 + ui.semente * 104729);
    const gerais = GERAIS.map(([texto, motivo]) => ({ texto, motivo, cliente: '' }));
    for (let i = gerais.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gerais[i], gerais[j]] = [gerais[j], gerais[i]]; }
    const lista = [], usados = new Set();
    const pode = (s) => !abertas.has(s.texto.toLowerCase()) && !usados.has(s.texto);
    const girados = doDados.map((_, i) => doDados[(i + ui.semente) % doDados.length]);
    for (const s of girados) if (pode(s) && lista.length < 3) { lista.push(s); usados.add(s.texto); }
    for (const s of gerais) if (pode(s) && lista.length < 7) { lista.push(s); usados.add(s.texto); }
    return lista;
  }

  function vTarefas() {
    const abertas = tarefasAbertas();
    const feitas = dados.tarefas.filter((x) => x.feita).sort((a, b) => t(b.feitaEm) - t(a.feitaEm));
    return `<div class="duas"><section style="min-width:0">
      <div class="entrada">
        <input class="campo campo-tarefa" style="font-size:20px" id="nova-tarefa" placeholder="Nova tarefa…" data-enter="add-tarefa" autocomplete="off">
        <input class="campo campo-cliente" id="nova-cliente" placeholder="Cliente (opcional)" list="lista-clientes" data-enter="add-tarefa" autocomplete="off">
        <datalist id="lista-clientes">${clientes().map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <input type="date" class="campo-data" id="nova-prazo" title="Prazo (opcional)" aria-label="Prazo">
        <button class="botao cheio" data-acao="add-tarefa">ADICIONAR</button>
      </div>
      <div class="lista-tarefas">
        ${abertas.length ? '' : '<div style="padding:26px 0"><p class="vazio-titulo">Nada pendente.</p><p class="vazio-texto">Escreva uma tarefa acima ou pegue uma das sugestões.</p></div>'}
        ${abertas.map(vTarefa).join('')}
        ${feitas.length ? `<button class="feitas-toggle" data-acao="ver-feitas"><span style="color:var(--apagado);font-size:10px">${ui.verFeitas ? '▼' : '▶'}</span><span class="rotulo">Feitas (${feitas.length})</span></button>
          ${ui.verFeitas ? feitas.map(vTarefa).join('') + '<div style="margin-top:16px"><button class="botao" data-acao="limpar-feitas">LIMPAR FEITAS</button></div>' : ''}` : ''}
      </div></section>
      <aside class="lateral">
        <div class="cabeca-sug"><span class="rotulo">Sugestões</span><button class="outras" data-acao="outras">${I.girar}OUTRAS</button></div>
        <p class="dica" style="color:var(--fraco);margin-bottom:10px">Toque para virar tarefa.</p><hr class="linha-h">
        ${sugestoes().map((s) => `<button class="sugestao" data-acao="sugestao" data-texto="${esc(s.texto)}" data-cliente="${esc(s.cliente)}">
          <span class="mais">${I.mais}</span><span><span class="t" style="display:block">${esc(s.texto)}</span><span class="m" style="display:block">${esc(s.motivo)}</span></span></button>`).join('')}
      </aside></div>`;
  }

  const titulo = (n) => ((n.texto || '').split('\n').map((l) => l.trim()).find(Boolean) || 'Nota nova').slice(0, 60);

  function vNotas() {
    const notas = [...dados.notas].sort((a, b) => t(b.editada) - t(a.editada));
    if (!ui.notaSel || !achar(notas, ui.notaSel)) { ui.notaSel = notas[0] ? notas[0].id : null; if (!ui.notaSel) ui.editandoNota = false; }
    const sel = achar(notas, ui.notaSel);
    return `<div class="notas ${ui.editandoNota ? 'editando' : ''}">
      <section class="notas-lista">
        <div class="notas-cabeca"><span class="rotulo">Notas</span><button class="circulo" data-acao="nova-nota" aria-label="Nova nota">${I.mais}</button></div>
        ${notas.map((n) => `<button class="nota-item ${n.id === ui.notaSel ? 'sel' : ''}" data-acao="abrir-nota" data-id="${esc(n.id)}">
          <span class="t" style="display:block">${esc(titulo(n))}</span><span class="d" style="display:block">${diaCurto(n.editada)} · ${hora(n.editada)}</span></button>`).join('')}
        ${notas.length ? '' : '<div style="padding:24px 20px"><p class="vazio-titulo">Nenhuma nota ainda.</p><p class="vazio-texto">Toque no + para escrever uma ideia, um roteiro, uma lista.</p></div>'}
      </section>
      <section class="nota-editor">${sel
        ? `<div class="barra"><button class="voltar" data-acao="voltar-notas">‹ Notas</button>
            <span class="rotulo">Editada ${diaCurto(sel.editada).toLowerCase()} às ${hora(sel.editada)}</span>
            <button class="apagar" data-acao="apagar-nota" data-id="${esc(sel.id)}" aria-label="Apagar nota">${I.lixo}</button></div>
           <textarea data-campo="nota-texto" data-id="${esc(sel.id)}" placeholder="Escreva aqui…">${esc(sel.texto)}</textarea>`
        : '<div><p class="vazio-titulo">Nenhuma nota ainda.</p><p class="vazio-texto">Clique no + para escrever uma ideia, um roteiro, uma lista.</p></div>'}
      </section></div>`;
  }

  const cfgAtivo = () => !!(cfg && cfg.dono && cfg.repo && cfg.token);
  function textoSync() {
    if (!cfgAtivo()) return 'Desligada: os dados ficam só neste aparelho.';
    if (!sync.ok) return sync.texto;
    if (sync.quando) return `Sincronizado às ${hora(sync.quando)}`;
    return 'Conectando…';
  }

  function vAjustes() {
    const c = cfg || { dono: '', repo: REPO_PADRAO, token: '' };
    const bolinha = cfgAtivo() ? (sync.ok ? 'ativo' : 'rodando') : '';
    return `<div class="ajustes">
      <div class="bloco"><span class="rotulo">Sincronizar com o Mac</span>
        <p class="dica">Os tempos, tarefas e notas ficam num repositório privado do seu GitHub. O token fica guardado só neste aparelho.</p>
        <p class="dica">Jeito fácil: no Mac, abra Ajustes do CONTROL PF e clique em “Copiar conexão”. Depois toque aqui:</p>
        <div><button class="botao cheio" data-acao="colar-conexao">COLAR CONEXÃO DO MAC</button></div>
        <input class="campo" id="a-dono" placeholder="Usuário do GitHub" value="${esc(c.dono)}" autocapitalize="off" autocorrect="off" spellcheck="false">
        <input class="campo" id="a-repo" placeholder="Repositório" value="${esc(c.repo || REPO_PADRAO)}" autocapitalize="off" autocorrect="off" spellcheck="false">
        <input class="campo" id="a-token" type="password" placeholder="Token (github_pat_…)" value="${esc(c.token)}" autocomplete="off">
        <div class="estado-sync"><span class="ponto ${bolinha}"></span><span>${esc(textoSync())}</span></div>
        <div class="acoes" style="margin:0"><button class="botao cheio" data-acao="salvar-sync">SALVAR E SINCRONIZAR</button>
          ${cfgAtivo() ? '<button class="botao" data-acao="sync-agora">SINCRONIZAR AGORA</button><button class="botao" data-acao="desligar-sync">DESLIGAR</button>' : ''}</div>
      </div>
      <hr class="linha-h">
      <div class="bloco"><span class="rotulo">No iPhone</span>
        <p class="dica">Abra este endereço no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. O CONTROL PF vira um ícone e abre em tela cheia. Conecte dentro do app da Tela de Início (ele guarda os dados separado do Safari).</p></div>
      <hr class="linha-h">
      <div class="bloco"><span class="rotulo">Cópia de segurança</span>
        <p class="dica">Baixa todos os dados deste aparelho num arquivo.</p>
        <div><button class="botao" data-acao="baixar-backup">BAIXAR CÓPIA (.JSON)</button></div></div>
    </div>`;
  }

  // ---------- desenhar ----------
  let renderPendente = false;
  const focoEmCampo = () => {
    const a = document.activeElement;
    return !!a && $('#conteudo').contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  };

  function renderAbas() {
    const topo = ABAS.map(([id, nome]) => `<button class="aba ${ui.aba === id ? 'ativa' : ''}" data-aba="${id}">${nome}</button>`).join('');
    if ($('#abas-topo').innerHTML !== topo) $('#abas-topo').innerHTML = topo;
    const baixo = [...ABAS, ['ajustes', 'AJUSTES']].map(([id, nome]) => `<button class="aba ${ui.aba === id ? 'ativa' : ''}" data-aba="${id}">${I[id]}${nome}</button>`).join('');
    if ($('#abas-baixo').innerHTML !== baixo) $('#abas-baixo').innerHTML = baixo;
  }

  function renderCanto() {
    const tm = dados.timer;
    let h;
    if (tm.inicioSessao) {
      h = `<div><div class="linha1"><span class="ponto" data-ponto style="width:7px;height:7px"></span><span class="num" data-relogio>${relogio(decorrido())}</span></div>
        <div class="linha2">${esc((tm.cliente || '').trim() || SEM_CLIENTE)}</div></div>`;
    } else {
      const d = new Date();
      h = `<div><div class="linha2" style="letter-spacing:2px">${fmt(d, { weekday: 'long' })}</div><div class="linha1">${fmt(d, { day: 'numeric', month: 'long' })}</div></div>`;
    }
    h += `<button class="engrenagem ${cfgAtivo() && !sync.ok ? 'erro' : ''}" data-aba="ajustes" aria-label="Ajustes">${I.ajustes}</button>`;
    $('#canto').innerHTML = h;
  }

  const TELAS = { timer: vTimer, historico: vHistorico, tarefas: vTarefas, notas: vNotas, ajustes: vAjustes };
  function render(forcar) {
    renderAbas();
    renderCanto();
    if (!forcar && focoEmCampo()) { renderPendente = true; atualizarRelogios(); return; }
    renderPendente = false;
    $('#conteudo').innerHTML = (TELAS[ui.aba] || vTimer)();
    atualizarRelogios();
  }

  function atualizarRelogios() {
    const s = relogio(decorrido());
    document.querySelectorAll('[data-relogio]').forEach((e) => { if (e.textContent !== s) e.textContent = s; });
    const tm = dados.timer, rod = !!tm.rodandoDesde, ativo = !!tm.inicioSessao;
    const apagado = rod && Math.floor(Date.now() / 1000) % 2 === 1;
    document.querySelectorAll('[data-ponto]').forEach((e) => {
      e.classList.toggle('rodando', rod);
      e.classList.toggle('ativo', ativo && !rod);
      e.classList.toggle('apagado', apagado);
    });
    const th = document.querySelector('[data-total-hoje]');
    if (th) th.textContent = duracao(totalHoje());
    document.title = ativo ? `${s} · CONTROL PF` : 'CONTROL PF';
  }

  function irPara(aba) {
    ui.aba = aba;
    if (aba !== 'notas') ui.editandoNota = false;
    guardarUI();
    render(true);
    window.scrollTo(0, 0);
  }

  // ---------- editor de tempo (janela) ----------
  function abrirEditor(s, nova) {
    const m = Math.round((s.segundos || 0) / 60);
    ui.modal = { s: { ...s }, nova, minOrig: m };
    $('#modal').innerHTML = `<div class="fundo-modal" data-acao="fechar-fundo"><div class="caixa-modal" role="dialog" aria-modal="true">
      <h2>${nova ? 'Lançar tempo' : 'Editar tempo'}</h2>
      <div class="bloco"><span class="rotulo">Cliente</span><input class="campo" id="m-cliente" value="${esc(s.cliente)}" list="m-clientes" autocomplete="off">
        <datalist id="m-clientes">${clientes().map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <div class="bloco"><span class="rotulo">Projeto</span><input class="campo" id="m-projeto" value="${esc(s.projeto)}" autocomplete="off"></div>
      <div class="bloco"><span class="rotulo">Tipo</span><div class="chips">${TIPOS.map((tp) => `<button class="chip ${s.tipo === tp ? 'ativo' : ''}" data-acao="m-tipo" data-valor="${tp}">${tp}</button>`).join('')}</div></div>
      <div class="linha-tipo-dia" style="gap:28px">
        <div class="bloco"><span class="rotulo">Começou</span><input type="datetime-local" class="campo-data" id="m-inicio" value="${inputDataHora(s.inicio)}"></div>
        <div class="bloco"><span class="rotulo">Duração</span><div class="duracao">
          <input type="number" min="0" inputmode="numeric" class="campo-data" id="m-h" value="${Math.floor(m / 60)}"> h
          <input type="number" min="0" max="59" inputmode="numeric" class="campo-data" id="m-m" value="${m % 60}"> min</div></div>
      </div>
      <div class="rodape-modal">${nova ? '' : '<button class="botao" data-acao="apagar-modal">APAGAR</button>'}<span class="espaco"></span>
        <button class="botao" data-acao="fechar-modal">CANCELAR</button><button class="botao cheio" data-acao="salvar-modal">SALVAR</button></div>
    </div></div>`;
  }
  function fecharModal() { ui.modal = null; $('#modal').innerHTML = ''; }
  function salvarModal() {
    const { s, nova, minOrig } = ui.modal;
    const total = Math.max(0, parseInt($('#m-h').value, 10) || 0) * 60 + Math.max(0, parseInt($('#m-m').value, 10) || 0);
    if (nova || total !== minOrig) s.segundos = total * 60;
    const ini = $('#m-inicio').value ? new Date($('#m-inicio').value) : new Date(s.inicio);
    s.inicio = isoDe(ini);
    s.fim = isoDe(new Date(ini.getTime() + s.segundos * 1000));
    s.data = s.inicio;
    s.cliente = $('#m-cliente').value.trim() || SEM_CLIENTE;
    s.projeto = $('#m-projeto').value.trim();
    s.editado = agoraISO();
    const i = dados.sessoes.findIndex((x) => x.id === s.id);
    if (i >= 0) dados.sessoes[i] = s; else dados.sessoes.push(s);
    fecharModal();
    mudou();
  }

  function adicionarTarefa(texto, cliente, prazo) {
    texto = (texto || '').trim();
    if (!texto) return false;
    const agora = agoraISO();
    const x = { id: novoId(), texto, cliente: (cliente || '').trim(), feita: false, criada: agora, editado: agora };
    if (prazo) x.prazo = prazo;
    dados.tarefas.push(x);
    return true;
  }

  function exportarCSV(lista) {
    const h = (s) => (s / 3600).toFixed(2).replace('.', ',');
    const q = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const linhas = ['Data;Cliente;Projeto;Tipo;Início;Fim;Horas;Duração'];
    for (const s of [...lista].sort((a, b) => t(a.inicio) - t(b.inicio))) {
      linhas.push([fmt(new Date(s.data), { day: '2-digit', month: '2-digit', year: 'numeric' }), q(s.cliente), q(s.projeto), s.tipo,
        hora(s.inicio), hora(s.fim), h(s.segundos), relogio(s.segundos)].join(';'));
    }
    const tot = soma(lista);
    linhas.push(`;;;;;Total;${h(tot)};${relogio(tot)}`);
    const nomeP = (PERIODOS.find((p) => p[0] === ui.periodo) || ['', ''])[1].toLowerCase();
    baixarArquivo(`horas - ${nomeP}${ui.filtroCliente ? ' - ' + ui.filtroCliente : ''}.csv`, '﻿' + linhas.join('\n'), 'text/csv;charset=utf-8');
  }

  // ---------- conexão (link/configuração) ----------
  function lerConexao(texto) {
    texto = (texto || '').trim();
    if (/^github_pat_|^ghp_/.test(texto)) return { token: texto };
    const m = texto.match(/#config=([A-Za-z0-9_-]+)/) || texto.match(/^([A-Za-z0-9_-]{40,})$/);
    if (m) {
      try {
        let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        const c = JSON.parse(textoDeB64(b));
        if (c && c.dono && c.token) return { dono: c.dono, repo: c.repo || REPO_PADRAO, token: c.token };
      } catch { /* inválido */ }
    }
    return null;
  }
  function usarConexao(c) {
    cfg = { dono: c.dono || (cfg && cfg.dono) || '', repo: c.repo || (cfg && cfg.repo) || REPO_PADRAO, token: c.token };
    gravarJSON(CH.sync, cfg);
    sync.ok = true; sync.quando = null;
    if (cfgAtivo()) { avisar('Conectado ao seu GitHub'); sincronizar(); }
    render(true);
  }

  // ---------- eventos ----------
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-acao],[data-aba]');
    if (!el) return;
    if (el.dataset.aba) { irPara(el.dataset.aba); return; }
    const id = el.dataset.id, v = el.dataset.valor;
    switch (el.dataset.acao) {
      case 'alternar': dados.timer.rodandoDesde ? pausar() : play(); break;
      case 'parar': parar(); break;
      case 'descartar': if (confirm('Descartar este tempo? Ele não vai ser salvo.')) { acumular(); limparTimer(); mudou(); } break;
      case 'cliente-chip': dados.timer.cliente = v; tocarTimer(); mudou(); break;
      case 'tipo': dados.timer.tipo = v; tocarTimer(); mudou(); break;
      case 'periodo': ui.periodo = v; guardarUI(); render(true); break;
      case 'editar-sessao': { const s = achar(dados.sessoes, id); if (s) abrirEditor(s, false); break; }
      case 'lancar': {
        const fim = new Date(), ini = new Date(fim.getTime() - 3600000);
        abrirEditor({ id: novoId(), cliente: ui.filtroCliente || clientes()[0] || '', projeto: '', tipo: dados.timer.tipo || 'Vídeo',
          data: isoDe(ini), inicio: isoDe(ini), fim: isoDe(fim), segundos: 3600 }, true);
        break;
      }
      case 'exportar': exportarCSV(filtradas()); break;
      case 'm-tipo':
        if (ui.modal) { ui.modal.s.tipo = v; el.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('ativo', c === el)); }
        break;
      case 'salvar-modal': salvarModal(); break;
      case 'fechar-modal': fecharModal(); break;
      case 'fechar-fundo': if (e.target === el) fecharModal(); break;
      case 'apagar-modal':
        if (ui.modal && confirm('Apagar este tempo?')) { apagarItem('sessoes', ui.modal.s.id); fecharModal(); mudou(); }
        break;
      case 'add-tarefa': {
        const p = $('#nova-prazo').value;
        if (adicionarTarefa($('#nova-tarefa').value, $('#nova-cliente').value, p ? deInputData(p) : null)) {
          const cli = $('#nova-cliente').value;
          mudou();
          $('#nova-cliente').value = cli;
          $('#nova-tarefa').focus();
        }
        break;
      }
      case 'toggle-tarefa': {
        const x = achar(dados.tarefas, id);
        if (x) { x.feita = !x.feita; if (x.feita) x.feitaEm = agoraISO(); else delete x.feitaEm; x.editado = agoraISO(); mudou(); }
        break;
      }
      case 'apagar-tarefa': apagarItem('tarefas', id); mudou(); break;
      case 'ver-feitas': ui.verFeitas = !ui.verFeitas; render(true); break;
      case 'limpar-feitas': dados.tarefas.filter((x) => x.feita).forEach((x) => apagarItem('tarefas', x.id)); mudou(); break;
      case 'sugestao': adicionarTarefa(el.dataset.texto, el.dataset.cliente); mudou(); avisar('Virou tarefa'); break;
      case 'outras': ui.semente++; render(true); break;
      case 'nova-nota': {
        const agora = agoraISO();
        const n = { id: novoId(), texto: '', criada: agora, editada: agora, editado: agora };
        dados.notas.push(n);
        ui.notaSel = n.id; ui.editandoNota = true;
        mudou();
        const ta = document.querySelector('.nota-editor textarea');
        if (ta) ta.focus();
        break;
      }
      case 'abrir-nota': ui.notaSel = id; ui.editandoNota = true; render(true); window.scrollTo(0, 0); break;
      case 'voltar-notas': ui.editandoNota = false; render(true); break;
      case 'apagar-nota':
        if (confirm('Apagar esta nota?')) { apagarItem('notas', id); ui.notaSel = null; ui.editandoNota = false; mudou(); }
        break;
      case 'colar-conexao': {
        let texto = '';
        try { texto = await navigator.clipboard.readText(); } catch { texto = prompt('Cole aqui a conexão copiada no Mac:') || ''; }
        const c = lerConexao(texto);
        if (c && c.dono) usarConexao(c);
        else if (c && c.token) { $('#a-token').value = c.token; avisar('Token colado. Confira o usuário e salve.'); }
        else avisar('Não achei a conexão. Copie de novo no Mac.');
        break;
      }
      case 'salvar-sync': {
        const dono = $('#a-dono').value.trim(), repo = $('#a-repo').value.trim() || REPO_PADRAO, token = $('#a-token').value.trim();
        cfg = { dono, repo, token };
        gravarJSON(CH.sync, cfg);
        sync.ok = true; sync.quando = null;
        render(true);
        sincronizar();
        break;
      }
      case 'sync-agora': sincronizar(); avisar('Sincronizando…'); break;
      case 'desligar-sync':
        if (confirm('Desligar a sincronização neste aparelho? Os dados continuam aqui.')) { cfg = { ...cfg, token: '' }; gravarJSON(CH.sync, cfg); render(true); }
        break;
      case 'baixar-backup': baixarArquivo(`control-pf-${inputData(agoraISO())}.json`, JSON.stringify(dados, null, 1), 'application/json'); break;
      default: break;
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target, c = el.dataset.campo;
    if (c === 'timer-cliente' || c === 'timer-projeto') {
      dados.timer[c === 'timer-cliente' ? 'cliente' : 'projeto'] = el.value;
      tocarTimer(); salvarLocal();
      if (c === 'timer-cliente') renderCanto();
    } else if (c === 'nota-texto') {
      const n = achar(dados.notas, el.dataset.id);
      if (!n) return;
      n.texto = el.value; n.editada = n.editado = agoraISO();
      salvarLocal();
      const tt = document.querySelector(`.nota-item[data-id="${CSS.escape(n.id)}"] .t`);
      if (tt) tt.textContent = titulo(n);
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target, c = el.dataset.campo;
    if (c === 'timer-data' && el.value) { dados.timer.data = deInputData(el.value); tocarTimer(); salvarLocal(); }
    else if (c === 'tarefa-texto') {
      const x = achar(dados.tarefas, el.dataset.id);
      if (x && el.value.trim() && el.value.trim() !== x.texto) { x.texto = el.value.trim(); x.editado = agoraISO(); salvarLocal(); }
    } else if (c === 'filtro-cliente') { ui.filtroCliente = el.value; el.blur(); render(true); }
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (e.key === 'Enter' && el.dataset && el.dataset.enter === 'add-tarefa') {
      e.preventDefault();
      document.querySelector('[data-acao="add-tarefa"]').click();
    } else if (e.key === 'Enter' && el.dataset && el.dataset.campo === 'tarefa-texto') {
      el.blur();
    } else if (e.key === 'Escape' && ui.modal) {
      fecharModal();
    }
  });

  document.addEventListener('focusout', () => setTimeout(() => { if (renderPendente && !focoEmCampo()) render(); }, 0));

  // ---------- sincronização pelo GitHub ----------
  function b64DeTexto(s) {
    const b = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function textoDeB64(b) {
    const bin = atob(b.replace(/\s/g, ''));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(u);
  }

  const CONFLITO = { conflito: true };
  class ErroSync extends Error {}
  const urlArquivo = () => `https://api.github.com/repos/${encodeURIComponent(cfg.dono)}/${encodeURIComponent(cfg.repo)}/contents/dados.json`;
  const cabecalhos = (cru) => ({
    Authorization: `Bearer ${cfg.token}`,
    Accept: cru ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
  });
  function erroHttp(c) {
    if (c === 401) return new ErroSync('Token inválido ou vencido');
    if (c === 403) return new ErroSync('Sem permissão (confira o token)');
    if (c === 404) return new ErroSync('Repositório não encontrado');
    if (c === 409 || c === 422) return CONFLITO;
    return new ErroSync(`Erro do GitHub (${c})`);
  }

  async function baixar() {
    const r = await fetch(urlArquivo(), { headers: cabecalhos(), cache: 'no-store' });
    if (r.status === 404) return { remoto: null, sha: null };
    if (!r.ok) throw erroHttp(r.status);
    const j = await r.json();
    let texto = j.content ? textoDeB64(j.content) : '';
    if (!texto) {
      const r2 = await fetch(urlArquivo(), { headers: cabecalhos(true), cache: 'no-store' });
      if (!r2.ok) throw erroHttp(r2.status);
      texto = await r2.text();
    }
    return { remoto: normalizarDados(JSON.parse(texto)), sha: j.sha };
  }

  async function enviar(d, sha) {
    const copia = { ...d };
    delete copia.ajustes;
    const corpo = { message: `CONTROL PF (web) ${fmt(new Date(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`, content: b64DeTexto(JSON.stringify(copia)) };
    if (sha) corpo.sha = sha;
    const r = await fetch(urlArquivo(), { method: 'PUT', headers: { ...cabecalhos(), 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    if (!r.ok) throw erroHttp(r.status);
  }

  /** Junta os dois lados: em cada item vale a edição mais nova; o que foi apagado some dos dois. (Igual ao app do Mac.) */
  function mesclar(local, remoto) {
    const ap = { ...(remoto.apagados || {}) };
    for (const [k, v] of Object.entries(local.apagados || {})) if (!ap[k] || t(v) > t(ap[k])) ap[k] = v;
    const limite = Date.now() - 90 * 86400000;
    for (const k of Object.keys(ap)) if (t(ap[k]) <= limite) delete ap[k];
    const r = { ...local, apagados: ap };
    for (const nome of ['sessoes', 'tarefas', 'notas']) {
      const mapa = new Map();
      for (const it of [...(remoto[nome] || []), ...(local[nome] || [])]) {
        const id = String(it.id).toUpperCase();
        const ex = mapa.get(id);
        if (!ex || t(it.editado) >= t(ex.editado)) mapa.set(id, it.id === id ? it : { ...it, id });
      }
      r[nome] = [...mapa.values()].filter((it) => !(ap[it.id] && t(ap[it.id]) >= t(it.editado)));
    }
    r.timer = t(local.timer && local.timer.editado) >= t(remoto.timer && remoto.timer.editado) ? local.timer : remoto.timer;
    return r;
  }
  function canon(x) {
    if (Array.isArray(x)) return x.map(canon);
    if (x && typeof x === 'object') {
      const o = {};
      for (const k of Object.keys(x).sort()) if (x[k] !== null && x[k] !== undefined && k !== 'ajustes') o[k] = canon(x[k]);
      return o;
    }
    return x;
  }
  const igual = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

  function agendarSync(ms) {
    if (!cfgAtivo()) return;
    clearTimeout(sync.agendado);
    sync.agendado = setTimeout(sincronizar, ms);
  }

  async function sincronizar() {
    if (!cfgAtivo()) return;
    if (sync.ocupado) { sync.pendente = true; return; }
    sync.ocupado = true;
    try {
      for (let i = 0; i < 3; i++) {
        try {
          const { remoto, sha } = await baixar();
          const mesclado = remoto ? mesclar(dados, remoto) : dados;
          if (!igual(mesclado, dados)) { dados = normalizarDados(mesclado); guardar(); render(); }
          if (!remoto || !igual(mesclado, remoto)) await enviar(mesclado, sha);
          sync.ok = true; sync.quando = new Date();
          break;
        } catch (err) {
          if (err === CONFLITO && i < 2) continue;
          throw err;
        }
      }
    } catch (err) {
      sync.ok = false;
      sync.texto = err instanceof ErroSync ? err.message : err === CONFLITO ? 'Conflito, tente de novo' : 'Sem internet ou GitHub fora do ar';
    } finally {
      sync.ocupado = false;
      renderCanto();
      if (ui.aba === 'ajustes') render();
      if (sync.pendente) { sync.pendente = false; agendarSync(1000); }
    }
  }

  setInterval(() => { if (!document.hidden) sincronizar(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { sincronizar(); render(); } });
  window.addEventListener('online', () => sincronizar());
  setInterval(atualizarRelogios, 1000);

  // ---------- início ----------
  async function iniciar() {
    // Link de conexão vindo do Mac (#config=...): guarda e tira do endereço.
    if (location.hash.startsWith('#config=')) {
      const c = lerConexao(location.hash);
      history.replaceState(null, '', location.pathname + location.search);
      if (c && c.dono) { cfg = { dono: c.dono, repo: c.repo, token: c.token }; gravarJSON(CH.sync, cfg); setTimeout(() => avisar('Conectado ao seu GitHub'), 300); }
    }
    // Só para testar no computador: dados de exemplo.
    const demo = location.hostname === 'localhost' && location.hash.match(/^#demo(?:-(\w+))?/);
    if (demo) {
      try { dados = normalizarDados(await (await fetch('demo.json')).json()); } catch { /* sem demo */ }
      if (demo[1]) ui.aba = demo[1];
      if (demo[1] === 'notas') ui.editandoNota = true;
    }
    render(true);
    sincronizar();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  iniciar();
})();
