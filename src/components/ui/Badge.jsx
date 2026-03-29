import { Badge as MantineBadge } from '@mantine/core'

const COLOR_MAP = {
  접수: 'yellow',
  진행: 'indigo',
  종결: 'gray',
  보류: 'red',
  완료: 'teal',
}

export default function Badge({ status }) {
  return (
    <MantineBadge color={COLOR_MAP[status] || 'gray'} variant="light" size="sm">
      {status}
    </MantineBadge>
  )
}
