import { create } from 'zustand'
import {
  readSchedulesIndex,
  writeSchedulesIndex,
  findOrCreateSchedulesFile,
} from '../api/drive'
import {
  createScheduleCalendarEvent,
  updateScheduleCalendarEvent,
  deleteCalendarEvent,
} from '../api/calendar'

function generateId() {
  const rand = Math.random().toString(36).slice(2, 6)
  return `S-${Date.now()}-${rand}`
}

export const useScheduleStore = create((set, get) => ({
  schedules: [],
  schedulesFileId: null,
  dataFolderId: null,
  isLoading: false,
  error: null,

  initSchedules: async (dataFolderId, schedulesFileId) => {
    set({ dataFolderId })

    if (!schedulesFileId && dataFolderId) {
      const file = await findOrCreateSchedulesFile(dataFolderId)
      schedulesFileId = file.id
    }

    set({ schedulesFileId })
    if (schedulesFileId) {
      await get().loadSchedules()
    }
  },

  loadSchedules: async () => {
    const { schedulesFileId } = get()
    if (!schedulesFileId) return

    set({ isLoading: true, error: null })
    try {
      const data = await readSchedulesIndex(schedulesFileId)
      set({ schedules: data.schedules || [], isLoading: false })
    } catch (err) {
      set({ error: `일정 로드 실패: ${err.message}`, isLoading: false })
    }
  },

  createSchedule: async (scheduleData) => {
    const { schedulesFileId } = get()
    if (!schedulesFileId) return

    set({ isLoading: true, error: null })
    try {
      const newSchedule = {
        id: generateId(),
        title: scheduleData.title,
        datetime: scheduleData.datetime,
        endDatetime: scheduleData.endDatetime || null,
        type: scheduleData.type || '기타',
        location: scheduleData.location || '',
        note: scheduleData.note || '',
        allDay: scheduleData.allDay || false,
        calendarEventId: null,
        createdAt: new Date().toISOString(),
      }

      // Google Calendar 연동
      try {
        const calEvent = await createScheduleCalendarEvent(newSchedule)
        newSchedule.calendarEventId = calEvent?.id || null
      } catch {
        // 캘린더 실패해도 Drive 저장은 진행
      }

      const data = await readSchedulesIndex(schedulesFileId)
      data.schedules.push(newSchedule)
      await writeSchedulesIndex(schedulesFileId, data)

      set({ schedules: data.schedules, isLoading: false })
      return newSchedule
    } catch (err) {
      set({ error: `일정 생성 실패: ${err.message}`, isLoading: false })
    }
  },

  updateSchedule: async (id, updates) => {
    const { schedulesFileId } = get()
    if (!schedulesFileId) return

    set({ isLoading: true, error: null })
    try {
      const data = await readSchedulesIndex(schedulesFileId)
      const idx = data.schedules.findIndex((s) => s.id === id)
      if (idx === -1) throw new Error('일정을 찾을 수 없습니다.')

      const updated = { ...data.schedules[idx], ...updates }
      data.schedules[idx] = updated

      // Google Calendar 연동
      if (updated.calendarEventId) {
        try {
          await updateScheduleCalendarEvent(updated.calendarEventId, updated)
        } catch {
          // 캘린더 실패해도 Drive 저장은 진행
        }
      }

      await writeSchedulesIndex(schedulesFileId, data)
      set({ schedules: data.schedules, isLoading: false })
    } catch (err) {
      set({ error: `일정 수정 실패: ${err.message}`, isLoading: false })
    }
  },

  deleteSchedule: async (id) => {
    const { schedulesFileId } = get()
    if (!schedulesFileId) return

    set({ isLoading: true, error: null })
    try {
      const data = await readSchedulesIndex(schedulesFileId)
      const schedule = data.schedules.find((s) => s.id === id)

      // Google Calendar 이벤트 삭제
      if (schedule?.calendarEventId) {
        try {
          await deleteCalendarEvent(schedule.calendarEventId)
        } catch {
          // 캘린더 실패해도 Drive 삭제는 진행
        }
      }

      data.schedules = data.schedules.filter((s) => s.id !== id)
      await writeSchedulesIndex(schedulesFileId, data)
      set({ schedules: data.schedules, isLoading: false })
    } catch (err) {
      set({ error: `일정 삭제 실패: ${err.message}`, isLoading: false })
    }
  },

  reset: () => {
    set({
      schedules: [],
      schedulesFileId: null,
      dataFolderId: null,
      isLoading: false,
      error: null,
    })
  },
}))
