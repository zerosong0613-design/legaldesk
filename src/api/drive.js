import { useAuthStore } from '../auth/useAuth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const JSON_MIME = 'application/json'

const ROOT_FOLDER_NAME = 'LegalDesk'
const DATA_FOLDER_NAME = 'data'
const CASES_FOLDER_NAME = 'cases'
const CONSULTATIONS_FOLDER_NAME = 'consultations'
const FILES_FOLDER_NAME = 'files'
const CASES_INDEX_NAME = 'cases.json'
const SCHEDULES_INDEX_NAME = 'schedules.json'
const PROFILE_FILE_NAME = 'profile.json'

async function getToken() {
  const token = await useAuthStore.getState().getValidToken()
  if (!token) throw new Error('인증이 필요합니다.')
  return token
}

async function driveRequest(url, options = {}) {
  const token = await getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error?.message || `Drive API 오류 (${res.status})`)
  }

  return res
}

// --- Folder operations ---

async function findFolder(name, parentId) {
  const q = `name='${name}' and mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
  )
  const data = await res.json()
  return data.files?.[0] || null
}

async function createFolder(name, parentId) {
  const res = await driveRequest(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : [],
    }),
  })
  return res.json()
}

async function findOrCreateFolder(name, parentId) {
  const existing = await findFolder(name, parentId)
  if (existing) return existing
  return createFolder(name, parentId)
}

// --- File operations ---

async function findFile(name, parentId) {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
  )
  const data = await res.json()
  return data.files?.[0] || null
}

export async function readJsonFile(fileId) {
  const res = await driveRequest(
    `${DRIVE_API}/files/${fileId}?alt=media`
  )
  return res.json()
}

async function createJsonFile(name, parentId, data) {
  const metadata = {
    name,
    mimeType: JSON_MIME,
    parents: [parentId],
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: JSON_MIME })
  )
  form.append(
    'file',
    new Blob([JSON.stringify(data, null, 2)], { type: JSON_MIME })
  )

  const res = await driveRequest(`${UPLOAD_API}/files?uploadType=multipart`, {
    method: 'POST',
    body: form,
  })
  return res.json()
}

/**
 * HTML 내용으로 Google Docs 파일 생성 (Drive가 자동 변환)
 */
export async function createGoogleDoc(folderId, title, htmlContent) {
  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
    parents: [folderId],
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: JSON_MIME })
  )
  form.append(
    'file',
    new Blob([htmlContent], { type: 'text/html' })
  )

  const res = await driveRequest(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
    { method: 'POST', body: form }
  )
  return res.json()
}

export async function updateJsonFile(fileId, data) {
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify({})], { type: JSON_MIME })
  )
  form.append(
    'file',
    new Blob([JSON.stringify(data, null, 2)], { type: JSON_MIME })
  )

  const res = await driveRequest(
    `${UPLOAD_API}/files/${fileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      body: form,
    }
  )
  return res.json()
}

export async function deleteFile(fileId) {
  await driveRequest(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
  })
}

// --- Folder structure initialization ---

export async function initializeDriveStructure() {
  // Find or create: LegalDesk/
  const root = await findOrCreateFolder(ROOT_FOLDER_NAME, 'root')

  // Find or create: LegalDesk/data/
  const dataFolder = await findOrCreateFolder(DATA_FOLDER_NAME, root.id)

  // Find or create: LegalDesk/data/cases/
  const casesFolder = await findOrCreateFolder(CASES_FOLDER_NAME, dataFolder.id)

  // Find or create: LegalDesk/data/consultations/
  const consultationsFolder = await findOrCreateFolder(CONSULTATIONS_FOLDER_NAME, dataFolder.id)

  // Find or create: LegalDesk/files/
  const filesFolder = await findOrCreateFolder(FILES_FOLDER_NAME, root.id)

  // Find or create: LegalDesk/data/cases.json
  let casesFile = await findFile(CASES_INDEX_NAME, dataFolder.id)
  if (!casesFile) {
    const initialData = {
      version: '2.0',
      updatedAt: new Date().toISOString(),
      cases: [],
      consultations: [],
    }
    casesFile = await createJsonFile(CASES_INDEX_NAME, dataFolder.id, initialData)
  } else {
    // v1 → v2 마이그레이션
    const data = await readJsonFile(casesFile.id)
    if (data.version === '1.0' || !data.consultations) {
      data.version = '2.0'
      data.consultations = data.consultations || []
      await updateJsonFile(casesFile.id, data)
    }
  }

  // Find or create: LegalDesk/data/schedules.json
  let schedulesFile = await findFile(SCHEDULES_INDEX_NAME, dataFolder.id)
  if (!schedulesFile) {
    const initialSchedules = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      schedules: [],
    }
    schedulesFile = await createJsonFile(SCHEDULES_INDEX_NAME, dataFolder.id, initialSchedules)
  }

  // profile.json은 첫 로그인 시 없을 수 있음 (온보딩에서 생성)
  const profileFile = await findFile(PROFILE_FILE_NAME, dataFolder.id)

  return {
    rootId: root.id,
    dataFolderId: dataFolder.id,
    casesFolderId: casesFolder.id,
    consultationsFolderId: consultationsFolder.id,
    filesFolderId: filesFolder.id,
    casesFileId: casesFile.id,
    schedulesFileId: schedulesFile.id,
    profileFileId: profileFile?.id || null,
  }
}

