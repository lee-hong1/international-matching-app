import Link from 'next/link'

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/login" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Sign In</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Safety at GlobalMatch</h1>
        <p className="text-lg text-gray-500 mb-12">Your safety is our top priority. Here's how we protect you.</p>
        {[
          { icon: '🪪', title: 'Identity Verification', desc: 'Every member completes ID and selfie verification powered by Veriff. Fake profiles are blocked before they reach you.' },
          { icon: '🔞', title: 'Age Verification', desc: 'Our platform is strictly 18+. We verify age during onboarding and block access to any user who cannot confirm their age.' },
          { icon: '🤖', title: 'AI Moderation', desc: 'Uploaded photos and messages are scanned in real time for inappropriate content, harassment, and policy violations.' },
          { icon: '🚨', title: 'Easy Reporting', desc: 'Block or report any user with one tap. Our team reviews every report within 24 hours and takes action against violators.' },
          { icon: '🔒', title: 'Private by Default', desc: 'Your personal contact information is never shared. All communication happens within our secure platform.' },
          { icon: '📵', title: 'No Off-Platform Contact', desc: 'Hosts who attempt to move conversations off GlobalMatch are immediately suspended to protect you from fraud.' },
        ].map(item => (
          <div key={item.title} className="flex gap-5 mb-8">
            <div className="text-3xl flex-shrink-0">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          </div>
        ))}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">
          <h2 className="font-semibold text-red-800 mb-2">🆘 Emergency? Report immediately</h2>
          <p className="text-red-700 text-sm mb-3">If you feel unsafe or witness a serious violation, contact us immediately.</p>
          <Link href="/contact" className="text-red-600 font-medium text-sm hover:underline">Contact Safety Team →</Link>
        </div>
      </main>
    </div>
  )
}
