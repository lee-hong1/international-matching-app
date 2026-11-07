import Link from 'next/link'

export default function MatchingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Join Free</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">International Matching</h1>
          <p className="text-lg text-gray-500">Connect with people from Korea, Japan, China, and 30+ countries.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            { title: '🇰🇷 Korean Members', desc: 'Connect with Korean singles looking for genuine international relationships.' },
            { title: '🇯🇵 Japanese Members', desc: 'Meet Japanese members who value cultural exchange and deep connections.' },
            { title: '🇨🇳 Chinese Members', desc: 'Discover Chinese singles from mainland China, Taiwan, and Hong Kong.' },
            { title: '🌏 Global Members', desc: 'Members from Southeast Asia, Europe, the Americas, and beyond.' },
          ].map(item => (
            <div key={item.title} className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How Matching Works</h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3"><span className="text-purple-600 font-bold">1.</span> Follow people you're interested in from the Discover page.</li>
            <li className="flex gap-3"><span className="text-purple-600 font-bold">2.</span> When they follow you back, you become a <strong>Match</strong>.</li>
            <li className="flex gap-3"><span className="text-purple-600 font-bold">3.</span> Matches unlock direct messaging and video calls.</li>
            <li className="flex gap-3"><span className="text-purple-600 font-bold">4.</span> Book a 1-on-1 date experience with hosts you connect with.</li>
          </ol>
        </div>
        <div className="text-center">
          <Link href="/discover" className="inline-block bg-purple-600 text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-purple-700 transition-colors">
            Start Discovering 🔍
          </Link>
        </div>
      </main>
    </div>
  )
}
