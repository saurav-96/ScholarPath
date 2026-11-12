import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { dataService } from '@/services/dataService';
import type {
  CalendarEvent,
  CorrectionReport,
  StudentDocument,
  StudentProfile,
  TrackedApplication,
  UserCollection,
} from '@/types/domain';

export function useCatalogData() {
  const countriesQuery = useQuery({
    queryKey: ['catalog', 'countries'],
    queryFn: () => dataService.fetchCountries(),
    staleTime: 5 * 60 * 1000,
  });

  const universitiesQuery = useQuery({
    queryKey: ['catalog', 'universities'],
    queryFn: () => dataService.fetchUniversities(),
    staleTime: 5 * 60 * 1000,
  });

  const scholarshipsQuery = useQuery({
    queryKey: ['catalog', 'scholarships'],
    queryFn: () => dataService.fetchScholarships(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    countries: countriesQuery.data ?? [],
    universities: universitiesQuery.data ?? [],
    scholarships: scholarshipsQuery.data ?? [],
    isLoading:
      countriesQuery.isLoading || universitiesQuery.isLoading || scholarshipsQuery.isLoading,
    error: countriesQuery.error || universitiesQuery.error || scholarshipsQuery.error,
  };
}

export function useUserWorkspace() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const userStateQuery = useQuery({
    queryKey: ['userState', session.mode, session.userId, session.authenticated],
    queryFn: () => dataService.fetchUserState(session),
    enabled: session.authenticated || session.mode === 'demo',
  });

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ['userState'] });
  };

  const saveProfileMutation = useMutation({
    mutationFn: (profile: StudentProfile) => dataService.saveProfile(session, profile),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Student profile updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not save profile', description: err.message, variant: 'error' });
    },
  });

  const toggleSavedScholarshipMutation = useMutation({
    mutationFn: ({
      scholarshipId,
      collectionId,
      notes,
    }: {
      scholarshipId: string;
      collectionId?: string | null;
      notes?: string;
    }) => dataService.toggleSavedScholarship(session, scholarshipId, collectionId ?? null, notes ?? ''),
    onSuccess: () => {
      invalidateUser();
    },
  });

  const updateSavedMetaMutation = useMutation({
    mutationFn: ({
      savedId,
      collectionId,
      notes,
    }: {
      savedId: string;
      collectionId: string | null;
      notes: string;
    }) => dataService.updateSavedScholarshipMeta(session, savedId, collectionId, notes),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Saved scholarship notes updated', variant: 'success' });
    },
  });

  const toggleSavedUniversityMutation = useMutation({
    mutationFn: ({ universityId, notes }: { universityId: string; notes?: string }) =>
      dataService.toggleSavedUniversity(session, universityId, notes ?? ''),
    onSuccess: () => {
      invalidateUser();
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: (col: Omit<UserCollection, 'id' | 'createdAt'>) =>
      dataService.createCollection(session, col),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Collection created', variant: 'success' });
    },
  });

  const upsertApplicationMutation = useMutation({
    mutationFn: (app: TrackedApplication) => dataService.upsertApplication(session, app),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Application tracker updated', variant: 'success' });
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteApplication(session, id),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Application entry removed', variant: 'info' });
    },
  });

  const upsertDocumentMutation = useMutation({
    mutationFn: (doc: StudentDocument) => dataService.upsertDocument(session, doc),
    onSuccess: () => {
      invalidateUser();
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteDocument(session, id),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Document removed', variant: 'info' });
    },
  });

  const upsertCalendarEventMutation = useMutation({
    mutationFn: (evt: CalendarEvent) => dataService.upsertCalendarEvent(session, evt),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Calendar event saved', variant: 'success' });
    },
  });

  const deleteCalendarEventMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteCalendarEvent(session, id),
    onSuccess: () => {
      invalidateUser();
      pushToast({ title: 'Calendar event deleted', variant: 'info' });
    },
  });

  const submitCorrectionMutation = useMutation({
    mutationFn: (
      report: Omit<CorrectionReport, 'id' | 'status' | 'reviewerNotes' | 'createdAt'>,
    ) => dataService.submitCorrectionReport(session, report),
    onSuccess: () => {
      invalidateUser();
      pushToast({
        title: 'Correction report submitted',
        description: 'Thank you for helping verify official scholarship records.',
        variant: 'success',
      });
    },
  });

  return {
    userState: userStateQuery.data,
    isLoading: userStateQuery.isLoading,
    saveProfile: saveProfileMutation.mutateAsync,
    toggleSavedScholarship: toggleSavedScholarshipMutation.mutateAsync,
    updateSavedMeta: updateSavedMetaMutation.mutateAsync,
    toggleSavedUniversity: toggleSavedUniversityMutation.mutateAsync,
    createCollection: createCollectionMutation.mutateAsync,
    upsertApplication: upsertApplicationMutation.mutateAsync,
    deleteApplication: deleteApplicationMutation.mutateAsync,
    upsertDocument: upsertDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    upsertCalendarEvent: upsertCalendarEventMutation.mutateAsync,
    deleteCalendarEvent: deleteCalendarEventMutation.mutateAsync,
    submitCorrection: submitCorrectionMutation.mutateAsync,
  };
}
