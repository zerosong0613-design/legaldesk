import { create } from 'zustand'

export const useUiStore = create((set) => ({
  // 사건 필터
  statusFilter: null, // null = 전체, '접수' | '진행' | '종결' | '보류'
  searchQuery: '',

  // 모달
  isModalOpen: false,
  modalType: null, // 'createCase' | 'editCase' | 'deleteConfirm'
  modalData: null,

  // 토스트
  toast: null,

  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  openModal: (type, data = null) =>
    set({ isModalOpen: true, modalType: type, modalData: data }),

  closeModal: () =>
    set({ isModalOpen: false, modalType: null, modalData: null }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
