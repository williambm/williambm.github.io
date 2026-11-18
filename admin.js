// Admin de cursos: edita cursos.json diretamente no repositorio via API do GitHub.
// O token fica apenas no localStorage deste navegador.

const REPO = { dono: "williambm", nome: "williambm.github.io", arquivo: "cursos.json" };
const CHAVE_TOKEN = "admin_token_github";
const URL_API = `https://api.github.com/repos/${REPO.dono}/${REPO.nome}/contents/${REPO.arquivo}`;

const $ = (id) => document.getElementById(id);

const estado = { token: "", cursos: [] };

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) || "";
  } catch (e) {
    return "";
  }
}

function gravarToken(valor) {
  try {
    if (valor) localStorage.setItem(CHAVE_TOKEN, valor);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch (e) {
    // sem storage: o token vale apenas ate fechar a pagina
  }
}

function mostrarMensagem(texto, erro) {
  const el = $("msg");
  el.textContent = texto;
  el.className = erro ? "msg erro" : "msg ok";
}

function cabecalhos() {
  return {
    Authorization: `Bearer ${estado.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function textoParaBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ParaTexto(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function erroHttp(resp) {
  if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
    return "Token inv\u00e1lido, expirado ou sem permiss\u00e3o (precisa de Contents: Read and write neste reposit\u00f3rio).";
  }
  if (resp.status === 409 || resp.status === 422) {
    return "Conflito: o arquivo mudou no GitHub. Recarregue a p\u00e1gina e tente de novo.";
  }
  return `Falha ao falar com o GitHub (HTTP ${resp.status}).`;
}

async function lerRemoto() {
  const resp = await fetch(URL_API, { headers: cabecalhos(), cache: "no-store" });
  if (!resp.ok) throw new Error(erroHttp(resp));
  const dados = await resp.json();
  return { sha: dados.sha, cursos: JSON.parse(base64ParaTexto(dados.content)) };
}

async function gravarRemoto(cursos, mensagem) {
  // Le o sha mais recente imediatamente antes de gravar, para nao sobrescrever mudancas.
  const atual = await lerRemoto();
  const ordenados = [...cursos].sort((a, b) => b.data.localeCompare(a.data));
  const corpo = {
    message: mensagem,
    content: textoParaBase64(JSON.stringify(ordenados, null, 2) + "\n"),
    sha: atual.sha,
  };
  const resp = await fetch(URL_API, {
    method: "PUT",
    headers: { ...cabecalhos(), "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resp.ok) throw new Error(erroHttp(resp));
  estado.cursos = ordenados;
}

function formatarData(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function renderizarLista() {
  const ul = $("admin-lista");
  ul.replaceChildren();
  [...estado.cursos]
    .sort((a, b) => b.data.localeCompare(a.data))
    .forEach((curso) => {
      const li = document.createElement("li");
      const info = document.createElement("span");
      info.textContent = `${formatarData(curso.data)} \u00b7 ${curso.instituicao} \u00b7 ${curso.titulo}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "botao secundario";
      btn.textContent = "Remover";
      btn.addEventListener("click", () => remover(curso));
      li.append(info, btn);
      ul.append(li);
    });

  const dl = $("lista-instituicoes");
  dl.replaceChildren();
  [...new Set(estado.cursos.map((c) => c.instituicao))].sort().forEach((i) => {
    const op = document.createElement("option");
    op.value = i;
    dl.append(op);
  });
}

function lerFormulario() {
  const titulo = $("f-titulo").value.trim();
  const instituicao = $("f-instituicao").value.trim();
  const data = $("f-data").value;
  const link = $("f-link").value.trim();
  const carga = parseInt($("f-carga").value, 10);
  const tags = $("f-tags").value.split(",").map((t) => t.trim()).filter(Boolean);

  if (!titulo || !instituicao || !data) {
    throw new Error("Preencha t\u00edtulo, institui\u00e7\u00e3o e data.");
  }
  if (!/^https:\/\/\S+$/.test(link)) {
    throw new Error("Informe uma URL https v\u00e1lida para o certificado.");
  }
  if (estado.cursos.some((c) => c.titulo === titulo && c.data === data)) {
    throw new Error("Curso j\u00e1 cadastrado (mesmo t\u00edtulo e data).");
  }
  return {
    titulo,
    instituicao,
    data,
    cargaHoraria: Number.isFinite(carga) && carga > 0 ? carga : null,
    tags,
    link,
  };
}

async function salvarCurso(evento) {
  evento.preventDefault();
  const botao = $("btn-salvar");
  try {
    const novo = lerFormulario();
    botao.disabled = true;
    mostrarMensagem("Salvando...", false);
    await gravarRemoto([...estado.cursos, novo], `Adiciona curso: ${novo.titulo}`);
    $("form-curso").reset();
    renderizarLista();
    mostrarMensagem("Curso adicionado! O site atualiza em cerca de 1 minuto.", false);
  } catch (e) {
    mostrarMensagem(e.message, true);
  } finally {
    botao.disabled = false;
  }
}

async function remover(curso) {
  if (!confirm(`Remover "${curso.titulo}"?`)) return;
  try {
    mostrarMensagem("Removendo...", false);
    const restantes = estado.cursos.filter((c) => !(c.titulo === curso.titulo && c.data === curso.data));
    await gravarRemoto(restantes, `Remove curso: ${curso.titulo}`);
    renderizarLista();
    mostrarMensagem("Curso removido. O site atualiza em cerca de 1 minuto.", false);
  } catch (e) {
    mostrarMensagem(e.message, true);
  }
}

async function entrar() {
  $("bloco-form").hidden = false;
  $("bloco-lista").hidden = false;
  $("esquecer-token").hidden = false;
  try {
    const remoto = await lerRemoto();
    estado.cursos = remoto.cursos;
    renderizarLista();
    mostrarMensagem("Conectado ao reposit\u00f3rio.", false);
  } catch (e) {
    mostrarMensagem(e.message, true);
  }
}

function sair() {
  gravarToken("");
  estado.token = "";
  estado.cursos = [];
  $("token").value = "";
  $("bloco-form").hidden = true;
  $("bloco-lista").hidden = true;
  $("esquecer-token").hidden = true;
  mostrarMensagem("", false);
}

function iniciar() {
  $("salvar-token").addEventListener("click", () => {
    const valor = $("token").value.trim();
    if (!valor) return;
    estado.token = valor;
    gravarToken(valor);
    $("token").value = "";
    entrar();
  });
  $("esquecer-token").addEventListener("click", sair);
  $("form-curso").addEventListener("submit", salvarCurso);

  estado.token = lerToken();
  if (estado.token) entrar();
}

iniciar();
