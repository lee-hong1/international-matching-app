import Link from 'next/link'

const steps = [
  { num: '01', title: 'Create Your Profile', desc: 'Sign up and build a compelling profile with photos, interests, and what you\'re looking for in a partner.', icon: '✍️' },
  { num: '02', title: 'Get Verified', desc: 'Complete ID and photo verification to build trust and unlock full access to the platform.', icon: '✅' },
  { num: '03', title: 'Discover People', desc: 'Browse curated profiles from Korea, Japan, China and 30+ countries filtered by your preferences.', icon: '🔍' },
  { num: '04', title: 'Follow & Match', desc: 'Follow people who interest you. When they follow back, you become a match and can chat freely.', icon: '💞' },
  { num: '05', title: 'Chat & Connect', desc: 'Send messages, share photos, and video call within our secure platform. All conversations are protected.', icon: '💬' },
  { num: '06', title: 'Book a Service', desc: 'Take it further with a 1-on-1 video date, language exchange, or cultural experience with a host.', icon: '📅' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Get Started</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How GlobalMatch Works</h1>
          <p className="text-lg text-gray-500">From sign-up to your first date in 6 simple steps.</p>
        </div>
        <div className="space-y-8 mb-14">
          {steps.map(step => (
            <div key={step.num} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl">{step.icon}</div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-purple-500 tracking-widest">{step.num}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/signup" className="inline-block bg-purple-600 text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-purple-700 transition-colors shadow-lg">
            Start Your Journey 💕
          </Link>
        </div>
      </main>
    </div>
  )
}
