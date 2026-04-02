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
  shareCaseFiles,
  unshareCaseFiles,
  listFilePermissions,
  setFileAppProperties,
  findSharedCaseFiles,
  readProfile,
  writeProfile,
} from '../api/drive'
import { useAuthStore } from '../auth/useAuth'
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
  profileFileId: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  workspace: loadWorkspaceConfig(),
  sharedCases: [],
  sharedCasesLoading: false,

  // Drive \uD3F4\uB354 \uAD6C\uC870 \uCD08\uAE30\uD654
  initDrive: async () => {
    set({ isLoading: true, error: null })
    try {
      const ws = get().workspace

      let structure
      if (ws?.type === 'shared' && ws.rootId) {
        // \uACF5\uC720 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4: \uAE30\uC874 \uAD6C\uC870\uC5D0 \uC5F0\uACB0
        structure = await connectToExistingStructure(ws.rootId)
      } else {
        // \uB0B4 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4: \uAE30\uC874\uCC98\uB7FC \uC0DD\uC131/\uC5F0\uACB0
        structure = await initializeDriveStructure()
        if (!ws) {
          const config = { type: 'own', rootId: structure.rootId, label: '\uB0B4 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4' }
          saveWorkspaceConfig(config)
          set({ workspace: config })
        }
      }

      // 프로필 로드
      const profileData = await readProfile(structure.profileFileId)

      set({
        driveRootId: structure.rootId,
        dataFolderId: structure.dataFolderId,
        casesFolderId: structure.casesFolderId,
        consultationsFolderId: structure.consultationsFolderId,
        filesFolderId: structure.filesFolderId,
        casesFileId: structure.casesFileId,
        profileFileId: structure.profileFileId,
        profile: profileData,
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

  // ─── 상담 기록 CRUD ───

  addConsultationRecord: async (caseId, consultation) => {
    const { cases, consultations: consultList, currentCase } = get()
    const item = cases.find((c) => c.id === caseId) || consultList.find((c) => c.id === caseId)
    if (!item?.driveFileId) return

    try {
      const detail = await readCaseDetail(item.driveFileId)
      detail.consultations = [...(detail.consultations || []), consultation]
      await writeCaseDetail(item.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `상담 저장 실패: ${err.message}` })
    }
  },

  updateConsultationRecord: async (caseId, consultationId, updates) => {
    const { cases, consultations: consultList, currentCase } = get()
    const item = cases.find((c) => c.id === caseId) || consultList.find((c) => c.id === caseId)
    if (!item?.driveFileId) return

    try {
      const detail = await readCaseDetail(item.driveFileId)
      detail.consultations = (detail.consultations || []).map((c) =>
        c.id === consultationId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
      await writeCaseDetail(item.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `상담 수정 실패: ${err.message}` })
    }
  },

  deleteConsultationRecord: async (caseId, consultationId) => {
    const { cases, consultations: consultList, currentCase } = get()
    const item = cases.find((c) => c.id === caseId) || consultList.find((c) => c.id === caseId)
    if (!item?.driveFileId) return

    try {
      const detail = await readCaseDetail(item.driveFileId)
      detail.consultations = (detail.consultations || []).filter((c) => c.id !== consultationId)
      await writeCaseDetail(item.driveFileId, detail)

      if (currentCase?.id === caseId) {
        set({ currentCase: { ...currentCase, ...detail } })
      }
    } catch (err) {
      set({ error: `상담 삭제 실패: ${err.message}` })
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

  // ─── 프로필 ───

  saveProfile: async (data) => {
    const { dataFolderId, profileFileId } = get()
    const newId = await writeProfile(dataFolderId, profileFileId, data)
    set({ profile: { ...data, updatedAt: new Date().toISOString() }, profileFileId: newId })
  },

  // ─── 사건별 공유 ───

  shareCase: async (caseId, email, role) => {
    const { cases, consultations } = get()
    const item = cases.find((c) => c.id === caseId) || consultations.find((c) => c.id === caseId)
    if (!item?.driveFileId) throw new Error('사건 파일을 찾을 수 없습니다.')

    // 1) _summary 동기화
    const user = useAuthStore.getState().user
    const detail = await readCaseDetail(item.driveFileId)
    detail._summary = {
      clientName: item.clientName,
      caseNumber: item.caseNumber,
      caseName: item.caseName || item.subject || '',
      type: item.type,
      status: item.status,
      court: item.court || '',
      category: item.category || 'case',
      ownerEmail: user?.email || '',
      ownerName: user?.name || '',
    }
    await writeCaseDetail(item.driveFileId, detail)

    // 2) Drive 권한 부여 + appProperties 태깅
    await shareCaseFiles(item.driveFileId, item.driveFolderId, email, role)

    // 3) cases.json에 sharedWith 기록
    const sharedWith = [...(item.sharedWith || [])]
    const idx = sharedWith.findIndex((s) => s.email === email)
    if (idx >= 0) {
      sharedWith[idx] = { email, role, sharedAt: new Date().toISOString() }
    } else {
      sharedWith.push({ email, role, sharedAt: new Date().toISOString() })
    }
    await get().updateCase(caseId, { sharedWith })
  },

  unshareCase: async (caseId, email) => {
    const { cases, consultations } = get()
    const item = cases.find((c) => c.id === caseId) || consultations.find((c) => c.id === caseId)
    if (!item?.driveFileId) throw new Error('사건 파일을 찾을 수 없습니다.')

    await unshareCaseFiles(item.driveFileId, item.driveFolderId, email)

    const sharedWith = (item.sharedWith || []).filter((s) => s.email !== email)
    await get().updateCase(caseId, { sharedWith })
  },

  loadSharedCases: async () => {
    set({ sharedCasesLoading: true })
    try {
      const files = await findSharedCaseFiles()
      const sharedCases = []
      for (const file of files) {
        try {
          const detail = await readCaseDetail(file.id)
          if (detail._summary) {
            // 권한 레벨 확인
            const perms = await listFilePermissions(file.id)
            const user = useAuthStore.getState().user
            const myPerm = perms.find((p) => p.emailAddress === user?.email)
            sharedCases.push({
              ...detail._summary,
              id: detail.id,
              driveFileId: file.id,
              isShared: true,
              myRole: myPerm?.role || 'reader',
              ownerEmail: detail._summary.ownerEmail,
              ownerName: detail._summary.ownerName,
            })
          }
        } catch {
          // 개별 파일 읽기 실패는 무시
        }
      }
      set({ sharedCases, sharedCasesLoading: false })
    } catch (err) {
      set({ sharedCases: [], sharedCasesLoading: false })
    }
  },

  loadSharedCaseDetail: async (driveFileId) => {
    set({ isLoading: true, error: null })
    try {
      const detail = await readCaseDetail(driveFileId)
      const summary = detail._summary || {}
      // 권한 확인
      const perms = await listFilePermissions(driveFileId)
      const user = useAuthStore.getState().user
      const myPerm = perms.find((p) => p.emailAddress === user?.email)

      set({
        currentCase: {
          ...summary,
          ...detail,
          driveFileId,
          isShared: true,
          myRole: myPerm?.role || 'reader',
        },
        isLoading: false,
      })
    } catch (err) {
      set({ error: `공유 사건 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
