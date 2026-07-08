import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Star, ShieldAlert, Award, AlertTriangle, Play, Smartphone, Code, ArrowRight, X, CreditCard, Wallet, SmartphoneCharging, MessageSquare, Download, Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PurchaseService } from '../lib/purchaseService';

interface UpgradeTabProps {
  isPremium: boolean;
  onUpgrade: (status: boolean) => void;
}

export default function UpgradeTab({ isPremium, onUpgrade }: UpgradeTabProps) {
  const [showPlayStoreModal, setShowPlayStoreModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'gopay' | 'dana' | 'cc' | 'balance'>('gopay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'apk' | 'code' | 'android_manifest'>('apk');
  const [isNativeDevice, setIsNativeDevice] = useState(false);

  useEffect(() => {
    setIsNativeDevice(PurchaseService.isNativeAndroid());
    // Auto restore if native device
    if (PurchaseService.isNativeAndroid()) {
      PurchaseService.restorePurchases().then(hasPremium => {
        if (hasPremium) onUpgrade(true);
      });
    }
  }, [onUpgrade]);

  const premiumFeatures = [
    { title: 'Pemutaran Bebas Iklan', desc: 'Nikmati lagu favorit tanpa jeda iklan komersial.' },
    { title: 'Audio Kualitas HD (320kbps)', desc: 'Aktifkan bit-rate suara tertinggi untuk kejelasan instrumen maksimal.' },
    { title: 'Akses Penuh AI DJ & Playlist', desc: 'Buat playlist kustom tanpa batas & dengarkan radio narasi dari AI DJ.' },
    { title: 'Dukungan Latar Belakang', desc: 'Audio tetap menyala walaupun Anda menjelajahi fitur lainnya.' },
  ];

  const handleStartPayment = async () => {
    if (isNativeDevice) {
      setIsProcessing(true);
      const res = await PurchaseService.purchasePremium("premium_monthly");
      setIsProcessing(false);
      if (res.success) {
        onUpgrade(true);
        alert(res.message);
      } else {
        alert("Gagal melakukan pembelian: " + res.message);
      }
    } else {
      setShowPlayStoreModal(true);
      setPaymentSuccess(false);
      setIsProcessing(false);
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    // Simulate web payment process
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      PurchaseService.setPremiumStatus(true);
      setTimeout(() => {
        setShowPlayStoreModal(false);
        onUpgrade(true);
      }, 1500);
    }, 2000);
  };

  return (
    <div id="upgrade-tab-container" className="space-y-8 pb-32 pt-2 text-left max-w-2xl mx-auto">
      {/* Native Wrapper Alert Banner */}
      {isNativeDevice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div className="text-xs text-zinc-300">
            <span className="font-extrabold text-emerald-400 block">Koneksi APK PlayStore Aktif!</span>
            Aplikasi mendeteksi berjalan di dalam perangkat Android Asli. Tombol pembelian akan otomatis memicu PlayStore Billing Client resmi.
          </div>
        </div>
      )}

      {/* Banner Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-red-950 to-black border border-red-500/30 p-6 sm:p-8 text-center space-y-6 shadow-xl"
      >
        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute left-[-20px] bottom-[-20px] w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="space-y-3 relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md shadow-red-900/40">
            ★
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/20 rounded-full border border-red-500/30 text-xs font-black text-red-500 uppercase tracking-widest">
            Music Premium
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white text-center w-full">
            {isPremium ? 'Langganan Anda Aktif!' : 'Dengarkan Tanpa Batas'}
          </h2>
          <p className="text-xs text-zinc-300 max-w-sm leading-relaxed mx-auto text-center">
            {isPremium
              ? 'Selamat! Anda menikmati seluruh fitur premium termasuk kualitas suara HD 320kbps dan generator playlist cerdas.'
              : 'Dapatkan musik bebas iklan, pemutaran latar belakang, serta integrasi AI terdepan dari Google Gemini.'}
          </p>
        </div>

        {/* CTA Button */}
        <div className="relative z-10 max-w-xs mx-auto">
          {isPremium ? (
            <button
              onClick={() => {
                PurchaseService.setPremiumStatus(false);
                onUpgrade(false);
              }}
              className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-full font-extrabold text-xs transition duration-300 shadow-md cursor-pointer border border-zinc-700"
            >
              Kembali ke Akun Gratis (Free User)
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartPayment}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full font-black text-xs transition duration-300 shadow-lg shadow-red-900/50 cursor-pointer flex items-center justify-center gap-2 animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>{isNativeDevice ? 'Beli via Google Play' : 'Simulasi Bayar via PlayStore'}</span>
            </motion.button>
          )}
          {!isPremium && <span className="text-[9px] text-zinc-500 mt-2 block font-medium text-center">Simulasi alur pembayaran Google Play resmi. Rp 49.000 / bulan.</span>}
        </div>
      </motion.div>

      {/* Feature Grid */}
      <div id="premium-features-section" className="space-y-4">
        <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 pl-1">
          <Award className="w-4 h-4 text-red-500" /> Benefit Premium Member
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {premiumFeatures.map((feat, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-100">{feat.title}</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* APK Integration and PlayStore Billing Client Binder Developer Desk */}
      <div id="play-store-analysis-section" className="space-y-4 pt-4 border-t border-zinc-800/80">
        <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 pl-1">
          <Code className="w-4 h-4 text-red-500" /> APK Prabayar & Google Play Billing Desk
        </h3>

        <div className="flex items-start gap-3 p-4 bg-zinc-950 border border-red-500/20 rounded-2xl">
          <HelpCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-zinc-100">Bagaimana Cara Mengubah Web ini menjadi APK Prabayar?</h4>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Aplikasi ini telah kami lengkapi dengan file integrasi <span className="text-zinc-200">Capacitor Purchases Binding Client</span>. Anda tinggal membungkus (wrapping) aplikasi web ini menjadi APK Android asli di komputer Anda. Silakan ikuti instruksi teknis di bawah ini.
            </p>
          </div>
        </div>

        {/* Dynamic Dev Guides Accordion Tabs */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
          <div className="flex border-b border-zinc-900 bg-zinc-900/30 p-1">
            <button
              onClick={() => setActiveGuideTab('apk')}
              className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-black rounded-lg transition duration-200 flex items-center justify-center gap-1.5 ${
                activeGuideTab === 'apk'
                  ? 'bg-zinc-900 text-red-500 border border-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              1. Langkah Build APK
            </button>
            <button
              onClick={() => setActiveGuideTab('code')}
              className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-black rounded-lg transition duration-200 flex items-center justify-center gap-1.5 ${
                activeGuideTab === 'code'
                  ? 'bg-zinc-900 text-red-500 border border-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              2. capacitor.config.ts
            </button>
            <button
              onClick={() => setActiveGuideTab('android_manifest')}
              className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-black rounded-lg transition duration-200 flex items-center justify-center gap-1.5 ${
                activeGuideTab === 'android_manifest'
                  ? 'bg-zinc-900 text-red-500 border border-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              3. AndroidManifest.xml
            </button>
          </div>

          <div className="p-5 text-xs space-y-4">
            {activeGuideTab === 'apk' ? (
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Alur Lengkap Packaging di Komputer/Laptop Anda:
                </h4>
                <div className="space-y-4 pl-3 text-zinc-400 leading-relaxed border-l-2 border-zinc-800">
                  <div>
                    <span className="text-zinc-200 font-bold block">1. Download Source Code</span>
                    Ekspor seluruh file project ini menjadi ZIP (lewat menu Settings di pojok kanan atas AI Studio) lalu ekstrak di komputer Anda.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold block">2. Jalankan Perintah Terminal untuk Setup Capacitor</span>
                    Buka terminal cmd/powershell di folder project Anda, lalu jalankan rentetan perintah ini:
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-300 mt-2 space-y-1">
                      <p className="text-zinc-500"># Install library pembungkus Android resmi</p>
                      <p className="text-red-400">npm install @capacitor/core @capacitor/cli @capacitor/android</p>
                      <p className="text-zinc-500"># Install plugin Google Play In-App Billing</p>
                      <p className="text-red-400">npm install @capgo/capacitor-purchases</p>
                      <p className="text-zinc-500"># Inisialisasi Capacitor Android</p>
                      <p className="text-red-400">npx cap init "Arya Player" "com.aryaputra.musicplay"</p>
                      <p className="text-zinc-500"># Tambah platform Android native</p>
                      <p className="text-red-400">npx cap add android</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold block">3. Sinkronisasikan Web Bundle ke Android Studio</span>
                    Setiap kali Anda mengubah kode web React, jalankan perintah sinkronisasi agar langsung berpindah ke folder Android:
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-300 mt-2 space-y-1">
                      <p className="text-red-400">npm run build</p>
                      <p className="text-red-400">npx cap sync</p>
                      <p className="text-red-400">npx cap open android</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold block">4. Compile & Build APK Signed</span>
                    Android Studio otomatis akan terbuka. Anda tinggal menekan tombol <strong className="text-zinc-200">Build &gt; Build Bundle(s)/APK(s) &gt; Build APK</strong>. File APK prabayar siap di-upload ke Play Console!
                  </div>
                </div>
              </div>
            ) : activeGuideTab === 'code' ? (
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Konfigurasi Berkas capacitor.config.ts:
                </h4>
                <p className="text-zinc-400 leading-relaxed pl-3">
                  Buat berkas bernama <code className="text-red-400 bg-zinc-900 px-1 rounded">capacitor.config.ts</code> di root folder project Anda dengan struktur konfigurasi target bundel di bawah ini:
                </p>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto space-y-2">
                  <p className="text-red-500">import &#123; CapacitorConfig &#125; from '@capacitor/cli';</p>
                  <p className="text-amber-400">const config: CapacitorConfig = &#123;</p>
                  <p>&nbsp;&nbsp;appId: <span className="text-green-400">'com.aryaputra.musicplay'</span>,</p>
                  <p>&nbsp;&nbsp;appName: <span className="text-green-400">'Arya Player Premium'</span>,</p>
                  <p>&nbsp;&nbsp;webDir: <span className="text-green-400">'dist'</span>,</p>
                  <p>&nbsp;&nbsp;server: &#123;</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;androidScheme: <span className="text-green-400">'https'</span></p>
                  <p>&nbsp;&nbsp;&#125;,</p>
                  <p>&nbsp;&nbsp;plugins: &#123;</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;Purchases: &#123;</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;apiKey: <span className="text-green-400">'playstore_billing_client_direct_binding'</span></p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;&#125;</p>
                  <p>&nbsp;&nbsp;&#125;</p>
                  <p>&#125;;</p>
                  <p className="text-red-500">export default config;</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Izin Billing di AndroidManifest.xml:
                </h4>
                <p className="text-zinc-400 leading-relaxed pl-3">
                  Supaya sistem Android mengizinkan transaksi pembayaran PlayStore, tambahkan baris hak akses <code className="text-red-400">BILLING</code> berikut di dalam file <code className="text-zinc-300">android/app/src/main/AndroidManifest.xml</code> Anda:
                </p>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto">
                  <p className="text-zinc-500">&lt;!-- Tambahkan baris di bawah ini sebelum tag &lt;application&gt; --&gt;</p>
                  <p className="text-red-400">&lt;uses-permission android:name="com.android.vending.BILLING" /&gt;</p>
                  <p className="text-red-400">&lt;uses-permission android:name="android.permission.INTERNET" /&gt;</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trust Info */}
      <div id="premium-trust-badge" className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-zinc-500 flex-shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Uji coba fungsionalitas: Seluruh kode TypeScript binding untuk pembelian produk in-app asli di atas telah siap pakai secara aman di dalam folder project ini.
        </p>
      </div>

      {/* INTERACTIVE PLAY STORE CHECKOUT DIALOG SIMULATION */}
      <AnimatePresence>
        {showPlayStoreModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full sm:max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-800 text-white overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Google Play Styled Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-white rounded-md p-1 shadow">
                    <svg viewBox="0 0 48 48" className="w-full h-full">
                      <path fill="#ea4335" d="M37 24L11 38V10z" />
                      <path fill="#4285f4" d="M26 24L11 38V10z" />
                      <path fill="#fbc02d" d="M11 10l15 14L11 38z" />
                      <path fill="#34a853" d="M37 24L26 24l-15-14z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-zinc-400 tracking-wider uppercase block leading-none">Google Play</span>
                    <span className="text-[9px] text-zinc-500">Pembayaran Aman & Terenkripsi</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlayStoreModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-850 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Checkout Body */}
              <div className="p-5 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-sm text-zinc-100">Music Premium Pro</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Langganan Bulanan Musik Tanpa Batas</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-red-500">Rp 49.000</span>
                    <span className="text-[8px] text-zinc-500 block mt-0.5">per bulan</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Metode Pembayaran</span>
                  
                  {/* Gopay */}
                  <div
                    onClick={() => setSelectedMethod('gopay')}
                    className={`p-3 rounded-xl border transition duration-200 flex items-center justify-between cursor-pointer ${
                      selectedMethod === 'gopay'
                        ? 'bg-red-500/10 border-red-500/60'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-bold text-[9px] text-white">GoPay</div>
                      <span className="text-xs font-bold text-zinc-200">GoPay Indonesia</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'gopay' ? 'border-red-500' : 'border-zinc-700'}`}>
                      {selectedMethod === 'gopay' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                  </div>

                  {/* Dana */}
                  <div
                    onClick={() => setSelectedMethod('dana')}
                    className={`p-3 rounded-xl border transition duration-200 flex items-center justify-between cursor-pointer ${
                      selectedMethod === 'dana'
                        ? 'bg-red-500/10 border-red-500/60'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-blue-400 flex items-center justify-center font-bold text-[9px] text-white">DANA</div>
                      <span className="text-xs font-bold text-zinc-200">DANA E-Wallet</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'dana' ? 'border-red-500' : 'border-zinc-700'}`}>
                      {selectedMethod === 'dana' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                  </div>

                  {/* Credit Card */}
                  <div
                    onClick={() => setSelectedMethod('cc')}
                    className={`p-3 rounded-xl border transition duration-200 flex items-center justify-between cursor-pointer ${
                      selectedMethod === 'cc'
                        ? 'bg-red-500/10 border-red-500/60'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-200">Kartu Kredit / Debit</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'cc' ? 'border-red-500' : 'border-zinc-700'}`}>
                      {selectedMethod === 'cc' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                  </div>

                  {/* Google Play Balance */}
                  <div
                    onClick={() => setSelectedMethod('balance')}
                    className={`p-3 rounded-xl border transition duration-200 flex items-center justify-between cursor-pointer ${
                      selectedMethod === 'balance'
                        ? 'bg-red-500/10 border-red-500/60'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-emerald-500" />
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">Saldo Google Play</span>
                        <span className="text-[8px] text-emerald-500 font-mono">Rp 75.000 (Tersedia)</span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'balance' ? 'border-red-500' : 'border-zinc-700'}`}>
                      {selectedMethod === 'balance' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                  </div>
                </div>

                {/* Confirm Action */}
                <div className="space-y-3 pt-2">
                  {paymentSuccess ? (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-xs font-bold text-emerald-400 animate-bounce">
                      ✓ Pembayaran Sukses! Selamat Menikmati Premium
                    </div>
                  ) : (
                    <button
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Memproses Transaksi...</span>
                        </>
                      ) : (
                        <span>Langganan Sekarang (Simulasi)</span>
                      )}
                    </button>
                  )}
                  <p className="text-[9px] text-zinc-500 text-center leading-normal">
                    Ini adalah simulasi checkout sandbox Google Play Store. Dana Anda tidak akan terpotong asli. Status premium lokal akan langsung diaktifkan sebagai demonstrasi.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