// --- Profile operations ---

export async function readProfile(profileFileId) {
  if (!profileFileId) return null
  try {
    return await readJsonFile(profileFileId)
  } catch {
    return null
  }
}

export async function writeProfile(dataFolderId, profileFileId, data) {
  const payload = { ...data, updatedAt: new Date().toISOString() }
  if (profileFileId) {
    await updateJsonFile(profileFileId, payload)
    return profileFileId
  }
  // 첫 생성
  payload.createdAt = new Date().toISOString()
  const file = await createJsonFile(PROFILE_FILE_NAME, dataFolderId, payload)
  return file.id
}

// --- Cases index operations ---

export async function readCasesIndex(casesFileId) {
  return readJsonFile(casesFileId)
}

export async function writeCasesIndex(casesFileId, casesData) {
  casesData.updatedAt = new Date().toISOString()
  return updateJsonFile(casesFileId, casesData)
}

// --- Schedules index operations ---

export async function readSchedulesIndex(schedulesFileId) {
  return readJsonFile(schedulesFileId)
}

export async function writeSchedulesIndex(schedulesFileId, data) {
  data.updatedAt = new Date().toISOString()
  return updateJsonFile(schedulesFileId, data)
}

export async function findOrCreateSchedulesFile(dataFolderId) {
  let file = await findFile('schedules.json', dataFolderId)
  if (!file) {
    file = await createJsonFile('schedules.json', dataFolderId, {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      schedules: [],
    })
  }
  return file
}

// --- Case detail operations ---

export async function readCaseDetail(fileId) {
  return readJsonFile(fileId)
}

export async function writeCaseDetail(fileId, caseData) {
  return updateJsonFile(fileId, caseData)
}

export async function createCaseFile(casesFolderId, caseId, caseData) {
  return createJsonFile(`${caseId}.json`, casesFolderId, caseData)
}

export async function createCaseFilesFolder(filesFolderId, caseId) {
  return createFolder(caseId, filesFolderId)
}

// --- File listing & upload for document tab ---

export async function listFilesInFolder(folderId) {
  if (!folderId) return []
  const q = `'${folderId}' in parents and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,description,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc&pageSize=100`
  )
  const data = await res.json()
  return data.files || []
}

export async function uploadFileToDrive(folderId, file) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: JSON_MIME })
  )
  form.append('file', file)

  const res = await driveRequest(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`, {
    method: 'POST',
    body: form,
  })
  return res.json()
}

export async function getFileDownloadUrl(fileId) {
  return `${DRIVE_API}/files/${fileId}?alt=media`
}

export async function createSubFolder(parentId, name) {
  return createFolder(name, parentId)
}

export async function updateFileDescription(fileId, description) {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify({ description }),
  })
  return res.json()
}

export async function renameFile(fileId, name) {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function getFileMetadata(fileId) {
  const res = await driveRequest(
    `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,description,createdTime,modifiedTime,webViewLink`
  )
  return res.json()
}

// --- \uACF5\uC720 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 ---

export async function findSharedLegalDeskFolders() {
  const q = `name='${ROOT_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and sharedWithMe=true and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,owners,sharingUser,permissions)&spaces=drive`
  )
  const data = await res.json()
  return data.files || []
}

export async function findMyLegalDeskFolders() {
  const q = `name='${ROOT_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and 'root' in parents and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,owners)&spaces=drive`
  )
  const data = await res.json()
  return data.files || []
}

export async function getFolderOwner(folderId) {
  const res = await driveRequest(
    `${DRIVE_API}/files/${folderId}?fields=id,name,owners,sharingUser`
  )
  return res.json()
}

