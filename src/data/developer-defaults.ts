export const DEVELOPER_DEFAULTS = {
  theme: {
    preset: 'brutalist-yellow',
    colors: { frame: '#0A0A0A', background: '#F4F1E8', surface: '#FFFDF8', text: '#111111', muted: '#686868', border: '#111111', primary: '#F5CD32', secondary: '#32CFC2', highlight: '#D90B46' },
  },
  // Metrik dari halaman lama disimpan sebagai arsip CMS, bukan ditampilkan
  // sebagai fakta sampai jumlah dan metode pengukurannya dapat diverifikasi.
  legacyStats: [
    { label: 'Proyek', value: '30+', verified: false },
    { label: 'Semangat', value: '∞', verified: false },
    { label: 'Tech Stack', value: '6+', verified: false },
    { label: 'Dedikasi', value: '100%', verified: false },
  ],
  profile: {
    name: 'Alfredo Pratama',
    role: 'Wakil Ketua',
    location: 'Belitang City',
    status: 'DE',
    languages: 'ID, EN, DE',
    focus: 'Web & Bot',
    fuel: 'Coffee',
    bio: 'Lingkaran setan akan terus mengurungmu hingga kamu menjadi setannya. Kecuali anda benar-benar memiliki tekad dan ambisi untuk merubah kehidupan secara sadar.',
  },
  typing: [
    'Discipline over motivation',
    'Ich lerne Deutsch',
    'Ich möchte nach Deutschland fliegen',
    'Silent grind. Loud results.',
  ],
  focusCards: [
    { icon: 'language', title: 'Learning German', description: 'Target A1 menuju B2. Persiapan hidup di Jerman.' },
    { icon: 'calendar', title: 'Bangun 6 Pagi', description: 'Melatih kedisiplinan harian.' },
    { icon: 'bot', title: 'Bot Baileys', description: 'Ekosistem bot cepat & efisien.' },
  ],
  hardSkills: [
    { name: 'Fusion Splicing', percent: 89 },
    { name: 'Web Dev', percent: 85 },
    { name: 'Node & Baileys', percent: 80 },
  ],
  softSkills: [
    { name: 'Penyabar', percent: 100 },
    { name: 'Grudge', percent: 98 },
    { name: 'Ambisius', percent: 93 },
    { name: 'Retorika', percent: 79 },
  ],
  projects: [
    { icon: 'bot', tag: 'Node.js', title: 'WhatsApp MD Bot', description: 'Bot dengan fitur lengkap, performa tinggi, arsitektur modular.', status: 'PROJECT / AUTOMATION', stack: ['Node.js', 'Baileys'], highlights: ['Pengembangan bot WhatsApp berbasis Baileys', 'Arsitektur modular'], featured: false, category: 'Automation' },
    { icon: 'laptop', tag: 'Vanilla JS', title: 'Interactive Portfolio', description: 'Mini-SPA dalam WhatsApp menggunakan HTML Card.', status: 'PROJECT / FRONTEND', stack: ['HTML', 'CSS', 'JavaScript'], highlights: ['Antarmuka portofolio interaktif'], featured: false, category: 'Frontend' },
    { icon: 'globe', tag: 'REST API', title: 'API Service', description: 'REST API kustom untuk bot & automasi.', status: 'PROJECT / BACKEND', stack: ['REST API', 'Node.js'], highlights: ['Layanan API untuk bot dan automasi'], featured: false, category: 'Backend' },
    { icon: 'monitor', tag: 'Astro · Supabase', title: 'Website Kelas TKJ XII-9', description: 'Website kelas yang menyatukan informasi, profil anggota, struktur organisasi, galeri, dan halaman kompetensi. Proyek menggunakan Astro, Supabase, dan Cloudflare Workers.', status: 'PROJECT / WEBSITE', href: '/', stack: ['Astro', 'Supabase', 'Cloudflare Workers', 'JavaScript', 'CSS'], highlights: ['Konten kelas dan profil anggota', 'CMS dan penyimpanan media', 'Deployment pada Cloudflare Workers'], featured: true, category: 'Website' },
  ],
  experiences: [
    { title: 'Pengembang Website Kelas TKJ XII-9', period: 'Periode diisi nanti', organization: 'SMK Muhammadiyah Belitang', description: 'Mengembangkan website kelas menggunakan Astro, Supabase, dan Cloudflare Workers.', draft: true },
    { title: 'Wakil Ketua Kelas', period: 'Periode diisi nanti', organization: 'Kelas TKJ XII-9', description: 'Menjalankan peran sebagai wakil ketua berdasarkan struktur organisasi kelas.', draft: true },
    { title: 'Pengembangan WhatsApp MD Bot', period: 'Periode diisi nanti', organization: 'Proyek personal', description: 'Mengembangkan bot WhatsApp berbasis Node.js dan Baileys.', draft: true },
    { title: 'Belajar Bahasa Jerman', period: 'Target pembelajaran', organization: 'Pembelajaran mandiri', description: 'Target belajar dari A1 menuju B2; ini merupakan target, bukan klaim sertifikasi.', draft: true },
    { title: 'Siswa Teknik Komputer dan Jaringan', period: 'Periode diisi nanti', organization: 'SMK Muhammadiyah Belitang', description: 'Mempelajari jaringan komputer dan praktik fiber optik, termasuk fusion splicing.', draft: true },
  ],
  motivation: [
    { title: 'Melampaui Rasa Sakit', description: 'Rasa sakit itu tak terhindarkan, tetapi penderitaan adalah pilihan. Batu permata tidak bisa dipoles tanpa gesekan.' },
    { title: 'Disiplin vs Motivasi', description: 'Motivasi itu murah dan cepat menguap. Disiplin adalah bahan bakar sejati. Bangun jam 6 pagi setiap hari.' },
    { title: 'Visi Jerman', description: 'Bukan sekadar negara, tapi simbol standar baru, efisiensi, dan pendidikan. 10.000 mil dimulai dari langkah pertama.' },
    { title: 'Keluar dari Lingkaran Setan', description: 'Lingkungan stagnan akan menyeretmu ke bawah. Abaikan mereka. Fokus pada tujuanmu.' },
  ],
  journey: [
    { title: 'Awal yang mengejutkan', description: 'Kode pernah terlihat seperti teks acak. Ketertarikan mulai tumbuh ketika berkenalan dengan WhatsApp Bot Baileys dan mencoba memahami logika di balik sebuah perintah.' },
    { title: 'Belajar dengan membongkar', description: 'Proses belajar dimulai dengan membaca proyek yang sudah ada, memahami struktur file, mengenali modularitas, lalu mencoba mengembangkan bagian-bagiannya.' },
    { title: 'AI sebagai cermin', description: 'AI mulai digunakan bukan hanya untuk menghasilkan kode, tetapi untuk meminta penjelasan, menguji asumsi, dan membandingkan pendekatan yang berbeda.' },
    { title: 'Logika sebelum tampilan', description: 'Struktur aplikasi dan alur data menjadi perhatian utama. Tampilan yang baik perlu ditopang fondasi yang jelas dan mudah dipelihara.' },
    { title: 'Memberi jarak pada masalah', description: 'Saat menemui jalan buntu, mengambil jeda dapat membantu melihat masalah dari sudut pandang yang lebih tenang sebelum kembali mengerjakannya.' },
    { title: 'Konsistensi sebagai proses', description: 'Perkembangan tidak hanya ditentukan oleh satu hari yang produktif. Belajar, mengevaluasi, dan memperbaiki secara berulang menjadi bagian dari perjalanan.' },
  ],
  principles: [
    { icon: 'target', title: 'Pahami, jangan sekadar salin', description: 'Gunakan alat bantu untuk memperluas pemahaman. Keputusan dan hasil akhir tetap perlu diperiksa secara kritis.' },
    { icon: 'server', title: 'Struktur adalah fondasi', description: 'Arsitektur yang jelas membuat fitur lebih mudah dikembangkan, diuji, dan dirawat ketika proyek bertambah besar.' },
    { icon: 'story', title: 'Readability matters', description: 'Kode perlu dapat dipahami, bukan hanya berhasil dieksekusi. Keterbacaan membantu kerja sama dan pemeliharaan.' },
  ],
  quotes: [
    { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
    { text: 'Man cannot remake himself without suffering, for he is both the marble and the sculptor.', author: 'Alexis Carrel' },
    { text: 'Event loop pada Node.js mengajarkan kita: jangan biarkan satu thread penderitaan memblokir seluruh eksekusi hidupmu.', author: 'Alfredo Pratama' },
  ],
  education: [
    { category: 'Filsafat', title: 'Absurdisme: Berdamai dengan Kekosongan', paragraphs: [
      "Albert Camus memperkenalkan konsep Absurdisme. Manusia memiliki hasrat bawaan untuk mencari makna, namun alam semesta bisu dan tidak peduli. Pertemuan antara hasrat akan makna dengan keheningan alam semesta inilah yang disebut sebagai 'Yang Absurd'.",
      'Camus menawarkan jalan ketiga: Pemberontakan. Kita mengakui hidup tidak punya makna bawaan, namun kita tetap memilih untuk hidup dan menciptakan makna sendiri. Seperti Sisyphus yang mendorong batu ke puncak gunung, kita harus membayangkan Sisyphus bahagia.',
    ] },
    { category: 'Sains', title: 'Hukum Entropi & Keteraturan Hidup', paragraphs: [
      'Hukum Termodinamika Kedua: dalam sistem tertutup, entropi selalu meningkat. Bangunan akan runtuh, besi berkarat, energi terdisipasi. Namun di tengah kekacauan ini, kehidupan muncul sebagai anomali menakjubkan.',
      'Manusia adalah pulau kecil keteraturan yang terus melawan arus entropi. Ketika kamu bangun pagi dan menyusun rencana, secara harfiah kamu sedang melawan hukum dasar alam semesta.',
    ] },
    { category: 'Teknologi', title: 'Event Loop & Kehidupan', paragraphs: [
      'Dalam Node.js: Non-blocking I/O dan Event Loop. Tugas berat didelegasikan ke background, sistem lanjut eksekusi baris berikutnya. Saat selesai, callback dipanggil kembali.',
      "Manusia sering terjebak eksekusi 'synchronous'. Saat masalah datang, kita blokir seluruh alur hidup. Jika mengadopsi pola pikir asynchronous, kita belajar mendelegasikan penderitaan ke background process, sementara kesadaran utama tetap melangkah maju.",
    ] },
  ],
  notes: [
    { category: 'Notes', title: 'Tentang Lingkaran Setan', description: 'Lingkaran setan hanyalah ilusi bagi mereka yang menolak berubah. Jika kau sadar kau di dalamnya, saat itulah kau punya kunci untuk keluar.' },
    { category: 'Notes', title: 'Fusion Splicing & Kehidupan', description: 'Menyambung serat optik butuh ketenangan, presisi, dan alat yang tepat. Sama seperti merapikan hidup: butuh ketelitian dan visi yang jelas.' },
  ],
  contacts: [
    { icon: 'whatsapp', label: 'WhatsApp', value: '6287881316151', href: 'https://wa.me/6287881316151', copy: '6287881316151' },
    { icon: 'email', label: 'Email', value: 'mabarpropesonal234@gmail.com', href: 'mailto:mabarpropesonal234@gmail.com', copy: 'mabarpropesonal234@gmail.com' },
    { icon: 'globe', label: 'Website', value: 'personal234.workers.dev', href: 'https://personal234.workers.dev', copy: 'personal234.workers.dev' },
  ],
} as const;
