import { Tabs } from '@mantine/core'

export default function TabBar({ tabs, activeTab, onChange }) {
  return (
    <Tabs value={activeTab} onChange={onChange} variant="default">
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
