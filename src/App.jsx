import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import GIF from 'gif.js'
import APNG, { Frame } from 'apng-fest'
import { FFmpeg } from '@ffmpeg/ffmpeg'

import './App.css'

async function saveFile(blob, filename) {
  console.log('saveFile called with filename:', filename, 'blob size:', blob.size)
  
  try {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      console.log('Tauri detected, trying Tauri save method')
      try {
        const { downloadDir } = await import('@tauri-apps/api/path')
        const downloadPath = await downloadDir()
        console.log('Download directory:', downloadPath)
        
        const filePath = downloadPath + '/' + filename
        console.log('Full file path:', filePath)
        
        const { writeBinaryFile } = await import('@tauri-apps/plugin-fs')
        console.log('fs import successful')
        
        const arrayBuffer = await blob.arrayBuffer()
        console.log('arrayBuffer created, size:', arrayBuffer.byteLength)
        
        await writeBinaryFile(filePath, new Uint8Array(arrayBuffer))
        console.log('File saved successfully via Tauri to download directory')
        return true
      } catch (pluginError) {
        console.error('Tauri plugin error:', pluginError)
      }
    }
  } catch (tauriError) {
    console.error('Tauri save failed, falling back to web method:', tauriError)
  }
  
  console.log('Using web download method')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.log('Web download completed')
  return true
}

