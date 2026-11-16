import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';

interface SetupGuardProps {
  children: ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { profile, isLoading } = useUserProfile();

  // 資料庫尚未就緒時先不渲染，防止短暫閃爍
  if (isLoading) {
    return null;
  }

  // 尚未完成初始設定時，安全重定向回落地頁由首頁引導輸入
  if (!profile.isSetupCompleted) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
