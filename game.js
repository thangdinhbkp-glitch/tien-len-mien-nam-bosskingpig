/**
 * TIẾN LÊN MIỀN NAM - ĐẾM LÁ (NHẤT ĂN TẤT) + WIFI MULTIPLAYER (2 - 4 NGƯỜI) & BOT AI
 * Hỗ trợ:
 * - Chơi qua WiFi từ 2 đến 4 người (Gửi link http://<IP-WiFi>:8080/?room=XXXX)
 * - Kết hợp cả Local WiFi HTTP Server & PeerJS P2P dự phòng
 * - Chơi Offline với Bot
 * - Luật Nhất Ăn Tất, Đếm Lá (20 xu/lá, Cóng 13 lá = 520 xu), Thối 3♠/Heo/Tứ quý/Đôi thông, Đút 3♠ cuối
 */

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = ['♠', '♣', '♦', '♥']; // Bích < Chuồn < Rô < Cơ
const AVATARS = ['😎', '🐯', '🦊', '🐼'];

// Vốn cấp sẵn: 20,000 xu (~100 ván thắng thua) & Hồi phục mỗi ngày: +5,000 xu
const INITIAL_COINS = 20000;
const DAILY_RECOVERY_COINS = 5000;
const MAX_DAILY_RELIEF_CLAIMS = 3;

// ============================================================================
// 5 MỨC CƯỢC BÀN BÀI (ÁP DỤNG CHO CẢ CHẾ ĐỘ ĐẤU VỚI BOT & ĐẤU VỚI NGƯỜI)
// ============================================================================
const BET_TIERS = [
  {
    id: 'tap_su',
    name: 'Bàn Tập Sự',
    icon: '🌱',
    betPerCard: 100,
    minCoins: 0,
    desc: 'Cóng: 2,600 • Heo đỏ: 500',
  },
  {
    id: 'tinh_anh',
    name: 'Bàn Tinh Anh',
    icon: '⚔️',
    betPerCard: 500,
    minCoins: 5000,
    desc: 'Cóng: 13,000 • Heo đỏ: 2,500',
  },
  {
    id: 'cao_thu',
    name: 'Bàn Cao Thủ',
    icon: '💎',
    betPerCard: 2000,
    minCoins: 15000,
    desc: 'Cóng: 52,000 • Heo đỏ: 10,000',
  },
  {
    id: 'dai_gia',
    name: 'Bàn Đại Gia',
    icon: '👑',
    betPerCard: 10000,
    minCoins: 50000,
    desc: 'Cóng: 260,000 • Heo đỏ: 50,000',
  },
  {
    id: 'than_thoai',
    name: 'Bàn Thần Thoại',
    icon: '🌌',
    betPerCard: 50000,
    minCoins: 200000,
    desc: 'Cóng: 1,300,000 • Heo đỏ: 250,000',
  },
];

// ============================================================================
// CƠ CHẾ CẦU NGUYỆN GACHA CHUẨN GENSHIN IMPACT (CHARACTER EVENT WISH)
// - 5★ (⭐⭐⭐⭐⭐): 10 Hiệu Ứng Kỹ Năng Nộ (Base 0.6%, Soft Pity từ lượt 74 +6%/lượt, Hard Pity 90, 50/50 & Đại Bảo Hiểm UP)
// - 4★ (⭐⭐⭐⭐): 29 Decor / Skin Bài Fanart (Base 5.1%, Soft Pity lượt 9: 56.1%, Hard Pity 10: 100%, 50/50 Rate-Up)
// - 3★ (⭐⭐⭐): 29 Avatar Fanart Nhân Vật (94.3% cơ bản)
// - Trùng đồ (Duplicate): Tự động quy đổi Tinh Huy / Tinh Trần hoàn lại Xu!
// ============================================================================
const WISH_COST_SINGLE = 1600; // 1,600 Xu / 1 Lượt Cầu Nguyện (tương ứng 160 Nguyên Thạch)
const WISH_COST_TEN = 16000;   // 16,000 Xu / 10 Lượt Cầu Nguyện
const DUPLICATE_REFUND_COINS = {
  3: 600,   // Trùng Avatar 3★ -> Hoàn +600 Xu
  4: 3200,  // Trùng Decor Bài 4★ -> Hoàn +3,200 Xu (= 2 lượt Cầu Nguyện!)
  5: 16000, // Trùng Kỹ Năng Nộ 5★ -> Hoàn +16,000 Xu (= 10 lượt Cầu Nguyện!)
};

const BANNER_4STAR_RATEUPS = {
  raiden: ['raiden', 'yaemiko', 'yoimiya'],
  skirk: ['skirk', 'columbina', 'sandrone'],
  mavuika: ['mavuika', 'xilonen', 'citlali'],
  furina: ['furina', 'navia', 'escoffier'],
  yaemiko: ['yaemiko', 'raiden', 'kokomi'],
  yelan: ['yelan', 'shenhe', 'ganyu'],
  clorinde: ['clorinde', 'furina', 'navia'],
  ayaka: ['ayaka', 'yoimiya', 'kokomi'],
  eula: ['eula', 'odette', 'vesna'],
  hutao: ['hutao', 'zibai', 'ganyu'],
};

const GENSHIN_FANART_ROSTER = [
  { id: 'zibai', name: 'Zibai (Tiên Nhân Bạch Mã)', desc: '[Hiếm] Fanart Tiên Nhân Zibai thanh tao của vùng đất Liyue.', avatarPrice: 22000, skinPrice: 30000, crest: '🐎' },
  { id: 'lauma', name: 'Lauma (Nữ Tu Sương Giá)', desc: '[Hiếm] Fanart thiếu nữ huyền bí mang sức mạnh cổ đại.', avatarPrice: 23000, skinPrice: 32000, crest: '✨' },
  { id: 'linnea', name: 'Linnea (Ảo Thuật Gia Tinh Linh)', desc: '[Hiếm] Fanart thiếu nữ tinh linh duyên dáng và sắc sảo.', avatarPrice: 23000, skinPrice: 32000, crest: '🎩' },
  { id: 'citlali', name: 'Citlali (Bà Ngoại Itztli)', desc: '[Hiếm] Fanart đại pháp sư bộ tộc Chủ Nhân Gió Đêm Natlan.', avatarPrice: 25000, skinPrice: 35000, crest: '❄️' },
  { id: 'nefer', name: 'Nefer (Nữ Hoàng Sa Mạc)', desc: '[Hiếm] Fanart vẻ đẹp quyến rũ và quyền lực vùng cát vàng.', avatarPrice: 25000, skinPrice: 35000, crest: '🌙' },
  { id: 'odette', name: 'Odette (Thiên Nga Băng Giá)', desc: '[Hiếm] Fanart vũ công thiên nga mang vẻ đẹp quý tộc.', avatarPrice: 25000, skinPrice: 35000, crest: '🦢' },
  { id: 'mualani', name: 'Mualani (Hướng Dẫn Viên Suối Nước)', desc: '[Hiếm] Fanart cô nàng lướt sóng năng động của Cư Dân Suối Nước.', avatarPrice: 26000, skinPrice: 38000, crest: '🦈' },
  { id: 'escoffier', name: 'Escoffier (Siêu Đầu Bếp Fontaine)', desc: '[Hiếm] Fanart thiên tài ẩm thực Băng nguyên tố của Fontaine.', avatarPrice: 28000, skinPrice: 40000, crest: '🍰' },
  { id: 'varesa', name: 'Varesa (Đấu Sĩ Lôi Đình)', desc: '[Sử Thi] Fanart nữ chiến binh tràn đầy năng lượng vùng Natlan.', avatarPrice: 32000, skinPrice: 45000, crest: '⚡' },
  { id: 'yoimiya', name: 'Yoimiya (Nữ Hoàng Lễ Hội Hè)', desc: '[Sử Thi] Fanart chủ tiệm pháo hoa Naganohara rực rỡ.', avatarPrice: 34000, skinPrice: 48000, crest: '🎆' },
  { id: 'eula', name: 'Eula (Kỵ Sĩ Sóng Nước)', desc: '[Sử Thi] Fanart Đội trưởng Đội Du Kích Kỵ Sĩ Đoàn Tây Phong.', avatarPrice: 35000, skinPrice: 50000, crest: '❄️' },
  { id: 'ganyu', name: 'Ganyu (Tuần Lộc Ánh Trăng)', desc: '[Sử Thi] Fanart tổng thư ký Nguyệt Hải Đình dịu dàng.', avatarPrice: 35000, skinPrice: 50000, crest: '🏹' },
  { id: 'kokomi', name: 'Sangonomiya Kokomi (Thánh Pháp Sư)', desc: '[Sử Thi] Fanart quân sư tối cao đảo Watatsumi.', avatarPrice: 35000, skinPrice: 50000, crest: '🫧' },
  { id: 'navia', name: 'Navia (Hội Trưởng Spina di Rosula)', desc: '[Sử Thi] Fanart đại tiểu thư Pháo Hồng Hoa rạng rỡ.', avatarPrice: 38000, skinPrice: 54000, crest: '☂️' },
  { id: 'shenhe', name: 'Shenhe (Cô Thần Hàn Sương)', desc: '[Sử Thi] Fanart đệ tử tiên nhân mang khí chất thoát tục.', avatarPrice: 40000, skinPrice: 56000, crest: '❄️' },
  { id: 'ayaka', name: 'Kamisato Ayaka (Bạch Hạc Sương Hoa)', desc: '[Sử Thi] Fanart đại tiểu thư Hiệp Hội Yashiro kiêu sa.', avatarPrice: 42000, skinPrice: 60000, crest: '❄️' },
  { id: 'clorinde', name: 'Clorinde (Đấu Sĩ Đại Diện)', desc: '[Sử Thi] Fanart nữ kiếm sĩ Lôi nguyên tố bất bại của Fontaine.', avatarPrice: 43000, skinPrice: 62000, crest: '⚡' },
  { id: 'xilonen', name: 'Xilonen (Thợ Rèn Tên Cổ)', desc: '[Sử Thi] Fanart bậc thầy chế tác Tên Cổ của bộ tộc Đứa Con Tiếng Vang.', avatarPrice: 44000, skinPrice: 65000, crest: '🐆' },
  { id: 'hutao', name: 'Hu Tao (Đường Chủ Vãng Sinh)', desc: '[Sử Thi] Fanart Đường chủ Vãng Sinh Đường tinh nghịch.', avatarPrice: 45000, skinPrice: 68000, crest: '🦋' },
  { id: 'vesna', name: 'Vesna (Nữ Thần Tuyết Xuân)', desc: '[Huyền Thoại] Fanart tuyệt sắc giai nhân xứ sở băng tuyết.', avatarPrice: 50000, skinPrice: 75000, crest: '❄️' },
  { id: 'yelan', name: 'Yelan (Lan Sinh U Cốc)', desc: '[Huyền Thoại] Fanart thần bài tình báo bí ẩn của Liyue.', avatarPrice: 55000, skinPrice: 80000, crest: '🎲' },
  { id: 'sandrone', name: 'Sandrone (Marionette Fatui #7)', desc: '[Huyền Thoại] Fanart Quan Chấp Hành thứ 7 của Fatui & cỗ máy cổ.', avatarPrice: 58000, skinPrice: 85000, crest: '⚙️' },
  { id: 'yaemiko', name: 'Yae Miko (Guuji Đền Narukami)', desc: '[Huyền Thoại] Fanart Guuji Yae Miko quyến rũ dưới tán anh đào.', avatarPrice: 60000, skinPrice: 90000, crest: '🌸' },
  { id: 'columbina', name: 'Columbina (Thiếu Nữ Fatui #3)', desc: '[Huyền Thoại] Fanart Quan Chấp Hành thứ 3 của Fatui đầy bí ẩn.', avatarPrice: 65000, skinPrice: 95000, crest: '🕊️' },
  { id: 'furina', name: 'Furina (Thủy Thần Fontaine)', desc: '[Thần Thoại] Fanart ngôi sao sân khấu Epiclese rực rỡ hào quang.', avatarPrice: 70000, skinPrice: 105000, crest: '💧' },
  { id: 'mavuika', name: 'Mavuika (Hỏa Thần Natlan)', desc: '[Thần Thoại] Fanart Hỏa Thần rực cháy dẫn lối chiến thắng bất bại.', avatarPrice: 75000, skinPrice: 115000, crest: '🔥' },
  { id: 'vodyanitsa', name: 'Vodyanitsa (Nữ Hoàng Băng Giá)', desc: '[Thần Thoại] Fanart Băng Hoàng tối cao ngự trị cung điện mùa đông.', avatarPrice: 78000, skinPrice: 120000, crest: '👑' },
  { id: 'raiden', name: 'Raiden Shogun (Lôi Thần Vĩnh Hằng)', desc: '[Thần Thoại] Fanart Chúa tể sấm sét Inazuma — Vô Tưởng Nhất Đao.', avatarPrice: 80000, skinPrice: 125000, crest: '⚡' },
  { id: 'skirk', name: 'Skirk (Kiếm Khách Vực Sâu)', desc: '[Thần Thoại] Fanart nữ kiếm khách bí ẩn ngự trị Tinh Không Vực Sâu.', avatarPrice: 85000, skinPrice: 130000, crest: '🌌' },
];

const ANIME_CARD_SKINS = [
  {
    id: 'classic',
    name: 'Cổ Điển Hoàng Gia (Mặc định)',
    desc: 'Bộ bài truyền thống miễn phí dành cho người chơi mới.',
    price: 0,
    crest: '',
    imgUrl: '',
  },
  ...GENSHIN_FANART_ROSTER.map((c) => ({
    id: c.id,
    name: `Bài Fanart: ${c.name}`,
    desc: c.desc,
    price: c.skinPrice,
    crest: c.crest,
    imgUrl: `fanart/${c.id}.jpg`,
  })),
];

const ANIME_AVATARS = [
  {
    id: 'default_player',
    name: 'Bài Thủ Tân Binh (Mặc định)',
    desc: 'Avatar mặc định miễn phí khi mới vào sòng bài.',
    price: 0,
    emoji: '😎',
    imgUrl: '',
  },
  ...GENSHIN_FANART_ROSTER.map((c) => ({
    id: c.id,
    name: c.name,
    desc: c.desc,
    price: c.avatarPrice,
    imgUrl: `fanart/${c.id}.jpg`,
  })),
];

// Danh mục 10 Hiệu Ứng Kỹ Năng Nộ (Elemental Burst Animations) bán bằng Xu trong Shop
const GENSHIN_BURSTS = [
  {
    id: 'hutao',
    name: 'Hu Tao — An Thần Bí Pháp',
    desc: '[Sử Thi] Đường chủ Vãng Sinh Đường vung hồn ma Boo Tao quét sạch bàn bài.',
    price: 80000,
    gifUrl: 'hutao_burst.gif',
    mp4Url: '',
    remoteGif: 'hutao_burst.gif',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🦋 KỸ NĂNG NỘ • HU TAO (SPIRIT SOOTHER)',
    title: 'VÃNG SINH ĐƯỜNG: AN THẦN BÍ PHÁP',
    quote: '“Khách Quý Lên Đường Bình An Nhé ~!”',
  },
  {
    id: 'eula',
    name: 'Eula — Thanh Kiếm Sóng Nước',
    desc: '[Sử Thi] Kỵ Sĩ Sóng Nước triệu hồi Kiếm Ánh Sáng phát nổ sát thương cực đại.',
    price: 85000,
    gifUrl: 'eula_burst.gif',
    mp4Url: '',
    remoteGif: 'eula_burst.gif',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • EULA (GLACIAL ILLUMINATION)',
    title: 'TÂY PHONG KIẾM THUẬT: KIẾM SÓNG NƯỚC',
    quote: '“Mối Thù Này — Ta Sẽ Khắc Ghi Gấp Bội!”',
  },
  {
    id: 'ayaka',
    name: 'Kamisato Ayaka — Soumetsu',
    desc: '[Sử Thi] Bạch Hạc Sương Hoa triệu hồi lốc xoáy băng hoa cắt nát mọi quân bài.',
    price: 95000,
    gifUrl: 'ayaka_burst.gif',
    mp4Url: '',
    remoteGif: 'ayaka_burst.gif',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • KAMISATO AYAKA (SOUMETSU)',
    title: 'KAMISATO LƯU: BÃO TUYẾT SƯƠNG HOA',
    quote: '“Tuyết Hoa Rơi Xuống — Đóng Băng Vĩnh Viễn!”',
  },
  {
    id: 'clorinde',
    name: 'Clorinde — Ánh Chớp Tàn Đêm',
    desc: '[Sử Thi] Đấu sĩ đại diện Fontaine tung liên hoàn kiếm và súng chớp nhoáng.',
    price: 105000,
    gifUrl: 'clorinde_burst.gif',
    mp4Url: '',
    remoteGif: 'clorinde_burst.gif',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ KỸ NĂNG NỘ • CLORINDE (LAST LIGHTFALL)',
    title: 'PHÁN QUYẾT: ÁNH CHỚP TÀN ĐÊM',
    quote: '“Danh Dự Đấu Sĩ — Kết Liễu Trong Chớp Mắt!”',
  },
  {
    id: 'yelan',
    name: 'Yelan — Xúc Xắc Toan Tính',
    desc: '[Huyền Thoại] Thần bài Liyue tung xúc xắc Linh Lung định đoạt ván cược.',
    price: 120000,
    gifUrl: 'yelan_burst.gif',
    mp4Url: '',
    remoteGif: 'yelan_burst.gif',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🎲 KỸ NĂNG NỘ • YELAN (DEPTH-CLARION DICE)',
    title: 'THẦN BÀI LIYUE: XÚC XẮC TOAN TÍNH',
    quote: '“Ván Cược Này — Phần Thắng Thuộc Về Ta!”',
  },
  {
    id: 'yaemiko',
    name: 'Yae Miko — Thiên Hồ Lôi Phạt',
    desc: '[Huyền Thoại] Guuji Đền Narukami giáng sấm sét Thiên Hồ hủy diệt từ chín tầng mây.',
    price: 135000,
    gifUrl: 'yae_burst.gif',
    mp4Url: '',
    remoteGif: 'yae_burst.gif',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '🌸 KỸ NĂNG NỘ • YAE MIKO (TENKO KENSHIN)',
    title: 'ĐẠI BÍ PHÁP: THIÊN HỒ LÔI PHẠT',
    quote: '“Sấm Sét Narukami — Hóa Thành Tro Bụi Đi!”',
  },
  {
    id: 'furina',
    name: 'Furina — Vạn Dân Reo Hò',
    desc: '[Thần Thoại] Thủy Thần Fontaine mở màn đại nhạc kịch sân khấu Epiclese.',
    price: 150000,
    gifUrl: 'furina_burst.gif',
    mp4Url: '',
    remoteGif: 'furina_burst.gif',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '💧 KỸ NĂNG NỘ • FURINA (LET THE PEOPLE REJOICE)',
    title: 'ĐẠI NHẠC KỊCH: VẠN DÂN REO HÒ',
    quote: '“Hãy Để Thế Gian Cùng Ca Vang Chiến Thắng!”',
  },
  {
    id: 'mavuika',
    name: 'Mavuika — Bầu Trời Rực Cháy',
    desc: '[Thần Thoại] Hỏa Thần Natlan bùng nổ đại dương rực lửa thiêu rụi mọi đối thủ.',
    price: 165000,
    gifUrl: 'mavuika_burst.gif',
    mp4Url: '',
    remoteGif: 'mavuika_burst.gif',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🔥 KỸ NĂNG NỘ • MAVUIKA (HOUR OF BURNING SKIES)',
    title: 'THỜI KHẮC BẦU TRỜI RỰC CHÁY',
    quote: '“Ngọn Lửa Vĩnh Cửu Natlan — Thiêu Rụi Tất Cả!”',
  },
  {
    id: 'raiden',
    name: 'Raiden Shogun — Mộng Tưởng Chân Thuyết',
    desc: '[Thần Thoại] Vô Tưởng Nhất Đao chém rách không gian bằng sấm sét tím Vĩnh Hằng.',
    price: 180000,
    gifUrl: 'raiden_burst.gif',
    mp4Url: 'raiden_burst.mp4',
    remoteGif: 'https://media.tenor.com/umRS1zU3OUsAAAAM/raiden-baal.gif',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ KỸ NĂNG NỘ • RAIDEN SHOGUN (MUSOU NO HITOTACHI)',
    title: 'BÍ THUẬT: MỘNG TƯỞNG CHÂN THUYẾT',
    quote: '“Vô Tưởng Nhất Đao — Chặt Đứt Vĩnh Hằng!”',
  },
  {
    id: 'skirk',
    name: 'Skirk — Phá Toái Tinh Không',
    desc: '[Thần Thoại] Tuyệt kỹ Vực Sâu triệu hồi hố đen Tinh Không nuốt chửng bàn bài.',
    price: 190000,
    gifUrl: 'skirk_burst.gif',
    mp4Url: 'skirk_burst.mp4',
    remoteGif: 'https://media.tenor.com/vrLe2zvzqNYAAAAM/genshin-genshin-impact.gif',
    theme: 'theme-abyss',
    sfxType: 'skirk',
    tag: '🌌 KỸ NĂNG NỘ • SKIRK (ABYSSAL STARSHATTER)',
    title: 'TUYỆT KỸ VỰC SÂU: PHÁ TOÁI TINH KHÔNG',
    quote: '“Vạn Vật Quy Hư Vô — Nhất Ăn Tất!”',
  },
];

const BOT_ANIME_AVATARS = {
  1: 'fanart/furina.jpg',
  2: 'fanart/raiden.jpg',
  3: 'fanart/skirk.jpg',
};

const LEGACY_ID_MAP = {
  default_cool: 'default_player',
  sakura_miko: 'yaemiko',
  uchiha_sharingan: 'clorinde',
  gojo_infinity: 'furina',
  sun_breathing: 'raiden',
  cyber_waifu: 'skirk',
  anime_swordsman: 'citlali',
  anime_kitsune: 'furina',
  anime_sorcerer: 'columbina',
  anime_shinobi: 'raiden',
  genshin_mavuika: 'mavuika',
  anime_empress: 'skirk',
};

