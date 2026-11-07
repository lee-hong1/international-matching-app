import Link from 'next/link'

const faqs = [
  { q: 'Is GlobalMatch free to use?', a: 'Basic membership is free. You can browse profiles, follow users, and send limited messages at no cost. Premium membership unlocks unlimited messaging, video calls, and advanced matching features.' },
  { q: 'How is my identity verified?', a: 'We use Veriff, a leading identity verification service. You\'ll need to upload a government-issued ID and take a selfie. Verification typically takes under 5 minutes.' },
  { q: 'Is my personal information safe?', a: 'Yes. Your contact details are never shared with other users. All communications happen within GlobalMatch\'s secure platform. See our Privacy Policy for full details.' },
  { q: 'Can I use GlobalMatch without speaking Korean/Japanese/Chinese?', a: 'Absolutely. The platform is available in Korean, English, Japanese, and Chinese. Many of our members use it specifically to practice a new language.' },
  { q: 'What happens if I meet someone inappropriate?', a: 'Block and report them immediately. Our moderation team reviews every report within 24 hours. Serious violations result in permanent bans.' },
  { q: 'How do I cancel my premium subscription?', a: 'You can cancel anytime from your account settings under Subscription. Your access continues until the end of the billing period.' },
  { q: 'What are "Host Services"?', a: 'Hosts are verified members who offer paid 1-on-1 experiences: video dates, language lessons, cultural tours, and more. Hosts set their own prices and schedules.' },
  { q: 'Are refunds available for bookings?', a: 'Yes, cancellations made 24 hours or more before a booking are fully refunded. Same-day cancellations may receive a 50% refund depending on the host\'s policy.' },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-purple-600">Still have questions? Contact us →</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-12">Everything you need to know about GlobalMatch.</p>
        <div className="space-y-6">
          {faqs.map((item, i) => (
            <details key={i} className="group border border-gray-200 rounded-xl p-5 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-gray-900 list-none">
                {item.q}
                <span className="text-purple-500 text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center p-8 bg-purple-50 rounded-xl">
          <p className="text-gray-700 mb-4">Didn't find your answer?</p>
          <Link href="/contact" className="inline-block bg-purple-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-purple-700">Contact Support</Link>
        </div>
      </main>
    </div>
  )
}
