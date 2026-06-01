import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
        Error 404
      </p>
      <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
        Page Not Found
      </h1>
      <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
        The page you&#39;re looking for doesn&#39;t exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/categories"
          className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          Browse Categories
        </Link>
      </div>
    </main>
  )
}
