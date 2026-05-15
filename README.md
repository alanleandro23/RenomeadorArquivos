# Gerenciador DANFE

Software desktop desenvolvido em **React + Electron** para:

- Renomear DANFEs automaticamente
- Ler chave de acesso via OCR
- Ler número da NF automaticamente
- Dividir PDFs página por página
- Gerar ZIP com arquivos organizados
- Processar PDFs digitais e escaneados

---

# Preview das Funcionalidades

## ✅ Renomear DANFEs

O sistema lê automaticamente:

- Chave de acesso da NF-e
- Número da nota fiscal
- PDFs escaneados via OCR

### Resultado automático

```text
32260421982891000280550010000040471078000551-NFE.pdf
```

---

## ✅ Apenas NFE

Renomeia apenas utilizando o número da nota fiscal.

### Resultado automático

```text
NFE4047.pdf
```

---

## ✅ Dividir PDFs

O sistema:

- Divide PDFs automaticamente
- Separa cada página individualmente
- Faz OCR em cada página
- Renomeia automaticamente
- Gera ZIP final

---

# Tecnologias Utilizadas

| Tecnologia | Função |
|---|---|
| React | Interface |
| Vite | Build rápido |
| Electron | Aplicação desktop |
| Tesseract.js | OCR |
| PDF.js | Leitura de PDF |
| PDF-LIB | Divisão de PDFs |
| JSZip | Geração ZIP |
| TailwindCSS | Estilização |

---

# Requisitos

Antes de começar, instale:

- Node.js 20+
- NPM
- Git (opcional)

---

# Instalação do Node.js

Baixe:

```text
https://nodejs.org
```

Instale a versão:

```text
LTS
```

---

# Clonar Projeto

```bash
git clone URL_DO_REPOSITORIO
```

ou extraia o `.zip`.

---

# Abrir Projeto

Abra a pasta no:

```text
VSCode
```

---

# Instalar Dependências

Abra o terminal dentro do projeto:

```bash
npm install
```

---

# Dependências OCR e PDF

Caso necessário:

```bash
npm install tesseract.js
npm install pdfjs-dist
npm install pdf-lib
npm install jszip
```

---

# Dependências Electron

```bash
npm install electron electron-builder --save-dev
```

---

# Estrutura do Projeto

```text
gerenciador-danfe/
│
├── public/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│
├── electron.js
├── vite.config.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
│
└── release/
```

---

# Configuração do Vite

Arquivo:

```text
vite.config.js
```

Conteúdo:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
```

---

# Configuração Electron

Arquivo:

```text
electron.js
```

Exemplo básico:

```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
  })

  win.loadFile('dist/index.html')
}

app.whenReady().then(createWindow)
```

---

# Rodar Projeto React

```bash
npm run dev
```

O sistema abrirá em:

```text
http://localhost:5173
```

---

# Rodar Electron

```bash
npm run electron
```

---

# Gerar Build React

```bash
npm run build
```

---

# Gerar Instalador EXE

```bash
npm run dist
```

---

# Local do Instalador

Após gerar:

```text
release/
```

Exemplo:

```text
release/Gerenciador DANFE Setup.exe
```

---

# Configuração do package.json

Exemplo básico:

```json
{
  "main": "electron.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron": "electron .",
    "dist": "npm run build && electron-builder"
  }
}
```

---

# OCR Inteligente

O sistema utiliza:

```text
Tesseract OCR
```

para leitura automática de:

- DANFEs digitais
- PDFs escaneados
- PDFs em imagem
- Notas fiscais fotografadas

---

# Como Funciona a Leitura

O sistema:

1. Abre o PDF
2. Extrai texto nativo
3. Se não houver texto:
   - converte página em imagem
   - aplica OCR
4. Localiza:
   - chave de acesso
   - número NF
5. Renomeia automaticamente

---

# Formatos Reconhecidos

## Chave de acesso

Exemplo:

```text
3226 0421 9828 9100 0280 5500 1000 0040 4710 7800 0551
```

Convertido para:

```text
32260421982891000280550010000040471078000551
```

---

## Número da NF

Exemplo:

```text
Nº 000.004.047
```

Convertido para:

```text
4047
```

---

# Funcionalidades Futuras

- Drag and Drop
- Multi-thread OCR
- GPU OCR
- Leitura XML
- Exportar CSV
- Banco de dados
- Histórico
- OCR acelerado
- Modo lote empresarial

---

# Problemas Comuns

---

## Tela branca no Electron

Execute:

```bash
npm run build
npm run electron
```

Verifique:

```js
base: './'
```

no:

```text
vite.config.js
```

---

## OCR não funciona

Reinstale:

```bash
npm install tesseract.js
```

---

## PDF não reconhece

Verifique se:

- PDF não está corrompido
- PDF possui imagem legível
- OCR está instalado

---

## Worker PDF.js erro 404

Use:

```js
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
```

---

# Melhorias de Performance

O sistema já possui:

- OCR apenas quando necessário
- Extração de texto nativa primeiro
- Compressão ZIP otimizada
- Processamento progressivo
- Barra de progresso

---

# Build Produção

Para gerar versão final:

```bash
npm run build
npm run dist
```

---

# Publicação

Você pode publicar:

- Instalador `.exe`
- Portable `.exe`
- ZIP portátil
- GitHub Releases

---

# Segurança

O sistema:

- Não envia arquivos para internet
- Processa tudo localmente
- OCR totalmente offline

---

# Autor

## Alan Leandro

Sistema interno para automação de DANFEs e PDFs.

---

# Licença

```text
Uso privado/interno
```
