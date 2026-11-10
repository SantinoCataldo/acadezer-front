/**
 * Punto de entrada del feature de materias.
 * Exporta los componentes y rutas para conectar al router general.
 */
export { SubjectList } from './pages/subject-list/subject-list';
export { SubjectDetail } from './pages/subject-detail/subject-detail';
export { SubjectFormDialog } from './components/subject-form-dialog/subject-form-dialog';
export { DeleteSubjectDialog } from './components/delete-subject-dialog/delete-subject-dialog';
export { subjectRoutes } from './subjects.routes';
export type { SubjectRequest, SubjectResponse } from './models';
