import { useState } from 'react'
import Tesseract from 'tesseract.js'
import JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export default function App() {
  const [activeTab, setActiveTab] =
    useState('rename')

  const [selectedFiles, setSelectedFiles] =
    useState([])

  const [renamedFiles, setRenamedFiles] =
    useState([])

  const [nfeFiles, setNfeFiles] =
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

  // SPLIT MODE
  // key = CHAVE-NFE
  // nfe = SOMENTE NFE

  const [splitMode, setSplitMode] =
    useState('key')

  // =========================================
  // OCR
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

        const pageText =
          textContent.items
            .map((item) => item.str)
            .join(' ')

        fullText += ' ' + pageText

        // OCR SE NECESSARIO
        if (pageText.length < 30) {
          const viewport =
            page.getViewport({
              scale: 4,
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

          const imageData =
            context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            )

          const data =
            imageData.data

          for (
            let p = 0;
            p < data.length;
            p += 4
          ) {
            const avg =
              (data[p] +
                data[p + 1] +
                data[p + 2]) /
              3

            const value =
              avg > 160
                ? 255
                : 0

            data[p] = value
            data[p + 1] = value
            data[p + 2] = value
          }

          context.putImageData(
            imageData,
            0,
            0
          )

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
  // CHAVE + NFE
  // =========================================

  const extractKeyName =
    async (file) => {
      try {
        const text =
          await extractTextFromPdf(
            file
          )

        const keyMatch =
          text.match(
            /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/
          )

        let accessKey =
          'SEM_CHAVE'

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

        return 'SEM_CHAVE-NFE'
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

        const nfMatch =
          text.match(
            /N[º°o]?\s*([0-9.]+)/i
          )

        let nfNumber =
          'SEM_NF'

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
  // PROCESSAR CHAVE
  // =========================================

  const processRename =
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

          const newName =
            await extractKeyName(
              file
            )

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

        setRenamedFiles(
          processed
        )

        setProcessing(false)
      } catch (error) {
        console.error(error)
        setProcessing(false)
      }
    }

  // =========================================
  // PROCESSAR NFE
  // =========================================

  const processOnlyNfe =
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

          const newName =
            await extractOnlyNfe(
              file
            )

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

        setNfeFiles(processed)

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
    async (
      files,
      zipName
    ) => {
      const zip = new JSZip()

      for (const item of files) {
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
      link.download = zipName

      document.body.appendChild(
        link
      )

      link.click()

      link.remove()

      URL.revokeObjectURL(url)
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
  // SPLIT ZIP
  // =========================================

  const generateSplitZip =
    async () => {
      try {
        if (!splitPages.length) {
          alert(
            'Nenhuma página.'
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
            splitMode === 'key'
          ) {
            autoName =
              await extractKeyName(
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

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          Gerenciador DANFE
        </h1>

        <div className="flex gap-4 mb-8 flex-wrap">

          <button
            onClick={() =>
              setActiveTab(
                'rename'
              )
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab ===
              'rename'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Chave + NFE
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'onlynfe'
              )
            }
            className={`px-6 py-3 rounded-2xl ${
              activeTab ===
              'onlynfe'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Apenas NFE
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

        {/* ===================== */}
        {/* RENAME */}
        {/* ===================== */}

        {(activeTab ===
          'rename' ||
          activeTab ===
            'onlynfe') && (
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

            {activeTab ===
              'rename' && (
              <button
                onClick={
                  processRename
                }
                className="mt-4 w-full bg-blue-600 text-white py-4 rounded-2xl"
              >
                Processar
              </button>
            )}

            {activeTab ===
              'onlynfe' && (
              <button
                onClick={
                  processOnlyNfe
                }
                className="mt-4 w-full bg-orange-600 text-white py-4 rounded-2xl"
              >
                Processar NFE
              </button>
            )}

          </>
        )}

        {/* ===================== */}
        {/* PROGRESS */}
        {/* ===================== */}

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

        {/* ===================== */}
        {/* RESULTS */}
        {/* ===================== */}

        <div className="space-y-4 mt-8">

          {activeTab ===
            'rename' &&
            renamedFiles.map(
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

          {activeTab ===
            'onlynfe' &&
            nfeFiles.map(
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

                  <div className="text-orange-700 break-all">
                    {
                      item.newName
                    }
                    .pdf
                  </div>
                </div>
              )
            )}

        </div>

        {/* ===================== */}
        {/* ZIP */}
        {/* ===================== */}

        {activeTab ===
          'rename' &&
          renamedFiles.length >
            0 && (
            <button
              onClick={() =>
                generateZip(
                  renamedFiles,
                  'danfes.zip'
                )
              }
              className="mt-6 w-full bg-green-600 text-white py-4 rounded-2xl"
            >
              Gerar ZIP
            </button>
          )}

        {activeTab ===
          'onlynfe' &&
          nfeFiles.length >
            0 && (
            <button
              onClick={() =>
                generateZip(
                  nfeFiles,
                  'nfe.zip'
                )
              }
              className="mt-6 w-full bg-green-600 text-white py-4 rounded-2xl"
            >
              Gerar ZIP NFE
            </button>
          )}

        {/* ===================== */}
        {/* SPLIT */}
        {/* ===================== */}

        {activeTab ===
          'split' && (
          <div className="mt-10 border-t pt-8">

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
                    'key'
                  }
                  onChange={() =>
                    setSplitMode(
                      'key'
                    )
                  }
                />

                PDF + Chave
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