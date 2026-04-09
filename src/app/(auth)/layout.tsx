export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
