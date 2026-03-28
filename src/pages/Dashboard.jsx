import { useAuthStore } from '../auth/useAuth'

export default function Dashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">LegalDesk</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt=""
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="text-sm text-gray-700">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            사건 목록이 비어있습니다
          </h2>
          <p className="text-gray-500">
            Step 3에서 사건 CRUD 기능이 추가됩니다
          </p>
        </div>
      </main>
    </div>
  )
}
