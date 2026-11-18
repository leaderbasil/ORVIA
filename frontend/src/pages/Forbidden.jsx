import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import Badge from '../components/common/Badge.jsx'
import Card from '../components/common/Card.jsx'
import { messages } from '../constants/messages.js'
import { useAuth } from '../hooks/useAuth.js'
import { homePathForRole } from '../utils/navigation.js'

export default function Forbidden() {
  const { user } = useAuth()
  const homePath = user ? homePathForRole(user.role) : '/login'

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <Badge tone="danger">403</Badge>
        <h1 className="mt-3 text-2xl font-semibold">{messages.pages.forbidden.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{messages.pages.forbidden.description}</p>
        <Link
          to={homePath}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary-strong px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {messages.common.backToHome}
        </Link>
      </Card>
    </div>
  )
}
