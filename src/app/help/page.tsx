import Link from 'next/link'

const topics = [
  { icon: '🚀', title: 'Getting Started', items: ['Creating your account', 'Setting up your profile', 'Uploading photos', 'Completing verification'] },
  { icon: '💞', title: 'Matching & Connections', items: ['How follows work', 'What is a match?', 'Messaging matches', 'Video calls'] },
  { icon: '📅', title: 'Bookings & Services', items: ['Finding host services', 'Making a booking', 'Cancellation policy', 'Refund requests'] },
  { icon: '💳', title: 'Payments & Premium', items: ['Premium membership benefits', 'Payment methods', 'Managing subscription', 'Billing issues'] },
  { icon: '🛡️', title: 'Safety & Privacy', items: ['Blocking users', 'Reporting abuse', 'Privacy settings', 'Account security'] },
  { icon: '⚙️', title: 'Account Settings', items: ['Changing your language', 'Updating email/password', 'Deleting your account', 'Data export (GDPR)'] },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/contact" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Contact Us</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-gray-500">Find answers, guides, and support for GlobalMatch.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {topics.map(topic => (
            <div key={topic.title} className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
              <div className="text-3xl mb-3">{topic.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-3">{topic.title}</h3>
              <ul className="space-y-1.5">
                {topic.items.map(item => (
                  <li key={item} className="text-sm text-purple-600 hover:underline cursor-pointer">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Still need help?</h2>
          <p className="text-gray-600 mb-6">Our support team is available in Korean, English, Japanese, and Chinese.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700">Contact Support</Link>
            <Link href="/faq" className="px-6 py-3 border border-purple-600 text-purple-600 font-medium rounded-lg hover:bg-purple-50">View FAQ</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
