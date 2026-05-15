import { useState } from 'react'
import Tesseract from 'tesseract.js'
import JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export default function App() {
  const [activeTab, setActiveTab] =
    useState('individual')

  const [renameMode, setRenameMode] =
    useState('xml')

  const [splitMode, setSplitMode] =
    useState('xml')

  const [selectedFiles, setSelectedFiles] =
    useState([])

  const [processedFiles, setProcessedFiles] =
    useState([])

  const [splitPages, setSplitPages] =
    useState([])

  const [processing, setProcessing] =
    useState(false)

  const [progress, setProgress] =
    useState(0)

  const [splitLoading, setSplitLoading] =
    useState(false)

  const [splitProgress, setSplitProgress] =
    useState(0)

  // =========================================
  // EXTRAIR TEXTO PDF
  // =========================================

  const extractTextFromPdf = async (file) => {
    try {
      const arrayBuffer =
        await file.arrayBuffer()

      const pdf =
        await pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        }).promise

      let fullText = ''

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {
        const page =
          await pdf.getPage(i)

        // TEXTO NATIVO
        const textContent =
          await page.getTextContent()

        const nativeText =
          textContent.items
            .map((item) => item.str)
            .join(' ')

        fullText += ' ' + nativeText

        // OCR SOMENTE SE NECESSARIO
        if (nativeText.length < 20) {
          const viewport =
            page.getViewport({
              scale: 3,
            })

          const canvas =
            document.createElement(
              'canvas'
            )

          const context =
            canvas.getContext('2d')

          canvas.width =
            viewport.width

          canvas.height =
            viewport.height

          await page.render({
            canvasContext: context,
            viewport,
          }).promise

          const image =
            canvas.toDataURL(
              'image/png'
            )

          const result =
            await Tesseract.recognize(
              image,
              'por'
            )

          fullText +=
            ' ' +
            result.data.text
        }
      }

      return fullText
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } catch (error) {
      console.error(error)
      return ''
    }
  }

  // =========================================
  // XML + NFE
  // =========================================

  const extractXmlName =
    async (file) => {
      try {
        const text =
          await extractTextFromPdf(
            file
          )

        console.log(text)

        const keyMatch =
          text.match(
            /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/
          )

        let accessKey =
          'SEM_XML'

        if (keyMatch) {
          accessKey =
            keyMatch[0].replace(
              /\s/g,
              ''
            )
        }

        return `${accessKey}-NFE`
      } catch (error) {
        console.error(error)

        return 'SEM_XML-NFE'
      }
    }

  // =========================================
  // APENAS NFE
  // =========================================

  const extractOnlyNfe =
    async (file) => {
      try {
        const text =
          await extractTextFromPdf(
            file
          )

        console.log(text)

        const nfMatch =
          text.match(
            /N[º°o]?\s*([0-9.]+)/i
          )

        let nfNumber =
          'ERRO'

        if (nfMatch) {
          nfNumber =
            nfMatch[1]
              .replace(
                /\./g,
                ''
              )
              .replace(
                /^0+/,
                ''
              )
              .trim()
        }

        return `NFE${nfNumber}`
      } catch (error) {
        console.error(error)

        return 'NFE_ERRO'
      }
    }

  // =========================================
  // PROCESSAR INDIVIDUAL
  // =========================================

  const processFiles =
    async () => {
      try {
        if (
          !selectedFiles.length
        ) {
          alert(
            'Selecione PDFs.'
          )
          return
        }

        setProcessing(true)
        setProgress(0)

        const processed = []

        for (
          let i = 0;
          i < selectedFiles.length;
          i++
        ) {
          const file =
            selectedFiles[i]

          let newName = ''

          if (
            renameMode === 'xml'
          ) {
            newName =
              await extractXmlName(
                file
              )
          } else {
            newName =
              await extractOnlyNfe(
                file
              )
          }

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

          setProgress(percent)
        }

        setProcessedFiles(
          processed
        )

        setProcessing(false)
      } catch (error) {
        console.error(error)
        setProcessing(false)
      }
    }

  // =========================================
  // ZIP
  // =========================================

  const generateZip =
    async () => {
      const zip = new JSZip()

      for (const item of processedFiles) {
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
        URL.createObjectURL(
          content
        )

      const link =
        document.createElement(
          'a'
        )

      link.href = url

      link.download =
        'danfes.zip'

      document.body.appendChild(
        link
      )

      link.click()

      link.remove()

      URL.revokeObjectURL(url)
    }

  // =========================================
  // LIMPAR
  // =========================================

  const clearAll = () => {
    setSelectedFiles([])
    setProcessedFiles([])
    setProgress(0)
  }

  // =========================================
  // LOAD SPLIT
  // =========================================

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

  // =========================================
  // SPLIT
  // =========================================

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
              `pagina_${
                i + 1
              }.pdf`,
              {
                type:
                  'application/pdf',
              }
            )

          let autoName = ''

          if (
            splitMode === 'xml'
          ) {
            autoName =
              await extractXmlName(
                splitFile
              )
          } else {
            autoName =
              await extractOnlyNfe(
                splitFile
              )
          }

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

          setSplitProgress(
            percent
          )
        }

        const content =
          await zip.generateAsync({
            type: 'blob',
          })

        const url =
          URL.createObjectURL(
            content
          )

        const link =
          document.createElement(
            'a'
          )

        link.href = url

        link.download =
          'pdfs-divididos.zip'

        document.body.appendChild(
          link
        )

        link.click()

        link.remove()

        URL.revokeObjectURL(url)

        setSplitLoading(false)
      } catch (error) {
        console.error(error)
        setSplitLoading(false)
      }
    }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          Gerenciador DANFE
        </h1>

        {/* TABS */}

        <div className="flex gap-4 mb-8">

          <button
            onClick={() =>
              setActiveTab(
                'individual'
              )
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab ===
              'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Individual
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'split'
              )
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab ===
              'split'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Dividir PDFs
          </button>

        </div>

        {/* INDIVIDUAL */}

        {activeTab ===
          'individual' && (
          <>

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
              className="w-full border rounded-2xl p-4"
            />

            {/* CHECKBOX */}

            <div className="mt-6 flex gap-8">

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  checked={
                    renameMode ===
                    'xml'
                  }
                  onChange={() =>
                    setRenameMode(
                      'xml'
                    )
                  }
                />

                XML + NFE
              </label>

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  checked={
                    renameMode ===
                    'nfe'
                  }
                  onChange={() =>
                    setRenameMode(
                      'nfe'
                    )
                  }
                />

                Apenas NFE
              </label>

            </div>

            {/* BOTOES */}

            <div className="flex gap-4 mt-6">

              <button
                onClick={
                  processFiles
                }
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl"
              >
                Processar
              </button>

              <button
                onClick={clearAll}
                className="flex-1 bg-red-600 text-white py-4 rounded-2xl"
              >
                Limpar
              </button>

            </div>

            {/* PROGRESS */}

            {processing && (
              <div className="mt-6">

                <div className="flex justify-between mb-2">
                  <span>
                    Processando
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">

                  <div
                    className="h-5 bg-green-600"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

              </div>
            )}

            {/* RESULTADOS */}

            <div className="space-y-4 mt-8">

              {processedFiles.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={index}
                    className="border rounded-2xl p-4"
                  >
                    <div>
                      {
                        item.file
                          .name
                      }
                    </div>

                    <div className="text-blue-700 break-all">
                      {
                        item.newName
                      }
                      .pdf
                    </div>
                  </div>
                )
              )}

            </div>

            {/* ZIP */}

            {processedFiles.length >
              0 && (
              <button
                onClick={
                  generateZip
                }
                className="mt-6 w-full bg-green-600 text-white py-4 rounded-2xl"
              >
                Gerar ZIP
              </button>
            )}

          </>
        )}

        {/* SPLIT */}

        {activeTab ===
          'split' && (
          <div>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                loadPdfForSplit(
                  e.target
                    .files[0]
                )
              }
              className="w-full border rounded-2xl p-4"
            />

            {/* CHECKBOX */}

            <div className="mt-6 flex gap-8">

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  checked={
                    splitMode ===
                    'xml'
                  }
                  onChange={() =>
                    setSplitMode(
                      'xml'
                    )
                  }
                />

                PDF + XML
              </label>

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  checked={
                    splitMode ===
                    'nfe'
                  }
                  onChange={() =>
                    setSplitMode(
                      'nfe'
                    )
                  }
                />

                PDF + NFE
              </label>

            </div>

            <button
              onClick={
                generateSplitZip
              }
              disabled={
                splitLoading ||
                splitPages.length ===
                  0
              }
              className="mt-6 w-full bg-purple-600 text-white py-4 rounded-2xl"
            >
              {splitLoading
                ? 'Dividindo PDFs...'
                : 'Confirmar Divisão'}
            </button>

            {/* PROGRESS */}

            <div className="mt-6">

              <div className="flex justify-between mb-2">
                <span>
                  Progresso
                </span>

                <span>
                  {
                    splitProgress
                  }
                  %
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