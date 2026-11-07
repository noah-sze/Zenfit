import type { ReactNode } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { WelcomeWizard } from '@/components/welcome/WelcomeWizard';

interface SetupGuardProps {
  children: ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { profile, isLoading } = useUserProfile();

  // 資料庫尚未就緒時先不渲染，防止短暫閃爍
  if (isLoading) {
    return null;
  }

  // 尚未完成初始設定時，全螢幕攔截渲染歡迎與設置嚮導
  if (!profile.isSetupCompleted) {
    return <WelcomeWizard />;
  }

  return <>{children}</>;
}
