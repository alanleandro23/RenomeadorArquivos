import Tesseract from 'tesseract.js'
import { useState } from 'react'
import JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export default function App() {
  const [renamedFiles, setRenamedFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [splitPages, setSplitPages] = useState([])
  const [activeTab, setActiveTab] = useState('rename')

  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const [uploadProgress, setUploadProgress] = useState(0)

  const [splitLoading, setSplitLoading] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

  const extractDanfeInfo = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise

      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)

        const viewport = page.getViewport({
          scale: 2,
        })

        const canvas =
          document.createElement('canvas')

        const context =
          canvas.getContext('2d')

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: context,
          viewport,
        }).promise

        const image =
          canvas.toDataURL('image/png')

        const result =
          await Tesseract.recognize(
            image,
            'eng',
            {
              logger: (m) => {
                if (
                  m.status ===
                  'recognizing text'
                ) {
                  setUploadProgress(
                    Math.round(
                      m.progress * 100
                    )
                  )
                }
              },
            }
          )

        fullText +=
          ' ' + result.data.text
      }

      const normalizedText =
        fullText
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

      console.log(normalizedText)

      // =========================
      // CHAVE
      // =========================

      const keyMatch =
        normalizedText.match(
          /(\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4})/
        )

      let accessKey =
        'SEM_CHAVE'

      if (keyMatch) {
        accessKey = keyMatch[0]
          .replace(/\s/g, '')
          .trim()
      }

      // =========================
      // NF
      // =========================

      const nfMatch =
        normalizedText.match(
          /N[º°o]?\s*([0-9.]+)/i
        )

      let nfNumber = 'SEM_NF'

      if (nfMatch) {
        nfNumber = nfMatch[1]
          .replace(/\./g, '')
          .replace(/^0+/, '')
          .trim()
      }

      return `${accessKey}-NFE`
    } catch (error) {
      console.error(error)

      return 'SEM_CHAVE+NF_ERRO'
    }
  }

  const handleFiles = async () => {
    try {
      if (!selectedFiles.length) {
        alert(
          'Selecione arquivos primeiro.'
        )
        return
      }

      setProcessing(true)
      setUploadProgress(0)

      const processed = []

      for (
        let i = 0;
        i < selectedFiles.length;
        i++
      ) {
        const file = selectedFiles[i]

        const newName =
          await extractDanfeInfo(file)

        processed.push({
          file,
          newName,
        })

        const percent =
          Math.round(
            ((i + 1) /
              selectedFiles.length) *
              100
          )

        setUploadProgress(percent)
      }

      setRenamedFiles(processed)

      setProcessing(false)
    } catch (error) {
      console.error(error)

      setProcessing(false)
    }
  }

  const generateRenamedZip =
    async () => {
      if (!renamedFiles.length) {
        alert(
          'Nenhum arquivo encontrado.'
        )
        return
      }

      setLoading(true)

      const zip = new JSZip()

      for (const item of renamedFiles) {
        const buffer =
          await item.file.arrayBuffer()

        zip.file(
          `${item.newName}.pdf`,
          buffer
        )
      }

      const content =
        await zip.generateAsync({
          type: 'blob',
        })

      const url =
        URL.createObjectURL(content)

      const link =
        document.createElement('a')

      link.href = url

      link.download =
        'danfes-renomeadas.zip'

      document.body.appendChild(link)

      link.click()

      link.remove()

      URL.revokeObjectURL(url)

      setLoading(false)
    }

  const loadPdfForSplit =
    async (file) => {
      if (!file) return

      const arrayBuffer =
        await file.arrayBuffer()

      const pdf =
        await pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        }).promise

      const pages = []

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {
        pages.push({
          id: i,
          page: i,
          file,
        })
      }

      setSplitPages(pages)
    }

  const generateSplitZip =
    async () => {
      try {
        if (!splitPages.length) {
          alert(
            'Nenhuma página encontrada.'
          )
          return
        }

        setSplitLoading(true)
        setSplitProgress(0)

        const zip = new JSZip()

        const originalBytes =
          await splitPages[0].file.arrayBuffer()

        const originalPdf =
          await PDFDocument.load(
            originalBytes
          )

        for (
          let i = 0;
          i < splitPages.length;
          i++
        ) {
          const splitPdf =
            await PDFDocument.create()

          const [copiedPage] =
            await splitPdf.copyPages(
              originalPdf,
              [i]
            )

          splitPdf.addPage(
            copiedPage
          )

          const pdfBytes =
            await splitPdf.save()

          const blob = new Blob(
            [pdfBytes],
            {
              type:
                'application/pdf',
            }
          )

          const splitFile =
            new File(
              [blob],
              `pagina_${i + 1}.pdf`,
              {
                type:
                  'application/pdf',
              }
            )

          const autoName =
            await extractDanfeInfo(
              splitFile
            )

          zip.file(
            `${autoName}.pdf`,
            pdfBytes
          )

          const percent =
            Math.round(
              ((i + 1) /
                splitPages.length) *
                100
            )

          setSplitProgress(percent)
        }

        const content =
          await zip.generateAsync({
            type: 'blob',
          })

        const url =
          URL.createObjectURL(content)

        const link =
          document.createElement('a')

        link.href = url

        link.download =
          'pdfs-divididos.zip'

        document.body.appendChild(link)

        link.click()

        link.remove()

        URL.revokeObjectURL(url)

        setSplitLoading(false)

        alert(
          'PDFs divididos com sucesso!'
        )
      } catch (error) {
        console.error(error)

        alert(
          'Erro ao dividir PDFs.'
        )

        setSplitLoading(false)
      }
    }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          Gerenciador DANFE
        </h1>

        <div className="flex gap-4 mb-8">

          <button
            onClick={() =>
              setActiveTab('rename')
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab === 'rename'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Renomear DANFEs
          </button>

          <button
            onClick={() =>
              setActiveTab('split')
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab === 'split'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Dividir PDFs
          </button>

        </div>

        {activeTab === 'rename' && (
          <div>

            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) =>
                setSelectedFiles(
                  Array.from(
                    e.target.files
                  )
                )
              }
              className="w-full border rounded-xl p-4"
            />

            <button
              onClick={handleFiles}
              disabled={
                processing ||
                selectedFiles.length === 0
              }
              className="mt-4 w-full bg-blue-600 text-white py-4 rounded-2xl"
            >
              {processing
                ? 'Processando PDFs...'
                : 'Iniciar Processamento'}
            </button>

            <button
              onClick={() => {
                setRenamedFiles([])
                setSelectedFiles([])
                setUploadProgress(0)
              }}
              className="mt-3 w-full bg-red-600 text-white py-4 rounded-2xl"
            >
              Limpar Área
            </button>

            <div className="mt-6">

              <div className="flex justify-between mb-2">
                <span>Progresso</span>
                <span>
                  {uploadProgress}%
                </span>
              </div>

              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-5 bg-green-600"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>

            </div>

            <div className="space-y-4 mt-6">

              {renamedFiles.map(
                (item, index) => (
                  <div
                    key={index}
                    className="border rounded-2xl p-4"
                  >
                    <div>
                      {item.file.name}
                    </div>

                    <div className="text-blue-700 break-all">
                      {item.newName}
                      .pdf
                    </div>
                  </div>
                )
              )}

            </div>

            <button
              onClick={
                generateRenamedZip
              }
              disabled={loading}
              className="mt-6 w-full bg-green-600 text-white py-4 rounded-2xl"
            >
              {loading
                ? 'Gerando ZIP...'
                : 'Gerar DANFEs'}
            </button>

          </div>
        )}

        {activeTab === 'split' && (
          <div>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                loadPdfForSplit(
                  e.target.files[0]
                )
              }
              className="w-full border rounded-xl p-4"
            />

            <button
              onClick={
                generateSplitZip
              }
              disabled={
                splitLoading ||
                splitPages.length === 0
              }
              className="mt-4 w-full bg-purple-600 text-white py-4 rounded-2xl"
            >
              {splitLoading
                ? 'Processando PDFs...'
                : 'Confirmar Divisão e Renomear'}
            </button>

            <div className="mt-6">

              <div className="flex justify-between mb-2">
                <span>Progresso</span>
                <span>
                  {splitProgress}%
                </span>
              </div>

              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-5 bg-purple-600"
                  style={{
                    width: `${splitProgress}%`,
                  }}
                />
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}