function getAvatarHtml(avatarIdOrEmoji) {
  if (!avatarIdOrEmoji || avatarIdOrEmoji === 'default_player' || avatarIdOrEmoji === '😎') {
    return `<span style="font-size:1.35em;line-height:1;">😎</span>`;
  }
  if (['🐯', '🦊', '🐼'].includes(avatarIdOrEmoji)) {
    return `<span style="font-size:1.35em;line-height:1;">${avatarIdOrEmoji}</span>`;
  }
  const mappedId = LEGACY_ID_MAP[avatarIdOrEmoji] || avatarIdOrEmoji;
  const found = ANIME_AVATARS.find((a) => a.id === mappedId);
  if (found && found.imgUrl) {
    return `<img class="anime-avatar-img" src="${found.imgUrl}" alt="${found.name}" referrerpolicy="no-referrer" />`;
  }
  if (typeof mappedId === 'string' && (mappedId.startsWith('http') || mappedId.startsWith('fanart/'))) {
    return `<img class="anime-avatar-img" src="${mappedId}" alt="Genshin Fanart Avatar" referrerpolicy="no-referrer" />`;
  }
  return `<span style="font-size:1.35em;line-height:1;">😎</span>`;
}

function getCardSkinMeta(skinId) {
  const mappedId = LEGACY_ID_MAP[skinId] || skinId;
  return ANIME_CARD_SKINS.find((s) => s.id === mappedId) || ANIME_CARD_SKINS[0];
}

function getBurstMeta(burstId) {
  if (!burstId || burstId === 'none') return null;
  return GENSHIN_BURSTS.find((b) => b.id === burstId) || GENSHIN_BURSTS[0];
}

const COMBO_TYPES = {
  SINGLE: 'SINGLE',
  PAIR: 'PAIR',
  TRIPLE: 'TRIPLE',
  STRAIGHT: 'STRAIGHT',
  FOUR_OF_A_KIND: 'FOUR_OF_A_KIND',
  THREE_PAIRS: 'THREE_PAIRS',
  FOUR_PAIRS: 'FOUR_PAIRS',
};

// Web Audio Synthesizer
class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.12, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  click() {
    this.playTone(520, 'triangle', 0.06, 0.09);
  }

  playImpactThud(startFreq = 145, endFreq = 36, duration = 0.19, gainVal = 0.34, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  playNoiseSnap(duration = 0.085, gainVal = 0.24, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1650, now);
      filter.Q.setValueAtTime(1.1, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + duration);
    } catch (_) {}
  }

  playCard(intensity = 'normal') {
    if (intensity === 'ultra') {
      // Đập Hàng / Tứ Quý / Đôi Thông: Rầm trầm cực đại + tiếng tạch xé gió + hợp âm sấm sét
      this.playImpactThud(190, 28, 0.32, 0.45, 0);
      this.playNoiseSnap(0.12, 0.35, 0);
      this.playTone(110, 'sawtooth', 0.25, 0.24, 0.01);
      this.playTone(440, 'triangle', 0.18, 0.22, 0.03);
      this.playTone(880, 'sawtooth', 0.22, 0.18, 0.05);
    } else if (intensity === 'heavy') {
      // Đập Heo (2) / Sảnh Dài / Sám Cô: Tiếng đập bàn cực đầm + kim khí ngân vang
      this.playImpactThud(165, 32, 0.25, 0.38, 0);
      this.playNoiseSnap(0.1, 0.28, 0);
      this.playTone(146.8, 'sawtooth', 0.18, 0.18, 0.01);
      this.playTone(587.3, 'triangle', 0.16, 0.18, 0.03);
      this.playTone(880, 'sine', 0.18, 0.15, 0.05);
    } else {
      // Đánh bài thường: Tiếng quất bài + đập xuống mặt bàn đanh gọn, có lực
      this.playImpactThud(140, 40, 0.18, 0.3, 0);
      this.playNoiseSnap(0.075, 0.22, 0);
      this.playTone(360, 'triangle', 0.08, 0.15, 0.01);
      this.playTone(720, 'sine', 0.08, 0.11, 0.025);
    }
  }

  pass() {
    this.playTone(210, 'sine', 0.11, 0.09);
  }

  chop() {
    this.raidenBurst();
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 'triangle', 0.22, 0.15, idx * 0.09));
  }

  // Âm thanh Kỹ Năng Nộ Raiden Shogun: Sấm sét + Rút kiếm Vô Tưởng Nhất Đao
  raidenBurst() {
    this.playTone(95, 'sawtooth', 0.45, 0.24, 0);
    this.playTone(130, 'sawtooth', 0.35, 0.2, 0.05);
    this.playTone(880, 'triangle', 0.14, 0.22, 0.12);
    this.playTone(1318.5, 'sine', 0.28, 0.22, 0.16);
    this.playTone(1760, 'sawtooth', 0.38, 0.18, 0.2);
    this.playTone(220, 'square', 0.45, 0.16, 0.25);
  }

  // Âm thanh Kỹ Năng Nộ Skirk: Vực Sâu Phá Toái Tinh Không
  skirkBurst() {
    const cosmicNotes = [293.66, 440, 587.33, 880, 1174.66, 1760];
    cosmicNotes.forEach((n, idx) => {
      this.playTone(n, 'sine', 0.38, 0.16, idx * 0.06);
      this.playTone(n * 1.5, 'triangle', 0.28, 0.1, idx * 0.06 + 0.04);
    });
    this.playTone(110, 'sawtooth', 0.55, 0.2, 0.12);
  }

  // Âm thanh Sao Băng Cầu Nguyện Genshin Impact (3★ Xanh / 4★ Tím / 5★ Vàng Kim)
  wishMeteor(maxStar = 3) {
    const harp = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    harp.forEach((n, idx) => {
      this.playTone(n, 'sine', 0.28, 0.14, idx * 0.075);
    });
    if (maxStar === 5) {
      this.playImpactThud(185, 32, 0.45, 0.42, 0.85);
      this.playTone(587.33, 'triangle', 0.55, 0.22, 0.88);
      this.playTone(880, 'sine', 0.65, 0.22, 0.95);
      this.playTone(1760, 'triangle', 0.75, 0.18, 1.02);
    } else if (maxStar === 4) {
      this.playImpactThud(150, 42, 0.32, 0.32, 0.85);
      this.playTone(523.25, 'triangle', 0.42, 0.18, 0.88);
      this.playTone(1046.5, 'sine', 0.48, 0.16, 0.95);
    } else {
      this.playTone(783.99, 'sine', 0.32, 0.14, 0.85);
    }
  }
}

const sfx = new SoundFX();

