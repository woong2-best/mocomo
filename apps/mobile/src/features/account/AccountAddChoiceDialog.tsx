import { MocomoAlertDialog, type MocomoAlertAction } from "@/ui/MocomoAlertDialog";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddExisting: () => void;
  embedded?: boolean;
};

export function AccountAddChoiceDialog({
  visible,
  onClose,
  onCreateNew,
  onAddExisting,
  embedded = false,
}: Props) {
  const { t } = useI18n();
  const actions: MocomoAlertAction[] = [
    { label: t("toast.cancel") },
    { label: t("m.auth.new_account"), primary: true, onPress: onCreateNew },
    { label: t("m.account.add_account"), primary: true, onPress: onAddExisting },
  ];

  return (
    <MocomoAlertDialog
      visible={visible}
      title={t("m.account.add_account")}
      message={t("m.account.what_would_you_like_to_do")}
      actions={actions}
      onDismiss={onClose}
      embedded={embedded}
    />
  );
}
