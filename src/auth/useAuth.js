import { create } from 'zustand'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/callback`
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'

// PKCE helpers
function generateRandomString(length) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('gd_access_token')
    const expiry = localStorage.getItem('gd_token_expiry')
    const userJson = localStorage.getItem('gd_user')

    if (!token || !expiry) {
      set({ isLoading: false })
      return
    }

    if (Date.now() > Number(expiry) - 60000) {
      // Token expired, try refresh
      const refreshed = await get().refreshToken()
      if (!refreshed) {
        get().logout()
        return
      }
    }

    const user = userJson ? JSON.parse(userJson) : null
    set({
      accessToken: token,
      user,
      isLoading: false,
    })
  },

  startLogin: async () => {
    const codeVerifier = generateRandomString(64)
    sessionStorage.setItem('pkce_code_verifier', codeVerifier)

    const codeChallenge = await generateCodeChallenge(codeVerifier)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    })

    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`
  },

  handleCallback: async (code) => {
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
    if (!codeVerifier) {
      set({ error: '인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.', isLoading: false })
      return false
    }

    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      })

      const data = await res.json()

      if (data.error) {
        set({ error: `로그인 실패: ${data.error_description || data.error}`, isLoading: false })
        return false
      }

      const expiresAt = Date.now() + data.expires_in * 1000

      localStorage.setItem('gd_access_token', data.access_token)
      localStorage.setItem('gd_token_expiry', String(expiresAt))

      if (data.refresh_token) {
        localStorage.setItem('gd_refresh_token', data.refresh_token)
      }

      sessionStorage.removeItem('pkce_code_verifier')

      // Fetch user info
      const userRes = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const user = await userRes.json()
      localStorage.setItem('gd_user', JSON.stringify(user))

      set({
        accessToken: data.access_token,
        user,
        isLoading: false,
        error: null,
      })

      return true
    } catch (err) {
      set({ error: '로그인 처리 중 오류가 발생했습니다.', isLoading: false })
      return false
    }
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('gd_refresh_token')
    if (!refreshToken) return false

    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })

      const data = await res.json()
      if (data.error) return false

      const expiresAt = Date.now() + data.expires_in * 1000
      localStorage.setItem('gd_access_token', data.access_token)
      localStorage.setItem('gd_token_expiry', String(expiresAt))

      set({ accessToken: data.access_token })
      return true
    } catch {
      return false
    }
  },

  getValidToken: async () => {
    const expiry = localStorage.getItem('gd_token_expiry')
    if (Date.now() > Number(expiry) - 60000) {
      const refreshed = await get().refreshToken()
      if (!refreshed) {
        get().logout()
        return null
      }
    }
    return localStorage.getItem('gd_access_token')
  },

  logout: () => {
    localStorage.removeItem('gd_access_token')
    localStorage.removeItem('gd_token_expiry')
    localStorage.removeItem('gd_refresh_token')
    localStorage.removeItem('gd_user')
    set({ user: null, accessToken: null, isLoading: false, error: null })
  },
}))
