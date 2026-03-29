import { create } from 'zustand'
import {
  initializeDriveStructure,
  connectToExistingStructure,
  readCasesIndex,
  writeCasesIndex,
  readCaseDetail,
  writeCaseDetail,
  createCaseFile,
  createCaseFilesFolder,
  deleteFile,
} from '../api/drive'
import { useScheduleStore } from './scheduleStore'

function loadWorkspaceConfig() {
  try {
    const raw = localStorage.getItem('gd_workspace')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveWorkspaceConfig(config) {
  localStorage.setItem('gd_workspace', JSON.stringify(config))
}

export const useCaseStore = create((set, get) => ({
  cases: [],
  consultations: [],
  currentCase: null,
  driveRootId: null,
  dataFolderId: null,
  casesFolderId: null,
  consultationsFolderId: null,
  filesFolderId: null,
  casesFileId: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  workspace: loadWorkspaceConfig(),

  // Drive \uD3F4\uB354 \uAD6C\uC870 \uCD08\uAE30\uD654
  initDrive: async () => {
    set({ isLoading: true, error: null })
    try {
      const ws = get().workspace

      let structure
      if (ws?.type === 'shared' && ws.rootId) {
        // \uACF5\uC720 \uC791\uC5C5\uACF5\uAC04: \uAE30\uC874 \uAD6C\uC870\uC5D0 \uC5F0\uACB0
        structure = await connectToExistingStructure(ws.rootId)
      } else {
        // \uB0B4 \uC791\uC5C5\uACF5\uAC04: \uAE30\uC874\uCC98\uB7FC \uC0DD\uC131/\uC5F0\uACB0
        structure = await initializeDriveStructure()
        if (!ws) {
          const config = { type: 'own', rootId: structure.rootId, label: '\uB0B4 \uC791\uC5C5\uACF5\uAC04' }
          saveWorkspaceConfig(config)
          set({ workspace: config })
        }
      }

      set({
        driveRootId: structure.rootId,
        dataFolderId: structure.dataFolderId,
        casesFolderId: structure.casesFolderId,
        consultationsFolderId: structure.consultationsFolderId,
        filesFolderId: structure.filesFolderId,
        casesFileId: structure.casesFileId,
        isInitialized: true,
      })
      await get().loadCases()

      // 일정 스토어 초기화
      await useScheduleStore.getState().initSchedules(
        structure.dataFolderId,
        structure.schedulesFileId || null,
      )
    } catch (err) {
      set({ error: `Drive \uCD08\uAE30\uD654 \uC2E4\uD328: ${err.message}`, isLoading: false })
    }
  },

  switchWorkspace: async (config) => {
    saveWorkspaceConfig(config)
    set({
      workspace: config,
      isInitialized: false,
      cases: [],
      consultations: [],
      currentCase: null,
      driveRootId: null,
      dataFolderId: null,
      casesFolderId: null,
      consultationsFolderId: null,
      filesFolderId: null,
      casesFileId: null,
    })
    // 일정 스토어 리셋
    useScheduleStore.getState().reset()

    await get().initDrive()
  },

  // 사건 + 자문 목록 로드
  loadCases: async () => {
    const { casesFileId } = get()
    if (!casesFileId) return

    set({ isLoading: true, error: null })
    try {
      const data = await readCasesIndex(casesFileId)
      set({
        cases: data.cases || [],
        consultations: data.consultations || [],
        isLoading: false,
      })
    } catch (err) {
      set({ error: `목록 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  // ─── 사건 CRUD ───

  createCase: async (caseData) => {
    const { casesFileId, casesFolderId, filesFolderId, cases } = get()

    set({ isLoading: true, error: null })
    try {
      const detailData = {
        id: caseData.id,
        hearings: [],
        kakaoMessages: [],
        memos: [],
        emailThreadIds: [],
      }
      const detailFile = await createCaseFile(casesFolderId, caseData.id, detailData)
      const filesFolder = await createCaseFilesFolder(filesFolderId, caseData.id)

      const newCase = {
        ...caseData,
        category: 'case',
        driveFileId: detailFile.id,
        driveFolderId: filesFolder.id,
        lastActivityAt: new Date().toISOString(),
      }

      const latest = await readCasesIndex(casesFileId)
      latest.cases = [...(latest.cases || []).filter((c) => c.id !== caseData.id), newCase]
      await writeCasesIndex(casesFileId, latest)
      set({ cases: [...cases, newCase], isLoading: false })
      return newCase
    } catch (err) {
      set({ error: `사건 생성 실패: ${err.message}`, isLoading: false })
      return null
    }
  },

  updateCase: async (id, updates) => {
    const { casesFileId, cases } = get()

    set({ isLoading: true, error: null })
    try {
      const updatedCases = cases.map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )

      const latest = await readCasesIndex(casesFileId)
      latest.cases = (latest.cases || []).map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )
      await writeCasesIndex(casesFileId, latest)
      set({ cases: updatedCases, isLoading: false })
    } catch (err) {
      set({ error: `사건 수정 실패: ${err.message}`, isLoading: false })
    }
  },

  deleteCase: async (id) => {
    const { casesFileId, cases } = get()
    const caseToDelete = cases.find((c) => c.id === id)
    if (!caseToDelete) return

    set({ isLoading: true, error: null })
    try {
      if (caseToDelete.driveFileId) {
        await deleteFile(caseToDelete.driveFileId)
      }

      const updatedCases = cases.filter((c) => c.id !== id)
      const latest = await readCasesIndex(casesFileId)
      latest.cases = (latest.cases || []).filter((c) => c.id !== id)
      await writeCasesIndex(casesFileId, latest)
      set({ cases: updatedCases, currentCase: null, isLoading: false })
    } catch (err) {
      set({ error: `사건 삭제 실패: ${err.message}`, isLoading: false })
    }
  },

  // ─── 자문 CRUD ───

  createConsultation: async (consultData) => {
    const { casesFileId, consultationsFolderId, filesFolderId, consultations } = get()

    set({ isLoading: true, error: null })
    try {
      const detailData = {
        id: consultData.id,
        kakaoMessages: [],
        memos: [],
        emailThreadIds: [],
      }
      const detailFile = await createCaseFile(consultationsFolderId, consultData.id, detailData)
      const filesFolder = await createCaseFilesFolder(filesFolderId, consultData.id)

      const newConsult = {
        ...consultData,
        category: 'consultation',
        driveFileId: detailFile.id,
        driveFolderId: filesFolder.id,
        lastActivityAt: new Date().toISOString(),
      }

      const latest = await readCasesIndex(casesFileId)
      latest.consultations = [...(latest.consultations || []).filter((c) => c.id !== consultData.id), newConsult]
      await writeCasesIndex(casesFileId, latest)
      set({ consultations: [...consultations, newConsult], isLoading: false })
      return newConsult
    } catch (err) {
      set({ error: `자문 생성 실패: ${err.message}`, isLoading: false })
      return null
    }
  },

  updateConsultation: async (id, updates) => {
    const { casesFileId, consultations } = get()

    set({ isLoading: true, error: null })
    try {
      const updated = consultations.map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )

      const latest = await readCasesIndex(casesFileId)
      latest.consultations = (latest.consultations || []).map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )
      await writeCasesIndex(casesFileId, latest)
      set({ consultations: updated, isLoading: false })
    } catch (err) {
      set({ error: `자문 수정 실패: ${err.message}`, isLoading: false })
    }
  },

  deleteConsultation: async (id) => {
    const { casesFileId, consultations } = get()
    const toDelete = consultations.find((c) => c.id === id)
    if (!toDelete) return

    set({ isLoading: true, error: null })
    try {
      if (toDelete.driveFileId) {
        await deleteFile(toDelete.driveFileId)
      }

      const updated = consultations.filter((c) => c.id !== id)
      const latest = await readCasesIndex(casesFileId)
      latest.consultations = (latest.consultations || []).filter((c) => c.id !== id)
      await writeCasesIndex(casesFileId, latest)
      set({ consultations: updated, currentCase: null, isLoading: false })
    } catch (err) {
      set({ error: `자문 삭제 실패: ${err.message}`, isLoading: false })
    }
  },

  // ─── 상세 로드 (사건/자문 공용) ───

  loadCaseDetail: async (id) => {
    const { cases, consultations } = get()
    const item = cases.find((c) => c.id === id) || consultations.find((c) => c.id === id)
    if (!item?.driveFileId) return

    set({ isLoading: true, error: null })
    try {
      const detail = await readCaseDetail(item.driveFileId)
      set({ currentCase: { ...item, ...detail }, isLoading: false })
    } catch (err) {
      set({ error: `상세 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  // ─── 기일 추가 ───

  addHearing: async (caseId, hearing) => {
    const { cases, currentCase } = get()
    const caseInfo = cases.find((c) => c.id === caseId)
    if (!caseInfo?.driveFileId) return

    try {
      const detail = await readCaseDetail(caseInfo.driveFileId)
      detail.hearings = [...(detail.hearings || []), hearing]
      await writeCaseDetail(caseInfo.driveFileId, detail)

      const nextHearing = detail.hearings
        .filter((h) => new Date(h.datetime) >= new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]

      if (nextHearing) {
        await get().updateCase(caseId, { nextHearingDate: nextHearing.datetime })
      }

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `기일 추가 실패: ${err.message}` })
    }
  },

  // ─── 카카오톡 메시지 추가 ───

  addKakaoMessages: async (caseId, messages) => {
    const { cases, consultations, currentCase } = get()
    const item = cases.find((c) => c.id === caseId) || consultations.find((c) => c.id === caseId)
    if (!item?.driveFileId) return

    try {
      const detail = await readCaseDetail(item.driveFileId)
      detail.kakaoMessages = [...(detail.kakaoMessages || []), ...messages]
      await writeCaseDetail(item.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `카카오톡 저장 실패: ${err.message}` })
    }
  },

  // ─── 메모 추가 ───

  addMemo: async (caseId, memo) => {
    const { cases, consultations, currentCase } = get()
    const item = cases.find((c) => c.id === caseId) || consultations.find((c) => c.id === caseId)
    if (!item?.driveFileId) return

    try {
      const detail = await readCaseDetail(item.driveFileId)
      detail.memos = [...(detail.memos || []), memo]
      await writeCaseDetail(item.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `메모 저장 실패: ${err.message}` })
    }
  },

  clearError: () => set({ error: null }),
}))
