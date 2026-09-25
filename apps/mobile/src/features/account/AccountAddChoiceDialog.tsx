import { MocomoAlertDialog, type MocomoAlertAction } from "@/ui/MocomoAlertDialog";

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
  const actions: MocomoAlertAction[] = [
    { label: "취소" },
    { label: "새 계정", primary: true, onPress: onCreateNew },
    { label: "계정 추가", primary: true, onPress: onAddExisting },
  ];

  return (
    <MocomoAlertDialog
      visible={visible}
      title="계정 추가"
      message="어떤 작업을 할까요?"
      actions={actions}
      onDismiss={onClose}
      embedded={embedded}
    />
  );
}
