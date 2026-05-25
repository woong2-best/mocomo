export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">{children}</div>;
}
