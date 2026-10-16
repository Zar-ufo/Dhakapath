import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { AlertTriangle, ArrowRight, Bot, Bus, CheckCircle2, Clock3, CloudRain, Droplets, Languages, MapPin, MessageCircle, Moon, Navigation, ShieldCheck, Sparkles, Sun, Thermometer, Upload, Users, Volume2 } from 'lucide-react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { answerQuery, type ConversationContext } from './conversation'
import { dmtclExhibitionCenter, dmtclSourceUrl, hubs, segments, type Scenario } from './data'
import { createReport, initialReports, resolveReport, validateReport } from './reports'
import { findRoute, findRouteOptions } from './routing'
import { askTripIntelligence } from './gemini'
import { fetchDhakaWeather, type DhakaWeather, NASA_WEATHER_URL } from './weather'

const modeColor = { bus: '#247c72', metro: '#ef805f', rickshaw: '#c38b35', leguna: '#7b61d1' }
const hubById = new Map(hubs.map((hub) => [hub.id, hub]))

function RouteViewport({ route }: { route: ReturnType<typeof findRoute> }) {
  const map = useMap()
  useEffect(() => {
    if (route?.legs.length) map.fitBounds(route.legs.flatMap((leg) => [[leg.fromHub.lat, leg.fromHub.lng], [leg.toHub.lat, leg.toHub.lng]] as [number, number][]), { padding: [32, 32], maxZoom: 13 })
  }, [map, route])
  return null
}

function StationOriginButton({ hubName, hubId, onSelect }: { hubName: string; hubId: string; onSelect: (hubName: string, hubId: string) => void }) {
  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onSelect(hubName, hubId)
  }
  return <button type="button" data-set-origin={hubId} aria-label={`Set ${hubName} as origin`} onMouseDown={(event) => event.stopPropagation()} onClick={activate} className="mt-2 rounded bg-[#176b61] px-2 py-1 text-xs font-bold text-white">Set as origin</button>
}

