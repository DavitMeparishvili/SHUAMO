import { t, type Messages } from "@/src/modules/localization";

export interface AccountStatusCopy {
  active: string;
  pending: string;
  deactivated: string;
  deactivate: string;
  reactivate: string;
  approve: string;
  deactivateAria: string;
  reactivateAria: string;
  approveAria: string;
  saving: string;
  approved: string;
  reactivated: string;
  deactivatedSuccess: string;
  error: string;
  dialogTitle: string;
  dialogBody: string;
  cancel: string;
  confirmDeactivation: string;
}

export function accountStatusCopy(messages: Messages): AccountStatusCopy {
  return {
    active: t(messages, "admin.accounts.status.active"),
    pending: t(messages, "admin.accounts.status.pending"),
    deactivated: t(messages, "admin.accounts.status.deactivated"),
    deactivate: t(messages, "admin.accounts.action.deactivate"),
    reactivate: t(messages, "admin.accounts.action.reactivate"),
    approve: t(messages, "admin.accounts.action.approve"),
    deactivateAria: t(messages, "admin.accounts.aria.deactivate"),
    reactivateAria: t(messages, "admin.accounts.aria.reactivate"),
    approveAria: t(messages, "admin.accounts.aria.approve"),
    saving: t(messages, "admin.accounts.action.saving"),
    approved: t(messages, "admin.accounts.success.approved"),
    reactivated: t(messages, "admin.accounts.success.reactivated"),
    deactivatedSuccess: t(messages, "admin.accounts.success.deactivated"),
    error: t(messages, "admin.accounts.error"),
    dialogTitle: t(messages, "admin.accounts.dialog.title"),
    dialogBody: t(messages, "admin.accounts.dialog.body"),
    cancel: t(messages, "admin.accounts.dialog.cancel"),
    confirmDeactivation: t(messages, "admin.accounts.dialog.confirm"),
  };
}