export async function connectToExistingStructure(rootId) {
  // \uAE30\uC874 LegalDesk \uD3F4\uB354 \uAD6C\uC870\uC5D0 \uC5F0\uACB0 (\uC0C8\uB85C \uC0DD\uC131\uD558\uC9C0 \uC54A\uC74C)
  const dataFolder = await findFolder(DATA_FOLDER_NAME, rootId)
  if (!dataFolder) throw new Error('data \uD3F4\uB354\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC62C\uBC14\uB978 LegalDesk \uD3F4\uB354\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694.')

  const casesFolder = await findFolder(CASES_FOLDER_NAME, dataFolder.id)
  if (!casesFolder) throw new Error('cases \uD3F4\uB354\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.')

  const consultationsFolder = await findFolder(CONSULTATIONS_FOLDER_NAME, dataFolder.id)

  const filesFolder = await findFolder(FILES_FOLDER_NAME, rootId)
  if (!filesFolder) throw new Error('files \uD3F4\uB354\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.')

  const casesFile = await findFile(CASES_INDEX_NAME, dataFolder.id)
  if (!casesFile) throw new Error('cases.json \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.')

  const schedulesFile = await findFile(SCHEDULES_INDEX_NAME, dataFolder.id)
  const profileFile = await findFile(PROFILE_FILE_NAME, dataFolder.id)

  return {
    rootId,
    dataFolderId: dataFolder.id,
    casesFolderId: casesFolder.id,
    consultationsFolderId: consultationsFolder?.id || null,
    filesFolderId: filesFolder.id,
    casesFileId: casesFile.id,
    schedulesFileId: schedulesFile?.id || null,
    profileFileId: profileFile?.id || null,
  }
}

export async function shareFolderWithEmail(folderId, email, role = 'writer') {
  const res = await driveRequest(`${DRIVE_API}/files/${folderId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress: email,
    }),
  })
  return res.json()
}

export async function listFolderPermissions(folderId) {
  const res = await driveRequest(
    `${DRIVE_API}/files/${folderId}/permissions?fields=permissions(id,type,role,emailAddress,displayName,photoLink)`
  )
  const data = await res.json()
  return data.permissions || []
}

// ── 사건별 개별 공유 ──

export async function listFilePermissions(fileId) {
  const res = await driveRequest(
    `${DRIVE_API}/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName,photoLink)`
  )
  const data = await res.json()
  return data.permissions || []
}

export async function removePermission(fileId, permissionId) {
  await driveRequest(`${DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
    method: 'DELETE',
  })
}

export async function setFileAppProperties(fileId, properties) {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': JSON_MIME },
    body: JSON.stringify({ appProperties: properties }),
  })
  return res.json()
}

/**
 * 사건 상세 JSON + 첨부 폴더를 특정 이메일에 공유
 */
export async function shareCaseFiles(caseDetailFileId, caseAttachmentsFolderId, email, role = 'writer') {
  const shareOne = (fileId) =>
    driveRequest(`${DRIVE_API}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': JSON_MIME },
      body: JSON.stringify({ type: 'user', role, emailAddress: email }),
    }).then((r) => r.json())

  const results = [await shareOne(caseDetailFileId)]
  if (caseAttachmentsFolderId) {
    results.push(await shareOne(caseAttachmentsFolderId))
  }

  // appProperties 태깅 (공유 사건 검색용)
  await setFileAppProperties(caseDetailFileId, {
    legaldesk_type: 'case',
    legaldesk_version: '2',
  })

  return results
}

/**
 * 사건 공유 해제 — 이메일로 권한 찾아서 삭제
 */
export async function unshareCaseFiles(caseDetailFileId, caseAttachmentsFolderId, email) {
  const revokeOne = async (fileId) => {
    const perms = await listFilePermissions(fileId)
    const target = perms.find((p) => p.emailAddress === email)
    if (target) await removePermission(fileId, target.id)
  }

  await revokeOne(caseDetailFileId)
  if (caseAttachmentsFolderId) {
    await revokeOne(caseAttachmentsFolderId)
  }
}

/**
 * 나에게 공유된 LegalDesk 사건 파일 검색
 */
export async function findSharedCaseFiles() {
  const q = encodeURIComponent(
    "appProperties has { key='legaldesk_type' and value='case' } and sharedWithMe=true and trashed=false"
  )
  const fields = encodeURIComponent('files(id,name,owners,sharingUser,appProperties)')
  const res = await driveRequest(`${DRIVE_API}/files?q=${q}&fields=${fields}&pageSize=100`)
  const data = await res.json()
  return data.files || []
}
