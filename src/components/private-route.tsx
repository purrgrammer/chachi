interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  // Removed: DM functionality no longer available
  return <>{children}</>;
}