function App() {
  const [language, setLanguage] = useState<'en' | 'bn'>(() => localStorage.getItem('dhakapath-language') === 'bn' ? 'bn' : 'en')
  const [from, setFrom] = useState('mirpur-10')
  const [to, setTo] = useState('motijheel')
  const [scenario, setScenario] = useState<Scenario>('clear')
  const [student, setStudent] = useState(true)
  const [reports, setReports] = useState(initialReports.map(validateReport))
  const [reportCategory, setReportCategory] = useState('Waterlogging')
  const [reportTitle, setReportTitle] = useState('')
  const [reportLocation, setReportLocation] = useState('')
  const [reportFilter, setReportFilter] = useState<'active' | 'all'>('active')
  const [query, setQuery] = useState('')
  const [chat, setChat] = useState([{ who: 'bot', text: 'Ask in English or Banglish. Try “Mirpur 10 theke Motijheel jabo, student fare?”' }])
  const [conversationContext, setConversationContext] = useState<ConversationContext>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'gemini' | 'error'>('idle')
  const [aiError, setAiError] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dhakapath-theme') === 'dark')
  const [originNotice, setOriginNotice] = useState('')
  const [voiceNotice, setVoiceNotice] = useState('')
  const [weather, setWeather] = useState<DhakaWeather | null>(null)
  const [weatherError, setWeatherError] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(true)
  useEffect(() => {
    localStorage.setItem('dhakapath-language', language)
  }, [language])
  useEffect(() => {
    const controller = new AbortController()
    fetchDhakaWeather(controller.signal)
      .then(setWeather)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setWeatherError(error instanceof Error ? error.message : 'Weather request failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeatherLoading(false)
      })
    return () => controller.abort()
  }, [])
  const route = useMemo(() => findRoute(from, to, scenario, student), [from, to, scenario, student])
  const routeOptions = useMemo(() => findRouteOptions(from, to, scenario, student), [from, to, scenario, student])
  const copy = language === 'bn' ? {
    plan: 'বহু-ধাপের যাত্রা পরিকল্পনা করুন', from: 'কোথা থেকে', to: 'কোথায়', student: 'শিক্ষার্থী ভাড়া', alerts: 'রাস্তার সতর্কতা', routeOptions: 'রুটের বিকল্প', boarding: 'বোর্ডিং নির্দেশনা', ask: 'ঢাকাপথ এআই-কে জিজ্ঞাসা করুন', send: 'পাঠান', voice: 'রুট শুনুন', active: 'সক্রিয়', all: 'সব ইতিহাস', confidence: 'আস্থার সাথে চলুন', network: 'নেটওয়ার্ক অবস্থা', ready: 'প্রস্তুত', swap: 'শুরু ও গন্তব্য বদলান', map: 'ওপেনস্ট্রিটম্যাপ · শুরু নির্ধারণ করতে হাবে ক্লিক করুন', mapData: 'ওপেনস্ট্রিটম্যাপ মানচিত্র · CSV পরিবহন তথ্য', clear: 'স্বাভাবিক', rain: 'বৃষ্টি', rush: 'ব্যস্ত সময়', blocked: 'বন্ধ রাস্তা', grounded: 'যাচাইকৃত সুপারিশ', noRoute: 'কোনো রুট নেই', fare: 'ভাড়া', transfers: 'ট্রান্সফার', legs: 'ধাপ', noLive: 'এটি লাইভ তথ্য নয়', aiReady: 'পাঠানোর জন্য প্রস্তুত', aiGrounded: 'জেমিনি যাচাইকৃত', aiError: 'এআই সমস্যা', routePrompt: 'রুট, ভাড়া, বৃষ্টি বা সতর্কতা সম্পর্কে জিজ্ঞাসা করুন…', routeOptionsLabel: 'রুটের বিকল্প', history: 'সব ইতিহাস', reportSubmit: 'যাচাইয়ের জন্য প্রতিবেদন পাঠান', activeLabel: 'সক্রিয়',
  } : {
    plan: 'Plan a multi-leg journey', from: 'FROM', to: 'TO', student: 'Student fare', alerts: 'Street alerts', routeOptions: 'Route options', boarding: 'Boarding instructions', ask: 'Ask DhakaPath AI', send: 'Send', voice: 'Hear route', active: 'Active', all: 'All history', confidence: 'Move with confidence', network: 'NETWORK STATUS', ready: 'ready', swap: 'Swap origin and destination', map: 'OpenStreetMap · click a hub to set origin', mapData: 'OpenStreetMap basemap · CSV transit overlays', clear: 'clear', rain: 'rain', rush: 'rush hour', blocked: 'blocked', grounded: 'Grounded recommendation', noRoute: 'No route', fare: 'fare', transfers: 'transfers', legs: 'legs', noLive: 'Not live data', aiReady: 'Ready to send', aiGrounded: 'Gemini grounded', aiError: 'AI error', routePrompt: 'Ask about route, fare, rain, or alerts…', routeOptionsLabel: 'Route options', history: 'All history', reportSubmit: 'Submit report for corroboration', activeLabel: 'Active',
  }

  const askGemini = async () => {
    if (!query.trim() || aiLoading) return
    setAiLoading(true)
    setAiError('')
    const parsedContext = answerQuery(query, conversationContext).context
    setConversationContext(parsedContext)
    if (parsedContext.from) setFrom(parsedContext.from)
    if (parsedContext.to) setTo(parsedContext.to)
    try {
      const answer = await askTripIntelligence(query, route, conversationContext)
      setChat((items) => [...items, { who: 'you', text: query }, { who: 'bot', text: answer }])
      setAiStatus('gemini')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini request failed'
      setAiStatus('error')
      setAiError(message)
      setChat((items) => [...items, { who: 'you', text: query }, { who: 'bot', text: `I could not reach Gemini: ${message}` }])
    } finally {
      setQuery('')
      setAiLoading(false)
    }
  }
  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current
      localStorage.setItem('dhakapath-theme', next ? 'dark' : 'light')
      return next
    })
  }
  const setStationAsOrigin = useCallback((hubName: string, hubId: string) => {
    setFrom(hubId)
    setOriginNotice(language === 'bn' ? `${hubName} আপনার শুরুর স্থান হিসেবে নির্ধারিত হয়েছে` : `${hubName} set as your origin`)
    window.setTimeout(() => setOriginNotice(''), 3000)
  }, [language])
  useEffect(() => {
    const handleOriginClick = (event: globalThis.MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('[data-set-origin]') : null
      const hubId = target?.dataset.setOrigin
      const hub = hubId ? hubById.get(hubId) : undefined
      if (!target || !hub) return
      event.preventDefault()
      event.stopPropagation()
      setStationAsOrigin(hub.name, hub.id)
    }
    document.addEventListener('click', handleOriginClick, true)
    return () => document.removeEventListener('click', handleOriginClick, true)
  }, [setStationAsOrigin])
  const speakRoute = () => {
    if (!route) {
      setVoiceNotice(language === 'bn' ? 'ভয়েসের জন্য একটি বৈধ রুট নির্বাচন করুন' : 'Choose a valid route before using voice guidance')
      return
    }
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setVoiceNotice(language === 'bn' ? 'এই ব্রাউজারে ভয়েস সুবিধা নেই' : 'Voice guidance is not available in this browser')
      return
    }
    const originName = hubById.get(from)?.name ?? from
    const destinationName = hubById.get(to)?.name ?? to
    const names = route.legs.map((leg) => `${leg.fromHub.name} ${language === 'bn' ? 'থেকে' : 'to'} ${leg.toHub.name}`).join(language === 'bn' ? ', তারপর ' : ', then ')
    const text = language === 'bn'
      ? `আপনার যাত্রা ${originName} থেকে ${destinationName}। রুট: ${names}। মোট সময় ${route.totalMinutes} মিনিট এবং ভাড়া ${route.totalFare} টাকা।`
      : `Your journey is from ${originName} to ${destinationName}. Route: ${names}. Total time is ${route.totalMinutes} minutes and fare is ${route.totalFare} taka.`
    const utterance = new SpeechSynthesisUtterance(text)
    const speechLanguage = language === 'bn' ? 'bn-BD' : 'en-US'
    utterance.lang = speechLanguage
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = language === 'bn'
      ? voices.find((voice) => /^bn(?:-|_)/i.test(voice.lang) || /bangla|bengali/i.test(voice.name))
      : voices.find((voice) => /^en(?:-|_)/i.test(voice.lang))
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.onstart = () => setVoiceNotice(language === 'bn' ? `${originName} থেকে ${destinationName} বলা হচ্ছে` : `Speaking route from ${originName} to ${destinationName}`)
    utterance.onend = () => setVoiceNotice('')
    utterance.onerror = () => setVoiceNotice(language === 'bn' ? 'ভয়েস চালানো যায়নি' : 'Voice playback failed')
    window.speechSynthesis.cancel()
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utterance)
    setVoiceNotice(language === 'bn' ? `${originName} থেকে ${destinationName} বাজানো হচ্ছে` : `Playing route from ${originName} to ${destinationName}`)
  }
  const corroborate = (id: string) => setReports((items) => items.map((report) => report.id === id ? validateReport({ ...report, corroborations: report.corroborations + 1 }) : report))
  const resolve = (id: string) => setReports((items) => items.map((report) => report.id === id ? resolveReport(report) : report))
  const addReport = () => {
    if (!reportTitle.trim() || !reportLocation.trim()) return
    const report = createReport(reportTitle, reportLocation, reportCategory)
    setReports((items) => [report, ...items])
    setReportTitle('')
    setReportLocation('')
  }
  const visibleReports = reports.filter((report) => reportFilter === 'all' || (report.status !== 'resolved' && report.status !== 'stale'))

  return <div className={`app-shell min-h-screen ${darkMode ? 'dark-mode' : ''}`}>
    <header className="app-header border-b border-[#d9e5e1] bg-[#f8fbfa]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#176b61] text-white"><Navigation size={21} /></div><div><div className="text-xl font-extrabold tracking-tight text-[#123d3a]">Dhaka<span className="text-[#ec7a5a]">Path</span></div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6d8981]">{language === 'bn' ? 'স্মার্ট নগর পরিবহন' : 'Live urban transit intelligence'}</div></div></div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#648079]"><span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full bg-[#38a879]" /> CSV transit source</span><span className="hidden sm:inline">INIF 2026</span><button type="button" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} aria-label="Change language" className="rounded-lg border border-[#d9e5e1] bg-white p-2 text-[#176b61] shadow-sm"><Languages size={16} /></button><button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="rounded-lg border border-[#d9e5e1] bg-white p-2 text-[#176b61] shadow-sm">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button></div>
      </div>
      {originNotice && <div role="status" className="mx-5 mb-4 rounded-lg border border-[#b9d4cc] bg-[#edf6f3] px-3 py-2 text-xs font-bold text-[#176b61]">{originNotice}. Choose a destination to update the route.</div>}
    </header>
    <main className="app-main mx-auto max-w-[1440px] px-5 py-6 lg:px-10">
      <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#ec7a5a]">{copy.confidence}</p><h1 className="text-3xl font-extrabold tracking-tight text-[#163c3a] sm:text-4xl">{language === 'bn' ? <>শহর একটি নেটওয়ার্ক।<br /><span className="text-[#176b61]">আপনার রুটও তাই।</span></> : <>The city is a network.<br /><span className="text-[#176b61]">Your route should be too.</span></>}</h1></div><div className="rounded-xl border border-[#dbe7e2] bg-white px-4 py-3 text-xs text-[#638078] shadow-sm"><div className="font-bold text-[#355c55]">{copy.network}</div><div className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#39a879]" /> {hubs.length} {language === 'bn' ? 'হাব' : 'hubs'} · {segments.length} {language === 'bn' ? 'সংযোগ' : 'links'} · {copy.ready}</div></div></section>
      <section className="mb-6 rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><CloudRain size={18} className="text-[#176b61]" /><h2 className="font-extrabold text-[#234944]">{language === 'bn' ? 'ঢাকার আবহাওয়া' : 'Dhaka weather'}</h2></div><p className="mt-1 text-xs text-[#7b948d]">{language === 'bn' ? 'NASA POWER দৈনিক ডেটা · ২৩.৭২৮°N, ৯০.৪১২°E' : 'NASA POWER daily data · 23.728°N, 90.412°E'}</p></div>
          <a href={NASA_WEATHER_URL} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#176b61] underline">{language === 'bn' ? 'উৎস দেখুন' : 'View source'}</a>
        </div>
        {weatherLoading && <p className="mt-4 text-xs text-[#80968f]">{language === 'bn' ? 'আবহাওয়ার তথ্য লোড হচ্ছে…' : 'Loading weather…'}</p>}
        {weatherError && <p className="mt-4 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a94432]">{language === 'bn' ? 'আবহাওয়ার তথ্য পাওয়া যায়নি' : 'Weather unavailable'}: {weatherError}</p>}
        {weather && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-[#f5f9f7] p-3"><Thermometer size={15} className="text-[#ec7a5a]" /><div className="mt-2 text-xl font-extrabold text-[#234944]">{weather.temperature.toFixed(1)}°C</div><div className="text-[10px] text-[#80968f]">{language === 'bn' ? 'গড় তাপমাত্রা' : 'Average temperature'}</div></div>
          <div className="rounded-xl bg-[#f5f9f7] p-3"><Sun size={15} className="text-[#c38b35]" /><div className="mt-2 text-xl font-extrabold text-[#234944]">{weather.maxTemperature.toFixed(1)}° / {weather.minTemperature.toFixed(1)}°</div><div className="text-[10px] text-[#80968f]">{language === 'bn' ? 'সর্বোচ্চ / সর্বনিম্ন' : 'High / low'}</div></div>
          <div className="rounded-xl bg-[#f5f9f7] p-3"><CloudRain size={15} className="text-[#176b61]" /><div className="mt-2 text-xl font-extrabold text-[#234944]">{weather.precipitation.toFixed(1)} mm</div><div className="text-[10px] text-[#80968f]">{language === 'bn' ? 'বৃষ্টিপাত' : 'Precipitation'}</div></div>
          <div className="rounded-xl bg-[#f5f9f7] p-3"><Droplets size={15} className="text-[#7b61d1]" /><div className="mt-2 text-xl font-extrabold text-[#234944]">{weather.humidity.toFixed(0)}%</div><div className="text-[10px] text-[#80968f]">{language === 'bn' ? 'আপেক্ষিক আর্দ্রতা' : 'Relative humidity'}</div></div>
          <div className="rounded-xl bg-[#f5f9f7] p-3"><div className="text-[10px] font-bold uppercase text-[#80968f]">{language === 'bn' ? 'ডেটার তারিখ' : 'Data date'}</div><div className="mt-2 text-xl font-extrabold text-[#234944]">{weather.date}</div><div className="text-[10px] text-[#80968f]">{language === 'bn' ? 'লাইভ পূর্বাভাস নয়' : 'Not a live forecast'}</div></div>
        </div>}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="overflow-hidden rounded-2xl border border-[#d9e5e1] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6efeb] px-5 py-4"><div><h2 className="font-extrabold text-[#234944]">{copy.plan}</h2><p className="text-xs text-[#7b948d]">{language === 'bn' ? 'বাস, MRT-6, লেগুনা ও সংযোগ রিকশার CSV-ভিত্তিক রুট' : 'CSV-grounded routes across bus, MRT-6, leguna and connector rickshaw'}</p></div><label className="flex items-center gap-2 text-xs font-bold text-[#54746c]"><input type="checkbox" checked={student} onChange={(e) => setStudent(e.target.checked)} className="accent-[#176b61]" /> {copy.student}</label></div>
          <div className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-bold text-[#69837c]">{copy.from}<select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dce9e4] bg-[#f8fbfa] p-3 text-sm font-semibold text-[#234944] outline-none focus:border-[#176b61]">{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label><label className="text-xs font-bold text-[#69837c]">{copy.to}<select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dce9e4] bg-[#f8fbfa] p-3 text-sm font-semibold text-[#234944] outline-none focus:border-[#176b61]">{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label><div className="flex items-end"><button type="button" onClick={() => { const next = from; setFrom(to); setTo(next) }} aria-label="Swap origin and destination" className="rounded-lg bg-[#ecf5f2] p-3 text-[#176b61]"><ArrowRight className="rotate-180" /></button></div></div>
          <div className="relative mx-5 mb-5 h-[410px] overflow-hidden rounded-xl border border-[#bcd9d0] bg-[#dbece6]">
            <MapContainer center={[23.79, 90.395]} zoom={12} minZoom={11} maxZoom={16} scrollWheelZoom className="h-full w-full" zoomControl={false}>
              <RouteViewport route={route} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ZoomControl position="bottomright" />
              {segments.filter((segment) => segment.from < segment.to).map((segment) => { const a = hubById.get(segment.from)!; const b = hubById.get(segment.to)!; return <Polyline key={segment.id} positions={[[a.lat, a.lng], [b.lat, b.lng]]} pathOptions={{ color: modeColor[segment.mode], weight: 3, opacity: .2, dashArray: segment.mode === 'rickshaw' ? '4 6' : undefined }} /> })}
              {route?.legs.map((leg) => <Polyline key={`route-${leg.id}`} positions={[[leg.fromHub.lat, leg.fromHub.lng], [leg.toHub.lat, leg.toHub.lng]]} pathOptions={{ color: modeColor[leg.mode], weight: 8, opacity: .9 }} />)}
              {hubs.map((hub) => <CircleMarker key={hub.id} center={[hub.lat, hub.lng]} radius={hub.id === from || hub.id === to ? 10 : 6} pathOptions={{ color: '#fff', weight: 2, fillColor: hub.id === from ? '#ec7a5a' : hub.id === to ? '#7b61d1' : '#176b61', fillOpacity: .95 }}><Popup><strong>{hub.name}</strong><br />{hub.landmark}{hub.metro && <div className="mt-2 max-w-[260px] border-t border-[#d9e5e1] pt-2 text-xs"><strong>{hub.metro.line} · {hub.metro.operator}</strong><br />{hub.metro.stationNote}<div className="mt-2 font-semibold">DMTCL visitor information</div><div>{dmtclExhibitionCenter.name}</div><div>{dmtclExhibitionCenter.address}</div><div>Hours: {dmtclExhibitionCenter.hours}</div><div>Closed: {dmtclExhibitionCenter.weeklyClosure}</div><div>Entry: {dmtclExhibitionCenter.entry}</div><div className="mt-1"><a href={`tel:${dmtclExhibitionCenter.phone}`} className="font-bold text-[#176b61]">{dmtclExhibitionCenter.phone}</a><br /><a href={`mailto:${dmtclExhibitionCenter.email}`} className="text-[#176b61]">{dmtclExhibitionCenter.email}</a></div><a href={dmtclSourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#176b61] underline">Official DMTCL source</a></div>}<StationOriginButton hubName={hub.name} hubId={hub.id} onSelect={setStationAsOrigin} /></Popup></CircleMarker>)}
              <CircleMarker center={[23.7578, 90.3884]} radius={13} pathOptions={{ color: '#e87554', weight: 2, fillColor: '#f8a088', fillOpacity: .28, dashArray: '5 5' }}><Popup><strong>Simulated Farmgate alert</strong><br />Scenario-controlled waterlogging / blockage zone.</Popup></CircleMarker>
            </MapContainer>
            <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#4f766d] shadow-sm"><MapPin size={12} className="mr-1 inline" />{copy.map}</div>
            <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/90 px-3 py-2 text-[10px] font-bold text-[#54746c] shadow-sm">{copy.mapData}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6efeb] bg-[#f8fbfa] px-5 py-4"><div className="flex gap-4 text-xs text-[#5d7972]"><span><i className="mr-1 inline-block h-2 w-5 rounded bg-[#247c72]" />Bus</span><span><i className="mr-1 inline-block h-2 w-5 rounded bg-[#ef805f]" />Metro</span><span><i className="mr-1 inline-block h-2 w-5 rounded bg-[#c38b35]" />{language === 'bn' ? 'রিকশা' : 'Rickshaw'}</span></div><div className="flex gap-2">{(['clear', 'rain', 'rush', 'blocked'] as Scenario[]).map((item) => <button key={item} onClick={() => setScenario(item)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${scenario === item ? 'bg-[#176b61] text-white' : 'bg-white text-[#5b7770] ring-1 ring-[#d9e5e1]'}`}>{item === 'rain' && <CloudRain size={12} className="mr-1 inline" />}{item === 'blocked' && <AlertTriangle size={12} className="mr-1 inline" />}{copy[item]}</button>)}</div></div>
        </section>
        <div className="space-y-5">
          <section className="rounded-2xl bg-[#176b61] p-5 text-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#a7d6cb]">{copy.grounded}</p><h2 className="mt-1 text-2xl font-extrabold">{route ? `${route.totalMinutes} ${language === 'bn' ? 'মিনিট' : 'min'}` : copy.noRoute}</h2></div><div className="flex items-center gap-2"><button type="button" onClick={speakRoute} title={copy.voice} className="rounded-xl bg-white/15 p-3 hover:bg-white/25 disabled:opacity-40"><Volume2 size={20} /></button><div className="rounded-xl bg-white/10 p-3"><Bus /></div></div></div>{voiceNotice && <div role="status" className="mb-3 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold">{voiceNotice}</div>}{route && <><div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-semibold">{route.legs.map((leg, index) => <span key={leg.id} className="flex items-center gap-2">{index > 0 && <ArrowRight size={14} className="text-[#a7d6cb]" />}<span className="rounded-md bg-white/15 px-2 py-1">{leg.fromHub.shortName}</span></span>)}<ArrowRight size={14} /><span className="rounded-md bg-[#ec7a5a] px-2 py-1">{hubById.get(to)?.shortName}</span></div><div className="grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center"><div><div className="text-xl font-extrabold">BDT {route.totalFare}</div><div className="text-[10px] uppercase text-[#a7d6cb]">{student ? 'student fare' : 'regular fare'}</div></div><div><div className="text-xl font-extrabold">{route.transfers}</div><div className="text-[10px] uppercase text-[#a7d6cb]">transfers</div></div><div><div className="text-xl font-extrabold">{route.legs.length}</div><div className="text-[10px] uppercase text-[#a7d6cb]">legs</div></div></div><div className="mt-4 space-y-1 border-t border-white/15 pt-3 text-[11px] text-[#d5ebe5]">{route.fareBreakdown.map((fare, index) => <div key={`${fare.mode}-${index}`} className="flex justify-between"><span className="capitalize">{fare.mode} · {fare.note}</span><span>BDT {fare.charged}{fare.charged !== fare.regular && <span className="ml-1 text-[#a7d6cb]">(base {fare.regular})</span>}</span></div>)}</div></>}</section>
          <section className="rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-[#234944]">Route options</h2><span className="text-[10px] font-bold uppercase text-[#80968f]">{routeOptions.length} grounded option{routeOptions.length === 1 ? '' : 's'}</span></div><div className="space-y-2">{routeOptions.map((option, index) => <div key={`${option.scenario}-${index}`} className="rounded-lg bg-[#f5f9f7] p-3 text-xs"><div className="flex items-center justify-between font-bold text-[#365c55]"><span>{index === 0 ? 'Fastest route' : `Alternative ${index}`}</span><span>BDT {option.totalFare} · {option.totalMinutes} min</span></div><div className="mt-1 text-[#80968f]">{option.legs.map((leg) => `${leg.fromHub.shortName} → ${leg.toHub.shortName} (${leg.mode})`).join(' · ')}</div></div>)}</div></section>
          <section className="rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-[#234944]">Boarding instructions</h2><span className="text-[10px] font-bold uppercase text-[#80968f]">tap-ready demo guidance</span></div><div className="space-y-2">{route?.legs.map((leg, index) => <div key={`guide-${leg.id}`} className="flex gap-3 rounded-lg bg-[#f5f9f7] p-3 text-xs"><div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#176b61] font-bold text-white">{index + 1}</div><div><div className="font-bold capitalize text-[#365c55]">{leg.mode}: board at {leg.fromHub.name}</div><div className="mt-1 text-[#80968f]">Use {leg.fromHub.landmark}. Ride to {leg.toHub.name}; estimated ride {leg.minutes} min + {leg.waitMinutes} min wait.</div></div></div>)}</div></section>
          <section className="rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-[#234944]">Street alerts <span className="ml-1 rounded-full bg-[#fff1ec] px-2 py-0.5 text-[10px] text-[#d86b4d]">community reports</span></h2><div className="mt-2 flex gap-1"><button onClick={() => setReportFilter('active')} className={`rounded-full px-2 py-1 text-[10px] font-bold ${reportFilter === 'active' ? 'bg-[#176b61] text-white' : 'bg-[#edf6f3] text-[#54746c]'}`}>Active</button><button onClick={() => setReportFilter('all')} className={`rounded-full px-2 py-1 text-[10px] font-bold ${reportFilter === 'all' ? 'bg-[#176b61] text-white' : 'bg-[#edf6f3] text-[#54746c]'}`}>All history</button></div></div><ShieldCheck size={19} className="text-[#39a879]" /></div><div className="space-y-3">{visibleReports.slice(0, 4).map((report) => <div key={report.id} className="flex items-start gap-3 border-b border-[#edf2ef] pb-3 last:border-0 last:pb-0"><div className={`mt-1 rounded-lg p-2 ${report.status === 'stale' ? 'bg-[#f1f2f2] text-[#8ca09b]' : report.status === 'corroborated' ? 'bg-[#e5f4ee] text-[#2d9a6d]' : 'bg-[#fff1ec] text-[#d86b4d]'}`}><AlertTriangle size={14} /></div><div className="min-w-0 flex-1"><div className="text-sm font-bold text-[#365c55]">{report.title}</div><div className="text-[11px] text-[#80968f]"><MapPin size={11} className="mr-1 inline" />{report.location} · {report.status} · {report.corroborations} confirms</div></div>{report.status === 'pending' && <div className="flex gap-1"><button onClick={() => corroborate(report.id)} className="rounded-md bg-[#edf6f3] px-2 py-1 text-[10px] font-bold text-[#176b61]">+ verify</button><button onClick={() => resolve(report.id)} className="rounded-md bg-[#f1f5f3] px-2 py-1 text-[10px] font-bold text-[#54746c]">resolve</button></div>}</div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="rounded-lg border border-[#dce9e4] bg-[#f8fbfa] p-2 text-xs"><option>Waterlogging</option><option>Gridlock</option><option>Blockade</option><option>Safety</option><option>Crowding</option></select><input value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} placeholder="Location / hub" className="rounded-lg border border-[#dce9e4] bg-[#f8fbfa] p-2 text-xs" /><input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="What is happening?" className="rounded-lg border border-[#dce9e4] bg-[#f8fbfa] p-2 text-xs sm:col-span-2" /></div><button onClick={addReport} disabled={!reportTitle.trim() || !reportLocation.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#b9d4cc] py-2 text-xs font-bold text-[#176b61] hover:bg-[#f3f9f7] disabled:cursor-not-allowed disabled:opacity-50"><Upload size={14} /> Submit report for corroboration</button></section>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="chat-card rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle size={19} className="text-[#ec7a5a]" /><h2 className="font-extrabold text-[#234944]">Ask DhakaPath AI</h2></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${aiStatus === 'gemini' ? 'bg-[#e8f7ef] text-[#228a5d]' : aiStatus === 'error' ? 'bg-[#fff0ed] text-[#c6533d]' : 'bg-[#eef4f2] text-[#628078]'}`}><Bot size={11} className="mr-1 inline" />{aiStatus === 'gemini' ? 'Gemini grounded' : aiStatus === 'error' ? 'AI error' : 'Ready to send'}</span></div><div className="mb-3 h-28 space-y-2 overflow-y-auto rounded-lg bg-[#f5f9f7] p-3 text-xs">{chat.slice(-3).map((item, i) => <div key={i} className={item.who === 'you' ? 'text-right text-[#176b61]' : 'text-[#55746c]'}><span className="inline-block rounded-lg bg-white px-2 py-1 shadow-sm">{item.text}</span></div>)}</div>{aiError && <div className="mb-3 rounded-lg bg-[#fff0ed] px-3 py-2 text-[11px] text-[#a94432]">Gemini configuration: {aiError}</div>}<div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askGemini()} placeholder="Ask about route, fare, rain, or alerts..." className="min-w-0 flex-1 rounded-lg border border-[#dce9e4] px-3 py-2 text-xs outline-none focus:border-[#176b61]" /><button onClick={askGemini} disabled={aiLoading || !query.trim()} className="rounded-lg bg-[#ec7a5a] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><Sparkles size={13} className="mr-1 inline" />{aiLoading ? 'Sending…' : 'Send'}</button></div><p className="mt-2 text-[10px] text-[#81978f]">Gemini receives this trip context and the grounded local route only. Press Enter to send.</p></section>
        <section className="rounded-2xl border border-[#d9e5e1] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-extrabold text-[#234944]">Trip intelligence</h2><p className="text-xs text-[#80968f]">Every leg is checked against the local graph</p></div><Users size={20} className="text-[#176b61]" /></div><div className="grid gap-3 sm:grid-cols-3"><div className="theme-metric-card rounded-xl bg-[#f4f9f7] p-4"><Clock3 className="mb-2 text-[#176b61]" size={18} /><div className="text-lg font-extrabold text-[#234944]">{route?.legs.reduce((sum, leg) => sum + leg.minutes, 0) ?? 0} min</div><div className="text-xs text-[#80968f]">in-vehicle time</div></div><div className="theme-status-card rounded-xl bg-[#fff7f3] p-4"><CheckCircle2 className="mb-2 text-[#ec7a5a]" size={18} /><div className="text-lg font-extrabold text-[#234944]">{scenario === 'blocked' ? 'rerouted' : 'verified'}</div><div className="text-xs text-[#80968f]">{scenario === 'blocked' ? 'blocked link avoided' : 'connection checked'}</div></div><div className="theme-metric-card rounded-xl bg-[#f4f9f7] p-4"><Bus className="mb-2 text-[#176b61]" size={18} /><div className="text-lg font-extrabold text-[#234944]">BDT 10</div><div className="text-xs text-[#80968f]">minimum student bus fare</div></div></div></section>
      </div>
    </main>
  </div>
}

export default App
