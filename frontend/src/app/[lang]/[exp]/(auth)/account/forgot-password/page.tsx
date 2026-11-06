import { AuthPage, authMetadata } from '@/features/account/auth-page';
import { type PageParams } from '@/shared/lib/page-params';

export function generateMetadata({ params }: { params: PageParams }) {
  return authMetadata(params, 'forgot');
}

export default function Page({ params }: { params: PageParams }) {
  return <AuthPage params={params} kind="forgot" />;
}
