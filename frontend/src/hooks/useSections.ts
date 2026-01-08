import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sectionsApi, templatesApi } from '@/api/sections'
import toast from 'react-hot-toast'

export function useSections(docTypeId?: string) {
  return useQuery({
    queryKey: ['sections', { docTypeId }],
    queryFn: () => sectionsApi.list(docTypeId),
  })
}

export function useSection(id: string) {
  return useQuery({
    queryKey: ['sections', id],
    queryFn: () => sectionsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description: string
      default_order?: number
      applicable_doc_types?: string[]
    }) => sectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      toast.success('Section created')
    },
    onError: () => {
      toast.error('Failed to create section')
    },
  })
}

export function useUpdateSectionDescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, description }: { sectionId: string; description: string }) =>
      sectionsApi.updateDescription(sectionId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['sections-library'] })
    },
  })
}

export function useSectionsLibrary() {
  return useQuery({
    queryKey: ['sections-library'],
    queryFn: () => sectionsApi.listWithTemplates(),
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  })
}

export function useTemplatesLibrary(scope?: 'system' | 'org' | 'all', organizationId?: string) {
  return useQuery({
    queryKey: ['templates-library', scope, organizationId],
    queryFn: () => templatesApi.listWithSections(scope, organizationId),
  })
}

export function useTemplatesByStage(stageId: string | undefined) {
  return useQuery({
    queryKey: ['templates', 'by-stage', stageId],
    queryFn: () => templatesApi.listByStage(stageId!),
    enabled: !!stageId,
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, organizationId }: { data: { name: string; description?: string }; organizationId?: string }) =>
      templatesApi.create(data, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Template created')
    },
    onError: () => {
      toast.error('Failed to create template')
    },
  })
}

export function useSetTemplateDefault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => templatesApi.setDefault(templateId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success(data.is_org_default ? 'Template set as default' : 'Template removed from defaults')
    },
    onError: () => {
      toast.error('Failed to update template default status')
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => templatesApi.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template')
    },
  })
}

// Template section management
export function useAddSectionToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, sectionId, order }: { templateId: string; sectionId: string; order?: number }) =>
      templatesApi.addSection(templateId, sectionId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Section added to template')
    },
    onError: () => {
      toast.error('Failed to add section')
    },
  })
}

export function useRemoveSectionFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, sectionId }: { templateId: string; sectionId: string }) =>
      templatesApi.removeSection(templateId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Section removed from template')
    },
    onError: () => {
      toast.error('Failed to remove section')
    },
  })
}
