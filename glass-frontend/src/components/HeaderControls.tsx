import LanguageSelect from "./LanguageSelect";
import { useTranslation } from "react-i18next";
import { t } from "../i18n";
import { UserRound } from "lucide-react";

interface HeaderControlsProps {
  onOpenLogin: () => void;
}

export default function HeaderControls({ onOpenLogin }: HeaderControlsProps) {
  useTranslation();

  return (
    <div className="header-controls">
      <LanguageSelect />

      <button
        type="button"
        className="profile-button"
        aria-label={t("Open login")}
        onClick={onOpenLogin}
      >
        <UserRound size={24} />
      </button>
    </div>
  );
}