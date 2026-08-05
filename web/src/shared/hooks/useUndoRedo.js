import { useCallback, useRef } from 'react'
import { App } from 'antd'

export default function useUndoRedo(options = {}) {
  const { showMessages = true } = options
  const { message } = App.useApp()
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)

  const pushHistory = useCallback((newData) => {
    if (!historyRef.current) {
      historyRef.current = []
    }
    const next = historyIndexRef.current + 1
    historyRef.current = historyRef.current.slice(0, next)
    historyRef.current.push(JSON.parse(JSON.stringify(newData)))
    historyIndexRef.current = next
  }, [])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return null
    historyIndexRef.current -= 1
    const entry = historyRef.current[historyIndexRef.current]
    if (showMessages) message.success('Undo successful')
    return JSON.parse(JSON.stringify(entry))
  }, [message, showMessages])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return null
    historyIndexRef.current += 1
    const entry = historyRef.current[historyIndexRef.current]
    if (showMessages) message.success('Redo successful')
    return JSON.parse(JSON.stringify(entry))
  }, [message, showMessages])

  const resetHistory = useCallback((newData) => {
    historyRef.current = [JSON.parse(JSON.stringify(newData))]
    historyIndexRef.current = 0
  }, [])

  const canUndo = useCallback(() => historyIndexRef.current > 0, [])
  const canRedo = useCallback(() => historyRef.current && historyIndexRef.current < historyRef.current.length - 1, [])

  return {
    undo,
    redo,
    resetHistory,
    pushHistory,
    canUndo,
    canRedo,
  }
}
