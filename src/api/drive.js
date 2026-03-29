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

  return {
    rootId: root.id,
    dataFolderId: dataFolder.id,
    casesFolderId: casesFolder.id,
    consultationsFolderId: consultationsFolder.id,
    filesFolderId: filesFolder.id,
    casesFileId: casesFile.id,
  }
}

// --- Cases index operations ---

export async function readCasesIndex(casesFileId) {
  return readJsonFile(casesFileId)
}

export async function writeCasesIndex(casesFileId, casesData) {
  casesData.updatedAt = new Date().toISOString()
  return updateJsonFile(casesFileId, casesData)
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
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc&pageSize=100`
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
