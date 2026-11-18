# williambm.github.io

Pagina pessoal publicada via GitHub Pages.

## Como adicionar um curso

### Pela interface (recomendado)

1. Abra `admin.html` no site publicado (ou localmente).
2. Na primeira vez, cole um token pessoal do GitHub (fine-grained) com permissao
   **Contents: Read and write** apenas neste repositorio. Fica guardado so no seu navegador.
3. Preencha o formulario (titulo, instituicao, data, URL do certificado) e salve.
   O commit no `cursos.json` e feito automaticamente e o site atualiza em cerca de 1 minuto.

### Manualmente

Acrescente um objeto em `cursos.json` e faca commit e push:

```json
{
  "titulo": "Nome do curso",
  "instituicao": "Alura",
  "data": "2025-01-31",
  "cargaHoraria": 8,
  "tags": ["Java", "Spring Boot"],
  "link": "https://link-do-certificado"
}
```

Campos: `data` no formato AAAA-MM-DD; `cargaHoraria` pode ser `null`.
A ordem no arquivo nao importa, a pagina ordena por data.

## Testar localmente

O `fetch` do JSON nao funciona abrindo o arquivo direto (`file://`). Use:

    python3 -m http.server 8000

e abra http://localhost:8000/cursos.html
