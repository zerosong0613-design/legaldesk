const STYLES = {
  접수: 'bg-yellow-100 text-yellow-800',
  진행: 'bg-blue-100 text-blue-800',
  종결: 'bg-gray-100 text-gray-600',
  보류: 'bg-red-100 text-red-800',
}

export default function Badge({ status }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  )
}
