'use client'

import React, { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import SettingsLayout from './SettingsLayout'
import MembersTab from './MembersTab'
import WorkspaceSettingsTab from './WorkspaceSettingsTab'
import ActivityLogTab from './ActivityLogTab'
import AccountSettingsTab from './AccountSettingsTab'

type Tab = 'members' | 'workspace' | 'activity' | 'accounts'

export default function SettingsPageContent() {
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') || 'members') as Tab

  const content = useMemo(() => {
    switch (tab) {
      case 'members':
        return <MembersTab />
      case 'workspace':
        return <WorkspaceSettingsTab />
      case 'activity':
        return <ActivityLogTab />
      case 'accounts':
        return <AccountSettingsTab />
      default:
        return <MembersTab />
    }
  }, [tab])

  return (
    <SettingsLayout activeTab={tab}>
      {content}
    </SettingsLayout>
  )
}
