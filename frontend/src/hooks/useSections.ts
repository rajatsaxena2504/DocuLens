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

export function useTemplatesLibrary() {
  return useQuery({
    queryKey: ['templates-library'],
    queryFn: () => templatesApi.listWithSections(),
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
    mutationFn: (data: { name: string; description?: string }) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template created')
    },
    onError: () => {
      toast.error('Failed to create template')
    },
  })
}
