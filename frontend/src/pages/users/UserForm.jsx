import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Input from '../../components/common/Input.jsx'
import Select from '../../components/common/Select.jsx'
import { messages } from '../../constants/messages.js'

const roleField = z.enum(['ADMIN', 'CASHIER'], {
  errorMap: () => ({ message: messages.validation.required }),
})

const createSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .max(150, messages.validation.maxLength),
  email: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .email(messages.validation.email),
  password: z
    .string()
    .min(8, messages.validation.passwordMin)
    .max(72, messages.validation.passwordMax),
  role: roleField,
})

const editSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .max(150, messages.validation.maxLength),
  role: roleField,
})

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: messages.roles.ADMIN },
  { value: 'CASHIER', label: messages.roles.CASHIER },
]

export default function UserForm({
  mode = 'create',
  user = null,
  isSelf = false,
  onSubmit,
  onCancel,
  serverError = '',
}) {
  const isCreate = mode === 'create'
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isCreate ? createSchema : editSchema),
    defaultValues: isCreate
      ? { full_name: '', email: '', password: '', role: 'CASHIER' }
      : { full_name: user?.full_name ?? '', role: user?.role ?? 'CASHIER' },
    mode: 'onBlur',
  })

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        if (isCreate) {
          onSubmit({
            full_name: values.full_name.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password,
            role: values.role,
          })
          return
        }
        onSubmit({ full_name: values.full_name.trim(), role: values.role })
      })}
      noValidate
    >
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <Input
        label={messages.users.form.fullName}
        required
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      {isCreate ? (
        <>
          <Input
            label={messages.users.form.email}
            type="email"
            required
            dir="ltr"
            className="text-start"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={messages.users.form.password}
            type="password"
            required
            dir="ltr"
            className="text-start"
            autoComplete="new-password"
            hint={messages.users.form.passwordHint}
            error={errors.password?.message}
            {...register('password')}
          />
        </>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">{messages.users.form.email}</p>
          <p dir="ltr" className="break-all rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
            {user?.email}
          </p>
        </div>
      )}

      <Select
        label={messages.users.form.role}
        options={ROLE_OPTIONS}
        disabled={isSelf}
        hint={isSelf ? messages.users.form.selfRoleHint : undefined}
        error={errors.role?.message}
        {...register('role')}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? messages.users.form.saving : messages.users.form.save}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {messages.actions.cancel}
        </Button>
      </div>
    </form>
  )
}
