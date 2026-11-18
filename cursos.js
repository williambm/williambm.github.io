// Renderiza a lista de cursos a partir de cursos.json.
// Para adicionar um certificado, edite apenas o cursos.json.

const estado = {
  cursos: [],
  busca: "",
  instituicao: "",
  tag: "",
  ordem: "recentes",
};

const el = {
  lista: document.getElementById("lista-cursos"),
  busca: document.getElementById("busca"),
  instituicao: document.getElementById("filtro-instituicao"),
  tags: document.getElementById("filtro-tags"),
  ordem: document.getElementById("ordem"),
  resumo: document.getElementById("resumo"),
  vazio: document.getElementById("vazio"),
  limpar: document.getElementById("limpar"),
};

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function criarCard(curso) {
  const card = document.createElement("article");
  card.className = "card";

  const topo = document.createElement("div");
  topo.className = "card-topo";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = curso.instituicao;

  const data = document.createElement("time");
  data.dateTime = curso.data;
  data.textContent = formatarData(curso.data);

  topo.append(badge, data);

  const titulo = document.createElement("h3");
  titulo.textContent = curso.titulo;

  card.append(topo, titulo);

  if (curso.cargaHoraria) {
    const carga = document.createElement("p");
    carga.className = "carga";
    carga.textContent = `${curso.cargaHoraria} horas`;
    card.append(carga);
  }

  const tags = document.createElement("ul");
  tags.className = "tags";
  (curso.tags || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    tags.append(li);
  });
  card.append(tags);

  const acoes = document.createElement("div");
  acoes.className = "acoes";

  if (curso.link) {
    const a = document.createElement("a");
    a.className = "botao";
    a.href = curso.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Ver certificado";
    acoes.append(a);
  }
  card.append(acoes);

  return card;
}

function filtrados() {
  const termo = normalizar(estado.busca.trim());
  const lista = estado.cursos.filter((c) => {
    if (estado.instituicao && c.instituicao !== estado.instituicao) return false;
    if (estado.tag && !(c.tags || []).includes(estado.tag)) return false;
    if (termo) {
      const alvo = normalizar([c.titulo, c.instituicao, ...(c.tags || [])].join(" "));
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });

  lista.sort((a, b) => {
    if (estado.ordem === "antigos") return a.data.localeCompare(b.data);
    if (estado.ordem === "titulo") return a.titulo.localeCompare(b.titulo, "pt-BR");
    return b.data.localeCompare(a.data);
  });
  return lista;
}

function renderizar() {
  const lista = filtrados();
  el.lista.replaceChildren(...lista.map(criarCard));
  el.vazio.hidden = lista.length > 0;

  const horas = lista.reduce((soma, c) => soma + (c.cargaHoraria || 0), 0);
  const partes = [`${lista.length} de ${estado.cursos.length} cursos`];
  if (horas > 0) partes.push(`${horas} horas`);
  el.resumo.textContent = partes.join(" \u00b7 ");

  document.querySelectorAll("#filtro-tags button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.tag === estado.tag));
  });
}

function montarFiltros() {
  const instituicoes = [...new Set(estado.cursos.map((c) => c.instituicao))].sort();
  instituicoes.forEach((i) => {
    const op = document.createElement("option");
    op.value = i;
    op.textContent = i;
    el.instituicao.append(op);
  });

  const tags = [...new Set(estado.cursos.flatMap((c) => c.tags || []))].sort();
  tags.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.tag = t;
    b.textContent = t;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      estado.tag = estado.tag === t ? "" : t;
      renderizar();
    });
    el.tags.append(b);
  });
}

function ligarEventos() {
  el.busca.addEventListener("input", (e) => {
    estado.busca = e.target.value;
    renderizar();
  });
  el.instituicao.addEventListener("change", (e) => {
    estado.instituicao = e.target.value;
    renderizar();
  });
  el.ordem.addEventListener("change", (e) => {
    estado.ordem = e.target.value;
    renderizar();
  });
  el.limpar.addEventListener("click", () => {
    estado.busca = "";
    estado.instituicao = "";
    estado.tag = "";
    el.busca.value = "";
    el.instituicao.value = "";
    renderizar();
  });
}

async function iniciar() {
  try {
    const resp = await fetch("cursos.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    estado.cursos = await resp.json();
    montarFiltros();
    ligarEventos();
    renderizar();
  } catch (erro) {
    el.resumo.textContent = "N\u00e3o foi poss\u00edvel carregar os cursos.";
    console.error("Falha ao carregar cursos.json:", erro);
  }
}

iniciar();
