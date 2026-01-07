import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  Crown,
  Edit3,
  Eye,
  MoreHorizontal,
  Trash2,
  Loader2,
} from 'lucide-react'
import Button from '@/components/common/Button'
import {
  useProjectMembers,
  useUpdateProjectMember,
  useRemoveProjectMember,
} from '@/hooks/useSDLCProjects'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'
import type { ProjectMember, ProjectRole } from '@/types'

interface ProjectMembersPanelProps {
  projectId: string
  onAddMember: () => void
}

const roleIcons: Record<ProjectRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  editor: <Edit3 className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
}

const roleColors: Record<ProjectRole, string> = {
  owner: 'bg-amber-100 text-amber-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
}

export default function ProjectMembersPanel({
  projectId,
  onAddMember,
}: ProjectMembersPanelProps) {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useProjectMembers(projectId)

  // Check if current user is owner
  const currentUserMember = members.find((m) => m.user?.id === user?.id)
  const isOwner = currentUserMember?.role === 'owner'

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Team
          </h2>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          Team ({members.length})
        </h2>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddMember}
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          >
            Add
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">No members yet</p>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onAddMember}
              leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            >
              Add First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                projectId={projectId}
                isCurrentUser={member.user?.id === user?.id}
                canManage={isOwner}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

interface MemberRowProps {
  member: ProjectMember
  projectId: string
  isCurrentUser: boolean
  canManage: boolean
}

function MemberRow({ member, projectId, isCurrentUser, canManage }: MemberRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const updateMember = useUpdateProjectMember()
  const removeMember = useRemoveProjectMember()

  const handleRoleChange = (newRole: ProjectRole) => {
    updateMember.mutate(
      { projectId, memberId: member.id, data: { role: newRole } },
      {
        onSuccess: () => {
          toast.success(`Role updated to ${newRole}`)
          setShowMenu(false)
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to update role')
        },
      }
    )
  }

  const handleRemove = () => {
    if (
      confirm(
        isCurrentUser
          ? 'Are you sure you want to leave this project?'
          : `Remove ${member.user?.name || member.user?.email} from this project?`
      )
    ) {
      removeMember.mutate(
        { projectId, memberId: member.id },
        {
          onSuccess: () => {
            toast.success(isCurrentUser ? 'Left project' : 'Member removed')
          },
          onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove member')
          },
        }
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-medium">
          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {member.user?.name || member.user?.email}
            {isCurrentUser && <span className="text-slate-400 ml-1">(you)</span>}
          </p>
          {member.user?.name && (
            <p className="text-xs text-slate-400">{member.user?.email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            roleColors[member.role]
          )}
        >
          {roleIcons[member.role]}
          {member.role}
        </span>

        {(canManage || isCurrentUser) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg bg-white border border-slate-200 shadow-lg py-1"
                  >
                    {canManage && !isCurrentUser && (
                      <>
                        <p className="px-3 py-1.5 text-xs font-medium text-slate-400">
                          Change role
                        </p>
                        {(['owner', 'editor', 'viewer'] as ProjectRole[]).map(
                          (role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(role)}
                              disabled={
                                member.role === role || updateMember.isPending
                              }
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                                member.role === role
                                  ? 'bg-slate-50 text-slate-400 cursor-default'
                                  : 'text-slate-700 hover:bg-slate-50'
                              )}
                            >
                              {roleIcons[role]}
                              <span className="capitalize">{role}</span>
                            </button>
                          )
                        )}
                        <div className="border-t border-slate-100 my-1" />
                      </>
                    )}
                    <button
                      onClick={handleRemove}
                      disabled={removeMember.isPending}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-error-600 hover:bg-error-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isCurrentUser ? 'Leave' : 'Remove'}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
