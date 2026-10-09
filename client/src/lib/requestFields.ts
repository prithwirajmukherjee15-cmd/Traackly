import type { FieldsBody } from './api';
import type { RequestFields, TrackRequest } from './types';
import { fieldErrors, requestSchema } from './validation';

export const EMPTY_FIELDS: RequestFields = {
  clientName: '',
  requirementDetails: '',
  targetDepartment: '',
  priority: 'normal',
};

export const fieldsOf = (r: TrackRequest): RequestFields => ({
  clientName: r.clientName,
  requirementDetails: r.requirementDetails,
  targetDepartment: r.targetDepartment,
  priority: r.priority,
});

export const validateFields = (f: RequestFields) => fieldErrors(requestSchema.safeParse(f));

export const toBody = (f: RequestFields): FieldsBody => ({
  clientName: f.clientName.trim(),
  requirementDetails: f.requirementDetails.trim(),
  targetDepartment: f.targetDepartment,
  priority: f.priority,
});

export const sameFields = (a: RequestFields, b: RequestFields) =>
  a.clientName.trim() === b.clientName.trim() &&
  a.requirementDetails.trim() === b.requirementDetails.trim() &&
  a.targetDepartment === b.targetDepartment &&
  a.priority === b.priority;