function App() {
  const [spriteImage, setSpriteImage] = useState(null)
  const [spriteWidth, setSpriteWidth] = useState(0)
  const [spriteHeight, setSpriteHeight] = useState(0)
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(1)
  const [totalFrames, setTotalFrames] = useState(1)
  const [frameWidth, setFrameWidth] = useState(0)
  const [frameHeight, setFrameHeight] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fps, setFps] = useState(10)
  const [isExporting, setIsExporting] = useState(false)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const gifRef = useRef(null)

  const calculateFrameDimensions = useCallback(() => {
    if (spriteWidth > 0 && spriteHeight > 0 && rows > 0 && cols > 0) {
      const newFrameWidth = spriteWidth / cols
      const newFrameHeight = spriteHeight / rows
      setFrameWidth(newFrameWidth)
      setFrameHeight(newFrameHeight)
      setTotalFrames(rows * cols)
    }
  }, [spriteWidth, spriteHeight, rows, cols])

  useEffect(() => {
    calculateFrameDimensions()
  }, [calculateFrameDimensions])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setSpriteImage(event.target.result)
          setSpriteWidth(img.width)
          setSpriteHeight(img.height)
          setCurrentFrame(0)
          setIsPlaying(false)
          calculateFrameDimensions()
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    if (spriteImage && canvasRef.current && frameWidth > 0 && frameHeight > 0) {
      renderFrame(currentFrame)
    }
  }, [spriteImage, currentFrame, frameWidth, frameHeight])

  const renderFrame = (frameIndex) => {
    if (!spriteImage || !canvasRef.current || frameWidth <= 0 || frameHeight <= 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const row = Math.floor(frameIndex / cols)
      const col = frameIndex % cols
      const sx = col * frameWidth
      const sy = row * frameHeight

      canvas.width = frameWidth
      canvas.height = frameHeight

      ctx.drawImage(
        img,
        sx,
        sy,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
      )
    }
    img.src = spriteImage
  }

  useEffect(() => {
    if (isPlaying && totalFrames > 1) {
      const interval = 1000 / fps
      animationRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % totalFrames)
      }, interval)
    }
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isPlaying, totalFrames, fps])

  const exportGif = async () => {
    if (!spriteImage || totalFrames <= 0) return

    setIsExporting(true)

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: frameWidth,
        height: frameHeight,
        workerScript: './gif.worker.js'
      })

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frameWidth
      tempCanvas.height = frameHeight
      const tempCtx = tempCanvas.getContext('2d')

      const img = new Image()
      img.src = spriteImage

      await new Promise(resolve => {
        img.onload = resolve
      })

      for (let i = 0; i < totalFrames; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const sx = col * frameWidth
        const sy = row * frameHeight

        tempCtx.clearRect(0, 0, frameWidth, frameHeight)
        tempCtx.drawImage(
          img,
          sx,
          sy,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        )

        gif.addFrame(tempCtx, { copy: true, delay: 1000 / fps })
      }

      gif.on('finished', async (blob) => {
        await saveFile(blob, 'sprite-animation.gif')
        setIsExporting(false)
      })

      gif.render()
    } catch (error) {
      console.error('GIF export error:', error)
      alert('GIF导出失败')
      setIsExporting(false)
    }
  }

  const exportApng = async () => {
    if (!spriteImage) {
      alert('请先上传Sprite图片')
      return
    }

    if (frameWidth <= 0 || frameHeight <= 0) {
      alert('帧尺寸无效，请先上传Sprite图片或设置正确的帧尺寸')
      return
    }

    setIsExporting(true)

    try {
      console.log('APNG export started')
      console.log('frameWidth:', frameWidth, 'frameHeight:', frameHeight)
      console.log('totalFrames:', totalFrames, 'cols:', cols, 'rows:', rows)
      console.log('fps:', fps)

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frameWidth
      tempCanvas.height = frameHeight
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = spriteImage

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      console.log('Image loaded successfully')

      const apng = await APNG.create(frameWidth, frameHeight, 'sprite-animation')
      apng.numOfLoops = 0

      const frameDelay = 1 / fps
      console.log('Frame delay (seconds):', frameDelay)

      for (let i = 0; i < totalFrames; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const sx = col * frameWidth
        const sy = row * frameHeight

        tempCtx.clearRect(0, 0, frameWidth, frameHeight)
        tempCtx.drawImage(
          img,
          sx,
          sy,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        )

        const frame = Frame.fromCtx(tempCtx, { 
          delay: frameDelay,
          width: frameWidth,
          height: frameHeight,
          top: 0,
          left: 0
        })
        apng.frames.push(frame)
      }

      console.log('Frames added:', apng.frames.length)

      const blob = await apng.toBlob()
      console.log('APNG blob created, size:', blob.size)
      
      await saveFile(blob, 'sprite-animation.png')
      setIsExporting(false)
      console.log('APNG export completed successfully')
    } catch (error) {
      console.error('APNG export error:', error)
      console.error('Error stack:', error.stack)
      alert(`APNG导出失败: ${error.message}`)
      setIsExporting(false)
    }
  }

  const exportWebP = async () => {
    if (!spriteImage) {
      alert('请先上传Sprite图片')
      return
    }

    if (frameWidth <= 0 || frameHeight <= 0) {
      alert('帧尺寸无效，请先上传Sprite图片或设置正确的帧尺寸')
      return
    }

    setIsExporting(true)

    try {
      console.log('WebP export started')
      console.log('frameWidth:', frameWidth, 'frameHeight:', frameHeight)
      console.log('totalFrames:', totalFrames, 'cols:', cols, 'rows:', rows)

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frameWidth
      tempCanvas.height = frameHeight
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = spriteImage

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      console.log('Image loaded successfully')
      console.log('Initializing FFmpeg...')
      
      const loadingDiv = document.createElement('div')
      loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `
      loadingDiv.innerHTML = `
        <div style="font-size: 20px; margin-bottom: 24px; font-weight: 500;">正在加载FFmpeg...</div>
        <div style="width: 400px; max-width: 90%;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
            <span>加载进度</span>
            <span id="ffmpeg-percent">0%</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
            <div id="ffmpeg-progress" style="height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); width: 0%; transition: width 0.1s ease;"></div>
          </div>
          <div id="ffmpeg-status" style="margin-top: 12px; font-size: 13px; color: rgba(255,255,255,0.8); text-align: center;">准备加载...</div>
        </div>
      `
      document.body.appendChild(loadingDiv)
      
      const progressBar = document.getElementById('ffmpeg-progress')
      const percentText = document.getElementById('ffmpeg-percent')
      const statusText = document.getElementById('ffmpeg-status')
      
      let progressInterval = setInterval(() => {
        const currentWidth = parseFloat(progressBar.style.width) || 0
        if (currentWidth < 90) {
          progressBar.style.width = `${Math.min(currentWidth + 2, 90)}%`
          percentText.textContent = `${Math.round(Math.min(currentWidth + 2, 90))}%`
        }
      }, 200)
      
      statusText.textContent = '加载核心模块...'
      
      const ffmpeg = new FFmpeg()
      
      const corePath = `${window.location.origin}/ffmpeg/ffmpeg-core.js`
      console.log('FFmpeg core path:', corePath)
      
      const loadPromise = ffmpeg.load({
        corePath: corePath
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('FFmpeg加载超时，请检查网络连接或刷新页面重试'))
        }, 60000)
      })
      
      await Promise.race([loadPromise, timeoutPromise])
      
      clearInterval(progressInterval)
      progressBar.style.width = '100%'
      percentText.textContent = '100%'
      statusText.textContent = '初始化完成...'
      
      setTimeout(() => {
        document.body.removeChild(loadingDiv)
      }, 300)

      console.log('FFmpeg initialized')
      console.log('Creating frames...')

      for (let i = 0; i < totalFrames; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const sx = col * frameWidth
        const sy = row * frameHeight

        tempCtx.clearRect(0, 0, frameWidth, frameHeight)
        tempCtx.drawImage(
          img,
          sx,
          sy,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        )

        const blob = await new Promise((resolve) => {
          tempCanvas.toBlob(resolve, 'image/png')
        })
        const arrayBuffer = await blob.arrayBuffer()
        await ffmpeg.writeFile(`frame_${String(i).padStart(4, '0')}.png`, new Uint8Array(arrayBuffer))
      }

      console.log('Frames written:', totalFrames)
      console.log('Encoding animated WebP...')

      await ffmpeg.exec([
        '-framerate', fps.toString(),
        '-i', 'frame_%04d.png',
        '-c:v', 'libwebp',
        '-lossless', '1',
        '-loop', '0',
        '-preset', 'default',
        'output.webp'
      ])

      console.log('WebP encoding completed')

      const data = await ffmpeg.readFile('output.webp')
      console.log('WebP data created, size:', data.length)

      const blob = new Blob([data], { type: 'image/webp' })
      await saveFile(blob, 'sprite-animation.webp')

      await ffmpeg.terminate()

      setIsExporting(false)
      console.log('WebP export completed successfully')
    } catch (error) {
      console.error('WebP export error:', error)
      console.error('Error stack:', error.stack)
      alert(`WebP导出失败: ${error.message}`)
      setIsExporting(false)
    }
  }

  async function createAnimatedWebP(imageDataFrames, delay) {
    const width = imageDataFrames[0].width
    const height = imageDataFrames[0].height
    
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    const vp8Chunks = []
    
    for (let i = 0; i < imageDataFrames.length; i++) {
      ctx.putImageData(imageDataFrames[i], 0, 0)
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.9)
      })
      
      console.log(`Frame ${i}: blob type=${blob.type}, size=${blob.size}`)
      
      const arrayBuffer = await blob.arrayBuffer()
      const webpData = new Uint8Array(arrayBuffer)
      
      if (webpData.length < 12) {
        console.log('WebP data too small, trying PNG fallback')
        const pngBlob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png')
        })
        const pngBuffer = await pngBlob.arrayBuffer()
        const pngData = new Uint8Array(pngBuffer)
        const webpDataFromPng = await pngToWebP(pngData, width, height)
        if (!webpDataFromPng) {
          throw new Error('无法将PNG转换为WebP')
        }
        const vp8Chunk = extractVP8Data(webpDataFromPng)
        if (!vp8Chunk) {
          throw new Error('无法提取VP8数据')
        }
        vp8Chunks.push(vp8Chunk)
        continue
      }
      
      const vp8Chunk = extractVP8Data(webpData)
      if (!vp8Chunk) {
        console.log('VP8 chunk not found in WebP data, trying PNG fallback')
        const pngBlob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png')
        })
        const pngBuffer = await pngBlob.arrayBuffer()
        const pngData = new Uint8Array(pngBuffer)
        const webpDataFromPng = await pngToWebP(pngData, width, height)
        if (!webpDataFromPng) {
          throw new Error('无法将PNG转换为WebP')
        }
        const vp8ChunkFromPng = extractVP8Data(webpDataFromPng)
        if (!vp8ChunkFromPng) {
          throw new Error('无法提取VP8数据')
        }
        vp8Chunks.push(vp8ChunkFromPng)
        continue
      }
      vp8Chunks.push(vp8Chunk)
    }
    
    const chunks = []
    
    const vp8xChunk = new Uint8Array(20)
    const vp8xView = new DataView(vp8xChunk.buffer)
    vp8xChunk.set([0x56, 0x50, 0x38, 0x41], 0)
    vp8xView.setUint32(4, 12)
    vp8xView.setUint8(8, 1)
    vp8xView.setUint8(9, 0)
    vp8xView.setUint8(10, 0)
    vp8xView.setUint8(11, 0)
    vp8xView.setUint32(12, width)
    vp8xView.setUint32(16, height)
    chunks.push(vp8xChunk)

    const animChunk = new Uint8Array(26)
    const animView = new DataView(animChunk.buffer)
    animChunk.set([0x41, 0x4E, 0x49, 0x4D], 0)
    animView.setUint32(4, 18)
    animView.setUint32(8, width)
    animView.setUint32(12, height)
    animView.setUint32(16, 0)
    animView.setUint8(20, 255)
    animView.setUint8(21, 255)
    animView.setUint8(22, 255)
    animView.setUint8(23, 255)
    animView.setUint16(24, 0)
    chunks.push(animChunk)

    for (let i = 0; i < vp8Chunks.length; i++) {
      const vp8Data = vp8Chunks[i]
      
      const frameChunkSize = 30 + vp8Data.length
      const frameChunk = new Uint8Array(frameChunkSize)
      const frameView = new DataView(frameChunk.buffer)
      frameChunk.set([0x41, 0x4E, 0x4D, 0x46], 0)
      frameView.setUint32(4, frameChunkSize - 8)
      frameView.setUint32(8, 0)
      frameView.setUint32(12, 0)
      frameView.setUint32(16, width)
      frameView.setUint32(20, height)
      frameView.setUint16(24, delay)
      frameView.setUint8(26, 0)
      frameView.setUint8(27, 0)
      frameView.setUint8(28, i === vp8Chunks.length - 1 ? 1 : 0)
      frameView.setUint8(29, 0)
      frameChunk.set(vp8Data, 30)
      chunks.push(frameChunk)
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0) + 16
    const finalBuffer = new Uint8Array(totalSize)
    const finalView = new DataView(finalBuffer.buffer)

    finalBuffer.set([0x52, 0x49, 0x46, 0x46], 0)
    finalView.setUint32(4, totalSize - 8)
    finalBuffer.set([0x57, 0x45, 0x42, 0x50], 8)

    let offset = 12
    for (const chunk of chunks) {
      if (offset + chunk.length > finalBuffer.length) {
        throw new Error('Buffer overflow when writing chunk')
      }
      finalBuffer.set(chunk, offset)
      offset += chunk.length
    }

    return finalBuffer
  }

  async function pngToWebP(pngData, width, height) {
    const pngUrl = URL.createObjectURL(new Blob([pngData], { type: 'image/png' }))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = pngUrl
    })
    
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.9)
    })
    
    URL.revokeObjectURL(pngUrl)
    
    const arrayBuffer = await blob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  function extractVP8Data(webpData) {
    if (!webpData || webpData.length < 20) {
      console.log('WebP data too small:', webpData ? webpData.length : 0)
      return null
    }
    
    console.log('WebP data length:', webpData.length)
    console.log('First 32 bytes:', Array.from(webpData.slice(0, Math.min(32, webpData.length))).map(b => b.toString(16).padStart(2, '0')).join(' '))
    
    const view = new DataView(webpData.buffer, webpData.byteOffset, webpData.byteLength)
    
    const magic = view.getUint32(0)
    const type = view.getUint32(8)
    
    console.log('Magic:', magic.toString(16), '(expected 52494646)')
    console.log('Type:', type.toString(16), '(expected 57454250)')
    
    if (magic !== 0x52494646) {
      console.log('Not a RIFF file')
      return null
    }
    if (type !== 0x57454250) {
      console.log('Not a WEBP file')
      return null
    }
    
    let offset = 12
    while (offset + 8 <= webpData.length) {
      const chunkType = view.getUint32(offset)
      const chunkSize = view.getUint32(offset + 4)
      
      const chunkTypeName = String.fromCharCode(
        (chunkType >> 24) & 0xFF,
        (chunkType >> 16) & 0xFF,
        (chunkType >> 8) & 0xFF,
        chunkType & 0xFF
      )
      
      console.log(`Found chunk: ${chunkTypeName} (0x${chunkType.toString(16)}), size: ${chunkSize}, offset: ${offset}`)
      
      if (chunkType === 0x56503820 || chunkType === 0x5650384C) {
        const endOffset = offset + 8 + chunkSize
        if (endOffset <= webpData.length) {
          console.log('Found VP8 chunk, returning data')
          return webpData.slice(offset, endOffset)
        }
        return null
      }
      
      offset += 8 + chunkSize
      if (offset % 2 !== 0) offset++
    }
    
    console.log('No VP8 chunk found')
    return null
  }

  

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Sprite动画预览工具</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>参数设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">上传Sprite图片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full p-3 border-2 border-dashed border-gray-300 border-gray-200 rounded-lg bg-gray-50 bg-gray-50 hover:border-blue-500 hover:border-blue-500 transition-all cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">Sprite宽度</label>
                  <Input
                    type="number"
                    value={spriteWidth}
                    onChange={(e) => setSpriteWidth(parseInt(e.target.value) || 0)}
                    disabled
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">Sprite高度</label>
                  <Input
                    type="number"
                    value={spriteHeight}
                    onChange={(e) => setSpriteHeight(parseInt(e.target.value) || 0)}
                    disabled
                    className="w-full"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 border-gray-200 pt-6">
                <h3 className="text-sm font-semibold mb-4 text-gray-700 text-gray-700">布局设置</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 text-gray-700">行数</label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={rows}
                      onChange={(e) => setRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} 
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 text-gray-700">列数</label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={cols}
                      onChange={(e) => setCols(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} 
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">帧宽度</label>
                  <Input
                    type="number"
                    value={Math.round(frameWidth)}
                    onChange={(e) => setFrameWidth(parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">帧高度</label>
                  <Input
                    type="number"
                    value={Math.round(frameHeight)}
                    onChange={(e) => setFrameHeight(parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">总帧数</label>
                  <div className="text-2xl font-bold text-blue-600 text-blue-600">{totalFrames}</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 text-gray-700">FPS</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={fps}
                    onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))} 
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!spriteImage || totalFrames <= 1}
                  className="flex-1"
                >
                  {isPlaying ? '暂停' : '播放'}
                </Button>
                <Button
                  onClick={() => {
                    setCurrentFrame(0)
                    setIsPlaying(false)
                  }}
                  disabled={!spriteImage}
                  variant="outline"
                  className="flex-1"
                >
                  重置
                </Button>
              </div>

              <div className="border-t border-gray-200 border-gray-200 pt-6">
                <p className="text-sm text-gray-500 mb-3">导出的动画文件将自动保存到系统的下载目录</p>
                <label className="block text-sm font-semibold mb-3 text-gray-700 text-gray-700">导出动画格式</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={exportGif}
                    disabled={!spriteImage || isExporting}
                    variant="outline"
                  >
                    {isExporting ? '导出中...' : 'GIF'}
                  </Button>
                  <Button
                    onClick={exportApng}
                    disabled={!spriteImage || isExporting}
                    variant="outline"
                  >
                    {isExporting ? '导出中...' : 'APNG'}
                  </Button>
                  <Button
                    onClick={exportWebP}
                    disabled={!spriteImage || isExporting}
                    variant="outline"
                  >
                    {isExporting ? '导出中...' : 'WebP'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>动画预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center min-h-[400px] border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {spriteImage ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <div className="text-6xl mb-4">🖼️</div>
                    <p className="text-lg mb-2">请上传Sprite图片</p>
                    <p className="text-sm">支持 PNG, JPG, WebP 等格式</p>
                  </div>
                )}
              </div>

              {spriteImage && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      当前帧: <span className="text-xl font-bold text-blue-600">{currentFrame + 1}</span> / {totalFrames}
                    </span>
                    <span className="text-sm text-gray-500">
                      {(1000 / fps).toFixed(0)}ms/帧
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center p-4 bg-gray-50 rounded-lg">
                    {Array.from({ length: Math.min(totalFrames, 20) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentFrame(idx)
                          setIsPlaying(false)
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                          currentFrame === idx
                            ? 'bg-blue-600 text-white shadow-lg scale-110'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    {totalFrames > 20 && (
                      <span className="text-xs text-gray-500 text-gray-500 self-center ml-2">+{totalFrames - 20}帧</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App