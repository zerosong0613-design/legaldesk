import { create } from 'zustand'

function loadFavorites() {
  try {
    const raw = localStorage.getItem('gd_favorites')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadViewMode() {
  try {
    return localStorage.getItem('gd_view_mode') || 'card'
  } catch {
    return 'card'
  }
}

export const useUiStore = create((set, get) => ({
  // 대시보드 탭
  dashboardTab: 'cases', // 'cases' | 'consultations'

  // 사건 필터
  statusFilter: null, // null = 전체, '접수' | '진행' | '종결' | '보류'
  searchQuery: '',

  // 뷰 모드
  viewMode: loadViewMode(), // 'card' | 'table'

  // 즐겨찾기 (id 배열)
  favorites: loadFavorites(),

  // 모달
  isModalOpen: false,
  modalType: null, // 'createCase' | 'editCase' | 'deleteConfirm'
  modalData: null,

  // 토스트
  toast: null,

  setDashboardTab: (tab) => set({ dashboardTab: tab, statusFilter: null, searchQuery: '' }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  setViewMode: (mode) => {
    localStorage.setItem('gd_view_mode', mode)
    set({ viewMode: mode })
  },

  toggleFavorite: (id) => {
    const { favorites } = get()
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id]
    localStorage.setItem('gd_favorites', JSON.stringify(next))
    set({ favorites: next })
  },

  isFavorite: (id) => get().favorites.includes(id),

  openModal: (type, data = null) =>
    set({ isModalOpen: true, modalType: type, modalData: data }),

  closeModal: () =>
    set({ isModalOpen: false, modalType: null, modalData: null }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
