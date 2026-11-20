import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import Input from '../../components/common/Input.jsx'
import { OrviaLogo } from '../../components/brand/OrviaLogo.jsx'
import { demoCredentials, demoLoginEnabled } from '../../constants/demo.js'
import { messages } from '../../constants/messages.js'
import { useAuth } from '../../hooks/useAuth.js'
import { getApiErrorMessage } from '../../services/api.js'
import { homePathForRole } from '../../utils/navigation.js'
import { useTheme } from '../../context/ThemeContext.jsx'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .email(messages.validation.email),
  password: z.string().min(1, messages.validation.required),
})

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [serverError, setServerError] = useState('')
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  const onSubmit = async (values) => {
    setServerError('')
    try {
      const loggedInUser = await login(values)
      toast.success(messages.auth.loginSuccess)
      // Land on the role's home page; deep links are not preserved across login
      // so a cashier can never be sent to an admin-only route.
      navigate(homePathForRole(loggedInUser.role), { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  const onDemoLogin = async () => {
    if (!demoCredentials) {
      return
    }

    setServerError('')
    setIsDemoLoading(true)
    try {
      const loggedInUser = await login(demoCredentials)
      toast.success(messages.auth.demoLoginSuccess)
      navigate(homePathForRole(loggedInUser.role), { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orvia-blob orvia-blob-one" />
        <div className="orvia-blob orvia-blob-two" />
        <div className="orvia-blob orvia-blob-three" />
      </div>

      <Card className="orvia-rise relative w-full max-w-md p-6 shadow-md sm:p-8">
        <div className="relative mb-6">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? messages.actions.switchToLight : messages.actions.switchToDark}
            title={theme === 'dark' ? messages.actions.switchToLight : messages.actions.switchToDark}
            className="absolute top-0 right-0 h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-background hover:text-text transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <div className="mb-6 flex flex-col items-center gap-4 text-center">
            <OrviaLogo />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{messages.pages.login.title}</h1>
              <p className="text-sm text-text-muted">{messages.pages.login.description}</p>
            </div>
          </div>
        </div>

        {serverError ? (
          <Alert tone="danger" className="mb-4">
            {serverError}
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label={messages.login.email}
            type="email"
            placeholder="admin@example.com"
            autoComplete="username"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={messages.login.password}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={isSubmitting}
            disabled={isDemoLoading}
          >
            {messages.actions.login}
          </Button>
        </form>

        {demoLoginEnabled ? (
          <div className="mt-5">
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-muted">{messages.auth.demoDivider}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="mt-4 w-full"
              loading={isDemoLoading}
              disabled={isSubmitting}
              onClick={onDemoLogin}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {messages.auth.demoLogin}
            </Button>
            <p className="mt-3 text-center text-xs text-text-muted">
              {messages.auth.demoLoginHint}
            </p>
          </div>
        ) : null}

        <p className="mt-4 text-center text-xs text-text-muted">{messages.auth.phaseNote}</p>
      </Card>
    </div>
  )
}
