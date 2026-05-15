# Gerenciador DANFE

Software desktop desenvolvido em React + Electron para:

- Renomear DANFEs automaticamente
- Ler chave de acesso via OCR
- Dividir PDFs
- Gerar arquivos organizados automaticamente
- Exportar ZIPs com PDFs renomeados

---

# Funcionalidades

## Renomear DANFEs

O sistema identifica automaticamente:

- Chave de acesso da NF-e
- Número da NF
- Dados via OCR (inclusive PDFs escaneados)

Formato final:

```text
32260421982891000280550010000040471078000551-NFE.pdf
```

---

## Dividir PDFs

- Divide PDFs página por página
- Faz OCR individual em cada página
- Renomeia automaticamente
- Gera ZIP final

---

# Tecnologias Utilizadas

- React
- Vite
- Electron
- Tesseract OCR
- PDF.js
- PDF-LIB
- JSZip
- TailwindCSS

---

# Instalação do Projeto

## Instalar dependências

```bash
npm install
```

---

# Executar em desenvolvimento

```bash
npm run dev
```

---

# Executar Electron

```bash
npm run electron
```

---

# Gerar EXE

```bash
npm run dist
```

O instalador será criado em:

```text
release/
```

---

# Estrutura do Projeto

```text
src/
public/
electron.js
package.json
vite.config.js
```

---

# Configuração importante

No `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
```

---

# Dependências principais

```bash
npm install react
npm install pdfjs-dist
npm install pdf-lib
npm install jszip
npm install tesseract.js
```

---

# Dependências Electron

```bash
npm install electron electron-builder --save-dev
```

---

# OCR

O sistema utiliza OCR com Tesseract para leitura automática de:

- DANFEs digitais
- PDFs escaneados
- Notas fiscais em imagem

---

# Autor

Desenvolvido por Alan Leandro

---

# Licença

Uso interno / privado.