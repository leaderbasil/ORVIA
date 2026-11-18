import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import Input from '../../components/common/Input.jsx'
import Modal from '../../components/common/Modal.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import Select from '../../components/common/Select.jsx'
import { messages } from '../../constants/messages.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import {
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
} from '../../hooks/useUsers.js'
import { getApiErrorMessage } from '../../services/api.js'
import { formatDate } from '../../utils/formatDate.js'
import UserForm from './UserForm.jsx'

const PAGE_SIZE = 20

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: messages.users.allRoles },
  { value: 'ADMIN', label: messages.roles.ADMIN },
  { value: 'CASHIER', label: messages.roles.CASHIER },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: messages.users.allStatuses },
  { value: 'active', label: messages.users.active },
  { value: 'inactive', label: messages.users.inactive },
]

export default function Users() {
  const { user: currentUser, refreshUser } = useAuth()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [formState, setFormState] = useState(null)
  const [formError, setFormError] = useState('')
  const [statusTarget, setStatusTarget] = useState(null)

  const debouncedSearch = useDebouncedValue(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, status])

  const params = useMemo(() => {
    const query = { page, page_size: PAGE_SIZE }
    if (debouncedSearch.trim()) query.search = debouncedSearch.trim()
    if (role !== 'all') query.role = role
    if (status !== 'all') query.is_active = status === 'active'
    return query
  }, [page, debouncedSearch, role, status])

  const usersQuery = useUsers(params)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const updateUserStatus = useUpdateUserStatus()

  const closeForm = () => {
    setFormState(null)
    setFormError('')
  }

  const openCreate = () => {
    setFormError('')
    setFormState({ mode: 'create', user: null })
  }

  const openEdit = (targetUser) => {
    setFormError('')
    setFormState({ mode: 'edit', user: targetUser })
  }

  const handleFormSubmit = async (payload) => {
    setFormError('')
    try {
      if (formState.mode === 'create') {
        await createUser.mutateAsync(payload)
        toast.success(messages.users.created)
      } else {
        await updateUser.mutateAsync({ id: formState.user.id, payload })
        if (formState.user.id === currentUser?.id) {
          await refreshUser()
        }
        toast.success(messages.users.updated)
      }
      closeForm()
    } catch (error) {
      setFormError(getApiErrorMessage(error))
    }
  }

  const handleConfirmStatus = async () => {
    if (!statusTarget) return
    try {
      await updateUserStatus.mutateAsync({
        id: statusTarget.user.id,
        isActive: statusTarget.isActive,
      })
      toast.success(messages.users.statusUpdated)
      setStatusTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const columns = [
      {
        key: 'user',
        header: messages.users.columns.user,
        render: (row) => (
          <div className="min-w-44">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-text">{row.full_name}</p>
              {row.id === currentUser?.id ? (
                <Badge tone="primary">{messages.users.you}</Badge>
              ) : null}
            </div>
            <p dir="ltr" className="text-xs text-text-muted">
              {row.email}
            </p>
          </div>
        ),
      },
      {
        key: 'role',
        header: messages.users.columns.role,
        render: (row) => (
          <Badge tone={row.role === 'ADMIN' ? 'primary' : 'neutral'}>
            {messages.roles[row.role] ?? row.role}
          </Badge>
        ),
      },
      {
        key: 'is_active',
        header: messages.users.columns.status,
        render: (row) => (
          <Badge tone={row.is_active ? 'success' : 'neutral'}>
            {row.is_active ? messages.users.active : messages.users.inactive}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: messages.users.columns.createdAt,
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        header: messages.users.columns.actions,
        align: 'end',
        render: (row) => {
          const isSelf = row.id === currentUser?.id
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => openEdit(row)}
                aria-label={`${messages.users.edit}: ${row.full_name}`}
                title={messages.users.edit}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              {!isSelf ? (
                <button
                  type="button"
                  onClick={() =>
                    setStatusTarget({ user: row, isActive: !row.is_active })
                  }
                  aria-label={`${row.is_active ? messages.users.disable : messages.users.enable}: ${row.full_name}`}
                  title={row.is_active ? messages.users.disable : messages.users.enable}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text"
                >
                  {row.is_active ? (
                    <UserX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          )
        },
      },
  ]

  const pageData = usersQuery.data
  const isEditingSelf =
    formState?.mode === 'edit' && formState.user?.id === currentUser?.id

  return (
    <div>
      <PageHeader
        title={messages.pages.users.title}
        description={messages.pages.users.description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {messages.users.add}
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-3">
          <Input
            label={messages.actions.search}
            placeholder={messages.users.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label={messages.users.roleFilter}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            options={ROLE_FILTER_OPTIONS}
          />
          <Select
            label={messages.users.statusFilter}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        {usersQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.errors.UNKNOWN}
              action={
                <Button variant="secondary" size="sm" onClick={() => usersQuery.refetch()}>
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(usersQuery.error)}
            </Alert>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageData?.items ?? []}
            isLoading={usersQuery.isLoading}
            emptyTitle={messages.users.emptyTitle}
            emptyDescription={messages.users.emptyDescription}
            emptyAction={
              <Button size="sm" onClick={openCreate}>
                {messages.users.add}
              </Button>
            }
          />
        )}

        {pageData && pageData.total > 0 ? (
          <Pagination
            page={pageData.page}
            pageSize={pageData.page_size}
            total={pageData.total}
            onPageChange={setPage}
            disabled={usersQuery.isFetching}
          />
        ) : null}
      </Card>

      <Modal
        open={Boolean(formState)}
        onClose={closeForm}
        title={
          formState?.mode === 'create'
            ? messages.users.form.createTitle
            : messages.users.form.editTitle
        }
      >
        {formState ? (
          <UserForm
            key={`${formState.mode}-${formState.user?.id ?? 'new'}`}
            mode={formState.mode}
            user={formState.user}
            isSelf={isEditingSelf}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            serverError={formError}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.isActive
            ? messages.users.confirmEnableTitle
            : messages.users.confirmDisableTitle
        }
        description={
          statusTarget?.isActive
            ? messages.users.confirmEnableDescription
            : messages.users.confirmDisableDescription
        }
        confirmLabel={
          statusTarget?.isActive ? messages.users.enable : messages.users.disable
        }
        tone={statusTarget?.isActive ? 'primary' : 'danger'}
        loading={updateUserStatus.isPending}
        onConfirm={handleConfirmStatus}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  )
}
