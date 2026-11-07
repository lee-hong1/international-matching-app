import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Join Free</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About GlobalMatch</h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          GlobalMatch is an international dating platform connecting people from Korea, Japan, China, and beyond.
          We believe that meaningful relationships transcend borders, and our mission is to make cross-cultural connections
          safe, exciting, and genuine.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: '🌏', title: 'Global Community', desc: 'Members across 30+ countries, sharing cultures and building real connections.' },
            { icon: '🛡️', title: 'Safety First', desc: 'ID verification, real-time moderation, and 24/7 support keep our platform secure.' },
            { icon: '💎', title: 'Premium Experience', desc: 'Curated profiles, video calls, and expert matchmaking services for serious connections.' },
          ].map(item => (
            <div key={item.title} className="text-center p-6 rounded-xl bg-purple-50">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to find your match?</h2>
          <p className="mb-6 opacity-90">Join thousands of members who found their special someone.</p>
          <Link href="/signup" className="inline-block bg-white text-purple-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            Start Free Today
          </Link>
        </div>
      </main>
    </div>
  )
}
