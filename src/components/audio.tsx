export function Audio({ url, className }: { url: string; className?: string }) {
  return <audio controls src={url} className={className} />;
}