function createDeck() {
  const deck = [];
  for (let r = 0; r < 13; r++) {
    for (let s = 0; s < 4; s++) {
      deck.push({
        id: `${RANKS[r]}${SUITS[s]}`,
        rankIndex: r,
        suitIndex: s,
        rank: RANKS[r],
        suit: SUITS[s],
        value: r * 4 + s,
        isRed: s >= 2,
      });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortCardsAsc(cards) {
  return [...cards].sort((a, b) => a.value - b.value);
}

function classifyCombo(cards) {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCardsAsc(cards);
  const n = sorted.length;
  const highCard = sorted[n - 1];
  const highValue = highCard.value;
  const highRank = highCard.rankIndex;

  if (n === 1) {
    return {
      type: COMBO_TYPES.SINGLE,
      cards: sorted,
      length: 1,
      highCard,
      highValue,
      highRank,
      label: `Lẻ ${highCard.rank}${highCard.suit}`,
    };
  }

  if (n === 2) {
    if (sorted[0].rankIndex === sorted[1].rankIndex) {
      return {
        type: COMBO_TYPES.PAIR,
        cards: sorted,
        length: 2,
        highCard,
        highValue,
        highRank,
        label: `Đôi ${highCard.rank}`,
      };
    }
    return null;
  }

  if (n === 3) {
    if (
      sorted[0].rankIndex === sorted[1].rankIndex &&
      sorted[1].rankIndex === sorted[2].rankIndex
    ) {
      return {
        type: COMBO_TYPES.TRIPLE,
        cards: sorted,
        length: 3,
        highCard,
        highValue,
        highRank,
        label: `Sám cô ${highCard.rank}`,
      };
    }
  }

  if (n === 4) {
    if (
      sorted[0].rankIndex === sorted[1].rankIndex &&
      sorted[1].rankIndex === sorted[2].rankIndex &&
      sorted[2].rankIndex === sorted[3].rankIndex
    ) {
      return {
        type: COMBO_TYPES.FOUR_OF_A_KIND,
        cards: sorted,
        length: 4,
        highCard,
        highValue,
        highRank,
        isBomb: true,
        label: `Tứ quý ${highCard.rank}`,
      };
    }
  }

  if ((n === 6 || n === 8) && highRank < 12) {
    let isConsecutivePairs = true;
    for (let i = 0; i < n; i += 2) {
      if (sorted[i].rankIndex !== sorted[i + 1].rankIndex) {
        isConsecutivePairs = false;
        break;
      }
      if (i > 0 && sorted[i].rankIndex !== sorted[i - 2].rankIndex + 1) {
        isConsecutivePairs = false;
        break;
      }
    }
    if (isConsecutivePairs) {
      const pairCount = n / 2;
      return {
        type: pairCount === 3 ? COMBO_TYPES.THREE_PAIRS : COMBO_TYPES.FOUR_PAIRS,
        cards: sorted,
        length: n,
        highCard,
        highValue,
        highRank,
        isBomb: true,
        label: `${pairCount} đôi thông (${sorted[0].rank}→${highCard.rank})`,
      };
    }
  }

  if (n >= 3 && highRank < 12) {
    let isStraight = true;
    for (let i = 1; i < n; i++) {
      if (sorted[i].rankIndex !== sorted[i - 1].rankIndex + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      return {
        type: COMBO_TYPES.STRAIGHT,
        cards: sorted,
        length: n,
        highCard,
        highValue,
        highRank,
        label: `Sảnh ${n} lá (${sorted[0].rank}→${highCard.rank}${highCard.suit})`,
      };
    }
  }

  return null;
}

function canBeatCombo(candidate, current) {
  if (!candidate) return { ok: false, isChop: false };
  if (!current) return { ok: true, isChop: false };

  if (candidate.type === current.type && candidate.length === current.length) {
    if (candidate.highValue > current.highValue) {
      const isBombOverBomb =
        candidate.type === COMBO_TYPES.THREE_PAIRS ||
        candidate.type === COMBO_TYPES.FOUR_OF_A_KIND ||
        candidate.type === COMBO_TYPES.FOUR_PAIRS;
      return {
        ok: true,
        isChop: isBombOverBomb,
        chopReason: isBombOverBomb ? `Đè ${current.label} bằng ${candidate.label}!` : undefined,
      };
    }
    return { ok: false, isChop: false };
  }

  const targetIsSingle2 = current.type === COMBO_TYPES.SINGLE && current.highRank === 12;
  const targetIsPair2 = current.type === COMBO_TYPES.PAIR && current.highRank === 12;
  const targetIs3Pairs = current.type === COMBO_TYPES.THREE_PAIRS;
  const targetIsQuad = current.type === COMBO_TYPES.FOUR_OF_A_KIND;

  if (candidate.type === COMBO_TYPES.THREE_PAIRS && targetIsSingle2) {
    return {
      ok: true,
      isChop: true,
      chopReason: `3 đôi thông chặt Heo ${current.highCard.suit}!`,
    };
  }

  if (candidate.type === COMBO_TYPES.FOUR_OF_A_KIND) {
    if (targetIsSingle2 || targetIsPair2 || targetIs3Pairs) {
      return {
        ok: true,
        isChop: true,
        chopReason: `${candidate.label} chặt ${current.label}!`,
      };
    }
  }

  if (candidate.type === COMBO_TYPES.FOUR_PAIRS) {
    if (targetIsSingle2 || targetIsPair2 || targetIs3Pairs || targetIsQuad) {
      return {
        ok: true,
        isChop: true,
        chopReason: `4 đôi thông chặt ${current.label}!`,
      };
    }
  }

  return { ok: false, isChop: false };
}

function checkToiTrang(hand, isFirstMatch) {
  const sorted = sortCardsAsc(hand);
  const rankCounts = new Array(13).fill(0);
  sorted.forEach((c) => rankCounts[c.rankIndex]++);

  if (rankCounts[12] === 4) return 'Tứ Quý Heo (4 quân 2)';
  if (isFirstMatch && rankCounts[0] === 4) return 'Tứ Quý 3 (Ván đầu)';

  let hasDragon = true;
  for (let r = 0; r <= 11; r++) {
    if (rankCounts[r] === 0) {
      hasDragon = false;
      break;
    }
  }
  if (hasDragon) return 'Sảnh Rồng (3 → A)';

  let maxConsecPairs = 0;
  let curConsecPairs = 0;
  for (let r = 0; r <= 11; r++) {
    if (rankCounts[r] >= 2) {
      curConsecPairs++;
      if (curConsecPairs > maxConsecPairs) maxConsecPairs = curConsecPairs;
    } else {
      curConsecPairs = 0;
    }
  }
  if (maxConsecPairs >= 5) return `${maxConsecPairs} Đôi Thông`;

  let totalPairs = 0;
  for (let r = 0; r < 13; r++) {
    totalPairs += Math.floor(rankCounts[r] / 2);
  }
  if (totalPairs >= 6) return '6 Đôi Bất Kỳ';

  return null;
}

function generateAllCombosFromHand(hand, preferredCard = null) {
  const sorted = sortCardsAsc(hand);
  const combos = [];

  const byRank = Array.from({ length: 13 }, () => []);
  sorted.forEach((c) => byRank[c.rankIndex].push(c));

  sorted.forEach((c) => {
    combos.push(classifyCombo([c]));
  });

  for (let r = 0; r < 13; r++) {
    const group = byRank[r];
    if (group.length >= 2) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          combos.push(classifyCombo([group[i], group[j]]));
        }
      }
    }
    if (group.length === 3) {
      combos.push(classifyCombo(group));
    } else if (group.length === 4) {
      combos.push(classifyCombo([group[0], group[1], group[2]]));
      combos.push(classifyCombo([group[0], group[1], group[3]]));
      combos.push(classifyCombo([group[0], group[2], group[3]]));
      combos.push(classifyCombo([group[1], group[2], group[3]]));
      combos.push(classifyCombo(group));
    }
  }

  for (let start = 0; start <= 9; start++) {
    if (byRank[start].length === 0) continue;
    const pickCardForRank = (r) => {
      if (preferredCard && preferredCard.rankIndex === r) return preferredCard;
      return byRank[r][0];
    };

    const currentRun = [pickCardForRank(start)];
    for (let next = start + 1; next <= 11; next++) {
      if (byRank[next].length === 0) break;
      const lowestOfNext = pickCardForRank(next);
      const highestOfNext = byRank[next][byRank[next].length - 1];

      const candidateLow = [...currentRun, lowestOfNext];
      if (candidateLow.length >= 3) {
        combos.push(classifyCombo(candidateLow));
      }
      if (highestOfNext.id !== lowestOfNext.id && candidateLow.length >= 3) {
        combos.push(classifyCombo([...currentRun, highestOfNext]));
      }
      currentRun.push(lowestOfNext);
    }
  }

  for (let start = 0; start <= 9; start++) {
    for (const pairCount of [3, 4]) {
      if (start + pairCount - 1 > 11) continue;
      let ok = true;
      const cards = [];
      for (let r = start; r < start + pairCount; r++) {
        if (byRank[r].length < 2) {
          ok = false;
          break;
        }
        const group = byRank[r];
        if (preferredCard && preferredCard.rankIndex === r) {
          const others = group.filter((c) => c.id !== preferredCard.id);
          const partner =
            r === start + pairCount - 1 ? others[others.length - 1] : others[0];
          cards.push(preferredCard, partner);
        } else if (r === start + pairCount - 1) {
          cards.push(group[group.length - 2], group[group.length - 1]);
        } else {
          cards.push(group[0], group[1]);
        }
      }
      if (ok) {
        const c = classifyCombo(cards);
        if (c) combos.push(c);
      }
    }
  }

  return combos.filter(Boolean);
}

function getValidMoves(
  hand,
  currentCombo,
  mustInclude3Spade = false,
  onlyFourPairsOutTurn = false,
  preferredCard = null
) {
  const all = generateAllCombosFromHand(hand, preferredCard);
  return all.filter((combo) => {
    if (onlyFourPairsOutTurn && combo.type !== COMBO_TYPES.FOUR_PAIRS) {
      return false;
    }
    if (mustInclude3Spade) {
      const has3Spade = combo.cards.some((c) => c.value === 0);
      if (!has3Spade) return false;
    }
    return canBeatCombo(combo, currentCombo).ok;
  });
}

function analyzeLoserHand(hand, wonBy3Spade = false, betPerCard = 100) {
  const b = Math.max(20, Math.round(Number(betPerCard) || 100));
  const sorted = sortCardsAsc(hand);
  const penaltyCardIds = new Set();
  const breakdown = [];
  let totalPenalty = 0;

  if (sorted.length === 13) {
    const congCost = b * 26;
    totalPenalty += congCost;
    breakdown.push({ label: `Cóng 13 lá (-${congCost.toLocaleString()})`, isSpecial: true });
  } else if (sorted.length > 0) {
    const leafCost = sorted.length * b;
    totalPenalty += leafCost;
    breakdown.push({ label: `${sorted.length} lá (-${leafCost.toLocaleString()})`, isSpecial: false });
  }

  const threeSpade = sorted.find((c) => c.value === 0);
  if (threeSpade) {
    const pen3 = Math.round(b * 5);
    totalPenalty += pen3;
    penaltyCardIds.add(threeSpade.id);
    breakdown.push({ label: `Thối 3♠ (-${pen3.toLocaleString()})`, isSpecial: true });
  }

  sorted.forEach((c) => {
    if (c.rankIndex === 12) {
      const pen = Math.round(b * (c.isRed ? 5 : 2.5));
      totalPenalty += pen;
      penaltyCardIds.add(c.id);
      breakdown.push({
        label: `Thối Heo ${c.isRed ? 'đỏ' : 'đen'} 2${c.suit} (-${pen.toLocaleString()})`,
        isSpecial: true,
      });
    }
  });

  const byRank = Array.from({ length: 13 }, () => []);
  sorted.forEach((c) => byRank[c.rankIndex].push(c));

  for (let r = 0; r <= 11; r++) {
    if (byRank[r].length === 4) {
      const penQuad = Math.round(b * 10);
      totalPenalty += penQuad;
      byRank[r].forEach((c) => penaltyCardIds.add(c.id));
      breakdown.push({
        label: `Thối Tứ quý ${RANKS[r]} (-${penQuad.toLocaleString()})`,
        isSpecial: true,
      });
    }
  }

  let runStart = -1;
  let runLen = 0;
  for (let r = 0; r <= 12; r++) {
    if (r <= 11 && byRank[r].length >= 2) {
      if (runLen === 0) runStart = r;
      runLen++;
    } else {
      if (runLen >= 4) {
        const pen4P = Math.round(b * 12.5);
        totalPenalty += pen4P;
        for (let k = runStart; k < runStart + runLen; k++) {
          byRank[k].slice(0, 2).forEach((c) => penaltyCardIds.add(c.id));
        }
        breakdown.push({
          label: `Thối 4 đôi thông (-${pen4P.toLocaleString()})`,
          isSpecial: true,
        });
      } else if (runLen === 3) {
        const pen3P = Math.round(b * 7.5);
        totalPenalty += pen3P;
        for (let k = runStart; k < runStart + 3; k++) {
          byRank[k].slice(0, 2).forEach((c) => penaltyCardIds.add(c.id));
        }
        breakdown.push({
          label: `Thối 3 đôi thông (-${pen3P.toLocaleString()})`,
          isSpecial: true,
        });
      }
      runLen = 0;
    }
  }

  if (wonBy3Spade) {
    const penDut = Math.round(b * 7.5);
    totalPenalty += penDut;
    breakdown.push({ label: `Bị đút 3♠ cuối (-${penDut.toLocaleString()})`, isSpecial: true });
  }

  return {
    totalPenalty,
    breakdown,
    penaltyCardIds,
  };
}

function sortHandByMode(hand, mode) {
  if (mode === 'asc') {
    return sortCardsAsc(hand);
  }
  const sorted = sortCardsAsc(hand);
  const counts = {};
  sorted.forEach((c) => {
    counts[c.rankIndex] = (counts[c.rankIndex] || 0) + 1;
  });
  const multi = sorted.filter((c) => counts[c.rankIndex] >= 2);
  const singles = sorted.filter((c) => counts[c.rankIndex] === 1);
  return [...multi, ...singles];
}

// ============================================================================
// MAIN GAME + WIFI MULTIPLAYER CONTROLLER
// ============================================================================
class TienLenGame {
  constructor() {
    this.loadShopProfile();

    // Chế độ ở Màn Hình Chờ ('bot' | 'human'), Số người bàn Bot (2, 3, 4) & Mức cược hiện tại (Xu / lá)
    this.selectedLobbyMode = 'bot';
    this.soloPlayerCount = this.savedSoloPlayerCount || 4;
    this.betPerCard = this.savedBetPerCard || 100;

    const botBankroll = Math.max(INITIAL_COINS, this.betPerCard * 500);
    this.players = [
      { id: 0, name: this.savedPlayerName || 'Thắng', avatar: this.equippedAvatar, cardSkin: this.equippedSkin, chopBurst: this.equippedChopBurst, winBurst: this.equippedWinBurst, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
      { id: 1, name: 'Bot Furina', avatar: BOT_ANIME_AVATARS[1], cardSkin: 'furina', chopBurst: 'furina', winBurst: 'furina', isBot: true, active: this.soloPlayerCount >= 3, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Bot Raiden Shogun', avatar: BOT_ANIME_AVATARS[2], cardSkin: 'raiden', chopBurst: 'raiden', winBurst: 'raiden', isBot: true, active: true, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Bot Skirk', avatar: BOT_ANIME_AVATARS[3], cardSkin: 'skirk', chopBurst: 'skirk', winBurst: 'skirk', isBot: true, active: this.soloPlayerCount === 4, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
    ];

    // Multiplayer state (Giữ cố định clientId trong localStorage để F5 không bị mất ghế hoặc reset đồ)
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    try {
      let savedCid = localStorage.getItem('tlmn_client_id');
      if (!savedCid) {
        savedCid = 'client_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('tlmn_client_id', savedCid);
      }
      this.myClientId = savedCid;
    } catch (_) {
      this.myClientId = 'client_' + Math.random().toString(36).substring(2, 10);
    }
    this.mySeatId = 0;
    this.lanServerIp = '192.168.85.102';
    this.lanServerPort = 8080;
    this.publicTunnelUrl = '';
    this.pollTimer = null;
    this.lastSyncedVersion = 0;
    this.peer = null;
    this.peerConnections = [];
    this.hostConn = null;

    this.matchCount = 0;
    this.lastWinnerId = null;
    this.currentTurn = 0;
    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.mustPlay3Spade = false;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;

    this.selectedCardIds = new Set();
    this.companionCardIds = new Set();
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.lastSummaryData = null;
    this.lastBurstEffect = null;
    this.lastShownBurstId = 0;
    this.burstTimeout = null;
    this.logsData = [];

    this.sortMode = 'asc';
    this.hintIndex = 0;
    this.botDelay = 850;
    this.speedMode = 1;
    this.isGameOver = false;
    this.botTimer = null;

    this.bindDOM();
    this.renderSoloPlayerCountUI();
    this.renderBetTiers();
    this.renderLobbyModal();
    this.detectLanInfoAndUrlRoom();
    this.fetchLiveAnimeImages();
    this.startNewMatch(true);
    if (this.dailyRecoveredOnLoad) {
      this.addLog(
        `🌅 <strong>Quà Hồi Phục Hàng Ngày:</strong> Tài khoản của bạn vừa được hồi <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> cho ngày mới!`,
        'log-win'
      );
    }
  }

  fetchLiveAnimeImages() {
    // Tải trước (Preload) GIF Kỹ Năng Nộ & Fanart đang trang bị để phát tức thì
    try {
      const bChop = getBurstMeta(this.equippedChopBurst);
      const bWin = getBurstMeta(this.equippedWinBurst);
      const preloadList = [
        bChop ? bChop.gifUrl : '',
        bWin ? bWin.gifUrl : '',
        getCardSkinMeta(this.equippedSkin).imgUrl,
        ...Object.values(BOT_ANIME_AVATARS),
      ].filter(Boolean);
      preloadList.forEach((url) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      });
    } catch (_) {}
  }

  triggerGenshinBurst(burstId, detailText, onDoneCallback = null) {
    if (!burstId || burstId === 'none') {
      if (onDoneCallback) {
        setTimeout(onDoneCallback, 450);
      }
      return;
    }

    const overlay = document.getElementById('genshin-burst-overlay');
    const burstMeta = getBurstMeta(burstId);
    if (!overlay || !burstMeta) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    const videoEl = document.getElementById('burst-video');
    const imgEl = document.getElementById('burst-character-img');
    const chakraEl = document.getElementById('burst-chakra-ring');
    const slashContainer = document.getElementById('burst-slash-container');
    const tagEl = document.getElementById('burst-skill-tag');
    const titleEl = document.getElementById('burst-skill-title');
    const quoteEl = document.getElementById('burst-skill-quote');
    const detailEl = document.getElementById('burst-skill-detail');
    const tableEl = document.querySelector('.casino-table');

    overlay.classList.remove(
      'hidden',
      'theme-raiden',
      'theme-skirk',
      'theme-electro',
      'theme-abyss',
      'theme-pyro',
      'theme-hydro',
      'theme-cryo'
    );
    overlay.classList.add(burstMeta.theme || 'theme-electro');

    if (tableEl) {
      tableEl.classList.remove('burst-shake');
      void tableEl.offsetWidth;
      tableEl.classList.add('burst-shake');
    }

    const isFileProtocol = window.location.protocol === 'file:';

    if (burstMeta.sfxType === 'skirk') {
      sfx.skirkBurst();
    } else {
      sfx.raidenBurst();
    }

    imgEl.src = isFileProtocol && burstMeta.remoteGif.startsWith('http') ? burstMeta.remoteGif : burstMeta.gifUrl;
    imgEl.onerror = () => {
      if (burstMeta.remoteGif) imgEl.src = burstMeta.remoteGif;
    };

    if (videoEl) {
      if (!isFileProtocol && burstMeta.mp4Url) {
        videoEl.style.display = 'block';
        videoEl.src = burstMeta.mp4Url;
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {
          videoEl.style.display = 'none';
        });
        videoEl.onerror = () => {
          videoEl.style.display = 'none';
        };
      } else {
        videoEl.style.display = 'none';
      }
    }

    tagEl.textContent = burstMeta.tag;
    titleEl.textContent = burstMeta.title;
    quoteEl.textContent = burstMeta.quote;
    detailEl.textContent = detailText || `💥 Tuyệt Kỹ Nộ: ${burstMeta.name}!`;

    if (burstMeta.sfxType === 'raiden') {
      chakraEl.innerHTML = `
        <svg viewBox="0 0 200 200" width="90%" height="90%">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#e879f9" stroke-width="2.5" stroke-dasharray="10 6"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#c084fc" stroke-width="1.5"/>
          <polygon points="100,14 122,78 186,100 122,122 100,186 78,122 14,100 78,78" fill="none" stroke="#f0abfc" stroke-width="2" opacity="0.75"/>
        </svg>
      `;

      slashContainer.innerHTML = `
        <div class="raiden-slash-beam"></div>
        <svg class="burst-svg-fx" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <polyline points="0,480 230,380 210,415 490,295 475,325 760,195 1000,90" fill="none" stroke="#ffffff" stroke-width="5" filter="drop-shadow(0 0 16px #d946ef)"/>
          <polyline points="120,80 340,260 320,290 610,360 890,520" fill="none" stroke="#e879f9" stroke-width="3" opacity="0.85"/>
          <polyline points="680,40 540,240 580,260 410,490" fill="none" stroke="#c084fc" stroke-width="3" opacity="0.8"/>
        </svg>
      `;
    } else {
      chakraEl.innerHTML = `
        <svg viewBox="0 0 200 200" width="92%" height="92%">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="14 6"/>
          <polygon points="100,8 126,74 192,100 126,126 100,192 74,126 8,100 74,74" fill="none" stroke="#7dd3fc" stroke-width="2.2"/>
          <polygon points="35,35 100,68 165,35 132,100 165,165 100,132 35,165 68,100" fill="none" stroke="#e879f9" stroke-width="1.8" opacity="0.8"/>
        </svg>
      `;

      slashContainer.innerHTML = `
        <div class="skirk-slash-beam-1"></div>
        <div class="skirk-slash-beam-2"></div>
        <svg class="burst-svg-fx" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <line x1="50" y1="520" x2="950" y2="80" stroke="#7dd3fc" stroke-width="4"/>
          <line x1="80" y1="90" x2="920" y2="510" stroke="#e879f9" stroke-width="4"/>
          <polygon points="500,220 520,280 580,300 520,320 500,380 480,320 420,300 480,280" fill="#ffffff" opacity="0.9"/>
        </svg>
      `;
    }

    clearTimeout(this.burstTimeout);
    const finishBurst = () => {
      clearTimeout(this.burstTimeout);
      if (videoEl) {
        try {
          videoEl.pause();
        } catch (_) {}
      }
      overlay.classList.add('hidden');
      overlay.onclick = null;
      if (onDoneCallback) onDoneCallback();
    };

    overlay.onclick = finishBurst;
    this.burstTimeout = setTimeout(finishBurst, 3000);
  }

  // ============================================================================
  // ANIME SHOP, 20,000 XU INITIAL BALANCE & DAILY RECOVERY (+5,000 XU / DAY)
  // ============================================================================
  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }

  readBackupPayloads() {
    const list = [];
    try {
      const raw = localStorage.getItem('tlmn_genshin_vault_v9');
      if (raw) list.push(JSON.parse(raw));
    } catch (_) {}
    try {
      const match = document.cookie.match(/(?:^|;\s*)tlmn_vault_v9=([^;]+)/);
      if (match && match[1]) {
        list.push(JSON.parse(decodeURIComponent(match[1])));
      }
    } catch (_) {}
    try {
      if (window.name && window.name.startsWith('TLMN_VAULT_V9:')) {
        list.push(JSON.parse(window.name.slice('TLMN_VAULT_V9:'.length)));
      }
    } catch (_) {}
    return list;
  }

  loadShopProfile() {
    const today = this.getTodayKey();
    // Người chơi mới bắt đầu với 20,000 Xu và chỉ có Bộ bài Cổ Điển + Avatar Tân Binh (phải cày Xu mới mua được đồ!)
    this.savedCoins = INITIAL_COINS;
    this.savedPlayerName = 'Thắng';
    this.savedBetPerCard = 100;
    this.savedSoloPlayerCount = 4;
    this.unlockedSkins = new Set(['classic']);
    this.equippedSkin = 'classic';
    this.unlockedAvatars = new Set(['default_player']);
    this.equippedAvatar = 'default_player';
    this.unlockedBursts = new Set();
    this.equippedChopBurst = 'none';
    this.equippedWinBurst = 'none';
    this.gachaPity5 = 0;
    this.gachaPity4 = 0;
    this.gachaGuaranteed5 = false;
    this.gachaGuaranteed4 = false;
    this.selectedBannerBurstId = 'raiden';
    this.totalWishes = 0;
    this.gachaHistory = [];
    this.lastDailyDate = today;
    this.dailyReliefUsed = 0;
    this.dailyRecoveredOnLoad = false;

    try {
      const backups = this.readBackupPayloads();
      backups.forEach((data) => {
        if (!data || typeof data !== 'object') return;
        if (typeof data.coins === 'number') {
          this.savedCoins = data.coins;
        }
        if (data.playerName) {
          this.savedPlayerName = data.playerName;
        }
        if (typeof data.betPerCard === 'number' && data.betPerCard >= 20) {
          this.savedBetPerCard = data.betPerCard;
        }
        if ([2, 3, 4].includes(Number(data.soloPlayerCount))) {
          this.savedSoloPlayerCount = Number(data.soloPlayerCount);
        }
        if (typeof data.gachaPity5 === 'number') this.gachaPity5 = Math.max(0, Math.min(89, data.gachaPity5));
        if (typeof data.gachaPity4 === 'number') this.gachaPity4 = Math.max(0, Math.min(9, data.gachaPity4));
        if (typeof data.gachaGuaranteed5 === 'boolean') this.gachaGuaranteed5 = data.gachaGuaranteed5;
        if (typeof data.gachaGuaranteed4 === 'boolean') this.gachaGuaranteed4 = data.gachaGuaranteed4;
        if (data.selectedBannerBurstId && GENSHIN_BURSTS.some((b) => b.id === data.selectedBannerBurstId)) {
          this.selectedBannerBurstId = data.selectedBannerBurstId;
        }
        if (typeof data.totalWishes === 'number') this.totalWishes = data.totalWishes;
        if (Array.isArray(data.gachaHistory)) this.gachaHistory = data.gachaHistory.slice(0, 40);
        if (Array.isArray(data.unlockedSkins)) {
          data.unlockedSkins.forEach((id) => {
            if (ANIME_CARD_SKINS.some((s) => s.id === id)) {
              this.unlockedSkins.add(id);
            }
          });
        }
        if (data.equippedSkin && this.unlockedSkins.has(data.equippedSkin)) {
          this.equippedSkin = data.equippedSkin;
        }
        if (Array.isArray(data.unlockedAvatars)) {
          data.unlockedAvatars.forEach((id) => {
            if (ANIME_AVATARS.some((a) => a.id === id)) {
              this.unlockedAvatars.add(id);
            }
          });
        }
        if (data.equippedAvatar && this.unlockedAvatars.has(data.equippedAvatar)) {
          this.equippedAvatar = data.equippedAvatar;
        }
        if (Array.isArray(data.unlockedBursts)) {
          data.unlockedBursts.forEach((id) => {
            if (GENSHIN_BURSTS.some((b) => b.id === id)) {
              this.unlockedBursts.add(id);
            }
          });
        }
        if (data.equippedChopBurst && this.unlockedBursts.has(data.equippedChopBurst)) {
          this.equippedChopBurst = data.equippedChopBurst;
        }
        if (data.equippedWinBurst && this.unlockedBursts.has(data.equippedWinBurst)) {
          this.equippedWinBurst = data.equippedWinBurst;
        }
        if (data.lastDailyDate) this.lastDailyDate = data.lastDailyDate;
        if (typeof data.dailyReliefUsed === 'number') this.dailyReliefUsed = data.dailyReliefUsed;
      });

      // Nếu bước sang ngày mới: tự động hồi +5,000 xu và reset lượt cứu trợ trong ngày
      if (this.lastDailyDate !== today) {
        this.lastDailyDate = today;
        this.dailyReliefUsed = 0;
        if (this.savedCoins < INITIAL_COINS) {
          this.savedCoins = Math.min(INITIAL_COINS, this.savedCoins + DAILY_RECOVERY_COINS);
          this.dailyRecoveredOnLoad = true;
        } else {
          this.savedCoins += Math.floor(DAILY_RECOVERY_COINS / 2);
          this.dailyRecoveredOnLoad = true;
        }
      }

      this.saveShopProfile();
    } catch (_) {}
  }

  saveShopProfile() {
    try {
      if (this.players) {
        const me = this.getLocalPlayer();
        const isTrulyMe =
          !this.isMultiplayer ||
          (me && me.clientId === this.myClientId) ||
          (this.isHost && this.mySeatId === 0);
        if (me && isTrulyMe && typeof me.coins === 'number') {
          this.savedCoins = me.coins;
        }
      }

      // Gộp (Union) với dữ liệu v9 đã lưu để không bao giờ mất đồ đã mua
      const backups = this.readBackupPayloads();
      backups.forEach((old) => {
        if (!old || typeof old !== 'object') return;
        if (Array.isArray(old.unlockedSkins)) {
          old.unlockedSkins.forEach((id) => this.unlockedSkins.add(id));
        }
        if (Array.isArray(old.unlockedAvatars)) {
          old.unlockedAvatars.forEach((id) => this.unlockedAvatars.add(id));
        }
        if (Array.isArray(old.unlockedBursts)) {
          old.unlockedBursts.forEach((id) => this.unlockedBursts.add(id));
        }
      });

      const nameInput = document.getElementById('input-player-name');
      if (nameInput && nameInput.value.trim()) {
        this.savedPlayerName = nameInput.value.trim();
      }

      const payload = {
        coins: this.savedCoins,
        playerName: this.savedPlayerName || 'Thắng',
        betPerCard: this.betPerCard || 100,
        soloPlayerCount: this.soloPlayerCount || 4,
        unlockedSkins: Array.from(this.unlockedSkins),
        equippedSkin: this.equippedSkin,
        unlockedAvatars: Array.from(this.unlockedAvatars),
        equippedAvatar: this.equippedAvatar,
        unlockedBursts: Array.from(this.unlockedBursts),
        equippedChopBurst: this.equippedChopBurst || 'none',
        equippedWinBurst: this.equippedWinBurst || 'none',
        gachaPity5: this.gachaPity5 || 0,
        gachaPity4: this.gachaPity4 || 0,
        gachaGuaranteed5: !!this.gachaGuaranteed5,
        gachaGuaranteed4: !!this.gachaGuaranteed4,
        selectedBannerBurstId: this.selectedBannerBurstId || 'raiden',
        totalWishes: this.totalWishes || 0,
        gachaHistory: (this.gachaHistory || []).slice(0, 40),
        lastDailyDate: this.lastDailyDate || this.getTodayKey(),
        dailyReliefUsed: this.dailyReliefUsed || 0,
      };
      const jsonStr = JSON.stringify(payload);
      localStorage.setItem('tlmn_genshin_vault_v9', jsonStr);
      document.cookie = `tlmn_vault_v9=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000; SameSite=Lax`;
      window.name = `TLMN_VAULT_V9:${jsonStr}`;

      const lobbyBal = document.getElementById('lobby-balance-display');
      if (lobbyBal) lobbyBal.textContent = this.savedCoins.toLocaleString();
    } catch (_) {}
  }

  checkAndTriggerAutoRelief() {
    // Tự động hồi vốn nếu người chơi hoặc Bot cạn tiền sau ván bài
    const today = this.getTodayKey();
    if (this.lastDailyDate !== today) {
      this.lastDailyDate = today;
      this.dailyReliefUsed = 0;
    }

    this.players.forEach((p) => {
      if (!p.active) return;
      if (p.isBot) {
        const minBotCoins = Math.max(INITIAL_COINS, this.betPerCard * 80);
        if (p.coins < this.betPerCard * 15) {
          p.coins = Math.max(0, p.coins) + minBotCoins;
          this.addLog(
            `🤖 <strong>${p.name}</strong> vừa nạp thêm <strong>+${minBotCoins.toLocaleString()} xu</strong> từ Ngân Hàng Fontaine để tiếp tục đấu cược lớn!`,
            'log-play'
          );
        }
      } else if (p.coins < 500) {
        p.coins = Math.max(0, p.coins) + DAILY_RECOVERY_COINS;
        if (p.id === this.mySeatId) {
          this.dailyReliefUsed = Math.min(MAX_DAILY_RELIEF_CLAIMS, this.dailyReliefUsed + 1);
          this.saveShopProfile();
        }
        this.addLog(
          `💖 <strong>Trợ Cấp Hồi Vốn Mỗi Ngày:</strong> <strong>${p.name}</strong> cạn xu nên được hệ thống hồi ngay <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> để chơi tiếp!`,
          'log-win'
        );
      }
    });
  }

  // ============================================================================
  // HỆ THỐNG CẦU NGUYỆN GACHA CHUẨN GENSHIN IMPACT & KHO ĐỒ TRANG BỊ
  // - 5★ (⭐⭐⭐⭐⭐): 10 Hiệu Ứng Kỹ Năng Nộ (Base 0.6%, Soft Pity từ 74 +6%/lượt, Hard Pity 90, 50/50 & Đại Bảo Hiểm UP)
  // - 4★ (⭐⭐⭐⭐): 29 Decor / Skin Bài Fanart (Base 5.1%, Soft Pity lượt 9: 56.1%, Hard Pity 10: 100%, 50/50 Rate-Up)
  // - 3★ (⭐⭐⭐): 29 Avatar Fanart Nhân Vật (94.3% cơ bản)
  // - Trùng đồ: Tự động quy đổi Tinh Huy / Tinh Trần hoàn trả Xu (+600 / +3,200 / +16,000 Xu)
  // ============================================================================
  get5StarDropChance(pullNum5) {
    if (pullNum5 <= 73) return 0.006; // 0.6% cơ bản từ lượt 1 -> 73
    if (pullNum5 >= 90) return 1.0;   // 100% Bảo hiểm cứng ở lượt 90
    return Math.min(1.0, 0.006 + (pullNum5 - 73) * 0.06); // Soft Pity: tăng +6% mỗi lượt từ lượt 74
  }

  get4StarDropChance(pullNum4) {
    if (pullNum4 <= 8) return 0.051;  // 5.1% cơ bản từ lượt 1 -> 8
    if (pullNum4 === 9) return 0.561; // Soft Pity 4★ ở lượt 9: 56.1%
    return 1.0;                       // Hard Pity 4★ ở lượt 10: 100%
  }

  selectBannerUp(burstId) {
    if (!GENSHIN_BURSTS.some((b) => b.id === burstId)) return;
    this.selectedBannerBurstId = burstId;
    sfx.click();
    this.saveShopProfile();
    this.renderShopModal();
  }

  switchShopTab(tabName) {
    this.activeShopTab = tabName;
    const tabs = ['gacha', 'bursts', 'skins', 'avatars', 'history'];
    tabs.forEach((t) => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tabName);
    });
    document.getElementById('shop-gacha-panel')?.classList.toggle('hidden', tabName !== 'gacha');
    document.getElementById('shop-bursts-grid')?.classList.toggle('hidden', tabName !== 'bursts');
    document.getElementById('shop-skins-grid')?.classList.toggle('hidden', tabName !== 'skins');
    document.getElementById('shop-avatars-grid')?.classList.toggle('hidden', tabName !== 'avatars');
    document.getElementById('shop-history-panel')?.classList.toggle('hidden', tabName !== 'history');
    sfx.click();
  }

  openGachaForCharacter(charId) {
    if (charId && GENSHIN_BURSTS.some((b) => b.id === charId)) {
      this.selectedBannerBurstId = charId;
    }
    this.saveShopProfile();
    this.renderShopModal();
    this.switchShopTab('gacha');
  }

  rollSingleWish() {
    this.gachaPity5 = (this.gachaPity5 || 0) + 1;
    this.gachaPity4 = (this.gachaPity4 || 0) + 1;
    this.totalWishes = (this.totalWishes || 0) + 1;

    const p5 = this.get5StarDropChance(this.gachaPity5);
    const p4 = this.get4StarDropChance(this.gachaPity4);
    const roll = Math.random();

    const featuredId = this.selectedBannerBurstId || 'raiden';
    const rateUp4Ids = BANNER_4STAR_RATEUPS[featuredId] || ['raiden', 'furina', 'skirk'];
    const me = this.getLocalPlayer();

    // 1. KIỂM TRA NỔ 5 SAO (⭐⭐⭐⭐⭐ HIỆU ỨNG KỸ NĂNG NỘ)
    if (roll < p5) {
      const hitPity = this.gachaPity5;
      this.gachaPity5 = 0;

      let chosenBurst = null;
      let rateNote = '';
      if (this.gachaGuaranteed5) {
        chosenBurst = getBurstMeta(featuredId);
        this.gachaGuaranteed5 = false;
        rateNote = '🔥 Nổ Đại Bảo Hiểm 100% UP';
      } else if (Math.random() < 0.55) {
        // 50/50 + Capturing Radiance (55% thắng UP)
        chosenBurst = getBurstMeta(featuredId);
        this.gachaGuaranteed5 = false;
        rateNote = '🎯 Thắng 50/50 (Trúng UP)';
      } else {
        const others = GENSHIN_BURSTS.filter((b) => b.id !== featuredId);
        chosenBurst = others[Math.floor(Math.random() * others.length)] || GENSHIN_BURSTS[0];
        this.gachaGuaranteed5 = true;
        rateNote = '☯️ Lệch 50/50 (Kích hoạt Đại Bảo Hiểm)';
      }

      const alreadyOwned = this.unlockedBursts.has(chosenBurst.id);
      const refund = alreadyOwned ? DUPLICATE_REFUND_COINS[5] : 0;
      if (!alreadyOwned) {
        this.unlockedBursts.add(chosenBurst.id);
        // Tự động gắn Nộ nếu người chơi chưa gắn Nộ nào
        if (!this.equippedChopBurst || this.equippedChopBurst === 'none') {
          this.equippedChopBurst = chosenBurst.id;
          if (me) me.chopBurst = chosenBurst.id;
        }
        if (!this.equippedWinBurst || this.equippedWinBurst === 'none') {
          this.equippedWinBurst = chosenBurst.id;
          if (me) me.winBurst = chosenBurst.id;
        }
      }

      const result = {
        star: 5,
        category: 'burst',
        typeLabel: '🎬 KỸ NĂNG NỘ 5★',
        id: chosenBurst.id,
        name: chosenBurst.name,
        thumbUrl: chosenBurst.gifUrl,
        isNew: !alreadyOwned,
        refund,
        pityUsed: hitPity,
        rateNote,
      };
      this.gachaHistory.unshift(result);
      this.gachaHistory = this.gachaHistory.slice(0, 40);
      return result;
    }

    // 2. KIỂM TRA NỔ 4 SAO (⭐⭐⭐⭐ DECOR / SKIN BÀI FANART)
    if (roll < p5 + p4) {
      const hitPity = this.gachaPity4;
      this.gachaPity4 = 0;

      const skinPool = ANIME_CARD_SKINS.filter((s) => s.id !== 'classic');
      let chosenSkin = null;
      let rateNote = '';

      if (this.gachaGuaranteed4 || Math.random() < 0.5) {
        const upPool = skinPool.filter((s) => rateUp4Ids.includes(s.id));
        chosenSkin = upPool[Math.floor(Math.random() * upPool.length)] || skinPool[0];
        this.gachaGuaranteed4 = false;
        rateNote = '💜 Trúng 4★ Rate-Up';
      } else {
        const nonUpPool = skinPool.filter((s) => !rateUp4Ids.includes(s.id));
        chosenSkin = nonUpPool[Math.floor(Math.random() * nonUpPool.length)] || skinPool[0];
        this.gachaGuaranteed4 = true;
        rateNote = '💜 4★ Thường (Lần sau 100% Rate-Up)';
      }

      const alreadyOwned = this.unlockedSkins.has(chosenSkin.id);
      const refund = alreadyOwned ? DUPLICATE_REFUND_COINS[4] : 0;
      if (!alreadyOwned) {
        this.unlockedSkins.add(chosenSkin.id);
        if (this.equippedSkin === 'classic') {
          this.equippedSkin = chosenSkin.id;
          if (me) me.cardSkin = chosenSkin.id;
        }
      }

      const result = {
        star: 4,
        category: 'skin',
        typeLabel: '🃏 DECOR BÀI 4★',
        id: chosenSkin.id,
        name: chosenSkin.name,
        thumbUrl: chosenSkin.imgUrl,
        isNew: !alreadyOwned,
        refund,
        pityUsed: hitPity,
        rateNote,
      };
      this.gachaHistory.unshift(result);
      this.gachaHistory = this.gachaHistory.slice(0, 40);
      return result;
    }

    // 3. MẶC ĐỊNH RA 3 SAO (⭐⭐⭐ AVATAR FANART NHÂN VẬT)
    const avatarPool = ANIME_AVATARS.filter((a) => a.id !== 'default_player');
    const chosenAvatar = avatarPool[Math.floor(Math.random() * avatarPool.length)] || avatarPool[0];
    const alreadyOwned = this.unlockedAvatars.has(chosenAvatar.id);
    const refund = alreadyOwned ? DUPLICATE_REFUND_COINS[3] : 0;
    if (!alreadyOwned) {
      this.unlockedAvatars.add(chosenAvatar.id);
      if (this.equippedAvatar === 'default_player') {
        this.equippedAvatar = chosenAvatar.id;
        if (me) me.avatar = chosenAvatar.id;
      }
    }

    const result = {
      star: 3,
      category: 'avatar',
      typeLabel: '🖼️ AVATAR 3★',
      id: chosenAvatar.id,
      name: `Avatar: ${chosenAvatar.name}`,
      thumbUrl: chosenAvatar.imgUrl,
      isNew: !alreadyOwned,
      refund,
      pityUsed: this.gachaPity5,
      rateNote: '3★ Tiêu chuẩn',
    };
    this.gachaHistory.unshift(result);
    this.gachaHistory = this.gachaHistory.slice(0, 40);
    return result;
  }

  performWish(count = 1) {
    const me = this.getLocalPlayer();
    if (!me) return;
    const pullCount = count === 10 ? 10 : 1;
    const cost = pullCount === 10 ? WISH_COST_TEN : WISH_COST_SINGLE;

    if (me.coins < cost) {
      alert(
        `⚠️ Bạn chưa đủ Xu để Cầu Nguyện ×${pullCount} (Cần ${cost.toLocaleString()} Xu, hiện có ${me.coins.toLocaleString()} Xu)!\n💡 Hãy đánh thắng thêm ván bài hoặc bấm nút "🎁 Hồi Xu Hàng Ngày (+5,000 Xu)" ở góc dưới nhé!`
      );
      return;
    }

    me.coins -= cost;
    const results = [];
    let totalRefund = 0;

    for (let i = 0; i < pullCount; i++) {
      const item = this.rollSingleWish();
      results.push(item);
      if (item.refund > 0) {
        totalRefund += item.refund;
      }
    }

    if (totalRefund > 0) {
      me.coins += totalRefund;
    }

    const maxStar = Math.max(...results.map((r) => r.star));
    const newUnlocks = results.filter((r) => r.isNew).length;
    this.addLog(
      `🌠 <strong>Cầu Nguyện ×${pullCount}:</strong> Nổ cao nhất <strong>${maxStar}★</strong> (${newUnlocks} món mới${
        totalRefund > 0 ? ` • Hoàn +${totalRefund.toLocaleString()} xu từ đồ trùng` : ''
      })!`,
      maxStar === 5 ? 'log-win' : 'log-play'
    );

    this.saveShopProfile();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
    this.showGachaMeteorAndResults(results, totalRefund);
  }

  showGachaMeteorAndResults(results, totalRefund) {
    const overlay = document.getElementById('gacha-wish-overlay');
    const meteorStage = document.getElementById('gacha-meteor-stage');
    const resultsStage = document.getElementById('gacha-results-stage');
    const meteorTrack = document.getElementById('gacha-meteor-track');
    const meteorCaption = document.getElementById('gacha-meteor-caption');
    const resultsGrid = document.getElementById('gacha-results-grid');
    const refundSummary = document.getElementById('gacha-refund-summary');
    const resultsTitle = document.getElementById('gacha-results-title');
    const resultsBal = document.getElementById('gacha-results-balance');

    if (!overlay || !meteorStage || !resultsStage) return;

    const maxStar = Math.max(...results.map((r) => r.star));
    sfx.wishMeteor(maxStar);

    overlay.classList.remove('hidden');
    meteorStage.classList.remove('hidden');
    resultsStage.classList.add('hidden');

    if (meteorTrack) {
      meteorTrack.className = `gacha-meteor-track meteor-${maxStar}`;
      // Restart CSS animation
      meteorTrack.style.animation = 'none';
      void meteorTrack.offsetWidth;
      meteorTrack.style.animation = '';
    }

    if (meteorCaption) {
      meteorCaption.textContent =
        maxStar === 5
          ? '🌟 ÁNH SÁNG VÀNG KIM 5 SAO RỰC CHÁY TRÊN BẦU TRỜI TEYVAT!'
          : maxStar === 4
          ? '💜 Ánh sao tím 4 Sao lấp lánh xuyên qua màn đêm...'
          : '🌠 Sao băng Cầu Nguyện đang rơi xuống...';
    }

    // Sắp xếp kết quả: 5★ lên đầu, tiếp theo 4★, rồi 3★ (chuẩn Genshin 10x summary)
    const sorted = [...results].sort((a, b) => b.star - a.star || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

    if (resultsTitle) {
      resultsTitle.textContent =
        maxStar === 5
          ? `🌟 CHÚC MỪNG NỔ 5 SAO (⭐⭐⭐⭐⭐) — KẾT QUẢ CẦU NGUYỆN ×${results.length}`
          : `🌠 KẾT QUẢ CẦU NGUYỆN ×${results.length}`;
    }

    if (refundSummary) {
      if (totalRefund > 0) {
        refundSummary.textContent = `♻️ Tinh Huy quy đổi đồ trùng: Hoàn lại +${totalRefund.toLocaleString()} Xu!`;
        refundSummary.classList.remove('hidden');
      } else {
        refundSummary.textContent = '✨ Toàn bộ vật phẩm đều là Mở Khóa Mới!';
        refundSummary.classList.remove('hidden');
      }
    }

    const me = this.getLocalPlayer();
    if (resultsBal && me) {
      resultsBal.textContent = me.coins.toLocaleString();
    }

    if (resultsGrid) {
      resultsGrid.classList.toggle('single-pull', sorted.length === 1);
      resultsGrid.innerHTML = sorted
        .map((item, idx) => {
          const starsStr = '⭐'.repeat(item.star);
          const statusHtml = item.isNew
            ? `<div class="gacha-result-status is-new">✨ MỚI MỞ KHÓA!</div>`
            : `<div class="gacha-result-status is-dup">♻️ Đã có ➔ Hoàn +${item.refund.toLocaleString()} Xu</div>`;

          const quickEquipBtn =
            item.category === 'burst'
              ? `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.triggerGenshinBurst('${item.id}', '🎬 Xem thử Kỹ Năng Nộ 5★: ${item.name}!')">▶ Xem Nộ 5★</button>`
              : item.category === 'skin'
              ? `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.buyOrEquipSkin('${item.id}')">🃏 Trang bị Bài</button>`
              : `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.buyOrEquipAvatar('${item.id}')">🎭 Dùng Avatar</button>`;

          return `
            <div class="gacha-result-card star-${item.star}" style="animation-delay:${idx * 0.055}s">
              <div class="rarity-stars-badge rarity-${item.star}">${starsStr}</div>
              <img class="gacha-result-thumb" src="${item.thumbUrl}" alt="${item.name}" referrerpolicy="no-referrer" />
              <div class="gacha-result-type">${item.typeLabel}</div>
              <div class="gacha-result-name">${item.name}</div>
              <div style="font-size:10px;color:#cbd5e1;">${item.rateNote}</div>
              ${statusHtml}
              ${quickEquipBtn}
            </div>
          `;
        })
        .join('');
    }

    const revealResults = () => {
      clearTimeout(this.gachaMeteorTimer);
      meteorStage.classList.add('hidden');
      resultsStage.classList.remove('hidden');
      if (maxStar === 5) {
        sfx.win();
      }
    };

    const skipBtn = document.getElementById('btn-skip-gacha-meteor');
    if (skipBtn) {
      skipBtn.onclick = revealResults;
    }

    clearTimeout(this.gachaMeteorTimer);
    this.gachaMeteorTimer = setTimeout(revealResults, 1600);
  }

  renderShopModal() {
    const me = this.getLocalPlayer();
    const balanceEl = document.getElementById('shop-balance');
    if (balanceEl && me) {
      balanceEl.textContent = me.coins.toLocaleString();
    }
    const lobbyBal = document.getElementById('lobby-balance-display');
    if (lobbyBal && me) {
      lobbyBal.textContent = me.coins.toLocaleString();
    }

    const bonusBtn = document.getElementById('btn-claim-bonus');
    if (bonusBtn) {
      const remaining = Math.max(0, MAX_DAILY_RELIEF_CLAIMS - (this.dailyReliefUsed || 0));
      bonusBtn.textContent =
        remaining > 0
          ? `🎁 Hồi Xu Hàng Ngày (+${DAILY_RECOVERY_COINS.toLocaleString()} Xu • Còn ${remaining}/${MAX_DAILY_RELIEF_CLAIMS} lượt hôm nay)`
          : `✅ Đã nhận đủ ${MAX_DAILY_RELIEF_CLAIMS} lượt hồi xu hôm nay (Mai hồi tiếp +5,000 xu)`;
    }

    // Cập nhật số lượng sưu tầm trên các Tab
    const tabBurstsBtn = document.getElementById('tab-btn-bursts');
    const tabSkinsBtn = document.getElementById('tab-btn-skins');
    const tabAvatarsBtn = document.getElementById('tab-btn-avatars');
    if (tabBurstsBtn) {
      tabBurstsBtn.textContent = `⭐⭐⭐⭐⭐ Kỹ Năng Nộ 5★ (${this.unlockedBursts.size}/${GENSHIN_BURSTS.length})`;
    }
    if (tabSkinsBtn) {
      tabSkinsBtn.textContent = `⭐⭐⭐⭐ Decor Bài 4★ (${this.unlockedSkins.size}/${ANIME_CARD_SKINS.length})`;
    }
    if (tabAvatarsBtn) {
      tabAvatarsBtn.textContent = `⭐⭐⭐ Avatar 3★ (${this.unlockedAvatars.size}/${ANIME_AVATARS.length})`;
    }

    // 1. RENDER TAB SẢNH CẦU NGUYỆN GENSHIN IMPACT
    const gachaPanel = document.getElementById('shop-gacha-panel');
    if (gachaPanel) {
      const featuredId = this.selectedBannerBurstId || 'raiden';
      const featuredBurst = getBurstMeta(featuredId) || GENSHIN_BURSTS[0];
      const rateUp4Ids = BANNER_4STAR_RATEUPS[featuredBurst.id] || ['raiden', 'furina', 'skirk'];
      const nextPull5 = (this.gachaPity5 || 0) + 1;
      const nextPull4 = (this.gachaPity4 || 0) + 1;
      const curChance5 = (this.get5StarDropChance(nextPull5) * 100).toFixed(1);
      const curChance4 = (this.get4StarDropChance(nextPull4) * 100).toFixed(1);
      const pity5Pct = Math.min(100, Math.round(((this.gachaPity5 || 0) / 90) * 100));
      const pity4Pct = Math.min(100, Math.round(((this.gachaPity4 || 0) / 10) * 100));

      const upRosterHtml = GENSHIN_BURSTS.map((b) => {
        const isCurrent = b.id === featuredBurst.id;
        const owned = this.unlockedBursts.has(b.id);
        const charName = b.name.split('—')[0].trim();
        return `
          <div class="gacha-up-chip ${isCurrent ? 'active' : ''}" onclick="window.tienLenGame.selectBannerUp('${b.id}')">
            <img src="fanart/${b.id}.jpg" alt="${charName}" referrerpolicy="no-referrer" />
            <div>
              <div class="gacha-up-chip-name">${charName}</div>
              <div class="gacha-up-chip-status">${owned ? '✅ Đã sở hữu' : '🌠 Đang UP 5★'}</div>
            </div>
          </div>
        `;
      }).join('');

      const rateUp4Html = rateUp4Ids
        .map((id) => {
          const s = getCardSkinMeta(id);
          return `
            <span class="gacha-rateup-4star-pill">
              <img src="fanart/${id}.jpg" alt="${s.name}" referrerpolicy="no-referrer" />
              ${id.toUpperCase()} (4★ UP)
            </span>
          `;
        })
        .join('');

      gachaPanel.innerHTML = `
        <div class="gacha-epitomized-bar">
          <div class="gacha-epitomized-title">
            <span>🎯 CHỌN NHÂN VẬT 5★ TÂM NGUYỆN TRÊN BANNER (Đổi tự do — Giữ nguyên Bảo Hiểm Pity):</span>
            <span style="font-size:11.5px;color:#cbd5e1;">Đã Cầu Nguyện tổng cộng: <strong>${(this.totalWishes || 0).toLocaleString()}</strong> lượt</span>
          </div>
          <div class="gacha-up-Roster">${upRosterHtml}</div>
        </div>

        <div class="gacha-banner-hero">
          <div class="gacha-hero-left">
            <div>
              <div class="gacha-banner-tag">🌠 BANNER NHÂN VẬT GIỚI HẠN • TỶ LỆ RƠI TĂNG MẠNH!</div>
              <div class="gacha-banner-main-title" style="margin-top:6px;">${featuredBurst.name}</div>
              <div class="gacha-banner-sub" style="margin-top:4px;">${featuredBurst.desc}</div>
            </div>

            <div class="gacha-featured-visual">
              <img class="gacha-featured-gif" src="${featuredBurst.gifUrl}" alt="${featuredBurst.name}" />
              <div class="gacha-featured-info">
                <div class="gacha-featured-stars">⭐⭐⭐⭐⭐ HIỆU ỨNG KỸ NĂNG NỘ (5 SAO UP)</div>
                <div style="font-size:12px;color:#fde68a;font-weight:700;">${featuredBurst.title}</div>
                <div style="font-size:11px;color:#cbd5e1;font-style:italic;">${featuredBurst.quote}</div>
                <div style="margin-top:4px;">
                  <button class="tool-btn" onclick="window.tienLenGame.triggerGenshinBurst('${featuredBurst.id}', '🎬 Xem thử Kỹ Năng Nộ 5★ UP: ${featuredBurst.name}!')">
                    ▶ Xem Thử Hoạt Ảnh Nộ 5★
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div style="font-size:11.5px;font-weight:800;color:#d8b4fe;margin-bottom:4px;">
                ⭐⭐⭐⭐ DECOR BÀI 4 SAO ĐANG TĂNG TỶ LỆ RƠI (RATE-UP 50%) TRÊN BANNER NÀY:
              </div>
              <div class="gacha-featured-rateup-row">${rateUp4Html}</div>
            </div>
          </div>

          <div class="gacha-hero-right">
            <div class="gacha-pity-box">
              <!-- Pity 5 Sao -->
              <div class="gacha-pity-row">
                <div class="gacha-pity-header">
                  <span style="color:#fde047;">⭐⭐⭐⭐⭐ Bảo Hiểm 5★ (Kỹ Năng Nộ): <strong>${this.gachaPity5 || 0} / 90</strong></span>
                  <span style="color:${this.gachaGuaranteed5 ? '#34d399' : '#fbbf24'};">
                    ${this.gachaGuaranteed5 ? '🔥 ĐẠI BẢO HIỂM 100% TRÚNG UP' : '☯️ Đang 50/50 (55% Trúng UP)'}
                  </span>
                </div>
                <div class="gacha-pity-bar-bg">
                  <div class="gacha-pity-bar-fill gold" style="width:${pity5Pct}%;"></div>
                </div>
                <div class="gacha-pity-sub">
                  <span>Tỷ lệ nổ lượt kế (#${nextPull5}): <strong>${curChance5}%</strong> ${nextPull5 >= 74 ? '🔥 (Đang trong vùng Soft Pity +6%/lượt!)' : '(Soft Pity từ lượt 74)'}</span>
                  <span>Còn tối đa <strong>${90 - (this.gachaPity5 || 0)}</strong> lượt</span>
                </div>
              </div>

              <!-- Pity 4 Sao -->
              <div class="gacha-pity-row">
                <div class="gacha-pity-header">
                  <span style="color:#d8b4fe;">⭐⭐⭐⭐ Bảo Hiểm 4★ (Decor Bài Fanart): <strong>${this.gachaPity4 || 0} / 10</strong></span>
                  <span style="color:#c4b5fd;">${this.gachaGuaranteed4 ? '🔥 Bảo hiểm 100% 4★ Rate-Up' : 'Tối đa 10 lượt nổ ≥ 4★'}</span>
                </div>
                <div class="gacha-pity-bar-bg">
                  <div class="gacha-pity-bar-fill purple" style="width:${pity4Pct}%;"></div>
                </div>
                <div class="gacha-pity-sub">
                  <span>Tỷ lệ nổ lượt kế (#${nextPull4}): <strong>${curChance4}%</strong></span>
                  <span>Còn tối đa <strong>${10 - (this.gachaPity4 || 0)}</strong> lượt</span>
                </div>
              </div>
            </div>

            <div class="gacha-refund-rules-mini">
              ♻️ <strong>Cơ chế Tinh Huy / Tinh Trần Hoàn Trả Xu khi quay trùng đồ đã có:</strong><br/>
              • Trùng <strong>3★ Avatar</strong> ➔ Hoàn lại <strong>+${DUPLICATE_REFUND_COINS[3].toLocaleString()} Xu</strong><br/>
              • Trùng <strong>4★ Decor Bài</strong> ➔ Hoàn lại <strong>+${DUPLICATE_REFUND_COINS[4].toLocaleString()} Xu</strong> <em>(bằng 2 lượt Cầu Nguyện)</em><br/>
              • Trùng <strong>5★ Kỹ Năng Nộ</strong> ➔ Hoàn lại <strong>+${DUPLICATE_REFUND_COINS[5].toLocaleString()} Xu</strong> <em>(hoàn trả trọn 10 lượt!)</em>
            </div>

            <div class="gacha-wish-buttons-row">
              <button class="gacha-wish-btn wish-1x" onclick="window.tienLenGame.performWish(1)">
                <span class="gacha-wish-btn-title">🌠 Cầu Nguyện ×1</span>
                <span class="gacha-wish-btn-cost">🪙 ${WISH_COST_SINGLE.toLocaleString()} Xu</span>
              </button>
              <button class="gacha-wish-btn wish-10x" onclick="window.tienLenGame.performWish(10)">
                <span class="gacha-wish-btn-title">🌟 Cầu Nguyện ×10</span>
                <span class="gacha-wish-btn-cost">🪙 ${WISH_COST_TEN.toLocaleString()} Xu • Đảm bảo ≥ 1 món 4★+</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. RENDER TAB KHO ĐỒ 5★ KỸ NĂNG NỘ
    const burstsGrid = document.getElementById('shop-bursts-grid');
    if (burstsGrid) {
      burstsGrid.innerHTML = GENSHIN_BURSTS.map((b) => {
        const owned = this.unlockedBursts.has(b.id);
        const isChop = this.equippedChopBurst === b.id;
        const isWin = this.equippedWinBurst === b.id;

        let actionsHtml = '';
        if (!owned) {
          actionsHtml = `
            <button class="shop-buy-btn buy-btn" onclick="window.tienLenGame.openGachaForCharacter('${b.id}')">
              🌠 Chưa sở hữu ➔ Chọn Banner Cầu Nguyện 5★
            </button>
          `;
        } else {
          actionsHtml = `
            <div class="shop-burst-actions">
              <button class="shop-buy-btn ${isChop ? 'equipped-btn' : 'equip-btn'}" onclick="window.tienLenGame.buyOrEquipBurst('${b.id}', 'chop')">
                ${isChop ? '⚡ Đang dùng Chặt Heo' : '⚡ Gắn cho Chặt Heo'}
              </button>
              <button class="shop-buy-btn ${isWin ? 'equipped-btn' : 'equip-btn'}" onclick="window.tienLenGame.buyOrEquipBurst('${b.id}', 'win')">
                ${isWin ? '👑 Đang dùng Về Nhất' : '👑 Gắn cho Về Nhất'}
              </button>
            </div>
          `;
        }

        return `
          <div class="shop-item-card ${isChop || isWin ? 'equipped' : ''}">
            <div class="rarity-stars-badge rarity-5">⭐⭐⭐⭐⭐ KỸ NĂNG NỘ 5 SAO ${owned ? '• ĐÃ SỞ HỮU' : '• GACHA'}</div>
            <div class="shop-burst-preview-wrap">
              <img src="${b.gifUrl}" alt="${b.name}" loading="lazy" />
              <button class="shop-burst-preview-btn" onclick="window.tienLenGame.triggerGenshinBurst('${b.id}', '🎬 Xem thử: ${b.name}!')">
                ▶ Xem thử
              </button>
            </div>
            <div class="shop-item-title">${b.name}</div>
            <div class="shop-item-desc">${b.desc}</div>
            ${actionsHtml}
          </div>
        `;
      }).join('');
    }

    // 3. RENDER TAB KHO ĐỒ 4★ DECOR BÀI
    const skinsGrid = document.getElementById('shop-skins-grid');
    if (skinsGrid) {
      skinsGrid.innerHTML = ANIME_CARD_SKINS.map((skin) => {
        const owned = this.unlockedSkins.has(skin.id);
        const equipped = this.equippedSkin === skin.id;

        let btnClass = 'buy-btn';
        let btnLabel = '🌠 Mở từ Sảnh Cầu Nguyện (4★)';
        if (equipped) {
          btnClass = 'equipped-btn';
          btnLabel = '✨ Đang trang bị';
        } else if (owned) {
          btnClass = 'equip-btn';
          btnLabel = '🃏 Trang bị ngay';
        }

        const crestHtml = skin.crest
          ? `<span class="card-anime-crest">${skin.crest}</span>`
          : '';
        const bgArtHtml = skin.imgUrl
          ? `<div class="card-anime-art" style="background-image:url('${skin.imgUrl}')"></div>`
          : '';

        return `
          <div class="shop-item-card ${equipped ? 'equipped' : ''}">
            <div class="rarity-stars-badge rarity-4">${skin.id === 'classic' ? '🃏 MẶC ĐỊNH' : `⭐⭐⭐⭐ DECOR BÀI 4 SAO ${owned ? '• ĐÃ SỞ HỮU' : '• GACHA'}`}</div>
            <div class="shop-card-preview-wrap">
              <div class="playing-card red-card is-two skin-${skin.id}" style="width:68px;height:96px;cursor:default;">
                ${bgArtHtml}
                <div class="card-corner top-left">
                  <span class="card-rank">2</span>
                  <span class="card-suit-small">♥</span>
                </div>
                ${crestHtml}
                <div class="card-center-art" style="font-size:1.7rem;">♥</div>
                <div class="card-corner bottom-right">
                  <span class="card-rank">2</span>
                  <span class="card-suit-small">♥</span>
                </div>
              </div>
              <div class="playing-card black-card skin-${skin.id}" style="width:68px;height:96px;cursor:default;">
                ${bgArtHtml}
                <div class="card-corner top-left">
                  <span class="card-rank">A</span>
                  <span class="card-suit-small">♠</span>
                </div>
                ${crestHtml}
                <div class="card-center-art" style="font-size:1.7rem;">♠</div>
                <div class="card-corner bottom-right">
                  <span class="card-rank">A</span>
                  <span class="card-suit-small">♠</span>
                </div>
              </div>
            </div>
            <div class="shop-item-title">${skin.name}</div>
            <div class="shop-item-desc">${skin.desc}</div>
            <button class="shop-buy-btn ${btnClass}" onclick="window.tienLenGame.buyOrEquipSkin('${skin.id}')">
              ${btnLabel}
            </button>
          </div>
        `;
      }).join('');
    }

    // 4. RENDER TAB KHO ĐỒ 3★ AVATAR
    const avatarsGrid = document.getElementById('shop-avatars-grid');
    if (avatarsGrid) {
      avatarsGrid.innerHTML = ANIME_AVATARS.map((av) => {
        const owned = this.unlockedAvatars.has(av.id);
        const equipped = this.equippedAvatar === av.id;

        let btnClass = 'buy-btn';
        let btnLabel = '🌠 Mở từ Sảnh Cầu Nguyện (3★)';
        if (equipped) {
          btnClass = 'equipped-btn';
          btnLabel = '✨ Đang dùng';
        } else if (owned) {
          btnClass = 'equip-btn';
          btnLabel = '🎭 Chọn Avatar';
        }

        const previewHtml = av.imgUrl
          ? `<img class="anime-avatar-img" src="${av.imgUrl}" alt="${av.name}" loading="lazy" referrerpolicy="no-referrer" />`
          : `<span style="font-size:38px;">${av.emoji || '😎'}</span>`;

        return `
          <div class="shop-item-card ${equipped ? 'equipped' : ''}">
            <div class="rarity-stars-badge rarity-3">${av.id === 'default_player' ? '😎 MẶC ĐỊNH' : `⭐⭐⭐ AVATAR 3 SAO ${owned ? '• ĐÃ SỞ HỮU' : '• GACHA'}`}</div>
            <div class="shop-avatar-preview-wrap">
              ${previewHtml}
            </div>
            <div class="shop-item-title">${av.name}</div>
            <div class="shop-item-desc">${av.desc}</div>
            <button class="shop-buy-btn ${btnClass}" onclick="window.tienLenGame.buyOrEquipAvatar('${av.id}')">
              ${btnLabel}
            </button>
          </div>
        `;
      }).join('');
    }

    // 5. RENDER TAB LỊCH SỬ CẦU NGUYỆN & PHÂN TÍCH CƠ CHẾ GACHA GENSHIN
    const historyPanel = document.getElementById('shop-history-panel');
    if (historyPanel) {
      const historyItemsHtml =
        !this.gachaHistory || this.gachaHistory.length === 0
          ? `<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Chưa có lịch sử Cầu Nguyện. Hãy thử vận may ở tab 🌠 Sảnh Cầu Nguyện nhé!</div>`
          : this.gachaHistory
              .map((h, i) => {
                const color = h.star === 5 ? '#fde047' : h.star === 4 ? '#d8b4fe' : '#93c5fd';
                return `
                  <div class="gacha-history-item">
                    <div>
                      <strong style="color:${color};">[${h.star}★] ${h.name}</strong>
                      <div style="font-size:11px;color:#94a3b8;">${h.typeLabel} • ${h.rateNote} (Pity: ${h.pityUsed})</div>
                    </div>
                    <div style="text-align:right;font-weight:800;font-size:11.5px;color:${h.isNew ? '#34d399' : '#fbbf24'};">
                      ${h.isNew ? '✨ MỚI' : `♻️ +${h.refund.toLocaleString()} Xu`}
                    </div>
                  </div>
                `;
              })
              .join('');

      historyPanel.innerHTML = `
        <div class="gacha-rules-card">
          <h3>📖 Phân Tích Chi Tiết Cơ Chế Gacha Banner Nhân Vật Genshin Impact</h3>
          <div style="font-size:12.5px;color:#e2e8f0;line-height:1.55;display:flex;flex-direction:column;gap:6px;">
            <div>• <strong>⭐⭐⭐⭐⭐ 5 Sao — Hiệu Ứng Kỹ Năng Nộ (10 Nhân Vật):</strong> Tỷ lệ cơ bản <strong>0.6%</strong> (lượt 1–73). Từ lượt <strong>74 (Soft Pity / Bảo hiểm mềm)</strong>, mỗi lượt tăng thêm <strong>+6%</strong> xác suất. Lượt thứ <strong>90 (Hard Pity)</strong> chắc chắn <strong>100% nổ 5★</strong>!</div>
            <div>• <strong>☯️ Cơ chế 50/50, Capturing Radiance & Đại Bảo Hiểm:</strong> Khi nổ 5★, có <strong>55%</strong> trúng ngay Nhân Vật 5★ UP đang chọn trên Banner. Nếu lệch sang 5★ khác, lần nổ 5★ kế tiếp được <strong>🔥 Đại Bảo Hiểm 100% trúng Nhân Vật UP</strong>!</div>
            <div>• <strong>⭐⭐⭐⭐ 4 Sao — Decor / Skin Bài Fanart (29 Bộ Bài):</strong> Tỷ lệ cơ bản <strong>5.1%</strong> (lượt 1–8), lượt 9 vọt lên <strong>56.1%</strong> và lượt <strong>10 chắc chắn 100% nổ ≥ 4★</strong> (Kèm bảo hiểm 50/50 cho 3 bộ bài 4★ Rate-Up trên Banner).</div>
            <div>• <strong>⭐⭐⭐ 3 Sao — Avatar Fanart Nhân Vật (29 Avatar):</strong> Rơi ở các lượt còn lại (<strong>94.3%</strong> cơ bản).</div>
            <div>• <strong>♻️ Cơ chế Trùng Đồ Hoàn Trả Xu (Tinh Huy / Tinh Trần):</strong>
              <br/>— Trùng <strong>3★ Avatar</strong>: Hoàn trả <strong>+${DUPLICATE_REFUND_COINS[3].toLocaleString()} Xu</strong>
              <br/>— Trùng <strong>4★ Decor Bài</strong>: Hoàn trả <strong>+${DUPLICATE_REFUND_COINS[4].toLocaleString()} Xu</strong>
              <br/>— Trùng <strong>5★ Kỹ Năng Nộ</strong>: Hoàn trả <strong>+${DUPLICATE_REFUND_COINS[5].toLocaleString()} Xu</strong>
            </div>
          </div>
        </div>
        <div class="gacha-log-card">
          <h3>📜 Lịch Sử 40 Lượt Cầu Nguyện Gần Nhất</h3>
          <div class="gacha-history-list">${historyItemsHtml}</div>
        </div>
      `;
    }
  }

  buyOrEquipSkin(skinId) {
    const skin = ANIME_CARD_SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedSkins.has(skinId)) {
      this.openGachaForCharacter(skinId);
      return;
    }

    sfx.click();
    this.equippedSkin = skinId;
    me.cardSkin = skinId;
    this.saveShopProfile();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  buyOrEquipAvatar(avatarId) {
    const av = ANIME_AVATARS.find((a) => a.id === avatarId);
    if (!av) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedAvatars.has(avatarId)) {
      this.openGachaForCharacter(avatarId);
      return;
    }

    sfx.click();
    this.equippedAvatar = avatarId;
    me.avatar = avatarId;
    this.saveShopProfile();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  buyOrEquipBurst(burstId, slot = 'chop') {
    const burst = GENSHIN_BURSTS.find((b) => b.id === burstId);
    if (!burst) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedBursts.has(burstId)) {
      this.openGachaForCharacter(burstId);
      return;
    }

    sfx.click();
    if (slot === 'win') {
      this.equippedWinBurst = burstId;
      me.winBurst = burstId;
    } else {
      this.equippedChopBurst = burstId;
      me.chopBurst = burstId;
    }

    this.saveShopProfile();
    this.renderShopModal();
    this.syncCosmeticsInRoom();
  }

  claimFreeBonus() {
    const me = this.getLocalPlayer();
    if (!me) return;
    const today = this.getTodayKey();
    if (this.lastDailyDate !== today) {
      this.lastDailyDate = today;
      this.dailyReliefUsed = 0;
    }

    if (this.dailyReliefUsed >= MAX_DAILY_RELIEF_CLAIMS) {
      alert(
        `Hôm nay bạn đã nhận đủ ${MAX_DAILY_RELIEF_CLAIMS}/${MAX_DAILY_RELIEF_CLAIMS} gói Hồi Xu Hàng Ngày (+15,000 xu tổng cộng).\n🌅 Ngày mai hệ thống sẽ tự động hồi tiếp +5,000 xu cho bạn!`
      );
      return;
    }

    this.dailyReliefUsed++;
    me.coins += DAILY_RECOVERY_COINS;
    sfx.win();
    this.saveShopProfile();
    this.renderShopModal();
    this.renderSeats();
    this.addLog(
      `🎁 Bạn vừa nhận gói Hồi Xu Hàng Ngày <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> (Lượt ${this.dailyReliefUsed}/${MAX_DAILY_RELIEF_CLAIMS} hôm nay)!`,
      'log-win'
    );
    this.syncCosmeticsInRoom();
  }

  syncCosmeticsInRoom() {
    if (!this.isMultiplayer) return;
    const me = this.getLocalPlayer();
    if (this.isHost) {
      this.broadcastState();
    } else {
      this.sendClientEvent({
        type: 'UPDATE_COSMETICS',
        clientId: this.myClientId,
        avatar: this.equippedAvatar,
        cardSkin: this.equippedSkin,
        chopBurst: this.equippedChopBurst,
        winBurst: this.equippedWinBurst,
        coins: me ? me.coins : INITIAL_COINS,
      });
    }
  }

  bindDOM() {
    this.elMatchInfo = document.getElementById('match-info');
    this.elFirstTurnBadge = document.getElementById('first-turn-badge');
    this.elTurnBanner = document.getElementById('turn-banner');
    this.elComboAnnouncement = document.getElementById('combo-announcement');
    this.elCurrentTrick = document.getElementById('current-trick');
    this.elPreviousTrick = document.getElementById('previous-trick');
    this.elTrickOwnerLabel = document.getElementById('trick-owner-label');
    this.elHumanHand = document.getElementById('human-hand');
    this.elSelectedPreview = document.getElementById('selected-combo-preview');
    this.elGameLog = document.getElementById('game-log');

    this.btnPlay = document.getElementById('btn-play');
    this.btnPass = document.getElementById('btn-pass');
    this.btnSort = document.getElementById('btn-sort');
    this.btnUnselect = document.getElementById('btn-unselect');
    this.btnHint = document.getElementById('btn-hint');
    this.btnNewGame = document.getElementById('btn-new-game');
    this.btnShowSummary = document.getElementById('btn-show-summary');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnSound = document.getElementById('btn-sound');
    this.btnRules = document.getElementById('btn-rules');
    this.btnResetCoins = document.getElementById('btn-reset-coins');
    this.btnWifi = document.getElementById('btn-wifi');
    this.btnShop = document.getElementById('btn-shop');

    this.modalSummary = document.getElementById('summary-modal');
    this.modalRules = document.getElementById('rules-modal');
    this.modalWifi = document.getElementById('wifi-modal');
    this.modalShop = document.getElementById('shop-modal');

    const nameInput = document.getElementById('input-player-name');
    if (nameInput) {
      nameInput.value = this.savedPlayerName || 'Thắng';
      nameInput.addEventListener('change', () => {
        const val = nameInput.value.trim() || 'Thắng';
        this.savedPlayerName = val;
        const me = this.getLocalPlayer();
        if (me) me.name = val;
        this.saveShopProfile();
        this.renderSeats();
        this.renderLobbyModal();
      });
    }

    document.getElementById('btn-lobby-open-shop')?.addEventListener('click', () => {
      this.renderShopModal();
      this.modalShop.classList.remove('hidden');
      sfx.click();
    });

    document.getElementById('btn-lobby-open-rules')?.addEventListener('click', () => {
      this.modalRules.classList.remove('hidden');
      sfx.click();
    });

    document.getElementById('btn-apply-custom-bet')?.addEventListener('click', () => {
      const inp = document.getElementById('input-custom-bet');
      if (!inp) return;
      const raw = Math.max(20, Math.round(Number(inp.value) || 100));
      this.selectBetTier(raw, true);
    });

    document.getElementById('btn-summary-change-bet')?.addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      this.modalWifi.classList.remove('hidden');
      this.renderBetTiers();
      this.renderLobbyModal();
      sfx.click();
    });

    document.getElementById('btn-close-gacha-results')?.addEventListener('click', () => {
      document.getElementById('gacha-wish-overlay')?.classList.add('hidden');
      sfx.click();
    });

    if (this.btnShop && this.modalShop) {
      this.btnShop.addEventListener('click', () => {
        this.renderShopModal();
        this.modalShop.classList.remove('hidden');
        sfx.click();
      });

      document.getElementById('btn-close-shop')?.addEventListener('click', () => {
        this.modalShop.classList.add('hidden');
        sfx.click();
      });

      document.getElementById('btn-ok-shop')?.addEventListener('click', () => {
        this.modalShop.classList.add('hidden');
        sfx.click();
      });

      document.getElementById('tab-btn-gacha')?.addEventListener('click', () => this.switchShopTab('gacha'));
      document.getElementById('tab-btn-bursts')?.addEventListener('click', () => this.switchShopTab('bursts'));
      document.getElementById('tab-btn-skins')?.addEventListener('click', () => this.switchShopTab('skins'));
      document.getElementById('tab-btn-avatars')?.addEventListener('click', () => this.switchShopTab('avatars'));
      document.getElementById('tab-btn-history')?.addEventListener('click', () => this.switchShopTab('history'));

      document.getElementById('btn-claim-bonus')?.addEventListener('click', () => {
        this.claimFreeBonus();
      });
    }

    this.btnPlay.addEventListener('click', () => this.onHumanPlay());
    this.btnPass.addEventListener('click', () => this.onHumanPass());
    this.btnSort.addEventListener('click', () => this.toggleSortMode());
    this.btnUnselect.addEventListener('click', () => this.clearSelection());
    this.btnHint.addEventListener('click', () => this.onHumanHint());
    this.btnNewGame.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) {
        alert('Chỉ Chủ phòng mới có thể chia ván mới!');
        return;
      }
      this.startNewMatch(false);
    });

    this.btnWifi.addEventListener('click', async () => {
      await this.refreshServerInfo();
      if (this.roomId) {
        document.getElementById('share-link-input').value = this.getShareableRoomUrl(this.roomId);
      }
      this.modalWifi.classList.remove('hidden');
      this.renderBetTiers();
      this.renderLobbyModal();
      sfx.click();
    });

    document.getElementById('btn-close-wifi').addEventListener('click', () => {
      this.modalWifi.classList.add('hidden');
      if (!this.isMultiplayer && !this.isGameOver) {
        clearTimeout(this.botTimer);
        this.promptCurrentTurn();
      }
    });

    document.getElementById('btn-create-room').addEventListener('click', () => {
      this.createWifiRoom();
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.trim().toUpperCase();
      if (!code) {
        alert('Vui lòng nhập Mã phòng 4 chữ số!');
        return;
      }
      this.joinWifiRoom(code);
    });

    document.getElementById('btn-copy-link').addEventListener('click', async () => {
      await this.refreshServerInfo();
      const input = document.getElementById('share-link-input');
      if (this.roomId) {
        input.value = this.getShareableRoomUrl(this.roomId);
      }
      input.select();
      navigator.clipboard?.writeText(input.value);
      const btn = document.getElementById('btn-copy-link');
      btn.textContent = '✅ Đã Copy!';
      setTimeout(() => (btn.textContent = '📋 Copy Link'), 1800);
      sfx.click();
    });

    document.getElementById('btn-leave-room').addEventListener('click', () => {
      this.switchToSoloBotMode();
    });

    document.getElementById('btn-solo-bot-mode').addEventListener('click', () => {
      this.switchToSoloBotMode();
      this.modalWifi.classList.add('hidden');
    });

    document.getElementById('btn-start-wifi-match').addEventListener('click', () => {
      if (!this.isHost) return;
      const activeCount = this.players.filter((p) => p.active).length;
      if (activeCount < 2) {
        alert('Cần tối thiểu 2 người chơi trong bàn để bắt đầu!');
        return;
      }
      this.modalWifi.classList.add('hidden');
      this.startNewMatch(false);
    });

    this.btnShowSummary.addEventListener('click', () => {
      this.modalSummary.classList.remove('hidden');
      sfx.click();
    });

    document.getElementById('btn-close-summary').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
    });

    document.getElementById('btn-peek-table').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      if (this.isMultiplayer && !this.isHost) {
        this.elTurnBanner.textContent = '⏳ Đang chờ Chủ phòng bấm Chia ván tiếp theo...';
        return;
      }
      this.startNewMatch(false);
    });

    this.btnSpeed.addEventListener('click', () => {
      this.speedMode = (this.speedMode + 1) % 3;
      const labels = ['Chậm', 'Chuẩn', 'Nhanh'];
      const delays = [1350, 850, 420];
      this.botDelay = delays[this.speedMode];
      document.getElementById('speed-label').textContent = labels[this.speedMode];
      sfx.click();
    });

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
          btnFullscreen.textContent = '🗗 Thu nhỏ';
        } else {
          document.exitFullscreen?.().catch(() => {});
          btnFullscreen.textContent = '⛶ Toàn màn hình';
        }
        sfx.click();
      });
    }

    this.btnSound.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      this.btnSound.textContent = sfx.enabled ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
      if (sfx.enabled) sfx.click();
    });

    this.btnRules.addEventListener('click', () => {
      this.modalRules.classList.remove('hidden');
      sfx.click();
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
    });
    document.getElementById('btn-ok-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
    });

    this.btnResetCoins.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) return;
      this.players.forEach((p) => (p.coins = INITIAL_COINS));
      this.saveShopProfile();
      this.renderSeats();
      this.addLog(`Đã đặt lại số xu của cả bàn về ${INITIAL_COINS.toLocaleString()} xu.`, 'log-win');
      if (this.isMultiplayer && this.isHost) this.broadcastState();
      sfx.click();
    });

    window.addEventListener('keydown', (e) => {
      if (
        !this.modalSummary.classList.contains('hidden') ||
        !this.modalRules.classList.contains('hidden') ||
        !this.modalWifi.classList.contains('hidden') ||
        (this.modalShop && !this.modalShop.classList.contains('hidden'))
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!this.btnPlay.disabled) {
          e.preventDefault();
          this.onHumanPlay();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.onHumanHint();
      } else if (e.key === 'p' || e.key === 'P') {
        if (!this.btnPass.disabled) {
          e.preventDefault();
          this.onHumanPass();
        }
      } else if (e.code === 'Escape') {
        this.clearSelection();
      }
    });
  }

  // ============================================================================
  // HOME LOBBY SCREEN: MODE SELECTION (1. BOT / 2. HUMAN) & BET TIER SELECTION
  // ============================================================================
  getCurrentBetTierMeta(betVal = this.betPerCard) {
    const found = BET_TIERS.find((t) => t.betPerCard === betVal);
    if (found) return found;
    return {
      id: 'custom',
      name: 'Bàn Tự Chọn',
      icon: '🎲',
      betPerCard: betVal,
      minCoins: 0,
      desc: `Cóng: ${(betVal * 26).toLocaleString()} • Heo đỏ: ${(betVal * 5).toLocaleString()}`,
    };
  }

  selectLobbyMode(mode) {
    this.selectedLobbyMode = mode === 'human' ? 'human' : 'bot';
    const cardBot = document.getElementById('mode-card-bot');
    const cardHuman = document.getElementById('mode-card-human');
    const panelBot = document.getElementById('lobby-bot-panel');
    const panelHuman = document.getElementById('lobby-human-panel');
    const modeLabel = document.getElementById('selected-mode-label');

    cardBot?.classList.toggle('active', this.selectedLobbyMode === 'bot');
    cardHuman?.classList.toggle('active', this.selectedLobbyMode === 'human');
    panelBot?.classList.toggle('hidden', this.selectedLobbyMode !== 'bot');
    panelHuman?.classList.toggle('hidden', this.selectedLobbyMode !== 'human');

    if (modeLabel) {
      modeLabel.textContent =
        this.selectedLobbyMode === 'bot'
          ? `Chế độ 1: Đấu Với Bot (${this.soloPlayerCount || 4} Người)`
          : 'Chế độ 2: Đấu Với Người (2 – 4 Người)';
    }

    sfx.click();
    this.renderSoloPlayerCountUI();
    this.renderBetTiers();
  }

  selectSoloPlayerCount(count) {
    const validCount = [2, 3, 4].includes(Number(count)) ? Number(count) : 4;
    this.soloPlayerCount = validCount;
    this.savedSoloPlayerCount = validCount;

    if (!this.isMultiplayer && this.players && this.players.length === 4) {
      this.players[1].active = validCount >= 3;
      this.players[2].active = true;
      this.players[3].active = validCount === 4;
    }

    const modeLabel = document.getElementById('selected-mode-label');
    if (modeLabel && this.selectedLobbyMode === 'bot') {
      modeLabel.textContent = `Chế độ 1: Đấu Với Bot (${validCount} Người)`;
    }

    sfx.click();
    this.saveShopProfile();
    this.renderSoloPlayerCountUI();
    this.updateBetBadges();
  }

  renderSoloPlayerCountUI() {
    const count = this.soloPlayerCount || 4;
    [2, 3, 4].forEach((n) => {
      const card = document.getElementById(`bot-count-${n}`);
      if (card) card.classList.toggle('active', n === count);
    });

    const previewEl = document.getElementById('bot-opponents-preview');
    if (previewEl) {
      if (count === 2) {
        previewEl.innerHTML =
          '<strong>⚔️ Bàn 2 Người (Solo 1v1 Bot):</strong> Bạn đấu tay đôi trực diện với <strong>Bot Raiden Shogun ⚡</strong> (Ngồi đối diện)';
      } else if (count === 3) {
        previewEl.innerHTML =
          '<strong>🔥 Bàn 3 Người (Tam Hùng 1v2 Bot):</strong> Bạn đấu với <strong>Bot Furina 💧</strong> (Trái) & <strong>Bot Raiden Shogun ⚡</strong> (Đối diện)';
      } else {
        previewEl.innerHTML =
          '<strong>👑 Bàn 4 Người (Đủ Bàn 1v3 Bot):</strong> Bạn đấu với <strong>Bot Furina 💧</strong>, <strong>Bot Raiden Shogun ⚡</strong> & <strong>Bot Skirk 🌌</strong>';
      }
    }
  }

  selectBetTier(betVal, isCustom = false) {
    const me = this.getLocalPlayer();
    const myCoins = me ? me.coins : this.savedCoins;
    const tier = BET_TIERS.find((t) => t.betPerCard === betVal);

    if (!isCustom && tier && tier.minCoins > myCoins) {
      alert(
        `🔒 "${tier.name} (${tier.betPerCard.toLocaleString()} Xu/lá)" yêu cầu tối thiểu ${tier.minCoins.toLocaleString()} Xu trong ví!\n💡 Hiện bạn đang có ${myCoins.toLocaleString()} Xu — hãy đánh thắng ở các bàn thấp hơn trước để tích lũy vốn nhé!`
      );
      return;
    }

    this.betPerCard = Math.max(20, Math.round(Number(betVal) || 100));
    this.savedBetPerCard = this.betPerCard;
    const customInput = document.getElementById('input-custom-bet');
    if (customInput) customInput.value = this.betPerCard;

    // Nếu đang ở bàn Bot hoặc đang làm Chủ phòng WiFi, cập nhật mức cược ngay
    if (!this.isMultiplayer) {
      const botBankroll = Math.max(INITIAL_COINS, this.betPerCard * 500);
      this.players.forEach((p) => {
        if (p.isBot && p.coins < botBankroll) p.coins = botBankroll;
      });
    } else if (this.isHost) {
      this.broadcastState();
    }

    sfx.click();
    this.saveShopProfile();
    this.renderBetTiers();
    this.updateBetBadges();
  }

  updateBetBadges() {
    const b = this.betPerCard || 100;
    const count = this.soloPlayerCount || 4;
    const tierMeta = this.getCurrentBetTierMeta(b);
    const topBadge = document.getElementById('current-bet-badge');
    if (topBadge) {
      const modeTag = this.isMultiplayer
        ? `${this.getActivePlayers().length} Người`
        : `${count} Người (1v${count - 1} Bot)`;
      topBadge.textContent = `${tierMeta.icon} ${tierMeta.name} (${modeTag}) • ${b.toLocaleString()} xu/lá`;
    }
    const roomBetEl = document.getElementById('display-room-bet');
    if (roomBetEl) {
      roomBetEl.textContent = `${tierMeta.name} (${b.toLocaleString()} Xu/lá)`;
    }
    const sumHeader = document.getElementById('summary-bet-col-header');
    if (sumHeader) {
      sumHeader.textContent = `Chi tiết tính tiền (${b.toLocaleString()} xu/lá + Phạt)`;
    }
    const botBtn = document.getElementById('btn-solo-bot-mode');
    if (botBtn) {
      botBtn.textContent = `⚔️ VÀO BÀN ĐẤU VỚI BOT NGAY (Bàn ${count} Người • ${tierMeta.name}: ${b.toLocaleString()} Xu/lá)`;
    }
    const createRoomBtn = document.getElementById('btn-create-room');
    if (createRoomBtn) {
      createRoomBtn.textContent = `🏠 Tạo Phòng Đấu Với Người (${tierMeta.name}: ${b.toLocaleString()} Xu/lá)`;
    }
  }

  renderBetTiers() {
    const grid = document.getElementById('bet-tiers-grid');
    const preview = document.getElementById('bet-rules-preview');
    const me = this.getLocalPlayer();
    const myCoins = me ? me.coins : this.savedCoins;
    const lobbyBal = document.getElementById('lobby-balance-display');
    if (lobbyBal) lobbyBal.textContent = myCoins.toLocaleString();

    if (grid) {
      grid.innerHTML = BET_TIERS.map((t) => {
        const isSelected = this.betPerCard === t.betPerCard;
        const isLocked = myCoins < t.minCoins;
        const reqText =
          t.minCoins === 0
            ? '✅ Mở tự do'
            : isLocked
            ? `🔒 Cần ${t.minCoins.toLocaleString()} Xu`
            : `✅ Tối thiểu ${t.minCoins.toLocaleString()} Xu`;

        return `
          <div class="bet-tier-card ${isSelected ? 'active' : ''} ${
          isLocked ? 'locked-tier' : ''
        }" onclick="window.tienLenGame.selectBetTier(${t.betPerCard})">
            <div class="bet-tier-icon">${t.icon}</div>
            <div class="bet-tier-name">${t.name}</div>
            <div class="bet-tier-amount">${t.betPerCard.toLocaleString()} Xu / lá</div>
            <div class="bet-tier-sub">${t.desc}</div>
            <div class="bet-tier-req">${reqText}</div>
          </div>
        `;
      }).join('');
    }

    const b = this.betPerCard || 100;
    if (preview) {
      preview.innerHTML = `
        <span class="bet-rule-chip">🃏 Đếm lá: <strong>${b.toLocaleString()} xu/lá</strong></span>
        <span class="bet-rule-chip">🥶 Cóng 13 lá: <strong>${(b * 26).toLocaleString()} xu</strong></span>
        <span class="bet-rule-chip">🐷 Heo đen / đỏ: <strong>${Math.round(b * 2.5).toLocaleString()} / ${(b * 5).toLocaleString()} xu</strong></span>
        <span class="bet-rule-chip">💣 3 Đôi thông / Tứ quý / 4 Đôi thông: <strong>${Math.round(b * 7.5).toLocaleString()} / ${(b * 10).toLocaleString()} / ${Math.round(b * 12.5).toLocaleString()} xu</strong></span>
        <span class="bet-rule-chip">♠️ Đút 3♠: <strong>${Math.round(b * 7.5).toLocaleString()} xu</strong></span>
        <span class="bet-rule-chip">👑 Tới trắng: <strong>${(b * 15).toLocaleString()} xu</strong></span>
      `;
    }

    this.updateBetBadges();
  }

  // ============================================================================
  // WIFI MULTIPLAYER & PEERJS / LAN SYNC
  // ============================================================================
  isStaticCloudHost() {
    const h = window.location.hostname || '';
    return window.location.protocol === 'file:' || h.endsWith('github.io') || h.endsWith('netlify.app') || h.endsWith('vercel.app') || h.endsWith('web.app');
  }

  async refreshServerInfo() {
    if (this.isStaticCloudHost()) return;
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) this.lanServerIp = data.ip;
        if (data.port) this.lanServerPort = data.port;
        if (data.publicUrl) this.publicTunnelUrl = data.publicUrl;
      }
    } catch (_) {}
  }

  async detectLanInfoAndUrlRoom() {
    await this.refreshServerInfo();

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      this.selectLobbyMode('human');
      document.getElementById('input-room-code').value = roomParam.toUpperCase();
      document.getElementById('input-player-name').value =
        this.savedPlayerName && this.savedPlayerName !== 'Thắng'
          ? this.savedPlayerName
          : 'Người chơi ' + Math.floor(10 + Math.random() * 89);
      this.modalWifi.classList.remove('hidden');
      this.renderLobbyModal();
    }
  }

  getShareableRoomUrl(code) {
    return `https://thangdinhbkp-glitch.github.io/tien-len-mien-nam-bosskingpig/?room=${code}`;
  }

  async createWifiRoom() {
    await this.refreshServerInfo();
    const myName = document.getElementById('input-player-name').value.trim() || 'Chủ Phòng';
    const code = String(Math.floor(1000 + Math.random() * 9000));

    this.stopMultiplayerSync();
    this.isMultiplayer = true;
    this.isHost = true;
    this.roomId = code;
    this.mySeatId = 0;

    // Khởi tạo bàn WiFi: Ghế 0 là Chủ phòng, Ghế 1-2-3 để trống chờ bạn bè vào (hoặc bấm + Thêm Bot)
    this.players = [
      { id: 0, name: myName, avatar: this.equippedAvatar, cardSkin: this.equippedSkin, chopBurst: this.equippedChopBurst, winBurst: this.equippedWinBurst, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: this.myClientId },
      { id: 1, name: 'Ghế trống 2', avatar: '🐯', cardSkin: 'classic', chopBurst: 'raiden', winBurst: 'skirk', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Ghế trống 3', avatar: '🦊', cardSkin: 'classic', chopBurst: 'raiden', winBurst: 'skirk', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Ghế trống 4', avatar: '🐼', cardSkin: 'classic', chopBurst: 'raiden', winBurst: 'skirk', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
    ];

    document.getElementById('wifi-status-label').textContent = `Phòng ${code}`;
    document.getElementById('display-room-code').textContent = code;
    document.getElementById('share-link-input').value = this.getShareableRoomUrl(code);
    document.getElementById('wifi-room-box').classList.remove('hidden');

    this.updateBetBadges();
    this.initHostPeer(code);
    this.broadcastState();
    this.pollTimer = setInterval(() => this.pollRoomAsHost(), 350);
    this.renderLobbyModal();
    this.renderAll();
    sfx.win();
  }

  joinWifiRoom(code) {
    const myName = document.getElementById('input-player-name').value.trim() || 'Bạn bè';
    this.stopMultiplayerSync();
    this.isMultiplayer = true;
    this.isHost = false;
    this.roomId = code;

    document.getElementById('wifi-status-label').textContent = `Phòng ${code}`;
    document.getElementById('display-room-code').textContent = code;
    document.getElementById('share-link-input').value = this.getShareableRoomUrl(code);
    document.getElementById('wifi-room-box').classList.remove('hidden');

    // Gửi sự kiện JOIN qua cả Local WiFi API và PeerJS
    this.sendClientEvent({
      type: 'JOIN',
      clientId: this.myClientId,
      name: myName,
      avatar: this.equippedAvatar,
      cardSkin: this.equippedSkin,
      chopBurst: this.equippedChopBurst,
      winBurst: this.equippedWinBurst,
      coins: this.savedCoins,
    });

    this.initGuestPeer(code, myName);
    this.pollTimer = setInterval(() => this.pollRoomAsGuest(), 350);
    this.renderLobbyModal();
    sfx.click();
  }

  switchToSoloBotMode() {
    this.stopMultiplayerSync();
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.mySeatId = 0;

    const myName = document.getElementById('input-player-name')?.value.trim() || this.savedPlayerName || 'Thắng';
    const botBankroll = Math.max(INITIAL_COINS, (this.betPerCard || 100) * 500);
    const count = this.soloPlayerCount || 4;

    this.players = [
      { id: 0, name: myName, avatar: this.equippedAvatar, cardSkin: this.equippedSkin, chopBurst: this.equippedChopBurst, winBurst: this.equippedWinBurst, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
      { id: 1, name: 'Bot Furina', avatar: BOT_ANIME_AVATARS[1], cardSkin: 'furina', chopBurst: 'furina', winBurst: 'furina', isBot: true, active: count >= 3, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Bot Raiden Shogun', avatar: BOT_ANIME_AVATARS[2], cardSkin: 'raiden', chopBurst: 'raiden', winBurst: 'raiden', isBot: true, active: true, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Bot Skirk', avatar: BOT_ANIME_AVATARS[3], cardSkin: 'skirk', chopBurst: 'skirk', winBurst: 'skirk', isBot: true, active: count === 4, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
    ];

    document.getElementById('wifi-status-label').textContent = `Đấu Bot (${count} Người) / Đổi Cược`;
    document.getElementById('wifi-room-box').classList.add('hidden');
    this.updateBetBadges();
    this.startNewMatch(true);
  }

  stopMultiplayerSync() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.peerConnections = [];
    this.hostConn = null;
  }

  getPeerConfig() {
    return {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
      },
    };
  }

  // PeerJS P2P
  initHostPeer(code) {
    if (typeof Peer === 'undefined') {
      setTimeout(() => this.initHostPeer(code), 400);
      return;
    }
    try {
      this.peer = new Peer(`tlmn-bkp-room-${code}`, this.getPeerConfig());
      this.peer.on('connection', (conn) => {
        this.peerConnections.push(conn);
        conn.on('data', (evt) => {
          this.handleClientEventOnHost(evt);
        });
        conn.on('open', () => {
          conn.send(this.serializeRoomState());
        });
      });
    } catch (_) {}
  }

  initGuestPeer(code, myName) {
    if (typeof Peer === 'undefined') {
      setTimeout(() => this.initGuestPeer(code, myName), 400);
      return;
    }
    try {
      this.peer = new Peer(undefined, this.getPeerConfig());
      this.peer.on('open', () => {
        const connectToHost = () => {
          if (!this.isMultiplayer || this.isHost || !this.peer) return;
          const conn = this.peer.connect(`tlmn-bkp-room-${code}`, { reliable: true });
          this.hostConn = conn;
          conn.on('open', () => {
            conn.send({
              type: 'JOIN',
              clientId: this.myClientId,
              name: myName,
              avatar: this.equippedAvatar,
              cardSkin: this.equippedSkin,
              chopBurst: this.equippedChopBurst,
              winBurst: this.equippedWinBurst,
              coins: this.savedCoins,
            });
          });
          conn.on('data', (stateObj) => {
            if (stateObj && stateObj.players) {
              this.applySyncedStateOnGuest(stateObj);
            }
          });
        };
        connectToHost();
      });
    } catch (_) {}
  }

  serializeRoomState() {
    return {
      roomId: this.roomId,
      betPerCard: this.betPerCard || 100,
      matchCount: this.matchCount,
      lastWinnerId: this.lastWinnerId,
      currentTurn: this.currentTurn,
      currentCombo: this.currentCombo,
      previousCombo: this.previousCombo,
      trickOwnerId: this.trickOwnerId,
      mustPlay3Spade: this.mustPlay3Spade,
      isGameOver: this.isGameOver,
      turnBannerText: this.elTurnBanner.textContent,
      firstTurnBadgeText: this.elFirstTurnBadge.textContent,
      comboBannerText: !this.elComboAnnouncement.classList.contains('hidden')
        ? this.elComboAnnouncement.textContent
        : null,
      logsData: this.logsData.slice(0, 25),
      lastSummaryData: this.lastSummaryData,
      lastBurstEffect: this.lastBurstEffect,
      penaltyCardIds: this.penaltyCardIdsByPlayer.map((s) => Array.from(s)),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cardSkin: p.cardSkin || 'classic',
        chopBurst: p.chopBurst || 'none',
        winBurst: p.winBurst || 'none',
        isBot: p.isBot,
        active: p.active,
        hand: p.hand,
        coins: p.coins,
        passed: p.passed,
        finishRank: p.finishRank,
        clientId: p.clientId,
      })),
    };
  }

  async broadcastState() {
    if (!this.isMultiplayer || !this.isHost || !this.roomId) return;
    const stateObj = this.serializeRoomState();

    // 1. Gửi qua PeerJS P2P
    this.peerConnections.forEach((conn) => {
      try {
        if (conn.open) conn.send(stateObj);
      } catch (_) {}
    });

    // 2. Gửi qua Local WiFi Server (nếu chạy trên localhost)
    if (!this.isStaticCloudHost()) {
      try {
        await fetch(`/api/room/${this.roomId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateObj),
        });
      } catch (_) {}
    }
  }

  async sendClientEvent(evt) {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send(evt);
      } catch (_) {}
    }
    if (this.roomId && !this.isStaticCloudHost()) {
      try {
        await fetch(`/api/room/${this.roomId}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evt),
        });
      } catch (_) {}
    }
  }

  async pollRoomAsHost() {
    if (!this.isMultiplayer || !this.isHost || !this.roomId || this.isStaticCloudHost()) return;
    try {
      const res = await fetch(`/api/room/${this.roomId}/poll?host=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events) && data.events.length > 0) {
        data.events.forEach((evt) => this.handleClientEventOnHost(evt));
      }
    } catch (_) {}
  }

  async pollRoomAsGuest() {
    if (!this.isMultiplayer || this.isHost || !this.roomId || this.isStaticCloudHost()) return;
    try {
      const res = await fetch(`/api/room/${this.roomId}/poll?host=0`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== this.lastSyncedVersion && data.state && data.state.players) {
        this.lastSyncedVersion = data.version;
        this.applySyncedStateOnGuest(data.state);
      }
    } catch (_) {}
  }

  handleClientEventOnHost(evt) {
    if (!evt || !evt.type) return;

    if (evt.type === 'JOIN') {
      // Kiểm tra xem client này đã có ghế chưa
      let seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat) {
        seat = this.players.find((p) => !p.active);
      }
      if (seat) {
        seat.name = evt.name || `Người chơi ${seat.id + 1}`;
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (evt.chopBurst) seat.chopBurst = evt.chopBurst;
        if (evt.winBurst) seat.winBurst = evt.winBurst;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        seat.isBot = false;
        seat.active = true;
        seat.clientId = evt.clientId;
        sfx.win();
        this.addLog(`👋 <strong>${seat.name}</strong> đã vào bàn (Ghế #${seat.id + 1})!`, 'log-win');
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'UPDATE_COSMETICS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (seat) {
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (evt.chopBurst) seat.chopBurst = evt.chopBurst;
        if (evt.winBurst) seat.winBurst = evt.winBurst;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'PLAY_CARDS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver) return;
      const cardIdSet = new Set(evt.cardIds || []);
      const chosenCards = seat.hand.filter((c) => cardIdSet.has(c.id));
      const combo = classifyCombo(chosenCards);
      if (combo) {
        this.playCombo(seat, combo);
      }
    } else if (evt.type === 'PASS_TURN') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver || !this.currentCombo) return;
      this.passTurn(seat);
    }
  }

  applySyncedStateOnGuest(state) {
    if (typeof state.betPerCard === 'number' && state.betPerCard >= 20) {
      this.betPerCard = state.betPerCard;
      this.updateBetBadges();
    }
    this.matchCount = state.matchCount || 1;
    this.currentTurn = state.currentTurn || 0;
    this.currentCombo = state.currentCombo || null;
    this.previousCombo = state.previousCombo || null;
    this.trickOwnerId = state.trickOwnerId;
    this.mustPlay3Spade = !!state.mustPlay3Spade;
    const wasGameOver = this.isGameOver;
    this.isGameOver = !!state.isGameOver;

    if (Array.isArray(state.players)) {
      this.players = state.players;
      const me = this.players.find((p) => p.clientId === this.myClientId);
      if (me) {
        this.mySeatId = me.id;
        this.saveShopProfile();
      }
    }

    if (Array.isArray(state.penaltyCardIds)) {
      this.penaltyCardIdsByPlayer = state.penaltyCardIds.map((arr) => new Set(arr));
    }

    if (state.firstTurnBadgeText) {
      this.elFirstTurnBadge.textContent = state.firstTurnBadgeText;
    }
    this.elMatchInfo.textContent = `Ván #${this.matchCount} • Phòng ${this.roomId} • Cược ${this.betPerCard.toLocaleString()} xu/lá`;

    if (this.currentTurn === this.mySeatId && !this.isGameOver) {
      this.elTurnBanner.textContent = this.currentCombo
        ? `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt.`
        : '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ.';
    } else if (state.turnBannerText) {
      this.elTurnBanner.textContent = state.turnBannerText;
    }

    if (state.comboBannerText) {
      this.showComboBanner(state.comboBannerText);
    }

    if (Array.isArray(state.logsData)) {
      this.logsData = state.logsData;
      this.elGameLog.innerHTML = this.logsData
        .map((l) => `<div class="log-item ${l.cssClass}">${l.message}</div>`)
        .join('');
    }

    if (state.lastBurstEffect && state.lastBurstEffect.id !== this.lastShownBurstId) {
      this.lastShownBurstId = state.lastBurstEffect.id;
      const burst = state.lastBurstEffect;
      const bId = burst.burstId || burst.type || 'none';
      if (!burst.isWin) {
        this.triggerGenshinBurst(bId, burst.detail);
      } else {
        this.triggerGenshinBurst(bId, burst.detail, () => {
          if (this.isGameOver && state.lastSummaryData) {
            this.showSummaryModal(
              state.lastSummaryData.coinChanges,
              state.lastSummaryData.detailsByPlayer,
              state.lastSummaryData.bannerTitle
            );
          }
        });
      }
    }

    if (this.isGameOver && state.lastSummaryData) {
      this.btnShowSummary.classList.remove('hidden');
      if (!wasGameOver && (!state.lastBurstEffect || !state.lastBurstEffect.isWin)) {
        sfx.win();
        this.showSummaryModal(
          state.lastSummaryData.coinChanges,
          state.lastSummaryData.detailsByPlayer,
          state.lastSummaryData.bannerTitle
        );
      }
    } else if (!this.isGameOver) {
      this.modalSummary.classList.add('hidden');
      this.btnShowSummary.classList.add('hidden');
    }

    // Tự động đóng bảng chờ nếu chủ phòng đã bắt đầu chia bài
    const me = this.players[this.mySeatId];
    if (me && me.hand && me.hand.length > 0 && !this.isGameOver && !this.modalWifi.classList.contains('hidden')) {
      this.modalWifi.classList.add('hidden');
    }

    this.renderLobbyModal();
    this.renderAll();
  }

  renderLobbyModal() {
    this.renderBetTiers();
    const grid = document.getElementById('lobby-seats-grid');
    if (!grid) return;

    const activePlayers = this.players.filter((p) => p.active);
    document.getElementById('lobby-player-count').textContent = activePlayers.length;

    const startBtn = document.getElementById('btn-start-wifi-match');
    if (this.isHost && this.isMultiplayer) {
      startBtn.disabled = activePlayers.length < 2;
      startBtn.textContent =
        activePlayers.length >= 2
          ? `🃏 Bắt Đầu Chia Bài (${activePlayers.length} người • Cược ${this.betPerCard.toLocaleString()} Xu/lá)`
          : '⏳ Đang chờ ít nhất 2 người...';
    } else if (this.isMultiplayer && !this.isHost) {
      startBtn.disabled = true;
      startBtn.textContent = `⏳ Chờ Chủ phòng bắt đầu (Cược ${this.betPerCard.toLocaleString()} Xu/lá)...`;
    } else {
      startBtn.disabled = true;
      startBtn.textContent = 'Hãy bấm "Tạo Phòng Mới" trước';
    }

    grid.innerHTML = this.players
      .map((p, idx) => {
        const isMe = p.id === this.mySeatId && this.isMultiplayer;
        let actionHtml = '';
        if (this.isHost && this.isMultiplayer && idx > 0) {
          if (!p.active) {
            actionHtml = `<button class="tool-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, true)">🤖 + Thêm Bot</button>`;
          } else {
            actionHtml = `<button class="clear-log-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, false)">✕ Bỏ ghế</button>`;
          }
        }

        const roleLabel = !p.active
          ? 'Ghế trống (Đang chờ bạn bè vào...)'
          : idx === 0
          ? '👑 Chủ phòng'
          : p.isBot
          ? '🤖 Máy (Bot AI)'
          : '👤 Người chơi qua WiFi';

        return `
          <div class="lobby-seat-card ${p.active ? 'occupied' : ''}">
            <div class="lobby-seat-info">
              <span class="lobby-seat-avatar" style="display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;">${getAvatarHtml(p.avatar)}</span>
              <div>
                <div class="lobby-seat-name">${p.active ? p.name : `Ghế #${idx + 1} (Trống)`} ${
          isMe ? '(Bạn)' : ''
        }</div>
                <div class="lobby-seat-role">${roleLabel}</div>
              </div>
            </div>
            <div>${actionHtml}</div>
          </div>
        `;
      })
      .join('');
  }

  toggleBotInLobby(seatIdx, addBot) {
    if (!this.isHost || seatIdx <= 0 || seatIdx > 3) return;
    const botNames = ['', 'Bot Furina', 'Bot Raiden Shogun', 'Bot Skirk'];
    const botSkins = ['', 'furina', 'raiden', 'skirk'];
    const botBursts = ['', 'furina', 'raiden', 'skirk'];
    const p = this.players[seatIdx];
    if (addBot) {
      p.active = true;
      p.isBot = true;
      p.name = botNames[seatIdx];
      p.avatar = BOT_ANIME_AVATARS[seatIdx];
      p.cardSkin = botSkins[seatIdx];
      p.chopBurst = botBursts[seatIdx];
      p.winBurst = botBursts[seatIdx];
      p.coins = Math.max(INITIAL_COINS, (this.betPerCard || 100) * 500);
      p.clientId = null;
    } else {
      p.active = false;
      p.isBot = false;
      p.name = `Ghế trống ${seatIdx + 1}`;
      p.clientId = null;
      p.hand = [];
    }
    sfx.click();
    this.renderLobbyModal();
    this.renderAll();
    this.broadcastState();
  }

  // ============================================================================
  // LOGS & BANNERS
  // ============================================================================
  addLog(message, cssClass = '') {
    this.logsData.unshift({ message, cssClass });
    const item = document.createElement('div');
    item.className = `log-item ${cssClass}`;
    item.innerHTML = message;
    this.elGameLog.prepend(item);
  }

  showComboBanner(text) {
    this.elComboAnnouncement.textContent = text;
    this.elComboAnnouncement.classList.remove('hidden');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.elComboAnnouncement.classList.add('hidden');
    }, 2400);
  }

  // ============================================================================
  // CORE MATCH FLOW (SUPPORTS 2 TO 4 ACTIVE PLAYERS)
  // ============================================================================
  getActivePlayers() {
    return this.players.filter((p) => p.active);
  }

  startNewMatch(resetHistory = false) {
    clearTimeout(this.botTimer);
    this.modalSummary.classList.add('hidden');
    this.btnShowSummary.classList.add('hidden');
    this.updateBetBadges();

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      this.elTurnBanner.textContent = '⏳ Cần tối thiểu 2 người chơi trong phòng WiFi để chia bài!';
      this.renderAll();
      return;
    }

    if (resetHistory) {
      this.matchCount = 1;
      this.lastWinnerId = null;
    } else {
      this.matchCount++;
    }

    const deck = shuffleDeck(createDeck());
    let dealOffset = 0;
    this.players.forEach((p) => {
      if (p.active) {
        const rawHand = deck.slice(dealOffset * 13, (dealOffset + 1) * 13);
        dealOffset++;
        p.hand = sortHandByMode(rawHand, p.id === this.mySeatId ? this.sortMode : 'asc');
      } else {
        p.hand = [];
      }
      p.passed = false;
      p.finishRank = null;
    });

    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.lastSummaryData = null;
    this.logsData = [];
    this.hintIndex = 0;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;
    this.isGameOver = false;

    const b = this.betPerCard || 100;
    const tierMeta = this.getCurrentBetTierMeta(b);
    this.elGameLog.innerHTML = '';
    this.elMatchInfo.textContent = this.isMultiplayer
      ? `Ván #${this.matchCount} • Phòng ${this.roomId} (${activePlayers.length} người) • Cược ${b.toLocaleString()} xu/lá`
      : `Ván #${this.matchCount} • Bàn ${activePlayers.length} Người • ${tierMeta.name} (${b.toLocaleString()} xu/lá)`;

    const isFirstMatch = this.lastWinnerId === null || !this.players[this.lastWinnerId]?.active;
    if (isFirstMatch) {
      let lowestPlayer = activePlayers[0];
      let lowestCardVal = 999;
      activePlayers.forEach((p) => {
        p.hand.forEach((c) => {
          if (c.value < lowestCardVal) {
            lowestCardVal = c.value;
            lowestPlayer = p;
          }
        });
      });

      this.currentTurn = lowestPlayer.id;
      this.mustPlay3Spade = false;
      const has3Spade = lowestCardVal === 0;
      this.elFirstTurnBadge.textContent = has3Spade
        ? `♠️ Ván đầu: ${lowestPlayer.name} có 3♠ đi trước`
        : `♠️ Ván đầu: ${lowestPlayer.name} có bài nhỏ nhất đi trước`;
      this.addLog(
        `<strong>Ván #${this.matchCount} (${tierMeta.name}: ${b.toLocaleString()} xu/lá)</strong> bắt đầu! <strong>${lowestPlayer.name}</strong> đi trước.`,
        'log-win'
      );
    } else {
      this.currentTurn = this.lastWinnerId;
      this.mustPlay3Spade = false;
      this.elFirstTurnBadge.textContent = `👑 Chủ bàn: ${this.players[this.currentTurn].name} đi trước`;
      this.addLog(
        `<strong>Ván #${this.matchCount} (${b.toLocaleString()} xu/lá)</strong> bắt đầu! <strong>${this.players[this.currentTurn].name}</strong> (Về Nhất ván trước) đi trước.`,
        'log-win'
      );
    }

    this.renderAll();

    // Kiểm tra Tới Trắng
    for (let offset = 0; offset < 4; offset++) {
      const pid = (this.currentTurn + offset) % 4;
      const p = this.players[pid];
      if (!p.active) continue;
      const reason = checkToiTrang(p.hand, isFirstMatch);
      if (reason) {
        this.handleToiTrang(pid, reason);
        return;
      }
    }

    this.promptCurrentTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
  }

  handleToiTrang(winnerId, reason) {
    this.isGameOver = true;
    this.btnShowSummary.classList.remove('hidden');
    const winner = this.players[winnerId];
    const b = this.betPerCard || 100;
    const baseToiTrang = Math.round(b * 15);
    sfx.win();
    this.showComboBanner(`🎉 TỚI TRẮNG: ${reason.toUpperCase()}!`);
    this.addLog(
      `⚡ <strong>${winner.name}</strong> <strong>TỚI TRẮNG</strong> với <strong>${reason}</strong>! Cả bàn lật bài tính tiền phạt!`,
      'log-win'
    );

    const coinChanges = [0, 0, 0, 0];
    const detailsByPlayer = [[], [], [], []];
    let totalWon = 0;

    this.players.forEach((p) => {
      if (!p.active) return;
      if (p.id === winnerId) {
        p.finishRank = 1;
      } else {
        p.finishRank = 2;
        const analysis = analyzeLoserHand(p.hand, false, b);
        const leafBase = p.hand.length === 13 ? b * 26 : p.hand.length * b;
        const specialOnly = analysis.totalPenalty - leafBase;
        const loss = baseToiTrang + Math.max(0, specialOnly);
        coinChanges[p.id] = -loss;
        p.coins -= loss;
        totalWon += loss;
        this.penaltyCardIdsByPlayer[p.id] = analysis.penaltyCardIds;
        detailsByPlayer[p.id] = [
          { label: `Bị Tới Trắng (-${baseToiTrang.toLocaleString()})`, isSpecial: true },
          ...analysis.breakdown.slice(1),
        ];
      }
    });

    coinChanges[winnerId] = totalWon;
    winner.coins += totalWon;
    detailsByPlayer[winnerId] = [
      { label: `Tới trắng: ${reason} (+${totalWon.toLocaleString()})`, isGood: true },
    ];

    this.lastWinnerId = winnerId;
    const bannerTitle = `🎉 ${winner.name} TỚI TRẮNG (${reason}) - ĂN TRỌN +${totalWon.toLocaleString()} XU!`;
    this.lastSummaryData = { coinChanges, detailsByPlayer, bannerTitle };
    const burstDetail = `👑 ${winner.name} Tới Trắng (${reason}) • +${totalWon.toLocaleString()} Xu!`;
    const winBurstId = winner.winBurst || 'none';
    this.lastBurstEffect = { id: Date.now(), type: winBurstId, burstId: winBurstId, isWin: true, detail: burstDetail };
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    this.triggerGenshinBurst(winBurstId, burstDetail, () => {
      this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
    });
  }

  canPlayerCutWithFourPairs(player) {
    if (!player.active || !this.currentCombo || player.hand.length < 8) return false;
    const moves = getValidMoves(player.hand, this.currentCombo, false, true);
    return moves.length > 0;
  }

  promptCurrentTurn() {
    if (this.isGameOver) return;

    const currentPlayer = this.players[this.currentTurn];
    this.renderAll();

    if (this.isMultiplayer && !this.isHost) {
      return;
    }

    if (currentPlayer.isBot) {
      this.elTurnBanner.textContent = `⏳ Đang đợi ${currentPlayer.name} suy nghĩ...`;
      if (!this.isMultiplayer && this.modalWifi && !this.modalWifi.classList.contains('hidden')) {
        return;
      }
      this.botTimer = setTimeout(() => this.executeBotTurn(currentPlayer), this.botDelay);
    } else if (currentPlayer.id === this.mySeatId) {
      if (!this.currentCombo) {
        this.elTurnBanner.textContent = '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ.';
      } else if (currentPlayer.passed && this.canPlayerCutWithFourPairs(currentPlayer)) {
        this.elTurnBanner.textContent = '🔥 Bạn có 4 ĐÔI THÔNG! Có thể chặt không cần vòng hoặc Bỏ qua.';
      } else {
        this.elTurnBanner.textContent = `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt.`;
      }
      this.updateHumanActionButtons();
    } else {
      this.elTurnBanner.textContent = `⏳ Đang tới lượt của ${currentPlayer.name}...`;
    }
  }

  playCombo(player, combo) {
    const beatCheck = canBeatCombo(combo, this.currentCombo);
    if (!beatCheck.ok) return false;

    const playedIds = new Set(combo.cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !playedIds.has(c.id));

    if (
      beatCheck.isChop &&
      this.currentCombo &&
      this.trickOwnerId !== null &&
      this.trickOwnerId !== player.id
    ) {
      sfx.chop();
      const victim = this.players[this.trickOwnerId];
      const b = this.betPerCard || 100;
      let chopValue = Math.round(b * 5);
      if (this.currentCombo.type === COMBO_TYPES.SINGLE && this.currentCombo.highRank === 12) {
        chopValue = Math.round(b * (this.currentCombo.highCard.isRed ? 5 : 2.5));
      } else if (this.currentCombo.type === COMBO_TYPES.PAIR && this.currentCombo.highRank === 12) {
        chopValue = Math.round(b * 10);
      } else if (this.currentCombo.type === COMBO_TYPES.FOUR_OF_A_KIND) {
        chopValue = Math.round(b * 10);
      } else if (this.currentCombo.type === COMBO_TYPES.FOUR_PAIRS) {
        chopValue = Math.round(b * 12.5);
      } else {
        chopValue = Math.round(b * 7.5);
      }

      if (this.lastChoppedPlayerId !== null && this.chopPot > 0) {
        const prevVictim = this.players[this.lastChoppedPlayerId];
        prevVictim.coins += this.chopPot;
        victim.coins -= this.chopPot;
        this.matchChopCoins[prevVictim.id] += this.chopPot;
        this.matchChopCoins[victim.id] -= this.chopPot;
        this.matchChopDetails[victim.id].push({
          label: `💸 Đền chặt chồng (-${this.chopPot.toLocaleString()})`,
          isSpecial: true,
        });
      }

      this.chopPot += chopValue;
      this.lastChoppedPlayerId = victim.id;

      victim.coins -= chopValue;
      player.coins += chopValue;
      this.matchChopCoins[victim.id] -= chopValue;
      this.matchChopCoins[player.id] += chopValue;
      this.matchChopDetails[victim.id].push({
        label: `💸 Bị ${player.name} chặt ${this.currentCombo.label} (-${chopValue.toLocaleString()})`,
        isSpecial: true,
      });
      this.matchChopDetails[player.id].push({
        label: `💥 Chặt ${this.currentCombo.label} của ${victim.name} (+${chopValue.toLocaleString()})`,
        isGood: true,
      });

      const chopBurstDetail = `⚡ ${player.name} tung ${combo.label} chặt ${this.currentCombo.label} của ${victim.name} (+${chopValue.toLocaleString()} xu)!`;
      const chopBurstId = player.chopBurst || 'none';
      this.lastBurstEffect = { id: Date.now(), type: chopBurstId, burstId: chopBurstId, isWin: false, detail: chopBurstDetail };
      this.triggerGenshinBurst(chopBurstId, chopBurstDetail);
      this.showComboBanner(`💥 CHẶT HEO/HÀNG! +${chopValue.toLocaleString()} XU`);
      this.addLog(
        `💥 <strong>${player.name}</strong> tung <strong>${combo.label}</strong> chặt <strong>${this.currentCombo.label}</strong> của <strong>${victim.name}</strong> (+${chopValue.toLocaleString()} xu)!`,
        'log-chop'
      );
      this.saveShopProfile();
    } else {
      const isUltra =
        combo.type === COMBO_TYPES.FOUR_OF_A_KIND ||
        combo.type === COMBO_TYPES.THREE_PAIRS ||
        combo.type === COMBO_TYPES.FOUR_PAIRS;
      const isHeavy =
        isUltra ||
        combo.highRank === 12 ||
        combo.length >= 4 ||
        combo.type === COMBO_TYPES.TRIPLE;

      sfx.playCard(isUltra ? 'ultra' : isHeavy ? 'heavy' : 'normal');
      if (isUltra || (combo.highRank === 12 && combo.length >= 1)) {
        this.showComboBanner(`🔥 ${combo.label.toUpperCase()}!`);
      }
      this.addLog(
        `<strong>${player.name}</strong> đánh <strong>${combo.label}</strong> (${combo.cards
          .map((c) => `${c.rank}${c.suit}`)
          .join(' ')})`,
        'log-play'
      );
    }

    combo.ownerSkin = player.cardSkin || 'classic';
    combo.wasChop = !!beatCheck.isChop;
    this.previousCombo = this.currentCombo;
    this.currentCombo = combo;
    this.trickOwnerId = player.id;
    this.mustPlay3Spade = false;
    this.hintIndex = 0;
    player.passed = false;

    // Kiểm tra người chơi vừa hết bài -> NHẤT ĂN TẤT (WIN LUÔN)
    if (player.hand.length === 0) {
      player.finishRank = 1;
      this.players.forEach((p) => {
        if (p.active && p.id !== player.id) p.finishRank = 2;
      });
      const wonBy3Spade = combo.cards.some((c) => c.value === 0);
      sfx.win();
      if (wonBy3Spade) {
        this.showComboBanner(`👑 ${player.name.toUpperCase()} ĐÚT 3 BÍCH VỀ NHẤT!`);
        this.addLog(
          `👑 <strong>${player.name}</strong> đánh <strong>3♠</strong> ở nước cuối cùng — <strong>ĐÚT 3 BÍCH VỀ NHẤT</strong>! Cả bàn bị phạt nặng!`,
          'log-win'
        );
      } else {
        this.showComboBanner(`🏆 ${player.name.toUpperCase()} VỀ NHẤT - WIN LUÔN!`);
        this.addLog(
          `🏁 <strong>${player.name}</strong> đã hết bài và <strong>Về Nhất (Thắng cuộc)</strong>! Toàn bộ người thua lật bài đếm lá!`,
          'log-win'
        );
      }

      this.endMatch(player.id, wonBy3Spade);
      return true;
    }

    this.advanceTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    return true;
  }

  passTurn(player) {
    sfx.pass();
    player.passed = true;
    this.addLog(`<em>${player.name} bỏ lượt.</em>`, 'log-pass');
    this.advanceTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
  }

  advanceTurn() {
    if (this.isGameOver) return;

    const othersCanAct = this.players.filter((p) => {
      if (!p.active || p.id === this.trickOwnerId) return false;
      if (p.finishRank !== null) return false;
      if (!p.passed) return true;
      return this.canPlayerCutWithFourPairs(p);
    });

    if (othersCanAct.length === 0) {
      this.startNewRoundAfterAllPass();
      return;
    }

    for (let step = 1; step <= 4; step++) {
      const nextId = (this.currentTurn + step) % 4;
      const nextPlayer = this.players[nextId];
      if (!nextPlayer.active || nextPlayer.finishRank !== null) continue;
      if (!nextPlayer.passed || this.canPlayerCutWithFourPairs(nextPlayer)) {
        this.currentTurn = nextId;
        this.promptCurrentTurn();
        return;
      }
    }

    this.startNewRoundAfterAllPass();
  }

  startNewRoundAfterAllPass() {
    this.players.forEach((p) => (p.passed = false));
    this.currentCombo = null;
    this.previousCombo = null;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;

    let leaderId = this.trickOwnerId;
    const owner = this.players[leaderId];

    if (!owner || !owner.active || owner.finishRank !== null) {
      for (let step = 1; step <= 4; step++) {
        const candidateId = (leaderId + step) % 4;
        if (this.players[candidateId].active && this.players[candidateId].finishRank === null) {
          leaderId = candidateId;
          break;
        }
      }
    } else {
      this.addLog(`🔄 Vòng mới! <strong>${owner.name}</strong> làm cái đánh tiếp.`, 'log-play');
    }

    this.trickOwnerId = null;
    this.currentTurn = leaderId;
    this.promptCurrentTurn();
  }

  // ============================================================================
  // BOT AI DECISION ENGINE
  // ============================================================================
  executeBotTurn(bot) {
    if (this.isGameOver) return;

    const onlyFourPairs = bot.passed && this.canPlayerCutWithFourPairs(bot);
    const validMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);

    if (validMoves.length === 0) {
      this.passTurn(bot);
      return;
    }

    if (!this.currentCombo) {
      const chosen = this.chooseBotLeadMove(bot, validMoves);
      this.playCombo(bot, chosen);
      return;
    }

    const chosen = this.chooseBotResponseMove(bot, validMoves);
    if (chosen) {
      this.playCombo(bot, chosen);
    } else {
      this.passTurn(bot);
    }
  }

  chooseBotLeadMove(bot, validMoves) {
    const instantWin = validMoves.find((m) => m.length === bot.hand.length);
    if (instantWin) return instantWin;

    const minOpponentCards = Math.min(
      ...this.players
        .filter((p) => p.active && p.id !== bot.id && p.finishRank === null)
        .map((p) => p.hand.length)
    );

    const nonBombMoves = validMoves.filter((m) => !m.isBomb);
    const pool = nonBombMoves.length > 0 ? nonBombMoves : validMoves;

    const scored = pool.map((move) => {
      let score = 0;
      const contains3Spade = move.cards.some((c) => c.value === 0);

      if (move.type === COMBO_TYPES.STRAIGHT) score += 45 + move.length * 7;
      else if (move.type === COMBO_TYPES.TRIPLE) score += 38;
      else if (move.type === COMBO_TYPES.PAIR) score += 28;
      else if (move.type === COMBO_TYPES.SINGLE) score += 15;

      if (contains3Spade && minOpponentCards <= 6) {
        score += 45;
      }

      if (minOpponentCards === 1 && move.type === COMBO_TYPES.SINGLE) {
        score += move.highValue * 0.6;
      } else {
        score -= move.highValue * 0.8;
      }

      if (move.highRank === 12 && bot.hand.length > 3) {
        score -= 60;
      }

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  chooseBotResponseMove(bot, validMoves) {
    const instantWin = validMoves.find((m) => m.length === bot.hand.length);
    if (instantWin) return instantWin;

    const chopMoves = validMoves.filter((m) => canBeatCombo(m, this.currentCombo).isChop);
    if (chopMoves.length > 0) {
      chopMoves.sort((a, b) => a.highValue - b.highValue);
      return chopMoves[0];
    }

    const owner = this.players[this.trickOwnerId];
    const ownerLowCards = owner && owner.hand.length <= 3;

    const quadRanks = new Set();
    const rankCounts = new Array(13).fill(0);
    bot.hand.forEach((c) => rankCounts[c.rankIndex]++);
    rankCounts.forEach((cnt, r) => {
      if (cnt === 4) quadRanks.add(r);
    });

    let safeMoves = validMoves.filter(
      (m) => m.isBomb || !m.cards.some((c) => quadRanks.has(c.rankIndex))
    );
    if (safeMoves.length === 0) safeMoves = validMoves;

    safeMoves.sort((a, b) => a.highValue - b.highValue);
    const smallest = safeMoves[0];

    if (
      smallest.highRank === 12 &&
      this.currentCombo.highRank <= 8 &&
      bot.hand.length > 6 &&
      !ownerLowCards
    ) {
      return null;
    }

    return smallest;
  }

  // ============================================================================
  // HUMAN INTERACTION (LOCAL PLAYER AT mySeatId)
  // ============================================================================
  getLocalPlayer() {
    return this.players[this.mySeatId] || this.players[0];
  }

  toggleCardSelection(cardId) {
    if (this.isGameOver) return;
    const human = this.getLocalPlayer();
    const clickedCard = human.hand.find((c) => c.id === cardId);
    if (!clickedCard) return;

    // 1. NẾU MÌNH LÀ NGƯỜI ĐI TRƯỚC (MỞ VÒNG MỚI): đánh lẻ khi chọn 1 lá
    if (!this.currentCombo) {
      this.companionCardIds.clear();
      if (this.selectedCardIds.has(cardId)) {
        this.selectedCardIds.delete(cardId);
      } else {
        this.selectedCardIds.add(cardId);
      }
      sfx.click();
      this.renderHumanHand();
      this.updateHumanActionButtons();
      return;
    }

    // 2. NẾU ĐỐI THỦ ĐI TRƯỚC: tự động gợi ý & nhấc bộ bài đi kèm lá vừa chọn
    if (this.selectedCardIds.has(cardId)) {
      this.selectedCardIds.delete(cardId);
      if (this.selectedCardIds.size === 0) {
        this.companionCardIds.clear();
      }
      sfx.click();
      this.renderHumanHand();
      this.updateHumanActionButtons();
      return;
    }

    const currentSelected = this.getSelectedCards();
    if (currentSelected.length > 0) {
      const manualCandidate = classifyCombo([...currentSelected, clickedCard]);
      const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
      if (
        manualCandidate &&
        (!onlyFourPairs || manualCandidate.type === COMBO_TYPES.FOUR_PAIRS) &&
        canBeatCombo(manualCandidate, this.currentCombo).ok
      ) {
        this.selectedCardIds.add(cardId);
        sfx.click();
        this.renderHumanHand();
        this.updateHumanActionButtons();
        return;
      }
    }

    const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
    const validMoves = getValidMoves(
      human.hand,
      this.currentCombo,
      this.mustPlay3Spade,
      onlyFourPairs,
      clickedCard
    );
    const movesWithClicked = validMoves.filter((m) =>
      m.cards.some((c) => c.id === clickedCard.id)
    );

    if (movesWithClicked.length > 0) {
      movesWithClicked.sort((a, b) => {
        const aSameType = a.type === this.currentCombo.type ? 0 : 1;
        const bSameType = b.type === this.currentCombo.type ? 0 : 1;
        if (aSameType !== bSameType) return aSameType - bSameType;
        return a.length - b.length || a.highValue - b.highValue;
      });

      const bestMove = movesWithClicked[0];
      this.selectedCardIds = new Set(bestMove.cards.map((c) => c.id));

      this.companionCardIds.clear();
      movesWithClicked.forEach((m) => {
        m.cards.forEach((c) => {
          if (c.id !== clickedCard.id) {
            this.companionCardIds.add(c.id);
          }
        });
      });
    } else {
      this.selectedCardIds = new Set([cardId]);
      this.companionCardIds.clear();
    }

    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  clearSelection() {
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  toggleSortMode() {
    this.sortMode = this.sortMode === 'asc' ? 'combo' : 'asc';
    document.getElementById('sort-mode-label').textContent =
      this.sortMode === 'asc' ? 'Tăng dần' : 'Theo Bộ';
    const human = this.getLocalPlayer();
    human.hand = sortHandByMode(human.hand, this.sortMode);
    sfx.click();
    this.renderHumanHand();
  }

  onHumanHint() {
    const human = this.getLocalPlayer();
    const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
    const validMoves = getValidMoves(human.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);

    if (validMoves.length === 0) {
      this.elSelectedPreview.textContent = 'Không có bộ bài nào chặn được!';
      this.elSelectedPreview.classList.add('invalid');
      sfx.pass();
      return;
    }

    validMoves.sort((a, b) => a.length - b.length || a.highValue - b.highValue);
    const pick = validMoves[this.hintIndex % validMoves.length];
    this.hintIndex++;

    this.selectedCardIds = new Set(pick.cards.map((c) => c.id));
    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  getSelectedCards() {
    const human = this.getLocalPlayer();
    return human.hand.filter((c) => this.selectedCardIds.has(c.id));
  }

  updateHumanActionButtons() {
    const human = this.getLocalPlayer();
    const isMyTurn = !this.isGameOver && this.currentTurn === this.mySeatId;
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);

    if (selectedCards.length === 0) {
      this.elSelectedPreview.textContent = 'Chọn bài để đánh';
      this.elSelectedPreview.classList.remove('invalid');
    } else if (!combo) {
      this.elSelectedPreview.textContent = `⚠️ ${selectedCards.length} lá đang chọn chưa tạo thành bộ hợp lệ`;
      this.elSelectedPreview.classList.add('invalid');
    } else {
      this.elSelectedPreview.textContent = `✅ Đang chọn: ${combo.label}`;
      this.elSelectedPreview.classList.remove('invalid');
    }

    if (!isMyTurn) {
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.btnPass.disabled = this.currentCombo === null;

    if (!combo) {
      this.btnPlay.disabled = true;
      return;
    }

    if (human.passed && combo.type !== COMBO_TYPES.FOUR_PAIRS) {
      this.btnPlay.disabled = true;
      return;
    }

    const canBeat = canBeatCombo(combo, this.currentCombo);
    this.btnPlay.disabled = !canBeat.ok;
    if (!canBeat.ok && this.currentCombo) {
      this.elSelectedPreview.textContent = `⚠️ ${combo.label} chưa đủ mạnh để đè ${this.currentCombo.label}`;
      this.elSelectedPreview.classList.add('invalid');
    }
  }

  onHumanPlay() {
    if (this.isGameOver || this.currentTurn !== this.mySeatId) return;
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);
    if (!combo) return;

    const cardIds = combo.cards.map((c) => c.id);
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      this.sendClientEvent({
        type: 'PLAY_CARDS',
        clientId: this.myClientId,
        cardIds,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.playCombo(this.getLocalPlayer(), combo);
  }

  onHumanPass() {
    if (this.isGameOver || this.currentTurn !== this.mySeatId || !this.currentCombo) return;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      this.sendClientEvent({
        type: 'PASS_TURN',
        clientId: this.myClientId,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.passTurn(this.getLocalPlayer());
  }

  // ============================================================================
  // END OF MATCH & SCORING (NHẤT ĂN TẤT - ĐẾM LÁ + THỐI HEO/HÀNG/3♠ + ĐÚT 3♠)
  // ============================================================================
  endMatch(winnerId, wonBy3Spade = false) {
    this.isGameOver = true;
    this.btnShowSummary.classList.remove('hidden');
    clearTimeout(this.botTimer);

    const winner = this.players[winnerId];
    const b = this.betPerCard || 100;
    const coinChanges = [0, 0, 0, 0];
    const detailsByPlayer = [[], [], [], []];
    let totalWinnerGain = 0;

    this.players.forEach((p) => {
      if (!p.active || p.id === winnerId) return;

      const analysis = analyzeLoserHand(p.hand, wonBy3Spade, b);
      const loss = analysis.totalPenalty;
      this.penaltyCardIdsByPlayer[p.id] = analysis.penaltyCardIds;
      detailsByPlayer[p.id] = [...this.matchChopDetails[p.id], ...analysis.breakdown];

      p.coins -= loss;
      coinChanges[p.id] = this.matchChopCoins[p.id] - loss;
      totalWinnerGain += loss;

      const detailText = analysis.breakdown.map((item) => item.label).join(', ');
      this.addLog(
        `🃏 <strong>${p.name}</strong> lật bài (${p.hand
          .map((c) => `${c.rank}${c.suit}`)
          .join(' ')}): ${detailText} ➔ <strong>-${loss.toLocaleString()} xu</strong>`,
        'log-chop'
      );
    });

    winner.coins += totalWinnerGain;
    coinChanges[winnerId] = this.matchChopCoins[winnerId] + totalWinnerGain;
    detailsByPlayer[winnerId] = [
      ...this.matchChopDetails[winnerId],
      {
        label: wonBy3Spade
          ? `👑 Đút 3♠ Về Nhất (+${totalWinnerGain.toLocaleString()} xu)`
          : `🏆 Về Nhất ăn tất (+${totalWinnerGain.toLocaleString()} xu)`,
        isGood: true,
      },
    ];

    this.lastWinnerId = winnerId;
    this.elTurnBanner.textContent = `🏁 ${winner.name} Về Nhất (+${totalWinnerGain.toLocaleString()} xu)! Đã lật bài toàn bàn.`;

    const bannerTitle = wonBy3Spade
      ? `👑 ${winner.name.toUpperCase()} ĐÚT 3 BÍCH VỀ NHẤT — ĂN TRỌN +${totalWinnerGain.toLocaleString()} XU!`
      : `🏆 ${winner.name.toUpperCase()} VỀ NHẤT — ĂN TRỌN +${totalWinnerGain.toLocaleString()} XU!`;

    const winBurstDetail = wonBy3Spade
      ? `👑 ${winner.name} Đút 3♠ Về Nhất • +${totalWinnerGain.toLocaleString()} Xu!`
      : `🏆 ${winner.name} Về Nhất Ăn Tất • +${totalWinnerGain.toLocaleString()} Xu!`;
    const winBurstId = winner.winBurst || 'none';
    this.lastBurstEffect = { id: Date.now(), type: winBurstId, burstId: winBurstId, isWin: true, detail: winBurstDetail };
    this.lastSummaryData = { coinChanges, detailsByPlayer, bannerTitle };
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }

    this.triggerGenshinBurst(winBurstId, winBurstDetail, () => {
      this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
    });
  }

  showSummaryModal(coinChanges, detailsByPlayer, bannerText) {
    const tbody = document.getElementById('summary-tbody');
    const banner = document.getElementById('toi-trang-banner');
    this.updateBetBadges();

    if (bannerText) {
      banner.textContent = bannerText;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    const sortedPlayers = this.players
      .filter((p) => p.active)
      .sort((a, b) => {
        if (a.finishRank !== b.finishRank) return (a.finishRank || 2) - (b.finishRank || 2);
        return coinChanges[a.id] - coinChanges[b.id];
      });

    tbody.innerHTML = sortedPlayers
      .map((p) => {
        const isWinner = p.finishRank === 1;
        const delta = coinChanges[p.id];
        const deltaStr = delta >= 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`;
        const deltaClass = delta >= 0 ? 'coin-plus' : 'coin-minus';
        const penSet = this.penaltyCardIdsByPlayer[p.id] || new Set();

        const cardsHtml =
          p.hand.length === 0
            ? `<span class="penalty-chip good">✨ Đã hết sạch bài (0 lá)</span>`
            : `<div class="summary-cards-wrap">${p.hand
                .map((c) => {
                  const isPen = penSet.has(c.id);
                  return `<span class="summary-mini-card ${c.isRed ? 'red-card' : 'black-card'} ${
                    isPen ? 'penalty-card' : ''
                  }" title="${isPen ? 'Quân bài bị phạt thối!' : ''}">${c.rank}${c.suit}</span>`;
                })
                .join('')}</div>`;

        const breakdownItems = detailsByPlayer[p.id] || [];
        const detailsHtml = `<div class="penalty-list">${breakdownItems
          .map(
            (item) =>
              `<span class="penalty-chip ${item.isGood ? 'good' : item.isSpecial ? 'bad' : ''}">${item.label}</span>`
          )
          .join('')}</div>`;

        return `
          <tr>
            <td><strong>${isWinner ? '🥇 THẮNG (WIN)' : '💸 Thua'}</strong></td>
            <td><strong>${p.name} ${p.id === this.mySeatId ? '(Bạn)' : ''}</strong></td>
            <td>${cardsHtml}</td>
            <td>${detailsHtml}</td>
            <td class="${deltaClass}">${deltaStr} xu</td>
            <td>🪙 ${p.coins.toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    this.modalSummary.classList.remove('hidden');
  }

  // ============================================================================
  // RENDERING UI (WITH PERSPECTIVE ROTATION & ANIME SKINS/AVATARS)
  // ============================================================================
  createCardElement(card, interactive = false, isPenalty = false, skinId = 'classic') {
    const div = document.createElement('div');
    const isSelected = interactive && this.selectedCardIds.has(card.id);
    const isCompanion = interactive && this.companionCardIds.has(card.id);
    const activeSkin = getCardSkinMeta(skinId);

    div.className = `playing-card ${card.isRed ? 'red-card' : 'black-card'} ${
      card.rankIndex === 12 ? 'is-two' : ''
    } ${isSelected ? 'selected' : ''} ${isCompanion ? 'companion-card' : ''} skin-${activeSkin.id}`;

    if (isPenalty) {
      div.style.border = '2.5px solid #ef4444';
      div.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)';
    }

    const crestHtml = activeSkin.crest
      ? `<span class="card-anime-crest">${activeSkin.crest}</span>`
      : '';
    const bgArtHtml = activeSkin.imgUrl
      ? `<div class="card-anime-art" style="background-image:url('${activeSkin.imgUrl}')"></div>`
      : '';

    div.innerHTML = `
      ${bgArtHtml}
      <div class="card-corner top-left">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${card.suit}</span>
      </div>
      ${crestHtml}
      <div class="card-center-art">${card.suit}</div>
      <div class="card-corner bottom-right">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${card.suit}</span>
      </div>
    `;

    if (interactive) {
      div.addEventListener('click', () => this.toggleCardSelection(card.id));
    }
    return div;
  }

  renderSeats() {
    const rankLabels = { 1: 'WIN 🥇', 2: 'Thua' };

    // Xoay bàn theo góc nhìn của người chơi hiện tại (mySeatId luôn ở vị trí visualSlot = 0 ở dưới cùng)
    for (let visualSlot = 0; visualSlot < 4; visualSlot++) {
      const playerId = (this.mySeatId + visualSlot) % 4;
      const p = this.players[playerId];

      const seatEl = document.getElementById(`seat-${visualSlot}`);
      const nameEl = document.getElementById(`name-${visualSlot}`);
      const avatarEl = document.getElementById(`avatar-${visualSlot}`);
      const coinsEl = document.getElementById(`coins-${visualSlot}`);
      const countEl = document.getElementById(`count-${visualSlot}`);
      const statusEl = document.getElementById(`status-${visualSlot}`);
      const rankEl = document.getElementById(`rank-${visualSlot}`);
      const revealEl = document.getElementById(`reveal-${visualSlot}`);

      if (!p.active && visualSlot !== 0) {
        seatEl.classList.add('hidden');
        continue;
      }
      seatEl.classList.remove('hidden');

      seatEl.classList.toggle('active-turn', !this.isGameOver && this.currentTurn === p.id);
      seatEl.classList.toggle('passed-turn', p.passed);

      if (nameEl) nameEl.textContent = visualSlot === 0 ? `${p.name} (Bạn)` : p.name;
      if (avatarEl) {
        avatarEl.innerHTML = getAvatarHtml(p.avatar || AVATARS[p.id]);
      }
      coinsEl.textContent = p.coins.toLocaleString();
      countEl.textContent = p.hand.length;

      if (p.passed && p.finishRank === null) {
        statusEl.textContent = 'Bỏ lượt';
        statusEl.classList.remove('hidden');
      } else {
        statusEl.classList.add('hidden');
      }

      if (p.finishRank !== null) {
        rankEl.textContent = rankLabels[p.finishRank] || 'Thua';
        rankEl.className = `rank-badge ${p.finishRank === 1 ? 'rank-1' : 'rank-4'}`;
      } else {
        rankEl.className = 'rank-badge hidden';
      }

      // Khi ván bài kết thúc (isGameOver), lật ngửa toàn bộ bài còn lại của các đối thủ ngay trên bàn!
      if (revealEl) {
        if (this.isGameOver && p.hand.length > 0) {
          const penSet = this.penaltyCardIdsByPlayer[p.id] || new Set();
          revealEl.innerHTML = p.hand
            .map((c) => {
              const isPen = penSet.has(c.id);
              return `<div class="mini-open-card ${c.isRed ? 'red-card' : 'black-card'} ${
                isPen ? 'penalty-card' : ''
              }" title="${isPen ? 'Thối bài!' : ''}">
                <span>${c.rank}</span>
                <span>${c.suit}</span>
              </div>`;
            })
            .join('');
          revealEl.classList.remove('hidden');
        } else {
          revealEl.innerHTML = '';
          revealEl.classList.add('hidden');
        }
      }
    }
  }

  renderCenterTrick() {
    this.elPreviousTrick.innerHTML = '';
    if (this.previousCombo) {
      const prevSkin = this.previousCombo.ownerSkin || 'classic';
      this.previousCombo.cards.forEach((c) => {
        this.elPreviousTrick.appendChild(this.createCardElement(c, false, false, prevSkin));
      });
    }

    this.elCurrentTrick.innerHTML = '';
    this.elCurrentTrick.classList.remove('impact-normal', 'impact-heavy', 'impact-ultra');

    if (this.currentCombo) {
      const owner = this.players[this.trickOwnerId];
      const curSkin = this.currentCombo.ownerSkin || (owner && owner.cardSkin) || 'classic';
      const sig = `${this.trickOwnerId}:${this.currentCombo.cards.map((c) => c.id).join('-')}`;
      const isNewPlay = sig !== this.lastRenderedTrickSig;
      this.lastRenderedTrickSig = sig;

      const isUltra =
        this.currentCombo.wasChop ||
        this.currentCombo.type === COMBO_TYPES.FOUR_OF_A_KIND ||
        this.currentCombo.type === COMBO_TYPES.THREE_PAIRS ||
        this.currentCombo.type === COMBO_TYPES.FOUR_PAIRS;
      const isHeavy =
        isUltra ||
        this.currentCombo.highRank === 12 ||
        this.currentCombo.length >= 4 ||
        this.currentCombo.type === COMBO_TYPES.TRIPLE;
      const impactTier = isUltra ? 'ultra' : isHeavy ? 'heavy' : 'normal';
      this.elCurrentTrick.classList.add(`impact-${impactTier}`);

      // Tính hướng bay từ vị trí ghế của người vừa đánh (0: Dưới, 1: Trái, 2: Trên, 3: Phải)
      const visualSlot = ((this.trickOwnerId || 0) - this.mySeatId + 4) % 4;
      const fromVectors = [
        { x: '0px', y: '145px' },
        { x: '-220px', y: '0px' },
        { x: '0px', y: '-135px' },
        { x: '220px', y: '0px' },
      ];
      const vec = fromVectors[visualSlot] || fromVectors[0];

      if (isNewPlay) {
        const fxWrap = document.createElement('div');
        fxWrap.className = `trick-impact-fx impact-${impactTier}`;
        fxWrap.innerHTML = `
          <div class="trick-flash-core"></div>
          <div class="trick-shockwave-ring"></div>
          ${isHeavy ? '<div class="trick-slash-line"></div>' : ''}
        `;
        this.elCurrentTrick.appendChild(fxWrap);

        const tableEl = document.querySelector('.casino-table');
        if (tableEl && !this.currentCombo.wasChop) {
          tableEl.classList.remove('recoil-normal', 'recoil-heavy');
          void tableEl.offsetWidth;
          tableEl.classList.add(isHeavy ? 'recoil-heavy' : 'recoil-normal');
        }
      }

      const len = this.currentCombo.cards.length;
      this.currentCombo.cards.forEach((c, idx) => {
        const cardEl = this.createCardElement(c, false, false, curSkin);
        const tilt = ((idx - (len - 1) / 2) * (len > 5 ? 1.8 : 3.2)).toFixed(1);
        cardEl.style.setProperty('--card-tilt', `${tilt}deg`);
        if (isNewPlay) {
          cardEl.classList.add('card-slam-anim');
          cardEl.style.setProperty('--from-x', vec.x);
          cardEl.style.setProperty('--from-y', vec.y);
          cardEl.style.setProperty('--slam-delay', `${idx * 26}ms`);
        } else {
          cardEl.style.transform = `rotate(${tilt}deg)`;
        }
        this.elCurrentTrick.appendChild(cardEl);
      });

      this.elTrickOwnerLabel.textContent = `${owner ? owner.name : ''} đánh: ${this.currentCombo.label}`;
    } else {
      this.lastRenderedTrickSig = '';
      this.elCurrentTrick.innerHTML = `<div class="empty-table-watermark">NHẤT ĂN TẤT • ĐẾM LÁ</div>`;
      this.elTrickOwnerLabel.textContent = '';
    }
  }

  renderHumanHand() {
    const human = this.getLocalPlayer();
    const penSet = this.penaltyCardIdsByPlayer[human.id] || new Set();
    const mySkin = human.cardSkin || this.equippedSkin || 'classic';
    this.elHumanHand.innerHTML = '';
    human.hand.forEach((card) => {
      const isPen = this.isGameOver && penSet.has(card.id);
      this.elHumanHand.appendChild(
        this.createCardElement(card, !this.isGameOver, isPen, mySkin)
      );
    });
  }

  renderAll() {
    this.renderSeats();
    this.renderCenterTrick();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tienLenGame = new TienLenGame();
});
