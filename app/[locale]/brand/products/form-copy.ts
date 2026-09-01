import type { ProductFormCopy } from "@/src/modules/catalog";
import { t, type Messages } from "@/src/modules/localization";

export function formCopy(messages: Messages): ProductFormCopy {
  return {
    sku: t(messages, "catalog.field.sku"),
    title: t(messages, "catalog.field.title"),
    description: t(messages, "catalog.field.description"),
    price: t(messages, "catalog.field.price"),
    backlink: t(messages, "catalog.field.backlink"),
    rateType: t(messages, "catalog.field.rateType"),
    percent: t(messages, "catalog.rate.percent"),
    fixed: t(messages, "catalog.rate.fixed"),
    commission: t(messages, "catalog.field.commission"),
    storedFraction: t(messages, "catalog.rate.storedFraction"),
    estimateSale: t(messages, "catalog.rate.estimateSale"),
    estimateEarnings: t(messages, "catalog.rate.estimateEarnings"),
    addImage: t(messages, "catalog.image.add"),
    imageTypes: t(messages, "catalog.image.types"),
    imageAfterPublishTitle: t(messages, "catalog.image.afterPublishTitle"),
    imageAfterPublishBody: t(messages, "catalog.image.afterPublishBody"),
    uploadFailed: t(messages, "catalog.image.failed"),
    fileTooLarge: t(messages, "catalog.image.tooLarge"),
    retry: t(messages, "catalog.image.retry"),
    uploading: t(messages, "catalog.image.uploading"),
    publish: t(messages, "catalog.publish"),
    save: t(messages, "catalog.save"),
    archive: t(messages, "catalog.archive"),
    warningTitle: t(messages, "catalog.rate.warningTitle"),
    warningBody: t(messages, "catalog.rate.warningBody"),
  };
}
