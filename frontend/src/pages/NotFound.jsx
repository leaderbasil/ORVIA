import { Link } from 'react-router-dom'

import { messages } from '../constants/messages.js'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="numeric text-6xl font-semibold text-primary-strong">404</p>
      <h1 className="text-2xl font-semibold">{messages.pages.notFound.title}</h1>
      <p className="max-w-md text-sm text-text-muted">{messages.pages.notFound.description}</p>
      <Link
        to="/"
        className="inline-flex h-10 items-center rounded-md bg-primary-strong px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        {messages.common.backToHome}
      </Link>
    </div>
  )
}
