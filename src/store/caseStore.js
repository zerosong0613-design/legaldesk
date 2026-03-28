import { create } from 'zustand'
import {
  initializeDriveStructure,
  readCasesIndex,
  writeCasesIndex,
  readCaseDetail,
  writeCaseDetail,
  createCaseFile,
  createCaseFilesFolder,
  deleteFile,
} from '../api/drive'

export const useCaseStore = create((set, get) => ({
  cases: [],
  currentCase: null,
  driveRootId: null,
  dataFolderId: null,
  casesFolderId: null,
  filesFolderId: null,
  casesFileId: null,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Drive 폴더 구조 초기화
  initDrive: async () => {
    set({ isLoading: true, error: null })
    try {
      const structure = await initializeDriveStructure()
      set({
        driveRootId: structure.rootId,
        dataFolderId: structure.dataFolderId,
        casesFolderId: structure.casesFolderId,
        filesFolderId: structure.filesFolderId,
        casesFileId: structure.casesFileId,
        isInitialized: true,
      })

      // Load cases index
      await get().loadCases()
    } catch (err) {
      set({ error: `Drive 초기화 실패: ${err.message}`, isLoading: false })
    }
  },

  // 사건 목록 로드
  loadCases: async () => {
    const { casesFileId } = get()
    if (!casesFileId) return

    set({ isLoading: true, error: null })
    try {
      const data = await readCasesIndex(casesFileId)
      set({ cases: data.cases || [], isLoading: false })
    } catch (err) {
      set({ error: `사건 목록 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  // 사건 생성
  createCase: async (caseData) => {
    const { casesFileId, casesFolderId, filesFolderId, cases } = get()

    set({ isLoading: true, error: null })
    try {
      // 사건 상세 파일 생성
      const detailData = {
        id: caseData.id,
        hearings: [],
        kakaoMessages: [],
        memos: [],
        emailThreadIds: [],
      }
      const detailFile = await createCaseFile(casesFolderId, caseData.id, detailData)

      // 사건 첨부파일 폴더 생성
      const filesFolder = await createCaseFilesFolder(filesFolderId, caseData.id)

      // 인덱스에 추가
      const newCase = {
        ...caseData,
        driveFileId: detailFile.id,
        driveFolderId: filesFolder.id,
        lastActivityAt: new Date().toISOString(),
      }

      const updatedCases = [...cases, newCase]

      // cases.json 최신 버전 읽고 머지
      const latest = await readCasesIndex(casesFileId)
      latest.cases = [...latest.cases.filter((c) => c.id !== caseData.id), newCase]

      await writeCasesIndex(casesFileId, latest)
      set({ cases: updatedCases, isLoading: false })

      return newCase
    } catch (err) {
      set({ error: `사건 생성 실패: ${err.message}`, isLoading: false })
      return null
    }
  },

  // 사건 수정
  updateCase: async (id, updates) => {
    const { casesFileId, cases } = get()

    set({ isLoading: true, error: null })
    try {
      const updatedCases = cases.map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )

      const latest = await readCasesIndex(casesFileId)
      latest.cases = latest.cases.map((c) =>
        c.id === id ? { ...c, ...updates, lastActivityAt: new Date().toISOString() } : c
      )

      await writeCasesIndex(casesFileId, latest)
      set({ cases: updatedCases, isLoading: false })
    } catch (err) {
      set({ error: `사건 수정 실패: ${err.message}`, isLoading: false })
    }
  },

  // 사건 삭제
  deleteCase: async (id) => {
    const { casesFileId, cases } = get()
    const caseToDelete = cases.find((c) => c.id === id)
    if (!caseToDelete) return

    set({ isLoading: true, error: null })
    try {
      // 상세 파일 삭제
      if (caseToDelete.driveFileId) {
        await deleteFile(caseToDelete.driveFileId)
      }

      // 인덱스에서 제거
      const updatedCases = cases.filter((c) => c.id !== id)

      const latest = await readCasesIndex(casesFileId)
      latest.cases = latest.cases.filter((c) => c.id !== id)

      await writeCasesIndex(casesFileId, latest)
      set({ cases: updatedCases, currentCase: null, isLoading: false })
    } catch (err) {
      set({ error: `사건 삭제 실패: ${err.message}`, isLoading: false })
    }
  },

  // 사건 상세 로드
  loadCaseDetail: async (id) => {
    const { cases } = get()
    const caseInfo = cases.find((c) => c.id === id)
    if (!caseInfo?.driveFileId) return

    set({ isLoading: true, error: null })
    try {
      const detail = await readCaseDetail(caseInfo.driveFileId)
      set({ currentCase: { ...caseInfo, ...detail }, isLoading: false })
    } catch (err) {
      set({ error: `사건 상세 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  // 기일 추가
  addHearing: async (caseId, hearing) => {
    const { cases, currentCase } = get()
    const caseInfo = cases.find((c) => c.id === caseId)
    if (!caseInfo?.driveFileId) return

    try {
      const detail = await readCaseDetail(caseInfo.driveFileId)
      detail.hearings = [...(detail.hearings || []), hearing]
      await writeCaseDetail(caseInfo.driveFileId, detail)

      // Update next hearing date in index
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

  // 카카오톡 메시지 추가
  addKakaoMessages: async (caseId, messages) => {
    const { cases, currentCase } = get()
    const caseInfo = cases.find((c) => c.id === caseId)
    if (!caseInfo?.driveFileId) return

    try {
      const detail = await readCaseDetail(caseInfo.driveFileId)
      detail.kakaoMessages = [...(detail.kakaoMessages || []), ...messages]
      await writeCaseDetail(caseInfo.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `카카오톡 저장 실패: ${err.message}` })
    }
  },

  // 메모 추가
  addMemo: async (caseId, memo) => {
    const { cases, currentCase } = get()
    const caseInfo = cases.find((c) => c.id === caseId)
    if (!caseInfo?.driveFileId) return

    try {
      const detail = await readCaseDetail(caseInfo.driveFileId)
      detail.memos = [...(detail.memos || []), memo]
      await writeCaseDetail(caseInfo.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `메모 저장 실패: ${err.message}` })
    }
  },

  clearError: () => set({ error: null }),
}))
