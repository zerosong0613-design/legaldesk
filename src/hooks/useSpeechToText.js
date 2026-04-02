import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

/**
 * Web Speech API 기반 음성 → 텍스트 변환 훅
 * @param {object} options
 * @param {string} options.lang - 인식 언어 (기본: 'ko-KR')
 * @param {boolean} options.continuous - 연속 인식 (기본: true)
 * @param {function} options.onResult - 인식 결과 콜백 (transcript) => void
 */
export default function useSpeechToText({
  lang = 'ko-KR',
  continuous = true,
  onResult,
} = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(!!SpeechRecognition)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return

    // 기존 인스턴스 정리
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript && onResultRef.current) {
        onResultRef.current(finalTranscript)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      // continuous 모드에서 자동 재시작
      if (recognitionRef.current && isListening) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [lang, continuous, isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggle,
  }
}
