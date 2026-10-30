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
const AD_REWARD_COINS = 1600;  // Xem Quảng Cáo Rick Roll nhận đúng 1 Roll (= 1,600 Xu)
const DAILY_QUEST_REWARD_ROLLS = 2.5; // Mỗi nhiệm vụ hàng ngày nhận 2.5 Roll
const DAILY_QUEST_REWARD_COINS = 4000; // 2.5 Roll × 1,600 Xu = 4,000 Xu / nhiệm vụ (4 NV = 10 Roll = 16,000 Xu)

// 4 Nhiệm Vụ Ủy Thác Hàng Ngày (Hiệp Hội Nhà Mạo Hiểm Genshin Impact)
const DAILY_QUESTS_CONFIG = [
  {
    id: 'play_matches',
    icon: '🃏',
    title: 'Ủy Thác 1: Khởi Động Sòng Bài',
    desc: 'Hoàn thành 3 ván bài Tiến Lên bất kỳ (Đấu với Bot hoặc Đấu với Người)',
    target: 3,
    unit: 'ván',
  },
  {
    id: 'win_matches',
    icon: '🏆',
    title: 'Ủy Thác 2: Bá Chủ Bàn Cược',
    desc: 'Giành chiến thắng (Về Nhất hoặc Tới Trắng) 2 ván bài trong ngày',
    target: 2,
    unit: 'ván thắng',
  },
  {
    id: 'play_combos',
    icon: '🔥',
    title: 'Ủy Thác 3: Xả Bộ Liên Hoàn',
    desc: 'Đánh ra 8 bộ bài ghép (Đôi, Sám Cô, Sảnh hoặc Đôi Thông / Tứ Quý)',
    target: 8,
    unit: 'bộ bài',
  },
  {
    id: 'play_power',
    icon: '⚡',
    title: 'Ủy Thác 4: Uy Lực Heo & Hàng',
    desc: 'Đánh ra 3 quân Heo (2) hoặc thực hiện pha Chặt Heo / Hàng thành công',
    target: 3,
    unit: 'lần',
  },
];

const DUPLICATE_REFUND_COINS = {
  3: 160,  // Trùng Avatar 3★ -> Hoàn +160 Xu (= 1/10 lượt Cầu Nguyện)
  4: 1600, // Trùng Decor Bài 4★ -> Hoàn +1,600 Xu (= 1 lượt Cầu Nguyện)
  5: 3200, // Trùng Kỹ Năng Nộ 5★ -> Hoàn +3,200 Xu (= 2 lượt Cầu Nguyện)
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
  navia: ['navia', 'furina', 'clorinde'],
  shenhe: ['shenhe', 'ganyu', 'yelan'],
  ganyu: ['ganyu', 'shenhe', 'zibai'],
  kokomi: ['kokomi', 'yaemiko', 'yoimiya'],
  yoimiya: ['yoimiya', 'ayaka', 'raiden'],
  xilonen: ['xilonen', 'mavuika', 'citlali'],
  citlali: ['citlali', 'mavuika', 'mualani'],
  mualani: ['mualani', 'xilonen', 'varesa'],
  varesa: ['varesa', 'mavuika', 'mualani'],
  escoffier: ['escoffier', 'furina', 'navia'],
  zibai: ['zibai', 'ganyu', 'shenhe'],
  lauma: ['lauma', 'nefer', 'columbina'],
  linnea: ['linnea', 'lauma', 'nefer'],
  nefer: ['nefer', 'lauma', 'linnea'],
  odette: ['odette', 'vesna', 'vodyanitsa'],
  vesna: ['vesna', 'odette', 'vodyanitsa'],
  sandrone: ['sandrone', 'columbina', 'skirk'],
  columbina: ['columbina', 'sandrone', 'skirk'],
  vodyanitsa: ['vodyanitsa', 'vesna', 'odette'],
  lohen: ['lohen', 'eula', 'venti'],
  durin: ['durin', 'wanderer', 'venti'],
  xiao: ['xiao', 'ganyu', 'shenhe'],
  wanderer: ['wanderer', 'durin', 'raiden'],
  kinich: ['kinich', 'mualani', 'mavuika'],
  venti: ['venti', 'xiao', 'wanderer'],
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
  { id: 'vesna', name: 'Vesna (Kiếm Khách Gió Xuân)', desc: '[Huyền Thoại] Fanart nữ kiếm sĩ Hệ Phong thanh thoát xứ Snezhnaya.', avatarPrice: 50000, skinPrice: 75000, crest: '🍃' },
  { id: 'yelan', name: 'Yelan (Lan Sinh U Cốc)', desc: '[Huyền Thoại] Fanart thần bài tình báo bí ẩn của Liyue.', avatarPrice: 55000, skinPrice: 80000, crest: '🎲' },
  { id: 'sandrone', name: 'Sandrone (Marionette Fatui #7)', desc: '[Huyền Thoại] Fanart Quan Chấp Hành thứ 7 của Fatui & cỗ máy cổ.', avatarPrice: 58000, skinPrice: 85000, crest: '⚙️' },
  { id: 'yaemiko', name: 'Yae Miko (Guuji Đền Narukami)', desc: '[Huyền Thoại] Fanart Guuji Yae Miko quyến rũ dưới tán anh đào.', avatarPrice: 60000, skinPrice: 90000, crest: '🌸' },
  { id: 'columbina', name: 'Columbina (Thiếu Nữ Fatui #3)', desc: '[Huyền Thoại] Fanart Quan Chấp Hành thứ 3 của Fatui đầy bí ẩn.', avatarPrice: 65000, skinPrice: 95000, crest: '🕊️' },
  { id: 'furina', name: 'Furina (Thủy Thần Fontaine)', desc: '[Thần Thoại] Fanart ngôi sao sân khấu Epiclese rực rỡ hào quang.', avatarPrice: 70000, skinPrice: 105000, crest: '💧' },
  { id: 'mavuika', name: 'Mavuika (Hỏa Thần Natlan)', desc: '[Thần Thoại] Fanart Hỏa Thần rực cháy dẫn lối chiến thắng bất bại.', avatarPrice: 75000, skinPrice: 115000, crest: '🔥' },
  { id: 'vodyanitsa', name: 'Vodyanitsa (Mỹ Nhân Ngư Biển Sâu)', desc: '[Thần Thoại] Fanart danh ca Hệ Thủy của Đoàn Kịch Korolevskiy.', avatarPrice: 78000, skinPrice: 120000, crest: '🌊' },
  { id: 'raiden', name: 'Raiden Shogun (Lôi Thần Vĩnh Hằng)', desc: '[Thần Thoại] Fanart Chúa tể sấm sét Inazuma — Vô Tưởng Nhất Đao.', avatarPrice: 80000, skinPrice: 125000, crest: '⚡' },
  { id: 'skirk', name: 'Skirk (Kiếm Khách Vực Sâu)', desc: '[Thần Thoại] Fanart nữ kiếm khách bí ẩn ngự trị Tinh Không Vực Sâu.', avatarPrice: 85000, skinPrice: 130000, crest: '🌌' },
  { id: 'lohen', name: 'Lohen (Phó Đội Trưởng Kỵ Sĩ Tây Phong)', desc: '[Sử Thi] Kỵ sĩ thương băng Tây Phong với tuyệt kỹ Khiên Phản Đòn trả ngược bộ bài trên bàn.', avatarPrice: 70000, skinPrice: 110000, crest: '❄️' },
  { id: 'durin', name: 'Durin (Hắc Long Tái Sinh)', desc: '[Huyền Thoại] Hắc Long mang Trái Tim Rồng Đỏ hóa thân lá bài thường thành Heo Cơ 2♥.', avatarPrice: 85000, skinPrice: 130000, crest: '🐉' },
  { id: 'xiao', name: 'Xiao (Hộ Pháp Dạ Xoa)', desc: '[Huyền Thoại] Kim Bằng Dạ Xoa nhảy lên không trung dùng 1 Lá Lẻ đâm thủng mọi bộ Đôi/Sám/Sảnh.', avatarPrice: 85000, skinPrice: 130000, crest: '👹' },
  { id: 'wanderer', name: 'Wanderer (Kẻ Lang Thang)', desc: '[Huyền Thoại] Chân Không Tự Tại triệu hồi cuồng phong xáo trộn toàn bộ bài của tất cả người chơi trên bàn.', avatarPrice: 85000, skinPrice: 130000, crest: '🌀' },
  { id: 'kinich', name: 'Kinich (Thợ Săn Saurian & Rồng Ajaw)', desc: '[Huyền Thoại] Thợ săn Natlan gài Bom Hẹn Giờ Pixel Ajaw phát nổ nhét bài rác cho kẻ dám đè bài.', avatarPrice: 85000, skinPrice: 130000, crest: '🦖' },
  { id: 'venti', name: 'Venti (Phong Thần Barbatos)', desc: '[Thần Thoại] Phong Thần tạo Hố Đen hút lá bài lớn nhất của mọi đối thủ và thổi trả lá rác cho họ.', avatarPrice: 95000, skinPrice: 145000, crest: '🌪️' },
  { id: 'qiqi', name: 'Qiqi (Cương Thi Độ Ách)', desc: '[5★ Thường • Lệch Rate] Tiểu cương thi Nhà Thuốc Bubu với Bùa Độ Ách giảm 15% tiền phạt đếm lá khi thua.', avatarPrice: 60000, skinPrice: 95000, crest: '❄️' },
  { id: 'keqing', name: 'Keqing (Yuheng Thất Tinh Liyue)', desc: '[5★ Thường • Lệch Rate] Ngọc Hành Tinh tốc độ sấm sét thu thêm +2× cược từ mỗi nhà thua khi Về Nhất.', avatarPrice: 65000, skinPrice: 100000, crest: '⚡' },
  { id: 'mona', name: 'Mona (Thuật Sĩ Chiêm Tinh)', desc: '[5★ Thường • Lệch Rate] Đại chiêm tinh gia gieo Quỹ Đạo Tinh Mệnh cộng thưởng khi thắng và giảm phạt khi thua.', avatarPrice: 65000, skinPrice: 100000, crest: '💧' },
  { id: 'diluc', name: 'Diluc (Mặt Tối Của Bình Minh)', desc: '[5★ Thường • Lệch Rate] Lão gia Tửu Trang Dawn với Phượng Hoàng Lửa tăng +20% tiền thưởng Chặt & ăn Thối.', avatarPrice: 65000, skinPrice: 100000, crest: '🔥' },
  { id: 'jean', name: 'Jean (Quyền Đội Trưởng Tây Phong)', desc: '[5★ Thường • Lệch Rate] Kỵ Sĩ Bồ Công Anh bảo hộ giảm 25% tiền phạt khi bị Chặt hoặc bị phạt Thối/Cóng.', avatarPrice: 65000, skinPrice: 100000, crest: '🍃' },
  { id: 'tighnari', name: 'Tighnari (Đội Trưởng Kiểm Lâm Avidya)', desc: '[5★ Thường • Lệch Rate] Kiểm lâm rừng mưa tích ngay +0.5× cược mỗi khi đánh Sảnh (≥ 4 lá) hoặc Sám Cô.', avatarPrice: 60000, skinPrice: 95000, crest: '🌿' },
  { id: 'dehya', name: 'Dehya (Sư Tử Lửa Bờm Đỏ)', desc: '[5★ Thường • Lệch Rate] Nữ lính đánh thuê sa mạc giảm 25% tiền phạt các lá vượt ngưỡng 7 lá khi thua nặng.', avatarPrice: 60000, skinPrice: 95000, crest: '🔥' },
  { id: 'mizuki', name: 'Yumemizuki Mizuki (Bác Sĩ Tâm Lý Baku)', desc: '[5★ Thường • Lệch Rate] Đại cổ đông Phòng Tắm Hơi Aisa hồi cố định +1.5× cược sau mỗi ván bài.', avatarPrice: 65000, skinPrice: 100000, crest: '🍃' },
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
    imgUrl: `fanart/${c.id}.jpg?v=57`,
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
    imgUrl: `fanart/${c.id}.jpg?v=57`,
  })),
];

// Danh mục 10 Hiệu Ứng Kỹ Năng Nộ (Elemental Burst Video + Voice Animations)
const GENSHIN_BURSTS = [
  {
    id: 'hutao',
    name: 'Hu Tao — An Thần Bí Pháp',
    desc: '[Sử Thi] Đường chủ Vãng Sinh Đường vung hồn ma Boo Tao quét sạch bàn bài (Video + Giọng lồng tiếng thật).',
    price: 80000,
    mp4Url: 'hutao_burst.mp4',
    audioUrl: 'hutao_burst.ogg',
    posterUrl: 'fanart/hutao.jpg',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🦋 KỸ NĂNG NỘ • HU TAO (SPIRIT SOOTHER)',
    title: 'VÃNG SINH ĐƯỜNG: AN THẦN BÍ PHÁP',
    quote: '“Khách Quý Lên Đường Bình An Nhé ~!”',
  },
  {
    id: 'eula',
    name: 'Eula — Thanh Kiếm Sóng Nước',
    desc: '[Sử Thi] Kỵ Sĩ Sóng Nước triệu hồi Kiếm Ánh Sáng phát nổ sát thương cực đại (Video + Giọng lồng tiếng thật).',
    price: 85000,
    mp4Url: 'eula_burst.mp4',
    audioUrl: 'eula_burst.ogg',
    posterUrl: 'fanart/eula.jpg',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • EULA (GLACIAL ILLUMINATION)',
    title: 'TÂY PHONG KIẾM THUẬT: KIẾM SÓNG NƯỚC',
    quote: '“Mối Thù Này — Ta Sẽ Khắc Ghi Gấp Bội!”',
  },
  {
    id: 'ayaka',
    name: 'Kamisato Ayaka — Soumetsu',
    desc: '[Sử Thi] Bạch Hạc Sương Hoa triệu hồi lốc xoáy băng hoa cắt nát mọi quân bài (Video + Giọng lồng tiếng thật).',
    price: 95000,
    mp4Url: 'ayaka_burst.mp4',
    audioUrl: 'ayaka_burst.ogg',
    posterUrl: 'fanart/ayaka.jpg',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • KAMISATO AYAKA (SOUMETSU)',
    title: 'KAMISATO LƯU: BÃO TUYẾT SƯƠNG HOA',
    quote: '“Tuyết Hoa Rơi Xuống — Đóng Băng Vĩnh Viễn!”',
  },
  {
    id: 'clorinde',
    name: 'Clorinde — Ánh Chớp Tàn Đêm',
    desc: '[Sử Thi] Đấu sĩ đại diện Fontaine tung liên hoàn kiếm và súng chớp nhoáng (Video + Giọng lồng tiếng thật).',
    price: 105000,
    mp4Url: 'clorinde_burst.mp4',
    audioUrl: 'clorinde_burst.ogg',
    posterUrl: 'fanart/clorinde.jpg',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ KỸ NĂNG NỘ • CLORINDE (LAST LIGHTFALL)',
    title: 'PHÁN QUYẾT: ÁNH CHỚP TÀN ĐÊM',
    quote: '“Danh Dự Đấu Sĩ — Kết Liễu Trong Chớp Mắt!”',
  },
  {
    id: 'yelan',
    name: 'Yelan — Xúc Xắc Toan Tính',
    desc: '[Huyền Thoại] Thần bài Liyue tung xúc xắc Linh Lung định đoạt ván cược (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'yelan_burst.mp4',
    audioUrl: 'yelan_burst.ogg',
    posterUrl: 'fanart/yelan.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🎲 KỸ NĂNG NỘ • YELAN (DEPTH-CLARION DICE)',
    title: 'THẦN BÀI LIYUE: XÚC XẮC TOAN TÍNH',
    quote: '“Ván Cược Này — Phần Thắng Thuộc Về Ta!”',
  },
  {
    id: 'yaemiko',
    name: 'Yae Miko — Thiên Hồ Lôi Phạt',
    desc: '[Huyền Thoại] Guuji Đền Narukami giáng sấm sét Thiên Hồ hủy diệt từ chín tầng mây (Video + Giọng lồng tiếng thật).',
    price: 135000,
    mp4Url: 'yae_burst.mp4',
    audioUrl: 'yae_burst.ogg',
    posterUrl: 'fanart/yaemiko.jpg',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '🌸 KỸ NĂNG NỘ • YAE MIKO (TENKO KENSHIN)',
    title: 'ĐẠI BÍ PHÁP: THIÊN HỒ LÔI PHẠT',
    quote: '“Sấm Sét Narukami — Hóa Thành Tro Bụi Đi!”',
  },
  {
    id: 'furina',
    name: 'Furina — Vạn Dân Reo Hò',
    desc: '[Thần Thoại] Thủy Thần Fontaine mở màn đại nhạc kịch sân khấu Epiclese (Video + Giọng lồng tiếng thật).',
    price: 150000,
    mp4Url: 'furina_burst.mp4',
    audioUrl: 'furina_burst.ogg',
    posterUrl: 'fanart/furina.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '💧 KỸ NĂNG NỘ • FURINA (LET THE PEOPLE REJOICE)',
    title: 'ĐẠI NHẠC KỊCH: VẠN DÂN REO HÒ',
    quote: '“Hãy Để Thế Gian Cùng Ca Vang Chiến Thắng!”',
  },
  {
    id: 'mavuika',
    name: 'Mavuika — Bầu Trời Rực Cháy',
    desc: '[Thần Thoại] Hỏa Thần Natlan bùng nổ đại dương rực lửa thiêu rụi mọi đối thủ (Video + Giọng lồng tiếng thật).',
    price: 165000,
    mp4Url: 'mavuika_burst.mp4',
    audioUrl: 'mavuika_burst.ogg',
    posterUrl: 'fanart/mavuika.jpg',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🔥 KỸ NĂNG NỘ • MAVUIKA (HOUR OF BURNING SKIES)',
    title: 'THỜI KHẮC BẦU TRỜI RỰC CHÁY',
    quote: '“Ngọn Lửa Vĩnh Cửu Natlan — Thiêu Rụi Tất Cả!”',
  },
  {
    id: 'raiden',
    name: 'Raiden Shogun — Mộng Tưởng Chân Thuyết',
    desc: '[Thần Thoại] Vô Tưởng Nhất Đao chém rách không gian bằng sấm sét tím Vĩnh Hằng (Video + Giọng lồng tiếng thật).',
    price: 180000,
    mp4Url: 'raiden_burst.mp4',
    audioUrl: 'raiden_burst.ogg',
    posterUrl: 'fanart/raiden.jpg',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ KỸ NĂNG NỘ • RAIDEN SHOGUN (MUSOU NO HITOTACHI)',
    title: 'BÍ THUẬT: MỘNG TƯỞNG CHÂN THUYẾT',
    quote: '“Vô Tưởng Nhất Đao — Chặt Đứt Vĩnh Hằng!”',
  },
  {
    id: 'skirk',
    name: 'Skirk — Phá Toái Tinh Không',
    desc: '[Thần Thoại] Tuyệt kỹ Vực Sâu triệu hồi hố đen Tinh Không nuốt chửng bàn bài (Video + Giọng lồng tiếng thật).',
    price: 190000,
    mp4Url: 'skirk_burst.mp4',
    audioUrl: 'skirk_burst.ogg',
    posterUrl: 'fanart/skirk.jpg',
    theme: 'theme-abyss',
    sfxType: 'skirk',
    tag: '🌌 KỸ NĂNG NỘ • SKIRK (ABYSSAL STARSHATTER)',
    title: 'TUYỆT KỸ VỰC SÂU: PHÁ TOÁI TINH KHÔNG',
    quote: '“Vạn Vật Quy Hư Vô — Nhất Ăn Tất!”',
  },
  {
    id: 'navia',
    name: 'Navia — Pháo Lễ Hoa Hồng Vàng',
    desc: '[Sử Thi] Hội trưởng Spina di Rosula khai hỏa đại pháo pha lê khóa chặt bài đối phương (Video + Giọng lồng tiếng thật).',
    price: 110000,
    mp4Url: 'navia_burst.mp4',
    audioUrl: 'navia_burst.ogg?v=48',
    posterUrl: 'fanart/navia.jpg',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '☂️ KỸ NĂNG NỘ • NAVIA (SUNLIT SKY\'S SALUTE)',
    title: 'PHÁO LỄ KIM CƯƠNG: HOA HỒNG VÀNG',
    quote: '“Pháo Đội Spina di Rosula — Khai Hỏa!”',
  },
  {
    id: 'shenhe',
    name: 'Shenhe — Lục Đạo Chân Quân',
    desc: '[Sử Thi] Đệ tử tiên nhân triệu hồi phân thân Băng Linh phong tỏa toàn bộ bàn bài (Video + Giọng lồng tiếng thật).',
    price: 115000,
    mp4Url: 'shenhe_burst.mp4',
    audioUrl: 'shenhe_burst.ogg?v=48',
    posterUrl: 'fanart/shenhe.jpg',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • SHENHE (DIVINE MAIDEN\'S DELIVERANCE)',
    title: 'THẦN NỮ ĐỘ THẾ: LỤC ĐẠO CHÂN QUÂN',
    quote: '“Bùa Chú Tiên Nhân — Hóa Hình Phong Tỏa!”',
  },
  {
    id: 'ganyu',
    name: 'Ganyu — Thiên Hoa Hạ Phàm',
    desc: '[Sử Thi] Tuần lộc ánh trăng giáng mưa băng châu nối liền mọi sảnh bài (Video + Giọng lồng tiếng thật).',
    price: 115000,
    mp4Url: 'ganyu_burst.mp4',
    audioUrl: 'ganyu_burst.ogg?v=48',
    posterUrl: 'fanart/ganyu.jpg',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🏹 KỸ NĂNG NỘ • GANYU (CELESTIAL SHOWER)',
    title: 'THIÊN HOA HẠ PHÀM: MƯA TÊN BĂNG GIÁ',
    quote: '“Vì Đế Quân — Sương Tuyết Ngưng Tụ!”',
  },
  {
    id: 'kokomi',
    name: 'Sangonomiya Kokomi — Nghi Lễ Nereid',
    desc: '[Sử Thi] Thánh pháp sư đảo Watatsumi dâng Thủy Triều đảo ngược sức mạnh toàn bàn (Video + Giọng lồng tiếng thật).',
    price: 115000,
    mp4Url: 'kokomi_burst.mp4',
    audioUrl: 'kokomi_burst.ogg?v=48',
    posterUrl: 'fanart/kokomi.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🫧 KỸ NĂNG NỘ • SANGONOMIYA KOKOMI (NEREID\'S ASCENSION)',
    title: 'NGHI LỄ NEREID: THỦY TRIỀU ĐẢO NGƯỢC',
    quote: '“Biển Sâu Watatsumi — Phản Chuyển Càn Khôn!”',
  },
  {
    id: 'yoimiya',
    name: 'Yoimiya — Pháo Hoa Lưu Kim',
    desc: '[Sử Thi] Nữ hoàng lễ hội hè bắn pháo hoa rực sáng thiêu rụi bài rác (Video + Giọng lồng tiếng thật).',
    price: 110000,
    mp4Url: 'yoimiya_burst.mp4',
    audioUrl: 'yoimiya_burst.ogg?v=48',
    posterUrl: 'fanart/yoimiya.jpg',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🎆 KỸ NĂNG NỘ • YOIMIYA (RYUUKIN SAXIFRAGE)',
    title: 'PHÁO HOA NAGANOHARA: LƯU KIM HỎA',
    quote: '“Pháo Hoa Mùa Hè — Bùng Nổ Rực Rỡ Nhất!”',
  },
  {
    id: 'xilonen',
    name: 'Xilonen — Nhịp Điệu Dạ Hồn',
    desc: '[Sử Thi] Bậc thầy rèn tên cổ bật bàn xoay DJ xào tung bài của mọi đối thủ (Video + Giọng lồng tiếng thật).',
    price: 125000,
    mp4Url: 'xilonen_burst.mp4',
    audioUrl: 'xilonen_burst.ogg?v=48',
    posterUrl: 'fanart/xilonen.jpg',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🐆 KỸ NĂNG NỘ • XILONEN (OCELOTLICUE POINT!)',
    title: 'NHỊP ĐIỆU DẠ HỒN: BÀN XOAY XÀO BÀI',
    quote: '“Bắt Nhịp Âm Thanh — Đảo Lộn Thế Cờ!”',
  },
  {
    id: 'citlali',
    name: 'Citlali — Bão Sương Đảo Chiều',
    desc: '[Sử Thi] Đại pháp sư Chủ Nhân Gió Đêm triệu hồi bão sương đảo ngược chiều vòng đánh (Video + Giọng lồng tiếng thật).',
    price: 125000,
    mp4Url: 'citlali_burst.mp4',
    audioUrl: 'citlali_burst.ogg?v=48',
    posterUrl: 'fanart/citlali.jpg?v=57',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • CITLALI (EDICT OF ENTWINED SPLENDOR)',
    title: 'CHỦ NHÂN GIÓ ĐÊM: BÃO SƯƠNG ĐẢO CHIỀU',
    quote: '“Gối Sao Đêm Itzpapa — Nghịch Chuyển Vòng Đấu!”',
  },
  {
    id: 'mualani',
    name: 'Mualani — Tên Lửa Cá Mập',
    desc: '[Sử Thi] Cô nàng lướt sóng phóng Cá Mập Khổng Lồ đè bẹp bộ bài khác loại (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'mualani_burst.mp4',
    audioUrl: 'mualani_burst.ogg?v=48',
    posterUrl: 'fanart/mualani.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🦈 KỸ NĂNG NỘ • MUALANI (BOOMSHARKA-LAKA)',
    title: 'TÊN LỬA CÁ MẬP: SÓNG THẦN ĐÈ KHÁC LOẠI',
    quote: '“Cá Mập Lướt Sóng — Đè Bẹp Tất Cả!”',
  },
  {
    id: 'varesa',
    name: 'Varesa — Cú Dậm Lôi Đình',
    desc: '[Sử Thi] Nữ đấu sĩ Lôi Đình tung cú dậm từ trên cao nghiền nát bộ bài trên bàn (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'varesa_burst.mp4',
    audioUrl: 'varesa_burst.ogg?v=48',
    posterUrl: 'fanart/varesa.jpg',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ KỸ NĂNG NỘ • VARESA (GUARDIAN VENT!)',
    title: 'ĐẤU SĨ LÔI ĐÌNH: CÚ DẬM NGHIỀN NÁT',
    quote: '“Siêu Cú Dậm Từ Trên Cao — Nghiền Vụn Bàn Bài!”',
  },
  {
    id: 'escoffier',
    name: 'Escoffier — Đại Tiệc Fontaine',
    desc: '[Sử Thi] Siêu đầu bếp Fontaine dọn món đặc biệt ép đối thủ phải nhận thêm bài rác (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'escoffier_burst.mp4',
    audioUrl: 'escoffier_burst.ogg?v=48',
    posterUrl: 'fanart/escoffier.jpg?v=57',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🍰 KỸ NĂNG NỘ • ESCOFFIER (SCORING CUTS)',
    title: 'ĐẠI TIỆC FONTAINE: BỮA TIỆC ÉP ĂN',
    quote: '“Thưởng Thức Món Đặc Biệt Của Bếp Trưởng Nào!”',
  },
  {
    id: 'zibai',
    name: 'Zibai — Tam Hoàng Chi Uy',
    desc: '[Sử Thi] Tiên nhân Bạch Mã Liyue khai mở thiên địa, nâng cấp 2 lá bài lẻ nhỏ nhất tăng +1 bậc số (Video + Giọng lồng tiếng thật).',
    price: 110000,
    mp4Url: 'zibai_burst.mp4',
    audioUrl: 'zibai_burst.ogg?v=54',
    posterUrl: 'fanart/zibai.jpg',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🐎 KỸ NĂNG NỘ • ZIBAI (TRI-SPHERE EMINENCE)',
    title: 'TIÊN NHÂN BẠCH MÃ: TAM HOÀNG CHI UY',
    quote: '“Ánh Trăng Tiên Nhân — Khai Mở Thiên Địa!”',
  },
  {
    id: 'lauma',
    name: 'Lauma — Khúc Ca Trăng Đập',
    desc: '[Sử Thi] Nữ tu Nguyệt Tộc ngân vang thánh ca thu hồi 1 lá bài lớn nhất trên bàn về tay (hoặc nâng +2 bậc cho 1 Đôi khi mở vòng) (Video + Giọng lồng tiếng thật).',
    price: 115000,
    mp4Url: 'lauma_burst.mp4',
    audioUrl: 'lauma_burst.ogg?v=55',
    posterUrl: 'fanart/lauma.jpg',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '✨ KỸ NĂNG NỘ • LAUMA (BEATING MOON RUNO)',
    title: 'THÁNH CA NGUYỆT TỘC: TRÁI TIM TRĂNG SÁNG',
    quote: '“Nguyệt Quang Chiếu Rọi — Thanh Tẩy Mọi Linh Hồn!”',
  },
  {
    id: 'linnea',
    name: 'Linnea — Cẩm Nang Sinh Tồn Cực Hạn',
    desc: '[Sử Thi] Ảo thuật gia tinh linh biến lá bài rác lẻ nhỏ nhất thành cùng số với 1 lá bài lẻ thường (≤ A) trên tay để tạo thành Đôi (Video + Giọng lồng tiếng thật).',
    price: 115000,
    mp4Url: 'linnea_burst.mp4',
    audioUrl: 'linnea_burst.ogg?v=55',
    posterUrl: 'fanart/linnea.jpg?v=57',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🎩 KỸ NĂNG NỘ • LINNEA (EXTREME SURVIVAL MEMO)',
    title: 'ẢO THUẬT TINH LINH: CẨM NANG CỰC HẠN',
    quote: '“Lumi Xuất Kích — Xoay Chuyển Mọi Nghịch Cảnh!”',
  },
  {
    id: 'nefer',
    name: 'Nefer — Thánh Thệ Chân Nhãn',
    desc: '[Huyền Thoại] Nữ hoàng sa mạc dùng Ảo Ảnh Sa Mạc biến 1 lá bài rác nhỏ nhất nhập vào 1 bộ Đôi sẵn có trên tay để nâng cấp thành Sám Cô (Video + Giọng lồng tiếng thật).',
    price: 130000,
    mp4Url: 'nefer_burst.mp4',
    audioUrl: 'nefer_burst.ogg?v=55',
    posterUrl: 'fanart/nefer.jpg?v=57',
    theme: 'theme-electro',
    sfxType: 'skirk',
    tag: '🌙 KỸ NĂNG NỘ • NEFER (TRUE EYE\'S PHANTASM)',
    title: 'NỮ HOÀNG SA MẠC: THÁNH THỆ CHÂN NHÃN',
    quote: '“Ảo Ảnh Bạch Xà — Nhìn Thấu Vạn Vật!”',
  },
  {
    id: 'odette',
    name: 'Odette — Vũ Khúc Thiên Nga Xanh',
    desc: '[Huyền Thoại] Vũ công thiên nga cắt bớt 1 lá cao nhất khỏi bộ bài trên bàn (Sảnh 4➔3, Sám➔Đôi, Đôi➔Lẻ) hoặc hạ 3 bậc lá lẻ (Video + Giọng lồng tiếng thật).',
    price: 130000,
    mp4Url: 'odette_burst.mp4',
    audioUrl: 'odette_burst.ogg?v=55',
    posterUrl: 'fanart/odette.jpg?v=57',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🦢 KỸ NĂNG NỘ • ODETTE (PRESTO: BLUEBIRD FINALE)',
    title: 'VŨ KHÚC BĂNG GIÁ: KHÚC CUỐI THIÊN NGA',
    quote: '“Điệu Múa Đêm Đông — Khép Lại Màn Nhung!”',
  },
  {
    id: 'vesna',
    name: 'Vesna — Vì Nữ Hoàng Băng Giá!',
    desc: '[Huyền Thoại] Nữ kiếm sĩ Hệ Phong vung kiếm gió xuân làm giảm 2 bậc số của 2 lá bài cao nhất (dưới Heo) trên tay đối thủ (Video + Giọng lồng tiếng thật).',
    price: 140000,
    mp4Url: 'vesna_burst.mp4',
    audioUrl: 'vesna_burst.ogg?v=55',
    posterUrl: 'fanart/vesna.jpg?v=57',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🍃 KỸ NĂNG NỘ • VESNA (FOR THE TSARITSA!)',
    title: 'KIẾM VŨ PHONG XUÂN: VÌ NỮ HOÀNG!',
    quote: '“Đã Khóa Mục Tiêu — Vì Nữ Hoàng Băng Giá!”',
  },
  {
    id: 'sandrone',
    name: 'Sandrone — Công Thức Tuyệt Đối Q.E.D.',
    desc: '[Huyền Thoại] Quan Chấp Hành thứ 7 của Fatui tái cấu trúc 3 lá bài lẻ nhỏ nhất trên tay thành 1 bộ Sảnh 3 lá liên tiếp (Video + Giọng lồng tiếng thật).',
    price: 150000,
    mp4Url: 'sandrone_burst.mp4',
    audioUrl: 'sandrone_burst.ogg?v=55',
    posterUrl: 'fanart/sandrone.jpg',
    theme: 'theme-cryo',
    sfxType: 'raiden',
    tag: '⚙️ KỸ NĂNG NỘ • SANDRONE (FORMULE PHÉNOMÉNALE: Q.E.D.)',
    title: 'QUAN CHẤP HÀNH #7: ĐỊNH LÝ TUYỆT ĐỐI',
    quote: '“Chứng Minh Hoàn Tất — Mọi Con Rối Nghe Lệnh!”',
  },
  {
    id: 'columbina',
    name: 'Columbina — Khúc Ru Trăng Buồn',
    desc: '[Thần Thoại] Quan Chấp Hành thứ 3 của Fatui ngân Khúc Ca Thiên Thần cho phép đánh bồi liên tiếp 2 bộ bài trong cùng 1 lượt (Video + Giọng lồng tiếng thật).',
    price: 165000,
    mp4Url: 'columbina_burst.mp4',
    audioUrl: 'columbina_burst.ogg?v=55',
    posterUrl: 'fanart/columbina.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🕊️ KỸ NĂNG NỘ • COLUMBINA (MOONLIT MELANCHOLY)',
    title: 'QUAN CHẤP HÀNH #3: KHÚC RU TRĂNG BUỒN',
    quote: '“Hãy Nhắm Mắt Lại — Chìm Vào Giấc Mơ Ánh Trăng...”',
  },
  {
    id: 'vodyanitsa',
    name: 'Vodyanitsa — Khúc Hát Kết: Cùng Người Chìm Đắm',
    desc: '[Thần Thoại] Mỹ nhân ngư Hệ Thủy dùng Gương Nước Phản Chiếu biến các lá rác nhỏ nhất thành bộ bài cùng loại nhưng lớn hơn +1 bậc so với bộ trên bàn để đè ngay (Video + Giọng lồng tiếng thật).',
    price: 185000,
    mp4Url: 'vodyanitsa_burst.mp4',
    audioUrl: 'vodyanitsa_burst.ogg?v=55',
    posterUrl: 'fanart/vodyanitsa.jpg?v=57',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🌊 KỸ NĂNG NỘ • VODYANITSA (KODA: SINK WITH THEE)',
    title: 'KHÚC HÁT KẾT: CÙNG NGƯỜI CHÌM ĐẮM',
    quote: '“Khúc Bi Ca Biển Thẳm — Tất Cả Hãy Cùng Cất Tiếng Hát!”',
  },
  {
    id: 'lohen',
    name: 'Lohen — Phán Quyết Hiển Hiện',
    desc: '[Sử Thi] Kỵ sĩ Tây Phong dựng Khiên Phản Đòn trả ngược bộ bài đang trên bàn bắt chính người vừa đánh phải tự đỡ lại bài của mình (Video + Giọng lồng tiếng thật).',
    price: 125000,
    mp4Url: 'lohen_burst.mp4?v=57',
    audioUrl: 'lohen_burst.ogg?v=62',
    posterUrl: 'fanart/lohen.jpg?v=57',
    theme: 'theme-cryo',
    sfxType: 'raiden',
    tag: '⚔️ KỸ NĂNG NỘ • LOHEN (MANIFEST JUDGMENT)',
    title: 'KỴ SĨ TÂY PHONG: PHÁN QUYẾT HIỂN HIỆN',
    quote: '“Vùng Vẫy Vô Ích — Sẽ Không Có Kết Cục Cổ Tích Cho Ngươi!”',
  },
  {
    id: 'durin',
    name: 'Durin — Nguyên Lý Thuần Khiết: Ánh Sáng Chuyển Dời',
    desc: '[Huyền Thoại] Hắc Long truyền máu Trái Tim Rồng Đỏ biến 1 lá bài cao nhất (dưới 2) trên tay hóa thành con Heo Cơ (2♥) thực thụ (Video + Giọng lồng tiếng thật).',
    price: 155000,
    mp4Url: 'durin_burst.mp4?v=57',
    audioUrl: 'durin_burst.ogg?v=62',
    posterUrl: 'fanart/durin.jpg?v=57',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🐉 KỸ NĂNG NỘ • DURIN (PRINCIPLE OF PURITY)',
    title: 'HẮC LONG TÁI SINH: TRÁI TIM RỒNG ĐỎ',
    quote: '“Sự Suy Tàn Và Tái Sinh — Câu Chuyện Mới Chỉ Bắt Đầu!”',
  },
  {
    id: 'xiao',
    name: 'Xiao — Vũ Điệu Trừ Yêu',
    desc: '[Huyền Thoại] Hộ Pháp Dạ Xoa Không Trung Đạp Kích cho phép dùng 1 Lá Lẻ duy nhất đâm thủng và đè trực tiếp lên cả Đôi, Sám Cô hoặc Sảnh trên bàn (Video + Giọng lồng tiếng thật).',
    price: 155000,
    mp4Url: 'xiao_burst.mp4?v=57',
    audioUrl: 'xiao_burst.ogg?v=62',
    posterUrl: 'fanart/xiao.jpg?v=57',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '👹 KỸ NĂNG NỘ • XIAO (BANE OF ALL EVIL)',
    title: 'HỘ PHÁP DẠ XOA: VŨ ĐIỆU TRỪ YÊU',
    quote: '“Vô Dụng — Trừ Yêu Diệt Ác, Tan Biến Đi!”',
  },
  {
    id: 'wanderer',
    name: 'Wanderer — Kyougen: Thức Lạc Ngũ Phiên',
    desc: '[Huyền Thoại] Kẻ Lang Thang triệu hồi cuồng phong xáo trộn toàn bộ bài đang cầm trên tay của tất cả người chơi trên bàn rồi chia lại (Video + Giọng lồng tiếng thật).',
    price: 160000,
    mp4Url: 'wanderer_burst.mp4?v=57',
    audioUrl: 'wanderer_burst.ogg?v=62',
    posterUrl: 'fanart/wanderer.jpg?v=57',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🌀 KỸ NĂNG NỘ • WANDERER (FIVE CEREMONIAL PLAYS)',
    title: 'CHÂN KHÔNG TỰ TẠI: THỨC LẠC NGŨ PHIÊN',
    quote: '“Lũ Côn Trùng Thấp Kém — Dám Ngước Nhìn Ta Sao!?”',
  },
  {
    id: 'kinich',
    name: 'Kinich — Kính Chào Thánh Long Toàn Năng',
    desc: '[Huyền Thoại] Thợ săn Natlan đặt Bom Hẹn Giờ Pixel Ajaw lên bàn: Đối thủ nào đánh đè lên bài của Kinich vòng này sẽ bị nổ bom nhận thêm 1 lá rác (Video + Giọng lồng tiếng thật).',
    price: 155000,
    mp4Url: 'kinich_burst.mp4?v=57',
    audioUrl: 'kinich_burst.ogg?v=62',
    posterUrl: 'fanart/kinich.jpg?v=57',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🦖 KỸ NĂNG NỘ • KINICH (ALMIGHTY DRAGONLORD)',
    title: 'THÁNH LONG AJAW: PHÁO RỒNG PIXEL',
    quote: '“Hình Bóng Quá Khứ — Nghe Theo Mệnh Lệnh Của Ta!”',
  },
  {
    id: 'venti',
    name: 'Venti — Bài Thơ Thần Gió',
    desc: '[Thần Thoại] Phong Thần tạo Hố Đen hút 1 lá bài lớn nhất (≤ A) của mọi đối thủ gom chung với các lá rác của Venti, giữ lại các lá lớn nhất và thổi trả lá rác cho đối thủ (Video + Giọng lồng tiếng thật).',
    price: 175000,
    mp4Url: 'venti_burst.mp4?v=57',
    audioUrl: 'venti_burst.ogg?v=62',
    posterUrl: 'fanart/venti.jpg?v=57',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🌪️ KỸ NĂNG NỘ • VENTI (WIND\'S GRAND ODE)',
    title: 'PHONG THẦN BARBATOS: BÀI THƠ THẦN GIÓ',
    quote: '“Định Chạy Trốn Sao? — Đến Giờ Cất Cánh Rồi!”',
  },
  {
    id: 'qiqi',
    isStandard: true,
    name: 'Qiqi — Tiên Pháp: Cứu Khổ Độ Ách',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Khi thua ván được giảm 15% tiền phạt đếm lá + Có Hoạt Ảnh Nộ 5★ khi Chặt & Thắng.',
    price: 90000,
    mp4Url: 'qiqi_burst.mp4?v=61',
    audioUrl: 'qiqi_burst.ogg?v=62',
    posterUrl: 'fanart/qiqi.jpg?v=61',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ NỘ 5★ THƯỜNG • QIQI (PRESERVER OF FORTUNE)',
    title: 'TIÊN PHÁP BẢO HỘ: CỨU KHỔ ĐỘ ÁCH',
    quote: '“Mệnh Lệnh Đã Ban — Chân Danh Độ Ách Chân Quân!”',
  },
  {
    id: 'keqing',
    isStandard: true,
    name: 'Keqing — Tuần Du Thiên Nhai',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Khi Về Nhất thu thêm +2× Mức cược từ mỗi nhà thua + Có Hoạt Ảnh Nộ 5★ khi Chặt & Thắng.',
    price: 95000,
    mp4Url: 'keqing_burst.mp4?v=61',
    audioUrl: 'keqing_burst.ogg?v=62',
    posterUrl: 'fanart/keqing.jpg?v=61',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '⚡ NỘ 5★ THƯỜNG • KEQING (STARWARD SWORD)',
    title: 'NGỌC HÀNH TINH: TUẦN DU THIÊN NHAI',
    quote: '“Kiếm Quang Như Chớp — Không Chỗ Trốn Thoát!”',
  },
  {
    id: 'mona',
    isStandard: true,
    name: 'Mona — Quỹ Đạo Tinh Mệnh',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Về Nhất thu thêm +1.5× cược mỗi nhà thua, khi thua được giảm 1× cược + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'mona_burst.mp4?v=61',
    audioUrl: 'mona_burst.ogg?v=62',
    posterUrl: 'fanart/mona.jpg?v=61',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '💧 NỘ 5★ THƯỜNG • MONA (STELLARIS PHANTASM)',
    title: 'THUẬT SĨ CHIÊM TINH: QUỸ ĐẠO TINH MỆNH',
    quote: '“Định Mệnh Đã ĐượcCác Vì Sao An Bài!”',
  },
  {
    id: 'diluc',
    isStandard: true,
    name: 'Diluc — Lê Minh Phượng Hoàng',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Tăng +20% tiền thưởng khi Chặt Heo/Hàng và khi ăn Thối cuối ván + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'diluc_burst.mp4?v=61',
    audioUrl: 'diluc_burst.ogg?v=62',
    posterUrl: 'fanart/diluc.jpg?v=61',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🔥 NỘ 5★ THƯỜNG • DILUC (DAWN)',
    title: 'PHƯỢNG HOÀNG LỬA: BÌNH MINH PHÁN QUYẾT',
    quote: '“Ngọn Lửa Phán Quyết — Thiêu Rụi Mọi Tội Lỗi!”',
  },
  {
    id: 'jean',
    isStandard: true,
    name: 'Jean — Gió Bồ Công Anh',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Giảm 25% tiền phạt khi bị Chặt Heo/Hàng hoặc bị phạt Thối/Cóng cuối ván + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'jean_burst.mp4?v=61',
    audioUrl: 'jean_burst.ogg?v=62',
    posterUrl: 'fanart/jean.jpg?v=61',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🍃 NỘ 5★ THƯỜNG • JEAN (DANDELION BREEZE)',
    title: 'KỴ SĨ BỒ CÔNG ANH: NGỌN GIÓ DẪN ĐƯỜNG',
    quote: '“Hỡi Ngọn Gió Ngàn Năm — Hãy Lắng Nghe Lời Ta!”',
  },
  {
    id: 'tighnari',
    isStandard: true,
    name: 'Tighnari — Dây Leo Sinh Trưởng',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Mỗi lần đánh Sảnh (≥ 4 lá) hoặc Sám Cô nhận ngay +0.5× cược (tối đa 3 lần/ván) + Có Hoạt Ảnh Nộ 5★.',
    price: 90000,
    mp4Url: 'tighnari_burst.mp4?v=61',
    audioUrl: 'tighnari_burst.ogg?v=62',
    posterUrl: 'fanart/tighnari.jpg?v=61',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🌿 NỘ 5★ THƯỜNG • TIGHNARI (TANGLEVINE SHAFT)',
    title: 'KIỂM LÂM AVIDYA: DÂY LEO SINH TRƯỞNG',
    quote: '“Ta Nghe Thấy Hết Rồi — Dây Leo Trói Buộc!”',
  },
  {
    id: 'dehya',
    isStandard: true,
    name: 'Dehya — Sư Tử Lửa Bờm Đỏ',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Khi thua nặng (≥ 8 lá hoặc Cóng), giảm 25% tiền phạt các lá vượt ngưỡng 7 lá + Có Hoạt Ảnh Nộ 5★.',
    price: 90000,
    mp4Url: 'dehya_burst.mp4?v=61',
    audioUrl: 'dehya_burst.ogg?v=62',
    posterUrl: 'fanart/dehya.jpg?v=61',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🔥 NỘ 5★ THƯỜNG • DEHYA (LEONINE BITE)',
    title: 'SƯ TỬ BỜM ĐỎ: NANH SƯ TỬ RỰC CHÁY',
    quote: '“Ngươi Tiêu Đời Rồi — Nếm Thử Nắm Đấm Lửa Này Đi!”',
  },
  {
    id: 'mizuki',
    isStandard: true,
    name: 'Yumemizuki Mizuki — Liệu Pháp Mộng Đẹp',
    desc: '[5★ Thường • Lệch Rate] Không có Kỹ Năng [E] • Nội Tại Cược: Kết thúc mỗi ván (thắng hay thua) đều được Baku hồi cố định +1.5× Mức cược Xu + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'mizuki_burst.mp4?v=61',
    audioUrl: 'mizuki_burst.ogg?v=62',
    posterUrl: 'fanart/mizuki.jpg?v=61',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🍃 NỘ 5★ THƯỜNG • MIZUKI (SECRET SPRING THERAPY)',
    title: 'MỘNG ĐẸP AN THẦN: LIỆU PHÁP SUỐI MƠ',
    quote: '“Xua Tan Ác Mộng — Hãy Thả Lỏng Và Chìm Vào Giấc Mơ Đẹp Nhé~”',
  },
];

// ============================================================================
// HỆ THỐNG PHẢN ỨNG NGUYÊN TỐ GENSHIN IMPACT (CHỈ KÍCH HOẠT Ở CÁC PHA ĐÁNH ĐẶC BIỆT)
// ============================================================================
const CHARACTER_ELEMENTS = {
  hutao: 'pyro',
  mavuika: 'pyro',
  yoimiya: 'pyro',
  yelan: 'hydro',
  furina: 'hydro',
  kokomi: 'hydro',
  mualani: 'hydro',
  columbina: 'hydro',
  vodyanitsa: 'hydro',
  raiden: 'electro',
  yaemiko: 'electro',
  clorinde: 'electro',
  varesa: 'electro',
  ayaka: 'cryo',
  eula: 'cryo',
  skirk: 'cryo',
  citlali: 'cryo',
  escoffier: 'cryo',
  ganyu: 'cryo',
  shenhe: 'cryo',
  odette: 'cryo',
  sandrone: 'cryo',
  vesna: 'anemo',
  navia: 'geo',
  xilonen: 'geo',
  zibai: 'geo',
  linnea: 'geo',
  lauma: 'dendro',
  nefer: 'dendro',
  kinich: 'dendro',
  lohen: 'cryo',
  durin: 'pyro',
  xiao: 'anemo',
  wanderer: 'anemo',
  venti: 'anemo',
  qiqi: 'cryo',
  keqing: 'electro',
  mona: 'hydro',
  diluc: 'pyro',
  jean: 'anemo',
  tighnari: 'dendro',
  dehya: 'pyro',
  mizuki: 'anemo',
};

function checkGenuineGenshinReaction(elemA, elemB) {
  if (!elemA || !elemB || elemA === elemB) return false;
  const pair = new Set([elemA, elemB]);
  if (pair.has('pyro') && (pair.has('hydro') || pair.has('cryo') || pair.has('electro') || pair.has('dendro'))) return true;
  if (pair.has('hydro') && (pair.has('electro') || pair.has('cryo') || pair.has('dendro'))) return true;
  if (pair.has('electro') && (pair.has('cryo') || pair.has('dendro'))) return true;
  if (pair.has('anemo') && (pair.has('pyro') || pair.has('hydro') || pair.has('electro') || pair.has('cryo'))) return true;
  if (pair.has('geo') && (pair.has('pyro') || pair.has('hydro') || pair.has('electro') || pair.has('cryo'))) return true;
  return false;
}

function resolveGenshinReaction(elemA, elemB) {
  const pair = new Set([elemA, elemB]);
  if (pair.has('pyro') && pair.has('hydro')) {
    return {
      shortName: '💧🔥 Bốc Hơi (Vaporize)',
      badge: '💧🔥 PHẢN ỨNG BỐC HƠI (VAPORIZE ×2.0)',
      cssClass: 'reaction-vaporize',
    };
  }
  if (pair.has('pyro') && pair.has('cryo')) {
    return {
      shortName: '❄️🔥 Tan Chảy (Melt)',
      badge: '❄️🔥 PHẢN ỨNG TAN CHẢY (MELT ×2.0)',
      cssClass: 'reaction-melt',
    };
  }
  if (pair.has('pyro') && pair.has('electro')) {
    return {
      shortName: '⚡🔥 Quá Tải (Overloaded)',
      badge: '⚡🔥 PHẢN ỨNG QUÁ TẢI (OVERLOADED 💥)',
      cssClass: 'reaction-overloaded',
    };
  }
  if (pair.has('hydro') && pair.has('electro')) {
    return {
      shortName: '⚡💧 Điện Cảm (Electro-Charged)',
      badge: '⚡💧 PHẢN ỨNG ĐIỆN CẢM (ELECTRO-CHARGED)',
      cssClass: 'reaction-electrocharged',
    };
  }
  if (pair.has('cryo') && pair.has('hydro')) {
    return {
      shortName: '🧊❄️ Đóng Băng (Frozen)',
      badge: '🧊❄️ PHẢN ỨNG ĐÓNG BĂNG (FROZEN)',
      cssClass: 'reaction-frozen',
    };
  }
  if (pair.has('cryo') && pair.has('electro')) {
    return {
      shortName: '❄️⚡ Siêu Dẫn (Superconduct)',
      badge: '❄️⚡ PHẢN ỨNG SIÊU DẪN (SUPERCONDUCT)',
      cssClass: 'reaction-superconduct',
    };
  }
  if (pair.has('dendro') && pair.has('electro')) {
    return {
      shortName: '🌿⚡ Tăng Cường (Aggravate)',
      badge: '🌿⚡ PHẢN ỨNG TĂNG CƯỜNG (AGGRAVATE)',
      cssClass: 'reaction-aggravate',
    };
  }
  if (pair.has('dendro') && pair.has('pyro')) {
    return {
      shortName: '🌿🔥 Thiêu Đốt (Burning)',
      badge: '🌿🔥 PHẢN ỨNG THIÊU ĐỐT (BURNING)',
      cssClass: 'reaction-burning',
    };
  }
  if (pair.has('dendro') && pair.has('hydro')) {
    return {
      shortName: '🌿💧 Sum Suê (Bloom)',
      badge: '🌿💧 PHẢN ỨNG SUM SUÊ (BLOOM)',
      cssClass: 'reaction-bloom',
    };
  }
  if (pair.has('anemo')) {
    return {
      shortName: '🍃🌀 Khuếch Tán (Swirl)',
      badge: '🍃🌀 PHẢN ỨNG KHUẾCH TÁN (SWIRL)',
      cssClass: 'reaction-frozen',
    };
  }
  if (pair.has('geo')) {
    return {
      shortName: '💎🪨 Kết Tinh (Crystallize)',
      badge: '💎🪨 PHẢN ỨNG KẾT TINH (CRYSTALLIZE)',
      cssClass: 'reaction-crystallize',
    };
  }
  return {
    shortName: '⚡🔥 Quá Tải (Overloaded)',
    badge: '⚡🔥 PHẢN ỨNG QUÁ TẢI (OVERLOADED 💥)',
    cssClass: 'reaction-overloaded',
  };
}

// ============================================================================
// HỆ THỐNG 20 KỸ NĂNG CHIẾN THUẬT NHÂN VẬT 5★ (MỖI VÁN DÙNG 1 LẦN • CÂN BẰNG)
// ============================================================================
let activeFurinaReverseSuit = false;
let activeNaviaLockedCardIds = new Set();
let activeShenheSingleOnly = false;
let activeGanyuGapStraight = false;
let activeKokomiReverseRank = false;
let activeMualaniCrossBeat = false;
let activeXiaoPlungeSingle = false;

const CHARACTER_SKILLS = {
  raiden: {
    id: 'raiden',
    charName: 'Raiden Shogun',
    icon: '⚡',
    name: 'Tịnh Thổ Cắt Vòng',
    shortDesc: 'Chém đứt Lá Lẻ hoặc Đôi nhỏ (≤ J) trên bàn để mở vòng mới và được đánh bộ bài hợp lệ bất kỳ',
  },
  furina: {
    id: 'furina',
    charName: 'Furina',
    icon: '💧',
    name: 'Luật Sân Khấu Fontaine',
    shortDesc: 'Trong vòng này: Đảo ngược thứ tự chất (♠ > ♣ > ♦ > ♥) khi đè cùng số & CẤM đánh Heo lẻ (2 lẻ)',
  },
  skirk: {
    id: 'skirk',
    charName: 'Skirk',
    icon: '🌌',
    name: 'Khe Nứt Vực Sâu',
    shortDesc: 'Tráo đổi 1 lá bài đang chọn (hoặc 1 lá ngẫu nhiên) với 1 lá bài ngẫu nhiên của 1 đối thủ ngẫu nhiên',
  },
  mavuika: {
    id: 'mavuika',
    charName: 'Mavuika',
    icon: '🔥',
    name: 'Thánh Hỏa Rèn Bài',
    shortDesc: 'Rèn 1 lá bài thường (3→K) tăng +1 bậc số và đổi sang chất Cơ ♥ (tối đa lên A♥)',
  },
  yaemiko: {
    id: 'yaemiko',
    charName: 'Yae Miko',
    icon: '🌸',
    name: 'Hồ Ly Dụ Hoặc',
    shortDesc: 'Trong vòng này: Ai tới lượt mà có bài hợp lệ BẮT BUỘC PHẢI ĐÁNH (khóa Bỏ lượt giấu Heo)',
  },
  yelan: {
    id: 'yelan',
    charName: 'Yelan',
    icon: '🎲',
    name: 'Mạng Lưới Tình Báo',
    shortDesc: 'Lật ngửa 3 lá bài ngẫu nhiên của 1 đối thủ ngẫu nhiên trong 8 giây & báo cáo số Heo + Hàng',
  },
  clorinde: {
    id: 'clorinde',
    charName: 'Clorinde',
    icon: '⚡',
    name: 'Thách Đấu Danh Dự',
    shortDesc: 'Khóa vòng hiện tại thành Quyết Đấu 1v1 với 1 đối thủ (các nhà khác đứng ngoài vòng này)',
  },
  ayaka: {
    id: 'ayaka',
    charName: 'Kamisato Ayaka',
    icon: '❄️',
    name: 'Sương Hoa Phong Ấn',
    shortDesc: 'Đóng băng 1 đối thủ khiến họ bị Băng Phong mất 1 lượt trong vòng hiện tại',
  },
  hutao: {
    id: 'hutao',
    charName: 'Hu Tao',
    icon: '🦋',
    name: 'Bùa Vãng Sinh (Thuế Đối Thủ)',
    shortDesc: 'Yểm bùa vòng hiện tại: Mỗi khi ĐỐI THỦ đánh bài ra bàn đều phải nộp thuế ngay 2× mức cược cho Hu Tao',
  },
  eula: {
    id: 'eula',
    charName: 'Eula',
    icon: '❄️',
    name: 'Kiếm Ánh Sáng Phá Giáp',
    shortDesc: 'Chém giảm 2 bậc số của bộ bài thường trên bàn (A➔Q, K➔J) hoặc cường hóa +2 bậc khi mở vòng',
  },
  navia: {
    id: 'navia',
    charName: 'Navia',
    icon: '☂️',
    name: 'Pháo Kích Khóa Bài',
    shortDesc: 'Bắn đạn pha lê khóa cứng 3 lá bài ngẫu nhiên trên tay 1 đối thủ khiến 3 lá đó không thể đánh ra trong vòng này',
  },
  shenhe: {
    id: 'shenhe',
    charName: 'Shenhe',
    icon: '❄️',
    name: 'Lục Đạo Độc Tôn',
    shortDesc: 'Phong ấn vòng hiện tại: CẤM toàn bộ đối thủ đánh Đôi, Sám Cô và Sảnh (chỉ được đánh Bài Lẻ 1 lá)',
  },
  ganyu: {
    id: 'ganyu',
    charName: 'Ganyu',
    icon: '🏹',
    name: 'Băng Hoa Xuyên Thấu',
    shortDesc: 'Trong lượt này: Cho phép bạn đánh Sảnh Khuyết thiếu 1 mắt xích ở giữa (VD: 4-5-7-8 vẫn thành Sảnh 4 lá)',
  },
  kokomi: {
    id: 'kokomi',
    charName: 'Sangonomiya Kokomi',
    icon: '🫧',
    name: 'Thủy Triều Đảo Ngược',
    shortDesc: 'Trong vòng này: Đảo ngược toàn bộ sức mạnh từ 3 đến A (3 trở thành lớn nhất, A nhỏ nhất; bài nhỏ đè bài lớn)',
  },
  yoimiya: {
    id: 'yoimiya',
    charName: 'Yoimiya',
    icon: '🎆',
    name: 'Pháo Hoa Thiêu Rác',
    shortDesc: 'Trong lượt này: Khi bạn đánh Đôi, Sám Cô hoặc Sảnh sẽ tự động đốt bỏ kèm thêm 1 lá lẻ nhỏ nhất trên tay',
  },
  xilonen: {
    id: 'xilonen',
    charName: 'Xilonen',
    icon: '🐆',
    name: 'Bàn Xoay DJ Xào Bài',
    shortDesc: 'Thu gom mỗi đối thủ 2 lá bài ngẫu nhiên, trộn đều lên rồi chia trả lại ngẫu nhiên để phá bộ đối phương',
  },
  citlali: {
    id: 'citlali',
    charName: 'Citlali',
    icon: '❄️',
    name: 'Bão Đêm Đảo Chiều',
    shortDesc: 'Đảo ngược chiều đánh của bàn bài (thuận chiều ↔ ngược chiều kim đồng hồ) cho đến hết ván',
  },
  mualani: {
    id: 'mualani',
    charName: 'Mualani',
    icon: '🦈',
    name: 'Cá Mập Đè Khác Loại',
    shortDesc: 'Trong lượt này: Cho phép dùng Đôi đè thẳng lên Bài Lẻ, hoặc dùng Sám Cô / Sảnh 3 lá đè thẳng lên Đôi',
  },
  varesa: {
    id: 'varesa',
    charName: 'Varesa',
    icon: '⚡',
    name: 'Cú Dậm Nghiền Nát',
    shortDesc: 'Dậm vỡ bộ Đôi / Sám Cô / Sảnh đang nằm trên bàn xuống chỉ còn đúng 1 lá Bài Lẻ thấp nhất (hoặc hạ 4 bậc lá lẻ)',
  },
  escoffier: {
    id: 'escoffier',
    charName: 'Escoffier',
    icon: '🍰',
    name: 'Bữa Tiệc Ép Ăn',
    shortDesc: 'Ném thẳng 1 lá bài rác nhỏ nhất trên tay bạn bắt 1 đối thủ ngẫu nhiên phải nhận vào tay (bạn -1 lá, đối thủ +1 lá)',
  },
  zibai: {
    id: 'zibai',
    charName: 'Zibai',
    icon: '🐎',
    name: 'Bạch Mã Đạp Vân',
    shortDesc: 'Nâng cấp 2 lá bài lẻ nhỏ nhất (3→K) trên tay tăng thêm +1 bậc số (tối đa lên A) để dễ kết Đôi / ghép Sảnh',
  },
  lauma: {
    id: 'lauma',
    charName: 'Lauma',
    icon: '✨',
    name: 'Nguyệt Quang Hồi Phục',
    shortDesc: 'Thu hồi lại 1 lá bài lớn nhất trong bộ bài đang trên bàn về tay bạn (hoặc nâng +2 bậc cho 1 Đôi trên tay khi mở vòng)',
  },
  linnea: {
    id: 'linnea',
    charName: 'Linnea',
    icon: '🎩',
    name: 'Ảo Thuật Ghép Đôi',
    shortDesc: 'Biến 1 lá bài rác lẻ nhỏ nhất trên tay thành cùng bậc số với 1 lá bài lẻ thường (≤ A) khác trên tay để tạo ngay 1 bộ Đôi',
  },
  nefer: {
    id: 'nefer',
    charName: 'Nefer',
    icon: '🌙',
    name: 'Ảo Ảnh Sa Mạc',
    shortDesc: 'Biến 1 lá bài rác nhỏ nhất trên tay nhập vào 1 bộ Đôi sẵn có trên tay bạn để nâng cấp lên thành Sám Cô (3 lá cùng số)',
  },
  odette: {
    id: 'odette',
    charName: 'Odette',
    icon: '🦢',
    name: 'Vũ Điệu Thiên Nga',
    shortDesc: 'Cắt bớt 1 lá bài cao nhất khỏi bộ bài trên bàn (Sảnh 4➔Sảnh 3, Sám➔Đôi, Đôi➔Lẻ) hoặc hạ 3 bậc lá lẻ trên bàn',
  },
  vesna: {
    id: 'vesna',
    charName: 'Vesna',
    icon: '🍃',
    name: 'Lốc Xoáy Tuyết Xuân',
    shortDesc: 'Cuốn bay sức mạnh làm giảm 2 bậc số của 2 lá bài lớn nhất (dưới Heo) trên tay đối thủ đang giữ ít bài nhất',
  },
  sandrone: {
    id: 'sandrone',
    charName: 'Sandrone',
    icon: '⚙️',
    name: 'Dây Cót Con Rối',
    shortDesc: 'Tái cấu trúc 3 lá bài lẻ rời rạc nhỏ nhất (dưới Heo) trên tay bạn thành 1 bộ Sảnh 3 lá liên tiếp',
  },
  columbina: {
    id: 'columbina',
    charName: 'Columbina',
    icon: '🕊️',
    name: 'Khúc Ca Thiên Thần',
    shortDesc: 'Đánh 2 lượt liên tiếp: Sau khi đánh 1 bộ bài trong lượt này, Columbina được đánh bồi thêm 1 bộ bài nữa ngay lập tức trước khi chuyển lượt!',
  },
  vodyanitsa: {
    id: 'vodyanitsa',
    charName: 'Vodyanitsa',
    icon: '🌊',
    name: 'Gương Nước Phản Chiếu',
    shortDesc: 'Mặt nước biến các lá rác nhỏ nhất trên tay thành bộ bài CÙNG LOẠI nhưng LỚN HƠN +1 BẬC so với bộ đang trên bàn để đè lại ngay!',
  },
  lohen: {
    id: 'lohen',
    charName: 'Lohen',
    icon: '⚔️',
    name: 'Khiên Phản Đòn Tây Phong',
    shortDesc: 'Phản ngược bộ bài đang trên bàn trả lại cho chính người vừa đánh: Biến bộ bài đó thành của Lohen và ép người vừa đánh (cùng cả bàn) phải tự đỡ lại bài của chính họ!',
  },
  durin: {
    id: 'durin',
    charName: 'Durin',
    icon: '🩸',
    name: 'Trái Tim Rồng Đỏ',
    shortDesc: 'Truyền máu Hắc Long biến 1 lá bài cao nhất (dưới 2) trên tay Durin hóa thành con Heo Cơ (2♥) thực thụ!',
  },
  xiao: {
    id: 'xiao',
    charName: 'Xiao',
    icon: '👹',
    name: 'Không Trung Đạp Kích',
    shortDesc: 'Nhảy vọt lên không trung dậm thương xuống: Cho phép trong lượt này dùng chỉ 1 Lá Lẻ duy nhất để đè trực tiếp lên cả Đôi, Sám Cô hoặc Sảnh trên bàn!',
  },
  wanderer: {
    id: 'wanderer',
    charName: 'Wanderer',
    icon: '🌀',
    name: 'Cuồng Phong Đảo Mệnh',
    shortDesc: 'Khi kích hoạt chiêu, thu gom và xáo trộn ngẫu nhiên toàn bộ bài trên tay của tất cả người chơi đang còn trên bàn rồi chia trả lại theo đúng số lá!',
  },
  kinich: {
    id: 'kinich',
    charName: 'Kinich',
    icon: '🎮',
    name: 'Gài Bom Hẹn Giờ Ajaw',
    shortDesc: 'Đặt Bom Pixel Ajaw lên bàn bài: Đối thủ nào dám đánh đè lên bài của Kinich trong vòng này sẽ kích nổ bom, bị nhét thẳng 1 lá bài rác nhỏ nhất từ tay Kinich vào tay họ!',
  },
  venti: {
    id: 'venti',
    charName: 'Venti',
    icon: '🌪️',
    name: 'Hố Đen Phong Thần',
    shortDesc: 'Hố đen hút 1 lá bài lớn nhất (≤ A) từ tay MỌI đối thủ gom chung với các lá rác nhỏ nhất của Venti: Venti giữ lại các lá lớn nhất còn thổi trả toàn bộ lá rác về tay từng đối thủ!',
  },
  qiqi: {
    id: 'qiqi',
    charName: 'Qiqi',
    icon: '❄️',
    isPassiveBet: true,
    name: 'Bùa Độ Ách',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Khi thua ván, Qiqi dán Bùa Độ Ách giúp giảm 15% tổng tiền phạt đếm lá phải trả cho người Về Nhất (kèm Hoạt Ảnh Nộ 5★ khi Chặt/Thắng).',
  },
  keqing: {
    id: 'keqing',
    charName: 'Keqing',
    icon: '⚡',
    isPassiveBet: true,
    name: 'Tuần Du Thiên Nhai',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Khi Về Nhất, Keqing nhận thêm tiền thưởng tốc độ (+2 × Mức cược bàn) từ mỗi đối thủ thua (kèm Hoạt Ảnh Nộ 5★ khi Chặt/Thắng).',
  },
  mona: {
    id: 'mona',
    charName: 'Mona',
    icon: '💧',
    isPassiveBet: true,
    name: 'Quỹ Đạo Tinh Mệnh',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Cuối ván nếu Mona Về Nhất nhận thêm +1.5× Mức cược từ mỗi nhà thua; nếu thua được giảm nhẹ 1× Mức cược (kèm Hoạt Ảnh Nộ 5★).',
  },
  diluc: {
    id: 'diluc',
    charName: 'Diluc',
    icon: '🔥',
    isPassiveBet: true,
    name: 'Lê Minh Phượng Hoàng',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Mỗi pha Chặt Heo/Hàng hoặc ăn Thối Heo/Hàng cuối ván của Diluc được tăng thêm +20% tiền thưởng (kèm Hoạt Ảnh Nộ 5★).',
  },
  jean: {
    id: 'jean',
    charName: 'Jean',
    icon: '🍃',
    isPassiveBet: true,
    name: 'Gió Bồ Công Anh',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Khi bị đối thủ Chặt Heo/Hàng hoặc bị phạt Thối Heo/Hàng/Cóng cuối ván, Jean được giảm 25% số Xu bị phạt (kèm Hoạt Ảnh Nộ 5★).',
  },
  tighnari: {
    id: 'tighnari',
    charName: 'Tighnari',
    icon: '🌿',
    isPassiveBet: true,
    name: 'Dây Leo Sinh Trưởng',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Mỗi khi đánh ra Sảnh (≥ 4 lá) hoặc Sám Cô trong ván, tích ngay +0.5× Mức cược Xu vào túi (tối đa 3 lần/ván, kèm Hoạt Ảnh Nộ 5★).',
  },
  dehya: {
    id: 'dehya',
    charName: 'Dehya',
    icon: '🔥',
    isPassiveBet: true,
    name: 'Sư Tử Lửa Bờm Đỏ',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Nếu cuối ván Dehya còn tồn từ 8 lá trở lên (hoặc bị Cóng), được giảm 25% tiền phạt ở các lá vượt ngưỡng 7 lá (kèm Hoạt Ảnh Nộ 5★).',
  },
  mizuki: {
    id: 'mizuki',
    charName: 'Yumemizuki Mizuki',
    icon: '🍃',
    isPassiveBet: true,
    name: 'Liệu Pháp Mộng Đẹp',
    shortDesc: '[Nội Tại Cược • Không có Kỹ Năng E] Kết thúc mỗi ván bài (dù thắng hay thua), Baku của Mizuki luôn hồi cố định +1.5× Mức cược bàn Xu an ủi (kèm Hoạt Ảnh Nộ 5★).',
  },
};

function buildReactionVfxHtml(rx) {
  if (!rx) return '';
  const cls = rx.cssClass || 'reaction-overloaded';
  let ringColor = '#fbbf24';
  let clashIcons = '⚡ 💥 🔥';
  let svgInner = '';
  let particles = [];

  if (cls === 'reaction-vaporize') {
    ringColor = '#38bdf8';
    clashIcons = '💧 ✕ 🔥';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#38bdf8" stroke-width="5" stroke-dasharray="14 8" />
      <circle cx="200" cy="140" r="64" fill="none" stroke="#fb923c" stroke-width="4" />
      <path d="M120,190 Q160,80 200,140 T280,90" fill="none" stroke="#bae6fd" stroke-width="6" stroke-linecap="round"/>
      <path d="M130,95 Q200,185 275,105" fill="none" stroke="#fdba74" stroke-width="5" stroke-linecap="round"/>
    `;
    particles = ['💧', '🔥', '💨', '🌊', '🔥', '💨', '💧', '✨'];
  } else if (cls === 'reaction-melt') {
    ringColor = '#67e8f9';
    clashIcons = '❄️ ✕ 🔥';
    svgInner = `
      <polygon points="200,32 230,105 308,140 230,175 200,248 170,175 92,140 170,105" fill="none" stroke="#67e8f9" stroke-width="4"/>
      <polygon points="140,65 200,115 260,65 225,140 260,215 200,165 140,215 175,140" fill="none" stroke="#f87171" stroke-width="4"/>
    `;
    particles = ['❄️', '🔥', '🧊', '💥', '❄️', '🔥', '✨', '🌡️'];
  } else if (cls === 'reaction-overloaded') {
    ringColor = '#e879f9';
    clashIcons = '⚡ ✕ 🔥';
    svgInner = `
      <polyline points="70,140 145,105 135,145 215,85 200,145 285,105 335,140" fill="none" stroke="#fde047" stroke-width="6"/>
      <polyline points="110,55 180,125 165,155 245,135 295,220" fill="none" stroke="#f43f5e" stroke-width="5"/>
      <circle cx="200" cy="140" r="78" fill="none" stroke="#c084fc" stroke-width="5" stroke-dasharray="10 6"/>
    `;
    particles = ['⚡', '💥', '🔥', '⚡', '🧨', '🔥', '💥', '✨'];
  } else if (cls === 'reaction-electrocharged') {
    ringColor = '#a855f7';
    clashIcons = '⚡ ✕ 💧';
    svgInner = `
      <polyline points="65,120 135,155 155,105 215,165 245,110 330,145" fill="none" stroke="#c084fc" stroke-width="5"/>
      <polyline points="85,175 155,120 190,168 255,115 315,165" fill="none" stroke="#38bdf8" stroke-width="5"/>
      <circle cx="200" cy="140" r="82" fill="none" stroke="#7dd3fc" stroke-width="3.5" stroke-dasharray="12 8"/>
    `;
    particles = ['⚡', '💧', '⚡', '🌊', '⚡', '💧', '✨', '🫧'];
  } else if (cls === 'reaction-frozen') {
    ringColor = '#bae6fd';
    clashIcons = '🧊 ✕ ❄️';
    svgInner = `
      <polygon points="200,24 222,110 310,140 222,170 200,256 178,170 90,140 178,110" fill="rgba(186,230,253,0.22)" stroke="#e0f2fe" stroke-width="4.5"/>
      <line x1="115" y1="65" x2="285" y2="215" stroke="#7dd3fc" stroke-width="4"/>
      <line x1="285" y1="65" x2="115" y2="215" stroke="#7dd3fc" stroke-width="4"/>
    `;
    particles = ['🧊', '❄️', '💎', '❄️', '🧊', '❄️', '✨', '🌨️'];
  } else if (cls === 'reaction-superconduct') {
    ringColor = '#818cf8';
    clashIcons = '❄️ ✕ ⚡';
    svgInner = `
      <circle cx="200" cy="140" r="85" fill="none" stroke="#a5f3fc" stroke-width="4.5" stroke-dasharray="16 6"/>
      <polyline points="85,140 155,95 175,155 235,95 315,140" fill="none" stroke="#c084fc" stroke-width="5"/>
    `;
    particles = ['❄️', '⚡', '🧊', '⚡', '❄️', '💜', '✨', '⚡'];
  } else {
    ringColor = '#facc15';
    clashIcons = '💎 ✕ 🌿';
    svgInner = `
      <polygon points="200,36 278,140 200,244 122,140" fill="none" stroke="#fde047" stroke-width="4.5"/>
      <circle cx="200" cy="140" r="76" fill="none" stroke="#4ade80" stroke-width="4" stroke-dasharray="10 6"/>
    `;
    particles = ['💎', '🌿', '⚡', '🔥', '✨', '💎', '🌿', '💥'];
  }

  const vectors = [
    { tx: '-135px', ty: '-85px', rot: '-35deg' },
    { tx: '135px', ty: '-85px', rot: '35deg' },
    { tx: '-155px', ty: '15px', rot: '-60deg' },
    { tx: '155px', ty: '15px', rot: '60deg' },
    { tx: '-110px', ty: '95px', rot: '-25deg' },
    { tx: '110px', ty: '95px', rot: '25deg' },
    { tx: '0px', ty: '-115px', rot: '15deg' },
    { tx: '0px', ty: '110px', rot: '-15deg' },
  ];

  const particlesHtml = particles
    .map((emo, i) => {
      const v = vectors[i % vectors.length];
      return `<span class="rx-particle" style="--tx:${v.tx};--ty:${v.ty};--rot:${v.rot};color:${ringColor};">${emo}</span>`;
    })
    .join('');

  return `
    <div class="reaction-vfx-stage ${cls}">
      <div class="rx-ring-outer" style="color:${ringColor};"></div>
      <div class="rx-ring-inner" style="border-color:${ringColor};"></div>
      <svg class="rx-svg-layer" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
      ${particlesHtml}
      <div class="rx-element-clash-icons">${clashIcons}</div>
    </div>
  `;
}

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

// Web Audio Synthesizer + Auto-Switching Genshin Impact Soundtrack BGM Player
const ANIME_BGM_TRACKS = [
  {
    id: 'inazuma',
    label: 'Inazuma 🌸',
    audioUrl: 'bgm_inazuma.ogg',
    stepMs: 420,
    melody: [
      440.0, 523.25, 659.25, 587.33, 523.25, 659.25, 880.0, 783.99,
      698.46, 659.25, 523.25, 440.0, 523.25, 587.33, 659.25, 523.25,
      523.25, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25,
      587.33, 659.25, 493.88, 392.0, 440.0, 523.25, 659.25, 440.0,
    ],
    bass: [220.0, 220.0, 174.61, 174.61, 261.63, 261.63, 196.0, 164.81],
  },
  {
    id: 'tavern',
    label: 'Quán Rượu 🃏',
    audioUrl: 'bgm_tavern.ogg',
    stepMs: 400,
    melody: [
      587.33, 698.46, 880.0, 783.99, 698.46, 659.25, 587.33, 440.0,
      466.16, 587.33, 698.46, 880.0, 783.99, 698.46, 659.25, 587.33,
      523.25, 698.46, 880.0, 1046.5, 880.0, 698.46, 659.25, 523.25,
      554.37, 659.25, 880.0, 783.99, 698.46, 659.25, 587.33, 587.33,
    ],
    bass: [293.66, 293.66, 233.08, 233.08, 174.61, 174.61, 220.0, 220.0],
  },
  {
    id: 'raiden',
    label: 'Lôi Thần ⚡',
    audioUrl: 'bgm_raiden.ogg',
    stepMs: 440,
    melody: [
      523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 659.25, 523.25,
      587.33, 783.99, 987.77, 1174.66, 987.77, 783.99, 659.25, 587.33,
      659.25, 783.99, 987.77, 783.99, 659.25, 523.25, 493.88, 392.0,
      440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 523.25, 440.0,
    ],
    bass: [174.61, 174.61, 196.0, 196.0, 164.81, 164.81, 220.0, 220.0],
  },
  {
    id: 'mondstadt',
    label: 'Mondstadt 🍃',
    audioUrl: 'bgm_mondstadt.ogg',
    stepMs: 410,
    melody: [
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0,
      440.0, 523.25, 659.25, 587.33, 523.25, 493.88, 440.0, 392.0,
      523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 523.25, 493.88, 392.0, 523.25, 523.25,
    ],
    bass: [261.63, 261.63, 220.0, 220.0, 174.61, 174.61, 196.0, 196.0],
  },
  {
    id: 'liyue',
    label: 'Liyue 🏮',
    audioUrl: 'bgm_liyue.ogg',
    stepMs: 430,
    melody: [
      440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25,
      440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33, 440.0,
      523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 659.25,
      587.33, 523.25, 440.0, 392.0, 440.0, 523.25, 587.33, 440.0,
    ],
    bass: [220.0, 220.0, 196.0, 196.0, 174.61, 174.61, 220.0, 220.0],
  },
];

class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.bgmEnabled = true;
    this.bgmAutoCycle = true; // Mặc định BẬT Auto Đổi Nhạc!
    this.bgmTrackIndex = 0;
    this.bgmStep = 0;
    this.bgmTimer = null;
    this.bgmPausedForAd = false;
    this.bgmDucked = false;
    this.bgmPlaying = false;
    this.onTrackChanged = null;
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

  getBgmAudioElement() {
    return document.getElementById('bgm-audio');
  }

  startBGM() {
    if (!this.bgmEnabled || !this.enabled || this.bgmPausedForAd) return;
    this.init();
    const track = ANIME_BGM_TRACKS[this.bgmTrackIndex] || ANIME_BGM_TRACKS[0];
    const audioEl = this.getBgmAudioElement();
    const isFileProtocol = window.location.protocol === 'file:';

    if (audioEl && !isFileProtocol && track.audioUrl) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;

      const wantedSrc = track.audioUrl;
      if (!audioEl.getAttribute('data-track') || audioEl.getAttribute('data-track') !== wantedSrc) {
        audioEl.setAttribute('data-track', wantedSrc);
        audioEl.src = wantedSrc;
      }
      audioEl.loop = !this.bgmAutoCycle;
      audioEl.volume = this.bgmDucked ? 0.08 : 0.34;
      audioEl.onended = () => {
        if (this.bgmAutoCycle && this.bgmEnabled && this.enabled && !this.bgmPausedForAd) {
          this.advanceBGMAuto();
        }
      };
      audioEl.onerror = () => {
        this.startSynthBGM();
      };

      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            this.bgmPlaying = true;
          })
          .catch(() => {
            this.bgmPlaying = false;
          });
      }
      return;
    }

    this.startSynthBGM();
  }

  startSynthBGM() {
    if (!this.bgmEnabled || !this.enabled || this.bgmPausedForAd) return;
    this.init();
    if (this.bgmTimer) return;
    this.bgmPlaying = true;
    const tick = () => {
      if (!this.bgmEnabled || !this.enabled || this.bgmPausedForAd) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
        this.bgmPlaying = false;
        return;
      }
      const track = ANIME_BGM_TRACKS[this.bgmTrackIndex] || ANIME_BGM_TRACKS[0];
      const step = this.bgmStep % track.melody.length;
      const noteFreq = track.melody[step];
      const bassFreq = track.bass[Math.floor(step / 4) % track.bass.length];
      const gainScale = this.bgmDucked ? 0.22 : 1.0;

      if (noteFreq) {
        this.playHarpNote(noteFreq, 0.95, 0.042 * gainScale);
        if (step % 2 === 0) {
          this.playHarpNote(noteFreq * 2, 0.55, 0.014 * gainScale);
        }
      }
      if (step % 4 === 0 && bassFreq) {
        this.playHarpNote(bassFreq, 1.55, 0.028 * gainScale);
        this.playHarpNote(bassFreq * 1.5, 1.35, 0.018 * gainScale);
      }

      this.bgmStep++;
      // Tự động đổi sang bài tiếp theo sau mỗi 2 vòng giai điệu nếu bật Auto Đổi Nhạc
      if (this.bgmAutoCycle && this.bgmStep >= track.melody.length * 2) {
        this.bgmStep = 0;
        this.bgmTrackIndex = (this.bgmTrackIndex + 1) % ANIME_BGM_TRACKS.length;
        if (typeof this.onTrackChanged === 'function') this.onTrackChanged();
      }
      this.bgmTimer = setTimeout(tick, track.stepMs || 420);
    };
    this.bgmTimer = setTimeout(tick, 120);
  }

  stopBGM() {
    clearTimeout(this.bgmTimer);
    this.bgmTimer = null;
    this.bgmPlaying = false;
    const audioEl = this.getBgmAudioElement();
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (_) {}
    }
  }

  duckBGM(ducked) {
    this.bgmDucked = !!ducked;
    const audioEl = this.getBgmAudioElement();
    if (audioEl && !audioEl.paused) {
      audioEl.volume = this.bgmDucked ? 0.06 : 0.34;
    }
  }

  advanceBGMAuto() {
    if (!this.bgmEnabled || !this.enabled || !this.bgmAutoCycle) return;
    this.bgmTrackIndex = (this.bgmTrackIndex + 1) % ANIME_BGM_TRACKS.length;
    this.bgmStep = 0;
    const audioEl = this.getBgmAudioElement();
    if (audioEl) {
      audioEl.removeAttribute('data-track');
    }
    this.stopBGM();
    this.startBGM();
    if (typeof this.onTrackChanged === 'function') {
      this.onTrackChanged();
    }
  }

  playHarpNote(freq, duration = 0.9, maxGain = 0.04) {
    if (!this.enabled || !this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(3600, freq * 3.2), now);

      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) {}
  }

  cycleBGM() {
    // Đổi bài tiếp theo trong Playlist (luôn bật Auto 🔄), hết 5 bài thì Tắt Nhạc -> Bật lại Auto Bài 1
    const audioEl = this.getBgmAudioElement();
    if (audioEl) audioEl.removeAttribute('data-track');

    if (!this.bgmEnabled) {
      this.bgmEnabled = true;
      this.bgmAutoCycle = true;
      this.bgmTrackIndex = 0;
      this.bgmStep = 0;
      this.startBGM();
    } else if (this.bgmTrackIndex < ANIME_BGM_TRACKS.length - 1) {
      this.bgmTrackIndex++;
      this.bgmStep = 0;
      this.stopBGM();
      this.startBGM();
    } else {
      this.bgmEnabled = false;
      this.stopBGM();
    }
    return this.getBGMLabel();
  }

  getBGMLabel() {
    if (!this.bgmEnabled || !this.enabled) return 'Tắt 🔇';
    const track = ANIME_BGM_TRACKS[this.bgmTrackIndex] || ANIME_BGM_TRACKS[0];
    return `${this.bgmAutoCycle ? 'Auto 🔄: ' : ''}${track.label}`;
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
    // Băng Hoa Xuyên Thấu (Ganyu): Cho phép đánh Sảnh Khuyết thiếu đúng 1 mắt xích ở giữa (VD: 4-5-7-8)
    if (activeGanyuGapStraight) {
      let strictlyIncreasing = true;
      for (let i = 1; i < n; i++) {
        if (sorted[i].rankIndex <= sorted[i - 1].rankIndex) {
          strictlyIncreasing = false;
          break;
        }
      }
      if (strictlyIncreasing && sorted[n - 1].rankIndex - sorted[0].rankIndex === n) {
        return {
          type: COMBO_TYPES.STRAIGHT,
          cards: sorted,
          length: n,
          highCard,
          highValue,
          highRank,
          isGapStraight: true,
          label: `Sảnh Khuyết ${n} lá (${sorted[0].rank}→${highCard.rank}${highCard.suit} 🏹)`,
        };
      }
    }
  }

  return null;
}

function canBeatCombo(candidate, current) {
  if (!candidate) return { ok: false, isChop: false };

  // Pháo Kích Khóa Bài (Navia): Không thể đánh ra các lá bài đang bị khóa trong vòng này
  if (
    activeNaviaLockedCardIds &&
    activeNaviaLockedCardIds.size > 0 &&
    candidate.cards &&
    candidate.cards.some((c) => activeNaviaLockedCardIds.has(c.id))
  ) {
    return {
      ok: false,
      isChop: false,
      reason: '☂️ Pháo Kích Navia: Có lá bài đang bị khóa cứng trong vòng này!',
    };
  }

  // Lục Đạo Độc Tôn (Shenhe): Cấm đánh Đôi, Sám Cô, Sảnh trong vòng hiện tại (chỉ được đánh Bài Lẻ hoặc Hàng chặt Heo)
  if (activeShenheSingleOnly && !candidate.isBomb && candidate.type !== COMBO_TYPES.SINGLE) {
    return {
      ok: false,
      isChop: false,
      reason: '❄️ Lục Đạo Độc Tôn (Shenhe): Vòng này cấm đánh Đôi/Sám/Sảnh, chỉ được đánh Bài Lẻ!',
    };
  }

  if (!current) return { ok: true, isChop: false };

  // Luật Sân Khấu Fontaine (Furina): Cấm đánh Heo lẻ (2 lẻ) chặn bài trong vòng này
  if (activeFurinaReverseSuit && candidate.type === COMBO_TYPES.SINGLE && candidate.highRank === 12) {
    return {
      ok: false,
      isChop: false,
      reason: '💧 Luật Sân Khấu Furina: Cấm đánh Heo lẻ (2) trong vòng này!',
    };
  }

  if (candidate.type === current.type && candidate.length === current.length) {
    let candRank = candidate.highRank;
    let curRank = current.highRank;
    // Thủy Triều Đảo Ngược (Kokomi): Đảo ngược sức mạnh từ 3 đến A (3 mạnh nhất = 11, A yếu nhất = 0; Heo 2 giữ nguyên = 12)
    if (activeKokomiReverseRank && !candidate.isBomb && !current.isBomb) {
      if (candRank < 12) candRank = 11 - candRank;
      if (curRank < 12) curRank = 11 - curRank;
    }
    const candSuit =
      activeFurinaReverseSuit && candidate.highCard
        ? 3 - candidate.highCard.suitIndex
        : candidate.highCard
        ? candidate.highCard.suitIndex
        : 0;
    const curSuit =
      activeFurinaReverseSuit && current.highCard
        ? 3 - current.highCard.suitIndex
        : current.highCard
        ? current.highCard.suitIndex
        : 0;

    const candVal = candRank * 4 + candSuit;
    const curVal = curRank * 4 + curSuit;
    if (candVal > curVal) {
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

  // Cá Mập Đè Khác Loại (Mualani): Dùng bộ nhiều lá hơn (Đôi đè Lẻ, Sám/Sảnh đè Đôi, Sảnh dài đè Sảnh ngắn) có giá trị >= bộ trên bàn
  if (
    activeMualaniCrossBeat &&
    !current.isBomb &&
    current.highRank < 12 &&
    !candidate.isBomb &&
    candidate.length > current.length
  ) {
    let candRank = candidate.highRank;
    let curRank = current.highRank;
    if (activeKokomiReverseRank) {
      if (candRank < 12) candRank = 11 - candRank;
      if (curRank < 12) curRank = 11 - curRank;
    }
    if (candRank >= curRank) {
      return {
        ok: true,
        isChop: false,
      };
    }
  }

  // Không Trung Đạp Kích (Xiao): Dùng 1 Lá Lẻ duy nhất có bậc >= bộ trên bàn để đâm thủng Đôi, Sám Cô hoặc Sảnh!
  if (
    activeXiaoPlungeSingle &&
    !current.isBomb &&
    current.highRank < 12 &&
    current.length >= 2 &&
    candidate.type === COMBO_TYPES.SINGLE
  ) {
    let candRank = candidate.highRank;
    let curRank = current.highRank;
    if (activeKokomiReverseRank) {
      if (candRank < 12) candRank = 11 - candRank;
      if (curRank < 12) curRank = 11 - curRank;
    }
    if (candRank >= curRank) {
      return {
        ok: true,
        isChop: false,
      };
    }
  }

  const targetIsSingle2 = current.type === COMBO_TYPES.SINGLE && current.highRank === 12;
  const targetIsPair2 = current.type === COMBO_TYPES.PAIR && current.highRank === 12;
  const targetIsTriple2 = current.type === COMBO_TYPES.TRIPLE && current.highRank === 12;
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
    if (targetIsSingle2 || targetIsPair2 || targetIsTriple2 || targetIs3Pairs || targetIsQuad) {
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

  // Băng Hoa Xuyên Thấu (Ganyu): Sinh thêm các bộ Sảnh Khuyết (thiếu 1 mắt xích ở giữa)
  if (activeGanyuGapStraight) {
    const pickCardForRank = (r) => {
      if (preferredCard && preferredCard.rankIndex === r) return preferredCard;
      return byRank[r][0];
    };
    const distinctRanks = [];
    for (let r = 0; r <= 11; r++) {
      if (byRank[r].length > 0) distinctRanks.push(r);
    }
    for (let i = 0; i < distinctRanks.length; i++) {
      for (let j = i + 2; j < distinctRanks.length; j++) {
        const len = j - i + 1;
        const span = distinctRanks[j] - distinctRanks[i];
        if (len >= 3 && span === len) {
          const gapCards = [];
          for (let k = i; k <= j; k++) {
            const rk = distinctRanks[k];
            gapCards.push(k === j ? byRank[rk][byRank[rk].length - 1] : pickCardForRank(rk));
          }
          const gc = classifyCombo(gapCards);
          if (gc) combos.push(gc);
        }
      }
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
  const usableHand =
    activeNaviaLockedCardIds && activeNaviaLockedCardIds.size > 0
      ? hand.filter((c) => !activeNaviaLockedCardIds.has(c.id))
      : hand;
  const all = generateAllCombosFromHand(usableHand, preferredCard);
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
      { id: 0, name: this.savedPlayerName || this.currentAccountUsername || 'Nhà Lữ Hành', avatar: this.equippedAvatar, cardSkin: this.equippedSkin, chopBurst: this.equippedChopBurst, winBurst: this.equippedWinBurst, activeChar: this.equippedActiveChar || 'raiden', skillUsed: false, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
      { id: 1, name: 'Bot Furina', avatar: BOT_ANIME_AVATARS[1], cardSkin: 'furina', chopBurst: 'furina', winBurst: 'furina', activeChar: 'furina', skillUsed: false, isBot: true, active: this.soloPlayerCount >= 3, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Bot Raiden Shogun', avatar: BOT_ANIME_AVATARS[2], cardSkin: 'raiden', chopBurst: 'raiden', winBurst: 'raiden', activeChar: 'raiden', skillUsed: false, isBot: true, active: true, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Bot Skirk', avatar: BOT_ANIME_AVATARS[3], cardSkin: 'skirk', chopBurst: 'skirk', winBurst: 'skirk', activeChar: 'skirk', skillUsed: false, isBot: true, active: this.soloPlayerCount === 4, hand: [], coins: botBankroll, passed: false, finishRank: null, clientId: null },
    ];

    // Multiplayer state (Giữ cố định clientId trong localStorage để F5 không bị mất ghế hoặc reset đồ)
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.roomPassword = '';
    this.roomTitle = '';
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
    this.hostClientId = this.myClientId;
    this.hostPeerId = '';
    this.hostClaimEpoch = 1;
    this.roomStateVersion = 1;
    this.lanServerIp = '192.168.85.102';
    this.lanServerPort = 8080;
    this.publicTunnelUrl = '';
    this.pollTimer = null;
    this.lastSyncedVersion = 0;
    this.peer = null;
    this.peerConnections = [];
    this.hostConn = null;
    this.connectedHostPeerId = '';
    this.multiplayerRoomsList = [];
    this.searchedRoomIdFilter = '';
    this.pendingJoinRoomTarget = null;
    this.processedClientEventIds = new Set();
    this.cloudPendingEvents = [];
    this.playerHeartbeats = {};
    this.kickedAfkClientIds = new Set();
    this.afkAutoLeaveTimer = null;
    this.roomsDirRefreshTimer = null;

    this.matchCount = 0;
    this.lastWinnerId = null;
    this.currentTurn = 0;
    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.mustPlay3Spade = false;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;
    this.roundChoppableStack = [];

    // Trạng thái Kỹ Năng Nhân Vật trong vòng hiện tại
    this.raidenElectroMarkOwnerId = null;
    this.raidenSlashMustSingle = false;
    this.furinaReverseSuitRound = false;
    this.yaeForcePlayRound = false;
    this.clorindeDuelPair = null;
    this.ayakaFrozenPlayerId = null;
    this.hutaoTaxOwnerId = null;
    this.eulaNextPlayBoost = false;
    this.mavuikaSelectingCard = false;
    this.yelanRevealedByPlayer = {};
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    this.shenheSingleOnlyRound = false;
    this.ganyuGapStraightTurn = false;
    this.kokomiReverseRankRound = false;
    this.yoimiyaBurnTrashReady = false;
    this.columbinaExtraTurnReady = false;
    this.xiaoPlungeSingleTurn = false;
    activeXiaoPlungeSingle = false;
    this.kinichBombOwnerId = null;
    this.turnDirection = 1;
    this.mualaniCrossBeatTurn = false;

    this.selectedCardIds = new Set();
    this.companionCardIds = new Set();
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.lastSummaryData = null;
    this.lastBurstEffect = null;
    this.lastShownBurstId = 0;
    this.burstTimeout = null;
    this.isBurstPlaying = false;
    this.logsData = [];

    this.sortMode = 'asc';
    this.hintIndex = 0;
    this.botDelay = 850;
    this.speedMode = 1;
    this.isGameOver = false;
    this.inInitialLobby = true;
    this.botTimer = null;
    this.endMatchDelayTimer = null;
    this.queuedNextMatchBots = null;
    this.mavuikaSelectingCard = false;
    this.activeInventoryTab = 'bursts';
    this.inventoryFilter = 'all';
    this.turnTimeLimitSec = 15;
    this.turnRemainingSec = 15;
    this.turnTimerComboSig = '';
    this.turnCountdownInterval = null;

    this.bindDOM();
    sfx.onTrackChanged = () => this.syncBGMButtonsUI();
    this.applyArenaThemeUI();
    this.randomizeBotCharacters(false);
    this.renderSoloPlayerCountUI();
    this.renderBetTiers();
    this.renderLobbyModal();
    this.detectLanInfoAndUrlRoom();
    this.fetchLiveAnimeImages();
    if (!this.loadActiveMatchSnapshot()) {
      this.startNewMatch(true);
    }
    // Đảm bảo khi mới vào game luôn mở ở Sảnh Chờ (#wifi-modal), ẩn Kho Đồ / Cầu Nguyện / Pause Menu / Mode Setup
    ['mode-setup-modal', 'inventory-modal', 'shop-modal', 'pause-modal', 'quests-modal', 'rules-modal', 'account-modal', 'summary-modal'].forEach(
      (id) => document.getElementById(id)?.classList.add('hidden')
    );
    this.modalWifi?.classList.remove('hidden');
    if (!this.currentAccountUsername) {
      clearTimeout(this.botTimer);
      clearInterval(this.turnCountdownInterval);
      this.openAccountModal('register');
    }
    this.setupCrossDeviceCloudSync();
    if (this.dailyRecoveredOnLoad) {
      this.addLog(
        `🌅 <strong>Quà Hồi Phục Hàng Ngày:</strong> Tài khoản của bạn vừa được hồi <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> cho ngày mới!`,
        'log-win'
      );
    }
  }

  fetchLiveAnimeImages() {
    // Tải trước (Preload) Poster Fanart & Video Nộ của nhân vật đang dùng để phát tức thì
    try {
      const bChop = getBurstMeta(this.equippedChopBurst);
      const bWin = getBurstMeta(this.equippedWinBurst);
      const preloadList = [
        bChop ? bChop.posterUrl : '',
        bWin ? bWin.posterUrl : '',
        getCardSkinMeta(this.equippedSkin).imgUrl,
        ...Object.values(BOT_ANIME_AVATARS),
      ].filter(Boolean);
      preloadList.forEach((url) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      });
      this.preloadActiveBurstVideos();
    } catch (_) {}
  }

  preloadActiveBurstVideos() {
    try {
      if (!this.preloadedVideoSet) this.preloadedVideoSet = new Set();
      if (!this.burstBlobUrls) this.burstBlobUrls = new Map();
      const charIds = new Set();
      if (this.equippedActiveChar && this.equippedActiveChar !== 'none') charIds.add(this.equippedActiveChar);
      if (this.equippedChopBurst && this.equippedChopBurst !== 'none') charIds.add(this.equippedChopBurst);
      if (this.equippedWinBurst && this.equippedWinBurst !== 'none') charIds.add(this.equippedWinBurst);
      if (Array.isArray(this.players)) {
        this.players.forEach((p) => {
          const cid = this.getPlayerActiveCharId(p);
          if (cid && cid !== 'none') charIds.add(cid);
        });
      }
      if (this.queuedNextMatchBots) {
        [1, 2, 3].forEach((idx) => {
          const cid = this.queuedNextMatchBots[idx]?.id;
          if (cid && cid !== 'none') charIds.add(cid);
        });
      }
      const cacheMediaToBlob = (url) => {
        if (!url || this.preloadedVideoSet.has(url)) return;
        this.preloadedVideoSet.add(url);
        fetch(url, { cache: 'force-cache' })
          .then((res) => (res.ok ? res.blob() : null))
          .then((blob) => {
            if (blob && blob.size > 0) {
              this.burstBlobUrls.set(url, URL.createObjectURL(blob));
            }
          })
          .catch(() => {});
      };
      charIds.forEach((cid) => {
        const meta = getBurstMeta(cid);
        if (meta) {
          cacheMediaToBlob(meta.mp4Url);
          cacheMediaToBlob(meta.audioUrl);
        }
      });
    } catch (_) {}
  }

  triggerGenshinBurst(burstId, detailText, onDoneCallback = null, lockGameplay = false) {
    if (!burstId || burstId === 'none') {
      if (onDoneCallback) {
        onDoneCallback();
      }
      return;
    }

    const overlay = document.getElementById('genshin-burst-overlay');
    const burstMeta = getBurstMeta(burstId);
    if (!overlay || !burstMeta) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    // Luôn tạm khóa botTimer trong lúc đang phát Hoạt Ảnh Nộ để bàn bài không render đè gây giật lag video
    this.isBurstPlaying = true;
    clearTimeout(this.botTimer);

    const videoEl = document.getElementById('burst-video');
    const audioEl = document.getElementById('burst-audio');
    const chakraEl = document.getElementById('burst-chakra-ring');
    const slashContainer = document.getElementById('burst-slash-container');
    const tagEl = document.getElementById('burst-skill-tag');
    const titleEl = document.getElementById('burst-skill-title');
    const quoteEl = document.getElementById('burst-skill-quote');
    const detailEl = document.getElementById('burst-skill-detail');

    overlay.classList.remove(
      'hidden',
      'theme-raiden',
      'theme-skirk',
      'theme-electro',
      'theme-abyss',
      'theme-pyro',
      'theme-hydro',
      'theme-cryo',
      'theme-geo'
    );
    overlay.classList.add(burstMeta.theme || 'theme-electro');

    // Hạ nhỏ nhạc nền (Ducking) để tiếng hô Nộ & hiệu ứng âm thanh Video nghe rõ 100%
    sfx.duckBGM(true);

    if (burstMeta.sfxType === 'skirk') {
      sfx.skirkBurst();
    } else {
      sfx.raidenBurst();
    }

    clearTimeout(this.burstTimeout);
    let burstFinished = false;
    const finishBurst = () => {
      if (burstFinished) return;
      burstFinished = true;
      clearTimeout(this.burstTimeout);
      if (videoEl) {
        videoEl.onplaying = null;
        videoEl.onloadeddata = null;
        try {
          videoEl.pause();
        } catch (_) {}
      }
      if (audioEl) {
        try {
          audioEl.pause();
        } catch (_) {}
      }
      sfx.duckBGM(false);
      overlay.classList.add('hidden');
      overlay.onclick = null;
      this.isBurstPlaying = false;
      this.updateHumanActionButtons();
      if (onDoneCallback) {
        onDoneCallback();
      } else if (!this.isGameOver && !this.inInitialLobby && this.modalWifi?.classList.contains('hidden')) {
        this.promptCurrentTurn();
      }
    };

    const startDurationCountdown = () => {
      clearTimeout(this.burstTimeout);
      this.burstTimeout = setTimeout(finishBurst, 3400);
    };

    if (videoEl && burstMeta.mp4Url) {
      videoEl.style.display = 'block';
      videoEl.removeAttribute('poster');
      const targetVideoSrc = this.burstBlobUrls?.get(burstMeta.mp4Url) || burstMeta.mp4Url;
      if (videoEl.getAttribute('data-loaded-src') !== targetVideoSrc) {
        videoEl.src = targetVideoSrc;
        videoEl.setAttribute('data-loaded-src', targetVideoSrc);
      }
      videoEl.muted = !sfx.enabled;
      videoEl.volume = 0.95;
      try {
        videoEl.currentTime = 0;
      } catch (_) {}

      videoEl.onplaying = () => {
        videoEl.onplaying = null;
        startDurationCountdown();
      };
      this.burstTimeout = setTimeout(finishBurst, 4400);

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          videoEl.muted = true;
          videoEl.play().catch(() => {
            startDurationCountdown();
          });
        });
      }
    } else {
      startDurationCountdown();
    }

    if (audioEl && burstMeta.audioUrl && sfx.enabled) {
      const targetAudioSrc = this.burstBlobUrls?.get(burstMeta.audioUrl) || burstMeta.audioUrl;
      if (audioEl.getAttribute('data-loaded-src') !== targetAudioSrc) {
        audioEl.src = targetAudioSrc;
        audioEl.setAttribute('data-loaded-src', targetAudioSrc);
      }
      audioEl.muted = false;
      audioEl.volume = 1.0;
      try {
        audioEl.currentTime = 0;
      } catch (_) {}
      audioEl.play().catch(() => {});
    }

    tagEl.textContent = burstMeta.tag;
    titleEl.textContent = burstMeta.title;
    quoteEl.textContent = burstMeta.quote;
    detailEl.textContent = detailText || `💥 Tuyệt Kỹ Nộ: ${burstMeta.name}!`;

    // Chỉ render SVG vào chakraEl & slashContainer 1 lần theo sfxType để không tạo lại DOM mỗi lần tung Nộ
    if (chakraEl.getAttribute('data-sfx-type') !== burstMeta.sfxType) {
      chakraEl.setAttribute('data-sfx-type', burstMeta.sfxType);
      if (burstMeta.sfxType === 'raiden') {
        chakraEl.innerHTML = `
          <svg viewBox="0 0 200 200" width="90%" height="90%">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#e879f9" stroke-width="2.5" stroke-dasharray="10 6"/>
            <circle cx="100" cy="100" r="72" fill="none" stroke="#c084fc" stroke-width="1.5"/>
            <polygon points="100,14 122,78 186,100 122,122 100,186 78,122 14,100 78,78" fill="none" stroke="#f0abfc" stroke-width="2" opacity="0.75"/>
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
      }
    }

    if (burstMeta.sfxType === 'raiden') {
      slashContainer.innerHTML = `
        <div class="raiden-slash-beam"></div>
        <svg class="burst-svg-fx" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <polyline points="0,480 230,380 210,415 490,295 475,325 760,195 1000,90" fill="none" stroke="#ffffff" stroke-width="5"/>
          <polyline points="120,80 340,260 320,290 610,360 890,520" fill="none" stroke="#e879f9" stroke-width="3" opacity="0.85"/>
          <polyline points="680,40 540,240 580,260 410,490" fill="none" stroke="#c084fc" stroke-width="3" opacity="0.8"/>
        </svg>
      `;
    } else {
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

    // Nếu là hoạt ảnh Kỹ Năng E trong trận (lockGameplay = true) thì đợi chạy hết hoạt ảnh, không tự tắt khi bấm nhầm
    overlay.onclick = lockGameplay ? null : finishBurst;
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

  getDefaultDailyQuestsState() {
    const obj = {};
    DAILY_QUESTS_CONFIG.forEach((q) => {
      obj[q.id] = { progress: 0, claimed: false };
    });
    return obj;
  }

  // ============================================================================
  // HỆ THỐNG TÀI KHOẢN & MẬT KHẨU (GIỮ NGUYÊN 100% DỮ LIỆU ĐANG CHƠI)
  // ============================================================================
  hashAccountPassword(password, usernameKey = '') {
    const str = `tlmn_salt_v1:${usernameKey}:${String(password || '')}`;
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  loadAccountsDb() {
    try {
      const raw = localStorage.getItem('tlmn_accounts_db_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return {};
  }

  saveAccountsDb(db) {
    try {
      localStorage.setItem('tlmn_accounts_db_v1', JSON.stringify(db || {}));
    } catch (_) {}
  }

  resolveCleanPlayerName(rawName, usernameKey = this.currentAccountUsername) {
    const trimmed = String(rawName || '').trim();
    const uKey = String(usernameKey || '').trim();
    if (trimmed === 'Thắng' && uKey && !uKey.toLowerCase().includes('thang')) {
      return uKey;
    }
    if (trimmed === 'Thắng' && !uKey) {
      return 'Nhà Lữ Hành';
    }
    if (trimmed) return trimmed;
    return uKey || 'Nhà Lữ Hành';
  }

  applyProfileDataObject(data, today = this.getTodayKey()) {
    if (!data || typeof data !== 'object') return;
    this.applyProfileDataObject = this.applyProfileDataObject.bind(this);
    const incomingRev = Number(data.syncRev) || 0;
    const currentRev = Number(this.profileSyncRev) || 0;
    const incomingTime = Number(data.updatedAtMs) || 0;
    const currentTime = Number(this.profileUpdatedAtMs) || 0;
    const isNewerOrEqual =
      incomingRev > currentRev ||
      (incomingRev === currentRev && incomingTime >= currentTime);
    if (incomingRev > currentRev) {
      this.profileSyncRev = incomingRev;
    }
    if (incomingTime > currentTime) {
      this.profileUpdatedAtMs = incomingTime;
    }

    if (typeof data.coins === 'number' && isNewerOrEqual) {
      this.savedCoins = data.coins;
      if (this.players) {
        const me = this.getLocalPlayer();
        const isTrulyMe =
          !this.isMultiplayer ||
          (me && me.clientId === this.myClientId) ||
          (this.isHost && this.mySeatId === 0);
        if (me && isTrulyMe) {
          me.coins = data.coins;
        }
      }
    }
    if (data.playerName && isNewerOrEqual) {
      this.savedPlayerName = this.resolveCleanPlayerName(data.playerName, data.accountUsername || this.currentAccountUsername);
    }
    if (typeof data.betPerCard === 'number' && data.betPerCard >= 20 && isNewerOrEqual) {
      this.savedBetPerCard = data.betPerCard;
    }
    if ([2, 3, 4].includes(Number(data.soloPlayerCount)) && isNewerOrEqual) {
      this.savedSoloPlayerCount = Number(data.soloPlayerCount);
    }
    if (data.arenaTheme && isNewerOrEqual) {
      this.arenaTheme = data.arenaTheme;
    }
    if (typeof data.autoRandomizeBots === 'boolean' && isNewerOrEqual) {
      this.autoRandomizeBots = data.autoRandomizeBots;
    }
    if (typeof data.gachaPity5 === 'number' && isNewerOrEqual) this.gachaPity5 = Math.max(0, Math.min(89, data.gachaPity5));
    if (typeof data.gachaPity4 === 'number' && isNewerOrEqual) this.gachaPity4 = Math.max(0, Math.min(9, data.gachaPity4));
    if (typeof data.gachaGuaranteed5 === 'boolean' && isNewerOrEqual) this.gachaGuaranteed5 = data.gachaGuaranteed5;
    if (typeof data.gachaGuaranteed4 === 'boolean' && isNewerOrEqual) this.gachaGuaranteed4 = data.gachaGuaranteed4;
    if (data.selectedBannerBurstId && GENSHIN_BURSTS.some((b) => b.id === data.selectedBannerBurstId) && isNewerOrEqual) {
      this.selectedBannerBurstId = data.selectedBannerBurstId;
    }
    if (typeof data.totalWishes === 'number') this.totalWishes = Math.max(this.totalWishes || 0, data.totalWishes);
    if (Array.isArray(data.gachaHistory) && data.gachaHistory.length >= this.gachaHistory.length) {
      this.gachaHistory = data.gachaHistory.slice(0, 300);
    }
    if (Array.isArray(data.unlockedSkins)) {
      data.unlockedSkins.forEach((id) => {
        if (ANIME_CARD_SKINS.some((s) => s.id === id)) {
          this.unlockedSkins.add(id);
        }
      });
    }
    if (data.equippedSkin && this.unlockedSkins.has(data.equippedSkin)) {
      if (isNewerOrEqual || this.equippedSkin === 'classic') {
        if (!(data.equippedSkin === 'classic' && this.equippedSkin !== 'classic' && incomingTime === 0)) {
          this.equippedSkin = data.equippedSkin;
        }
      }
    }
    if (Array.isArray(data.unlockedAvatars)) {
      data.unlockedAvatars.forEach((id) => {
        if (ANIME_AVATARS.some((a) => a.id === id)) {
          this.unlockedAvatars.add(id);
        }
      });
    }
    if (data.equippedAvatar && this.unlockedAvatars.has(data.equippedAvatar)) {
      if (isNewerOrEqual || this.equippedAvatar === 'default_player') {
        if (!(data.equippedAvatar === 'default_player' && this.equippedAvatar !== 'default_player' && incomingTime === 0)) {
          this.equippedAvatar = data.equippedAvatar;
        }
      }
    }
    if (Array.isArray(data.unlockedBursts)) {
      data.unlockedBursts.forEach((id) => {
        if (GENSHIN_BURSTS.some((b) => b.id === id)) {
          this.unlockedBursts.add(id);
        }
      });
    }
    if (isNewerOrEqual || !this.equippedActiveChar || this.equippedActiveChar === 'none') {
      if (data.equippedChopBurst && this.unlockedBursts.has(data.equippedChopBurst)) {
        this.equippedChopBurst = data.equippedChopBurst;
      }
      if (data.equippedWinBurst && this.unlockedBursts.has(data.equippedWinBurst)) {
        this.equippedWinBurst = data.equippedWinBurst;
      }
      if (data.equippedActiveChar && this.unlockedBursts.has(data.equippedActiveChar)) {
        this.equippedActiveChar = data.equippedActiveChar;
      } else if (this.equippedChopBurst && this.unlockedBursts.has(this.equippedChopBurst)) {
        this.equippedActiveChar = this.equippedChopBurst;
      } else if (this.equippedWinBurst && this.unlockedBursts.has(this.equippedWinBurst)) {
        this.equippedActiveChar = this.equippedWinBurst;
      } else if (this.unlockedBursts.size > 0) {
        this.equippedActiveChar = Array.from(this.unlockedBursts)[0];
      } else {
        this.equippedActiveChar = 'none';
      }
      this.equippedChopBurst = this.equippedActiveChar || 'none';
      this.equippedWinBurst = this.equippedActiveChar || 'none';
    }
    if (data.lastDailyDate) this.lastDailyDate = data.lastDailyDate;
    if (typeof data.dailyReliefUsed === 'number') this.dailyReliefUsed = data.dailyReliefUsed;
    if (data.dailyQuestsDate === today && data.dailyQuestsState && typeof data.dailyQuestsState === 'object') {
      this.dailyQuestsDate = today;
      DAILY_QUESTS_CONFIG.forEach((q) => {
        const savedQ = data.dailyQuestsState[q.id];
        if (savedQ && typeof savedQ === 'object') {
          const cur = this.dailyQuestsState[q.id];
          cur.progress = Math.min(q.target, Math.max(cur.progress || 0, Number(savedQ.progress) || 0));
          cur.claimed = !!(cur.claimed || savedQ.claimed);
        }
      });
    }
  }

  resetProfileMemoryToDefaults() {
    const today = this.getTodayKey();
    this.savedCoins = INITIAL_COINS;
    this.savedPlayerName = 'Nhà Lữ Hành';
    this.savedBetPerCard = 100;
    this.savedSoloPlayerCount = 4;
    this.unlockedSkins = new Set(['classic']);
    this.equippedSkin = 'classic';
    this.unlockedAvatars = new Set(['default_player']);
    this.equippedAvatar = 'default_player';
    this.unlockedBursts = new Set();
    this.equippedActiveChar = 'none';
    this.equippedChopBurst = 'none';
    this.equippedWinBurst = 'none';
    this.gachaPity5 = 0;
    this.gachaPity4 = 0;
    this.gachaGuaranteed5 = false;
    this.gachaGuaranteed4 = false;
    this.selectedBannerBurstId = 'raiden';
    this.totalWishes = 0;
    this.gachaHistory = [];
    this.gachaHistoryFilter = 'all';
    this.arenaTheme = 'inazuma';
    this.autoRandomizeBots = true;
    this.lastDailyDate = today;
    this.dailyReliefUsed = 0;
    this.dailyRecoveredOnLoad = false;
    this.dailyQuestsDate = today;
    this.dailyQuestsState = this.getDefaultDailyQuestsState();
    this.profileUpdatedAtMs = 0;
    this.profileSyncRev = 0;
  }

  loadShopProfile() {
    const today = this.getTodayKey();
    this.resetProfileMemoryToDefaults();
    this.currentAccountUsername = '';
    this.accountModalTab = 'register';

    try {
      const activeUser = (localStorage.getItem('tlmn_active_account_v1') || '').trim().toLowerCase();
      const accountsDb = this.loadAccountsDb();
      const candidates = [];

      const backups = this.readBackupPayloads();
      backups.forEach((data, idx) => {
        if (!data || typeof data !== 'object') return;
        // Nếu đang đăng nhập tài khoản cụ thể, CHỈ nhận backup có đúng accountUsername === activeUser (không lấy backup khách của máy khác!)
        // Nếu đã Đăng Xuất (activeUser === ''), bỏ qua các backup có gắn accountUsername của tài khoản cũ!
        if (
          (activeUser && data.accountUsername !== activeUser) ||
          (!activeUser && data.accountUsername)
        ) {
          return;
        }
        const fallbackTime = idx === 1 ? 0 : 1;
        candidates.push({
          ...data,
          updatedAtMs: Number(data.updatedAtMs) || fallbackTime,
        });
      });

      if (activeUser && accountsDb[activeUser]) {
        this.currentAccountUsername = activeUser;
        if (accountsDb[activeUser].profile) {
          candidates.push({
            ...accountsDb[activeUser].profile,
            updatedAtMs:
              Number(accountsDb[activeUser].profile.updatedAtMs) ||
              Number(accountsDb[activeUser].updatedAtMs) ||
              2,
          });
        }
      } else if (activeUser) {
        this.currentAccountUsername = activeUser;
      }

      // Sắp xếp từ cũ đến mới để bản lưu mới nhất (localStorage / Account DB) luôn quyết định trang bị cuối cùng!
      candidates.sort((a, b) => (Number(a.updatedAtMs) || 0) - (Number(b.updatedAtMs) || 0));
      let maxStoredUpdatedAtMs = 0;
      candidates.forEach((data) => {
        const t = Number(data.updatedAtMs) || 0;
        if (t > maxStoredUpdatedAtMs) maxStoredUpdatedAtMs = t;
        this.applyProfileDataObject(data, today);
      });
      this.profileUpdatedAtMs = maxStoredUpdatedAtMs;

      // Nếu bước sang ngày mới: tự động reset 4 Nhiệm Vụ Hàng Ngày & lượt cứu trợ
      let dayChanged = false;
      if (this.lastDailyDate !== today) {
        dayChanged = true;
        this.lastDailyDate = today;
        this.dailyReliefUsed = 0;
        this.dailyQuestsDate = today;
        this.dailyQuestsState = this.getDefaultDailyQuestsState();
        if (this.savedCoins < INITIAL_COINS) {
          this.savedCoins = Math.min(INITIAL_COINS, this.savedCoins + DAILY_RECOVERY_COINS);
          this.dailyRecoveredOnLoad = true;
        }
      }

      // QUAN TRỌNG: Khi vừa mở trang (Boot), KHÔNG tự ý gán Date.now() đè lên updatedAtMs cũ của máy này,
      // để khi kéo dữ liệu từ Đám Mây về sẽ lấy đúng dữ liệu mới nhất từ máy kia!
      this.saveShopProfile({ bumpTimestamp: dayChanged && !this.currentAccountUsername, syncCloud: false });
      setTimeout(() => this.syncExistingAccountsToCloudOnBoot(), 10);
    } catch (_) {}
  }

  // ============================================================================
  // ĐỒNG BỘ TÀI KHOẢN ĐÁM MÂY TỰ ĐỘNG (MULTI-CLOUD REALTIME ACCOUNT SYNC)
  // Đăng nhập bằng Tên Tài Khoản + Mật Khẩu trên BẤT KỲ MÁY / ĐIỆN THOẠI NÀO!
  // 1 Tài Khoản trên 2 Máy là 1 Tài Khoản Duy Nhất đồng bộ 2 chiều thời gian thực!
  // ============================================================================
  getCloudSafeUserKey(usernameKey) {
    return String(usernameKey || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
  }

  packCloudAccountV2(accObj) {
    if (!accObj || !accObj.username) return '';
    const p = accObj.profile || {};
    const passHash = String(accObj.passwordHash || '0').replace(/[^a-zA-Z0-9]/g, '');
    const coins36 = Math.max(0, Math.round(Number(p.coins ?? INITIAL_COINS))).toString(36);

    let bMask = 0n;
    const uBursts = new Set(Array.isArray(p.unlockedBursts) ? p.unlockedBursts : []);
    GENSHIN_BURSTS.forEach((b, idx) => {
      if (uBursts.has(b.id)) bMask |= 1n << BigInt(idx);
    });
    const bursts36 = bMask.toString(36);

    let sMask = 0n;
    const uSkins = new Set(Array.isArray(p.unlockedSkins) ? p.unlockedSkins : ['classic']);
    ANIME_CARD_SKINS.forEach((s, idx) => {
      if (uSkins.has(s.id)) sMask |= 1n << BigInt(idx);
    });
    const skins36 = sMask.toString(36);

    let aMask = 0n;
    const uAvatars = new Set(Array.isArray(p.unlockedAvatars) ? p.unlockedAvatars : ['default_player']);
    ANIME_AVATARS.forEach((a, idx) => {
      if (uAvatars.has(a.id)) aMask |= 1n << BigInt(idx);
    });
    const avatars36 = aMask.toString(36);

    const skinIdx = Math.max(0, ANIME_CARD_SKINS.findIndex((s) => s.id === p.equippedSkin));
    const avIdx = Math.max(0, ANIME_AVATARS.findIndex((a) => a.id === p.equippedAvatar));
    const charIdx = GENSHIN_BURSTS.findIndex((b) => b.id === p.equippedActiveChar);
    const upIdx = Math.max(0, GENSHIN_BURSTS.findIndex((b) => b.id === p.selectedBannerBurstId));
    const themes = ['inazuma', 'fontaine', 'abyss', 'natlan', 'cryo'];
    const themeIdx = Math.max(0, themes.indexOf(p.arenaTheme));
    const equipPack = `${skinIdx}_${avIdx}_${charIdx < 0 ? 'n' : charIdx}_${upIdx}_${themeIdx}`;

    const p5 = Math.max(0, Number(p.gachaPity5) || 0).toString(36);
    const p4 = Math.max(0, Number(p.gachaPity4) || 0).toString(36);
    const g5 = p.gachaGuaranteed5 ? 1 : 0;
    const g4 = p.gachaGuaranteed4 ? 1 : 0;
    const tw = Math.max(0, Number(p.totalWishes) || 0).toString(36);
    const pityPack = `${p5}_${p4}_${g5}_${g4}_${tw}`;

    const qDate = String(p.dailyQuestsDate || this.getTodayKey()).replace(/[^0-9]/g, '').slice(-6) || '0';
    const qParts = [qDate];
    DAILY_QUESTS_CONFIG.forEach((q) => {
      const sq = p.dailyQuestsState?.[q.id];
      qParts.push(Math.min(99, Math.max(0, Number(sq?.progress) || 0)));
      qParts.push(sq?.claimed ? 1 : 0);
    });
    const questsPack = qParts.join('_');

    const dispName = this.resolveCleanPlayerName(accObj.displayName || p.playerName, accObj.username).slice(0, 14);
    let nameHex = '4e67756f6943686f69';
    try {
      nameHex =
        Array.from(new TextEncoder().encode(dispName))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('') || '4e67756f6943686f69';
    } catch (_) {}

    const updatedMs36 = Math.max(1, Math.round(Number(accObj.updatedAtMs) || Date.now())).toString(36);
    const rev36 = Math.max(1, Math.round(Number(accObj.syncRev || p.syncRev || 1))).toString(36);
    return `v2-${passHash}-${coins36}-${bursts36}-${skins36}-${avatars36}-${equipPack}-${pityPack}-${questsPack}-${nameHex}-${updatedMs36}-${rev36}`;
  }

  unpackCloudAccountV2(usernameKey, packedStr) {
    if (!packedStr || typeof packedStr !== 'string' || (!packedStr.startsWith('v2-') && !packedStr.startsWith('v1-'))) return null;
    try {
      const parts = packedStr.split('-');
      if (parts.length < 11) return null;
      const [verTag, passHash, coins36, bursts36, skins36, avatars36, equipPack, pityPack, questsPack, nameHex, updatedSec36, rev36] = parts;

      const coins = parseInt(coins36, 36);
      const safeCoins = Number.isFinite(coins) ? coins : INITIAL_COINS;
      const parseBase36BigInt = (str) => {
        let res = 0n;
        const clean = String(str || '0').toLowerCase();
        for (let i = 0; i < clean.length; i++) {
          const digit = parseInt(clean[i], 36);
          if (!Number.isNaN(digit)) res = res * 36n + BigInt(digit);
        }
        return res;
      };
      const bMask = parseBase36BigInt(bursts36);
      const sMask = parseBase36BigInt(skins36);
      const aMask = parseBase36BigInt(avatars36);

      const unlockedBursts = [];
      GENSHIN_BURSTS.forEach((b, idx) => {
        if ((bMask & (1n << BigInt(idx))) !== 0n) unlockedBursts.push(b.id);
      });

      const unlockedSkins = ['classic'];
      ANIME_CARD_SKINS.forEach((s, idx) => {
        if ((sMask & (1n << BigInt(idx))) !== 0n && !unlockedSkins.includes(s.id)) unlockedSkins.push(s.id);
      });

      const unlockedAvatars = ['default_player'];
      ANIME_AVATARS.forEach((a, idx) => {
        if ((aMask & (1n << BigInt(idx))) !== 0n && !unlockedAvatars.includes(a.id)) unlockedAvatars.push(a.id);
      });

      const eq = (equipPack || '').split('_');
      const equippedSkin = ANIME_CARD_SKINS[Number(eq[0]) || 0]?.id || 'classic';
      const equippedAvatar = ANIME_AVATARS[Number(eq[1]) || 0]?.id || 'default_player';
      const equippedActiveChar = eq[2] === 'n' ? 'none' : GENSHIN_BURSTS[Number(eq[2]) || 0]?.id || 'none';
      const selectedBannerBurstId = GENSHIN_BURSTS[Number(eq[3]) || 0]?.id || 'raiden';
      const themes = ['inazuma', 'fontaine', 'abyss', 'natlan', 'cryo'];
      const arenaTheme = themes[Number(eq[4]) || 0] || 'inazuma';

      const pt = (pityPack || '').split('_');
      const gachaPity5 = verTag === 'v1' ? Number(pt[0]) || 0 : parseInt(pt[0] || '0', 36) || 0;
      const gachaPity4 = verTag === 'v1' ? Number(pt[1]) || 0 : parseInt(pt[1] || '0', 36) || 0;
      const gachaGuaranteed5 = pt[2] === '1';
      const gachaGuaranteed4 = verTag === 'v1' ? false : pt[3] === '1';
      const totalWishes = verTag === 'v1' ? Number(pt[3]) || 0 : parseInt(pt[4] || '0', 36) || 0;

      const qp = (questsPack || '').split('_');
      const qRawDate = qp[0] || '';
      const dailyQuestsDate =
        qRawDate.length === 6
          ? `20${qRawDate.slice(0, 2)}-${qRawDate.slice(2, 4)}-${qRawDate.slice(4, 6)}`
          : this.getTodayKey();
      const dailyQuestsState = this.getDefaultDailyQuestsState();
      DAILY_QUESTS_CONFIG.forEach((q, idx) => {
        const pVal = Number(qp[1 + idx * 2]) || 0;
        const cVal = qp[2 + idx * 2] === '1';
        dailyQuestsState[q.id] = { progress: Math.min(q.target, pVal), claimed: cVal };
      });

      let displayName = usernameKey || 'Nhà Lữ Hành';
      try {
        if (nameHex && nameHex.length >= 2) {
          const bytes = new Uint8Array(nameHex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));
          const decoded = new TextDecoder().decode(bytes);
          displayName = this.resolveCleanPlayerName(decoded, usernameKey);
        }
      } catch (_) {}

      const rawTs = parseInt(updatedSec36 || '0', 36) || 0;
      const updatedAtMs = rawTs > 1e11 ? rawTs : rawTs * 1000;
      const syncRev = rev36 && verTag === 'v2' ? parseInt(rev36, 36) || 0 : 0;
      const nowStr = new Date(updatedAtMs || Date.now()).toLocaleString('vi-VN');

      return {
        v: verTag === 'v2' && syncRev > 0 ? 28 : 25,
        username: usernameKey,
        displayName,
        passwordHash: passHash,
        createdAt: nowStr,
        updatedAt: nowStr,
        updatedAtMs,
        syncRev,
        profile: {
          accountUsername: usernameKey,
          updatedAtMs,
          syncRev,
          coins: safeCoins,
          playerName: displayName,
          betPerCard: 100,
          soloPlayerCount: 4,
          arenaTheme,
          autoRandomizeBots: true,
          unlockedSkins,
          equippedSkin,
          unlockedAvatars,
          equippedAvatar,
          unlockedBursts,
          equippedChopBurst: equippedActiveChar,
          equippedWinBurst: equippedActiveChar,
          equippedActiveChar,
          gachaPity5,
          gachaPity4,
          gachaGuaranteed5,
          gachaGuaranteed4,
          selectedBannerBurstId,
          totalWishes,
          gachaHistory: [],
          lastDailyDate: dailyQuestsDate,
          dailyReliefUsed: 0,
          dailyQuestsDate,
          dailyQuestsState,
        },
      };
    } catch (_) {
      return null;
    }
  }

  async pushAccountToCloud(usernameKey) {
    if (!usernameKey) return false;
    const accountsDb = this.loadAccountsDb();
    const acc = accountsDb[usernameKey];
    if (!acc || !acc.passwordHash) return false;

    let cloudMaxRev = 0;
    // Trước khi đẩy lên Cloud, gộp nhanh toàn bộ vật phẩm đã mở khóa từ Cloud (nếu có) để máy này không bao giờ ghi đè mất đồ ở máy kia!
    try {
      const existingCloud = await this.fetchCloudAccount(usernameKey);
      if (existingCloud) {
        cloudMaxRev = Math.max(Number(existingCloud.syncRev) || 0, Number(existingCloud.profile?.syncRev) || 0);
        if (existingCloud.profile && acc.profile) {
          const cProf = existingCloud.profile;
          acc.profile.unlockedBursts = Array.from(new Set([...(acc.profile.unlockedBursts || []), ...(cProf.unlockedBursts || [])]));
          acc.profile.unlockedSkins = Array.from(new Set([...(acc.profile.unlockedSkins || ['classic']), ...(cProf.unlockedSkins || ['classic'])]));
          acc.profile.unlockedAvatars = Array.from(new Set([...(acc.profile.unlockedAvatars || ['default_player']), ...(cProf.unlockedAvatars || ['default_player'])]));
          if (usernameKey === this.currentAccountUsername) {
            acc.profile.unlockedBursts.forEach((id) => this.unlockedBursts.add(id));
            acc.profile.unlockedSkins.forEach((id) => this.unlockedSkins.add(id));
            acc.profile.unlockedAvatars.forEach((id) => this.unlockedAvatars.add(id));
          }
        }
      }
    } catch (_) {}

    const safeKey = this.getCloudSafeUserKey(usernameKey);
    const nextRev = Math.max(Number(acc.syncRev) || 0, Number(this.profileSyncRev) || 0, cloudMaxRev) + 1;
    acc.syncRev = nextRev;
    acc.updatedAtMs = Math.max(Number(acc.updatedAtMs) || 0, Date.now());
    if (acc.profile) {
      acc.profile.updatedAtMs = acc.updatedAtMs;
      acc.profile.syncRev = nextRev;
    }
    if (usernameKey === this.currentAccountUsername) {
      this.profileUpdatedAtMs = acc.updatedAtMs;
      this.profileSyncRev = nextRev;
    }
    this.saveAccountsDb(accountsDb);

    const cleanDisp = this.resolveCleanPlayerName(acc.displayName || acc.profile?.playerName, usernameKey);
    const cloudRecord = {
      v: 28,
      username: usernameKey,
      displayName: cleanDisp,
      passwordHash: acc.passwordHash,
      createdAt: acc.createdAt || new Date().toLocaleString('vi-VN'),
      updatedAt: acc.updatedAt || new Date().toLocaleString('vi-VN'),
      updatedAtMs: acc.updatedAtMs,
      syncRev: nextRev,
      profile: {
        ...(acc.profile || {}),
        updatedAtMs: acc.updatedAtMs,
        syncRev: nextRev,
        playerName: cleanDisp,
        gachaHistory: ((acc.profile && acc.profile.gachaHistory) || []).slice(0, 60),
      },
    };

    const tasks = [];
    // 1. Primary Cloud DB (textdb.dev — lưu trọn vẹn toàn bộ JSON + Lịch sử Gacha)
    try {
      const b64 = 'TLMN_CLOUD_V26:' + btoa(unescape(encodeURIComponent(JSON.stringify(cloudRecord))));
      tasks.push(
        fetch(`https://textdb.dev/api/data/tlmn_bkp_acc_${safeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: b64,
        }).then((r) => r.ok)
      );
    } catch (_) {}

    // 2. Secondary Cloud DB (keyvalue.immanuel.co — 2 cụm độc lập dự phòng)
    const packedV2 = this.packCloudAccountV2(acc);
    if (packedV2) {
      ['w3crt6ib', 'iykuu08k'].forEach((appKey) => {
        tasks.push(
          fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${appKey}/tlacc_${safeKey}/${packedV2}`, {
            method: 'POST',
          }).then((r) => r.ok)
        );
      });
    }

    try {
      const results = await Promise.allSettled(tasks);
      const ok = results.some((r) => r.status === 'fulfilled' && r.value);
      if (ok) {
        this.lastCloudSyncTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const statusEl = document.getElementById('account-cloud-sync-badge');
        if (statusEl) {
          statusEl.innerHTML = `☁️ Đã đồng bộ Đám Mây 2 chiều lúc ${this.lastCloudSyncTime} (Rev #${nextRev} • Mọi máy dùng chung 1 tài khoản thực!)`;
        }
      }
      return ok;
    } catch (_) {
      return false;
    }
  }

  async fetchCloudAccount(usernameKey) {
    if (!usernameKey) return null;
    const safeKey = this.getCloudSafeUserKey(usernameKey);
    const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const candidates = [];

    // 1. Fetch từ Primary Cloud DB (textdb.dev) kèm cache-buster chống trình duyệt di động lưu cache cũ
    const pTextDb = fetch(`https://textdb.dev/api/data/tlmn_bkp_acc_${safeKey}?t=${cacheBust}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const txt = (await res.text()).trim();
        if (!txt || !txt.startsWith('TLMN_CLOUD_V26:')) return null;
        const jsonStr = decodeURIComponent(escape(atob(txt.slice('TLMN_CLOUD_V26:'.length))));
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.username && parsed.passwordHash) return parsed;
        return null;
      })
      .catch(() => null);

    // 2. Fetch từ Secondary Cloud DB (keyvalue.immanuel.co) kèm cache-buster (hỗ trợ cả v2- và v1-)
    const fetchKv = (appKey) =>
      fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${appKey}/tlacc_${safeKey}?t=${cacheBust}`, {
        method: 'GET',
        cache: 'no-store',
      })
        .then(async (res) => {
          if (!res.ok) return null;
          const raw = (await res.text()).trim();
          let val = raw;
          try {
            val = JSON.parse(raw);
          } catch (_) {
            val = raw.replace(/^"|"$/g, '');
          }
          if (!val || typeof val !== 'string' || (!val.startsWith('v2-') && !val.startsWith('v1-'))) return null;
          return this.unpackCloudAccountV2(usernameKey, val);
        })
        .catch(() => null);

    const results = await Promise.all([pTextDb, fetchKv('w3crt6ib'), fetchKv('iykuu08k')]);
    results.forEach((acc) => {
      if (acc && acc.passwordHash) candidates.push(acc);
    });
    if (candidates.length === 0) return null;

    // Ưu tiên bản ghi có syncRev và timestamp mới nhất
    candidates.sort((a, b) => {
      const revDiff = (Number(b.syncRev || b.profile?.syncRev) || 0) - (Number(a.syncRev || a.profile?.syncRev) || 0);
      if (revDiff !== 0) return revDiff;
      const diff = (Number(b.updatedAtMs) || 0) - (Number(a.updatedAtMs) || 0);
      if (Math.abs(diff) <= 1500 && (a.v >= 26) !== (b.v >= 26)) {
        return b.v >= 26 ? 1 : -1;
      }
      return diff;
    });
    const best = candidates[0];
    if (best.profile) {
      // Hợp nhất toàn bộ vật phẩm đã mở khóa từ mọi cụm Cloud để không bao giờ sót đồ
      const allBursts = new Set(best.profile.unlockedBursts || []);
      const allSkins = new Set(best.profile.unlockedSkins || ['classic']);
      const allAvatars = new Set(best.profile.unlockedAvatars || ['default_player']);
      candidates.forEach((c) => {
        (c.profile?.unlockedBursts || []).forEach((id) => allBursts.add(id));
        (c.profile?.unlockedSkins || []).forEach((id) => allSkins.add(id));
        (c.profile?.unlockedAvatars || []).forEach((id) => allAvatars.add(id));
      });
      best.profile.unlockedBursts = Array.from(allBursts);
      best.profile.unlockedSkins = Array.from(allSkins);
      best.profile.unlockedAvatars = Array.from(allAvatars);
    }
    const withHistory = candidates.find((c) => Array.isArray(c.profile?.gachaHistory) && c.profile.gachaHistory.length > 0);
    if (withHistory && best.profile && (!best.profile.gachaHistory || best.profile.gachaHistory.length === 0)) {
      best.profile.gachaHistory = withHistory.profile.gachaHistory;
    }
    return best;
  }

  mergeTwoAccountProfiles(baseProfile, incomingProfile, preferIncoming = false, takeMaxCoins = false) {
    if (!baseProfile && !incomingProfile) return null;
    if (!baseProfile) baseProfile = incomingProfile;
    if (!incomingProfile) incomingProfile = baseProfile;
    const baseRev = Number(baseProfile.syncRev) || 0;
    const incRev = Number(incomingProfile.syncRev) || 0;
    const baseTime = Number(baseProfile.updatedAtMs) || 0;
    const incTime = Number(incomingProfile.updatedAtMs) || 0;
    const incomingWins =
      preferIncoming ||
      incRev > baseRev ||
      (incRev === baseRev && incTime >= baseTime);
    const newer = incomingWins ? incomingProfile : baseProfile;
    const older = incomingWins ? baseProfile : incomingProfile;
    const maxUpdatedAtMs = Math.max(baseTime, incTime);
    const maxSyncRev = Math.max(baseRev, incRev);

    const mergedSkins = Array.from(new Set([...(older.unlockedSkins || ['classic']), ...(newer.unlockedSkins || ['classic'])]));
    const mergedAvatars = Array.from(new Set([...(older.unlockedAvatars || ['default_player']), ...(newer.unlockedAvatars || ['default_player'])]));
    const mergedBursts = Array.from(new Set([...(older.unlockedBursts || []), ...(newer.unlockedBursts || [])]));

    // Gộp lịch sử Gacha không trùng lặp
    const historyMap = new Map();
    [...(newer.gachaHistory || []), ...(older.gachaHistory || [])].forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const key = `${item.pullNo || 0}_${item.id || ''}_${item.timeStr || ''}`;
      if (!historyMap.has(key)) historyMap.set(key, item);
    });
    const mergedHistory = Array.from(historyMap.values())
      .sort((a, b) => (Number(b.pullNo) || 0) - (Number(a.pullNo) || 0))
      .slice(0, 300);

    const resolvedSkin =
      newer.equippedSkin && mergedSkins.includes(newer.equippedSkin)
        ? newer.equippedSkin
        : older.equippedSkin && mergedSkins.includes(older.equippedSkin)
          ? older.equippedSkin
          : 'classic';

    const resolvedAvatar =
      newer.equippedAvatar && mergedAvatars.includes(newer.equippedAvatar)
        ? newer.equippedAvatar
        : older.equippedAvatar && mergedAvatars.includes(older.equippedAvatar)
          ? older.equippedAvatar
          : 'default_player';

    const newerChar = newer.equippedActiveChar || newer.equippedChopBurst || newer.equippedWinBurst || 'none';
    const olderChar = older.equippedActiveChar || older.equippedChopBurst || older.equippedWinBurst || 'none';
    const resolvedActiveChar =
      newerChar && newerChar !== 'none' && mergedBursts.includes(newerChar)
        ? newerChar
        : olderChar && olderChar !== 'none' && mergedBursts.includes(olderChar)
          ? olderChar
          : mergedBursts[0] || 'none';

    const today = this.getTodayKey();
    const mergedQuestsState = this.getDefaultDailyQuestsState();
    [older, newer].forEach((prof) => {
      if (prof && prof.dailyQuestsDate === today && prof.dailyQuestsState) {
        DAILY_QUESTS_CONFIG.forEach((q) => {
          const sq = prof.dailyQuestsState[q.id];
          if (sq && mergedQuestsState[q.id]) {
            mergedQuestsState[q.id].progress = Math.min(
              q.target,
              Math.max(mergedQuestsState[q.id].progress || 0, Number(sq.progress) || 0)
            );
            mergedQuestsState[q.id].claimed = !!(mergedQuestsState[q.id].claimed || sq.claimed);
          }
        });
      }
    });

    const maxTotalWishes = Math.max(Number(newer.totalWishes) || 0, Number(older.totalWishes) || 0);
    let resolvedCoins = takeMaxCoins
      ? Math.max(Number(newer.coins) || 0, Number(older.coins) || 0)
      : typeof newer.coins === 'number'
        ? newer.coins
        : older.coins ?? INITIAL_COINS;

    // Khôi phục 1 lần (v28) cho tài khoản có Nhân Vật 5★ / lượt Cầu Nguyện bị ghi đè nhầm 20,000 Xu khi đăng nhập máy mới ở bản cũ
    if (takeMaxCoins && resolvedCoins <= 22000 && (mergedBursts.length > 0 || maxTotalWishes > 0)) {
      resolvedCoins = Math.max(resolvedCoins, 80000);
    }

    return {
      ...older,
      ...newer,
      updatedAtMs: maxUpdatedAtMs,
      syncRev: maxSyncRev,
      coins: resolvedCoins,
      totalWishes: maxTotalWishes,
      unlockedSkins: mergedSkins,
      equippedSkin: resolvedSkin,
      unlockedAvatars: mergedAvatars,
      equippedAvatar: resolvedAvatar,
      unlockedBursts: mergedBursts,
      equippedActiveChar: resolvedActiveChar,
      equippedChopBurst: resolvedActiveChar,
      equippedWinBurst: resolvedActiveChar,
      gachaHistory: mergedHistory,
      dailyQuestsDate: today,
      dailyQuestsState: mergedQuestsState,
    };
  }

  scheduleCloudAccountSync() {
    if (!this.currentAccountUsername) return;
    clearTimeout(this.cloudSyncDebounceTimer);
    this.cloudSyncDebounceTimer = setTimeout(() => {
      this.cloudSyncDebounceTimer = null;
      if (this.currentAccountUsername) {
        this.pushAccountToCloud(this.currentAccountUsername);
      }
    }, 150);
  }

  setupCrossDeviceCloudSync() {
    if (this._crossDeviceSyncInitialized) return;
    this._crossDeviceSyncInitialized = true;

    // Khi người chơi chuyển tab / mở màn hình điện thoại hoặc bấm vào cửa sổ game ➔ kéo dữ liệu mới nhất từ Đám Mây ngay!
    window.addEventListener('focus', () => {
      if (this.currentAccountUsername) {
        this.pullAccountFromCloudAndSync(this.currentAccountUsername);
      }
    });
    window.addEventListener('pageshow', () => {
      if (this.currentAccountUsername) {
        this.pullAccountFromCloudAndSync(this.currentAccountUsername);
      }
    });
    window.addEventListener('online', () => {
      if (this.currentAccountUsername) {
        this.pullAccountFromCloudAndSync(this.currentAccountUsername);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentAccountUsername) {
        this.pullAccountFromCloudAndSync(this.currentAccountUsername);
      }
    });

    // Tự động đồng bộ ngầm mỗi 3.5 giây để 2 máy đang mở cùng 1 tài khoản luôn khớp 100% Xu, Kho Đồ, Trang Bị & Pity!
    this.cloudAutoPullInterval = setInterval(() => {
      if (
        !document.hidden &&
        this.currentAccountUsername &&
        !this.cloudSyncDebounceTimer &&
        !this.isBurstPlaying
      ) {
        this.pullAccountFromCloudAndSync(this.currentAccountUsername);
      }
    }, 3500);
  }

  async pullAccountFromCloudAndSync(usernameKey = this.currentAccountUsername, options = {}) {
    const targetUser = (usernameKey || this.currentAccountUsername || '').trim().toLowerCase();
    if (!targetUser || this._isPullingCloud) return false;
    const { forceCloud = false } = options || {};

    const migKey = `tlmn_v28_migrated_${targetUser}`;
    const alreadyMigratedV28 = localStorage.getItem(migKey) === '1';

    // Nếu máy hiện tại đã qua bước đồng nhất v28 và vừa thay đổi dữ liệu đang chờ đẩy lên Cloud thì đẩy lên trước
    if (alreadyMigratedV28 && this.cloudSyncDebounceTimer && !forceCloud) {
      clearTimeout(this.cloudSyncDebounceTimer);
      this.cloudSyncDebounceTimer = null;
      await this.pushAccountToCloud(targetUser);
      return true;
    }

    this._isPullingCloud = true;
    try {
      const cloudAcc = await this.fetchCloudAccount(targetUser);
      const accountsDb = this.loadAccountsDb();
      const localAcc = accountsDb[targetUser] || null;

      if (!cloudAcc) {
        if (localAcc && localAcc.passwordHash) {
          localStorage.setItem(migKey, '1');
          await this.pushAccountToCloud(targetUser);
        }
        return false;
      }

      const cloudRev = Math.max(Number(cloudAcc.syncRev) || 0, Number(cloudAcc.profile?.syncRev) || 0);
      const localRev =
        targetUser === this.currentAccountUsername
          ? Math.max(Number(this.profileSyncRev) || 0, Number(localAcc?.syncRev) || 0, Number(localAcc?.profile?.syncRev) || 0)
          : Math.max(Number(localAcc?.syncRev) || 0, Number(localAcc?.profile?.syncRev) || 0);

      const cloudTime = Number(cloudAcc.updatedAtMs) || Number(cloudAcc.profile?.updatedAtMs) || 0;
      const localTime =
        targetUser === this.currentAccountUsername
          ? Math.max(Number(this.profileUpdatedAtMs) || 0, Number(localAcc?.updatedAtMs) || 0)
          : Number(localAcc?.updatedAtMs) || 0;

      const cProf = cloudAcc.profile || {};
      const hasNewCloudUnlock =
        (cProf.unlockedBursts || []).some((id) => !this.unlockedBursts.has(id)) ||
        (cProf.unlockedSkins || []).some((id) => !this.unlockedSkins.has(id)) ||
        (cProf.unlockedAvatars || []).some((id) => !this.unlockedAvatars.has(id));

      const hasNewLocalUnlock =
        targetUser === this.currentAccountUsername &&
        (Array.from(this.unlockedBursts).some((id) => !(cProf.unlockedBursts || []).includes(id)) ||
          Array.from(this.unlockedSkins).some((id) => !(cProf.unlockedSkins || []).includes(id)) ||
          Array.from(this.unlockedAvatars).some((id) => !(cProf.unlockedAvatars || []).includes(id)));

      const needsInitialV28Reconcile = !alreadyMigratedV28 || (cloudAcc.v || 0) < 28;
      const cloudIsNewerOrForced =
        forceCloud ||
        cloudRev > localRev ||
        (cloudRev === localRev && cloudTime > localTime);
      const stateDiffers =
        typeof cProf.coins === 'number' &&
        (cProf.coins !== this.savedCoins ||
          cProf.equippedActiveChar !== this.equippedActiveChar ||
          cProf.equippedSkin !== this.equippedSkin ||
          cProf.equippedAvatar !== this.equippedAvatar ||
          cProf.gachaPity5 !== this.gachaPity5 ||
          cProf.gachaPity4 !== this.gachaPity4 ||
          cProf.playerName !== this.savedPlayerName);

      if (
        !needsInitialV28Reconcile &&
        !cloudIsNewerOrForced &&
        !hasNewCloudUnlock &&
        !(cloudRev === localRev && cloudTime === localTime && stateDiffers)
      ) {
        if (hasNewLocalUnlock || localRev > cloudRev || (localRev === cloudRev && localTime > cloudTime)) {
          await this.pushAccountToCloud(targetUser);
        }
        return false;
      }

      const baseProf =
        targetUser === this.currentAccountUsername
          ? {
              ...(localAcc?.profile || {}),
              accountUsername: targetUser,
              updatedAtMs: localTime,
              syncRev: localRev,
              coins: this.savedCoins,
              playerName: this.savedPlayerName,
              betPerCard: this.betPerCard,
              soloPlayerCount: this.soloPlayerCount,
              arenaTheme: this.arenaTheme,
              unlockedSkins: Array.from(this.unlockedSkins),
              equippedSkin: this.equippedSkin,
              unlockedAvatars: Array.from(this.unlockedAvatars),
              equippedAvatar: this.equippedAvatar,
              unlockedBursts: Array.from(this.unlockedBursts),
              equippedActiveChar: this.equippedActiveChar,
              equippedChopBurst: this.equippedChopBurst,
              equippedWinBurst: this.equippedWinBurst,
              gachaPity5: this.gachaPity5,
              gachaPity4: this.gachaPity4,
              gachaGuaranteed5: this.gachaGuaranteed5,
              gachaGuaranteed4: this.gachaGuaranteed4,
              selectedBannerBurstId: this.selectedBannerBurstId,
              totalWishes: this.totalWishes,
              gachaHistory: this.gachaHistory,
              dailyQuestsDate: this.dailyQuestsDate,
              dailyQuestsState: this.dailyQuestsState,
            }
          : { ...(localAcc?.profile || {}), updatedAtMs: localTime, syncRev: localRev };

      const localHasMoreCoinsInMigration =
        needsInitialV28Reconcile && (Number(baseProf.coins) || 0) > (Number(cProf.coins) || 0);

      const mergedProfile = this.mergeTwoAccountProfiles(
        baseProf,
        { ...cProf, updatedAtMs: cloudTime, syncRev: cloudRev },
        cloudIsNewerOrForced && !localHasMoreCoinsInMigration,
        needsInitialV28Reconcile
      );

      const syncedTime = Math.max(localTime, cloudTime, Date.now() - 200);
      const syncedRev = Math.max(localRev, cloudRev, 1);
      mergedProfile.updatedAtMs = Math.max(localTime, cloudTime) || syncedTime;
      mergedProfile.syncRev = syncedRev;

      accountsDb[targetUser] = {
        username: targetUser,
        displayName: this.resolveCleanPlayerName(
          mergedProfile.playerName || cloudAcc.displayName || localAcc?.displayName,
          targetUser
        ),
        passwordHash: cloudAcc.passwordHash || localAcc?.passwordHash,
        createdAt: cloudAcc.createdAt || localAcc?.createdAt || new Date().toLocaleString('vi-VN'),
        updatedAt: new Date().toLocaleString('vi-VN'),
        updatedAtMs: mergedProfile.updatedAtMs,
        syncRev: syncedRev,
        profile: mergedProfile,
      };
      this.saveAccountsDb(accountsDb);
      localStorage.setItem(migKey, '1');

      if (targetUser === this.currentAccountUsername) {
        this.resetProfileMemoryToDefaults();
        this.currentAccountUsername = targetUser;
        this.applyProfileDataObject(mergedProfile, this.getTodayKey());
        this.profileUpdatedAtMs = mergedProfile.updatedAtMs;
        this.profileSyncRev = syncedRev;
        // QUAN TRỌNG: Gọi syncLoadedProfileToLivePlayer() TRƯỚC saveShopProfile để me.coins nhận đúng số Xu từ Cloud!
        this.syncLoadedProfileToLivePlayer();
        this.saveShopProfile({ bumpTimestamp: false, syncCloud: false, preserveSavedCoins: true });
        if (!document.getElementById('account-modal')?.classList.contains('hidden')) {
          this.renderAccountModal();
        }
        if (!document.getElementById('inventory-modal')?.classList.contains('hidden')) {
          this.renderInventoryModal();
        }
      }

      if (needsInitialV28Reconcile || hasNewLocalUnlock || localHasMoreCoinsInMigration) {
        await this.pushAccountToCloud(targetUser);
      }
      return true;
    } catch (_) {
      return false;
    } finally {
      this._isPullingCloud = false;
    }
  }

  async syncExistingAccountsToCloudOnBoot() {
    try {
      const accountsDb = this.loadAccountsDb();
      const usernames = new Set(Object.keys(accountsDb));
      if (this.currentAccountUsername) usernames.add(this.currentAccountUsername);

      for (const u of usernames) {
        if (u === this.currentAccountUsername) {
          await this.pullAccountFromCloudAndSync(u, { forceCloud: false });
        } else {
          const localAcc = accountsDb[u];
          if (!localAcc || !localAcc.passwordHash) continue;
          const cloudAcc = await this.fetchCloudAccount(u);
          if (!cloudAcc) {
            await this.pushAccountToCloud(u);
          }
        }
      }
    } catch (_) {}
  }

  async manualSyncCloudNow() {
    if (!this.currentAccountUsername) return;
    await this.pullAccountFromCloudAndSync(this.currentAccountUsername, { forceCloud: true });
    this.saveShopProfile({ bumpTimestamp: true, syncCloud: false });
    const ok = await this.pushAccountToCloud(this.currentAccountUsername);
    if (ok) {
      sfx.win();
      alert(`☁️ Đã đồng bộ 2 chiều tài khoản @${this.currentAccountUsername} với Đám Mây thành công!\nCả 2 máy hiện dùng chung 100% Xu (${this.savedCoins.toLocaleString()} Xu), Nhân Vật 5★ (${this.unlockedBursts.size}/${GENSHIN_BURSTS.length}), Skin Bài & Pity!`);
    } else {
      alert('⚠️ Kết nối mạng đang chập chờn, hệ thống sẽ tự động thử đồng bộ lại sau ít giây.');
    }
  }

  saveShopProfile(options = {}) {
    try {
      const { bumpTimestamp = true, syncCloud = true, preserveSavedCoins = false } = options || {};
      const today = this.getTodayKey();
      if (this.dailyQuestsDate !== today) {
        this.dailyQuestsDate = today;
        this.dailyQuestsState = this.getDefaultDailyQuestsState();
      }

      if (this.players) {
        const me = this.getLocalPlayer();
        const isTrulyMe =
          !this.isMultiplayer ||
          (me && me.clientId === this.myClientId) ||
          (this.isHost && this.mySeatId === 0);
        if (me && isTrulyMe && typeof me.coins === 'number') {
          if (preserveSavedCoins || !bumpTimestamp) {
            me.coins = this.savedCoins;
          } else {
            this.savedCoins = me.coins;
          }
        }
      }

      // Gộp (Union) với dữ liệu v9 đã lưu CHỈ KHI cùng đúng tài khoản (tuyệt đối không gộp dữ liệu khách vào tài khoản đã đăng nhập!)
      const backups = this.readBackupPayloads();
      backups.forEach((old) => {
        if (!old || typeof old !== 'object') return;
        if (
          (this.currentAccountUsername && old.accountUsername !== this.currentAccountUsername) ||
          (!this.currentAccountUsername && old.accountUsername)
        ) {
          return;
        }
        if (Array.isArray(old.unlockedSkins)) {
          old.unlockedSkins.forEach((id) => this.unlockedSkins.add(id));
        }
        if (Array.isArray(old.unlockedAvatars)) {
          old.unlockedAvatars.forEach((id) => this.unlockedAvatars.add(id));
        }
        if (Array.isArray(old.unlockedBursts)) {
          old.unlockedBursts.forEach((id) => this.unlockedBursts.add(id));
        }
        if (old.dailyQuestsDate === today && old.dailyQuestsState && typeof old.dailyQuestsState === 'object') {
          DAILY_QUESTS_CONFIG.forEach((q) => {
            const sq = old.dailyQuestsState[q.id];
            if (sq && this.dailyQuestsState[q.id]) {
              this.dailyQuestsState[q.id].progress = Math.min(
                q.target,
                Math.max(this.dailyQuestsState[q.id].progress || 0, Number(sq.progress) || 0)
              );
              this.dailyQuestsState[q.id].claimed = !!(this.dailyQuestsState[q.id].claimed || sq.claimed);
            }
          });
        }
      });

      this.savedPlayerName = this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername);
      const nowMs = bumpTimestamp ? Date.now() : Number(this.profileUpdatedAtMs) || 0;
      const nextRev = bumpTimestamp ? (Number(this.profileSyncRev) || 0) + 1 : Number(this.profileSyncRev) || 0;
      this.profileUpdatedAtMs = nowMs;
      this.profileSyncRev = nextRev;

      const payload = {
        accountUsername: this.currentAccountUsername || '',
        updatedAtMs: nowMs,
        syncRev: nextRev,
        coins: this.savedCoins,
        playerName: this.savedPlayerName,
        betPerCard: this.betPerCard || 100,
        soloPlayerCount: this.soloPlayerCount || 4,
        arenaTheme: this.arenaTheme || 'inazuma',
        autoRandomizeBots: this.autoRandomizeBots !== false,
        unlockedSkins: Array.from(this.unlockedSkins),
        equippedSkin: this.equippedSkin,
        unlockedAvatars: Array.from(this.unlockedAvatars),
        equippedAvatar: this.equippedAvatar,
        unlockedBursts: Array.from(this.unlockedBursts),
        equippedChopBurst: this.equippedChopBurst || 'none',
        equippedWinBurst: this.equippedWinBurst || 'none',
        equippedActiveChar: this.equippedActiveChar || 'none',
        gachaPity5: this.gachaPity5 || 0,
        gachaPity4: this.gachaPity4 || 0,
        gachaGuaranteed5: !!this.gachaGuaranteed5,
        gachaGuaranteed4: !!this.gachaGuaranteed4,
        selectedBannerBurstId: this.selectedBannerBurstId || 'raiden',
        totalWishes: this.totalWishes || 0,
        gachaHistory: (this.gachaHistory || []).slice(0, 300),
        lastDailyDate: this.lastDailyDate || today,
        dailyReliefUsed: this.dailyReliefUsed || 0,
        dailyQuestsDate: this.dailyQuestsDate || today,
        dailyQuestsState: this.dailyQuestsState,
      };
      const jsonStr = JSON.stringify(payload);
      localStorage.setItem('tlmn_genshin_vault_v9', jsonStr);
      // Bỏ gachaHistory trong cookie để dung lượng cookie luôn < 1.2KB (không bao giờ vượt giới hạn 4KB của trình duyệt!)
      const cookiePayload = { ...payload, gachaHistory: [] };
      document.cookie = `tlmn_vault_v9=${encodeURIComponent(JSON.stringify(cookiePayload))}; path=/; max-age=31536000; SameSite=Lax`;
      window.name = `TLMN_VAULT_V9:${jsonStr}`;

      if (this.currentAccountUsername) {
        const accountsDb = this.loadAccountsDb();
        if (accountsDb[this.currentAccountUsername]) {
          accountsDb[this.currentAccountUsername].displayName = payload.playerName;
          accountsDb[this.currentAccountUsername].updatedAt = new Date().toLocaleString('vi-VN');
          accountsDb[this.currentAccountUsername].updatedAtMs = nowMs;
          accountsDb[this.currentAccountUsername].syncRev = nextRev;
          accountsDb[this.currentAccountUsername].profile = payload;
          this.saveAccountsDb(accountsDb);
          if (syncCloud && bumpTimestamp) {
            this.scheduleCloudAccountSync();
          }
        }
      }

      const lobbyBal = document.getElementById('lobby-balance-display');
      if (lobbyBal) lobbyBal.textContent = this.savedCoins.toLocaleString();
      this.syncAccountButtonsUI();
    } catch (_) {}
  }

  syncAccountButtonsUI() {
    const topBtn = document.getElementById('btn-top-account');
    const topLabel = document.getElementById('top-account-label');
    const topLogoutBtn = document.getElementById('btn-top-logout');
    const lobbyBtn = document.getElementById('btn-lobby-account');
    const lobbyLabel = document.getElementById('lobby-account-label');
    const lobbyLogoutBtn = document.getElementById('btn-lobby-logout');
    const guestBanner = document.getElementById('lobby-account-guest-banner');

    if (this.currentAccountUsername) {
      if (topBtn) topBtn.classList.remove('is-guest');
      if (lobbyBtn) lobbyBtn.classList.remove('is-guest');
      if (topLabel) topLabel.textContent = `☁️ TK: ${this.currentAccountUsername}`;
      if (lobbyLabel) lobbyLabel.textContent = `☁️ TK: ${this.currentAccountUsername}`;
      if (topLogoutBtn) topLogoutBtn.classList.remove('hidden');
      if (lobbyLogoutBtn) lobbyLogoutBtn.classList.remove('hidden');
      if (guestBanner) guestBanner.classList.add('hidden');
    } else {
      if (topBtn) topBtn.classList.add('is-guest');
      if (lobbyBtn) lobbyBtn.classList.add('is-guest');
      if (topLabel) topLabel.textContent = 'Tạo TK / Đăng Nhập';
      if (lobbyLabel) lobbyLabel.textContent = 'Tạo TK / Đăng Nhập';
      if (topLogoutBtn) topLogoutBtn.classList.add('hidden');
      if (lobbyLogoutBtn) lobbyLogoutBtn.classList.add('hidden');
      if (guestBanner) guestBanner.classList.remove('hidden');
    }
  }

  requireAccountLogin() {
    if (this.currentAccountUsername) return true;
    clearTimeout(this.botTimer);
    clearInterval(this.turnCountdownInterval);
    this.openAccountModal(this.accountModalTab || 'register');
    return false;
  }

  openAccountModal(tab = '') {
    if (tab) this.accountModalTab = tab;
    else if (!this.accountModalTab) this.accountModalTab = 'register';
    const modal = document.getElementById('account-modal');
    if (!modal) return;
    this.renderAccountModal();
    modal.classList.remove('hidden');
    sfx.click();
    if (this.currentAccountUsername) {
      this.pullAccountFromCloudAndSync(this.currentAccountUsername);
    }
  }

  switchAccountModalTab(tab) {
    this.accountModalTab = tab;
    this.renderAccountModal();
    sfx.click();
  }

  syncLoadedProfileToLivePlayer() {
    this.savedPlayerName = this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername);
    const me = this.getLocalPlayer();
    if (me) {
      me.coins = this.savedCoins;
      me.name = this.savedPlayerName;
      me.cardSkin = this.equippedSkin || 'classic';
      me.avatar = this.equippedAvatar || 'default_player';
      me.activeChar = this.equippedActiveChar || 'none';
      me.chopBurst = this.equippedChopBurst || 'none';
      me.winBurst = this.equippedWinBurst || 'none';
    }
    const nameInput = document.getElementById('input-player-name');
    if (nameInput) nameInput.value = this.savedPlayerName;
    if (!this.isMultiplayer && localStorage.getItem('tlmn_active_match_v18')) {
      this.saveActiveMatchSnapshot();
    }
    if (this.isMultiplayer) {
      this.syncCosmeticsInRoom();
    }
    this.applyArenaThemeUI();
    this.updateArenaBackdropCharacters();
    this.renderShopModal();
    this.renderLobbyModal();
    this.renderAll();
    this.syncAccountButtonsUI();
  }

  async registerAccount() {
    const userEl = document.getElementById('acc-reg-username');
    const passEl = document.getElementById('acc-reg-password');
    const pass2El = document.getElementById('acc-reg-password2');
    const nameEl = document.getElementById('acc-reg-displayname');
    const keepEl = document.getElementById('acc-reg-keep-data');
    const btnEl = document.getElementById('btn-acc-register-submit');

    const rawUser = (userEl?.value || '').trim();
    const usernameKey = rawUser.toLowerCase();
    const pass = passEl?.value || '';
    const pass2 = pass2El?.value || '';
    const typedName = (nameEl?.value || '').trim();
    const displayName =
      typedName && typedName !== 'Nhà Lữ Hành' && (typedName !== 'Thắng' || usernameKey.includes('thang'))
        ? typedName
        : rawUser;
    const keepCurrentData = keepEl ? keepEl.checked : true;

    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(rawUser)) {
      alert('⚠️ Tên tài khoản cần dài từ 3 đến 20 ký tự, viết liền không dấu (chữ cái, số, dấu gạch dưới)!');
      return;
    }
    if (pass.length < 4) {
      alert('⚠️ Mật khẩu cần có ít nhất 4 ký tự!');
      return;
    }
    if (pass !== pass2) {
      alert('⚠️ Mật khẩu nhập lại không khớp!');
      return;
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Đang kiểm tra & lưu lên Đám Mây (Cloud)...';
    }

    const inputHash = this.hashAccountPassword(pass, usernameKey);
    const accountsDb = this.loadAccountsDb();
    const cloudExisting = await this.fetchCloudAccount(usernameKey);
    const existingAcc = cloudExisting || accountsDb[usernameKey];

    if (existingAcc) {
      // Nếu trùng đúng mật khẩu của chính người chơi (ví dụ qua máy mới bấm nhầm Tạo TK thay vì Đăng Nhập) ➔ Tự động đăng nhập luôn!
      if (existingAcc.passwordHash === inputHash) {
        accountsDb[usernameKey] = existingAcc;
        this.saveAccountsDb(accountsDb);
        await this.loginAccount(usernameKey, pass);
        return;
      }
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '🔐 Tạo Tài Khoản & Đồng Bộ Đám Mây Ngay';
      }
      alert(
        `⚠️ Tài khoản "${rawUser}" đã tồn tại trên hệ thống Đám Mây! Nếu đây là tài khoản của bạn, hãy chuyển sang tab "🔑 Đăng Nhập" nhé.`
      );
      return;
    }

    // Mặc định (keepCurrentData = true): GIỮ NGUYÊN 100% toàn bộ dữ liệu đang chơi hiện tại!
    if (!keepCurrentData) {
      this.resetProfileMemoryToDefaults();
    }

    this.savedPlayerName = displayName;
    this.currentAccountUsername = usernameKey;
    localStorage.setItem('tlmn_active_account_v1', usernameKey);
    localStorage.setItem(`tlmn_v28_migrated_${usernameKey}`, '1');

    const nowStr = new Date().toLocaleString('vi-VN');
    accountsDb[usernameKey] = {
      username: usernameKey,
      displayName,
      passwordHash: inputHash,
      createdAt: nowStr,
      updatedAt: nowStr,
      updatedAtMs: Date.now(),
      syncRev: (Number(this.profileSyncRev) || 0) + 1,
      profile: null,
    };
    this.saveAccountsDb(accountsDb);
    this.syncLoadedProfileToLivePlayer();
    this.saveShopProfile();
    await this.pushAccountToCloud(usernameKey);
    this.syncLoadedProfileToLivePlayer();
    sfx.win();
    this.addLog(
      `☁️ <strong>Đã tạo & đồng bộ Đám Mây tài khoản @${usernameKey}</strong> thành công! Bạn có thể vào bất kỳ máy / điện thoại nào khác chỉ bằng Tài Khoản + Mật Khẩu!`,
      'log-win'
    );
    this.renderAccountModal();
    document.getElementById('account-modal')?.classList.add('hidden');
    if (this._pendingJoinRoomParam) {
      const pendingRoom = this._pendingJoinRoomParam;
      this._pendingJoinRoomParam = '';
      this.openModeSetupModal('human');
      this.searchMultiplayerRoomById(pendingRoom);
    }
  }

  async loginAccount(prefillUsername = '', prefillPassword = '') {
    const userEl = document.getElementById('acc-login-username');
    const passEl = document.getElementById('acc-login-password');
    const btnEl = document.getElementById('btn-acc-login-submit');
    const usernameKey = (prefillUsername || userEl?.value || '').trim().toLowerCase();
    const pass = prefillPassword || passEl?.value || '';

    if (!usernameKey) {
      alert('⚠️ Vui lòng nhập Tên tài khoản!');
      return;
    }
    if (!pass) {
      alert('⚠️ Vui lòng nhập Mật khẩu!');
      return;
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Đang tải tài khoản từ Đám Mây (Cloud)...';
    }

    // Lưu tài khoản cũ trước khi chuyển
    if (this.currentAccountUsername && this.currentAccountUsername !== usernameKey) {
      this.saveShopProfile();
      await this.pushAccountToCloud(this.currentAccountUsername);
    }

    const accountsDb = this.loadAccountsDb();
    const localAcc = accountsDb[usernameKey] || null;
    const cloudAcc = await this.fetchCloudAccount(usernameKey);
    const targetAcc = cloudAcc || localAcc;

    if (!targetAcc) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '🔑 Đăng Nhập Vào Tài Khoản';
      }
      alert(
        `⚠️ Không tìm thấy tài khoản "${usernameKey}" trên hệ thống Đám Mây!\n💡 Nếu bạn chưa tạo tài khoản hoặc tạo trên máy cũ lúc chưa có Cloud, hãy mở lại máy cũ 1 lần để tự động đồng bộ lên Cloud hoặc bấm sang tab "📝 Tạo Tài Khoản Mới" nhé!`
      );
      return;
    }

    const inputHash = this.hashAccountPassword(pass, usernameKey);
    if (targetAcc.passwordHash !== inputHash && (!localAcc || localAcc.passwordHash !== inputHash)) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '🔑 Đăng Nhập Vào Tài Khoản';
      }
      alert('❌ Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
      return;
    }

    const migKey = `tlmn_v28_migrated_${usernameKey}`;
    const alreadyMigrated = localStorage.getItem(migKey) === '1' && (cloudAcc?.v || 0) >= 28;
    const cloudRev = Number(cloudAcc?.syncRev || cloudAcc?.profile?.syncRev || 0);
    const localRev = Number(localAcc?.syncRev || localAcc?.profile?.syncRev || 0);
    const cloudTime = Number(cloudAcc?.updatedAtMs || cloudAcc?.profile?.updatedAtMs || 0);
    const localTime = Number(localAcc?.updatedAtMs || localAcc?.profile?.updatedAtMs || 0);

    // Gộp dữ liệu mới nhất giữa Cloud và Local (ưu tiên Cloud khi đăng nhập từ máy khác để 2 máy là 1 tài khoản duy nhất)
    const preferCloudOnLogin =
      !!cloudAcc &&
      (this.currentAccountUsername !== usernameKey ||
        !localAcc ||
        (cloudRev !== localRev ? cloudRev > localRev : cloudTime >= localTime));
    const finalProfile = this.mergeTwoAccountProfiles(
      localAcc ? { ...(localAcc.profile || {}), updatedAtMs: localTime, syncRev: localRev } : null,
      cloudAcc ? { ...(cloudAcc.profile || {}), updatedAtMs: cloudTime, syncRev: cloudRev } : null,
      preferCloudOnLogin,
      !alreadyMigrated
    );
    localStorage.setItem(migKey, '1');

    const nowStr = new Date().toLocaleString('vi-VN');
    const resolvedLoginName = this.resolveCleanPlayerName(
      finalProfile?.playerName || targetAcc.displayName,
      usernameKey
    );
    const mergedTimestamp = Math.max(cloudTime, localTime, Date.now());
    const mergedRev = Math.max(cloudRev, localRev, 1) + 1;
    if (finalProfile) {
      finalProfile.playerName = resolvedLoginName;
      finalProfile.updatedAtMs = mergedTimestamp;
      finalProfile.syncRev = mergedRev;
    }
    accountsDb[usernameKey] = {
      username: usernameKey,
      displayName: resolvedLoginName,
      passwordHash: inputHash,
      createdAt: targetAcc.createdAt || nowStr,
      updatedAt: nowStr,
      updatedAtMs: mergedTimestamp,
      syncRev: mergedRev,
      profile: finalProfile,
    };
    this.saveAccountsDb(accountsDb);

    this.clearActiveMatchSnapshot();
    this.resetProfileMemoryToDefaults();
    this.currentAccountUsername = usernameKey;
    localStorage.setItem('tlmn_active_account_v1', usernameKey);

    if (finalProfile) {
      const jsonStr = JSON.stringify({
        ...finalProfile,
        accountUsername: usernameKey,
        updatedAtMs: mergedTimestamp,
        syncRev: mergedRev,
      });
      localStorage.setItem('tlmn_genshin_vault_v9', jsonStr);
      window.name = `TLMN_VAULT_V9:${jsonStr}`;
      this.applyProfileDataObject(finalProfile, this.getTodayKey());
      this.profileUpdatedAtMs = mergedTimestamp;
      this.profileSyncRev = mergedRev;
    }
    // QUAN TRỌNG: Phải gọi syncLoadedProfileToLivePlayer() TRƯỚC saveShopProfile để me.coins nhận đúng số Xu vừa tải từ Cloud!
    this.syncLoadedProfileToLivePlayer();
    this.saveShopProfile({ bumpTimestamp: false, syncCloud: false, preserveSavedCoins: true });
    await this.pushAccountToCloud(usernameKey);
    this.syncLoadedProfileToLivePlayer();
    sfx.win();
    this.addLog(
      `☁️ <strong>Đăng nhập Đám Mây thành công @${usernameKey} (${this.savedPlayerName})!</strong> Số dư: <strong>${this.savedCoins.toLocaleString()} Xu</strong> • Nộ 5★: <strong>${this.unlockedBursts.size}/${GENSHIN_BURSTS.length}</strong>.`,
      'log-win'
    );
    this.renderAccountModal();
    document.getElementById('account-modal')?.classList.add('hidden');
    if (this._pendingJoinRoomParam) {
      const pendingRoom = this._pendingJoinRoomParam;
      this._pendingJoinRoomParam = '';
      this.openModeSetupModal('human');
      this.searchMultiplayerRoomById(pendingRoom);
    }
  }

  async changeAccountPassword() {
    if (!this.currentAccountUsername) return;
    const oldPass = document.getElementById('acc-change-oldpass')?.value || '';
    const newPass = document.getElementById('acc-change-newpass')?.value || '';
    const newName = (document.getElementById('acc-change-displayname')?.value || '').trim();

    const accountsDb = this.loadAccountsDb();
    const acc = accountsDb[this.currentAccountUsername];
    if (!acc) return;

    if (newName && newName !== this.savedPlayerName) {
      this.savedPlayerName = newName;
      acc.displayName = newName;
    }

    if (oldPass || newPass) {
      if (acc.passwordHash !== this.hashAccountPassword(oldPass, this.currentAccountUsername)) {
        alert('❌ Mật khẩu hiện tại không đúng!');
        return;
      }
      if (newPass.length < 4) {
        alert('⚠️ Mật khẩu mới phải có ít nhất 4 ký tự!');
        return;
      }
      acc.passwordHash = this.hashAccountPassword(newPass, this.currentAccountUsername);
    }

    acc.updatedAtMs = Date.now();
    this.saveAccountsDb(accountsDb);
    this.saveShopProfile();
    await this.pushAccountToCloud(this.currentAccountUsername);
    this.syncLoadedProfileToLivePlayer();
    sfx.win();
    alert('✅ Đã cập nhật thông tin Tài Khoản & đồng bộ Mật Khẩu mới lên Đám Mây thành công!');
    this.renderAccountModal();
  }

  async logoutAccount() {
    if (!this.currentAccountUsername) return;
    if (this.isMidMatch()) {
      const ok = confirm(
        `⚠️ Bạn đang đánh dở Ván #${this.matchCount}! Bạn có chắc chắn muốn Đăng Xuất khỏi tài khoản @${this.currentAccountUsername} ngay bây giờ không?`
      );
      if (!ok) return;
    }
    const oldUser = this.currentAccountUsername;
    this.saveShopProfile();
    try {
      await this.pushAccountToCloud(oldUser);
    } catch (_) {}

    this.currentAccountUsername = '';
    try {
      localStorage.removeItem('tlmn_active_account_v1');
      localStorage.removeItem('tlmn_genshin_vault_v9');
      document.cookie = 'tlmn_vault_v9=; path=/; max-age=0; SameSite=Lax';
      window.name = '';
    } catch (_) {}

    this.clearActiveMatchSnapshot();
    this.resetProfileMemoryToDefaults();
    this.saveShopProfile();
    this.syncLoadedProfileToLivePlayer();
    clearTimeout(this.botTimer);
    clearInterval(this.turnCountdownInterval);
    this.modalWifi?.classList.remove('hidden');
    this.accountModalTab = 'register';
    this.renderAccountModal();
    document.getElementById('account-modal')?.classList.remove('hidden');
    sfx.click();
    this.addLog(
      `🚪 Đã đăng xuất khỏi tài khoản <strong>@${oldUser}</strong> (Dữ liệu đã được đồng bộ an toàn trên Đám Mây ☁️). Bạn có thể đăng nhập tài khoản khác hoặc tạo tài khoản mới!`,
      'log-play'
    );
  }

  fillSavedAccountUsername(username) {
    const userEl = document.getElementById('acc-login-username');
    if (userEl) {
      userEl.value = username;
      document.getElementById('acc-login-password')?.focus();
    }
  }

  renderAccountModal() {
    const body = document.getElementById('account-modal-body');
    if (!body) return;

    const closeBtn = document.getElementById('btn-close-account');
    if (closeBtn) {
      closeBtn.classList.toggle('hidden', !this.currentAccountUsername);
    }
    const titleEl = document.getElementById('account-modal-title');
    if (titleEl) {
      titleEl.textContent = this.currentAccountUsername
        ? '🔐 TÀI KHOẢN & MẬT KHẨU NGƯỜI CHƠI'
        : '🔒 BẮT BUỘC TẠO TÀI KHOẢN / ĐĂNG NHẬP ĐỂ CHƠI';
    }

    const me = this.getLocalPlayer();
    const curCoins = me ? me.coins : this.savedCoins;
    const accountsDb = this.loadAccountsDb();
    const savedUsernames = Object.keys(accountsDb);

    if (this.currentAccountUsername) {
      const acc = accountsDb[this.currentAccountUsername] || {
        username: this.currentAccountUsername,
        displayName: this.savedPlayerName || this.currentAccountUsername,
      };
      const syncTimeText = this.lastCloudSyncTime
        ? `☁️ Đã đồng bộ Đám Mây lúc ${this.lastCloudSyncTime} (Vào máy khác chỉ cần nhập TK + MK!)`
        : `☁️ Tự động đồng bộ Đám Mây Online (Vào máy/điện thoại khác chỉ cần nhập TK + MK!)`;

      body.innerHTML = `
        <div class="account-preserve-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div>
              <div style="font-size:11.5px;color:#6ee7b7;font-weight:800;" id="account-cloud-sync-badge">${syncTimeText}</div>
              <div style="font-size:16px;font-weight:900;color:#ffffff;margin-top:2px;">👤 Tài khoản: <span style="color:#fde047;">@${acc.username}</span> (${this.savedPlayerName})</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="tool-btn" onclick="window.tienLenGame.manualSyncCloudNow()" style="padding:6px 10px;font-weight:800;">
                ☁️ Đồng Bộ Cloud Ngay
              </button>
              <button class="clear-log-btn" onclick="window.tienLenGame.logoutAccount()" style="padding:6px 12px;font-weight:800;">
                🚪 Đăng Xuất / Đổi TK
              </button>
            </div>
          </div>
          <div class="account-stats-grid">
            <div class="account-stat-item">
              <span class="account-stat-label">🪙 Số dư Xu</span>
              <span class="account-stat-val">${curCoins.toLocaleString()} Xu</span>
            </div>
            <div class="account-stat-item">
              <span class="account-stat-label">⭐⭐⭐⭐⭐ Nhân Vật 5★</span>
              <span class="account-stat-val">${this.unlockedBursts.size} / ${GENSHIN_BURSTS.length}</span>
            </div>
            <div class="account-stat-item">
              <span class="account-stat-label">⭐⭐⭐⭐ Decor Bài 4★</span>
              <span class="account-stat-val">${this.unlockedSkins.size} / ${ANIME_CARD_SKINS.length}</span>
            </div>
            <div class="account-stat-item">
              <span class="account-stat-label">🌠 Pity 5★ &amp; Tổng Roll</span>
              <span class="account-stat-val">${this.gachaPity5 || 0}/90 (${this.totalWishes || 0} Roll)</span>
            </div>
          </div>
        </div>

        <div class="account-form-box">
          <div style="font-size:13px;font-weight:900;color:#fde68a;">🔑 Cập Nhật Tên Hiển Thị / Đổi Mật Khẩu</div>
          <div class="account-field">
            <label>👤 Tên hiển thị trong bàn bài:</label>
            <input type="text" id="acc-change-displayname" value="${this.resolveCleanPlayerName(this.savedPlayerName, acc.username)}" maxlength="18" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="account-field">
              <label>🔒 Mật khẩu hiện tại (nếu đổi MK):</label>
              <input type="password" id="acc-change-oldpass" placeholder="Nhập mật khẩu cũ..." />
            </div>
            <div class="account-field">
              <label>🆕 Mật khẩu mới:</label>
              <input type="password" id="acc-change-newpass" placeholder="Tối thiểu 4 ký tự..." />
            </div>
          </div>
          <button class="primary-btn" onclick="window.tienLenGame.changeAccountPassword()" style="width:100%;">
            💾 Lưu Thay Đổi &amp; Đồng Bộ Lên Cloud
          </button>
        </div>
      `;
      return;
    }

    const tab = this.accountModalTab || 'register';
    const savedChipsHtml =
      savedUsernames.length > 0
        ? `
          <div style="margin-bottom:8px;">
            <div style="font-size:11.5px;color:#94a3b8;margin-bottom:5px;">📌 Tài khoản gần đây trên máy này (Bấm để điền nhanh):</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${savedUsernames
                .map((u) => {
                  const a = accountsDb[u];
                  return `<span class="account-saved-chip" onclick="window.tienLenGame.fillSavedAccountUsername('${a.username}')">👤 @${a.username} (${a.displayName || a.username})</span>`;
                })
                .join('')}
            </div>
          </div>
        `
        : '';

    body.innerHTML = `
      <div class="account-preserve-card">
        <div style="font-size:12.5px;font-weight:900;color:#fde047;">
          🔒 BẮT BUỘC TẠO TÀI KHOẢN HOẶC ĐĂNG NHẬP ĐỂ VÀO CHƠI!
        </div>
        <div style="font-size:11.5px;color:#e2e8f0;margin-top:3px;">
          • <strong>Chưa có tài khoản:</strong> Điền Tên Tài Khoản + Mật Khẩu ở mục <strong>📝 Tạo Tài Khoản Mới</strong> bên dưới để vào chơi ngay (tặng sẵn <strong>20,000 Xu</strong> &amp; đồng bộ Đám Mây).<br/>
          • <strong>Đã có tài khoản:</strong> Bấm sang tab <strong>🔑 Đăng Nhập Tài Khoản</strong>, nhập đúng <strong>Tên Tài Khoản + Mật Khẩu</strong> để tải toàn bộ Xu và Kho Đồ từ Đám Mây!
        </div>
        <div class="account-stats-grid">
          <div class="account-stat-item">
            <span class="account-stat-label">🪙 Xu đang có</span>
            <span class="account-stat-val">${curCoins.toLocaleString()} Xu</span>
          </div>
          <div class="account-stat-item">
            <span class="account-stat-label">⭐⭐⭐⭐⭐ Nhân Vật 5★</span>
            <span class="account-stat-val">${this.unlockedBursts.size} / ${GENSHIN_BURSTS.length}</span>
          </div>
          <div class="account-stat-item">
            <span class="account-stat-label">⭐⭐⭐⭐ Decor Bài 4★</span>
            <span class="account-stat-val">${this.unlockedSkins.size} / ${ANIME_CARD_SKINS.length}</span>
          </div>
          <div class="account-stat-item">
            <span class="account-stat-label">🌠 Pity 5★ &amp; Tổng Roll</span>
            <span class="account-stat-val">${this.gachaPity5 || 0}/90 (${this.totalWishes || 0} Roll)</span>
          </div>
        </div>
      </div>

      <div class="account-tabs-row">
        <button class="account-tab-btn ${tab === 'register' ? 'active' : ''}" onclick="window.tienLenGame.switchAccountModalTab('register')">
          📝 Tạo Tài Khoản Mới (Giữ Dữ Liệu)
        </button>
        <button class="account-tab-btn ${tab === 'login' ? 'active' : ''}" onclick="window.tienLenGame.switchAccountModalTab('login')">
          🔑 Đăng Nhập Tài Khoản (Trên Mọi Máy ☁️)
        </button>
      </div>

      ${
        tab === 'register'
          ? `
        <div class="account-form-box">
          <div class="account-field">
            <label>👤 Tên tài khoản (Username — viết liền không dấu, 3–20 ký tự):</label>
            <input type="text" id="acc-reg-username" maxlength="20" placeholder="Ví dụ: player2026" oninput="const d=document.getElementById('acc-reg-displayname'); if(d && !d.dataset.userEdited){ d.value=this.value.trim(); }" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="account-field">
              <label>🔒 Mật khẩu (tối thiểu 4 ký tự):</label>
              <input type="password" id="acc-reg-password" placeholder="Nhập mật khẩu..." />
            </div>
            <div class="account-field">
              <label>🔒 Nhập lại mật khẩu:</label>
              <input type="password" id="acc-reg-password2" placeholder="Nhập lại mật khẩu..." />
            </div>
          </div>
          <div class="account-field">
            <label>🏷️ Tên hiển thị trên bàn bài (Tự động lấy theo Tên tài khoản hoặc tự đặt):</label>
            <input type="text" id="acc-reg-displayname" value="${this.savedPlayerName && this.savedPlayerName !== 'Thắng' && this.savedPlayerName !== 'Nhà Lữ Hành' ? this.savedPlayerName : ''}" placeholder="Mặc định lấy theo Tên tài khoản (Username)..." maxlength="18" oninput="this.dataset.userEdited = this.value.trim() ? '1' : '';" />
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#a7f3d0;font-weight:700;cursor:pointer;margin-top:2px;">
            <input type="checkbox" id="acc-reg-keep-data" checked style="width:16px;height:16px;accent-color:#10b981;" />
            <span>✅ Giữ nguyên 100% dữ liệu đang chơi hiện tại (${curCoins.toLocaleString()} Xu, ${this.unlockedBursts.size} Nộ 5★, ${this.unlockedSkins.size} Skin Bài &amp; Pity) vào tài khoản này</span>
          </label>
          <button class="primary-btn" id="btn-acc-register-submit" onclick="window.tienLenGame.registerAccount()" style="width:100%;margin-top:4px;font-size:13.5px;padding:10px;">
            🔐 Tạo Tài Khoản &amp; Đồng Bộ Đám Mây Ngay
          </button>
        </div>
      `
          : `
        <div class="account-form-box">
          ${savedChipsHtml}
          <div class="account-field">
            <label>👤 Tên tài khoản (Username):</label>
            <input type="text" id="acc-login-username" maxlength="20" placeholder="Nhập tên tài khoản của bạn..." onkeydown="if(event.key==='Enter') window.tienLenGame.loginAccount()" />
          </div>
          <div class="account-field">
            <label>🔒 Mật khẩu:</label>
            <input type="password" id="acc-login-password" placeholder="Nhập mật khẩu..." onkeydown="if(event.key==='Enter') window.tienLenGame.loginAccount()" />
          </div>
          <button class="primary-btn" id="btn-acc-login-submit" onclick="window.tienLenGame.loginAccount()" style="width:100%;margin-top:4px;font-size:13.5px;padding:10px;">
            🔑 Đăng Nhập Vào Tài Khoản (Tự Động Tải Từ Cloud ☁️)
          </button>
        </div>
      `
      }
    `;
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
    const p = Math.max(1, Number(pullNum5) || 1);
    if (p >= 90) return 1.0; // 100% Bảo hiểm cứng (Hard Pity) ở lượt 90
    if (p <= 73) {
      // Tăng dần nhẹ theo mỗi lượt roll từ 1 -> 73: bắt đầu 0.60% ở lượt 1, tăng +0.04% mỗi lượt (đạt 3.48% ở lượt 73)
      return 0.006 + (p - 1) * 0.0004;
    }
    // Soft Pity (Bảo hiểm mềm) từ lượt 74 -> 89: nhảy vọt +6% mỗi lượt (từ 9.5% ở lượt 74 lên 99.5% ở lượt 89)
    return Math.min(0.995, 0.035 + (p - 73) * 0.06);
  }

  setGachaHistoryFilter(filterVal = 'all') {
    this.gachaHistoryFilter = filterVal;
    sfx.click();
    this.renderShopModal();
  }

  get4StarDropChance(pullNum4) {
    if (pullNum4 <= 8) return 0.051;  // 5.1% cơ bản từ lượt 1 -> 8
    if (pullNum4 === 9) return 0.561; // Soft Pity 4★ ở lượt 9: 56.1%
    return 1.0;                       // Hard Pity 4★ ở lượt 10: 100%
  }

  selectBannerUp(burstId) {
    if (!GENSHIN_BURSTS.some((b) => b.id === burstId)) return;
    const curRoster = document.querySelector('#shop-gacha-panel .gacha-up-Roster');
    if (curRoster) {
      this.lastGachaRosterScrollLeft = curRoster.scrollLeft;
      this.lastGachaRosterScrollTop = curRoster.scrollTop;
    }
    this.selectedBannerBurstId = burstId;
    sfx.click();
    this.saveShopProfile();
    this.renderShopModal();
  }

  switchShopTab(tabName) {
    if (['bursts', 'skins', 'avatars'].includes(tabName)) {
      this.openInventoryModal(tabName);
      return;
    }
    this.activeShopTab = tabName;
    const tabs = ['gacha', 'quests', 'history'];
    tabs.forEach((t) => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tabName);
    });
    document.getElementById('shop-gacha-panel')?.classList.toggle('hidden', tabName !== 'gacha');
    document.getElementById('shop-quests-panel')?.classList.toggle('hidden', tabName !== 'quests');
    document.getElementById('shop-history-panel')?.classList.toggle('hidden', tabName !== 'history');
    sfx.click();
    this.renderShopModal();
  }

  openGachaForCharacter(charId) {
    if (charId && GENSHIN_BURSTS.some((b) => b.id === charId)) {
      this.selectedBannerBurstId = charId;
      this._pendingScrollToBannerChip = true;
    }
    this.saveShopProfile();
    document.getElementById('inventory-modal')?.classList.add('hidden');
    document.getElementById('pause-modal')?.classList.add('hidden');
    this.modalShop?.classList.remove('hidden');
    this.switchShopTab('gacha');
  }

  openInventoryModal(defaultTab = null) {
    if (!this.requireAccountLogin()) return;
    if (defaultTab && ['bursts', 'skins', 'avatars'].includes(defaultTab)) {
      this.activeInventoryTab = defaultTab;
    } else if (!['bursts', 'skins', 'avatars'].includes(this.activeInventoryTab)) {
      this.activeInventoryTab = 'bursts';
    }
    document.getElementById('pause-modal')?.classList.add('hidden');
    this.renderInventoryModal();
    document.getElementById('inventory-modal')?.classList.remove('hidden');
    sfx.click();
    if (this.currentAccountUsername) {
      this.pullAccountFromCloudAndSync(this.currentAccountUsername);
    }
  }

  closeInventoryModal() {
    document.getElementById('inventory-modal')?.classList.add('hidden');
    sfx.click();
  }

  openGachaFromInventory() {
    document.getElementById('inventory-modal')?.classList.add('hidden');
    this.renderShopModal();
    this.modalShop?.classList.remove('hidden');
    this.switchShopTab('gacha');
    if (this.currentAccountUsername) {
      this.pullAccountFromCloudAndSync(this.currentAccountUsername);
    }
  }

  switchInventoryTab(tabName) {
    if (!['bursts', 'skins', 'avatars'].includes(tabName)) tabName = 'bursts';
    this.activeInventoryTab = tabName;
    ['bursts', 'skins', 'avatars'].forEach((t) => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tabName);
    });
    document.getElementById('shop-bursts-grid')?.classList.toggle('hidden', tabName !== 'bursts');
    document.getElementById('shop-skins-grid')?.classList.toggle('hidden', tabName !== 'skins');
    document.getElementById('shop-avatars-grid')?.classList.toggle('hidden', tabName !== 'avatars');
    sfx.click();
    this.renderInventoryModal();
  }

  setInventoryFilter(filterVal = 'all') {
    this.inventoryFilter = filterVal === 'owned' ? 'owned' : 'all';
    document.getElementById('inv-filter-all')?.classList.toggle('active', this.inventoryFilter === 'all');
    document.getElementById('inv-filter-owned')?.classList.toggle('active', this.inventoryFilter === 'owned');
    sfx.click();
    this.renderInventoryModal();
  }

  openPauseModal() {
    this.renderShopModal();
    this.renderInventoryModal();
    this.renderDailyQuestsUI();
    this.syncAccountButtonsUI();
    this.updateMidMatchLockUI();
    document.getElementById('pause-modal')?.classList.remove('hidden');
    sfx.click();
  }

  closePauseModal() {
    document.getElementById('pause-modal')?.classList.add('hidden');
    sfx.click();
    if (!this.isGameOver && !this.inInitialLobby) {
      this.updateTurnTimerUI();
      if (!this.isMultiplayer && this.players[this.currentTurn]?.isBot) {
        clearTimeout(this.botTimer);
        this.promptCurrentTurn();
      }
    }
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
        const standardPool = GENSHIN_BURSTS.filter((b) => b.isStandard);
        const others = standardPool.length > 0 ? standardPool : GENSHIN_BURSTS.filter((b) => b.id !== featuredId);
        chosenBurst = others[Math.floor(Math.random() * others.length)] || GENSHIN_BURSTS[0];
        this.gachaGuaranteed5 = true;
        rateNote = '☯️ Lệch 50/50 ra 5★ Thường (Kích hoạt Đại Bảo Hiểm 100% UP)';
      }

      const alreadyOwned = this.unlockedBursts.has(chosenBurst.id);
      const refund = alreadyOwned ? DUPLICATE_REFUND_COINS[5] : 0;
      if (!alreadyOwned) {
        this.unlockedBursts.add(chosenBurst.id);
        // Tự động gắn nhân vật 5★ vừa mở khóa nếu người chơi chưa có nhân vật 5★ nào đang xài
        if (!this.equippedActiveChar || this.equippedActiveChar === 'none' || !this.unlockedBursts.has(this.equippedActiveChar)) {
          this.equippedActiveChar = chosenBurst.id;
          this.equippedChopBurst = chosenBurst.id;
          this.equippedWinBurst = chosenBurst.id;
          if (me) {
            me.activeChar = chosenBurst.id;
            me.chopBurst = chosenBurst.id;
            me.winBurst = chosenBurst.id;
          }
        }
      }

      const result = {
        pullNo: this.totalWishes,
        timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        star: 5,
        category: 'burst',
        typeLabel: '🎬 VIDEO KỸ NĂNG NỘ 5★',
        id: chosenBurst.id,
        name: chosenBurst.name,
        thumbUrl: chosenBurst.posterUrl,
        mp4Url: chosenBurst.mp4Url,
        isNew: !alreadyOwned,
        refund,
        pityUsed: hitPity,
        rateNote,
      };
      this.gachaHistory.unshift(result);
      if (this.gachaHistory.length > 300) this.gachaHistory.length = 300;
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
        pullNo: this.totalWishes,
        timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
      if (this.gachaHistory.length > 300) this.gachaHistory.length = 300;
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
      pullNo: this.totalWishes,
      timeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
    if (this.gachaHistory.length > 300) this.gachaHistory.length = 300;
    return result;
  }

  performWish(count = 1) {
    const me = this.getLocalPlayer();
    if (!me) return;
    const pullCount = count === 10 ? 10 : 1;
    const cost = pullCount === 10 ? WISH_COST_TEN : WISH_COST_SINGLE;

    if (me.coins < cost) {
      alert(
        `⚠️ Bạn chưa đủ Xu để Cầu Nguyện ×${pullCount} (Cần ${cost.toLocaleString()} Xu, hiện có ${me.coins.toLocaleString()} Xu)!\n💡 Hãy làm 4 Nhiệm Vụ Hàng Ngày (mỗi nhiệm vụ nhận 2.5 Roll = +4,000 Xu) hoặc Xem Quảng Cáo (+1 Roll = +1,600 Xu) nhé!`
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

    // Hiển thị sao băng ngay lập tức trên frame đầu tiên để không bị khựng / lag
    this.showGachaMeteorAndResults(results, totalRefund);

    // Đẩy tác vụ lưu trữ và cập nhật UI nền sang frame sau khi sao băng đã bay
    setTimeout(() => {
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
    }, 60);
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
        const eqRolls = (totalRefund / WISH_COST_SINGLE).toFixed(1).replace(/\.0$/, '');
        refundSummary.textContent = `♻️ Tinh Huy quy đổi đồ trùng: Hoàn lại +${totalRefund.toLocaleString()} Xu (tương đương +${eqRolls} Roll)!`;
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
          const dupRollLabel = item.star === 5 ? '+2 Roll' : item.star === 4 ? '+1 Roll' : '+1/10 Roll';
          const statusHtml = item.isNew
            ? `<div class="gacha-result-status is-new">✨ MỚI MỞ KHÓA!</div>`
            : `<div class="gacha-result-status is-dup">♻️ Đã có ➔ +${item.refund.toLocaleString()} Xu (${dupRollLabel})</div>`;

          const quickEquipBtn =
            item.category === 'burst'
              ? `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.triggerGenshinBurst('${item.id}', '🎬 Xem thử Kỹ Năng Nộ 5★: ${item.name}!')">▶ Xem Nộ 5★</button>`
              : item.category === 'skin'
              ? `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.buyOrEquipSkin('${item.id}')">🃏 Trang bị Bài</button>`
              : `<button class="tool-btn" style="margin-top:4px;width:100%;" onclick="window.tienLenGame.buyOrEquipAvatar('${item.id}')">🎭 Dùng Avatar</button>`;

          const mediaThumbHtml = `<img class="gacha-result-thumb" src="${item.thumbUrl}" alt="${item.name}" loading="lazy" referrerpolicy="no-referrer" />`;
          const skillBadgeHtml =
            item.category === 'burst' && CHARACTER_SKILLS[item.id]
              ? `<div style="font-size:10.5px;color:#fde68a;background:rgba(15,23,42,0.82);border:1px solid rgba(250,204,21,0.4);border-radius:6px;padding:4px 6px;margin-top:3px;line-height:1.3;"><strong>${CHARACTER_SKILLS[item.id].icon} Kỹ Năng [E]: ${CHARACTER_SKILLS[item.id].name}</strong> — ${CHARACTER_SKILLS[item.id].shortDesc}</div>`
              : '';

          return `
            <div class="gacha-result-card star-${item.star}" style="animation-delay:${idx * 0.055}s">
              <div class="rarity-stars-badge rarity-${item.star}">${starsStr}</div>
              ${mediaThumbHtml}
              <div class="gacha-result-type">${item.typeLabel}</div>
              <div class="gacha-result-name">${item.name}</div>
              <div style="font-size:10px;color:#cbd5e1;">${item.rateNote}</div>
              ${skillBadgeHtml}
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

    this.renderDailyQuestsUI();

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

    const activeTab = this.activeShopTab || 'gacha';

    // 1. RENDER TAB SẢNH CẦU NGUYỆN GENSHIN IMPACT (Chỉ render khi đang mở tab gacha)
    const gachaPanel = document.getElementById('shop-gacha-panel');
    if (gachaPanel && activeTab === 'gacha') {
      const prevRosterEl = gachaPanel.querySelector('.gacha-up-Roster');
      const savedRosterScrollLeft = prevRosterEl ? prevRosterEl.scrollLeft : (this.lastGachaRosterScrollLeft || 0);
      const savedRosterScrollTop = prevRosterEl ? prevRosterEl.scrollTop : (this.lastGachaRosterScrollTop || 0);

      const featuredId = this.selectedBannerBurstId || 'raiden';
      const featuredBurst = getBurstMeta(featuredId) || GENSHIN_BURSTS[0];
      const rateUp4Ids = BANNER_4STAR_RATEUPS[featuredBurst.id] || ['raiden', 'furina', 'skirk'];
      const nextPull5 = (this.gachaPity5 || 0) + 1;
      const nextPull4 = (this.gachaPity4 || 0) + 1;
      const curChance5 = (this.get5StarDropChance(nextPull5) * 100).toFixed(1);
      const curChance4 = (this.get4StarDropChance(nextPull4) * 100).toFixed(1);
      const pity5Pct = Math.min(100, Math.round(((this.gachaPity5 || 0) / 90) * 100));
      const pity4Pct = Math.min(100, Math.round(((this.gachaPity4 || 0) / 10) * 100));

      const featuredSkill = CHARACTER_SKILLS[featuredBurst.id] || CHARACTER_SKILLS.raiden;

      const upRosterHtml = GENSHIN_BURSTS.filter((b) => !b.isStandard).map((b) => {
        const isCurrent = b.id === featuredBurst.id;
        const owned = this.unlockedBursts.has(b.id);
        const charName = b.name.split('—')[0].trim();
        const bSkill = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;
        return `
          <div class="gacha-up-chip ${isCurrent ? 'active' : ''}" data-burst-id="${b.id}" onclick="window.tienLenGame.selectBannerUp('${b.id}')" title="${bSkill.icon} Kỹ Năng [E]: ${bSkill.name} — ${bSkill.shortDesc}">
            <img src="fanart/${b.id}.jpg?v=61" alt="${charName}" loading="lazy" referrerpolicy="no-referrer" />
            <div>
              <div class="gacha-up-chip-name">${charName}</div>
              <div class="gacha-up-chip-status">${owned ? '✅ Đã sở hữu' : '🌠 Đang UP 5★'} • ${bSkill.icon} ${bSkill.name}</div>
            </div>
          </div>
        `;
      }).join('');

      const standardRosterHtml = GENSHIN_BURSTS.filter((b) => b.isStandard).map((b) => {
        const owned = this.unlockedBursts.has(b.id);
        const charName = b.name.split('—')[0].trim();
        const bSkill = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.qiqi;
        return `
          <div class="gacha-up-chip" style="border-color:rgba(148,163,184,0.35);" onclick="window.tienLenGame.triggerGenshinBurst('${b.id}', '🎬 Xem thử Hoạt Ảnh Nộ 5★ Thường (Lệch Rate): ${b.name}!')" title="Bấm để xem thử Nộ 5★! ${bSkill.icon} Nội Tại Cược [${bSkill.name}]: ${bSkill.shortDesc}">
            <img src="fanart/${b.id}.jpg?v=61" alt="${charName}" loading="lazy" referrerpolicy="no-referrer" />
            <div>
              <div class="gacha-up-chip-name">${charName}</div>
              <div class="gacha-up-chip-status">${owned ? '✅ Đã sở hữu' : '☯️ 5★ Lệch Rate'} • 💠 ${bSkill.name}</div>
            </div>
          </div>
        `;
      }).join('');

      const rateUp4Html = rateUp4Ids
        .map((id) => {
          const s = getCardSkinMeta(id);
          return `
            <span class="gacha-rateup-4star-pill">
              <img src="fanart/${id}.jpg?v=57" alt="${s.name}" loading="lazy" referrerpolicy="no-referrer" />
              ${id.toUpperCase()} (4★ UP)
            </span>
          `;
        })
        .join('');

      gachaPanel.innerHTML = `
        <div class="gacha-epitomized-bar">
          <div class="gacha-epitomized-title">
            <span>🎯 CHỌN NHÂN VẬT 5★ GIỚI HẠN TRÊN BANNER (🔗 TẤT CẢ 35 BANNER DÙNG CHUNG 100% PITY &amp; ĐẠI BẢO HIỂM):</span>
            <span style="font-size:11.5px;color:#cbd5e1;">Đã Cầu Nguyện tổng cộng: <strong>${(this.totalWishes || 0).toLocaleString()}</strong> lượt</span>
          </div>
          <div class="gacha-up-Roster">${upRosterHtml}</div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(148,163,184,0.28);">
            <div style="font-size:11.5px;font-weight:800;color:#93c5fd;margin-bottom:4px;">
              ☯️ 8 NHÂN VẬT 5★ THƯỜNG (LỆCH RATE 50/50 • CÓ HOẠT ẢNH NỘ 5★ &amp; NỘI TẠI CƯỢC TỰ ĐỘNG, KHÔNG CÓ KỸ NĂNG E — BẤM ĐỂ XEM NỘ):
            </div>
            <div class="gacha-up-Roster" style="max-height:76px;">${standardRosterHtml}</div>
          </div>
        </div>

        <div class="gacha-banner-hero">
          <div class="gacha-hero-left">
            <div>
              <div class="gacha-banner-tag">🌠 BANNER NHÂN VẬT GIỚI HẠN • MỞ KHÓA NỘ 5★ &amp; KỸ NĂNG CHIẾN THUẬT [E]</div>
              <div class="gacha-banner-main-title" style="margin-top:6px;">${featuredBurst.name}</div>
              <div class="gacha-banner-sub" style="margin-top:4px;">${featuredBurst.desc}</div>
            </div>

            <div class="gacha-featured-visual">
              <img class="gacha-featured-gif" src="${featuredBurst.posterUrl}" alt="${featuredBurst.name}" loading="lazy" referrerpolicy="no-referrer" />
              <div class="gacha-featured-info">
                <div class="gacha-featured-stars">⭐⭐⭐⭐⭐ VIDEO KỸ NĂNG NỘ + KỸ NĂNG BÀN BÀI (5 SAO UP)</div>
                <div style="font-size:12px;color:#fde68a;font-weight:700;">${featuredBurst.title}</div>
                <div style="font-size:11px;color:#cbd5e1;font-style:italic;">${featuredBurst.quote}</div>
                <div class="gacha-featured-skill-box">
                  <div style="font-weight:900;color:#fde047;margin-bottom:2px;">
                    🔮 Kỹ Năng Chiến Thuật [Phím E]: ${featuredSkill.icon} ${featuredSkill.name}
                  </div>
                  <div style="color:#e2e8f0;">
                    ${featuredSkill.shortDesc}
                  </div>
                </div>
                <div style="margin-top:5px;">
                  <button class="tool-btn" onclick="window.tienLenGame.triggerGenshinBurst('${featuredBurst.id}', '🎬 Xem & Nghe Thử Video Nộ 5★ UP: ${featuredBurst.name}!')">
                    🔊 Xem & Nghe Thử Video Nộ 5★
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
                  <span>Tỷ lệ nổ lượt kế (#${nextPull5}): <strong>${curChance5}%</strong> ${nextPull5 >= 74 ? '🔥 (Soft Pity +6%/lượt!)' : '(Tăng dần mỗi lượt + Soft Pity từ 74)'}</span>
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
              ♻️ <strong>Cơ chế Tinh Huy / Tinh Trần Hoàn Trả khi quay trùng đồ đã có:</strong><br/>
              • Trùng <strong>3★ Avatar</strong> ➔ Nhận thêm <strong>+1/10 Roll</strong> (<strong>+${DUPLICATE_REFUND_COINS[3].toLocaleString()} Xu</strong>)<br/>
              • Trùng <strong>4★ Decor Bài</strong> ➔ Nhận thêm <strong>+1 Roll</strong> (<strong>+${DUPLICATE_REFUND_COINS[4].toLocaleString()} Xu</strong>)<br/>
              • Trùng <strong>5★ Kỹ Năng Nộ</strong> ➔ Nhận thêm <strong>+2 Roll</strong> (<strong>+${DUPLICATE_REFUND_COINS[5].toLocaleString()} Xu</strong>)
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
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;">
              <button class="tool-btn" style="width:100%;padding:7px 12px;font-weight:800;" onclick="window.tienLenGame.switchShopTab('history')">
                📜 Xem Toàn Bộ Lịch Sử Roll (${(this.gachaHistory || []).length} lượt) & Bảng Tỷ Lệ Tăng Dần
              </button>
            </div>
          </div>
        </div>
      `;

      // Giữ nguyên vị trí cuộn của thanh danh sách Banner (không bị giật/thụt về banner đầu tiên)
      const newRosterEl = gachaPanel.querySelector('.gacha-up-Roster');
      if (newRosterEl) {
        newRosterEl.scrollLeft = savedRosterScrollLeft;
        newRosterEl.scrollTop = savedRosterScrollTop;
        newRosterEl.addEventListener(
          'scroll',
          () => {
            this.lastGachaRosterScrollLeft = newRosterEl.scrollLeft;
            this.lastGachaRosterScrollTop = newRosterEl.scrollTop;
          },
          { passive: true }
        );
        if (this._pendingScrollToBannerChip) {
          this._pendingScrollToBannerChip = false;
          const activeChip = newRosterEl.querySelector('.gacha-up-chip.active');
          if (activeChip && typeof activeChip.scrollIntoView === 'function') {
            activeChip.scrollIntoView({ inline: 'center', block: 'nearest' });
            this.lastGachaRosterScrollLeft = newRosterEl.scrollLeft;
          }
        }
      }
    }

    // 5. RENDER TAB TOÀN BỘ LỊCH SỬ CẦU NGUYỆN & BẢNG TỶ LỆ TĂNG DẦN THEO SỐ ROLL
    const historyPanel = document.getElementById('shop-history-panel');
    if (historyPanel && activeTab === 'history') {
      const allHistory = this.gachaHistory || [];
      const curFilter = this.gachaHistoryFilter || 'all';
      const count5 = allHistory.filter((h) => h.star === 5).length;
      const count4 = allHistory.filter((h) => h.star === 4).length;
      const count3 = allHistory.filter((h) => h.star === 3).length;

      const filteredHistory =
        curFilter === '5'
          ? allHistory.filter((h) => h.star === 5)
          : curFilter === '4'
          ? allHistory.filter((h) => h.star === 4)
          : curFilter === '3'
          ? allHistory.filter((h) => h.star === 3)
          : allHistory;

      const totalLen = allHistory.length;
      const visibleHistory = filteredHistory.slice(0, 100);
      const historyItemsHtml =
        visibleHistory.length === 0
          ? `<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Chưa có lịch sử Cầu Nguyện ở mục lọc này. Hãy thử vận may ở tab 🌠 Sảnh Cầu Nguyện nhé!</div>`
          : visibleHistory
              .map((h, idx) => {
                const rollNo = h.pullNo || Math.max(1, (this.totalWishes || totalLen) - idx);
                const color = h.star === 5 ? '#fde047' : h.star === 4 ? '#d8b4fe' : '#93c5fd';
                const timeBadge = h.timeStr ? ` • 🕒 ${h.timeStr}` : '';
                return `
                  <div class="gacha-history-item">
                    <div>
                      <strong style="color:${color};">#${rollNo} • [${h.star}★] ${h.name}</strong>
                      <div style="font-size:11px;color:#94a3b8;">${h.typeLabel} • ${h.rateNote} (Pity: ${h.pityUsed})${timeBadge}</div>
                    </div>
                    <div style="text-align:right;font-weight:800;font-size:11.5px;color:${h.isNew ? '#34d399' : '#fbbf24'};">
                      ${h.isNew ? '✨ MỚI' : `♻️ +${(h.refund || 0).toLocaleString()} Xu`}
                    </div>
                  </div>
                `;
              })
              .join('');

      const nextP5 = (this.gachaPity5 || 0) + 1;
      const nextChanceStr = (this.get5StarDropChance(nextP5) * 100).toFixed(2);

      historyPanel.innerHTML = `
        <div class="gacha-rules-card">
          <h3>📈 Cơ Chế Tăng Tỷ Lệ Nổ 5★ Khi Roll Càng Nhiều (Tăng Dần + Soft Pity + Hard Pity)</h3>
          <div style="font-size:12.5px;color:#e2e8f0;line-height:1.55;display:flex;flex-direction:column;gap:6px;">
            <div>• <strong>Không phải đợi tới đúng 90 mới nổ!</strong> Tỷ lệ nổ 5★ <strong>tăng dần sau mỗi lượt bạn roll</strong> và bùng nổ cực mạnh từ lượt 74 (Soft Pity):</div>
            <div class="gacha-pity-curve-grid">
              <div class="gacha-pity-step-card ${nextP5 <= 30 ? 'current-zone' : ''}">
                <span class="gacha-pity-step-range">Lượt Roll 1 ➔ 30</span>
                <span class="gacha-pity-step-rate">0.60% ➔ 1.76%</span>
                <span class="gacha-pity-step-desc">Tăng nhẹ +0.04% sau mỗi lượt roll (Có thể nổ sớm!)</span>
              </div>
              <div class="gacha-pity-step-card ${nextP5 >= 31 && nextP5 <= 73 ? 'current-zone' : ''}">
                <span class="gacha-pity-step-range">Lượt Roll 31 ➔ 73</span>
                <span class="gacha-pity-step-rate">1.80% ➔ 3.48%</span>
                <span class="gacha-pity-step-desc">Tích lũy vận khí trước ngưỡng Bảo Hiểm Mềm</span>
              </div>
              <div class="gacha-pity-step-card ${nextP5 >= 74 && nextP5 <= 89 ? 'current-zone' : ''}">
                <span class="gacha-pity-step-range">🔥 Lượt 74 ➔ 89 (Soft Pity)</span>
                <span class="gacha-pity-step-rate">9.5% ➔ 99.5%</span>
                <span class="gacha-pity-step-desc">Tăng vọt <strong>+6% mỗi lượt</strong> (Đa số nổ vàng ở lượt 75–82!)</span>
              </div>
              <div class="gacha-pity-step-card ${nextP5 >= 90 ? 'current-zone' : ''}">
                <span class="gacha-pity-step-range">👑 Lượt 90 (Hard Pity)</span>
                <span class="gacha-pity-step-rate">100.00%</span>
                <span class="gacha-pity-step-desc">Bảo hiểm cứng: Chắc chắn 100% nổ 5★!</span>
              </div>
            </div>
            <div style="margin-top:4px;color:#fde68a;font-weight:700;">
              🎯 Trạng thái Pity hiện tại của bạn: Đang ở lượt <strong>#${nextP5}/90</strong> ➔ Xác suất nổ 5★ ngay lượt kế tiếp là <strong>${nextChanceStr}%</strong>!
            </div>
            <div>• <strong>☯️ Cơ chế 50/50 & Đại Bảo Hiểm:</strong> Khi nổ 5★, có <strong>55%</strong> trúng ngay Nhân Vật 5★ UP đang chọn. Nếu lệch, lần nổ 5★ kế tiếp được <strong>🔥 Đại Bảo Hiểm 100% trúng UP</strong>!</div>
            <div>• <strong>⭐⭐⭐⭐ 4 Sao (Decor Bài):</strong> Lượt 1–8: <strong>5.1%</strong> • Lượt 9 (Soft Pity): <strong>56.1%</strong> • Lượt 10: <strong>100% nổ ≥ 4★</strong>.</div>
          </div>
        </div>
        <div class="gacha-log-card">
          <div class="gacha-history-filter-bar">
            <h3 style="margin:0;">📜 Toàn Bộ Lịch Sử Cầu Nguyện (Đã lưu ${allHistory.length.toLocaleString()} lượt • Tổng: ${(this.totalWishes || allHistory.length).toLocaleString()} Roll)</h3>
            <div class="gacha-history-filters">
              <button class="gacha-filter-btn ${curFilter === 'all' ? 'active' : ''}" onclick="window.tienLenGame.setGachaHistoryFilter('all')">
                Tất cả (${allHistory.length})
              </button>
              <button class="gacha-filter-btn ${curFilter === '5' ? 'active' : ''}" onclick="window.tienLenGame.setGachaHistoryFilter('5')">
                ⭐⭐⭐⭐⭐ 5★ (${count5})
              </button>
              <button class="gacha-filter-btn ${curFilter === '4' ? 'active' : ''}" onclick="window.tienLenGame.setGachaHistoryFilter('4')">
                ⭐⭐⭐⭐ 4★ (${count4})
              </button>
              <button class="gacha-filter-btn ${curFilter === '3' ? 'active' : ''}" onclick="window.tienLenGame.setGachaHistoryFilter('3')">
                ⭐⭐⭐ 3★ (${count3})
              </button>
            </div>
          </div>
          <div class="gacha-history-list full-history-scroll">${historyItemsHtml}</div>
        </div>
      `;
    }

    this.renderInventoryModal();
  }

  renderInventoryModal() {
    const me = this.getLocalPlayer();
    const invBal = document.getElementById('inventory-balance');
    if (invBal && me) {
      invBal.textContent = me.coins.toLocaleString();
    }
    const pauseBal = document.getElementById('pause-balance-display');
    if (pauseBal && me) {
      pauseBal.textContent = me.coins.toLocaleString();
    }
    const lobbyAvatar = document.getElementById('lobby-avatar-preview');
    if (lobbyAvatar) {
      lobbyAvatar.innerHTML = getAvatarHtml(this.equippedAvatar || 'default_player');
    }
    const pauseInvSummary = document.getElementById('pause-inv-summary');
    if (pauseInvSummary) {
      pauseInvSummary.textContent = `5★ Nộ (${this.unlockedBursts.size}/${GENSHIN_BURSTS.length}) • 4★ Decor (${this.unlockedSkins.size}/${ANIME_CARD_SKINS.length}) • 3★ Avatar (${this.unlockedAvatars.size}/${ANIME_AVATARS.length})`;
    }

    const tabBurstsBtn = document.getElementById('tab-btn-bursts');
    const tabSkinsBtn = document.getElementById('tab-btn-skins');
    const tabAvatarsBtn = document.getElementById('tab-btn-avatars');
    if (tabBurstsBtn) {
      tabBurstsBtn.textContent = `⭐⭐⭐⭐⭐ Nhân Vật & Nộ 5★ (${this.unlockedBursts.size}/${GENSHIN_BURSTS.length})`;
    }
    if (tabSkinsBtn) {
      tabSkinsBtn.textContent = `⭐⭐⭐⭐ Decor Bài 4★ (${this.unlockedSkins.size}/${ANIME_CARD_SKINS.length})`;
    }
    if (tabAvatarsBtn) {
      tabAvatarsBtn.textContent = `⭐⭐⭐ Avatar 3★ (${this.unlockedAvatars.size}/${ANIME_AVATARS.length})`;
    }

    const activeInvTab = this.activeInventoryTab || 'bursts';
    const onlyOwned = this.inventoryFilter === 'owned';

    ['bursts', 'skins', 'avatars'].forEach((t) => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === activeInvTab);
    });
    document.getElementById('shop-bursts-grid')?.classList.toggle('hidden', activeInvTab !== 'bursts');
    document.getElementById('shop-skins-grid')?.classList.toggle('hidden', activeInvTab !== 'skins');
    document.getElementById('shop-avatars-grid')?.classList.toggle('hidden', activeInvTab !== 'avatars');

    // Render Thanh Tóm Tắt Trang Bị Hiện Tại (#inventory-equipped-bar)
    const equippedBar = document.getElementById('inventory-equipped-bar');
    if (equippedBar) {
      const currentCharId = this.getPlayerActiveCharId(me);
      const hasChar = currentCharId && currentCharId !== 'none' && CHARACTER_SKILLS[currentCharId];
      const charSkill = hasChar ? CHARACTER_SKILLS[currentCharId] : null;
      const skinMeta = getCardSkinMeta(this.equippedSkin || 'classic');
      const avMeta = ANIME_AVATARS.find((a) => a.id === this.equippedAvatar) || ANIME_AVATARS[0];

      equippedBar.innerHTML = `
        <div class="inv-equip-slot ${activeInvTab === 'bursts' ? 'active-slot' : ''}" onclick="window.tienLenGame.switchInventoryTab('bursts')">
          <div class="inv-equip-thumb">
            ${
              hasChar
                ? `<img src="fanart/${currentCharId}.jpg?v=57" alt="${charSkill.charName}" />`
                : `<span style="font-size:20px;">🔒</span>`
            }
          </div>
          <div class="inv-equip-meta">
            <span class="inv-equip-label">⭐⭐⭐⭐⭐ Nhân Vật &amp; Nộ 5★ Đang Xài</span>
            <strong class="inv-equip-val">${hasChar ? `${charSkill.icon} ${charSkill.charName} (${charSkill.name})` : 'Chưa sở hữu Nộ 5★'}</strong>
          </div>
        </div>
        <div class="inv-equip-slot ${activeInvTab === 'skins' ? 'active-slot' : ''}" onclick="window.tienLenGame.switchInventoryTab('skins')">
          <div class="inv-equip-thumb">
            ${
              skinMeta.imgUrl
                ? `<img src="${skinMeta.imgUrl}" alt="${skinMeta.name}" />`
                : `<span style="font-size:20px;">🃏</span>`
            }
          </div>
          <div class="inv-equip-meta">
            <span class="inv-equip-label">⭐⭐⭐⭐ Decor Bài 4★ Đang Trang Bị</span>
            <strong class="inv-equip-val">${skinMeta.name}</strong>
          </div>
        </div>
        <div class="inv-equip-slot ${activeInvTab === 'avatars' ? 'active-slot' : ''}" onclick="window.tienLenGame.switchInventoryTab('avatars')">
          <div class="inv-equip-thumb">
            ${
              avMeta.imgUrl
                ? `<img src="${avMeta.imgUrl}" alt="${avMeta.name}" />`
                : `<span style="font-size:20px;">${avMeta.emoji || '😎'}</span>`
            }
          </div>
          <div class="inv-equip-meta">
            <span class="inv-equip-label">⭐⭐⭐ Avatar 3★ Đang Dùng</span>
            <strong class="inv-equip-val">${avMeta.name}</strong>
          </div>
        </div>
      `;
    }

    // 1. RENDER TAB KHO ĐỒ 5★ NHÂN VẬT & KỸ NĂNG NỘ
    const burstsGrid = document.getElementById('shop-bursts-grid');
    if (burstsGrid && activeInvTab === 'bursts') {
      const currentCharId = this.getPlayerActiveCharId(me);
      const list = onlyOwned ? GENSHIN_BURSTS.filter((b) => this.unlockedBursts.has(b.id)) : GENSHIN_BURSTS;
      if (list.length === 0) {
        burstsGrid.innerHTML = `
          <div class="inv-empty-notice" style="grid-column: 1 / -1;">
            <div>🔒 Bạn chưa sở hữu Hoạt Ảnh Kỹ Năng Nộ 5★ nào trong Kho Đồ!</div>
            <button class="primary-btn" onclick="window.tienLenGame.openGachaFromInventory()">🌠 Tới Sảnh Cầu Nguyện Mở Khóa 5★ Ngay</button>
          </div>
        `;
      } else {
        burstsGrid.innerHTML = list
          .map((b) => {
            const owned = this.unlockedBursts.has(b.id);
            const isEquipped = owned && currentCharId === b.id;
            const sk = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;

            let actionsHtml = '';
            if (!owned) {
              actionsHtml = `
                <button class="shop-buy-btn buy-btn" onclick="window.tienLenGame.openGachaForCharacter('${b.id}')">
                  🌠 Chưa sở hữu Nộ 5★ ➔ Chọn Banner Cầu Nguyện
                </button>
              `;
            } else {
              actionsHtml = `
                <div class="shop-burst-actions">
                  <button class="shop-buy-btn ${isEquipped ? 'equipped-btn' : 'equip-btn'}" style="width:100%;" onclick="window.tienLenGame.buyOrEquipBurst('${b.id}')">
                    ${isEquipped ? '✅ Đang Xài (Kỹ Năng + Nộ Chặt Heo & Về Nhất)' : '⚡ Trang Bị Nhân Vật Này (Kỹ Năng & Nộ)'}
                  </button>
                </div>
              `;
            }

            return `
              <div class="shop-item-card ${isEquipped ? 'equipped' : ''}">
                <div class="rarity-stars-badge rarity-5">⭐⭐⭐⭐⭐ NHÂN VẬT &amp; NỘ 5★ ${isEquipped ? '• ĐANG XÀI' : owned ? '• ĐÃ SỞ HỮU' : '• CHƯA SỞ HỮU'}</div>
                <div class="shop-burst-preview-wrap">
                  <img src="${b.posterUrl}" alt="${b.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" referrerpolicy="no-referrer" />
                  <button class="shop-burst-preview-btn" onclick="window.tienLenGame.triggerGenshinBurst('${b.id}', '🎬 Xem & Nghe Thử Video Nộ: ${b.name}!')">
                    🔊 Xem Video + Tiếng
                  </button>
                </div>
                <div class="shop-item-title">${b.name}</div>
                <div class="shop-item-desc">${b.desc}</div>
                <div style="font-size:11.5px;color:#fde68a;background:rgba(15,23,42,0.72);border:1px solid rgba(250,204,21,0.35);border-radius:8px;padding:6px 8px;margin-bottom:6px;line-height:1.35;">
                  <strong>${sk.icon} Kỹ Năng [Phím E]: ${sk.name}</strong> — ${sk.shortDesc}
                </div>
                ${actionsHtml}
              </div>
            `;
          })
          .join('');
      }
    }

    // 2. RENDER TAB KHO ĐỒ 4★ DECOR BÀI
    const skinsGrid = document.getElementById('shop-skins-grid');
    if (skinsGrid && activeInvTab === 'skins') {
      const list = onlyOwned ? ANIME_CARD_SKINS.filter((s) => this.unlockedSkins.has(s.id)) : ANIME_CARD_SKINS;
      skinsGrid.innerHTML = list
        .map((skin) => {
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

          const crestHtml = skin.crest ? `<span class="card-anime-crest">${skin.crest}</span>` : '';
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
        })
        .join('');
    }

    // 3. RENDER TAB KHO ĐỒ 3★ AVATAR
    const avatarsGrid = document.getElementById('shop-avatars-grid');
    if (avatarsGrid && activeInvTab === 'avatars') {
      const list = onlyOwned ? ANIME_AVATARS.filter((a) => this.unlockedAvatars.has(a.id)) : ANIME_AVATARS;
      avatarsGrid.innerHTML = list
        .map((av) => {
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
        })
        .join('');
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
    this.saveActiveMatchSnapshot();
    if (this.currentAccountUsername) {
      this.pushAccountToCloud(this.currentAccountUsername);
    }
    this.updateArenaBackdropCharacters();
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
    this.saveActiveMatchSnapshot();
    if (this.currentAccountUsername) {
      this.pushAccountToCloud(this.currentAccountUsername);
    }
    this.updateArenaBackdropCharacters();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  buyOrEquipBurst(burstId) {
    const burst = GENSHIN_BURSTS.find((b) => b.id === burstId);
    if (!burst) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedBursts.has(burstId)) {
      this.openGachaForCharacter(burstId);
      return;
    }

    if (this.isMidMatch() && me.skillUsed && this.getPlayerActiveCharId(me) !== burstId) {
      alert('⛔ Bạn đã dùng Kỹ Năng trong ván này rồi! Chỉ có thể đổi nhân vật ở ván tiếp theo.');
      return;
    }

    sfx.click();
    // Dùng chung 1 nhân vật (đã sở hữu Nộ 5★) cho cả Kỹ Năng Chiến Thuật, Hoạt Ảnh Chặt Heo & Về Nhất!
    this.equippedActiveChar = burstId;
    this.equippedChopBurst = burstId;
    this.equippedWinBurst = burstId;
    me.activeChar = burstId;
    me.chopBurst = burstId;
    me.winBurst = burstId;

    this.saveShopProfile();
    this.saveActiveMatchSnapshot();
    if (this.currentAccountUsername) {
      this.pushAccountToCloud(this.currentAccountUsername);
    }
    this.updateArenaBackdropCharacters();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  // ============================================================================
  // RICK ROLL REWARDED VIDEO AD (XEM VIDEO RICK ROLL NHẬN 1 ROLL = +1,600 XU)
  // ============================================================================
  startRickRollAd() {
    const overlay = document.getElementById('rickroll-ad-overlay');
    const videoEl = document.getElementById('rickroll-video');
    const gifFallback = document.getElementById('rickroll-gif-fallback');
    const audioEl = document.getElementById('rickroll-audio');
    const countdownPill = document.getElementById('ad-countdown-pill');
    const skipBtn = document.getElementById('btn-ad-skip-or-claim');
    const progressFill = document.getElementById('ad-progress-fill');
    const lyricsSub = document.getElementById('ad-lyrics-sub');
    const toastMsg = document.getElementById('ad-toast-msg');

    if (!overlay) return;

    const AD_DURATION = 15;
    const AD_REWARD = AD_REWARD_COINS; // 1,600 Xu (= 1 Roll)
    this.adRemainingSec = AD_DURATION;
    this.adRewardClaimed = false;
    clearInterval(this.adIntervalTimer);

    sfx.bgmPausedForAd = true;
    sfx.stopBGM();
    overlay.classList.remove('hidden');

    if (countdownPill) {
      countdownPill.innerHTML = `⏳ Nhận +1 Roll (${AD_REWARD.toLocaleString()} Xu) sau: <strong>${AD_DURATION}s</strong>`;
    }
    if (skipBtn) {
      skipBtn.textContent = `🔒 Chờ ${AD_DURATION}s...`;
      skipBtn.classList.remove('ready-claim');
    }
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    if (toastMsg) {
      toastMsg.innerHTML = `💡 Xem hết <strong>${AD_DURATION} giây</strong> quảng cáo Rick Roll sẽ được cộng ngay <strong>+1 Roll (+${AD_REWARD.toLocaleString()} Xu)</strong>!`;
    }

    const lyricsTimeline = [
      { at: 0, text: '🎵 “We’re no strangers to love ~ You know the rules and so do I...” 🎵' },
      { at: 3, text: '🕺 “Never gonna give you up ~ Never gonna let you down!” 🎤' },
      { at: 7, text: '🎶 “Never gonna run around and desert you ~” 🕺' },
      { at: 11, text: '🔥 “Never gonna make you cry ~ Never gonna say goodbye!” 👑' },
    ];
    if (lyricsSub) lyricsSub.textContent = lyricsTimeline[0].text;

    // Bật Video Rick Roll (kèm Fallback GIF + MP3 nếu trình duyệt chặn MP4 local)
    if (videoEl) {
      videoEl.classList.remove('hidden');
      gifFallback?.classList.add('hidden');
      videoEl.muted = false;
      videoEl.volume = 0.85;
      try {
        videoEl.currentTime = 42; // Vào thẳng đoạn điệp khúc "Never gonna give you up!"
      } catch (_) {}

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Fallback sang GIF + Audio hoặc WebAudio
          videoEl.classList.add('hidden');
          gifFallback?.classList.remove('hidden');
          if (audioEl) {
            try {
              audioEl.currentTime = 42;
              audioEl.volume = 0.85;
              audioEl.play().catch(() => {});
            } catch (_) {}
          }
        });
      }
      videoEl.onerror = () => {
        videoEl.classList.add('hidden');
        gifFallback?.classList.remove('hidden');
        if (audioEl) {
          try {
            audioEl.currentTime = 42;
            audioEl.volume = 0.85;
            audioEl.play().catch(() => {});
          } catch (_) {}
        }
      };
    }

    let elapsed = 0;
    this.adIntervalTimer = setInterval(() => {
      elapsed++;
      this.adRemainingSec = Math.max(0, AD_DURATION - elapsed);
      const pct = Math.min(100, Math.round((elapsed / AD_DURATION) * 100));
      if (progressFill) progressFill.style.width = `${pct}%`;

      const curLyric = [...lyricsTimeline].reverse().find((l) => elapsed >= l.at);
      if (curLyric && lyricsSub) {
        lyricsSub.textContent = curLyric.text;
      }

      if (this.adRemainingSec > 0) {
        if (countdownPill) {
          countdownPill.innerHTML = `⏳ Nhận +1 Roll (${AD_REWARD.toLocaleString()} Xu) sau: <strong>${this.adRemainingSec}s</strong>`;
        }
        if (skipBtn) {
          skipBtn.textContent = `🔒 Chờ ${this.adRemainingSec}s...`;
        }
      } else {
        clearInterval(this.adIntervalTimer);
        if (!this.adRewardClaimed) {
          this.adRewardClaimed = true;
          const me = this.getLocalPlayer();
          if (me) {
            me.coins += AD_REWARD;
          }
          sfx.win();
          this.saveShopProfile();
          this.renderShopModal();
          this.renderSeats();
          const resBal = document.getElementById('gacha-results-balance');
          if (resBal && me) resBal.textContent = me.coins.toLocaleString();
          this.addLog(
            `🕺 <strong>Quảng Cáo Rick Roll:</strong> Bạn đã nghe Rick Astley hát đủ 15 giây và nhận thưởng <strong>+1 Roll (+${AD_REWARD.toLocaleString()} xu)</strong>!`,
            'log-win'
          );
          this.syncCosmeticsInRoom();
        }
        if (countdownPill) {
          countdownPill.innerHTML = `🎉 <strong>ĐÃ CỘNG +1 ROLL (+${AD_REWARD.toLocaleString()} XU)!</strong>`;
        }
        if (skipBtn) {
          skipBtn.textContent = `✅ Nhận +1 Roll (${AD_REWARD.toLocaleString()} Xu) & Đóng QC`;
          skipBtn.classList.add('ready-claim');
        }
        if (toastMsg) {
          toastMsg.innerHTML = `🎁 <strong>Hoàn tất Quảng Cáo!</strong> Tài khoản của bạn đã được cộng thêm <strong>+1 Roll (+${AD_REWARD.toLocaleString()} Xu)</strong>!`;
        }
      }
    }, 1000);
  }

  stopRickRollAd() {
    clearInterval(this.adIntervalTimer);
    const overlay = document.getElementById('rickroll-ad-overlay');
    const videoEl = document.getElementById('rickroll-video');
    const audioEl = document.getElementById('rickroll-audio');
    if (videoEl) {
      try {
        videoEl.pause();
      } catch (_) {}
    }
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (_) {}
    }
    overlay?.classList.add('hidden');
    sfx.bgmPausedForAd = false;
    if (sfx.bgmEnabled && sfx.enabled) {
      sfx.startBGM();
    }
    sfx.click();
  }

  // ============================================================================
  // HỆ THỐNG 4 NHIỆM VỤ HÀNG NGÀY (ỦY THÁC HIỆP HỘI NHÀ MẠO HIỂM)
  // Mỗi nhiệm vụ hoàn thành nhận 2.5 Roll (+4,000 Xu) • Tổng 4 NV = 10 Roll (+16,000 Xu)
  // ============================================================================
  ensureTodayQuests() {
    const today = this.getTodayKey();
    if (this.dailyQuestsDate !== today || !this.dailyQuestsState) {
      this.dailyQuestsDate = today;
      this.dailyQuestsState = this.getDefaultDailyQuestsState();
      this.saveShopProfile();
    }
  }

  incrementDailyQuest(questId, amount = 1) {
    if (!questId || amount <= 0) return;
    this.ensureTodayQuests();
    const cfg = DAILY_QUESTS_CONFIG.find((q) => q.id === questId);
    if (!cfg) return;
    if (!this.dailyQuestsState[questId]) {
      this.dailyQuestsState[questId] = { progress: 0, claimed: false };
    }
    const qState = this.dailyQuestsState[questId];
    if (qState.claimed || qState.progress >= cfg.target) return;

    const prev = qState.progress || 0;
    qState.progress = Math.min(cfg.target, prev + amount);
    this.saveShopProfile();
    this.renderDailyQuestsUI();

    if (prev < cfg.target && qState.progress >= cfg.target) {
      sfx.win();
      this.addLog(
        `🧭 <strong>Ủy Thác Hàng Ngày Hoàn Thành:</strong> <strong>${cfg.title}</strong> (${cfg.target}/${cfg.target})! Bấm nút <strong>"🧭 Nhiệm Vụ"</strong> để nhận ngay <strong>+${DAILY_QUEST_REWARD_ROLLS} Roll (+${DAILY_QUEST_REWARD_COINS.toLocaleString()} Xu)</strong>!`,
        'log-win'
      );
    }
  }

  claimDailyQuest(questId) {
    this.ensureTodayQuests();
    const cfg = DAILY_QUESTS_CONFIG.find((q) => q.id === questId);
    const qState = this.dailyQuestsState?.[questId];
    if (!cfg || !qState) return;
    if (qState.claimed) return;
    if (qState.progress < cfg.target) {
      // Nếu chưa xong thì đóng bảng nhiệm vụ để người chơi vào bàn làm nhiệm vụ
      document.getElementById('quests-modal')?.classList.add('hidden');
      this.modalShop?.classList.add('hidden');
      sfx.click();
      return;
    }

    qState.claimed = true;
    const me = this.getLocalPlayer();
    if (me) {
      me.coins += DAILY_QUEST_REWARD_COINS;
    }
    sfx.win();
    this.saveShopProfile();
    this.renderDailyQuestsUI();
    this.renderShopModal();
    this.renderSeats();
    this.addLog(
      `🎁 <strong>Nhận Thưởng Nhiệm Vụ:</strong> Đã nhận <strong>+${DAILY_QUEST_REWARD_ROLLS} Roll (+${DAILY_QUEST_REWARD_COINS.toLocaleString()} xu)</strong> từ <strong>${cfg.title}</strong>!`,
      'log-win'
    );
    this.syncCosmeticsInRoom();
  }

  claimAllDailyQuests() {
    this.ensureTodayQuests();
    let claimedCount = 0;
    let totalCoinsGained = 0;

    DAILY_QUESTS_CONFIG.forEach((cfg) => {
      const qState = this.dailyQuestsState?.[cfg.id];
      if (qState && !qState.claimed && qState.progress >= cfg.target) {
        qState.claimed = true;
        claimedCount++;
        totalCoinsGained += DAILY_QUEST_REWARD_COINS;
      }
    });

    if (claimedCount === 0) {
      alert('⏳ Hiện chưa có nhiệm vụ nào hoàn thành chờ nhận thưởng. Hãy đánh thêm vài ván bài để hoàn thành Ủy Thác nhé!');
      return;
    }

    const me = this.getLocalPlayer();
    if (me) {
      me.coins += totalCoinsGained;
    }
    const totalRolls = claimedCount * DAILY_QUEST_REWARD_ROLLS;
    sfx.win();
    this.saveShopProfile();
    this.renderDailyQuestsUI();
    this.renderShopModal();
    this.renderSeats();
    this.addLog(
      `🌟 <strong>Tổng Kết Ủy Thác Hàng Ngày:</strong> Nhận cùng lúc <strong>${claimedCount} nhiệm vụ</strong> = <strong>+${totalRolls} Roll (+${totalCoinsGained.toLocaleString()} xu)</strong>!`,
      'log-win'
    );
    this.syncCosmeticsInRoom();
  }

  openDailyQuestsModal() {
    this.ensureTodayQuests();
    this.renderDailyQuestsUI();
    const modal = document.getElementById('quests-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    sfx.click();
  }

  renderDailyQuestsUI() {
    this.ensureTodayQuests();
    const me = this.getLocalPlayer();

    let completedCount = 0;
    let claimedCount = 0;
    let readyToClaimCount = 0;

    DAILY_QUESTS_CONFIG.forEach((cfg) => {
      const st = this.dailyQuestsState?.[cfg.id] || { progress: 0, claimed: false };
      if (st.progress >= cfg.target) completedCount++;
      if (st.claimed) claimedCount++;
      if (st.progress >= cfg.target && !st.claimed) readyToClaimCount++;
    });

    const badgeText =
      readyToClaimCount > 0 ? `🎁 Nhận ${readyToClaimCount}!` : `${claimedCount}/4`;

    const topBadge = document.getElementById('top-quest-badge');
    if (topBadge) topBadge.textContent = badgeText;
    const lobbyBadge = document.getElementById('lobby-quest-badge');
    if (lobbyBadge) lobbyBadge.textContent = badgeText;

    document.getElementById('btn-top-quests')?.classList.toggle('has-claimable', readyToClaimCount > 0);
    document.getElementById('btn-lobby-quests')?.classList.toggle('has-claimable', readyToClaimCount > 0);

    const tabQuestsBtn = document.getElementById('tab-btn-quests');
    if (tabQuestsBtn) {
      tabQuestsBtn.textContent =
        readyToClaimCount > 0
          ? `🧭 Nhiệm Vụ Ngày (🎁 Nhận ${readyToClaimCount}!)`
          : `🧭 Nhiệm Vụ Ngày (${claimedCount}/4 • 10 Roll)`;
    }

    const bonusBtn = document.getElementById('btn-claim-bonus');
    if (bonusBtn) {
      bonusBtn.classList.toggle('has-claimable', readyToClaimCount > 0);
      bonusBtn.textContent =
        readyToClaimCount > 0
          ? `🎁 Nhận Thưởng Nhiệm Vụ Ngày (${readyToClaimCount} NV × 2.5 Roll chờ nhận!)`
          : `🧭 Nhiệm Vụ Hàng Ngày (${claimedCount}/4 hoàn tất • Tổng 10 Roll / ngày)`;
    }

    const questsBal = document.getElementById('quests-modal-balance');
    if (questsBal && me) {
      questsBal.textContent = me.coins.toLocaleString();
    }

    const claimAllBtn = document.getElementById('btn-claim-all-quests');
    if (claimAllBtn) {
      if (readyToClaimCount > 0) {
        const rollsReady = readyToClaimCount * DAILY_QUEST_REWARD_ROLLS;
        const coinsReady = readyToClaimCount * DAILY_QUEST_REWARD_COINS;
        claimAllBtn.textContent = `🎁 Nhận Tất Cả (+${rollsReady} Roll / +${coinsReady.toLocaleString()} Xu)`;
        claimAllBtn.disabled = false;
      } else if (claimedCount === 4) {
        claimAllBtn.textContent = `✅ Đã Nhận Trọn 10 Roll (+16,000 Xu) Hôm Nay`;
        claimAllBtn.disabled = true;
      } else {
        claimAllBtn.textContent = `⏳ Hoàn thành nhiệm vụ để nhận thưởng`;
        claimAllBtn.disabled = true;
      }
    }

    const earnedRolls = claimedCount * DAILY_QUEST_REWARD_ROLLS;
    const earnedCoins = claimedCount * DAILY_QUEST_REWARD_COINS;

    const cardsHtml = DAILY_QUESTS_CONFIG.map((cfg) => {
      const st = this.dailyQuestsState?.[cfg.id] || { progress: 0, claimed: false };
      const cur = Math.min(cfg.target, st.progress || 0);
      const pct = Math.min(100, Math.round((cur / cfg.target) * 100));
      const isReady = cur >= cfg.target && !st.claimed;
      const isClaimed = !!st.claimed;

      const cardClass = isClaimed ? 'quest-claimed' : isReady ? 'quest-ready' : '';
      let statusLabel = `⏳ Tiến độ: ${cur} / ${cfg.target} ${cfg.unit}`;
      let btnClass = '';
      let btnLabel = '⚔️ Vào bàn làm NV';

      if (isClaimed) {
        statusLabel = '✅ Đã nhận thưởng hôm nay';
        btnClass = 'btn-claimed';
        btnLabel = '✅ Đã nhận 2.5 Roll';
      } else if (isReady) {
        statusLabel = '🌟 Đã hoàn thành! Có thể nhận ngay!';
        btnClass = 'btn-claim-ready';
        btnLabel = `🎁 Nhận +2.5 Roll (+4,000 Xu)`;
      }

      return `
        <div class="daily-quest-card ${cardClass}">
          <div class="daily-quest-top">
            <div class="daily-quest-info">
              <div class="daily-quest-icon">${cfg.icon}</div>
              <div>
                <div class="daily-quest-title">${cfg.title}</div>
                <div class="daily-quest-desc">${cfg.desc}</div>
              </div>
            </div>
            <div class="daily-quest-reward-badge">
              🌠 +${DAILY_QUEST_REWARD_ROLLS} Roll (${DAILY_QUEST_REWARD_COINS.toLocaleString()} Xu)
            </div>
          </div>

          <div class="daily-quest-progress-wrap">
            <div class="daily-quest-progress-labels">
              <span>${statusLabel}</span>
              <span><strong>${cur}/${cfg.target}</strong> (${pct}%)</span>
            </div>
            <div class="daily-quest-progress-bar-bg">
              <div class="daily-quest-progress-bar-fill" style="width:${pct}%;"></div>
            </div>
          </div>

          <div class="daily-quest-bottom">
            <span class="daily-quest-status-text">
              💎 Phần thưởng: <strong style="color:#fde68a;">2.5 Lượt Cầu Nguyện (+4,000 Xu)</strong>
            </span>
            <button class="daily-quest-btn ${btnClass}" onclick="window.tienLenGame.claimDailyQuest('${cfg.id}')">
              ${btnLabel}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const fullHtml = `
      <div class="daily-quests-banner">
        <div class="daily-quests-banner-left">
          <div class="daily-quests-banner-title">
            🧭 SỔ TAY ỦY THÁC HÀNG NGÀY (4 NHIỆM VỤ × 2.5 ROLL = 10 ROLL / NGÀY)
          </div>
          <div class="daily-quests-banner-sub">
            Mỗi nhiệm vụ hoàn thành thưởng <strong>2.5 Roll (+4,000 Xu)</strong>. Làm đủ 4 nhiệm vụ nhận trọn <strong>10 Roll (+16,000 Xu = 1 lần Cầu Nguyện ×10)</strong>! Tự động làm mới mỗi ngày.
          </div>
        </div>
        <div class="daily-quests-summary-pill">
          Đã nhận hôm nay: <strong>${claimedCount}/4 NV</strong><br/>
          🌠 <strong>${earnedRolls} / 10 Roll</strong> (+${earnedCoins.toLocaleString()} / 16,000 Xu)
        </div>
      </div>
      <div class="daily-quests-grid">
        ${cardsHtml}
      </div>
    `;

    const shopQuestsPanel = document.getElementById('shop-quests-panel');
    if (shopQuestsPanel) shopQuestsPanel.innerHTML = fullHtml;
    const modalQuestsPanel = document.getElementById('modal-quests-panel');
    if (modalQuestsPanel) modalQuestsPanel.innerHTML = fullHtml;
  }

  claimFreeBonus() {
    this.openDailyQuestsModal();
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
        activeChar: this.equippedActiveChar || 'none',
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
      nameInput.value = this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername);
      nameInput.addEventListener('change', () => {
        const val = nameInput.value.trim() || this.currentAccountUsername || 'Nhà Lữ Hành';
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

    document.getElementById('btn-top-watch-ad')?.addEventListener('click', () => {
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.startRickRollAd();
    });
    document.getElementById('btn-lobby-watch-ad')?.addEventListener('click', () => this.startRickRollAd());
    document.getElementById('btn-shop-watch-ad')?.addEventListener('click', () => this.startRickRollAd());

    document.getElementById('btn-top-quests')?.addEventListener('click', () => {
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.openDailyQuestsModal();
    });
    document.getElementById('btn-lobby-quests')?.addEventListener('click', () => this.openDailyQuestsModal());
    document.getElementById('btn-close-quests')?.addEventListener('click', () => {
      document.getElementById('quests-modal')?.classList.add('hidden');
      sfx.click();
    });
    document.getElementById('btn-ok-quests')?.addEventListener('click', () => {
      document.getElementById('quests-modal')?.classList.add('hidden');
      sfx.click();
    });
    document.getElementById('btn-quests-to-gacha')?.addEventListener('click', () => {
      document.getElementById('quests-modal')?.classList.add('hidden');
      this.renderShopModal();
      this.modalShop?.classList.remove('hidden');
      this.switchShopTab('gacha');
    });

    document.getElementById('btn-ad-skip-or-claim')?.addEventListener('click', () => {
      if (this.adRemainingSec > 0 && !this.adRewardClaimed) {
        const toastMsg = document.getElementById('ad-toast-msg');
        if (toastMsg) {
          toastMsg.innerHTML = `<span style="color:#fde047;font-weight:800;">😂 Không bỏ qua được đâu! Bạn vừa bị RICK ROLL — hãy nghe Rick Astley hát thêm ${this.adRemainingSec} giây nữa để nhận +1 Roll (+1,600 Xu) nhé!</span>`;
        }
        sfx.pass();
        return;
      }
      this.stopRickRollAd();
    });

    document.getElementById('btn-ad-force-abandon')?.addEventListener('click', () => {
      this.stopRickRollAd();
    });

    if (this.btnShop && this.modalShop) {
      this.btnShop.addEventListener('click', () => {
        if (!this.requireAccountLogin()) return;
        document.getElementById('pause-modal')?.classList.add('hidden');
        this.renderShopModal();
        this.modalShop.classList.remove('hidden');
        this.switchShopTab('gacha');
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
      document.getElementById('tab-btn-quests')?.addEventListener('click', () => this.switchShopTab('quests'));
      document.getElementById('tab-btn-history')?.addEventListener('click', () => this.switchShopTab('history'));

      document.getElementById('btn-claim-bonus')?.addEventListener('click', () => {
        this.claimFreeBonus();
      });
    }

    // Kho Đồ Trang Bị Cá Nhân (#inventory-modal)
    document.getElementById('tab-btn-bursts')?.addEventListener('click', () => this.switchInventoryTab('bursts'));
    document.getElementById('tab-btn-skins')?.addEventListener('click', () => this.switchInventoryTab('skins'));
    document.getElementById('tab-btn-avatars')?.addEventListener('click', () => this.switchInventoryTab('avatars'));
    document.getElementById('btn-close-inventory')?.addEventListener('click', () => this.closeInventoryModal());
    document.getElementById('btn-ok-inventory')?.addEventListener('click', () => this.closeInventoryModal());
    document.getElementById('btn-close-pause')?.addEventListener('click', () => this.closePauseModal());
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => this.closePauseModal());
    document.getElementById('btn-pause-game')?.addEventListener('click', () => this.openPauseModal());

    this.renderDailyQuestsUI();

    document.getElementById('btn-arena-theme')?.addEventListener('click', () => {
      this.cycleArenaTheme();
    });

    document.getElementById('btn-bgm')?.addEventListener('click', () => {
      this.cycleBGMTrack();
    });

    document.getElementById('btn-lobby-bgm')?.addEventListener('click', () => {
      this.cycleBGMTrack();
    });

    // Tự động khởi động Nhạc nền Anime / Genshin ngay ở tương tác đầu tiên của người chơi (click/chạm/phím)
    const autoStartBGM = () => {
      if (sfx.bgmEnabled && sfx.enabled && !sfx.bgmPlaying && !sfx.bgmPausedForAd) {
        sfx.startBGM();
        this.syncBGMButtonsUI();
      }
    };
    window.addEventListener('pointerdown', autoStartBGM, { passive: true });
    window.addEventListener('keydown', autoStartBGM, { passive: true });

    document.getElementById('btn-top-random-bots')?.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) {
        alert('Chỉ Chủ phòng mới có thể đổi nhân vật Bot!');
        return;
      }
      this.randomizeBotCharacters(true);
    });

    const autoRandomChk = document.getElementById('chk-auto-random-bots');
    if (autoRandomChk) {
      autoRandomChk.checked = this.autoRandomizeBots !== false;
    }

    this.btnPlay.addEventListener('click', () => this.onHumanPlay());
    this.btnPass.addEventListener('click', () => this.onHumanPass());
    this.btnSort?.addEventListener('click', () => this.toggleSortMode());
    this.btnUnselect?.addEventListener('click', () => this.clearSelection());
    this.btnHint?.addEventListener('click', () => this.onHumanHint());

    document.getElementById('btn-close-account')?.addEventListener('click', () => {
      if (!this.currentAccountUsername) {
        alert('🔒 Bạn cần Tạo Tài Khoản hoặc Đăng Nhập trước khi vào chơi!');
        return;
      }
      document.getElementById('account-modal')?.classList.add('hidden');
      sfx.click();
    });
    this.syncAccountButtonsUI();

    this.btnCharSkill = document.getElementById('btn-char-skill');
    this.elCharSkillLabel = document.getElementById('char-skill-btn-label');
    if (this.btnCharSkill) {
      this.btnCharSkill.addEventListener('click', () => this.onHumanUseSkill());
    }
    document.getElementById('btn-close-char-detail')?.addEventListener('click', () => {
      document.getElementById('char-skill-detail-modal')?.classList.add('hidden');
      sfx.click();
    });
    document.getElementById('btn-ok-char-detail')?.addEventListener('click', () => {
      document.getElementById('char-skill-detail-modal')?.classList.add('hidden');
      sfx.click();
    });
    document.getElementById('btn-char-detail-open-gacha')?.addEventListener('click', () => {
      document.getElementById('char-skill-detail-modal')?.classList.add('hidden');
      this.renderShopModal();
      this.modalShop?.classList.remove('hidden');
      this.switchShopTab('gacha');
      sfx.click();
    });
    this.btnNewGame.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) {
        alert('Chỉ Chủ phòng mới có thể chia ván mới!');
        return;
      }
      if (this.isMidMatch()) {
        alert('⛔ Đang trong trận đấu! Bạn phải đánh hết ván hiện tại mới được chia ván mới.');
        return;
      }
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.inInitialLobby = false;
      this.startNewMatch(false);
    });

    this.btnWifi.addEventListener('click', async () => {
      if (!this.requireAccountLogin()) return;
      await this.refreshServerInfo();
      if (this.roomId) {
        document.getElementById('share-link-input').value = this.getShareableRoomUrl(this.roomId);
      }
      ['mode-setup-modal', 'pause-modal', 'inventory-modal', 'shop-modal', 'quests-modal', 'rules-modal', 'account-modal', 'char-skill-detail-modal', 'summary-modal'].forEach(
        (id) => document.getElementById(id)?.classList.add('hidden')
      );
      this.modalWifi.classList.remove('hidden');
      this.renderSoloPlayerCountUI();
      this.renderBetTiers();
      this.renderLobbyModal();
      this.updateMidMatchLockUI();
      sfx.click();
    });

    document.getElementById('btn-close-wifi').addEventListener('click', () => {
      if (!this.requireAccountLogin()) return;
      const wasInitial = this.inInitialLobby;
      this.inInitialLobby = false;
      document.getElementById('mode-setup-modal')?.classList.add('hidden');
      this.modalWifi.classList.add('hidden');
      if (!this.isMultiplayer) {
        const curActiveCount = this.players.filter((p) => p.active).length;
        if (wasInitial || this.isGameOver || curActiveCount !== (this.soloPlayerCount || 4)) {
          this.switchToSoloBotMode();
          return;
        }
        this.saveActiveMatchSnapshot();
        this.updateMidMatchLockUI();
        if (!this.isGameOver) {
          clearTimeout(this.botTimer);
          this.promptCurrentTurn();
        }
      }
    });

    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      if (!this.requireAccountLogin()) return;
      if (!this.isMultiplayer && this.isMidMatch()) {
        alert('⛔ Bạn đang đánh dở ván bài! Vui lòng hoàn thành ván hiện tại trước khi Tạo Phòng mới.');
        return;
      }
      this.inInitialLobby = false;
      this.createWifiRoom();
    });

    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const code = (document.getElementById('input-room-code')?.value || '').trim().toUpperCase();
      this.searchMultiplayerRoomById(code);
    });

    document.getElementById('input-room-code')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = (document.getElementById('input-room-code')?.value || '').trim().toUpperCase();
        this.searchMultiplayerRoomById(code);
      }
    });

    document.getElementById('input-join-room-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmJoinPasswordProtectedRoom();
      }
    });

    document.getElementById('btn-copy-link')?.addEventListener('click', async () => {
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

    document.getElementById('btn-leave-room')?.addEventListener('click', () => {
      if (this.isMultiplayer && this.isMidMatch()) {
        alert('⛔ Ván bài trong phòng đang diễn ra! Vui lòng đánh hết ván trước khi rời phòng.');
        return;
      }
      this.leaveWifiRoom(false);
    });

    document.getElementById('btn-solo-bot-mode').addEventListener('click', () => {
      if (!this.requireAccountLogin()) return;
      document.getElementById('mode-setup-modal')?.classList.add('hidden');
      if (!this.isMultiplayer && this.isMidMatch()) {
        // Nếu đang đánh dở ván bài thì chỉ đóng Sảnh Chờ để đánh tiếp, tuyệt đối không reset ván!
        this.modalWifi.classList.add('hidden');
        this.updateMidMatchLockUI();
        clearTimeout(this.botTimer);
        this.promptCurrentTurn();
        sfx.click();
        return;
      }
      this.inInitialLobby = false;
      this.modalWifi.classList.add('hidden');
      this.switchToSoloBotMode();
    });

    document.getElementById('btn-start-wifi-match').addEventListener('click', () => {
      if (!this.isHost) return;
      if (this.isMidMatch()) {
        document.getElementById('mode-setup-modal')?.classList.add('hidden');
        this.modalWifi.classList.add('hidden');
        return;
      }
      const activeCount = this.players.filter((p) => p.active).length;
      if (activeCount < 2) {
        alert('Cần tối thiểu 2 người chơi trong bàn để bắt đầu!');
        return;
      }
      this.inInitialLobby = false;
      document.getElementById('mode-setup-modal')?.classList.add('hidden');
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
      this.inInitialLobby = false;
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
        this.toggleFullscreen();
      });
    }
    document.addEventListener('fullscreenchange', () => this.syncFullscreenButtonsUI());
    document.addEventListener('webkitfullscreenchange', () => this.syncFullscreenButtonsUI());

    this.btnSound.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      this.btnSound.textContent = sfx.enabled ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
      if (sfx.enabled) {
        sfx.click();
        if (sfx.bgmEnabled && !sfx.bgmPausedForAd) {
          sfx.startBGM();
        }
      } else {
        sfx.stopBGM();
      }
      this.syncBGMButtonsUI();
    });

    this.btnRules.addEventListener('click', () => {
      document.getElementById('pause-modal')?.classList.add('hidden');
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
      this.logsData = [];
      if (this.elGameLog) this.elGameLog.innerHTML = '';
      sfx.click();
    });

    window.addEventListener('keydown', (e) => {
      const pauseModal = document.getElementById('pause-modal');
      const invModal = document.getElementById('inventory-modal');

      if (e.code === 'Escape') {
        if (!this.currentAccountUsername) {
          this.openAccountModal(this.accountModalTab || 'register');
          return;
        }
        if (pauseModal && !pauseModal.classList.contains('hidden')) {
          this.closePauseModal();
          return;
        }
        if (invModal && !invModal.classList.contains('hidden')) {
          this.closeInventoryModal();
          return;
        }
        if (this.selectedCardIds.size > 0 || this.mavuikaSelectingCard) {
          this.clearSelection();
          return;
        }
        if (this.modalWifi.classList.contains('hidden')) {
          this.openPauseModal();
          return;
        }
      }

      if (
        !this.modalSummary.classList.contains('hidden') ||
        !this.modalRules.classList.contains('hidden') ||
        !this.modalWifi.classList.contains('hidden') ||
        (this.modalShop && !this.modalShop.classList.contains('hidden')) ||
        (pauseModal && !pauseModal.classList.contains('hidden')) ||
        (invModal && !invModal.classList.contains('hidden'))
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
      } else if (e.key === 'e' || e.key === 'E') {
        if (this.btnCharSkill && !this.btnCharSkill.disabled) {
          e.preventDefault();
          this.onHumanUseSkill();
        }
      }
    });
  }

  isFullscreenActive() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement ||
      this.pseudoFullscreen
    );
  }

  syncFullscreenButtonsUI() {
    const active = this.isFullscreenActive();
    const label = active ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình';
    ['btn-fullscreen', 'btn-top-fullscreen', 'btn-lobby-top-fullscreen', 'btn-mode-fullscreen'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.textContent = label;
        btn.classList.toggle('is-fullscreen', active);
      }
    });
    const dockLabel = document.getElementById('lobby-fullscreen-label');
    if (dockLabel) {
      dockLabel.textContent = active ? 'Thu Nhỏ' : 'Toàn Màn Hình';
    }
  }

  toggleFullscreen() {
    sfx.click();
    const docEl = document.documentElement;
    const isNativeFs = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );

    if (isNativeFs) {
      this.pseudoFullscreen = false;
      document.body.classList.remove('pseudo-fullscreen-mode');
      const exitFn =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
      if (exitFn) {
        Promise.resolve(exitFn.call(document)).catch(() => {}).finally(() => {
          this.syncFullscreenButtonsUI();
        });
      } else {
        this.syncFullscreenButtonsUI();
      }
      return;
    }

    if (this.pseudoFullscreen) {
      this.pseudoFullscreen = false;
      document.body.classList.remove('pseudo-fullscreen-mode');
      this.syncFullscreenButtonsUI();
      return;
    }

    const reqFn =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.msRequestFullscreen;

    if (reqFn) {
      try {
        const res = reqFn.call(docEl, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res
            .then(() => {
              this.syncFullscreenButtonsUI();
            })
            .catch(() => {
              this.pseudoFullscreen = true;
              document.body.classList.add('pseudo-fullscreen-mode');
              window.scrollTo(0, 1);
              this.syncFullscreenButtonsUI();
            });
        } else {
          setTimeout(() => this.syncFullscreenButtonsUI(), 120);
        }
      } catch (e) {
        this.pseudoFullscreen = true;
        document.body.classList.add('pseudo-fullscreen-mode');
        window.scrollTo(0, 1);
        this.syncFullscreenButtonsUI();
      }
    } else {
      // Fallback cho Safari iOS hoặc trình duyệt di động chặn requestFullscreen
      this.pseudoFullscreen = true;
      document.body.classList.add('pseudo-fullscreen-mode');
      window.scrollTo(0, 1);
      this.syncFullscreenButtonsUI();
    }
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

  openModeSetupModal(mode = 'bot') {
    if (!this.requireAccountLogin()) return;
    this.selectLobbyMode(mode);
    const modal = document.getElementById('mode-setup-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeModeSetupModal() {
    document.getElementById('mode-setup-modal')?.classList.add('hidden');
    if (this.roomsDirRefreshTimer) {
      clearInterval(this.roomsDirRefreshTimer);
      this.roomsDirRefreshTimer = null;
    }
    sfx.click();
  }

  selectLobbyMode(mode) {
    this.selectedLobbyMode = mode === 'human' ? 'human' : 'bot';
    const cardBot = document.getElementById('mode-card-bot');
    const cardHuman = document.getElementById('mode-card-human');
    const panelBot = document.getElementById('lobby-bot-panel');
    const panelHuman = document.getElementById('lobby-human-panel');
    const modeLabel = document.getElementById('selected-mode-label');
    const titleEl = document.getElementById('mode-setup-modal-title');
    const subEl = document.getElementById('mode-setup-modal-sub');
    const miniBot = document.getElementById('mini-tab-bot');
    const miniHuman = document.getElementById('mini-tab-human');
    const botFooter = document.getElementById('mode-setup-bot-footer');
    const betSec = document.getElementById('mode-setup-bet-section');
    const createJoinRow = document.getElementById('human-create-join-row');

    cardBot?.classList.toggle('active', this.selectedLobbyMode === 'bot');
    cardHuman?.classList.toggle('active', this.selectedLobbyMode === 'human');
    miniBot?.classList.toggle('active', this.selectedLobbyMode === 'bot');
    miniHuman?.classList.toggle('active', this.selectedLobbyMode === 'human');
    panelBot?.classList.toggle('hidden', this.selectedLobbyMode !== 'bot');
    panelHuman?.classList.toggle('hidden', this.selectedLobbyMode !== 'human');
    botFooter?.classList.toggle('hidden', this.selectedLobbyMode !== 'bot');

    if (titleEl) {
      titleEl.textContent =
        this.selectedLobbyMode === 'bot'
          ? '🤖 CHƠI VỚI BOT (SOLO AI)'
          : '👥 SẢNH NHIỀU NGƯỜI CHƠI (CHỌN BÀN / TẠO PHÒNG / TÌM ID)';
    }
    if (subEl) {
      subEl.textContent =
        this.selectedLobbyMode === 'bot'
          ? 'Chọn số người • Đối thủ Bot 5★ • Mức cược bàn bài'
          : 'Danh sách các bàn đang mở • Tạo phòng có/không mật khẩu • Tìm bàn nhanh theo ID';
    }

    if (this.selectedLobbyMode === 'human' && this.isMultiplayer && this.roomId) {
      createJoinRow?.classList.remove('hidden');
      betSec?.classList.add('hidden');
      document.getElementById('wifi-room-box')?.classList.remove('hidden');
    } else {
      createJoinRow?.classList.remove('hidden');
      betSec?.classList.remove('hidden');
      if (!this.isMultiplayer || !this.roomId) {
        document.getElementById('wifi-room-box')?.classList.add('hidden');
      }
    }

    if (this.selectedLobbyMode === 'human') {
      this.refreshMultiplayerRoomsDirectory(false);
      if (this.roomsDirRefreshTimer) clearInterval(this.roomsDirRefreshTimer);
      this.roomsDirRefreshTimer = setInterval(() => {
        const setupModal = document.getElementById('mode-setup-modal');
        if (this.selectedLobbyMode === 'human' && setupModal && !setupModal.classList.contains('hidden')) {
          this.refreshMultiplayerRoomsDirectory(false);
        }
      }, 4000);
    } else if (this.roomsDirRefreshTimer) {
      clearInterval(this.roomsDirRefreshTimer);
      this.roomsDirRefreshTimer = null;
    }

    if (modeLabel) {
      modeLabel.textContent =
        this.selectedLobbyMode === 'bot'
          ? `Đấu Với Bot (${this.soloPlayerCount || 4} Người)`
          : 'Đấu Với Người (Nhiều Bàn Online)';
    }

    sfx.click();
    this.renderSoloPlayerCountUI();
    this.renderBetTiers();
  }

  // ============================================================================
  // ANIME ARENA THEME & RANDOM BOT CHARACTER SYSTEM (29 NHÂN VẬT GENSHIN)
  // ============================================================================
  selectArenaTheme(themeId) {
    const validThemes = ['inazuma', 'fontaine', 'abyss', 'natlan', 'cryo'];
    this.arenaTheme = validThemes.includes(themeId) ? themeId : 'inazuma';
    sfx.click();
    this.applyArenaThemeUI();
    this.saveShopProfile();
  }

  cycleArenaTheme() {
    const order = ['inazuma', 'fontaine', 'abyss', 'natlan', 'cryo'];
    const idx = order.indexOf(this.arenaTheme || 'inazuma');
    const next = order[(idx + 1) % order.length];
    this.selectArenaTheme(next);
  }

  applyArenaThemeUI() {
    const themeLabels = {
      inazuma: 'Inazuma ⚡',
      fontaine: 'Fontaine 💧',
      abyss: 'Vực Sâu 🌌',
      natlan: 'Natlan 🔥',
      cryo: 'Băng Hoa ❄️',
    };
    const cur = this.arenaTheme || 'inazuma';
    const tableEl = document.getElementById('casino-table');
    if (tableEl) {
      tableEl.classList.remove(
        'arena-theme-inazuma',
        'arena-theme-fontaine',
        'arena-theme-abyss',
        'arena-theme-natlan',
        'arena-theme-cryo'
      );
      tableEl.classList.add(`arena-theme-${cur}`);
    }
    const labelEl = document.getElementById('arena-theme-label');
    if (labelEl) {
      labelEl.textContent = themeLabels[cur] || 'Inazuma ⚡';
    }
    document.querySelectorAll('.arena-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === cur);
    });
    this.syncBGMButtonsUI();
  }

  cycleBGMTrack() {
    const label = sfx.cycleBGM();
    this.syncBGMButtonsUI();
    this.addLog(`🎵 <strong>Nhạc nền Anime:</strong> Đã chuyển sang chế độ <strong>${label}</strong>.`, 'log-play');
  }

  syncBGMButtonsUI() {
    const label = sfx.getBGMLabel();
    const topLabel = document.getElementById('bgm-label');
    if (topLabel) topLabel.textContent = label;
    const lobbyLabel = document.getElementById('lobby-bgm-label');
    if (lobbyLabel) lobbyLabel.textContent = label;
  }

  getBotBurstRoster() {
    // Chỉ những nhân vật có Hoạt Ảnh Kỹ Năng Nộ (Burst Animation) trong GENSHIN_BURSTS mới được làm Bot!
    const burstIds = new Set(GENSHIN_BURSTS.map((b) => b.id));
    return GENSHIN_FANART_ROSTER.filter((c) => burstIds.has(c.id));
  }

  getCharacterBurstForBot(charId) {
    // Mỗi Bot sử dụng chính xác 100% Hoạt Ảnh Kỹ Năng Nộ của chính nhân vật đó!
    if (GENSHIN_BURSTS.some((b) => b.id === charId)) return charId;
    return 'raiden';
  }

  isMidMatch() {
    if (this.isGameOver) return false;
    if (this.inInitialLobby) return false;
    const activeWithCards = (this.players || []).filter(
      (p) => p.active && p.finishRank === null && Array.isArray(p.hand) && p.hand.length > 0
    );
    if (activeWithCards.length < 2) return false;
    if (!this.isMultiplayer) {
      const anyActionTaken =
        !!this.currentCombo ||
        !!this.previousCombo ||
        activeWithCards.some((p) => p.hand.length < 13 || p.passed || p.skillUsed);
      const inLobbyOrSetup =
        (this.modalWifi && !this.modalWifi.classList.contains('hidden')) ||
        !document.getElementById('mode-setup-modal')?.classList.contains('hidden');
      if (!anyActionTaken && inLobbyOrSetup) {
        return false;
      }
    }
    return true;
  }

  updateMidMatchLockUI() {
    const locked = this.isMidMatch();
    if (this.btnNewGame) {
      this.btnNewGame.disabled = locked;
      this.btnNewGame.textContent = locked ? '🔒 Đang trong trận' : '🔄 Ván mới';
      this.btnNewGame.title = locked
        ? '⛔ Đang trong trận! Phải đánh hết ván hiện tại mới được chia ván mới.'
        : 'Chia ván bài mới';
      this.btnNewGame.style.opacity = locked ? '0.55' : '1';
      this.btnNewGame.style.cursor = locked ? 'not-allowed' : 'pointer';
    }
    const btnTopRandom = document.getElementById('btn-top-random-bots');
    if (btnTopRandom) {
      btnTopRandom.disabled = false;
      btnTopRandom.style.opacity = '1';
      btnTopRandom.style.cursor = 'pointer';
      if (locked) {
        if (this.queuedNextMatchBots) {
          const count = this.soloPlayerCount || 4;
          const activeIdxs = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
          const qNames = activeIdxs
            .map((i) => {
              const ch = this.queuedNextMatchBots[i];
              return ch ? `${ch.name.split('(')[0].trim()} ${ch.crest}` : '';
            })
            .filter(Boolean)
            .join(', ');
          btnTopRandom.textContent = `🎲 Trận sau: ${qNames}`;
        } else {
          btnTopRandom.textContent = '🎲 Random Bot Trận Sau';
        }
        btnTopRandom.title =
          'Đang trong trận: Bấm để Random chọn trước nhân vật Bot 5★ cho ván kế tiếp (không làm ảnh hưởng ván đang đánh)!';
      } else {
        btnTopRandom.textContent = '🎲 Đổi Nhân Vật Bot (35 Nhân Vật 5★)';
        btnTopRandom.title = 'Random ngẫu nhiên nhân vật Bot từ 35 nhân vật 5★ có Hoạt Ảnh Kỹ Năng Nộ riêng';
      }
    }
    const btnLobbyRandom = document.getElementById('btn-random-bots');
    if (btnLobbyRandom) {
      btnLobbyRandom.disabled = false;
      btnLobbyRandom.style.opacity = '1';
      btnLobbyRandom.style.cursor = 'pointer';
      btnLobbyRandom.textContent = locked
        ? `🎲 Ngẫu Nhiên Trận Sau (${GENSHIN_BURSTS.length} Nhân Vật)`
        : `🎲 Ngẫu Nhiên (${GENSHIN_BURSTS.length} Nhân Vật)`;
    }
    const botBtn = document.getElementById('btn-solo-bot-mode');
    if (botBtn) {
      if (locked && !this.isMultiplayer) {
        botBtn.textContent = `⚔️ QUAY LẠI BÀN ĐANG ĐẤU (Ván #${this.matchCount} đang diễn ra — Không thể Reset giữa trận!)`;
      } else {
        const b = this.betPerCard || 100;
        const count = this.soloPlayerCount || 4;
        const tierMeta = this.getCurrentBetTierMeta(b);
        botBtn.textContent = `⚔️ VÀO BÀN ĐẤU VỚI BOT NGAY (Bàn ${count} Người • ${tierMeta.name}: ${b.toLocaleString()} Xu/lá)`;
      }
    }
  }

  saveActiveMatchSnapshot() {
    try {
      if (this.isMultiplayer || this.isGameOver || this.inInitialLobby) {
        localStorage.removeItem('tlmn_active_match_v18');
        return;
      }
      const activeWithCards = (this.players || []).filter(
        (p) => p.active && p.finishRank === null && Array.isArray(p.hand) && p.hand.length > 0
      );
      if (activeWithCards.length < 2) {
        localStorage.removeItem('tlmn_active_match_v18');
        return;
      }
      const snapshot = {
        savedAt: Date.now(),
        matchCount: this.matchCount || 1,
        betPerCard: this.betPerCard || 100,
        soloPlayerCount: this.soloPlayerCount || 4,
        lastWinnerId: this.lastWinnerId,
        currentTurn: this.currentTurn,
        currentCombo: this.currentCombo,
        previousCombo: this.previousCombo,
        trickOwnerId: this.trickOwnerId,
        mustPlay3Spade: !!this.mustPlay3Spade,
        chopPot: this.chopPot || 0,
        lastChoppedPlayerId: this.lastChoppedPlayerId,
        roundChoppableStack: Array.isArray(this.roundChoppableStack) ? this.roundChoppableStack : [],
        raidenElectroMarkOwnerId: this.raidenElectroMarkOwnerId ?? null,
        furinaReverseSuitRound: !!this.furinaReverseSuitRound,
        yaeForcePlayRound: !!this.yaeForcePlayRound,
        clorindeDuelPair: this.clorindeDuelPair || null,
        ayakaFrozenPlayerId: this.ayakaFrozenPlayerId ?? null,
        hutaoTaxOwnerId: this.hutaoTaxOwnerId ?? null,
        eulaNextPlayBoost: !!this.eulaNextPlayBoost,
        naviaLockedTargetId: this.naviaLockedTargetId ?? null,
        naviaLockedCardIds: Array.from(this.naviaLockedCardIds || []),
        shenheSingleOnlyRound: !!this.shenheSingleOnlyRound,
        ganyuGapStraightTurn: !!this.ganyuGapStraightTurn,
        kokomiReverseRankRound: !!this.kokomiReverseRankRound,
        yoimiyaBurnTrashReady: !!this.yoimiyaBurnTrashReady,
        turnDirection: this.turnDirection === -1 ? -1 : 1,
        mualaniCrossBeatTurn: !!this.mualaniCrossBeatTurn,
        matchChopCoins: this.matchChopCoins || [0, 0, 0, 0],
        matchChopDetails: this.matchChopDetails || [[], [], [], []],
        firstTurnBadgeText: this.elFirstTurnBadge?.textContent || '',
        logsData: (this.logsData || []).slice(0, 25),
        players: this.players.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          cardSkin: p.cardSkin || 'classic',
          chopBurst: p.chopBurst || 'none',
          winBurst: p.winBurst || 'none',
          activeChar: p.activeChar || 'raiden',
          skillUsed: !!p.skillUsed,
          isBot: !!p.isBot,
          active: !!p.active,
          hand: Array.isArray(p.hand) ? p.hand : [],
          coins: typeof p.coins === 'number' ? p.coins : INITIAL_COINS,
          passed: !!p.passed,
          finishRank: p.finishRank ?? null,
          declinedFourPairsCut: !!p.declinedFourPairsCut,
          clientId: p.clientId || null,
        })),
      };
      localStorage.setItem('tlmn_active_match_v18', JSON.stringify(snapshot));
    } catch (_) {}
  }

  clearActiveMatchSnapshot() {
    try {
      localStorage.removeItem('tlmn_active_match_v18');
    } catch (_) {}
  }

  loadActiveMatchSnapshot() {
    try {
      if (new URLSearchParams(window.location.search).get('room')) return false;
      const raw = localStorage.getItem('tlmn_active_match_v18');
      if (!raw) return false;
      const snap = JSON.parse(raw);
      if (!snap || !Array.isArray(snap.players) || snap.players.length !== 4) {
        return false;
      }
      const activeWithCards = snap.players.filter(
        (p) => p.active && p.finishRank === null && Array.isArray(p.hand) && p.hand.length > 0
      );
      if (activeWithCards.length < 2) {
        localStorage.removeItem('tlmn_active_match_v18');
        return false;
      }

      this.inInitialLobby = false;
      this.isMultiplayer = false;
      this.isHost = true;
      this.roomId = null;
      this.mySeatId = 0;
      this.isGameOver = false;

      this.matchCount = snap.matchCount || 1;
      this.betPerCard = snap.betPerCard || this.savedBetPerCard || 100;
      this.soloPlayerCount = snap.soloPlayerCount || this.savedSoloPlayerCount || 4;
      this.lastWinnerId = snap.lastWinnerId ?? null;
      this.currentTurn = typeof snap.currentTurn === 'number' ? snap.currentTurn : 0;
      this.currentCombo = snap.currentCombo || null;
      this.previousCombo = snap.previousCombo || null;
      this.trickOwnerId = snap.trickOwnerId ?? null;
      this.mustPlay3Spade = !!snap.mustPlay3Spade;
      this.chopPot = snap.chopPot || 0;
      this.lastChoppedPlayerId = snap.lastChoppedPlayerId ?? null;
      this.roundChoppableStack = Array.isArray(snap.roundChoppableStack) ? snap.roundChoppableStack : [];
      this.raidenElectroMarkOwnerId = snap.raidenElectroMarkOwnerId ?? null;
      this.furinaReverseSuitRound = !!snap.furinaReverseSuitRound;
      activeFurinaReverseSuit = this.furinaReverseSuitRound;
      this.yaeForcePlayRound = !!snap.yaeForcePlayRound;
      this.clorindeDuelPair = Array.isArray(snap.clorindeDuelPair) ? snap.clorindeDuelPair : null;
      this.ayakaFrozenPlayerId = snap.ayakaFrozenPlayerId ?? null;
      this.hutaoTaxOwnerId = snap.hutaoTaxOwnerId ?? null;
      this.eulaNextPlayBoost = !!snap.eulaNextPlayBoost;
      this.naviaLockedTargetId = snap.naviaLockedTargetId ?? null;
      this.naviaLockedCardIds = new Set(Array.isArray(snap.naviaLockedCardIds) ? snap.naviaLockedCardIds : []);
      activeNaviaLockedCardIds = this.naviaLockedCardIds;
      this.shenheSingleOnlyRound = !!snap.shenheSingleOnlyRound;
      activeShenheSingleOnly = this.shenheSingleOnlyRound;
      this.ganyuGapStraightTurn = !!snap.ganyuGapStraightTurn;
      activeGanyuGapStraight = this.ganyuGapStraightTurn;
      this.kokomiReverseRankRound = !!snap.kokomiReverseRankRound;
      activeKokomiReverseRank = this.kokomiReverseRankRound;
      this.yoimiyaBurnTrashReady = !!snap.yoimiyaBurnTrashReady;
      this.turnDirection = snap.turnDirection === -1 ? -1 : 1;
      this.mualaniCrossBeatTurn = !!snap.mualaniCrossBeatTurn;
      activeMualaniCrossBeat = this.mualaniCrossBeatTurn;
      this.yelanRevealedByPlayer = {};
      this.matchChopCoins = Array.isArray(snap.matchChopCoins) ? snap.matchChopCoins : [0, 0, 0, 0];
      this.matchChopDetails = Array.isArray(snap.matchChopDetails) ? snap.matchChopDetails : [[], [], [], []];
      this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
      this.selectedCardIds.clear();
      this.companionCardIds.clear();

      this.players = snap.players.map((p, idx) => ({
        id: idx,
        name:
          idx === 0
            ? this.resolveCleanPlayerName(this.savedPlayerName || p.name, this.currentAccountUsername)
            : p.name || `Bot #${idx}`,
        avatar: idx === 0 ? this.equippedAvatar : p.avatar || 'raiden',
        cardSkin: idx === 0 ? this.equippedSkin : p.cardSkin || 'raiden',
        chopBurst: idx === 0 ? this.equippedChopBurst : p.chopBurst || 'raiden',
        winBurst: idx === 0 ? this.equippedWinBurst : p.winBurst || 'raiden',
        activeChar: idx === 0 ? p.activeChar || this.equippedActiveChar || 'raiden' : p.activeChar || p.chopBurst || p.cardSkin || 'raiden',
        skillUsed: !!p.skillUsed,
        isBot: idx === 0 ? false : !!p.isBot,
        active: !!p.active,
        hand: Array.isArray(p.hand) ? p.hand : [],
        coins: idx === 0 ? this.savedCoins : typeof p.coins === 'number' ? p.coins : INITIAL_COINS,
        passed: !!p.passed,
        finishRank: p.finishRank ?? null,
        declinedFourPairsCut: !!p.declinedFourPairsCut,
        clientId: idx === 0 ? 'host' : p.clientId || null,
      }));

      // Giữ Sảnh Chờ mở khi mới vào game để người chơi luôn thấy Sảnh Chờ đầu tiên
      this.modalWifi?.classList.remove('hidden');
      this.modalSummary?.classList.add('hidden');
      this.btnShowSummary?.classList.add('hidden');

      const b = this.betPerCard || 100;
      const tierMeta = this.getCurrentBetTierMeta(b);
      const activePlayers = this.getActivePlayers();
      if (this.elMatchInfo) {
        this.elMatchInfo.textContent = `Ván #${this.matchCount} • Bàn ${activePlayers.length} Người • ${tierMeta.name} (${b.toLocaleString()} xu/lá)`;
      }
      if (this.elFirstTurnBadge && snap.firstTurnBadgeText) {
        this.elFirstTurnBadge.textContent = snap.firstTurnBadgeText;
      }
      if (Array.isArray(snap.logsData) && this.elGameLog) {
        this.logsData = snap.logsData;
        this.elGameLog.innerHTML = this.logsData
          .map((l) => `<div class="log-item ${l.cssClass}">${l.message}</div>`)
          .join('');
      }
      this.addLog(
        `🔒 <strong>Chống Reset Giữa Trận:</strong> Đã khôi phục nguyên trạng <strong>Ván #${this.matchCount}</strong> đang đánh dở!`,
        'log-win'
      );

      this.updateArenaBackdropCharacters();
      this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
      this.renderSoloPlayerCountUI();
      this.renderAll();
      this.updateMidMatchLockUI();
      return true;
    } catch (_) {
      return false;
    }
  }

  getPlayerActiveCharId(player) {
    if (!player) {
      return this.equippedActiveChar && this.unlockedBursts?.has(this.equippedActiveChar)
        ? this.equippedActiveChar
        : 'none';
    }
    // Người chơi chính: CHỈ được xài nhân vật & kỹ năng của nhân vật mà mình ĐANG SỞ HỮU Hoạt Ảnh Nộ 5★!
    if (player.id === this.mySeatId && !player.isBot) {
      const candidates = [
        player.activeChar,
        this.equippedActiveChar,
        this.equippedChopBurst,
        this.equippedWinBurst,
        player.chopBurst,
        player.winBurst,
      ];
      for (const id of candidates) {
        if (id && CHARACTER_SKILLS[id] && this.unlockedBursts.has(id)) {
          return id;
        }
      }
      if (this.unlockedBursts && this.unlockedBursts.size > 0) {
        const firstOwned = Array.from(this.unlockedBursts).find((id) => CHARACTER_SKILLS[id]);
        if (firstOwned) return firstOwned;
      }
      return 'none';
    }
    // Khách trong phòng Multiplayer (không phải Bot): lấy theo Burst nhân vật họ đang trang bị
    if (!player.isBot) {
      const guestCandidates = [player.activeChar, player.chopBurst, player.winBurst];
      for (const id of guestCandidates) {
        if (id && CHARACTER_SKILLS[id]) return id;
      }
      return 'none';
    }
    // Bot AI (luôn là 1 trong 10 nhân vật 5★ có Nộ riêng)
    const botCandidates = [
      player.activeChar,
      player.chopBurst,
      player.winBurst,
      player.cardSkin,
      player.avatar,
    ];
    for (const id of botCandidates) {
      if (id && CHARACTER_SKILLS[id]) return id;
    }
    return 'raiden';
  }

  getPlayerElement(player, combo = null) {
    if (player) {
      const activeId = this.getPlayerActiveCharId(player);
      if (activeId && CHARACTER_ELEMENTS[activeId]) return CHARACTER_ELEMENTS[activeId];
      const candidates = [player.chopBurst, player.winBurst, player.avatar, player.cardSkin];
      for (const id of candidates) {
        if (id && CHARACTER_ELEMENTS[id]) return CHARACTER_ELEMENTS[id];
      }
    }
    if (combo && combo.highCard) {
      const suit = combo.highCard.suit;
      if (suit === '♥') return 'pyro';
      if (suit === '♦') return 'electro';
      if (suit === '♣') return 'cryo';
      if (suit === '♠') return 'hydro';
    }
    return 'electro';
  }

  getSpecialPlayReaction(player, combo) {
    const attackerElem = this.getPlayerElement(player, combo);
    let defenderElem = null;
    if (this.currentCombo && this.trickOwnerId !== null && this.trickOwnerId !== player.id) {
      defenderElem = this.getPlayerElement(this.players[this.trickOwnerId], this.currentCombo);
    }
    if (!defenderElem || defenderElem === attackerElem) {
      const themeMap = {
        inazuma: 'electro',
        fontaine: 'hydro',
        natlan: 'pyro',
        cryo: 'cryo',
        abyss: 'hydro',
      };
      const fallbackOrder = [
        themeMap[this.arenaTheme || 'inazuma'] || 'hydro',
        combo?.highCard?.suit === '♥'
          ? 'pyro'
          : combo?.highCard?.suit === '♦'
          ? 'electro'
          : combo?.highCard?.suit === '♣'
          ? 'cryo'
          : 'hydro',
        'hydro',
        'pyro',
        'cryo',
        'electro',
      ];
      defenderElem = fallbackOrder.find((e) => e !== attackerElem) || 'hydro';
    }
    return resolveGenshinReaction(attackerElem, defenderElem);
  }

  toggleAutoRandomBots(checked) {
    this.autoRandomizeBots = !!checked;
    sfx.click();
    this.saveShopProfile();
  }

  randomizeBotCharacters(notify = false) {
    if (!this.players || this.players.length < 4) return;
    const pool = [...this.getBotBurstRoster()]; // 10 Nhân vật 5★ có Burst Animation riêng (tỉ lệ đều nhau 100%, không ưu tiên con nào)
    // Thuật toán trộn bài Fisher-Yates chuẩn xác 100% không thiên vị
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, 3);

    if (this.isMidMatch()) {
      // Đang chơi giữa trận: Cho phép Random chọn trước nhân vật Bot cho VÁN TIẾP THEO mà không phá ván đang đánh!
      this.queuedNextMatchBots = {
        1: picked[0] || pool[0],
        2: picked[1] || pool[1 % pool.length],
        3: picked[2] || pool[2 % pool.length],
      };
      sfx.click();
      const count = this.soloPlayerCount || 4;
      const activeIdxs = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
      const queuedPlain = activeIdxs
        .map((i) => {
          const ch = this.queuedNextMatchBots[i];
          return ch ? `Bot ${ch.name.split('(')[0].trim()} ${ch.crest}` : '';
        })
        .filter(Boolean);
      const queuedHtml = queuedPlain.map((n) => `<strong>${n}</strong>`).join(', ');
      this.showComboBanner(`🎲 BOT TRẬN SAU: ${queuedPlain.join(' • ').toUpperCase()}!`);
      this.addLog(
        `🎲 <strong>[Random Bot Trận Sau]</strong> Đã chọn trước đối thủ cho <strong>Ván #${
          (this.matchCount || 1) + 1
        }</strong>: ${queuedHtml} <em>(Sẽ vào bàn ngay khi ván hiện tại kết thúc)</em>!`,
        'log-win'
      );
      this.preloadActiveBurstVideos();
      this.renderSoloPlayerCountUI();
      this.updateMidMatchLockUI();
      return;
    }

    this.queuedNextMatchBots = null;
    [1, 2, 3].forEach((seatIdx, idx) => {
      const p = this.players[seatIdx];
      const ch = picked[idx] || pool[idx % pool.length];
      if (!p || !ch) return;
      if (!this.isMultiplayer || p.isBot) {
        const shortName = ch.name.split('(')[0].trim();
        p.name = `Bot ${shortName} ${ch.crest}`;
        p.avatar = ch.id;
        p.cardSkin = ch.id;
        // Bot xài chính xác 100% Kỹ Năng Nộ 5★ của chính nhân vật đó!
        p.chopBurst = ch.id;
        p.winBurst = ch.id;
        p.activeChar = ch.id;
      }
    });

    this.updateArenaBackdropCharacters();
    this.preloadActiveBurstVideos();
    this.renderSoloPlayerCountUI();
    this.renderSeats();
    if (this.isMultiplayer && this.isHost) {
      this.renderLobbyModal();
      this.broadcastState();
    }

    if (notify) {
      sfx.click();
      const activeBots = this.players.filter((p, i) => i > 0 && p.active && p.isBot);
      const names = (activeBots.length > 0 ? activeBots : [this.players[2]])
        .map((b) => `<strong>${b.name}</strong>`)
        .join(', ');
      this.addLog(
        `🎲 <strong>Random Đối Thủ Bot (${GENSHIN_BURSTS.length} Nhân Vật Có Nộ 5★):</strong> Bàn đấu hiện tại gồm ${names}!`,
        'log-win'
      );
    }
    this.updateMidMatchLockUI();
    this.syncSummaryBotNamesUI();
  }

  openBotPickerModal(preferredSeatIdx = null, fromSummary = false) {
    sfx.click();
    const count = this.soloPlayerCount || 4;
    const activeSeats = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
    this.activeBotPickerSeat = activeSeats.includes(Number(preferredSeatIdx))
      ? Number(preferredSeatIdx)
      : activeSeats[0];
    this.botPickerFromSummary = !!fromSummary;
    this.renderBotPickerModal();
    document.getElementById('bot-picker-modal')?.classList.remove('hidden');
  }

  closeBotPickerModal() {
    sfx.click();
    document.getElementById('bot-picker-modal')?.classList.add('hidden');
  }

  randomizeBotFromPicker() {
    this.randomizeBotCharacters(true);
    this.renderBotPickerModal();
    if (this.botPickerFromSummary) {
      this.showSummaryBotStatus(`🎲 Đã đổi ngẫu nhiên đối thủ Bot: ${this.getActiveBotNamesPlain()}`);
    }
  }

  selectBotCharacterForSeat(seatIdx, charId) {
    const roster = this.getBotBurstRoster();
    const ch = roster.find((c) => c.id === charId);
    if (!ch || !this.players || !this.players[seatIdx]) return;
    sfx.click();

    if (this.isMidMatch()) {
      if (!this.queuedNextMatchBots) {
        this.queuedNextMatchBots = {
          1: roster.find((c) => c.id === this.players[1]?.activeChar) || roster[0],
          2: roster.find((c) => c.id === this.players[2]?.activeChar) || roster[1 % roster.length],
          3: roster.find((c) => c.id === this.players[3]?.activeChar) || roster[2 % roster.length],
        };
      }
      this.queuedNextMatchBots[seatIdx] = ch;
    } else {
      this.queuedNextMatchBots = null;
      const p = this.players[seatIdx];
      const shortName = ch.name.split('(')[0].trim();
      p.name = `Bot ${shortName} ${ch.crest}`;
      p.avatar = ch.id;
      p.cardSkin = ch.id;
      p.chopBurst = ch.id;
      p.winBurst = ch.id;
      p.activeChar = ch.id;
      this.updateArenaBackdropCharacters();
      this.renderSeats();
    }

    this.preloadActiveBurstVideos();
    this.renderSoloPlayerCountUI();
    this.updateMidMatchLockUI();
    this.syncSummaryBotNamesUI();

    const count = this.soloPlayerCount || 4;
    const activeSeats = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
    const curPos = activeSeats.indexOf(seatIdx);
    if (activeSeats.length > 1 && curPos >= 0 && curPos < activeSeats.length - 1) {
      this.activeBotPickerSeat = activeSeats[curPos + 1];
    }
    this.renderBotPickerModal();

    if (this.botPickerFromSummary) {
      this.showSummaryBotStatus(`🎯 Đã chọn đối thủ Bot: ${this.getActiveBotNamesPlain()}`);
    }
  }

  renderBotPickerModal() {
    const tabsEl = document.getElementById('bot-picker-seat-tabs');
    const gridEl = document.getElementById('bot-picker-grid');
    const summaryEl = document.getElementById('bot-picker-footer-summary');
    if (!tabsEl || !gridEl) return;

    const count = this.soloPlayerCount || 4;
    const activeSeats = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
    if (!activeSeats.includes(this.activeBotPickerSeat)) {
      this.activeBotPickerSeat = activeSeats[0];
    }
    const seatLabels = { 1: 'Ghế Trái', 2: count === 2 ? 'Ghế Đối Diện (1v1)' : 'Ghế Đối Diện', 3: 'Ghế Phải' };
    const locked = this.isMidMatch();

    const getSeatCharId = (sIdx) => {
      if (locked && this.queuedNextMatchBots && this.queuedNextMatchBots[sIdx]) {
        return this.queuedNextMatchBots[sIdx].id;
      }
      return this.players?.[sIdx]?.activeChar || this.players?.[sIdx]?.cardSkin || 'raiden';
    };

    tabsEl.innerHTML = activeSeats
      .map((sIdx) => {
        const cid = getSeatCharId(sIdx);
        const sk = CHARACTER_SKILLS[cid];
        const isSelectedTab = sIdx === this.activeBotPickerSeat;
        return `
          <button type="button" onclick="window.tienLenGame.activeBotPickerSeat=${sIdx};window.tienLenGame.renderBotPickerModal();" style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:12px;cursor:pointer;border:2px solid ${
            isSelectedTab ? '#38bdf8' : 'rgba(148,163,184,0.3)'
          };background:${
            isSelectedTab ? 'linear-gradient(135deg,rgba(2,132,199,0.38),rgba(37,99,235,0.32))' : 'rgba(15,23,42,0.75)'
          };color:#f8fafc;box-shadow:${isSelectedTab ? '0 0 14px rgba(56,189,248,0.4)' : 'none'};">
            <img src="fanart/${cid}.jpg?v=57" alt="${sk ? sk.charName : cid}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 18%;border:1.5px solid #38bdf8;" />
            <div style="text-align:left;">
              <div style="font-size:11px;color:#93c5fd;font-weight:700;">${seatLabels[sIdx]} ${isSelectedTab ? '• Đang chọn' : ''}</div>
              <div style="font-size:13.5px;font-weight:800;color:#fff;">Bot ${sk ? `${sk.charName} ${sk.crest}` : cid}</div>
            </div>
          </button>
        `;
      })
      .join('');

    const activeSeat = this.activeBotPickerSeat;
    const currentSeatCharId = getSeatCharId(activeSeat);
    const otherSeatMap = {};
    activeSeats.forEach((sIdx) => {
      if (sIdx !== activeSeat) {
        otherSeatMap[getSeatCharId(sIdx)] = seatLabels[sIdx];
      }
    });

    const roster = this.getBotBurstRoster();
    gridEl.innerHTML = roster
      .map((ch) => {
        const sk = CHARACTER_SKILLS[ch.id];
        const isCurrent = ch.id === currentSeatCharId;
        const otherSeatLabel = otherSeatMap[ch.id];
        const shortName = ch.name.split('(')[0].trim();
        return `
          <div onclick="window.tienLenGame.selectBotCharacterForSeat(${activeSeat}, '${ch.id}')" title="${
            sk ? `${sk.name}: ${sk.shortDesc}` : ch.desc
          }" style="display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:12px;cursor:pointer;transition:transform 0.15s;border:2px solid ${
            isCurrent ? '#facc15' : otherSeatLabel ? '#a855f7' : 'rgba(148,163,184,0.22)'
          };background:${
            isCurrent
              ? 'linear-gradient(135deg,rgba(234,179,8,0.26),rgba(15,23,42,0.92))'
              : 'rgba(15,23,42,0.78)'
          };">
            <div style="display:flex;align-items:center;gap:9px;">
              <img src="fanart/${ch.id}.jpg?v=57" alt="${shortName}" loading="lazy" style="width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid ${
                isCurrent ? '#facc15' : '#38bdf8'
              };flex-shrink:0;" />
              <div style="min-width:0;flex:1;">
                <div style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${ch.crest} ${shortName}
                </div>
                <div style="font-size:11px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${sk ? sk.name : ''}
                </div>
              </div>
            </div>
            <div style="font-size:10.5px;color:#94a3b8;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${sk ? sk.shortDesc : ch.desc}
            </div>
            ${
              isCurrent
                ? `<div style="font-size:11px;font-weight:800;color:#fde047;text-align:center;background:rgba(234,179,8,0.18);border-radius:6px;padding:2px 4px;">✅ Đang chọn cho ${seatLabels[activeSeat]}</div>`
                : otherSeatLabel
                ? `<div style="font-size:10.5px;font-weight:700;color:#d8b4fe;text-align:center;background:rgba(168,85,247,0.18);border-radius:6px;padding:2px 4px;">Đang ở ${otherSeatLabel}</div>`
                : ''
            }
          </div>
        `;
      })
      .join('');

    if (summaryEl) {
      summaryEl.innerHTML = `Đội hình Bot hiện tại: <strong>${this.getActiveBotNamesPlain()}</strong>`;
    }
  }

  getActiveBotNamesPlain() {
    const count = this.soloPlayerCount || 4;
    const activeSeats = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
    const locked = this.isMidMatch();
    return activeSeats
      .map((sIdx) => {
        if (locked && this.queuedNextMatchBots && this.queuedNextMatchBots[sIdx]) {
          const ch = this.queuedNextMatchBots[sIdx];
          return `Bot ${ch.name.split('(')[0].trim()} ${ch.crest}`;
        }
        return this.players?.[sIdx]?.name || `Bot #${sIdx}`;
      })
      .join(' • ');
  }

  syncSummaryBotNamesUI() {
    const namesEl = document.getElementById('summary-current-bots-names');
    if (namesEl) {
      namesEl.textContent = this.getActiveBotNamesPlain();
    }
  }

  resetSummaryBotPrompt() {
    const box = document.getElementById('summary-bot-prompt-box');
    const stepAsk = document.getElementById('summary-bot-step-ask');
    const stepActions = document.getElementById('summary-bot-step-actions');
    const statusMsg = document.getElementById('summary-bot-status-msg');
    if (box) {
      box.classList.toggle('hidden', !!this.isMultiplayer);
    }
    this.syncSummaryBotNamesUI();
    stepAsk?.classList.remove('hidden');
    stepActions?.classList.add('hidden');
    if (statusMsg) {
      statusMsg.classList.add('hidden');
      statusMsg.textContent = '';
    }
  }

  showSummaryBotStatus(msg) {
    const statusMsg = document.getElementById('summary-bot-status-msg');
    if (statusMsg) {
      statusMsg.innerHTML = msg;
      statusMsg.classList.remove('hidden');
    }
  }

  onSummaryWantChangeBot(wantChange) {
    sfx.click();
    const stepAsk = document.getElementById('summary-bot-step-ask');
    const stepActions = document.getElementById('summary-bot-step-actions');
    if (!wantChange) {
      this.autoRandomizeBots = false;
      this.queuedNextMatchBots = null;
      stepAsk?.classList.add('hidden');
      stepActions?.classList.add('hidden');
      this.showSummaryBotStatus(
        `✅ Đã giữ nguyên đối thủ Bot hiện tại (<strong>${this.getActiveBotNamesPlain()}</strong>). Bấm <a href="javascript:void(0)" onclick="window.tienLenGame.onSummaryWantChangeBot(true)" style="color:#fde047;text-decoration:underline;margin-left:6px;">Đổi Bot</a> nếu muốn chọn lại.`
      );
      return;
    }
    stepAsk?.classList.add('hidden');
    stepActions?.classList.remove('hidden');
    this.showSummaryBotStatus('💡 Hãy chọn <strong>🎲 Ngẫu Nhiên</strong> hoặc <strong>🎯 Chọn Bot</strong> bên trên:');
  }

  onSummaryRandomBot() {
    this.randomizeBotCharacters(true);
    this.syncSummaryBotNamesUI();
    this.showSummaryBotStatus(
      `🎲 Đã đổi ngẫu nhiên sang: <strong>${this.getActiveBotNamesPlain()}</strong>! (Bấm 🎲 Ngẫu Nhiên để xoay tiếp hoặc bấm 🃏 Chia Ván Tiếp Theo)`
    );
  }

  applyQueuedNextMatchBots() {
    if (!this.queuedNextMatchBots || !this.players || this.players.length < 4) return;
    [1, 2, 3].forEach((seatIdx) => {
      const p = this.players[seatIdx];
      const ch = this.queuedNextMatchBots[seatIdx];
      if (!p || !ch) return;
      if (!this.isMultiplayer || p.isBot) {
        const shortName = ch.name.split('(')[0].trim();
        p.name = `Bot ${shortName} ${ch.crest}`;
        p.avatar = ch.id;
        p.cardSkin = ch.id;
        p.chopBurst = ch.id;
        p.winBurst = ch.id;
        p.activeChar = ch.id;
      }
    });
    this.queuedNextMatchBots = null;
    this.updateArenaBackdropCharacters();
    this.preloadActiveBurstVideos();
    this.renderSoloPlayerCountUI();
    this.renderSeats();
    this.updateMidMatchLockUI();
  }

  updateArenaBackdropCharacters() {
    if (!this.players || this.players.length < 4) return;
    const me = this.getLocalPlayer();
    const myCharId = this.getPlayerActiveCharId(me);

    // Đồng bộ nhân vật của người chơi vào cả activeChar, chopBurst và winBurst
    if (me) {
      me.activeChar = myCharId;
      me.chopBurst = myCharId;
      me.winBurst = myCharId;
    }
    this.equippedActiveChar = myCharId;
    this.equippedChopBurst = myCharId;
    this.equippedWinBurst = myCharId;

    const leftEl = document.getElementById('arena-char-left');
    const rightEl = document.getElementById('arena-char-right');
    if (leftEl) {
      const leftArtId =
        myCharId && myCharId !== 'none'
          ? myCharId
          : me?.cardSkin && me.cardSkin !== 'classic'
          ? me.cardSkin
          : 'raiden';
      leftEl.style.backgroundImage = `url('fanart/${leftArtId}.jpg?v=57')`;
    }
    if (rightEl) {
      const activeOpponents = this.players.filter((p) => p.active && p.id !== this.mySeatId);
      const mainOpp = activeOpponents.find((p) => p.id === 2) || activeOpponents[0] || this.players[2];
      const oppCharId = this.getPlayerActiveCharId(mainOpp);
      const rightArtId = oppCharId && oppCharId !== 'none' ? oppCharId : 'furina';
      rightEl.style.backgroundImage = `url('fanart/${rightArtId}.jpg?v=57')`;
    }
  }

  openPlayerSkillInspect(visualSlot = 0) {
    const playerId = (this.mySeatId + visualSlot) % 4;
    const p = this.players[playerId];
    if (!p) return;

    const modal = document.getElementById('char-skill-detail-modal');
    const titleEl = document.getElementById('char-detail-modal-title');
    const bodyEl = document.getElementById('char-detail-modal-body');
    if (!modal || !bodyEl) return;

    sfx.click();
    const isMe = p.id === this.mySeatId && !p.isBot;
    const charId = this.getPlayerActiveCharId(p);
    const hasChar = charId && charId !== 'none' && CHARACTER_SKILLS[charId];
    const sk = hasChar ? CHARACTER_SKILLS[charId] : null;
    const burstMeta = hasChar ? getBurstMeta(charId) : null;

    if (titleEl) {
      titleEl.innerHTML = isMe
        ? `⚡ NHÂN VẬT &amp; KỸ NĂNG BẠN ĐANG XÀI`
        : `🔍 CHI TIẾT NHÂN VẬT CỦA ${p.name.toUpperCase()}`;
    }

    let heroHtml = '';
    if (hasChar && sk) {
      const statusBadge = sk.isPassiveBet
        ? `<span style="color:#38bdf8;font-weight:800;">💠 Nhân Vật 5★ Thường (Lệch Rate) • Nội Tại Cược Tự Động &amp; Có Hoạt Ảnh Nộ 5★</span>`
        : p.skillUsed
        ? `<span style="color:#f87171;font-weight:800;">⚪ Đã dùng Kỹ Năng trong ván này (0/1)</span>`
        : `<span style="color:#4ade80;font-weight:800;">🟢 Sẵn sàng kích hoạt trong ván này (1/1)</span>`;

      heroHtml = `
        <div class="char-detail-hero">
          <img class="char-detail-art" src="fanart/${charId}.jpg?v=61" alt="${sk.charName}" />
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:900;color:#fde047;letter-spacing:0.5px;text-transform:uppercase;">
              ${isMe ? '👑 NHÂN VẬT 5★ BẠN ĐANG SỬ DỤNG' : `🎭 NHÂN VẬT ĐANG XÀI CỦA ${p.name.toUpperCase()}`}
            </div>
            <div style="font-size:18px;font-weight:900;color:#fff;margin-top:2px;">
              ${sk.icon} ${sk.charName}
            </div>
            <div style="font-size:12px;margin-top:3px;">${statusBadge}</div>
            ${
              burstMeta
                ? `<div style="margin-top:6px;">
                    <button class="tool-btn" onclick="window.tienLenGame.triggerGenshinBurst('${charId}', '🎬 Xem thử Hoạt Ảnh Nộ 5★: ${sk.charName}!')">
                      🔊 Xem Thử Hoạt Ảnh Nộ 5★ (${burstMeta.title})
                    </button>
                  </div>`
                : ''
            }
          </div>
        </div>

        <div class="char-detail-skill-box">
          <div style="font-size:13.5px;font-weight:900;color:#fef08a;margin-bottom:4px;">
            ${sk.isPassiveBet ? `💠 Nội Tại Cược [Tự Động — Không Có Kỹ Năng E]: ${sk.name}` : `🔮 Kỹ Năng Chiến Thuật [Phím E]: ${sk.name}`}
          </div>
          <div style="font-size:12.5px;color:#e2e8f0;line-height:1.5;">
            • <strong>Hiệu ứng chính:</strong> ${sk.shortDesc}<br/>
            • <strong>Quy tắc:</strong> ${
              sk.isPassiveBet
                ? 'Nhân vật 5★ Thường (Lệch Rate) <strong>không có Kỹ Năng [E] chủ động</strong> trên bàn bài, nhưng <strong>tự động kích hoạt Nội Tại Cược</strong> và vẫn phát <strong>Hoạt Ảnh Kỹ Năng Nộ 5★ khi Chặt Heo &amp; Về Nhất</strong>!'
                : 'Dùng tối đa <strong>1 lần / ván</strong> khi đang tới lượt của người chơi. Nhân vật đang xài cũng đồng thời là nhân vật phát <strong>Hoạt Ảnh Nộ Chặt Heo &amp; Về Nhất</strong>!'
            }
          </div>
        </div>
      `;
    } else {
      heroHtml = `
        <div class="char-detail-hero" style="border-color:rgba(248,113,113,0.55);">
          <div style="font-size:38px;">🔒</div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:900;color:#fca5a5;">
              ${isMe ? 'Bạn chưa sở hữu Hoạt Ảnh Kỹ Năng Nộ 5★ nào!' : `${p.name} chưa sở hữu Nhân Vật Nộ 5★ nào!`}
            </div>
            <div style="font-size:12.5px;color:#cbd5e1;margin-top:4px;line-height:1.45;">
              Quy tắc: <strong>Đang sở hữu Burst Animation (Hoạt Ảnh Kỹ Năng Nộ 5★) của nhân vật nào thì mới được trang bị và xài Kỹ Năng của nhân vật đó!</strong> Hãy mở khóa nhân vật 5★ tại <strong>🌠 Sảnh Cầu Nguyện (Gacha)</strong>.
            </div>
          </div>
        </div>
      `;
    }

    const rosterItemsHtml = GENSHIN_BURSTS.map((b) => {
      const cSk = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;
      const owned = this.unlockedBursts.has(b.id);
      const isCurrent = hasChar && charId === b.id;
      const clickAttr = owned
        ? `onclick="window.tienLenGame.buyOrEquipBurst('${b.id}'); window.tienLenGame.openPlayerSkillInspect(0);"`
        : `onclick="document.getElementById('char-skill-detail-modal').classList.add('hidden'); window.tienLenGame.openGachaForCharacter('${b.id}');"`;

      return `
        <div class="char-detail-roster-item ${isCurrent ? 'active-char' : ''} ${!owned ? 'locked-char' : ''}" ${clickAttr}>
          <img src="fanart/${b.id}.jpg?v=57" alt="${cSk.charName}" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1.5px solid ${
        owned ? '#fde047' : '#64748b'
      };" />
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${cSk.icon} ${cSk.charName} ${isCurrent ? '✅' : owned ? '🟢' : '🔒'}
            </div>
            <div style="font-size:10.5px;color:#fde68a;font-weight:700;">
              ${cSk.name}: <span style="color:#cbd5e1;font-weight:500;">${cSk.shortDesc}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bodyEl.innerHTML = `
      ${heroHtml}
      <div style="font-size:12.5px;font-weight:900;color:#d8b4fe;margin:8px 0 4px;">
        📜 BẢNG TRA CỨU ${GENSHIN_BURSTS.length} NHÂN VẬT 5★ &amp; KỸ NĂNG (Đã sở hữu Nộ 5★: ${this.unlockedBursts.size}/${GENSHIN_BURSTS.length} — Bấm vào nhân vật đã sở hữu để đổi ngay):
      </div>
      <div class="char-detail-roster-grid">
        ${rosterItemsHtml}
      </div>
    `;

    modal.classList.remove('hidden');
  }

  triggerArenaReactionFlash(rx) {
    const screenFx = document.getElementById('arena-reaction-screen-fx');
    if (!screenFx || !rx) return;
    screenFx.className = `arena-reaction-screen-fx ${rx.cssClass || 'reaction-overloaded'}`;
    void screenFx.offsetWidth;
    clearTimeout(this.reactionScreenTimer);
    this.reactionScreenTimer = setTimeout(() => {
      screenFx.classList.add('hidden');
    }, 980);
  }

  renderRoundSkillStatusBar() {
    const bar = document.getElementById('round-skill-status-bar');
    if (!bar) return;
    const pills = [];
    const b = this.betPerCard || 100;

    if (this.furinaReverseSuitRound) {
      pills.push(
        `<span class="round-skill-pill">💧 Luật Sân Khấu Furina: Đảo ngược chất (♠&gt;♣&gt;♦&gt;♥) &amp; Cấm đánh Heo lẻ (2)</span>`
      );
    }
    if (this.yaeForcePlayRound) {
      pills.push(
        `<span class="round-skill-pill">🌸 Hồ Ly Yae Miko: Cấm nhịn bài (Có nước đi hợp lệ bắt buộc phải đánh!)</span>`
      );
    }
    if (Array.isArray(this.clorindeDuelPair) && this.clorindeDuelPair.length === 2) {
      const p1 = this.players[this.clorindeDuelPair[0]];
      const p2 = this.players[this.clorindeDuelPair[1]];
      pills.push(
        `<span class="round-skill-pill">⚡ Quyết Đấu Clorinde: ${p1 ? p1.name : ''} ⚔️ ${
          p2 ? p2.name : ''
        } (Nhà khác đứng ngoài vòng này)</span>`
      );
    }
    if (this.ayakaFrozenPlayerId !== null) {
      const fp = this.players[this.ayakaFrozenPlayerId];
      pills.push(
        `<span class="round-skill-pill">❄️ Băng Phong Ayaka: ${
          fp ? fp.name : 'Đối thủ'
        } bị đóng băng mất lượt kế tiếp</span>`
      );
    }
    if (this.hutaoTaxOwnerId !== null) {
      const hp = this.players[this.hutaoTaxOwnerId];
      pills.push(
        `<span class="round-skill-pill">🦋 Bùa Vãng Sinh (${
          hp ? hp.name : 'Hu Tao'
        }): Đối thủ đánh bài trong vòng này nộp thuế ${(b * 2).toLocaleString()} Xu</span>`
      );
    }
    if (this.eulaNextPlayBoost) {
      pills.push(
        `<span class="round-skill-pill">❄️ Kiếm Ánh Sáng Eula: Bộ bài thường kế tiếp được cộng +2 bậc sức mạnh!</span>`
      );
    }
    if (this.naviaLockedCardIds && this.naviaLockedCardIds.size > 0) {
      const np = this.players[this.naviaLockedTargetId];
      pills.push(
        `<span class="round-skill-pill">☂️ Pháo Kích Navia: Đang khóa cứng ${this.naviaLockedCardIds.size} lá bài của ${
          np ? np.name : 'đối thủ'
        } trong vòng này</span>`
      );
    }
    if (this.shenheSingleOnlyRound) {
      pills.push(
        `<span class="round-skill-pill">❄️ Lục Đạo Độc Tôn (Shenhe): Cấm đánh Đôi/Sám/Sảnh — Vòng này chỉ đánh Bài Lẻ!</span>`
      );
    }
    if (this.ganyuGapStraightTurn) {
      pills.push(
        `<span class="round-skill-pill">🏹 Băng Hoa Ganyu: Lượt này được đánh Sảnh Khuyết (thiếu 1 mắt xích ở giữa)!</span>`
      );
    }
    if (this.kokomiReverseRankRound) {
      pills.push(
        `<span class="round-skill-pill">🫧 Thủy Triều Kokomi: Đảo ngược 3➔A (3 mạnh nhất, A yếu nhất; bài nhỏ đè bài lớn!)</span>`
      );
    }
    if (this.yoimiyaBurnTrashReady) {
      pills.push(
        `<span class="round-skill-pill">🎆 Pháo Hoa Yoimiya: Đánh Đôi/Sám/Sảnh lượt này tự đốt kèm 1 lá lẻ nhỏ nhất!</span>`
      );
    }
    if (this.mualaniCrossBeatTurn) {
      pills.push(
        `<span class="round-skill-pill">🦈 Cá Mập Mualani: Lượt này được lấy Đôi đè Lẻ, Sám/Sảnh đè Đôi!</span>`
      );
    }
    if (this.xiaoPlungeSingleTurn) {
      pills.push(
        `<span class="round-skill-pill">👹 Không Trung Đạp Kích Xiao: Lượt này được lấy 1 Lá Lẻ đâm thủng Đôi, Sám Cô hoặc Sảnh!</span>`
      );
    }
    if (this.kinichBombOwnerId !== null) {
      const kp = this.players[this.kinichBombOwnerId];
      pills.push(
        `<span class="round-skill-pill">🎮 Bom Hẹn Giờ Ajaw (${kp ? kp.name : 'Kinich'}): Ai đánh đè lên bài của Kinich vòng này sẽ nổ bom nhận 1 lá rác!</span>`
      );
    }
    if (this.columbinaExtraTurnReady) {
      pills.push(
        `<span class="round-skill-pill">🕊️ Khúc Ca Thiên Thần Columbina: Sau khi đánh bộ bài lượt này được đánh bồi thêm 1 bộ nữa ngay lập tức!</span>`
      );
    }
    if (this.turnDirection === -1) {
      pills.push(
        `<span class="round-skill-pill">❄️ Bão Đêm Citlali: Chiều đánh đang đảo ngược (↺ Ngược chiều kim đồng hồ)</span>`
      );
    }

    if (pills.length === 0 || this.isGameOver) {
      bar.innerHTML = '';
      bar.classList.add('hidden');
    } else {
      bar.innerHTML = pills.join('');
      bar.classList.remove('hidden');
    }
  }

  canUseCharacterSkill(player) {
    if (!player || !player.active || player.skillUsed || this.isGameOver) return { ok: false, reason: 'Đã dùng kỹ năng trong ván này' };
    if (this.currentTurn !== player.id) return { ok: false, reason: 'Chỉ dùng trong lượt của bạn' };
    if (player.passed) return { ok: false, reason: 'Bạn đã bỏ lượt vòng này' };

    const charId = this.getPlayerActiveCharId(player);
    if (!charId || charId === 'none' || !CHARACTER_SKILLS[charId]) {
      return {
        ok: false,
        reason: 'Chưa sở hữu Nộ 5★! Phải sở hữu Burst Animation 5★ của nhân vật mới được dùng Kỹ Năng của nhân vật đó.',
      };
    }
    if (CHARACTER_SKILLS[charId].isPassiveBet) {
      return {
        ok: false,
        charId,
        isPassiveBet: true,
        reason: 'Nhân vật 5★ Thường (Lệch Rate): Không có Kỹ Năng [E] chủ động — Tự động kích hoạt Nội Tại Cược & Hoạt Ảnh Nộ 5★!',
      };
    }
    if (player.id === this.mySeatId && !player.isBot && !this.unlockedBursts.has(charId)) {
      return {
        ok: false,
        reason: 'Bạn chưa sở hữu Burst Animation 5★ của nhân vật này!',
      };
    }
    const activeOpponents = this.players.filter(
      (p) => p.active && p.id !== player.id && p.finishRank === null && p.hand.length > 0
    );
    if (activeOpponents.length === 0) return { ok: false, reason: 'Không còn đối thủ' };

    if (charId === 'raiden') {
      const canCutTable =
        this.currentCombo &&
        (this.currentCombo.type === COMBO_TYPES.SINGLE || this.currentCombo.type === COMBO_TYPES.PAIR) &&
        this.currentCombo.highRank <= 8 &&
        !this.currentCombo.isBomb;
      if (!canCutTable) {
        return {
          ok: false,
          reason: 'Chỉ chém đứt được Lá Lẻ hoặc Đôi nhỏ từ 3 đến J trên bàn (không chém được Q, K, A, Heo, Sám, Sảnh hay Hàng)!',
        };
      }
    }
    if (charId === 'furina' && this.furinaReverseSuitRound) {
      return { ok: false, reason: 'Luật Sân Khấu Fontaine đã bật trong vòng này' };
    }
    if (charId === 'yaemiko' && this.yaeForcePlayRound) {
      return { ok: false, reason: 'Ấn Hồ Ly đã bật trong vòng này' };
    }
    if (charId === 'clorinde' && this.clorindeDuelPair) {
      return { ok: false, reason: 'Đang trong Quyết Đấu Danh Dự' };
    }
    if (charId === 'ayaka' && this.ayakaFrozenPlayerId !== null) {
      return { ok: false, reason: 'Đã đóng băng đối thủ trong vòng này' };
    }
    if (charId === 'hutao' && this.hutaoTaxOwnerId !== null) {
      return { ok: false, reason: 'Bùa Vãng Sinh đã yểm trong vòng này' };
    }
    if (charId === 'mavuika') {
      const hasForgeable = player.hand.some((c) => c.rankIndex <= 10);
      if (!hasForgeable) {
        return { ok: false, reason: 'Cần ít nhất 1 lá bài thường từ 3 đến K để rèn (+1 bậc ♥)' };
      }
    }
    if (charId === 'eula') {
      const canSlashTable = this.currentCombo && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb;
      const canBuffLead = !this.currentCombo && !this.eulaNextPlayBoost;
      if (!canSlashTable && !canBuffLead) {
        return { ok: false, reason: 'Chỉ chém giảm bậc bộ bài thường trên bàn (dưới Heo/Hàng) hoặc dùng khi mở vòng' };
      }
    }
    if (charId === 'navia' && this.naviaLockedCardIds && this.naviaLockedCardIds.size > 0) {
      return { ok: false, reason: 'Đã khóa bài đối thủ trong vòng này' };
    }
    if (charId === 'shenhe') {
      if (this.shenheSingleOnlyRound) {
        return { ok: false, reason: 'Lục Đạo Độc Tôn đã bật trong vòng này' };
      }
      if (this.currentCombo && this.currentCombo.isBomb) {
        return { ok: false, reason: 'Không thể phong ấn khi trên bàn đang là Hàng (Tứ Quý / Đôi Thông)' };
      }
    }
    if (charId === 'ganyu') {
      if (this.ganyuGapStraightTurn) {
        return { ok: false, reason: 'Băng Hoa Xuyên Thấu đã bật trong lượt này' };
      }
      if (player.hand.length < 3) {
        return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay để ghép Sảnh Khuyết' };
      }
    }
    if (charId === 'kokomi' && this.kokomiReverseRankRound) {
      return { ok: false, reason: 'Thủy Triều Đảo Ngược đã bật trong vòng này' };
    }
    if (charId === 'yoimiya') {
      if (this.yoimiyaBurnTrashReady) {
        return { ok: false, reason: 'Pháo Hoa Thiêu Rác đã bật trong lượt này' };
      }
      if (player.hand.length < 3) {
        return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay (đánh bộ >= 2 lá và đốt kèm 1 lá lẻ)' };
      }
    }
    if (charId === 'mualani') {
      if (this.mualaniCrossBeatTurn) {
        return { ok: false, reason: 'Cá Mập Đè Khác Loại đã bật trong lượt này' };
      }
      if (!this.currentCombo || this.currentCombo.isBomb || this.currentCombo.highRank === 12) {
        return { ok: false, reason: 'Chỉ dùng khi trên bàn đang có bộ bài thường (Lẻ, Đôi, Sám, Sảnh dưới Heo) để đè khác loại!' };
      }
    }
    if (charId === 'varesa') {
      if (!this.currentCombo || this.currentCombo.isBomb || (this.currentCombo.length === 1 && this.currentCombo.highRank === 12)) {
        return { ok: false, reason: 'Chỉ dùng khi trên bàn đang có Đôi, Sám Cô, Sảnh hoặc Bài Lẻ thường (dưới Heo) để dậm vỡ!' };
      }
    }
    if (charId === 'escoffier' && player.hand.length < 2) {
      return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để ném 1 lá rác sang đối thủ' };
    }
    if (charId === 'zibai') {
      const canUp = player.hand.some((c) => c.rankIndex <= 10);
      if (!canUp) return { ok: false, reason: 'Cần ít nhất 1 lá bài từ 3 đến K trên tay để nâng bậc' };
    }
    if (charId === 'lauma') {
      const canRecoverTable = this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12;
      const canBoostPair = !this.currentCombo && player.hand.some((c) => c.rankIndex <= 10);
      if (!canRecoverTable && !canBoostPair) {
        return { ok: false, reason: 'Cần có bộ bài thường (dưới Heo/Hàng) trên bàn để thu hồi 1 lá về tay hoặc dùng khi mở vòng mới!' };
      }
    }
    if (charId === 'linnea') {
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần ít nhất 2 lá bài trên tay để biến lá lẻ nhỏ nhất ghép thành Đôi' };
      }
      const rc = new Array(13).fill(0);
      player.hand.forEach((c) => rc[c.rankIndex]++);
      const singleNormals = player.hand.filter((c) => c.rankIndex <= 11 && rc[c.rankIndex] === 1);
      if (singleNormals.length < 1) {
        return { ok: false, reason: 'Cần ít nhất 1 lá bài lẻ thường (3→A) trên tay để Linnea ghép thành Đôi!' };
      }
    }
    if (charId === 'nefer' && player.hand.length < 2) {
      return { ok: false, reason: 'Cần ít nhất 2 lá bài trên tay để biến lá rác ghép thành Sám Cô / Đôi' };
    }
    if (charId === 'odette') {
      if (!this.currentCombo || this.currentCombo.isBomb || (this.currentCombo.length === 1 && this.currentCombo.highRank === 12)) {
        return { ok: false, reason: 'Chỉ dùng khi trên bàn đang có bộ bài thường (Đôi, Sám, Sảnh hoặc Lẻ dưới Heo) để cắt bớt 1 lá!' };
      }
    }
    if (charId === 'sandrone' && player.hand.length < 3) {
      return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay để chế tạo Sảnh 3 lá liên tiếp' };
    }
    if (charId === 'columbina') {
      if (this.columbinaExtraTurnReady) {
        return { ok: false, reason: 'Khúc Ca Thiên Thần đã bật trong lượt này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để đánh 2 bộ liên tiếp trong cùng 1 lượt!' };
      }
    }
    if (charId === 'vodyanitsa') {
      if (!this.currentCombo || this.currentCombo.isBomb || this.currentCombo.highRank >= 12) {
        return { ok: false, reason: 'Chỉ dùng khi trên bàn đang có bộ bài thường (Lẻ, Đôi, Sám, Sảnh dưới Heo) để Gương Nước sao chép +1 bậc!' };
      }
      if (player.hand.length < this.currentCombo.length) {
        return { ok: false, reason: `Cần còn ít nhất ${this.currentCombo.length} lá bài trên tay để sao chép bộ bài trên bàn!` };
      }
    }
    if (charId === 'lohen') {
      if (!this.currentCombo || this.currentCombo.isBomb || this.currentCombo.highRank >= 12 || this.trickOwnerId === null || this.trickOwnerId === player.id) {
        return { ok: false, reason: 'Chỉ dùng khi đối thủ vừa đánh bộ bài thường (dưới Heo/Hàng) trên bàn để phản đòn ngược lại họ!' };
      }
    }
    if (charId === 'durin') {
      if (!player.hand.some((c) => c.rankIndex < 12)) {
        return { ok: false, reason: 'Cần ít nhất 1 lá bài thường (dưới Heo) trên tay để hóa thân thành Heo Cơ 2♥!' };
      }
    }
    if (charId === 'xiao') {
      if (this.xiaoPlungeSingleTurn) {
        return { ok: false, reason: 'Không Trung Đạp Kích đã bật trong lượt này' };
      }
      if (!this.currentCombo || this.currentCombo.isBomb || this.currentCombo.highRank >= 12 || this.currentCombo.length < 2) {
        return { ok: false, reason: 'Chỉ dùng khi trên bàn đang có Đôi, Sám Cô hoặc Sảnh (dưới Hàng) để nhảy lên dùng 1 Lá Lẻ đâm thủng!' };
      }
      if (!player.hand.some((c) => c.rankIndex >= this.currentCombo.highRank)) {
        return { ok: false, reason: `Cần ít nhất 1 lá bài có bậc ≥ ${RANKS[this.currentCombo.highRank]} trên tay để đâm thủng bộ bài trên bàn!` };
      }
    }
    if (charId === 'wanderer' && player.hand.length < 1) {
      return { ok: false, reason: 'Cần còn bài trên tay để xáo trộn bài toàn bàn!' };
    }
    if (charId === 'kinich') {
      if (this.kinichBombOwnerId !== null) {
        return { ok: false, reason: 'Bom Hẹn Giờ Ajaw đã được đặt trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để gài Bom Hẹn Giờ Ajaw!' };
      }
    }
    if (charId === 'venti' && player.hand.length < 1) {
      return { ok: false, reason: 'Cần còn bài trên tay để tạo Hố Đen Phong Thần!' };
    }
    return { ok: true, charId };
  }

  onHumanUseSkill() {
    if (this.isGameOver || this.isBurstPlaying || this.currentTurn !== this.mySeatId) return;
    const human = this.getLocalPlayer();
    const check = this.canUseCharacterSkill(human);
    if (!check.ok) {
      alert(`⚠️ Chưa thể kích hoạt Kỹ Năng: ${check.reason}`);
      return;
    }

    if (check.charId === 'mavuika') {
      const selectedCards = this.getSelectedCards();
      const singleForgeable =
        selectedCards.length === 1 && selectedCards[0].rankIndex <= 10 ? selectedCards[0] : null;
      if (!singleForgeable) {
        if (this.mavuikaSelectingCard) {
          this.mavuikaSelectingCard = false;
          sfx.click();
          this.renderHumanHand();
          this.updateHumanActionButtons();
          return;
        }
        this.mavuikaSelectingCard = true;
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        sfx.click();
        this.showComboBanner('🔥 BẤM CHỌN 1 LÁ BÀI (3 ➔ K) TRÊN TAY ĐỂ NÂNG +1 BẬC!');
        this.renderHumanHand();
        this.updateHumanActionButtons();
        return;
      }
      this.mavuikaSelectingCard = false;
    }

    if (this.isMultiplayer && !this.isHost) {
      const selectedIds = Array.from(this.selectedCardIds);
      this.selectedCardIds.clear();
      this.companionCardIds.clear();
      this.sendClientEvent({
        type: 'USE_CHAR_SKILL',
        clientId: this.myClientId,
        charId: check.charId,
        selectedIds,
      });
      return;
    }
    this.useCharacterSkill(human, Array.from(this.selectedCardIds));
  }

  applyElementalReactionBonus(attacker, prevPlayer, rx) {
    if (!attacker || !prevPlayer || attacker.id === prevPlayer.id || !rx) return 0;
    const rxBonus = Math.round((this.betPerCard || 100) * 5);
    prevPlayer.coins -= rxBonus;
    attacker.coins += rxBonus;
    this.matchChopCoins[prevPlayer.id] -= rxBonus;
    this.matchChopCoins[attacker.id] += rxBonus;
    this.matchChopDetails[prevPlayer.id].push({
      label: `⚡ Bị ${attacker.name} kích nổ ${rx.shortName} (-${rxBonus.toLocaleString()})`,
      isSpecial: true,
    });
    this.matchChopDetails[attacker.id].push({
      label: `⚡ Kích nổ ${rx.shortName} lên ${prevPlayer.name} (+${rxBonus.toLocaleString()})`,
      isGood: true,
    });
    this.addLog(
      `⚡ <strong>[Thưởng Phản Ứng ×5 Cược]</strong> <strong>${attacker.name}</strong> kích hoạt <strong>${rx.shortName}</strong> lấy <strong>+${rxBonus.toLocaleString()} Xu</strong> (5× cược) từ người đánh trước <strong>${prevPlayer.name}</strong>!`,
      'log-chop'
    );
    return rxBonus;
  }

  useCharacterSkill(player, preferredCardIds = []) {
    const check = this.canUseCharacterSkill(player);
    if (!check.ok) return false;

    const charId = check.charId;
    const sk = CHARACTER_SKILLS[charId] || CHARACTER_SKILLS.raiden;
    const b = this.betPerCard || 100;
    const prevTrickOwner =
      this.currentCombo && this.trickOwnerId !== null && this.trickOwnerId !== player.id
        ? this.players[this.trickOwnerId]
        : null;
    const activeOpponents = this.players.filter(
      (p) => p.active && p.id !== player.id && p.finishRank === null && p.hand.length > 0
    );
    const pickRandomItem = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      if (arr.length === 1) return arr[0];
      if (window.crypto && window.crypto.getRandomValues) {
        const randBuf = new Uint32Array(1);
        window.crypto.getRandomValues(randBuf);
        return arr[randBuf[0] % arr.length];
      }
      return arr[Math.floor(Math.random() * arr.length)];
    };

    player.skillUsed = true;

    // Hiệu ứng sáng rực Ô Nhân Vật Đang Xài cạnh Name Tag của người vừa tung kỹ năng
    const visualSlot = (player.id - this.mySeatId + 4) % 4;
    const charBoxEl = document.getElementById(`char-box-${visualSlot}`);
    if (charBoxEl) {
      charBoxEl.classList.add('char-skill-flash');
      setTimeout(() => charBoxEl.classList.remove('char-skill-flash'), 2400);
    }

    let skillSummary = '';
    const rx = this.getSpecialPlayReaction(player, this.currentCombo);

    if (charId === 'raiden') {
      const oldLabel = this.currentCombo ? this.currentCombo.label : 'bộ bài trên bàn';
      this.previousCombo = this.currentCombo;
      this.currentCombo = null;
      this.trickOwnerId = player.id;
      this.raidenSlashMustSingle = false;
      this.naviaLockedTargetId = null;
      this.naviaLockedCardIds = new Set();
      activeNaviaLockedCardIds = this.naviaLockedCardIds;
      this.shenheSingleOnlyRound = false;
      activeShenheSingleOnly = false;
      this.kokomiReverseRankRound = false;
      activeKokomiReverseRank = false;
      this.selectedCardIds.clear();
      this.companionCardIds.clear();
      this.chopPot = 0;
      this.lastChoppedPlayerId = null;
      this.roundChoppableStack = [];
      this.players.forEach((p) => {
        p.passed = false;
        p.declinedFourPairsCut = false;
      });
      skillSummary = `⚡ [Tịnh Thổ Cắt Vòng] ${player.name} chém đứt ${oldLabel} (≤ J) để mở vòng mới và được đánh bộ bài bất kỳ!`;
    } else if (charId === 'furina') {
      this.furinaReverseSuitRound = true;
      activeFurinaReverseSuit = true;
      skillSummary = `💧 [Luật Sân Khấu Fontaine] ${player.name} đảo ngược chất (♠ > ♣ > ♦ > ♥) khi đè cùng số & CẤM đánh Heo lẻ (2) trong vòng này!`;
    } else if (charId === 'skirk') {
      // Chọn ngẫu nhiên 100% công bằng (không ưu tiên bất kỳ đối thủ hay lá bài nào)
      const target = pickRandomItem(activeOpponents);
      if (target && target.hand.length > 0 && player.hand.length > 0) {
        let myCard = null;
        if (!player.isBot && preferredCardIds && preferredCardIds.length > 0) {
          myCard = player.hand.find((c) => preferredCardIds.includes(c.id));
        }
        if (!myCard) {
          myCard = pickRandomItem(player.hand);
        }
        const oppCard = pickRandomItem(target.hand);

        player.hand = player.hand.filter((c) => c.id !== myCard.id);
        target.hand = target.hand.filter((c) => c.id !== oppCard.id);
        player.hand.push(oppCard);
        target.hand.push(myCard);

        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        if (player.id === this.mySeatId) {
          this.selectedCardIds.add(oppCard.id);
        }

        if (player.id === this.mySeatId || target.id === this.mySeatId) {
          skillSummary = `🌌 [Khe Nứt Vực Sâu] ${player.name} tráo ${myCard.rank}${myCard.suit} lấy ${oppCard.rank}${oppCard.suit} của ${target.name}!`;
        } else {
          skillSummary = `🌌 [Khe Nứt Vực Sâu] ${player.name} mở cổng Hư Vô tráo đổi 1 lá bài ngẫu nhiên với ${target.name}!`;
        }
      }
    } else if (charId === 'mavuika') {
      let targetCard = null;
      if (preferredCardIds && preferredCardIds.length > 0) {
        targetCard = player.hand.find((c) => preferredCardIds.includes(c.id) && c.rankIndex <= 10);
      }
      if (!targetCard) {
        const forgeCandidates = player.hand.filter((c) => c.rankIndex <= 10);
        targetCard = pickRandomItem(forgeCandidates);
      }
      if (targetCard) {
        const oldLabel = `${targetCard.rank}${targetCard.suit}`;
        const newRankIdx = Math.min(11, targetCard.rankIndex + 1); // Tối đa lên A (11), không bao giờ tạo Heo (12)
        targetCard.rankIndex = newRankIdx;
        targetCard.suitIndex = 3; // Chất Cơ ♥
        targetCard.rank = RANKS[newRankIdx];
        targetCard.suit = '♥';
        targetCard.value = newRankIdx * 4 + 3;
        targetCard.isRed = true;
        targetCard.id = `${targetCard.rank}♥_forged_${Date.now()}`;
        const newLabel = `${targetCard.rank}${targetCard.suit}`;
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        if (player.id === this.mySeatId) {
          this.selectedCardIds.add(targetCard.id);
        }
        skillSummary = `🔥 [Thánh Hỏa Rèn Bài] ${player.name} rèn nâng cấp lá ${oldLabel} ➔ ${newLabel} ngay trên tay!`;
      }
    } else if (charId === 'yaemiko') {
      this.yaeForcePlayRound = true;
      skillSummary = `🌸 [Hồ Ly Dụ Hoặc] ${player.name} yểm ấn Hồ Ly: Mọi đối thủ có bài đánh được BẮT BUỘC PHẢI ĐÁNH (khóa Bỏ lượt giấu Heo)!`;
    } else if (charId === 'yelan') {
      const target = pickRandomItem(activeOpponents);
      if (target) {
        const shuffledHand = shuffleDeck([...target.hand]);
        const revealed = sortCardsAsc(shuffledHand.slice(0, Math.min(3, shuffledHand.length)));
        this.yelanRevealedByPlayer[target.id] = {
          cards: revealed,
          expiresAt: Date.now() + 8500,
        };
        setTimeout(() => {
          if (this.yelanRevealedByPlayer[target.id] && Date.now() >= this.yelanRevealedByPlayer[target.id].expiresAt) {
            delete this.yelanRevealedByPlayer[target.id];
            this.renderSeats();
          }
        }, 8600);
        const twosCount = target.hand.filter((c) => c.rankIndex === 12).length;
        const struct = this.analyzeBotHandStructure(target.hand);
        const hasBomb = struct.bombRanks.size > 0;
        const revStr = revealed.map((c) => `${c.rank}${c.suit}`).join(' ');
        skillSummary = `🎲 [Mạng Lưới Tình Báo] ${player.name} thấu thị ${target.name}: Lộ 3 lá ngẫu nhiên [${revStr}] • Đang giữ ${twosCount} Heo & ${
          hasBomb ? 'CÓ HÀNG 💣!' : '0 Hàng'
        }`;
      }
    } else if (charId === 'clorinde') {
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const target = pickRandomItem(unpassedOpps.length > 0 ? unpassedOpps : activeOpponents);
      if (target) {
        this.clorindeDuelPair = [player.id, target.id];
        this.players.forEach((p) => {
          if (p.active && p.id !== player.id && p.id !== target.id) {
            p.passed = true;
          }
        });
        skillSummary = `⚡ [Thách Đấu Danh Dự] ${player.name} khóa vòng đấu thành Quyết Đấu 1v1 với ${target.name}!`;
      }
    } else if (charId === 'ayaka') {
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const target = pickRandomItem(unpassedOpps.length > 0 ? unpassedOpps : activeOpponents);
      if (target) {
        this.ayakaFrozenPlayerId = target.id;
        skillSummary = `❄️ [Sương Hoa Phong Ấn] ${player.name} đóng băng ${target.name} khiến họ mất lượt kế tiếp trong vòng này!`;
      }
    } else if (charId === 'hutao') {
      this.hutaoTaxOwnerId = player.id;
      skillSummary = `🦋 [Bùa Vãng Sinh] ${player.name} yểm bùa: Mỗi khi ĐỐI THỦ đánh bài trong vòng này đều phải nộp thuế ngay ${(
        b * 2
      ).toLocaleString()} Xu cho ${player.name}!`;
    } else if (charId === 'eula') {
      if (this.currentCombo && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb) {
        const oldRank = RANKS[this.currentCombo.highRank];
        const newRankIdx = Math.max(0, this.currentCombo.highRank - 2);
        this.currentCombo.highRank = newRankIdx;
        this.currentCombo.highValue = newRankIdx * 4 + (this.currentCombo.highCard?.suitIndex || 0);
        this.currentCombo.label = `${this.currentCombo.label} [❄️ Eula chém hạ bậc ${oldRank}➔${RANKS[newRankIdx]}]`;
        skillSummary = `❄️ [Kiếm Ánh Sáng Phá Giáp] ${player.name} chém giảm 2 bậc bộ bài trên bàn (${oldRank} ➔ ${RANKS[newRankIdx]})!`;
      } else {
        this.eulaNextPlayBoost = true;
        skillSummary = `❄️ [Kiếm Ánh Sáng Phá Giáp] ${player.name} tích tụ Kiếm Ánh Sáng: Bộ bài thường đánh ra kế tiếp được +2 bậc sức mạnh!`;
      }
    } else if (charId === 'navia') {
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const candidateOpps = unpassedOpps.length > 0 ? unpassedOpps : activeOpponents;
      const target = player.isBot
        ? [...candidateOpps].sort((a, b) => a.hand.length - b.hand.length)[0]
        : pickRandomItem(candidateOpps);
      if (target && target.hand.length > 0) {
        const shuffled = shuffleDeck([...target.hand]);
        const lockedCards = shuffled.slice(0, Math.min(3, shuffled.length));
        this.naviaLockedTargetId = target.id;
        this.naviaLockedCardIds = new Set(lockedCards.map((c) => c.id));
        activeNaviaLockedCardIds = this.naviaLockedCardIds;
        skillSummary = `☂️ [Pháo Kích Khóa Bài] ${player.name} khai hỏa đại pháo khóa cứng ${lockedCards.length} lá bài trên tay ${target.name} trong vòng này!`;
      }
    } else if (charId === 'shenhe') {
      this.shenheSingleOnlyRound = true;
      activeShenheSingleOnly = true;
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.type !== COMBO_TYPES.SINGLE) {
        const oldLabel = this.currentCombo.label;
        const singleCard = sortCardsAsc(this.currentCombo.cards)[0];
        this.currentCombo = classifyCombo([singleCard]);
        this.currentCombo.label = `${this.currentCombo.label} [❄️ Shenhe phong ấn ${oldLabel} về Lẻ]`;
      }
      skillSummary = `❄️ [Lục Đạo Độc Tôn] ${player.name} phong ấn vòng đấu: CẤM toàn bộ đối thủ đánh Đôi, Sám Cô và Sảnh (chỉ được đánh Bài Lẻ 1 lá)!`;
    } else if (charId === 'ganyu') {
      this.ganyuGapStraightTurn = true;
      activeGanyuGapStraight = true;
      skillSummary = `🏹 [Băng Hoa Xuyên Thấu] ${player.name} giáng mưa tên băng: Cho phép đánh Sảnh Khuyết (thiếu 1 mắt xích ở giữa, VD: 4-5-7-8) trong lượt này!`;
    } else if (charId === 'kokomi') {
      this.kokomiReverseRankRound = true;
      activeKokomiReverseRank = true;
      skillSummary = `🫧 [Thủy Triều Đảo Ngược] ${player.name} dâng Thủy Triều: Đảo ngược toàn bộ sức mạnh từ 3 đến A (3 lớn nhất, A nhỏ nhất — bài nhỏ đè bài lớn) trong vòng này!`;
    } else if (charId === 'yoimiya') {
      this.yoimiyaBurnTrashReady = true;
      skillSummary = `🎆 [Pháo Hoa Thiêu Rác] ${player.name} châm ngòi Lưu Kim Hỏa: Đánh Đôi, Sám Cô hoặc Sảnh trong lượt này sẽ tự động đốt bỏ kèm thêm 1 lá lẻ nhỏ nhất trên tay!`;
    } else if (charId === 'xilonen') {
      if (activeOpponents.length >= 2) {
        const pool = [];
        const takeCounts = [];
        activeOpponents.forEach((opp) => {
          const shuffledOpp = shuffleDeck([...opp.hand]);
          const k = Math.min(2, shuffledOpp.length);
          const taken = shuffledOpp.slice(0, k);
          const takenIds = new Set(taken.map((c) => c.id));
          opp.hand = opp.hand.filter((c) => !takenIds.has(c.id));
          pool.push(...taken);
          takeCounts.push({ opp, count: k });
        });
        const mixedPool = shuffleDeck(pool);
        let offset = 0;
        takeCounts.forEach(({ opp, count }) => {
          const given = mixedPool.slice(offset, offset + count);
          offset += count;
          opp.hand.push(...given);
          opp.hand = sortHandByMode(opp.hand, opp.id === this.mySeatId ? this.sortMode : 'asc');
        });
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        skillSummary = `🐆 [Bàn Xoay DJ Xào Bài] ${player.name} thu gom ${pool.length} lá bài của các đối thủ, trộn đều trên bàn xoay DJ rồi chia lại ngẫu nhiên phá nát bộ đối phương!`;
      } else if (activeOpponents.length === 1) {
        const opp = activeOpponents[0];
        const k = Math.min(2, player.hand.length, opp.hand.length);
        const myTaken = shuffleDeck([...player.hand]).slice(0, k);
        const myTakenIds = new Set(myTaken.map((c) => c.id));
        const oppTaken = shuffleDeck([...opp.hand]).slice(0, k);
        const oppTakenIds = new Set(oppTaken.map((c) => c.id));
        player.hand = player.hand.filter((c) => !myTakenIds.has(c.id));
        opp.hand = opp.hand.filter((c) => !oppTakenIds.has(c.id));
        player.hand.push(...oppTaken);
        opp.hand.push(...myTaken);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        opp.hand = sortHandByMode(opp.hand, opp.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        skillSummary = `🐆 [Bàn Xoay DJ Xào Bài] ${player.name} xào tráo ${k} lá bài ngẫu nhiên trên tay với ${k} lá bài ngẫu nhiên của ${opp.name}!`;
      }
    } else if (charId === 'citlali') {
      this.turnDirection = this.turnDirection === -1 ? 1 : -1;
      const dirLabel = this.turnDirection === -1 ? 'Ngược chiều kim đồng hồ ↺' : 'Thuận chiều kim đồng hồ ↻';
      skillSummary = `❄️ [Bão Đêm Đảo Chiều] ${player.name} triệu hồi bão sương đảo ngược chiều đánh của bàn bài sang: ${dirLabel}!`;
    } else if (charId === 'mualani') {
      this.mualaniCrossBeatTurn = true;
      activeMualaniCrossBeat = true;
      skillSummary = `🦈 [Cá Mập Đè Khác Loại] ${player.name} phóng Tên Lửa Cá Mập: Trong lượt này được lấy Đôi đè thẳng lên Bài Lẻ, hoặc lấy Sám Cô / Sảnh đè thẳng lên Đôi!`;
    } else if (charId === 'varesa') {
      if (this.currentCombo && !this.currentCombo.isBomb) {
        if (this.currentCombo.length >= 2) {
          const oldLabel = this.currentCombo.label;
          const lowestCard = sortCardsAsc(this.currentCombo.cards)[0];
          this.currentCombo = classifyCombo([lowestCard]);
          this.currentCombo.label = `${this.currentCombo.label} [⚡ Varesa dậm vỡ ${oldLabel}]`;
          skillSummary = `⚡ [Cú Dậm Nghiền Nát] ${player.name} tung cú dậm Lôi Đình nghiền nát ${oldLabel} trên bàn xuống chỉ còn đúng 1 lá Bài Lẻ ${lowestCard.rank}${lowestCard.suit}!`;
        } else {
          const oldRank = RANKS[this.currentCombo.highRank];
          const newRankIdx = Math.max(0, this.currentCombo.highRank - 4);
          this.currentCombo.highRank = newRankIdx;
          this.currentCombo.highValue = newRankIdx * 4 + (this.currentCombo.highCard?.suitIndex || 0);
          this.currentCombo.label = `${this.currentCombo.label} [⚡ Varesa dậm hạ 4 bậc ${oldRank}➔${RANKS[newRankIdx]}]`;
          skillSummary = `⚡ [Cú Dậm Nghiền Nát] ${player.name} dậm lún lá lẻ trên bàn giảm 4 bậc (${oldRank} ➔ ${RANKS[newRankIdx]})!`;
        }
      }
    } else if (charId === 'escoffier') {
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const candidateOpps = unpassedOpps.length > 0 ? unpassedOpps : activeOpponents;
      const target = player.isBot
        ? [...candidateOpps].sort((a, b) => a.hand.length - b.hand.length)[0]
        : pickRandomItem(candidateOpps);
      if (target && player.hand.length >= 2) {
        let trashCard = null;
        if (preferredCardIds && preferredCardIds.length > 0) {
          trashCard = player.hand.find((c) => preferredCardIds.includes(c.id));
        }
        if (!trashCard) {
          const struct = this.analyzeBotHandStructure(player.hand);
          const sortedHand = sortCardsAsc(player.hand);
          trashCard =
            sortedHand.find(
              (c) =>
                c.rankIndex < 12 &&
                struct.rankCounts[c.rankIndex] === 1 &&
                !struct.bombRanks.has(c.rankIndex) &&
                !struct.criticalStraightRanks.has(c.rankIndex)
            ) || sortedHand[0];
        }
        if (trashCard) {
          player.hand = player.hand.filter((c) => c.id !== trashCard.id);
          target.hand.push(trashCard);
          player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
          target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
          this.selectedCardIds.clear();
          this.companionCardIds.clear();
          if (player.id === this.mySeatId || target.id === this.mySeatId) {
            skillSummary = `🍰 [Bữa Tiệc Ép Ăn] ${player.name} nhét thẳng lá ${trashCard.rank}${trashCard.suit} vào tay ${target.name} (${player.name} giảm còn ${player.hand.length} lá, ${target.name} tăng lên ${target.hand.length} lá)!`;
          } else {
            skillSummary = `🍰 [Bữa Tiệc Ép Ăn] ${player.name} dọn món đặc biệt ép ${target.name} phải nhận thêm 1 lá bài rác vào tay (${player.name} còn ${player.hand.length} lá)!`;
          }
        }
      }
    } else if (charId === 'zibai') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const cands = sortCardsAsc(player.hand).filter(
        (c) => c.rankIndex <= 10 && !struct.bombRanks.has(c.rankIndex)
      );
      const targets = (cands.length > 0 ? cands : sortCardsAsc(player.hand).filter((c) => c.rankIndex <= 10)).slice(0, 2);
      const changes = [];
      targets.forEach((c) => {
        const oldStr = `${c.rank}${c.suit}`;
        const newRank = Math.min(11, c.rankIndex + 1);
        c.rankIndex = newRank;
        c.rank = RANKS[newRank];
        c.value = newRank * 4 + c.suitIndex;
        c.id = `${c.rank}${c.suit}_zibai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        changes.push(`${oldStr}➔${c.rank}${c.suit}`);
      });
      player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
      this.selectedCardIds.clear();
      this.companionCardIds.clear();
      skillSummary = `🐎 [Bạch Mã Đạp Vân] ${player.name} nâng +1 bậc số cho ${changes.length} lá bài trên tay (${changes.join(', ')})!`;
    } else if (charId === 'lauma') {
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12) {
        const oldLabel = this.currentCombo.label;
        const sortedComboCards = sortCardsAsc(this.currentCombo.cards);
        const recoveredSource = sortedComboCards[sortedComboCards.length - 1];
        const recoveredCard = {
          rank: recoveredSource.rank,
          suit: recoveredSource.suit,
          rankIndex: recoveredSource.rankIndex,
          suitIndex: recoveredSource.suitIndex,
          value: recoveredSource.value,
          isRed: recoveredSource.suitIndex >= 2,
          id: `${recoveredSource.rank}${recoveredSource.suit}_lauma_${Date.now()}`,
        };
        player.hand.push(recoveredCard);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        if (sortedComboCards.length >= 2) {
          const remaining = sortedComboCards.slice(0, sortedComboCards.length - 1);
          const nextCombo = classifyCombo(remaining) || classifyCombo([remaining[remaining.length - 1]]);
          this.currentCombo = nextCombo;
          this.currentCombo.label = `${this.currentCombo.label} [🦌 Lauma thu hồi ${recoveredCard.rank}${recoveredCard.suit}]`;
          skillSummary = `🦌 [Nguyệt Quang Hồi Phục] ${player.name} thu hồi lá lớn nhất ${recoveredCard.rank}${recoveredCard.suit} từ ${oldLabel} trên bàn về tay mình!`;
        } else {
          this.previousCombo = this.currentCombo;
          this.currentCombo = null;
          this.trickOwnerId = player.id;
          this.players.forEach((p) => {
            p.passed = false;
            p.declinedFourPairsCut = false;
          });
          skillSummary = `🦌 [Nguyệt Quang Hồi Phục] ${player.name} thu hồi lá ${recoveredCard.rank}${recoveredCard.suit} trên bàn về tay và giành quyền mở vòng mới!`;
        }
        this.selectedCardIds = new Set([recoveredCard.id]);
        this.companionCardIds.clear();
      } else {
        const struct = this.analyzeBotHandStructure(player.hand);
        let pairRank = -1;
        for (let r = 10; r >= 0; r--) {
          if (struct.rankCounts[r] >= 2) {
            pairRank = r;
            break;
          }
        }
        const targets =
          pairRank >= 0
            ? player.hand.filter((c) => c.rankIndex === pairRank).slice(0, 2)
            : sortCardsAsc(player.hand).filter((c) => c.rankIndex <= 10).slice(0, 2);
        const changes = [];
        targets.forEach((c, idx) => {
          const oldStr = `${c.rank}${c.suit}`;
          const newRank = Math.min(11, c.rankIndex + 2);
          c.rankIndex = newRank;
          c.rank = RANKS[newRank];
          c.value = newRank * 4 + c.suitIndex;
          c.id = `${c.rank}${c.suit}_lauma_${Date.now()}_${idx}`;
          changes.push(`${oldStr}➔${c.rank}${c.suit}`);
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(targets.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `🦌 [Nguyệt Quang Hồi Phục] ${player.name} truyền ánh trăng nâng +2 bậc cho bộ bài trên tay (${changes.join(', ')})!`;
      }
    } else if (charId === 'linnea') {
      const sorted = sortCardsAsc(player.hand);
      const rc = new Array(13).fill(0);
      sorted.forEach((c) => rc[c.rankIndex]++);
      const lowest = sorted.find((c) => rc[c.rankIndex] === 1 && c.rankIndex < 12) || sorted[0];
      let matchTarget = null;
      if (preferredCardIds && preferredCardIds.length > 0) {
        matchTarget = player.hand.find(
          (c) =>
            preferredCardIds.includes(c.id) &&
            c.id !== lowest?.id &&
            c.rankIndex <= 11 &&
            rc[c.rankIndex] === 1
        );
      }
      if (!matchTarget) {
        const singleNormals = sorted.filter(
          (c) => c.id !== lowest?.id && c.rankIndex <= 11 && rc[c.rankIndex] === 1
        );
        matchTarget =
          singleNormals.length > 0
            ? singleNormals[singleNormals.length - 1]
            : sorted.filter((c) => c.id !== lowest?.id && c.rankIndex <= 11).pop() ||
              sorted[sorted.length - 1];
      }
      if (lowest && matchTarget && lowest.id !== matchTarget.id) {
        const oldStr = `${lowest.rank}${lowest.suit}`;
        const targetRank = Math.min(11, matchTarget.rankIndex);
        lowest.rankIndex = targetRank;
        lowest.rank = RANKS[targetRank];
        lowest.suitIndex = matchTarget.suitIndex === 3 ? 2 : 3;
        lowest.suit = SUITS[lowest.suitIndex];
        lowest.isRed = lowest.suitIndex >= 2;
        lowest.value = lowest.rankIndex * 4 + lowest.suitIndex;
        lowest.id = `${lowest.rank}${lowest.suit}_linnea_${Date.now()}`;
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set([lowest.id, matchTarget.id]);
        this.companionCardIds.clear();
        skillSummary = `🎩 [Ảo Thuật Ghép Đôi] ${player.name} biến lá lẻ ${oldStr} thành ${lowest.rank}${lowest.suit} để tạo thành Đôi ${RANKS[targetRank]} (${lowest.rank}${lowest.suit} ${matchTarget.rank}${matchTarget.suit})!`;
      }
    } else if (charId === 'nefer') {
      const sorted = sortCardsAsc(player.hand);
      const rankCounts = new Array(13).fill(0);
      sorted.forEach((c) => rankCounts[c.rankIndex]++);
      let targetPairRank = -1;
      for (let r = 11; r >= 0; r--) {
        if (rankCounts[r] === 2) {
          targetPairRank = r;
          break;
        }
      }
      if (targetPairRank >= 0) {
        const trashCand =
          sorted.find((c) => c.rankIndex !== targetPairRank && rankCounts[c.rankIndex] === 1) ||
          sorted.find((c) => c.rankIndex !== targetPairRank);
        if (trashCand) {
          const oldStr = `${trashCand.rank}${trashCand.suit}`;
          const existingSuits = new Set(
            player.hand.filter((c) => c.rankIndex === targetPairRank).map((c) => c.suitIndex)
          );
          let newSuitIdx = 3;
          for (const s of [3, 2, 1, 0]) {
            if (!existingSuits.has(s)) {
              newSuitIdx = s;
              break;
            }
          }
          trashCand.rankIndex = targetPairRank;
          trashCand.rank = RANKS[targetPairRank];
          trashCand.suitIndex = newSuitIdx;
          trashCand.suit = SUITS[newSuitIdx];
          trashCand.isRed = newSuitIdx >= 2;
          trashCand.value = targetPairRank * 4 + newSuitIdx;
          trashCand.id = `${trashCand.rank}${trashCand.suit}_nefer_${Date.now()}`;
          player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
          const tripleCards = player.hand.filter((c) => c.rankIndex === targetPairRank).slice(0, 3);
          this.selectedCardIds = new Set(tripleCards.map((c) => c.id));
          this.companionCardIds.clear();
          skillSummary = `🐍 [Ảo Ảnh Sa Mạc] ${player.name} biến lá rác ${oldStr} thành ${trashCand.rank}${trashCand.suit} để nâng cấp Đôi ${RANKS[targetPairRank]} lên thành Sám Cô ${RANKS[targetPairRank]}!`;
        }
      } else {
        const lowest = sorted[0];
        const highNormals = sorted.filter((c) => c.id !== lowest?.id && c.rankIndex <= 11);
        const matchTarget = highNormals.length > 0 ? highNormals[highNormals.length - 1] : sorted[sorted.length - 1];
        if (lowest && matchTarget && lowest.id !== matchTarget.id) {
          const oldStr = `${lowest.rank}${lowest.suit}`;
          const targetRank = Math.min(11, matchTarget.rankIndex);
          lowest.rankIndex = targetRank;
          lowest.rank = RANKS[targetRank];
          lowest.suitIndex = matchTarget.suitIndex === 3 ? 2 : 3;
          lowest.suit = SUITS[lowest.suitIndex];
          lowest.isRed = lowest.suitIndex >= 2;
          lowest.value = targetRank * 4 + lowest.suitIndex;
          lowest.id = `${lowest.rank}${lowest.suit}_nefer_${Date.now()}`;
          player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
          this.selectedCardIds = new Set([lowest.id, matchTarget.id]);
          this.companionCardIds.clear();
          skillSummary = `🐍 [Ảo Ảnh Sa Mạc] ${player.name} biến lá rác ${oldStr} thành ${lowest.rank}${lowest.suit} để tạo Đôi ${RANKS[targetRank]}!`;
        }
      }
    } else if (charId === 'odette') {
      if (this.currentCombo && !this.currentCombo.isBomb) {
        if (this.currentCombo.length >= 2) {
          const oldLabel = this.currentCombo.label;
          const sortedCards = sortCardsAsc(this.currentCombo.cards);
          const trimmed = sortedCards.slice(0, sortedCards.length - 1);
          const newCombo = classifyCombo(trimmed) || classifyCombo([sortedCards[0]]);
          this.currentCombo = newCombo;
          this.currentCombo.label = `${this.currentCombo.label} [🦢 Odette cắt bớt 1 lá từ ${oldLabel}]`;
          skillSummary = `🦢 [Vũ Điệu Thiên Nga] ${player.name} múa kiếm băng cắt bớt 1 lá cao nhất khỏi ${oldLabel} trên bàn xuống còn ${newCombo.label}!`;
        } else {
          const oldRank = RANKS[this.currentCombo.highRank];
          const newRankIdx = Math.max(0, this.currentCombo.highRank - 3);
          this.currentCombo.highRank = newRankIdx;
          this.currentCombo.highValue = newRankIdx * 4 + (this.currentCombo.highCard?.suitIndex || 0);
          this.currentCombo.label = `${this.currentCombo.label} [🦢 Odette hạ 3 bậc ${oldRank}➔${RANKS[newRankIdx]}]`;
          skillSummary = `🦢 [Vũ Điệu Thiên Nga] ${player.name} hạ 3 bậc lá lẻ trên bàn (${oldRank} ➔ ${RANKS[newRankIdx]})!`;
        }
      }
    } else if (charId === 'vesna') {
      const target = [...activeOpponents].sort((a, b) => a.hand.length - b.hand.length)[0];
      if (target && target.hand.length > 0) {
        const oppCards = sortCardsAsc(target.hand).filter((c) => c.rankIndex <= 11).reverse().slice(0, 2);
        const lowered = [];
        oppCards.forEach((c) => {
          const oldR = c.rank;
          const newR = Math.max(0, c.rankIndex - 2);
          c.rankIndex = newR;
          c.rank = RANKS[newR];
          c.value = newR * 4 + c.suitIndex;
          c.id = `${c.rank}${c.suit}_vesna_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
          lowered.push(`${oldR}➔${c.rank}`);
        });
        target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
        skillSummary = `🍃 [Lốc Phong Xoáy Ngược] ${player.name} cuốn lốc phong làm giảm 2 bậc cho ${lowered.length} lá bài lớn trên tay ${target.name} (${lowered.join(', ')})!`;
      }
    } else if (charId === 'sandrone') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const isolated = sortCardsAsc(player.hand).filter(
        (c) => c.rankIndex <= 11 && struct.rankCounts[c.rankIndex] === 1 && !struct.bombRanks.has(c.rankIndex)
      );
      const pool = (isolated.length >= 3 ? isolated : sortCardsAsc(player.hand).filter((c) => c.rankIndex <= 11)).slice(0, 3);
      if (pool.length === 3) {
        const baseRank = Math.min(9, Math.max(1, pool[1].rankIndex - 1));
        pool.forEach((c, idx) => {
          const rIdx = baseRank + idx;
          c.rankIndex = rIdx;
          c.rank = RANKS[rIdx];
          c.value = rIdx * 4 + c.suitIndex;
          c.id = `${c.rank}${c.suit}_sandrone_${Date.now()}_${idx}`;
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(pool.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `⚙️ [Dây Cót Con Rối] ${player.name} tái cấu trúc 3 lá bài lẻ thành bộ Sảnh 3 lá ${RANKS[baseRank]}-${RANKS[baseRank + 1]}-${RANKS[baseRank + 2]}!`;
      }
    } else if (charId === 'columbina') {
      this.columbinaExtraTurnReady = true;
      skillSummary = `🕊️ [Khúc Ca Thiên Thần] ${player.name} ngân vang thánh ca: Sau khi đánh 1 bộ bài trong lượt này, Columbina được đánh bồi thêm 1 bộ nữa ngay lập tức!`;
    } else if (charId === 'vodyanitsa') {
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12) {
        const needLen = this.currentCombo.length;
        const struct = this.analyzeBotHandStructure(player.hand);
        const sorted = sortCardsAsc(player.hand);
        const isolated = sorted.filter(
          (c) => c.rankIndex <= 11 && struct.rankCounts[c.rankIndex] === 1 && !struct.bombRanks.has(c.rankIndex)
        );
        const nonBomb = sorted.filter((c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex));
        const chosenTrash = [];
        for (const c of [...isolated, ...nonBomb, ...sorted]) {
          if (chosenTrash.length >= needLen) break;
          if (!chosenTrash.some((x) => x.id === c.id)) {
            chosenTrash.push(c);
          }
        }
        const targetHighRank = Math.min(11, this.currentCombo.highRank + 1);
        const oldCardsStr = chosenTrash.map((c) => `${c.rank}${c.suit}`).join(', ');
        if (this.currentCombo.type === COMBO_TYPES.STRAIGHT && needLen >= 3) {
          const topRank = Math.max(needLen - 1, targetHighRank);
          const startRank = topRank - needLen + 1;
          chosenTrash.forEach((c, idx) => {
            const rIdx = startRank + idx;
            const sIdx = idx === needLen - 1 ? 3 : idx % 3;
            c.rankIndex = rIdx;
            c.rank = RANKS[rIdx];
            c.suitIndex = sIdx;
            c.suit = SUITS[sIdx];
            c.isRed = sIdx >= 2;
            c.value = rIdx * 4 + sIdx;
            c.id = `${c.rank}${c.suit}_vody_${Date.now()}_${idx}`;
          });
        } else {
          const suitsOrder = [3, 2, 1, 0];
          chosenTrash.forEach((c, idx) => {
            const sIdx = suitsOrder[idx % 4];
            c.rankIndex = targetHighRank;
            c.rank = RANKS[targetHighRank];
            c.suitIndex = sIdx;
            c.suit = SUITS[sIdx];
            c.isRed = sIdx >= 2;
            c.value = targetHighRank * 4 + sIdx;
            c.id = `${c.rank}${c.suit}_vody_${Date.now()}_${idx}`;
          });
        }
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(chosenTrash.map((c) => c.id));
        this.companionCardIds.clear();
        const mirroredCombo = classifyCombo(chosenTrash);
        const newLabel = mirroredCombo ? mirroredCombo.label : chosenTrash.map((c) => `${c.rank}${c.suit}`).join(' ');
        skillSummary = `🪞 [Gương Nước Phản Chiếu] ${player.name} biến (${oldCardsStr}) thành ${newLabel} (+1 bậc so với ${this.currentCombo.label} trên bàn) để đè ngay lập tức!`;
      }
    } else if (charId === 'lohen') {
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12 && prevTrickOwner) {
        const oldLabel = this.currentCombo.label;
        this.trickOwnerId = player.id;
        this.currentCombo.ownerSkin = player.cardSkin || 'classic';
        this.currentCombo.label = `${oldLabel} [⚔️ Lohen Phản Đòn!]`;
        this.players.forEach((p) => {
          if (p.active && p.finishRank === null) {
            p.passed = false;
            p.declinedFourPairsCut = false;
          }
        });
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        skillSummary = `⚔️ [Khiên Phản Đòn Tây Phong] ${player.name} dựng khiên phản ngược ${oldLabel} trả lại bắt ${prevTrickOwner.name} (cùng cả bàn) phải tự đỡ lại chính bộ bài của họ!`;
      }
    } else if (charId === 'durin') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const sortedDesc = [...sortCardsAsc(player.hand)].reverse();
      let targetCard = null;
      if (preferredCardIds && preferredCardIds.length > 0) {
        targetCard = player.hand.find((c) => preferredCardIds.includes(c.id) && c.rankIndex < 12);
      }
      if (!targetCard) {
        targetCard =
          sortedDesc.find((c) => c.rankIndex < 12 && !struct.bombRanks.has(c.rankIndex)) ||
          sortedDesc.find((c) => c.rankIndex < 12);
      }
      if (targetCard) {
        const oldStr = `${targetCard.rank}${targetCard.suit}`;
        targetCard.rankIndex = 12;
        targetCard.rank = '2';
        targetCard.suitIndex = 3;
        targetCard.suit = '♥';
        targetCard.isRed = true;
        targetCard.value = 12 * 4 + 3;
        targetCard.id = `2♥_durin_${Date.now()}`;
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set([targetCard.id]);
        this.companionCardIds.clear();
        skillSummary = `🩸 [Trái Tim Rồng Đỏ] ${player.name} truyền máu Hắc Long biến lá cao nhất dưới Heo (${oldStr}) hóa thành con Heo Cơ 2♥ thực thụ!`;
      }
    } else if (charId === 'xiao') {
      this.xiaoPlungeSingleTurn = true;
      activeXiaoPlungeSingle = true;
      const minRank = this.currentCombo ? this.currentCombo.highRank : 0;
      const plungeCand = sortCardsAsc(player.hand).find((c) => c.rankIndex >= minRank);
      if (plungeCand) {
        this.selectedCardIds = new Set([plungeCand.id]);
        this.companionCardIds.clear();
      }
      skillSummary = `👹 [Không Trung Đạp Kích] ${player.name} nhảy vọt lên không trung dậm thương xuống: Trong lượt này được dùng 1 Lá Lẻ duy nhất để đâm thủng Đôi, Sám Cô hoặc Sảnh trên bàn!`;
    } else if (charId === 'wanderer') {
      const activePl = this.players.filter((p) => p.active && p.finishRank === null && p.hand.length > 0);
      const counts = activePl.map((p) => p.hand.length);
      const allCards = [];
      activePl.forEach((p) => {
        allCards.push(...p.hand);
      });
      const shuffledPool = shuffleDeck(allCards);
      let cursor = 0;
      activePl.forEach((p, idx) => {
        const cnt = counts[idx];
        const dealt = shuffledPool.slice(cursor, cursor + cnt);
        cursor += cnt;
        p.hand = sortHandByMode(dealt, p.id === this.mySeatId ? this.sortMode : 'asc');
      });
      this.selectedCardIds.clear();
      this.companionCardIds.clear();
      skillSummary = `🌀 [Cuồng Phong Đảo Mệnh] ${player.name} triệu hồi lốc xoáy thu gom toàn bộ ${allCards.length} lá bài của tất cả người chơi trên bàn, xáo trộn ngẫu nhiên rồi chia lại!`;
    } else if (charId === 'kinich') {
      this.kinichBombOwnerId = player.id;
      skillSummary = `🎮 [Gài Bom Hẹn Giờ Ajaw] ${player.name} đặt Bom Pixel Ajaw lên bàn bài: Đối thủ nào dám đánh đè lên bài của ${player.name} trong vòng này sẽ kích nổ bom nhận thêm 1 lá bài rác!`;
    } else if (charId === 'venti') {
      const suckedFromOpps = [];
      const oppTargets = [];
      activeOpponents.forEach((opp) => {
        if (opp.hand.length > 0) {
          const oppSorted = sortCardsAsc(opp.hand);
          const oppNormals = oppSorted.filter((c) => c.rankIndex <= 11);
          const highCard = oppNormals.length > 0 ? oppNormals[oppNormals.length - 1] : oppSorted[oppSorted.length - 1];
          opp.hand = opp.hand.filter((c) => c.id !== highCard.id);
          suckedFromOpps.push(highCard);
          oppTargets.push(opp);
        }
      });
      const k = Math.min(suckedFromOpps.length, player.hand.length);
      if (k > 0) {
        const mySorted = sortCardsAsc(player.hand);
        const myTrash = mySorted.slice(0, k);
        const myTrashIds = new Set(myTrash.map((c) => c.id));
        player.hand = player.hand.filter((c) => !myTrashIds.has(c.id));
        const vortexPool = sortCardsAsc([...suckedFromOpps, ...myTrash]);
        const returnToOpps = vortexPool.slice(0, oppTargets.length);
        const keepForVenti = vortexPool.slice(oppTargets.length);
        player.hand.push(...keepForVenti);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        oppTargets.forEach((opp, idx) => {
          if (returnToOpps[idx]) {
            opp.hand.push(returnToOpps[idx]);
            opp.hand = sortHandByMode(opp.hand, opp.id === this.mySeatId ? this.sortMode : 'asc');
          }
        });
        this.selectedCardIds = new Set(keepForVenti.map((c) => c.id));
        this.companionCardIds.clear();
        const gainedStr = keepForVenti.map((c) => `${c.rank}${c.suit}`).join(', ');
        skillSummary = `🌪️ [Hố Đen Phong Thần] ${player.name} hút lá bài lớn nhất của ${oppTargets.length} đối thủ vào tâm bão, thu về (${gainedStr}) và thổi trả toàn bộ lá bài rác cho các đối thủ!`;
      }
    }

    if (prevTrickOwner) {
      this.applyElementalReactionBonus(player, prevTrickOwner, rx);
    }

    this.lastBurstEffect = {
      id: Date.now(),
      type: charId,
      burstId: charId,
      isWin: false,
      lockGameplay: true,
      detail: skillSummary,
    };
    const onBurstDone =
      charId === 'lohen'
        ? () => {
            if (!this.isGameOver) {
              this.advanceTurn();
              if (this.isMultiplayer && this.isHost) {
                this.broadcastState();
              }
            }
          }
        : null;
    this.triggerGenshinBurst(charId, skillSummary, onBurstDone, true);
    this.showComboBanner(`🔮 KỸ NĂNG ${sk.charName.toUpperCase()}: ${sk.name.toUpperCase()}!`, rx.cssClass);
    this.addLog(`🔮 <strong>${skillSummary}</strong>`, 'log-win');

    this.updateArenaBackdropCharacters();
    this.renderRoundSkillStatusBar();
    this.renderAll();
    setTimeout(() => {
      this.saveActiveMatchSnapshot();
    }, 350);
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    return true;
  }

  maybeBotUseSkill(bot, validMoves) {
    if (!bot || !bot.isBot || bot.skillUsed || this.isGameOver || this.isBurstPlaying) return false;
    const check = this.canUseCharacterSkill(bot);
    if (!check.ok) return false;

    const charId = check.charId;
    const activeOpponents = this.players.filter(
      (p) => p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0
    );
    if (activeOpponents.length === 0) return false;

    const unpassedOpps = activeOpponents.filter((p) => !p.passed);
    const minOppCards = Math.min(...activeOpponents.map((p) => p.hand.length));
    const rankCounts = new Array(13).fill(0);
    bot.hand.forEach((c) => rankCounts[c.rankIndex]++);
    const struct = this.analyzeBotHandStructure(bot.hand);

    // Tính trước nước đi dự kiến của Bot để KHÔNG BAO GIỜ tung kỹ năng hỗ trợ vòng rồi lại Bỏ Lượt!
    const plannedMove = !this.currentCombo
      ? this.chooseBotLeadMove(bot, validMoves)
      : this.chooseBotResponseMove(bot, validMoves);

    let shouldCast = false;
    let preferredIds = [];

    if (charId === 'raiden') {
      // Cắt vòng khi trên bàn là Lẻ/Đôi <= J mà Bot không muốn/không thể đỡ (hoặc phải tốn Heo mới đỡ được), hoặc khi cần cướp cái gấp
      const wouldSpendTwo = plannedMove && plannedMove.highRank === 12;
      if (
        this.currentCombo &&
        (this.currentCombo.type === COMBO_TYPES.SINGLE || this.currentCombo.type === COMBO_TYPES.PAIR) &&
        this.currentCombo.highRank <= 8 &&
        !this.currentCombo.isBomb &&
        (!plannedMove || wouldSpendTwo || bot.hand.length <= 5 || minOppCards <= 4)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'eula') {
      // Chế độ 1: Trên bàn có bộ bài thường (6..A) mà Bot không đỡ được bằng bài thường (sắp phải Bỏ lượt hoặc tốn Heo),
      // nhưng sau khi Eula chém giảm 2 bậc thì Bot có bài thường đỡ được ngay!
      if (this.currentCombo && this.currentCombo.highRank >= 3 && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb) {
        const hasGoodNormalMoveNow = plannedMove && plannedMove.highRank < 12 && !plannedMove.isBomb;
        if (!hasGoodNormalMoveNow) {
          const loweredRank = Math.max(0, this.currentCombo.highRank - 2);
          const fakeLowerCombo = {
            ...this.currentCombo,
            highRank: loweredRank,
            highValue: loweredRank * 4 + (this.currentCombo.highCard?.suitIndex || 0),
          };
          const movesAfterSlash = getValidMoves(bot.hand, fakeLowerCombo, this.mustPlay3Spade, false).filter(
            (m) => m.highRank < 12 && !m.isBomb
          );
          if (movesAfterSlash.length > 0) {
            shouldCast = true;
          }
        }
      } else if (!this.currentCombo && plannedMove && !plannedMove.isBomb && plannedMove.highRank >= 5 && plannedMove.highRank <= 9) {
        // Chế độ 2: Khi Bot mở vòng mới bằng bộ ghép (Đôi/Sám/Sảnh tầm trung 8..Q) và còn <= 8 lá -> Cường hóa +2 bậc thành 10..A khó đỡ!
        if (
          (plannedMove.type !== COMBO_TYPES.SINGLE && bot.hand.length <= 8) ||
          (bot.hand.length <= 4 && minOppCards <= 5)
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'mavuika') {
      // Rèn +1 bậc ♥ cho 1 lá (3..K) để đỡ bài trên bàn hoặc ghép lá lẻ cô lập thành Đôi/Sám Cô
      const forgeCandidates = sortCardsAsc(bot.hand).filter(
        (c) => c.rankIndex <= 10 && !struct.bombRanks.has(c.rankIndex)
      );
      let bestCard = null;
      const needHelpToBeat = this.currentCombo && (!plannedMove || plannedMove.highRank === 12) && !this.currentCombo.isBomb;
      if (needHelpToBeat) {
        bestCard = forgeCandidates.find((c) => {
          const newRank = Math.min(11, c.rankIndex + 1);
          const newVal = newRank * 4 + 3;
          if (this.currentCombo.type === COMBO_TYPES.SINGLE) {
            return newVal > this.currentCombo.highValue;
          }
          if (this.currentCombo.type === COMBO_TYPES.PAIR && rankCounts[newRank] >= 1) {
            return newVal > this.currentCombo.highValue;
          }
          if (this.currentCombo.type === COMBO_TYPES.TRIPLE && rankCounts[newRank] >= 2) {
            return newVal > this.currentCombo.highValue;
          }
          return false;
        });
      }
      if (!bestCard && (!this.currentCombo || plannedMove) && (bot.hand.length <= 9 || minOppCards <= 7)) {
        // Ưu tiên rèn lá lẻ cô lập mà bậc kế tiếp đã có sẵn bài -> biến rác lẻ thành Đôi/Sám Cô!
        bestCard = forgeCandidates.find(
          (c) =>
            rankCounts[c.rankIndex] === 1 &&
            !struct.criticalStraightRanks.has(c.rankIndex) &&
            rankCounts[c.rankIndex + 1] >= 1
        );
      }
      if (!bestCard && (!this.currentCombo || plannedMove) && bot.hand.length <= 5) {
        // Cuối ván: nâng lá K -> A♥ hoặc Q -> K♥ để làm chủ ván
        bestCard = forgeCandidates.find((c) => c.rankIndex >= 9 && rankCounts[c.rankIndex] === 1);
      }
      if (bestCard) {
        shouldCast = true;
        preferredIds = [bestCard.id];
      }
    } else if (charId === 'skirk') {
      // Vì Skirk tráo ngẫu nhiên 1 lá trên tay với 1 đối thủ ngẫu nhiên:
      // Chỉ dùng khi tay Bot KHÔNG giữ Hàng và KHÔNG giữ Heo (tránh bị mất Heo/Hàng oan), đồng thời bài đang xấu hoặc tắc đường!
      const hasTwos = rankCounts[12] > 0;
      const hasBombs = struct.bombRanks.size > 0;
      const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
      if (!hasTwos && !hasBombs && bot.hand.length >= 2) {
        if ((!plannedMove && this.currentCombo) || lowCardsCount >= Math.ceil(bot.hand.length * 0.5)) {
          shouldCast = true;
        }
      }
    } else if (charId === 'furina') {
      // TH1: Đang bị chặn bởi bài < 2, thử bật đảo ngược chất (♠ > ♣ > ♦ > ♥) xem có tạo ra nước đè đồng số không!
      if (this.currentCombo && !plannedMove && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb) {
        const prevRev = activeFurinaReverseSuit;
        activeFurinaReverseSuit = true;
        const movesWithReverse = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false);
        const reverseChoice = this.chooseBotResponseMove(bot, movesWithReverse);
        activeFurinaReverseSuit = prevRev;
        if (reverseChoice) {
          shouldCast = true;
        }
      }
      // TH2: Bot chuẩn bị đánh bài Lẻ cao (10..A) khi đối thủ còn ít bài -> Bật Furina để CẤM đối thủ đập Heo lẻ!
      if (
        !shouldCast &&
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.type === COMBO_TYPES.SINGLE &&
        plannedMove.highRank >= 7 &&
        plannedMove.highRank <= 11 &&
        (minOppCards <= 7 || bot.hand.length <= 6)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yaemiko') {
      // Chỉ bật Hồ Ly Dụ Hoặc khi Bot CHẮC CHẮN ĐÁNH BÀI (plannedMove !== null) và còn đối thủ trong vòng:
      // Dùng khi đánh bài khá mạnh (9..A) hoặc khi có Hàng chờ chặt Heo, ép đối thủ không được Bỏ lượt giấu Heo!
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.highRank >= 6 &&
        plannedMove.highRank <= 11 &&
        (struct.bombRanks.size > 0 || minOppCards <= 7 || bot.hand.length <= 6)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'hutao') {
      // Chỉ yểm Bùa Vãng Sinh khi Bot CHẮC CHẮN ĐÁNH ra một bộ bài vừa phải (<= Q) và còn ít nhất 2 đối thủ chưa bỏ lượt
      // để các đối thủ đè nhau liên tục nhiều lượt -> thu tối đa tiền thuế!
      if (
        plannedMove &&
        unpassedOpps.length >= 2 &&
        plannedMove.highRank <= 9 &&
        !plannedMove.isBomb &&
        (bot.hand.length <= 10 || minOppCards <= 9)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ayaka') {
      // Chỉ đóng băng khi Bot CHẮC CHẮN ĐÁNH BÀI và cần khóa bớt đối thủ để giữ cái hoặc ngăn đối thủ ít bài về nhất
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.highRank < 12 &&
        (minOppCards <= 6 || bot.hand.length <= 6)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'clorinde') {
      // Chỉ mở Quyết Đấu 1v1 khi Bot CHẮC CHẮN ĐÁNH BÀI và trong vòng ĐANG CÓ TỪ 2 ĐỐI THỦ CHƯA BỎ LƯỢT TRỞ LÊN
      // (nếu chỉ còn 1 đối thủ chưa bỏ lượt thì vốn dĩ đã là 1v1 rồi, không bao giờ tung phí skill!)
      if (
        plannedMove &&
        unpassedOpps.length >= 2 &&
        (bot.hand.length <= 7 || minOppCards <= 6 || plannedMove.highRank >= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yelan') {
      // Chỉ thấu thị khi Bot CHẮC CHẮN ĐÁNH BÀI ở giai đoạn giữa/cuối ván (tránh tung xong rồi Bỏ lượt)
      if (plannedMove && (minOppCards <= 6 || bot.hand.length <= 7)) {
        shouldCast = true;
      }
    } else if (charId === 'navia') {
      // Khóa 3 lá bài của đối thủ ít bài nhất trong vòng khi Bot CHẮC CHẮN ĐÁNH BÀI (đặc biệt khi đối thủ còn <= 6 lá, khóa 3 lá là tê liệt tay bài!)
      const minUnpassedCards = unpassedOpps.length > 0 ? Math.min(...unpassedOpps.map((p) => p.hand.length)) : 99;
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (minUnpassedCards <= 6 || (bot.hand.length <= 6 && plannedMove.highRank >= 6))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'shenhe') {
      // TH1: Trên bàn đang là Đôi/Sám/Sảnh mà Bot không đỡ được (hoặc phải tốn Đôi Heo) -> Phong ấn biến bộ trên bàn về 1 lá Lẻ nhỏ nhất để Bot đè!
      const wouldSpendTwoCombo = plannedMove && plannedMove.highRank === 12;
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.type !== COMBO_TYPES.SINGLE &&
        (!plannedMove || wouldSpendTwoCombo)
      ) {
        const lowestOnTable = sortCardsAsc(this.currentCombo.cards)[0];
        const fakeSingle = classifyCombo([lowestOnTable]);
        const singleMoves = getValidMoves(bot.hand, fakeSingle, this.mustPlay3Spade, false).filter(
          (m) =>
            !m.isBomb &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex)) &&
            (m.highRank < 12 || minOppCards <= 5)
        );
        if (singleMoves.length > 0) {
          shouldCast = true;
        }
      }
      // TH2: Bot chuẩn bị đánh Bài Lẻ và muốn cấm đối thủ xả Đôi/Sám/Sảnh (khi đối thủ sắp về <= 5 lá hoặc tay Bot nhiều lá lẻ)
      const isolatedSingleCount = bot.hand.filter(
        (c) =>
          c.rankIndex < 12 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      ).length;
      if (
        !shouldCast &&
        plannedMove &&
        plannedMove.type === COMBO_TYPES.SINGLE &&
        unpassedOpps.length >= 1 &&
        (minOppCards <= 5 || (bot.hand.length <= 6 && isolatedSingleCount >= 2 && plannedMove.highRank >= 6))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ganyu') {
      // Bật Sảnh Khuyết khi:
      // 1) Đang bị Sảnh trên bàn chặn (hoặc phải xé bộ nặng mới đỡ được) mà bật Sảnh Khuyết có ngay Sảnh đè được!
      // 2) Khi mở vòng mới và Sảnh Khuyết giúp nối các lá lẻ rời rạc thành Sảnh dài (hoặc đánh 1 phát hết bài) mà không làm gãy Hàng!
      const needHelpAgainstStraight =
        this.currentCombo &&
        this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
        (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 90);
      if (!this.currentCombo || needHelpAgainstStraight) {
        const prevGap = activeGanyuGapStraight;
        activeGanyuGapStraight = true;
        const gapMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) => m.isGapStraight && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeGanyuGapStraight = prevGap;
        if (needHelpAgainstStraight && gapMoves.length > 0) {
          shouldCast = true;
        } else if (
          !this.currentCombo &&
          gapMoves.some(
            (m) => m.length === bot.hand.length || this.evaluateMoveBreakCost(m, struct) <= 45
          )
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'kokomi') {
      // TH1: Đang bị chặn bởi bài cao (10..A) trên bàn mà Bot chỉ có bài nhỏ -> Bật Thủy Triều Đảo Ngược (3 > 4 > ... > A) để lấy bài nhỏ đè bài lớn!
      if (
        this.currentCombo &&
        this.currentCombo.highRank >= 7 &&
        this.currentCombo.highRank < 12 &&
        !this.currentCombo.isBomb &&
        (!plannedMove || plannedMove.highRank === 12)
      ) {
        const prevRevRank = activeKokomiReverseRank;
        activeKokomiReverseRank = true;
        const revMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) =>
            m.highRank < 12 &&
            !m.isBomb &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeKokomiReverseRank = prevRevRank;
        if (revMoves.length > 0) {
          shouldCast = true;
        }
      }
      // TH2: Mở vòng bằng bộ bài nhỏ (3..6) khi tay cầm nhiều bài nhỏ (3..6) ở giữa/cuối ván -> Biến toàn bộ bài nhỏ thành bài trùm!
      const lowBossCards = bot.hand.filter((c) => c.rankIndex <= 3).length;
      if (
        !shouldCast &&
        !this.currentCombo &&
        plannedMove &&
        plannedMove.highRank <= 3 &&
        !plannedMove.isBomb &&
        lowBossCards >= 2 &&
        (bot.hand.length <= 9 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yoimiya') {
      // TH1 (KẾT LIỄU VÁN BÀI NGAY LẬP TỨC): Nếu có nước đi >= 2 lá mà đánh xong chỉ còn đúng 1 lá lẻ trên tay -> Bật Yoimiya đốt luôn lá cuối để Về Nhất ngay!
      const instantBurnWinMove = validMoves.find(
        (m) => m.length >= 2 && bot.hand.length - m.length === 1
      );
      if (instantBurnWinMove) {
        shouldCast = true;
      } else if (
        plannedMove &&
        plannedMove.length >= 2 &&
        !plannedMove.isBomb &&
        bot.hand.length > plannedMove.length &&
        (bot.hand.length <= 10 || minOppCards <= 8)
      ) {
        // TH2: Chỉ bật khi ngoài bộ sắp đánh ra, trên tay thực sự có ít nhất 1 lá rác lẻ cô lập (<= J) để đốt mà không làm hỏng Đôi/Sảnh/Heo/Hàng!
        const plannedIds = new Set(plannedMove.cards.map((c) => c.id));
        const remCards = bot.hand.filter((c) => !plannedIds.has(c.id));
        const hasTrueTrashSingle = remCards.some(
          (c) =>
            c.rankIndex <= 9 &&
            struct.rankCounts[c.rankIndex] === 1 &&
            !struct.bombRanks.has(c.rankIndex) &&
            !struct.criticalStraightRanks.has(c.rankIndex)
        );
        if (hasTrueTrashSingle) {
          shouldCast = true;
        }
      }
    } else if (charId === 'xilonen') {
      if (activeOpponents.length >= 2) {
        // Bàn 3-4 người (xào tung bài giữa các đối thủ): Chỉ tung khi đối thủ sắp về (<= 6 lá) để phá nát Đôi/Sảnh chờ về của đối phương!
        if ((!this.currentCombo || plannedMove) && minOppCards <= 6) {
          shouldCast = true;
        }
      } else if (activeOpponents.length === 1) {
        // Bàn Solo 1v1 (đổi 2 lá ngẫu nhiên của Xilonen lấy 2 lá ngẫu nhiên của đối thủ):
        // Chỉ tung khi tay Xilonen không giữ Heo và không giữ Hàng (tránh mất oan Heo/Hàng), hoặc đối thủ sắp về (<= 5 lá) cần phá bộ đối phương!
        const hasTwos = rankCounts[12] > 0;
        const hasBombs = struct.bombRanks.size > 0;
        const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
        if (!hasBombs && (!hasTwos || minOppCards <= 4) && bot.hand.length >= 2) {
          if (
            minOppCards <= 5 ||
            (!plannedMove && this.currentCombo) ||
            lowCardsCount >= Math.ceil(bot.hand.length * 0.5)
          ) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'citlali') {
      // Đảo chiều vòng đánh thông minh khi có >= 2 đối thủ:
      // So sánh đối thủ kế tiếp theo chiều hiện tại (curNextOpp) với đối thủ kế tiếp nếu đảo chiều (revNextOpp)
      if (plannedMove && activeOpponents.length >= 2) {
        const findNextOppInDir = (stepDir) => {
          let idx = bot.id;
          for (let i = 0; i < 4; i++) {
            idx = (idx + stepDir + 4) % 4;
            const p = this.players[idx];
            if (p && p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0) {
              return p;
            }
          }
          return null;
        };
        const curDir = this.turnDirection === -1 ? -1 : 1;
        const curNextOpp = findNextOppInDir(curDir);
        const revNextOpp = findNextOppInDir(-curDir);
        if (curNextOpp && revNextOpp && curNextOpp.id !== revNextOpp.id) {
          const skipDangerousNext =
            curNextOpp.hand.length <= 4 && revNextOpp.hand.length > curNextOpp.hand.length;
          const exploitPassedNeighbor =
            !curNextOpp.passed && revNextOpp.passed && (minOppCards <= 7 || bot.hand.length <= 7);
          const muchSaferReverse =
            curNextOpp.hand.length <= 6 && revNextOpp.hand.length >= curNextOpp.hand.length + 2;
          if (skipDangerousNext || exploitPassedNeighbor || muchSaferReverse) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'mualani') {
      // Khi trên bàn có Bài Lẻ hoặc Đôi: Bật Cá Mập Đè Khác Loại nếu có Đôi/Sám/Sảnh không chạm Hàng đè được
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        (this.currentCombo.type === COMBO_TYPES.SINGLE || this.currentCombo.type === COMBO_TYPES.PAIR)
      ) {
        const prevCross = activeMualaniCrossBeat;
        activeMualaniCrossBeat = true;
        const crossMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) =>
            m.length > this.currentCombo.length &&
            m.highRank < 12 &&
            !m.isBomb &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeMualaniCrossBeat = prevCross;
        if (crossMoves.length > 0) {
          const canInstantWinCross = crossMoves.some((m) => m.length === bot.hand.length);
          const needCrossToBeat =
            (!plannedMove || plannedMove.highRank === 12) &&
            crossMoves.some(
              (m) =>
                this.evaluateMoveBreakCost(m, struct) <= 45 ||
                bot.hand.length <= 6 ||
                minOppCards <= 5
            );
          const canDumpLongComboEndgame =
            bot.hand.length <= 6 &&
            crossMoves.some((m) => m.length >= 3 && this.evaluateMoveBreakCost(m, struct) === 0);
          if (canInstantWinCross || needCrossToBeat || canDumpLongComboEndgame) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'varesa') {
      // Khi trên bàn là Đôi/Sám/Sảnh (hoặc Lẻ cao) mà Bot không đỡ được (hoặc phải tốn Heo) -> Dậm vỡ thành 1 lá Lẻ thấp để Bot đè!
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        (!plannedMove || plannedMove.highRank === 12)
      ) {
        let stompedCombo = null;
        if (this.currentCombo.length >= 2) {
          const lowestCard = sortCardsAsc(this.currentCombo.cards)[0];
          stompedCombo = classifyCombo([lowestCard]);
        } else if (this.currentCombo.highRank < 12) {
          const newRank = Math.max(0, this.currentCombo.highRank - 4);
          stompedCombo = {
            ...this.currentCombo,
            highRank: newRank,
            highValue: newRank * 4 + (this.currentCombo.highCard?.suitIndex || 0),
          };
        }
        if (stompedCombo) {
          const movesAfterStomp = getValidMoves(bot.hand, stompedCombo, this.mustPlay3Spade, false).filter(
            (m) =>
              m.highRank < 12 &&
              !m.isBomb &&
              !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
          );
          if (
            movesAfterStomp.some(
              (m) =>
                this.evaluateMoveBreakCost(m, struct) <= 95 ||
                minOppCards <= 5 ||
                bot.hand.length <= 6
            )
          ) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'escoffier') {
      if (bot.hand.length >= 2) {
        // TH1 (KẾT LIỄU VÁN BÀI NGAY LẬP TỨC): Nếu ném đi 1 lá dư giúp phần bài còn lại trên tay tạo thành 1 bộ hợp lệ đánh hết sạch bài Về Nhất luôn!
        const nonBombCards = sortCardsAsc(bot.hand).filter((c) => !struct.bombRanks.has(c.rankIndex));
        let winSetupCard = null;
        for (const cand of nonBombCards) {
          const remHand = bot.hand.filter((c) => c.id !== cand.id);
          const remMoves = getValidMoves(remHand, this.currentCombo, this.mustPlay3Spade, false);
          if (remMoves.some((m) => m.length === remHand.length)) {
            winSetupCard = cand;
            break;
          }
        }
        if (winSetupCard) {
          shouldCast = true;
          preferredIds = [winSetupCard.id];
        } else if ((!this.currentCombo || plannedMove) && (bot.hand.length <= 10 || minOppCards <= 6)) {
          // TH2: Chỉ ném khi Bot có lượt đánh trong vòng này và tìm được 1 lá rác lẻ nhỏ (<= 10) nằm ngoài bộ sắp đánh
          const plannedIds = new Set(plannedMove ? plannedMove.cards.map((c) => c.id) : []);
          const trashCand = sortCardsAsc(bot.hand).find(
            (c) =>
              !plannedIds.has(c.id) &&
              c.rankIndex <= 8 &&
              struct.rankCounts[c.rankIndex] === 1 &&
              !struct.bombRanks.has(c.rankIndex) &&
              !struct.criticalStraightRanks.has(c.rankIndex)
          );
          if (trashCand) {
            shouldCast = true;
            preferredIds = [trashCand.id];
          }
        }
      }
    } else if (charId === 'zibai') {
      // Bạch Mã Đạp Vân: Nâng +1 bậc cho tối đa 2 lá bài nhỏ (<= K)
      const candidates = sortCardsAsc(bot.hand).filter(
        (c) => c.rankIndex <= 10 && !struct.bombRanks.has(c.rankIndex)
      );
      if (candidates.length > 0 && (!this.currentCombo || plannedMove || (this.currentCombo.type === COMBO_TYPES.SINGLE && this.currentCombo.highRank <= 10))) {
        if (bot.hand.length <= 9 || minOppCards <= 7 || !plannedMove) {
          shouldCast = true;
        }
      }
    } else if (charId === 'linnea') {
      // Ảo Thuật Ghép Đôi: Biến lá lẻ nhỏ nhất thành bản sao cùng số với 1 lá lẻ thường (<= A) trên tay để tạo thành Đôi
      const singleNormals = sortCardsAsc(bot.hand).filter(
        (c) =>
          c.rankIndex <= 11 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex)
      );
      if (singleNormals.length >= 2) {
        const lowest = singleNormals[0];
        let bestTarget = null;
        if (
          this.currentCombo &&
          !this.currentCombo.isBomb &&
          this.currentCombo.type === COMBO_TYPES.PAIR &&
          (!plannedMove || plannedMove.highRank === 12)
        ) {
          bestTarget = singleNormals.find(
            (c) => c.id !== lowest.id && c.rankIndex > this.currentCombo.highRank
          );
        }
        if (!bestTarget && (!this.currentCombo || plannedMove) && (bot.hand.length <= 9 || minOppCards <= 6)) {
          bestTarget = [...singleNormals]
            .reverse()
            .find((c) => c.id !== lowest.id && !struct.criticalStraightRanks.has(c.rankIndex));
        }
        if (bestTarget && lowest.rankIndex <= 8) {
          shouldCast = true;
          preferredIds = [bestTarget.id];
        }
      }
    } else if (charId === 'nefer') {
      // Ảo Ảnh Sa Mạc: Nâng cấp 1 Đôi trên tay thành Sám Cô (hoặc tạo Đôi lớn)
      const hasPairAndTrash =
        bot.hand.length >= 3 &&
        struct.rankCounts.slice(0, 12).some((cnt) => cnt === 2) &&
        bot.hand.some((c) => c.rankIndex <= 8 && struct.rankCounts[c.rankIndex] === 1 && !struct.bombRanks.has(c.rankIndex));
      if (hasPairAndTrash && (!this.currentCombo || plannedMove || (this.currentCombo.type === COMBO_TYPES.TRIPLE && !plannedMove))) {
        if (bot.hand.length <= 10 || minOppCards <= 7) {
          shouldCast = true;
        }
      }
    } else if (charId === 'sandrone') {
      // Dây Cót Con Rối: Gom 3 lá lẻ cô lập thành Sảnh 3 lá liên tiếp
      const isolatedSingles = sortCardsAsc(bot.hand).filter(
        (c) =>
          c.rankIndex <= 11 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      );
      if (isolatedSingles.length >= 3) {
        if (
          !this.currentCombo ||
          plannedMove ||
          (this.currentCombo.type === COMBO_TYPES.STRAIGHT && this.currentCombo.length === 3 && !plannedMove)
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'lauma') {
      // Nguyệt Quang Hồi Phục: Thu hồi lá lớn nhất trên bàn về tay (nếu bàn chỉ có 1 lá Lẻ thì xóa bàn và cướp cái luôn!)
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12) {
        if (
          (this.currentCombo.length === 1 && this.currentCombo.highRank >= 6 && (!plannedMove || plannedMove.highRank === 12 || minOppCards <= 6)) ||
          (this.currentCombo.length >= 2 && this.currentCombo.highRank >= 7 && (!plannedMove || minOppCards <= 5))
        ) {
          shouldCast = true;
        }
      } else if (!this.currentCombo && bot.hand.length <= 8) {
        shouldCast = true;
      }
    } else if (charId === 'vesna') {
      if ((!this.currentCombo || plannedMove) && (bot.hand.length <= 8 || minOppCards <= 6)) {
        shouldCast = true;
      }
    } else if (charId === 'columbina') {
      // Khúc Ca Thiên Thần: Đánh 1 bộ rồi được đánh bồi thêm 1 bộ nữa ngay lập tức!
      if (bot.hand.length >= 2 && (!this.currentCombo || plannedMove)) {
        const firstMove = plannedMove || validMoves[0];
        if (firstMove) {
          const usedIds = new Set(firstMove.cards.map((c) => c.id));
          const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
          const canInstantWinOnExtraTurn = remHand.length > 0 && Boolean(classifyCombo(remHand));
          if (canInstantWinOnExtraTurn || bot.hand.length <= 8 || minOppCards <= 6) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'odette') {
      // Vũ Điệu Thiên Nga: Cắt bớt 1 lá cao nhất khỏi bộ >= 2 lá trên bàn (Sảnh 4->3, Sám->Đôi, Đôi->Lẻ) hoặc hạ 3 bậc lá Lẻ!
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank < 12 &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 85)
      ) {
        let reducedCombo = null;
        if (this.currentCombo.length >= 2) {
          const sortedCards = sortCardsAsc(this.currentCombo.cards);
          const trimmed = sortedCards.slice(0, sortedCards.length - 1);
          reducedCombo = classifyCombo(trimmed) || classifyCombo([sortedCards[0]]);
        } else {
          const newRankIdx = Math.max(0, this.currentCombo.highRank - 3);
          reducedCombo = {
            ...this.currentCombo,
            highRank: newRankIdx,
            highValue: newRankIdx * 4 + (this.currentCombo.highCard?.suitIndex || 0),
          };
        }
        if (reducedCombo) {
          const movesAfterOdette = getValidMoves(bot.hand, reducedCombo, this.mustPlay3Spade, false).filter(
            (m) => m.highRank < 12 && !m.isBomb && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
          );
          if (movesAfterOdette.length > 0) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'vodyanitsa') {
      // Gương Nước Phản Chiếu: Biến N lá bài rác trên tay thành bộ bài cao hơn bộ trên bàn +1 bậc để đè ngay!
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank < 12 &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 85 || minOppCards <= 5)
      ) {
        const nonBombUnder2 = bot.hand.filter((c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex));
        if (nonBombUnder2.length >= this.currentCombo.length) {
          shouldCast = true;
        }
      }
    } else if (charId === 'lohen') {
      // Khiên Phản Đòn Tây Phong: Phản ngược bộ bài trên bàn trả lại cho chính đối thủ vừa đánh, biến thành bài của Lohen!
      // Chỉ phản đòn khi bộ trên bàn đủ mạnh (>= 9 hoặc Sám/Sảnh >= 3 lá, hoặc đối thủ sắp về <= 5 lá) và Bot không có nước đỡ rẻ!
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank < 12 &&
        this.trickOwnerId !== null &&
        this.trickOwnerId !== bot.id
      ) {
        const isStrongTablePlay =
          this.currentCombo.highRank >= 6 ||
          this.currentCombo.length >= 3 ||
          minOppCards <= 5;
        const needDefense =
          !plannedMove ||
          plannedMove.highRank === 12 ||
          this.evaluateMoveBreakCost(plannedMove, struct) >= 80 ||
          minOppCards <= 4;
        if (isStrongTablePlay && needDefense) {
          shouldCast = true;
        }
      }
    } else if (charId === 'durin') {
      // Trái Tim Rồng Đỏ: Biến 1 lá bài cao nhất (dưới 2) trên tay thành con Heo Cơ 2♥ (value 51 — lá bài mạnh nhất bàn)!
      const sortedDesc = [...sortCardsAsc(bot.hand)].reverse();
      const highCand =
        sortedDesc.find((c) => c.rankIndex < 12 && !struct.bombRanks.has(c.rankIndex)) ||
        sortedDesc.find((c) => c.rankIndex < 12);
      if (highCand) {
        // TH1: Trên bàn đang đánh Lẻ (kể cả Heo 2♠/2♣/2♦ hoặc bài lớn J..A) mà Bot không đỡ được -> Hoá 2♥ đập chết ngay!
        const canCutSingleWith2Heart =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.SINGLE &&
          this.currentCombo.highValue < 51 &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 85 || this.currentCombo.highRank >= 9);
        // TH2: Trên bàn đang đánh Đôi lớn (J..2) mà Bot đang có sẵn 1 con Heo -> Hoá thêm 2♥ tạo Đôi Heo đè luôn!
        const canFormPairOfTwos =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.PAIR &&
          this.currentCombo.highValue < 51 &&
          rankCounts[12] >= 1 &&
          (!plannedMove || this.currentCombo.highRank >= 9);
        // TH3: Khi đang cầm cái hoặc chuẩn bị đánh ở giữa/cuối ván -> Hoá lá cao nhất dưới 2 thành 2♥ để nắm chắc quyền cướp cái!
        const goodMidEndgameUpgrade =
          (!this.currentCombo || plannedMove) && (bot.hand.length <= 9 || minOppCards <= 6);
        if (canCutSingleWith2Heart || canFormPairOfTwos || goodMidEndgameUpgrade) {
          shouldCast = true;
          preferredIds = [highCand.id];
        }
      }
    } else if (charId === 'xiao') {
      // Không Trung Đạp Kích: Chỉ dùng khi trên bàn ĐANG LÀ ĐÔI, SÁM CÔ HOẶC SẢNH (length >= 2)
      // và Xiao thực sự có ít nhất 1 lá Lẻ (rankIndex >= currentCombo.highRank) ngoài Hàng để đâm thủng!
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.length >= 2 &&
        this.currentCombo.highRank < 12
      ) {
        const prevXiao = activeXiaoPlungeSingle;
        activeXiaoPlungeSingle = true;
        const plungeMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) =>
            m.isXiaoPlunge &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex)) &&
            (m.highRank < 12 || minOppCards <= 4 || bot.hand.length <= 2)
        );
        activeXiaoPlungeSingle = prevXiao;
        if (plungeMoves.length > 0) {
          const canInstantWinPlunge = plungeMoves.some((m) => m.length === bot.hand.length);
          const hasIsolatedPlungeCard = plungeMoves.some(
            (m) => struct.rankCounts[m.highRank] === 1 && !struct.criticalStraightRanks.has(m.highRank)
          );
          const lacksCleanNormalResponse =
            !plannedMove ||
            plannedMove.highRank === 12 ||
            this.evaluateMoveBreakCost(plannedMove, struct) >= 80;
          if (canInstantWinPlunge || lacksCleanNormalResponse || (hasIsolatedPlungeCard && (bot.hand.length <= 8 || minOppCards <= 6))) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'kinich') {
      // Gài Bom Hẹn Giờ Ajaw: Chỉ đặt bom khi Kinich CHẮC CHẮN ĐÁNH BÀI trong lượt này,
      // sau khi đánh vẫn còn >= 2 lá trên tay (để có lá rác nhét vào tay đối thủ nếu bom nổ),
      // và nước sắp đánh không phải là 2♥ bất khả chiến bại!
      const moveLen = plannedMove ? plannedMove.length : 1;
      const isUnbeatableMove = plannedMove && (plannedMove.highValue === 51 || plannedMove.isBomb);
      if (
        (!this.currentCombo || plannedMove) &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - moveLen >= 2 &&
        !isUnbeatableMove &&
        (bot.hand.length <= 10 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'venti') {
      // Hố Đen Phong Thần: Hút 1 lá lớn nhất (<= A) của mọi đối thủ và thổi trả lá rác nhỏ nhất của Venti!
      // Chỉ tung khi trên tay Venti thực sự có lá rác nhỏ (<= 10) để tráo đi, hoặc khi đối thủ sắp về (<= 5 lá) cần tước quân chủ lực!
      const nonBombCards = sortCardsAsc(bot.hand).filter((c) => !struct.bombRanks.has(c.rankIndex));
      const lowestNonBomb = nonBombCards[0];
      if (
        lowestNonBomb &&
        (lowestNonBomb.rankIndex <= 7 || (minOppCards <= 5 && lowestNonBomb.rankIndex <= 9)) &&
        (!this.currentCombo || plannedMove || (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank <= 11))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'wanderer') {
      // Cuồng Phong Đảo Mệnh: Gom toàn bộ bài trên bàn xáo trộn rồi chia lại!
      // Tuyệt đối KHÔNG dùng nếu Wanderer sắp thắng hoặc đang giữ Hàng / nhiều Heo, TRỪ KHI đối thủ chỉ còn <= 2 lá sắp thắng!
      const canWinNow = plannedMove && plannedMove.length === bot.hand.length;
      const hasBombs = struct.bombRanks.size > 0;
      const twosCount = rankCounts[12];
      const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
      if (!canWinNow && !hasBombs && bot.hand.length >= 4) {
        const emergencyStopOpponent = minOppCards <= 3 && twosCount <= 1 && bot.hand.length >= minOppCards + 2;
        const terribleHandBailout =
          twosCount === 0 &&
          lowCardsCount >= Math.ceil(bot.hand.length * 0.55) &&
          ((!plannedMove && this.currentCombo) || minOppCards <= 6);
        if (emergencyStopOpponent || terribleHandBailout) {
          shouldCast = true;
        }
      }
    }

    if (shouldCast) {
      return this.useCharacterSkill(bot, preferredIds);
    }
    return false;
  }

  selectSoloPlayerCount(count) {
    if (this.isMidMatch()) {
      alert('⛔ Ván bài đang diễn ra! Bạn phải đánh xong ván hiện tại mới được đổi số lượng người chơi.');
      return;
    }
    const validCount = [2, 3, 4].includes(Number(count)) ? Number(count) : 4;
    this.soloPlayerCount = validCount;
    this.savedSoloPlayerCount = validCount;

    const modeLabel = document.getElementById('selected-mode-label');
    if (modeLabel && this.selectedLobbyMode === 'bot') {
      modeLabel.textContent = `Chế độ 1: Đấu Với Bot (${validCount} Người)`;
    }

    sfx.click();
    this.saveShopProfile();
    this.renderSoloPlayerCountUI();
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
  }

  renderSoloPlayerCountUI() {
    const count = this.soloPlayerCount || 4;
    const locked = this.isMidMatch();
    [2, 3, 4].forEach((n) => {
      const card = document.getElementById(`bot-count-${n}`);
      if (card) {
        card.classList.toggle('active', n === count);
        card.classList.toggle('mid-match-locked-card', locked && n !== count);
      }
    });

    const getBotDisplay = (idx, fallbackName, fallbackSkin) => {
      if (locked && this.queuedNextMatchBots && this.queuedNextMatchBots[idx]) {
        const ch = this.queuedNextMatchBots[idx];
        return {
          name: `Bot ${ch.name.split('(')[0].trim()} ${ch.crest}`,
          skin: ch.id,
          isQueued: true,
        };
      }
      const p = this.players?.[idx];
      return {
        name: p?.name || fallbackName,
        skin: p?.cardSkin || fallbackSkin,
        isQueued: false,
      };
    };

    const d1 = getBotDisplay(1, 'Bot Furina 💧', 'furina');
    const d2 = getBotDisplay(2, 'Bot Raiden ⚡', 'raiden');
    const d3 = getBotDisplay(3, 'Bot Skirk 🌌', 'skirk');
    const b1 = d1.name;
    const b2 = d2.name;
    const b3 = d3.name;
    const queuedTag =
      locked && this.queuedNextMatchBots
        ? ` <span style="color:#fde047;font-weight:800;">(⏳ Đã chọn cho Trận Sau — Ván #${(this.matchCount || 1) + 1})</span>`
        : '';

    const desc2 = document.getElementById('bot-desc-2');
    if (desc2) desc2.innerHTML = `Đấu tay đôi trực diện với <strong>${b2}</strong>`;
    const desc3 = document.getElementById('bot-desc-3');
    if (desc3) desc3.innerHTML = `Đấu cùng <strong>${b1}</strong> & <strong>${b2}</strong>`;
    const desc4 = document.getElementById('bot-desc-4');
    if (desc4) desc4.innerHTML = `Đủ 4 nhà: <strong>${b1}</strong> • <strong>${b2}</strong> • <strong>${b3}</strong>`;

    const lineupEl = document.getElementById('bot-lineup-avatars');
    if (lineupEl && this.players) {
      const activeIndices = count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
      const seatLabels = { 1: 'Ghế Trái', 2: 'Ghế Đối Diện (1v1)', 3: 'Ghế Phải' };
      const dispMap = { 1: d1, 2: d2, 3: d3 };
      lineupEl.innerHTML = activeIndices
        .map((idx) => {
          const d = dispMap[idx];
          if (!d) return '';
          const seatTag = d.isQueued ? `${seatLabels[idx]} • ⏳ Trận sau` : seatLabels[idx];
          return `
            <div class="bot-lineup-chip" onclick="window.tienLenGame.openBotPickerModal(${idx})" title="Bấm để chọn đích danh nhân vật Bot cho ${seatLabels[idx]}" style="cursor:pointer;">
              <img src="fanart/${d.skin}.jpg?v=57" alt="${d.name}" />
              <div class="bot-lineup-chip-info">
                <span class="bot-lineup-chip-seat">${seatTag} • 🎯 Đổi</span>
                <span class="bot-lineup-chip-name">${d.name}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const previewEl = document.getElementById('bot-opponents-preview');
    if (previewEl) {
      if (count === 2) {
        previewEl.innerHTML = `<strong>⚔️ Bàn 2 Người (Solo 1v1 Bot):</strong> Bạn đấu tay đôi trực diện với <strong>${b2}</strong>${queuedTag} (Có thể bấm 🎲 Random để đổi nhân vật khác!)`;
      } else if (count === 3) {
        previewEl.innerHTML = `<strong>🔥 Bàn 3 Người (Tam Hùng 1v2 Bot):</strong> Bạn đấu với <strong>${b1}</strong> (Trái) & <strong>${b2}</strong> (Đối diện)${queuedTag}`;
      } else {
        previewEl.innerHTML = `<strong>👑 Bàn 4 Người (Đủ Bàn 1v3 Bot):</strong> Bạn đấu với <strong>${b1}</strong>, <strong>${b2}</strong> & <strong>${b3}</strong>${queuedTag}`;
      }
    }
  }

  selectBetTier(betVal, isCustom = false) {
    if (this.isMidMatch()) {
      alert('⛔ Ván bài đang diễn ra! Bạn phải đánh xong ván hiện tại mới được đổi mức cược.');
      return;
    }
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
    this.tighnariBonusByPlayer = {};
  }

  updateBetBadges() {
    const b = this.betPerCard || 100;
    const count = this.soloPlayerCount || 4;
    const tierMeta = this.getCurrentBetTierMeta(b);
    const topBadge = document.getElementById('current-bet-badge');
    if (topBadge) {
      const modeTag = this.isMultiplayer
        ? `Phòng #${this.roomId || '----'} (${this.getActivePlayers().length} Người)`
        : `${count} Người (1v${count - 1} Bot)`;
      topBadge.textContent = `${tierMeta.icon} ${tierMeta.name} (${modeTag}) • ${b.toLocaleString()} xu/lá`;
    }
    const roomBetEl = document.getElementById('display-room-bet');
    if (roomBetEl) {
      roomBetEl.textContent = `${tierMeta.name} (${b.toLocaleString()} Xu/lá)`;
    }
    const roomPassEl = document.getElementById('display-room-pass');
    if (roomPassEl) {
      roomPassEl.textContent = this.roomPasswordHash
        ? `🔒 Có mật khẩu${this.roomPassword ? ` (${this.roomPassword})` : ''}`
        : '🔓 Tự do (Không mật khẩu)';
      roomPassEl.style.color = this.roomPasswordHash ? '#fde047' : '#6ee7b7';
    }
    const createBetPreview = document.getElementById('create-room-bet-preview');
    if (createBetPreview) {
      createBetPreview.textContent = `${tierMeta.icon} ${tierMeta.name} (${b.toLocaleString()} Xu/lá)`;
    }
    const sumHeader = document.getElementById('summary-bet-col-header');
    if (sumHeader) {
      sumHeader.textContent = `Chi tiết tính tiền (${b.toLocaleString()} xu/lá + Phạt)`;
    }
    const botBtn = document.getElementById('btn-solo-bot-mode');
    if (botBtn) {
      if (this.isMidMatch() && !this.isMultiplayer) {
        botBtn.textContent = `⚔️ QUAY LẠI BÀN ĐANG ĐẤU (Ván #${this.matchCount} đang diễn ra — Không thể Reset giữa trận!)`;
      } else {
        botBtn.textContent = `⚔️ VÀO BÀN ĐẤU VỚI BOT NGAY (Bàn ${count} Người • ${tierMeta.name}: ${b.toLocaleString()} Xu/lá)`;
      }
    }
    const createRoomBtn = document.getElementById('btn-create-room');
    if (createRoomBtn) {
      createRoomBtn.textContent = `🏠 Tạo Phòng & Push Lên Sảnh Bàn (${tierMeta.name}: ${b.toLocaleString()} Xu/lá)`;
    }
  }

  renderBetTiers() {
    const grid = document.getElementById('bet-tiers-grid');
    const preview = document.getElementById('bet-rules-preview');
    const me = this.getLocalPlayer();
    const myCoins = me ? me.coins : this.savedCoins;
    const lobbyBal = document.getElementById('lobby-balance-display');
    if (lobbyBal) lobbyBal.textContent = myCoins.toLocaleString();
    const modeSetupBal = document.getElementById('mode-setup-balance');
    if (modeSetupBal) modeSetupBal.textContent = myCoins.toLocaleString();

    if (grid) {
      grid.innerHTML = BET_TIERS.map((t) => {
        const isSelected = this.betPerCard === t.betPerCard;
        const isLocked = myCoins < t.minCoins;
        const reqText =
          t.minCoins === 0
            ? '✅ Tự do'
            : isLocked
            ? `🔒 Cần ${t.minCoins.toLocaleString()}`
            : `✅ Mở`;

        return `
          <div class="bet-tier-card compact-tier-card ${isSelected ? 'active' : ''} ${
          isLocked ? 'locked-tier' : ''
        }" onclick="window.tienLenGame.selectBetTier(${t.betPerCard})">
            <div class="compact-tier-top">
              <span class="bet-tier-icon">${t.icon}</span>
              <span class="bet-tier-name">${t.name}</span>
            </div>
            <div class="bet-tier-amount">${t.betPerCard.toLocaleString()} Xu/lá</div>
            <div class="bet-tier-req">${reqText}</div>
          </div>
        `;
      }).join('');
    }

    const b = this.betPerCard || 100;
    if (preview) {
      preview.innerHTML = `
        <span class="bet-rule-chip">🃏 Đếm lá: <strong>${b.toLocaleString()}</strong></span>
        <span class="bet-rule-chip">🥶 Cóng: <strong>${(b * 26).toLocaleString()}</strong></span>
        <span class="bet-rule-chip">🐷 Heo đen/đỏ: <strong>${Math.round(b * 2.5).toLocaleString()}/${(b * 5).toLocaleString()}</strong></span>
        <span class="bet-rule-chip">💣 Tứ quý: <strong>${(b * 10).toLocaleString()}</strong></span>
        <span class="bet-rule-chip">👑 Tới trắng: <strong>${(b * 15).toLocaleString()}</strong></span>
      `;
    }

    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
  }

  // ============================================================================
  // MULTI-TABLE ROOM DIRECTORY, PASSWORD PROTECTION, SEARCH BY ID & CLOUD+P2P SYNC
  // ============================================================================
  isStaticCloudHost() {
    const h = window.location.hostname || '';
    return (
      window.location.protocol === 'file:' ||
      h.endsWith('github.io') ||
      h.endsWith('netlify.app') ||
      h.endsWith('vercel.app') ||
      h.endsWith('web.app')
    );
  }

  hashRoomPassword(pass) {
    const clean = String(pass || '').trim();
    if (!clean) return '';
    let h = 2166136261;
    for (let i = 0; i < clean.length; i++) {
      h ^= clean.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'rp_' + (h >>> 0).toString(36);
  }

  encodeCloudPayload(obj) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
      return 'TLRM3:' + b64;
    } catch (_) {
      return '';
    }
  }

  decodeCloudPayload(raw) {
    if (!raw || typeof raw !== 'string') return null;
    let trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = JSON.parse(trimmed);
      }
    } catch (_) {}
    try {
      if (trimmed.startsWith('TLRM3:')) {
        const b64 = trimmed.slice(6).replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
        return JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
      }
      if (trimmed.startsWith('TLRM2:')) {
        return JSON.parse(decodeURIComponent(trimmed.slice(6)));
      }
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }
    } catch (_) {}
    return null;
  }

  toggleCreateRoomSetupBox(forceState = null) {
    const box = document.getElementById('create-room-setup-box');
    if (!box) return;
    const willOpen = forceState !== null ? !!forceState : box.classList.contains('hidden');
    box.classList.toggle('hidden', !willOpen);
    if (willOpen) {
      document.getElementById('room-password-prompt-box')?.classList.add('hidden');
      this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
      setTimeout(() => {
        document.getElementById('input-room-password')?.focus();
      }, 40);
    }
    sfx.click();
  }

  closeRoomPasswordPrompt() {
    this.pendingJoinRoomTarget = null;
    document.getElementById('room-password-prompt-box')?.classList.add('hidden');
    sfx.click();
  }

  async fetchCloudRoomsDirectory() {
    const now = Date.now();
    const mapById = new Map();
    const ingestArr = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((r) => {
        if (!r || !r.roomId || r.closed) return;
        const age = now - (Number(r.updatedAtMs) || 0);
        if (age <= 240000 && Number(r.playerCount) > 0) {
          const key = String(r.roomId).toUpperCase();
          const prev = mapById.get(key);
          if (!prev || (Number(r.updatedAtMs) || 0) >= (Number(prev.updatedAtMs) || 0)) {
            mapById.set(key, r);
          }
        }
      });
    };

    const pTextDb = fetch(`https://textdb.dev/api/data/tlmn_bkp_rooms_dir_v2?_t=${now}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        return this.decodeCloudPayload(text);
      })
      .catch(() => null);

    const fetchKvDir = (appKey) =>
      fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${appKey}/tldir_v2?_t=${now}`, {
        cache: 'no-store',
      })
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return this.decodeCloudPayload(text);
        })
        .catch(() => null);

    const results = await Promise.all([pTextDb, fetchKvDir('w3crt6ib'), fetchKvDir('iykuu08k')]);
    results.forEach((parsed) => {
      if (!parsed) return;
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rooms) ? parsed.rooms : [];
      ingestArr(arr);
    });

    if (this.isMultiplayer && this.roomId) {
      const myEntry = this.buildCurrentRoomDirectoryEntry(false);
      if (myEntry && !myEntry.closed) {
        mapById.set(String(this.roomId).toUpperCase(), myEntry);
      }
    }

    const list = Array.from(mapById.values());
    list.sort((a, b) => {
      if (this.roomId && a.roomId === this.roomId) return -1;
      if (this.roomId && b.roomId === this.roomId) return 1;
      return (Number(b.updatedAtMs) || 0) - (Number(a.updatedAtMs) || 0);
    });
    this.multiplayerRoomsList = list;
    return list;
  }

  buildCurrentRoomDirectoryEntry(closed = false) {
    if (!this.roomId) return null;
    const activePlayers = (this.players || []).filter((p) => p.active);
    const humanPlayers = activePlayers.filter((p) => !p.isBot);
    const hostPlayer =
      (this.players || []).find((p) => p.clientId === this.hostClientId && p.active) ||
      this.players?.[this.mySeatId] ||
      this.players?.[0];
    const hostName = hostPlayer?.name || this.savedPlayerName || 'Chủ Phòng';
    const effectivePlayerCount = Math.max(activePlayers.length, this.isMultiplayer ? 1 : 0);
    const effectiveHumanCount = Math.max(humanPlayers.length, this.isMultiplayer ? 1 : 0);
    return {
      roomId: String(this.roomId).toUpperCase(),
      title: this.roomTitle || `Bàn của ${hostName}`,
      hostName,
      hostAvatar: hostPlayer?.avatar || this.equippedAvatar || 'default_player',
      hostClientId: this.hostClientId || this.myClientId,
      betPerCard: this.betPerCard || 100,
      hasPassword: !!this.roomPasswordHash,
      passwordHash: this.roomPasswordHash || '',
      playerCount: effectivePlayerCount,
      humanCount: effectiveHumanCount,
      maxPlayers: 4,
      inMatch: !!(this.matchCount >= 1 && !this.isGameOver && this.isMidMatch()),
      matchCount: this.matchCount || 0,
      seatNames: activePlayers.length > 0 ? activePlayers.map((p) => p.name) : [hostName],
      updatedAtMs: Date.now(),
      closed: !!closed,
    };
  }

  async publishRoomToDirectory(closed = false) {
    if (!this.roomId) return;
    const myEntry = this.buildCurrentRoomDirectoryEntry(closed);
    if (!myEntry) return;

    const now = Date.now();
    const existing = Array.isArray(this.multiplayerRoomsList) ? [...this.multiplayerRoomsList] : [];
    const mapById = new Map();
    existing.forEach((r) => {
      if (!r || !r.roomId || r.closed) return;
      if (now - (Number(r.updatedAtMs) || 0) <= 240000 && Number(r.playerCount) > 0) {
        mapById.set(String(r.roomId).toUpperCase(), r);
      }
    });

    if (myEntry.closed) {
      mapById.delete(myEntry.roomId);
    } else {
      mapById.set(myEntry.roomId, myEntry);
    }
    this.multiplayerRoomsList = Array.from(mapById.values());
    this.renderMultiplayerTablesList();

    try {
      const remoteList = await this.fetchCloudRoomsDirectory();
      remoteList.forEach((r) => {
        if (!r || !r.roomId || r.roomId === myEntry.roomId || r.closed) return;
        if (now - (Number(r.updatedAtMs) || 0) <= 240000 && Number(r.playerCount) > 0) {
          mapById.set(String(r.roomId).toUpperCase(), r);
        }
      });
    } catch (_) {}

    if (myEntry.closed) {
      mapById.delete(myEntry.roomId);
    } else {
      mapById.set(myEntry.roomId, myEntry);
    }
    const mergedList = Array.from(mapById.values())
      .sort((a, b) => (Number(b.updatedAtMs) || 0) - (Number(a.updatedAtMs) || 0))
      .slice(0, 25);
    this.multiplayerRoomsList = mergedList;
    this.renderMultiplayerTablesList();

    const bodyStr = this.encodeCloudPayload(mergedList);
    const urlSafeStr = bodyStr.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const tasks = [
      fetch(`https://textdb.dev/api/data/tlmn_bkp_rooms_dir_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyStr,
      }).catch(() => null),
    ];
    if (urlSafeStr.length < 3500) {
      ['w3crt6ib', 'iykuu08k'].forEach((appKey) => {
        tasks.push(
          fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${appKey}/tldir_v2/${urlSafeStr}`, {
            method: 'POST',
          }).catch(() => null)
        );
      });
    }
    await Promise.allSettled(tasks);
  }

  async removeRoomFromDirectory(code) {
    if (!code) return;
    const cleanCode = String(code).trim().toUpperCase();
    this.multiplayerRoomsList = (this.multiplayerRoomsList || []).filter((r) => r.roomId !== cleanCode);
    this.renderMultiplayerTablesList();
    try {
      const list = await this.fetchCloudRoomsDirectory();
      const filtered = list.filter((r) => r.roomId !== cleanCode);
      const bodyStr = this.encodeCloudPayload(filtered);
      const urlSafeStr = bodyStr.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const tasks = [
        fetch(`https://textdb.dev/api/data/tlmn_bkp_rooms_dir_v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: bodyStr,
        }).catch(() => null),
      ];
      if (urlSafeStr.length < 3500) {
        ['w3crt6ib', 'iykuu08k'].forEach((appKey) => {
          tasks.push(
            fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${appKey}/tldir_v2/${urlSafeStr}`, {
              method: 'POST',
            }).catch(() => null)
          );
        });
      }
      await Promise.allSettled(tasks);
    } catch (_) {}
  }

  async pushRoomStateToCloud(overrideEvents = null, markClosed = false) {
    if (!this.roomId) return false;
    const code = String(this.roomId).trim().toUpperCase();
    const stateObj = this.serializeRoomState();
    const payload = {
      roomId: code,
      title: this.roomTitle || '',
      hasPassword: !!this.roomPasswordHash,
      passwordHash: this.roomPasswordHash || '',
      hostClientId: this.hostClientId || this.myClientId,
      hostPeerId: this.hostPeerId || `tlmn-bkp-room-${code}-${this.hostClaimEpoch || 1}`,
      hostClaimEpoch: Number(this.hostClaimEpoch) || 1,
      hostHeartbeatMs: Date.now(),
      hostPaused: !!document.hidden,
      version: Number(this.roomStateVersion) || 1,
      updatedAtMs: Date.now(),
      closed: !!markClosed,
      state: stateObj,
      events: Array.isArray(overrideEvents) ? overrideEvents : (this.cloudPendingEvents || []).slice(-12),
    };
    try {
      const res = await fetch(`https://textdb.dev/api/data/tlmn_bkp_rm_${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: this.encodeCloudPayload(payload),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async fetchRoomStateFromCloud(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;
    try {
      const res = await fetch(`https://textdb.dev/api/data/tlmn_bkp_rm_${cleanCode}?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const text = await res.text();
      const parsed = this.decodeCloudPayload(text);
      if (parsed && parsed.roomId && parsed.state && Array.isArray(parsed.state.players)) {
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  convertCloudRoomToDirectoryCard(cloudRoom) {
    if (!cloudRoom || !cloudRoom.state || cloudRoom.closed) return null;
    const players = Array.isArray(cloudRoom.state.players) ? cloudRoom.state.players : [];
    const activePlayers = players.filter((p) => p.active);
    const humanPlayers = activePlayers.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) return null;
    const hostPlayer =
      players.find((p) => p.clientId === cloudRoom.hostClientId && p.active) || activePlayers[0] || players[0];
    return {
      roomId: String(cloudRoom.roomId).toUpperCase(),
      title: cloudRoom.title || `Bàn của ${hostPlayer?.name || 'Chủ Phòng'}`,
      hostName: hostPlayer?.name || 'Chủ Phòng',
      hostAvatar: hostPlayer?.avatar || 'default_player',
      hostClientId: cloudRoom.hostClientId || '',
      betPerCard: cloudRoom.state.betPerCard || 100,
      hasPassword: !!cloudRoom.hasPassword,
      passwordHash: cloudRoom.passwordHash || '',
      playerCount: activePlayers.length,
      humanCount: humanPlayers.length,
      maxPlayers: 4,
      inMatch: !!(cloudRoom.state.matchCount >= 1 && !cloudRoom.state.isGameOver),
      matchCount: cloudRoom.state.matchCount || 0,
      seatNames: activePlayers.map((p) => p.name),
      updatedAtMs: cloudRoom.updatedAtMs || Date.now(),
      closed: !!cloudRoom.closed,
    };
  }

  async refreshMultiplayerRoomsDirectory(manual = false) {
    if (manual) sfx.click();
    await this.fetchCloudRoomsDirectory();
    if (this.searchedRoomIdFilter) {
      const directRoom = await this.fetchRoomStateFromCloud(this.searchedRoomIdFilter);
      const card = this.convertCloudRoomToDirectoryCard(directRoom);
      if (card) {
        const others = (this.multiplayerRoomsList || []).filter((r) => r.roomId !== card.roomId);
        this.multiplayerRoomsList = [card, ...others];
      }
    }
    this.renderMultiplayerTablesList();
  }

  async searchMultiplayerRoomById(rawQuery) {
    const clean = String(rawQuery || '')
      .replace(/[^0-9a-zA-Z]/g, '')
      .trim()
      .toUpperCase();
    sfx.click();
    const clearBtn = document.getElementById('btn-clear-search-room');
    const inp = document.getElementById('input-room-code');
    if (inp) inp.value = clean;

    if (!clean) {
      this.clearRoomSearchFilter();
      return;
    }

    this.searchedRoomIdFilter = clean;
    clearBtn?.classList.remove('hidden');

    // Tải trực tiếp trạng thái bàn theo ID từ Đám Mây + danh sách Sảnh Bàn để hiện chính xác bàn cần tìm!
    const [directRoom] = await Promise.all([
      this.fetchRoomStateFromCloud(clean),
      this.fetchCloudRoomsDirectory(),
    ]);
    const directCard = this.convertCloudRoomToDirectoryCard(directRoom);
    if (directCard) {
      const others = (this.multiplayerRoomsList || []).filter((r) => r.roomId !== directCard.roomId);
      this.multiplayerRoomsList = [directCard, ...others];
    }
    this.renderMultiplayerTablesList();
  }

  clearRoomSearchFilter() {
    this.searchedRoomIdFilter = '';
    const inp = document.getElementById('input-room-code');
    if (inp) inp.value = '';
    document.getElementById('btn-clear-search-room')?.classList.add('hidden');
    sfx.click();
    this.refreshMultiplayerRoomsDirectory(false);
  }

  renderMultiplayerTablesList() {
    const grid = document.getElementById('multiplayer-tables-grid');
    const countNumEl = document.getElementById('mp-tables-count');
    const countBadge = document.getElementById('mp-tables-count-badge');
    const searchActiveBadge = document.getElementById('mp-search-active-badge');
    const filterBanner = document.getElementById('mp-search-filter-banner');
    if (!grid) return;

    let allRooms = Array.isArray(this.multiplayerRoomsList) ? [...this.multiplayerRoomsList] : [];
    if (this.isMultiplayer && this.roomId) {
      const myEntry = this.buildCurrentRoomDirectoryEntry(false);
      if (myEntry && !myEntry.closed && !allRooms.some((r) => String(r.roomId).toUpperCase() === myEntry.roomId)) {
        allRooms = [myEntry, ...allRooms];
      }
    }

    const filterId = (this.searchedRoomIdFilter || '').trim().toUpperCase();
    const displayRooms = filterId
      ? allRooms.filter((r) => String(r.roomId).toUpperCase() === filterId)
      : allRooms;

    if (countNumEl) {
      countNumEl.textContent = String(displayRooms.length);
    }
    if (countBadge) {
      countBadge.textContent = filterId
        ? `Kết quả tìm ID #${filterId}: ${displayRooms.length} bàn`
        : `${allRooms.length} bàn đang mở`;
    }
    if (searchActiveBadge) {
      if (filterId) {
        searchActiveBadge.classList.remove('hidden');
        searchActiveBadge.textContent = `🔍 Lọc ID: #${filterId}`;
      } else {
        searchActiveBadge.classList.add('hidden');
      }
    }

    if (filterBanner) {
      if (filterId) {
        filterBanner.classList.remove('hidden');
        filterBanner.innerHTML = `
          <span>🔍 Đang lọc danh sách bàn theo ID Phòng: <strong style="color:#fde047;">#${filterId}</strong> — Bấm vào bàn bên dưới để vào chơi!</span>
          <button type="button" class="tool-btn" onclick="window.tienLenGame.clearRoomSearchFilter()" style="padding:3px 9px;font-size:11px;">✕ Hiện tất cả bàn</button>
        `;
      } else {
        filterBanner.classList.add('hidden');
      }
    }

    if (displayRooms.length === 0) {
      grid.innerHTML = filterId
        ? `
          <div class="mp-empty-tables-msg">
            🔍 Không tìm thấy bàn nào đang mở với ID <strong>#${filterId}</strong>.<br/>
            <span style="font-size:11.5px;color:#94a3b8;">Hãy kiểm tra lại mã phòng 4 số hoặc bấm <strong>"✕ Bỏ lọc"</strong> để xem toàn bộ bàn đang mở, hoặc bấm <strong>"➕ Tạo Phòng Mới"</strong>!</span>
          </div>
        `
        : `
          <div class="mp-empty-tables-msg">
            🃏 Hiện chưa có bàn người chơi nào đang mở trên Sảnh.<br/>
            <span style="font-size:11.5px;color:#94a3b8;">Hãy bấm nút <strong>"➕ Tạo Phòng Mới (Set Pass / Không Pass)"</strong> ở góc trên để mở bàn đầu tiên và đẩy lên Sảnh nhé!</span>
          </div>
        `;
      return;
    }

    grid.innerHTML = displayRooms
      .map((r) => {
        const tierMeta = this.getCurrentBetTierMeta(r.betPerCard || 100);
        const isMyRoom = this.isMultiplayer && this.roomId === r.roomId;
        const isFull = (r.playerCount || 1) >= (r.maxPlayers || 4) && !isMyRoom;
        const passBadge = r.hasPassword
          ? `<span class="mp-table-pass-badge locked">🔒 Có Pass</span>`
          : `<span class="mp-table-pass-badge open">🔓 Tự Do</span>`;
        const statusText = r.inMatch
          ? `⚔️ Đang đánh Ván #${r.matchCount || 1}`
          : `🟢 Đang chờ (${r.playerCount || 1}/4 người)`;
        const seatChips = Array.from({ length: 4 }, (_, idx) => {
          const pName = r.seatNames?.[idx];
          return pName
            ? `<span class="mp-seat-dot occupied">👤 ${pName}</span>`
            : `<span class="mp-seat-dot">Ghế #${idx + 1} trống</span>`;
        }).join('');
        const hostAvatarHtml = getAvatarHtml(r.hostAvatar || 'default_player').replace(
          '<img ',
          '<img style="width:100%;height:100%;max-width:40px;max-height:40px;object-fit:cover;border-radius:50%;display:block;" '
        );

        return `
          <div class="mp-table-card ${r.hasPassword ? 'has-pass' : ''} ${isMyRoom ? 'my-active-room' : ''}" onclick="window.tienLenGame.onClickTableCard('${r.roomId}')">
            <div class="mp-table-card-top">
              <span class="mp-table-id-pill">ID: #${r.roomId}</span>
              ${passBadge}
            </div>
            <div class="mp-table-title-row">
              <span class="mp-table-host-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${hostAvatarHtml}</span>
              <div class="mp-table-title-info">
                <div class="mp-table-title-text">${r.title || `Bàn của ${r.hostName}`}</div>
                <div class="mp-table-host-sub">👑 Chủ bàn: <strong>${r.hostName}</strong> • ${statusText}</div>
              </div>
            </div>
            <div class="mp-table-seats-bar">${seatChips}</div>
            <div class="mp-table-card-bottom">
              <span class="mp-table-bet-tag">${tierMeta.icon} ${tierMeta.name}: ${(r.betPerCard || 100).toLocaleString()} Xu/lá</span>
              <span class="mp-table-join-btn">${
                isMyRoom
                  ? '⭐ Bàn Của Bạn'
                  : isFull
                  ? '🔒 Đủ 4/4 (Vào lại nếu cùng bàn)'
                  : r.hasPassword
                  ? '🔑 Nhập Pass & Vào'
                  : '⚡ Bấm Vào Bàn Ngay'
              }</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  async onClickTableCard(roomId) {
    const cleanId = String(roomId || '').trim().toUpperCase();
    if (!cleanId) return;
    if (!this.isMultiplayer && this.isMidMatch()) {
      alert('⛔ Bạn đang đánh dở ván bài với Bot! Vui lòng hoàn thành ván hiện tại trước khi vào Bàn Người Chơi.');
      return;
    }
    if (this.isMultiplayer && this.roomId === cleanId) {
      sfx.click();
      document.getElementById('wifi-room-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    sfx.click();
    let roomMeta = (this.multiplayerRoomsList || []).find((r) => r.roomId === cleanId);
    if (!roomMeta) {
      const cloudRoom = await this.fetchRoomStateFromCloud(cleanId);
      roomMeta = this.convertCloudRoomToDirectoryCard(cloudRoom);
    }

    if (roomMeta && roomMeta.hasPassword) {
      this.pendingJoinRoomTarget = roomMeta;
      const promptBox = document.getElementById('room-password-prompt-box');
      const idLabel = document.getElementById('password-prompt-room-id');
      const passInp = document.getElementById('input-join-room-password');
      if (idLabel) idLabel.textContent = `#${cleanId}`;
      if (passInp) passInp.value = '';
      document.getElementById('create-room-setup-box')?.classList.add('hidden');
      promptBox?.classList.remove('hidden');
      setTimeout(() => passInp?.focus(), 40);
      return;
    }

    this.closeRoomPasswordPrompt();
    this.inInitialLobby = false;
    await this.joinWifiRoom(cleanId, '');
  }

  async confirmJoinPasswordProtectedRoom() {
    if (!this.pendingJoinRoomTarget) return;
    const pass = (document.getElementById('input-join-room-password')?.value || '').trim();
    if (!pass) {
      alert('⚠️ Vui lòng nhập mật khẩu của bàn!');
      return;
    }
    const target = this.pendingJoinRoomTarget;
    const inputHash = this.hashRoomPassword(pass);
    if (target.passwordHash && inputHash !== target.passwordHash) {
      alert('❌ Mật khẩu bàn không chính xác! Vui lòng kiểm tra lại.');
      return;
    }
    const targetRoomId = target.roomId;
    this.closeRoomPasswordPrompt();
    this.inInitialLobby = false;
    await this.joinWifiRoom(targetRoomId, pass);
  }

  saveMultiplayerSessionToLocal() {
    try {
      if (!this.isMultiplayer || !this.roomId) {
        localStorage.removeItem('tlmn_active_mp_room_v2');
        return;
      }
      localStorage.setItem(
        'tlmn_active_mp_room_v2',
        JSON.stringify({
          roomId: this.roomId,
          roomPassword: this.roomPassword || '',
          roomPasswordHash: this.roomPasswordHash || '',
          myClientId: this.myClientId,
          savedAt: Date.now(),
        })
      );
    } catch (_) {}
  }

  clearMultiplayerSessionFromLocal() {
    try {
      localStorage.removeItem('tlmn_active_mp_room_v2');
    } catch (_) {}
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
    this.setupMultiplayerLifecycleHooks();

    const params = new URLSearchParams(window.location.search);
    const roomParam = (params.get('room') || '').trim().toUpperCase();
    if (!this.currentAccountUsername) {
      if (roomParam) {
        this._pendingJoinRoomParam = roomParam;
      }
      this.openAccountModal('register');
      return;
    }
    if (roomParam) {
      this.openModeSetupModal('human');
      const inp = document.getElementById('input-room-code');
      if (inp) inp.value = roomParam;
      const nameInp = document.getElementById('input-player-name');
      if (nameInp) {
        nameInp.value = this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername);
      }
      this.modalWifi.classList.remove('hidden');
      this.renderLobbyModal();
      await this.searchMultiplayerRoomById(roomParam);
      return;
    }

    // Tự động khôi phục và đồng bộ vào lại đúng 1 bàn duy nhất nếu trước đó người chơi thoát trình duyệt mà chưa bấm Rời Phòng!
    try {
      const rawMp = localStorage.getItem('tlmn_active_mp_room_v2');
      if (rawMp) {
        const savedMp = JSON.parse(rawMp);
        if (savedMp && savedMp.roomId && Date.now() - (Number(savedMp.savedAt) || 0) < 3600000) {
          const cloudRoom = await this.fetchRoomStateFromCloud(savedMp.roomId);
          if (cloudRoom && !cloudRoom.closed && Array.isArray(cloudRoom.state?.players)) {
            const kickedList = Array.isArray(cloudRoom.state.kickedAfkClientIds)
              ? cloudRoom.state.kickedAfkClientIds
              : [];
            if (kickedList.includes(this.myClientId)) {
              this.clearMultiplayerSessionFromLocal();
              return;
            }
            const stillInTable = cloudRoom.state.players.some(
              (p) =>
                p.active &&
                !p.isBot &&
                (p.clientId === this.myClientId ||
                  (this.currentAccountUsername && p.accountUsername === this.currentAccountUsername))
            );
            if (stillInTable) {
              this.openModeSetupModal('human');
              await this.joinWifiRoom(savedMp.roomId, savedMp.roomPassword || '', true);
            } else {
              this.clearMultiplayerSessionFromLocal();
            }
          } else {
            this.clearMultiplayerSessionFromLocal();
          }
        }
      }
    } catch (_) {}
  }

  setupMultiplayerLifecycleHooks() {
    if (this._mpLifecycleBound) return;
    this._mpLifecycleBound = true;

    document.addEventListener('visibilitychange', () => {
      if (!this.isMultiplayer || !this.roomId) return;
      if (document.hidden) {
        if (this.isHost) {
          this.pushRoomStateToCloud();
        }
      } else {
        this.reconcileRoomSingleTableOnWake();
      }
    });

    window.addEventListener('focus', () => {
      if (this.isMultiplayer && this.roomId) {
        this.reconcileRoomSingleTableOnWake();
      }
    });

    window.addEventListener('pageshow', () => {
      if (this.isMultiplayer && this.roomId) {
        this.reconcileRoomSingleTableOnWake();
      }
    });
  }

  async reconcileRoomSingleTableOnWake() {
    if (!this.isMultiplayer || !this.roomId || this._reconcilingWake) return;
    this._reconcilingWake = true;
    try {
      const cloudRoom = await this.fetchRoomStateFromCloud(this.roomId);
      if (!cloudRoom || cloudRoom.closed) {
        this._reconcilingWake = false;
        return;
      }
      const cloudEpoch = Number(cloudRoom.hostClaimEpoch) || 1;
      const myEpoch = Number(this.hostClaimEpoch) || 1;

      if (this.isHost) {
        // Nếu trong lúc máy này thoát/đóng trình duyệt, người kia đã tiếp quản làm Host (cloudEpoch > myEpoch)
        // ➔ Máy này chuyển thành Khách (Guest) của bàn đó để cả 2 CHỈ CHƠI TRÊN 1 BÀN DUY NHẤT!
        if (
          cloudRoom.hostClientId &&
          cloudRoom.hostClientId !== this.myClientId &&
          cloudEpoch > myEpoch
        ) {
          this.demoteHostToGuest(cloudRoom);
        } else {
          await this.pushRoomStateToCloud();
        }
      } else {
        const beatVal = Number(cloudRoom.hostHeartbeatMs) || 0;
        if (beatVal !== this._lastObservedHostBeatVal) {
          this._lastObservedHostBeatVal = beatVal;
          this._lastObservedHostBeatLocalMs = Date.now();
        }
        if (cloudRoom.state && cloudRoom.state.players) {
          if (cloudRoom.hostPeerId && cloudRoom.hostPeerId !== this.connectedHostPeerId) {
            this.hostPeerId = cloudRoom.hostPeerId;
            this.initGuestPeer(this.roomId, this.getLocalPlayer()?.name || this.savedPlayerName);
          }
          this.applySyncedStateOnGuest(cloudRoom.state);
        }
      }
    } catch (_) {}
    this._reconcilingWake = false;
  }

  demoteHostToGuest(cloudRoom) {
    if (!cloudRoom || !cloudRoom.state) return;
    clearTimeout(this.botTimer);
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.peerConnections = [];
    this.isHost = false;
    this.hostClientId = cloudRoom.hostClientId;
    this.hostPeerId = cloudRoom.hostPeerId || `tlmn-bkp-room-${this.roomId}-${cloudRoom.hostClaimEpoch || 1}`;
    this.hostClaimEpoch = Number(cloudRoom.hostClaimEpoch) || 1;
    this.lastSyncedVersion = Number(cloudRoom.version) || 0;
    this._lastObservedHostBeatVal = Number(cloudRoom.hostHeartbeatMs) || 0;
    this._lastObservedHostBeatLocalMs = Date.now();
    this.applySyncedStateOnGuest(cloudRoom.state);
    this.initGuestPeer(this.roomId, this.getLocalPlayer()?.name || this.savedPlayerName || 'Người chơi');
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollRoomAsGuest(), 850);
    this.renderLobbyModal();
    this.renderAll();
  }

  async promoteGuestToHost(cloudRoom) {
    if (!cloudRoom || !cloudRoom.state) return;
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.hostConn = null;
    this.isHost = true;
    this.hostClientId = this.myClientId;
    this.hostClaimEpoch = (Number(cloudRoom.hostClaimEpoch) || 1) + 1;
    this.hostPeerId = `tlmn-bkp-room-${this.roomId}-${this.hostClaimEpoch}`;
    this.roomStateVersion = (Number(cloudRoom.version) || 1) + 1;

    this.applyRestoredRoomStateOnHost(
      cloudRoom.state,
      this.getLocalPlayer()?.name || this.savedPlayerName || 'Người chơi'
    );
    this.initHostPeer(this.roomId);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollRoomAsHost(), 850);
    await this.pushRoomStateToCloud([]);
    this.publishRoomToDirectory(false);
    this.renderLobbyModal();
    this.renderAll();
    if (!this.isGameOver && this.matchCount >= 1) {
      this.promptCurrentTurn();
    }
  }

  applyRestoredRoomStateOnHost(state, myName) {
    if (!state) return;
    if (typeof state.betPerCard === 'number' && state.betPerCard >= 20) {
      this.betPerCard = state.betPerCard;
    }
    this.matchCount = typeof state.matchCount === 'number' ? state.matchCount : 0;
    this.lastWinnerId = state.lastWinnerId ?? null;
    this.currentTurn = typeof state.currentTurn === 'number' ? state.currentTurn : 0;
    this.currentCombo = state.currentCombo || null;
    this.previousCombo = state.previousCombo || null;
    this.trickOwnerId = state.trickOwnerId ?? null;
    this.mustPlay3Spade = !!state.mustPlay3Spade;
    this.isGameOver = !!(state.isGameOver && this.matchCount >= 1);
    this.raidenElectroMarkOwnerId = state.raidenElectroMarkOwnerId ?? null;
    this.raidenSlashMustSingle = !!state.raidenSlashMustSingle;
    this.furinaReverseSuitRound = !!state.furinaReverseSuitRound;
    activeFurinaReverseSuit = this.furinaReverseSuitRound;
    this.yaeForcePlayRound = !!state.yaeForcePlayRound;
    this.clorindeDuelPair = state.clorindeDuelPair || null;
    this.ayakaFrozenPlayerId = state.ayakaFrozenPlayerId ?? null;
    this.hutaoTaxOwnerId = state.hutaoTaxOwnerId ?? null;
    this.eulaNextPlayBoost = !!state.eulaNextPlayBoost;
    this.naviaLockedTargetId = state.naviaLockedTargetId ?? null;
    this.naviaLockedCardIds = new Set(Array.isArray(state.naviaLockedCardIds) ? state.naviaLockedCardIds : []);
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = !!state.shenheSingleOnlyRound;
    activeShenheSingleOnly = this.shenheSingleOnlyRound;
    this.ganyuGapStraightTurn = !!state.ganyuGapStraightTurn;
    activeGanyuGapStraight = this.ganyuGapStraightTurn;
    this.kokomiReverseRankRound = !!state.kokomiReverseRankRound;
    activeKokomiReverseRank = this.kokomiReverseRankRound;
    this.yoimiyaBurnTrashReady = !!state.yoimiyaBurnTrashReady;
    this.turnDirection = state.turnDirection === -1 ? -1 : 1;
    this.mualaniCrossBeatTurn = !!state.mualaniCrossBeatTurn;
    activeMualaniCrossBeat = this.mualaniCrossBeatTurn;
    this.lastSummaryData = state.lastSummaryData || null;
    this.lastBurstEffect = state.lastBurstEffect || null;
    this.kickedAfkClientIds = new Set(Array.isArray(state.kickedAfkClientIds) ? state.kickedAfkClientIds : []);

    if (Array.isArray(state.penaltyCardIds)) {
      this.penaltyCardIdsByPlayer = state.penaltyCardIds.map((arr) => new Set(arr));
    }
    if (Array.isArray(state.logsData)) {
      this.logsData = state.logsData;
      if (this.elGameLog) {
        this.elGameLog.innerHTML = this.logsData
          .map((l) => `<div class="log-item ${l.cssClass}">${l.message}</div>`)
          .join('');
      }
    }

    if (Array.isArray(state.players) && state.players.length === 4) {
      this.players = state.players.map((p, idx) => ({
        ...p,
        id: idx,
        hand: Array.isArray(p.hand) ? p.hand : [],
        manualActionsInMatch: Number(p.manualActionsInMatch) || 0,
        afkAutoTurns: Number(p.afkAutoTurns) || 0,
      }));
      let mySeat =
        this.players.find((p) => p.clientId === this.myClientId) ||
        this.players.find((p) => !p.isBot && p.name === myName && (!p.clientId || p.clientId === this.myClientId));

      if (!mySeat) {
        mySeat = this.players.find((p) => !p.active);
      }
      if (mySeat) {
        mySeat.clientId = this.myClientId;
        mySeat.accountUsername = this.currentAccountUsername || '';
        mySeat.name = myName || mySeat.name;
        mySeat.avatar = this.equippedAvatar || mySeat.avatar;
        mySeat.cardSkin = this.equippedSkin || mySeat.cardSkin;
        mySeat.chopBurst = this.equippedChopBurst || mySeat.chopBurst;
        mySeat.winBurst = this.equippedWinBurst || mySeat.winBurst;
        mySeat.activeChar = this.equippedActiveChar || mySeat.activeChar || 'none';
        mySeat.coins = this.savedCoins;
        mySeat.isBot = false;
        mySeat.active = true;
        this.mySeatId = mySeat.id;
      }
    }
  }

  getShareableRoomUrl(code) {
    return `https://thangdinhbkp-glitch.github.io/tien-len-mien-nam-bosskingpig/?room=${code}`;
  }

  async createWifiRoom() {
    await this.refreshServerInfo();
    this.setupMultiplayerLifecycleHooks();
    const myName =
      document.getElementById('input-player-name')?.value.trim() ||
      this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername) ||
      'Chủ Phòng';
    const rawPass = (document.getElementById('input-room-password')?.value || '').trim();
    const rawTitle = (document.getElementById('input-room-title')?.value || '').trim();

    const existingIds = new Set((this.multiplayerRoomsList || []).map((r) => String(r.roomId)));
    let code = String(Math.floor(1000 + Math.random() * 9000));
    for (let tries = 0; tries < 10 && existingIds.has(code); tries++) {
      code = String(Math.floor(1000 + Math.random() * 9000));
    }

    clearTimeout(this.botTimer);
    clearTimeout(this.afkAutoLeaveTimer);
    this.stopMultiplayerSync();
    this.clearActiveMatchSnapshot();

    this.isMultiplayer = true;
    this.isHost = true;
    this.roomId = code;
    this.roomPassword = rawPass;
    this.roomPasswordHash = this.hashRoomPassword(rawPass);
    this.roomTitle = rawTitle || `Bàn của ${myName}`;
    this.mySeatId = 0;
    this.hostClientId = this.myClientId;
    this.hostClaimEpoch = 1;
    this.hostPeerId = `tlmn-bkp-room-${code}-1`;
    this.roomStateVersion = 1;
    this.processedClientEventIds = new Set();
    this.cloudPendingEvents = [];
    this.kickedAfkClientIds = new Set();
    this.playerHeartbeats = { [this.myClientId]: Date.now() };

    // Reset sạch trạng thái ván cũ trước khi tạo phòng
    this.isGameOver = false;
    this.isBurstPlaying = false;
    this.matchCount = 0;
    this.lastWinnerId = null;
    this.currentTurn = 0;
    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.mustPlay3Spade = false;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;
    this.roundChoppableStack = [];
    this.lastSummaryData = null;
    this.lastBurstEffect = null;
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.raidenElectroMarkOwnerId = null;
    this.raidenSlashMustSingle = false;
    this.furinaReverseSuitRound = false;
    activeFurinaReverseSuit = false;
    this.yaeForcePlayRound = false;
    this.clorindeDuelPair = null;
    this.ayakaFrozenPlayerId = null;
    this.hutaoTaxOwnerId = null;
    this.eulaNextPlayBoost = false;
    this.mavuikaSelectingCard = false;
    this.yelanRevealedByPlayer = {};
    this.logsData = [];
    if (this.elGameLog) this.elGameLog.innerHTML = '';
    this.modalSummary?.classList.add('hidden');
    this.btnShowSummary?.classList.add('hidden');

    this.players = [
      {
        id: 0,
        name: myName,
        avatar: this.equippedAvatar,
        cardSkin: this.equippedSkin,
        chopBurst: this.equippedChopBurst,
        winBurst: this.equippedWinBurst,
        activeChar: this.equippedActiveChar || 'none',
        skillUsed: false,
        isBot: false,
        active: true,
        hand: [],
        coins: this.savedCoins,
        passed: false,
        finishRank: null,
        clientId: this.myClientId,
        accountUsername: this.currentAccountUsername || '',
        manualActionsInMatch: 0,
        afkAutoTurns: 0,
      },
      { id: 1, name: 'Ghế trống 2', avatar: '🐯', cardSkin: 'classic', chopBurst: 'none', winBurst: 'none', activeChar: 'none', skillUsed: false, isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null, manualActionsInMatch: 0, afkAutoTurns: 0 },
      { id: 2, name: 'Ghế trống 3', avatar: '🦊', cardSkin: 'classic', chopBurst: 'none', winBurst: 'none', activeChar: 'none', skillUsed: false, isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null, manualActionsInMatch: 0, afkAutoTurns: 0 },
      { id: 3, name: 'Ghế trống 4', avatar: '🐼', cardSkin: 'classic', chopBurst: 'none', winBurst: 'none', activeChar: 'none', skillUsed: false, isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null, manualActionsInMatch: 0, afkAutoTurns: 0 },
    ];

    if (this.elTurnBanner) {
      this.elTurnBanner.textContent = `🏠 Đã tạo Bàn #${code} (${this.roomPasswordHash ? '🔒 Có mật khẩu' : '🔓 Tự do'}) — Đang chờ người chơi vào bàn...`;
    }
    const statusLbl = document.getElementById('wifi-status-label');
    if (statusLbl) statusLbl.textContent = `Phòng #${code}`;
    const dispCode = document.getElementById('display-room-code');
    if (dispCode) dispCode.textContent = `#${code}`;
    const shareInp = document.getElementById('share-link-input');
    if (shareInp) shareInp.value = this.getShareableRoomUrl(code);

    document.getElementById('create-room-setup-box')?.classList.add('hidden');
    document.getElementById('room-password-prompt-box')?.classList.add('hidden');
    document.getElementById('mode-setup-bet-section')?.classList.add('hidden');
    document.getElementById('wifi-room-box')?.classList.remove('hidden');

    this.saveMultiplayerSessionToLocal();
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
    this.updateMidMatchLockUI();
    this.initHostPeer(code);
    fetch(`https://textdb.dev/api/data/tlmn_bkp_ev_${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: this.encodeCloudPayload([]),
    }).catch(() => null);
    await this.pushRoomStateToCloud([]);
    await this.publishRoomToDirectory(false);
    this.broadcastState();
    this.pollTimer = setInterval(() => this.pollRoomAsHost(), 850);
    this.renderLobbyModal();
    this.renderAll();
    sfx.win();
    this.showComboBanner(`🏠 ĐÃ TẠO PHÒNG #${code} & PUSH LÊN SẢNH BÀN!`);
    this.addLog(
      `🏠 <strong>Đã tạo Bàn #${code}</strong> (${this.roomPasswordHash ? `🔒 Có mật khẩu` : '🔓 Không mật khẩu'}) và đẩy lên Sảnh Bàn! Bạn bè có thể bấm trực tiếp vào bàn trên Sảnh hoặc tìm ID <strong>#${code}</strong>.`,
      'log-win'
    );
  }

  async joinWifiRoom(code, passwordPlain = '', isAutoRestore = false) {
    const cleanCode = String(code || '')
      .replace(/[^0-9a-zA-Z]/g, '')
      .trim()
      .toUpperCase();
    if (!cleanCode) return;

    await this.refreshServerInfo();
    this.setupMultiplayerLifecycleHooks();
    const myName =
      document.getElementById('input-player-name')?.value.trim() ||
      this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername) ||
      'Bạn bè';

    const cloudRoom = await this.fetchRoomStateFromCloud(cleanCode);
    if (cloudRoom && cloudRoom.hasPassword && !isAutoRestore) {
      const passHash = this.hashRoomPassword(passwordPlain);
      if (passHash !== cloudRoom.passwordHash) {
        this.pendingJoinRoomTarget = this.convertCloudRoomToDirectoryCard(cloudRoom) || {
          roomId: cleanCode,
          hasPassword: true,
          passwordHash: cloudRoom.passwordHash,
        };
        const promptBox = document.getElementById('room-password-prompt-box');
        const idLabel = document.getElementById('password-prompt-room-id');
        const passInp = document.getElementById('input-join-room-password');
        if (idLabel) idLabel.textContent = `#${cleanCode}`;
        if (passInp) passInp.value = '';
        promptBox?.classList.remove('hidden');
        setTimeout(() => passInp?.focus(), 40);
        return;
      }
    }

    clearTimeout(this.botTimer);
    clearTimeout(this.afkAutoLeaveTimer);
    this.stopMultiplayerSync();
    this.clearActiveMatchSnapshot();

    this.isMultiplayer = true;
    this.roomId = cleanCode;
    this.roomPassword = passwordPlain || '';
    this.roomPasswordHash = cloudRoom?.passwordHash || this.hashRoomPassword(passwordPlain);
    this.roomTitle = cloudRoom?.title || '';
    this.kickedAfkClientIds = new Set();

    const statusLbl = document.getElementById('wifi-status-label');
    if (statusLbl) statusLbl.textContent = `Phòng #${cleanCode}`;
    const dispCode = document.getElementById('display-room-code');
    if (dispCode) dispCode.textContent = `#${cleanCode}`;
    const shareInp = document.getElementById('share-link-input');
    if (shareInp) shareInp.value = this.getShareableRoomUrl(cleanCode);
    document.getElementById('create-room-setup-box')?.classList.add('hidden');
    document.getElementById('room-password-prompt-box')?.classList.add('hidden');
    document.getElementById('mode-setup-bet-section')?.classList.add('hidden');
    document.getElementById('wifi-room-box')?.classList.remove('hidden');

    // CHỈ khôi phục làm Chủ phòng nếu chính thiết bị này (myClientId) là người đã tạo bàn đó!
    // Khi người chơi khác bấm vào bàn từ Sảnh Bàn (isAutoRestore === false), họ LUÔN LUÔN vào với tư cách Khách (Guest), TUYỆT ĐỐI KHÔNG cướp quyền Chủ phòng!
    if (
      cloudRoom &&
      !cloudRoom.closed &&
      cloudRoom.state &&
      Array.isArray(cloudRoom.state.players) &&
      cloudRoom.hostClientId === this.myClientId
    ) {
      this.isHost = true;
      this.hostClientId = this.myClientId;
      this.hostClaimEpoch = Number(cloudRoom.hostClaimEpoch) || 1;
      this.hostPeerId = cloudRoom.hostPeerId || `tlmn-bkp-room-${cleanCode}-${this.hostClaimEpoch}`;
      this.roomStateVersion = (Number(cloudRoom.version) || 1) + 1;
      this.applyRestoredRoomStateOnHost(cloudRoom.state, myName);
      this.saveMultiplayerSessionToLocal();
      this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
      this.updateMidMatchLockUI();
      this.initHostPeer(cleanCode);
      await this.pushRoomStateToCloud([]);
      await this.publishRoomToDirectory(false);
      this.broadcastState();
      this.pollTimer = setInterval(() => this.pollRoomAsHost(), 850);
      this.renderLobbyModal();
      this.renderAll();
      if (!this.isGameOver && this.matchCount >= 1) {
        this.promptCurrentTurn();
      }
      sfx.win();
      return;
    }

    // Vào bàn với tư cách Khách (Guest):
    // Nếu cả 2 người cùng thoát trình duyệt rồi mở lại (isAutoRestore === true), máy mở lại trước sẽ theo dõi nhịp tim của Chủ phòng cũ bằng đồng hồ nội bộ (tránh lệch giờ giữa 2 máy); nếu sau 4.5s Chủ phòng cũ vẫn chưa mở lại thì tự động tiếp quản bàn!
    this.isHost = false;
    this.hostClientId = cloudRoom?.hostClientId || '';
    this.hostClaimEpoch = Number(cloudRoom?.hostClaimEpoch) || 1;
    this.hostPeerId = cloudRoom?.hostPeerId || `tlmn-bkp-room-${cleanCode}-${this.hostClaimEpoch}`;
    this._lastObservedHostBeatVal = Number(cloudRoom?.hostHeartbeatMs) || 0;
    this._lastObservedHostBeatLocalMs = Date.now();
    this._autoRestoreTakeoverCheck = !!isAutoRestore;

    this.isGameOver = false;
    this.isBurstPlaying = false;
    this.matchCount = 0;
    this.currentCombo = null;
    this.previousCombo = null;
    this.lastSummaryData = null;
    this.lastBurstEffect = null;
    this.modalSummary?.classList.add('hidden');
    this.btnShowSummary?.classList.add('hidden');

    if (cloudRoom && cloudRoom.state && Array.isArray(cloudRoom.state.players)) {
      this.applySyncedStateOnGuest(cloudRoom.state);
    }

    // Đảm bảo Khách mới vào bàn được xếp ngay vào Ghế trống (#2, #3, #4 — tuyệt đối không đè vào Ghế #1 của Chủ phòng!)
    let myExistingSeat = this.players.find((p) => p.clientId === this.myClientId);
    if (!myExistingSeat) {
      myExistingSeat =
        this.players.find((p, idx) => idx > 0 && !p.active) ||
        this.players.find((p) => !p.active && p.clientId !== this.hostClientId);
      if (myExistingSeat) {
        this.mySeatId = myExistingSeat.id;
        myExistingSeat.name = myName;
        myExistingSeat.avatar = this.equippedAvatar;
        myExistingSeat.cardSkin = this.equippedSkin;
        myExistingSeat.chopBurst = this.equippedChopBurst;
        myExistingSeat.winBurst = this.equippedWinBurst;
        myExistingSeat.activeChar = this.equippedActiveChar || 'none';
        myExistingSeat.coins = this.savedCoins;
        myExistingSeat.isBot = false;
        myExistingSeat.active = true;
        myExistingSeat.clientId = this.myClientId;
        myExistingSeat.accountUsername = this.currentAccountUsername || '';
      } else {
        this.mySeatId = 1;
      }
    } else {
      this.mySeatId = myExistingSeat.id;
    }

    this.saveMultiplayerSessionToLocal();
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};

    const joinEvt = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type: 'JOIN',
      clientId: this.myClientId,
      preferredSeatId: this.mySeatId,
      accountUsername: this.currentAccountUsername || '',
      name: myName,
      avatar: this.equippedAvatar,
      cardSkin: this.equippedSkin,
      chopBurst: this.equippedChopBurst,
      winBurst: this.equippedWinBurst,
      activeChar: this.equippedActiveChar || 'none',
      coins: this.savedCoins,
      sentAtMs: Date.now(),
    };
    await this.sendClientEvent(joinEvt);

    this.initGuestPeer(cleanCode, myName);
    this.pollTimer = setInterval(() => this.pollRoomAsGuest(), 850);
    this.renderLobbyModal();
    this.renderMultiplayerTablesList();
    this.renderAll();
    sfx.click();
  }

  async leaveWifiRoom(isAutoAfkKick = false, customBannerMsg = '') {
    clearTimeout(this.afkAutoLeaveTimer);
    const oldRoomId = this.roomId;
    const wasHost = this.isHost;

    if (this.isMultiplayer && oldRoomId) {
      if (!wasHost) {
        await this.sendClientEvent({
          id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          type: 'LEAVE',
          clientId: this.myClientId,
          reason: isAutoAfkKick ? 'afk' : 'manual',
        });
      } else {
        // Nếu Chủ phòng rời bàn: giải phóng ghế của Chủ phòng. Nếu còn người chơi khác trong bàn thì nhường quyền Chủ phòng cho họ!
        const mySeat = this.players[this.mySeatId];
        if (mySeat) {
          mySeat.active = false;
          mySeat.isBot = false;
          mySeat.name = `Ghế trống ${mySeat.id + 1}`;
          mySeat.clientId = null;
          mySeat.hand = [];
        }
        const remainingHuman = this.players.find((p) => p.active && !p.isBot && p.clientId);
        if (remainingHuman) {
          this.hostClientId = remainingHuman.clientId;
          this.hostClaimEpoch = (Number(this.hostClaimEpoch) || 1) + 1;
          this.hostPeerId = `tlmn-bkp-room-${oldRoomId}-${this.hostClaimEpoch}`;
          this.roomStateVersion = (Number(this.roomStateVersion) || 1) + 1;
          await this.pushRoomStateToCloud([], false);
          await this.publishRoomToDirectory(false);
        } else {
          await this.pushRoomStateToCloud([], true);
          await this.removeRoomFromDirectory(oldRoomId);
        }
      }
    }

    this.stopMultiplayerSync();
    this.clearMultiplayerSessionFromLocal();
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.roomPassword = '';
    this.roomPasswordHash = '';
    this.roomTitle = '';
    this.mySeatId = 0;

    document.getElementById('wifi-room-box')?.classList.add('hidden');
    document.getElementById('human-create-join-row')?.classList.remove('hidden');
    document.getElementById('mode-setup-bet-section')?.classList.remove('hidden');
    const statusLbl = document.getElementById('wifi-status-label');
    if (statusLbl) statusLbl.textContent = 'Sảnh Chờ / Đổi Chế Độ';

    if (customBannerMsg) {
      this.showComboBanner(customBannerMsg);
      this.addLog(`💤 <strong>${customBannerMsg}</strong>`, 'log-chop');
    } else if (oldRoomId) {
      this.addLog(`👋 Bạn đã rời khỏi <strong>Phòng #${oldRoomId}</strong>.`, 'log-pass');
    }

    this.openModeSetupModal('human');
    this.modalWifi?.classList.remove('hidden');
    await this.refreshMultiplayerRoomsDirectory(false);
    this.renderLobbyModal();
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
    sfx.click();
  }

  switchToSoloBotMode() {
    this.stopMultiplayerSync();
    this.clearMultiplayerSessionFromLocal();
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.mySeatId = 0;
    this.modalWifi?.classList.add('hidden');

    // Nếu người chơi đã bấm Random Bot trước đó (queuedNextMatchBots), áp dụng ngay lập tức!
    if (this.queuedNextMatchBots) {
      this.applyQueuedNextMatchBots();
    }

    const myName =
      document.getElementById('input-player-name')?.value.trim() ||
      this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername);
    const botBankroll = Math.max(INITIAL_COINS, (this.betPerCard || 100) * 500);
    const count = this.soloPlayerCount || 4;

    const prevB1 = this.players?.[1];
    const prevB2 = this.players?.[2];
    const prevB3 = this.players?.[3];

    const b1Char = prevB1?.activeChar || prevB1?.chopBurst || prevB1?.cardSkin || 'furina';
    const b2Char = prevB2?.activeChar || prevB2?.chopBurst || prevB2?.cardSkin || 'raiden';
    const b3Char = prevB3?.activeChar || prevB3?.chopBurst || prevB3?.cardSkin || 'skirk';

    this.players = [
      {
        id: 0,
        name: myName,
        avatar: this.equippedAvatar,
        cardSkin: this.equippedSkin,
        chopBurst: this.equippedChopBurst,
        winBurst: this.equippedWinBurst,
        activeChar: this.equippedActiveChar || 'none',
        skillUsed: false,
        isBot: false,
        active: true,
        hand: [],
        coins: this.savedCoins,
        passed: false,
        finishRank: null,
        clientId: 'host',
      },
      {
        id: 1,
        name: prevB1?.name || 'Bot Furina 💧',
        avatar: prevB1?.avatar || b1Char,
        cardSkin: prevB1?.cardSkin || b1Char,
        chopBurst: b1Char,
        winBurst: b1Char,
        activeChar: b1Char,
        skillUsed: false,
        isBot: true,
        active: count >= 3,
        hand: [],
        coins: botBankroll,
        passed: false,
        finishRank: null,
        clientId: null,
      },
      {
        id: 2,
        name: prevB2?.name || 'Bot Raiden ⚡',
        avatar: prevB2?.avatar || b2Char,
        cardSkin: prevB2?.cardSkin || b2Char,
        chopBurst: b2Char,
        winBurst: b2Char,
        activeChar: b2Char,
        skillUsed: false,
        isBot: true,
        active: true,
        hand: [],
        coins: botBankroll,
        passed: false,
        finishRank: null,
        clientId: null,
      },
      {
        id: 3,
        name: prevB3?.name || 'Bot Skirk 🌌',
        avatar: prevB3?.avatar || b3Char,
        cardSkin: prevB3?.cardSkin || b3Char,
        chopBurst: b3Char,
        winBurst: b3Char,
        activeChar: b3Char,
        skillUsed: false,
        isBot: true,
        active: count === 4,
        hand: [],
        coins: botBankroll,
        passed: false,
        finishRank: null,
        clientId: null,
      },
    ];

    // QUAN TRỌNG: Giữ nguyên 100% nhân vật Bot đang hiển thị ở bảng chọn (VD: Bot Xilonen),
    // TUYỆT ĐỐI KHÔNG gọi randomizeBotCharacters() lần 2 ở đây làm nhảy sang Bot khác (VD: Bot Yoimiya)!
    this.updateArenaBackdropCharacters();

    const statusLbl = document.getElementById('wifi-status-label');
    if (statusLbl) statusLbl.textContent = `Đấu Bot (${count} Người) / Đổi Cược`;
    document.getElementById('wifi-room-box')?.classList.add('hidden');
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
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
    this.connectedHostPeerId = '';
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

  initHostPeer(code) {
    if (typeof Peer === 'undefined') {
      setTimeout(() => this.initHostPeer(code), 400);
      return;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    const peerId = this.hostPeerId || `tlmn-bkp-room-${code}-${this.hostClaimEpoch || 1}`;
    this.hostPeerId = peerId;
    try {
      this.peer = new Peer(peerId, this.getPeerConfig());
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
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    const targetPeerId = this.hostPeerId || `tlmn-bkp-room-${code}-${this.hostClaimEpoch || 1}`;
    this.connectedHostPeerId = targetPeerId;
    try {
      this.peer = new Peer(undefined, this.getPeerConfig());
      this.peer.on('open', () => {
        if (!this.isMultiplayer || this.isHost || !this.peer) return;
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.hostConn = conn;
        conn.on('open', () => {
          conn.send({
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            type: 'JOIN',
            clientId: this.myClientId,
            accountUsername: this.currentAccountUsername || '',
            name: myName,
            avatar: this.equippedAvatar,
            cardSkin: this.equippedSkin,
            chopBurst: this.equippedChopBurst,
            winBurst: this.equippedWinBurst,
            activeChar: this.equippedActiveChar || 'none',
            coins: this.savedCoins,
          });
        });
        conn.on('data', (stateObj) => {
          if (stateObj && stateObj.players) {
            this.applySyncedStateOnGuest(stateObj);
          }
        });
      });
    } catch (_) {}
  }

  serializeRoomState() {
    return {
      roomId: this.roomId,
      roomTitle: this.roomTitle || '',
      hasPassword: !!this.roomPasswordHash,
      hostClientId: this.hostClientId || this.myClientId,
      hostPeerId: this.hostPeerId || `tlmn-bkp-room-${this.roomId}-${this.hostClaimEpoch || 1}`,
      hostClaimEpoch: this.hostClaimEpoch || 1,
      version: this.roomStateVersion || 1,
      betPerCard: this.betPerCard || 100,
      matchCount: this.matchCount,
      lastWinnerId: this.lastWinnerId,
      currentTurn: this.currentTurn,
      currentCombo: this.currentCombo,
      previousCombo: this.previousCombo,
      trickOwnerId: this.trickOwnerId,
      mustPlay3Spade: this.mustPlay3Spade,
      isGameOver: this.isGameOver && this.matchCount >= 1,
      raidenElectroMarkOwnerId: this.raidenElectroMarkOwnerId ?? null,
      raidenSlashMustSingle: !!this.raidenSlashMustSingle,
      furinaReverseSuitRound: !!this.furinaReverseSuitRound,
      yaeForcePlayRound: !!this.yaeForcePlayRound,
      clorindeDuelPair: this.clorindeDuelPair || null,
      ayakaFrozenPlayerId: this.ayakaFrozenPlayerId ?? null,
      hutaoTaxOwnerId: this.hutaoTaxOwnerId ?? null,
      eulaNextPlayBoost: !!this.eulaNextPlayBoost,
      naviaLockedTargetId: this.naviaLockedTargetId ?? null,
      naviaLockedCardIds: Array.from(this.naviaLockedCardIds || []),
      shenheSingleOnlyRound: !!this.shenheSingleOnlyRound,
      ganyuGapStraightTurn: !!this.ganyuGapStraightTurn,
      kokomiReverseRankRound: !!this.kokomiReverseRankRound,
      yoimiyaBurnTrashReady: !!this.yoimiyaBurnTrashReady,
      turnDirection: this.turnDirection === -1 ? -1 : 1,
      mualaniCrossBeatTurn: !!this.mualaniCrossBeatTurn,
      turnBannerText: this.elTurnBanner?.textContent || '',
      firstTurnBadgeText: this.elFirstTurnBadge?.textContent || '',
      comboBannerText:
        this.elComboAnnouncement && !this.elComboAnnouncement.classList.contains('hidden')
          ? this.elComboAnnouncement.textContent
          : null,
      logsData: (this.logsData || []).slice(0, 25),
      lastSummaryData: this.matchCount >= 1 ? this.lastSummaryData : null,
      lastBurstEffect: this.matchCount >= 1 ? this.lastBurstEffect : null,
      penaltyCardIds: this.penaltyCardIdsByPlayer.map((s) => Array.from(s)),
      kickedAfkClientIds: Array.from(this.kickedAfkClientIds || []),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cardSkin: p.cardSkin || 'classic',
        chopBurst: p.chopBurst || 'none',
        winBurst: p.winBurst || 'none',
        activeChar: p.activeChar || p.chopBurst || 'none',
        skillUsed: !!p.skillUsed,
        isBot: p.isBot,
        active: p.active,
        hand: p.hand,
        coins: p.coins,
        passed: p.passed,
        finishRank: p.finishRank,
        clientId: p.clientId,
        accountUsername: p.accountUsername || '',
        manualActionsInMatch: Number(p.manualActionsInMatch) || 0,
        afkAutoTurns: Number(p.afkAutoTurns) || 0,
      })),
    };
  }

  async broadcastState() {
    if (!this.isMultiplayer || !this.isHost || !this.roomId) return;
    this.roomStateVersion = (Number(this.roomStateVersion) || 1) + 1;
    const stateObj = this.serializeRoomState();

    // 1. Gửi qua PeerJS P2P
    this.peerConnections.forEach((conn) => {
      try {
        if (conn.open) conn.send(stateObj);
      } catch (_) {}
    });

    // 2. Đồng bộ lên Cloud Room State (textdb.dev) để dù P2P rớt hay thoát vào lại vẫn là 1 bàn duy nhất
    this.pushRoomStateToCloud([]);
    const now = Date.now();
    if (!this._lastDirPublishMs || now - this._lastDirPublishMs > 4500 || this.matchCount <= 1) {
      this._lastDirPublishMs = now;
      this.publishRoomToDirectory(false);
    }

    // 3. Gửi qua Local WiFi Server (nếu chạy trên localhost)
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

  async fetchCloudRoomEvents(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return [];
    try {
      const res = await fetch(`https://textdb.dev/api/data/tlmn_bkp_ev_${cleanCode}?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return [];
      const text = await res.text();
      const parsed = this.decodeCloudPayload(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  async sendClientEvent(evt) {
    if (!evt) return;
    if (!evt.id) {
      evt.id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }
    if (!evt.sentAtMs) {
      evt.sentAtMs = Date.now();
    }
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send(evt);
      } catch (_) {}
    }
    if (this.roomId) {
      try {
        const now = Date.now();
        const existingEvts = await this.fetchCloudRoomEvents(this.roomId);
        const recentEvts = existingEvts.filter((e) => e && e.id && now - (Number(e.sentAtMs) || now) < 60000);
        if (!recentEvts.some((e) => e.id === evt.id)) {
          recentEvts.push(evt);
        }
        await fetch(`https://textdb.dev/api/data/tlmn_bkp_ev_${this.roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: this.encodeCloudPayload(recentEvts.slice(-20)),
        });
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
    if (!this.isMultiplayer || !this.isHost || !this.roomId || this._pollingHost) return;
    this._pollingHost = true;
    try {
      // 1. Lấy trạng thái phòng và hàng đợi sự kiện khách (tlmn_bkp_ev_...) song song để không bao giờ ghi đè mất sự kiện JOIN/Đánh bài!
      const [cloudRoom, cloudEvents] = await Promise.all([
        this.fetchRoomStateFromCloud(this.roomId),
        this.fetchCloudRoomEvents(this.roomId),
      ]);

      if (cloudRoom) {
        const cloudEpoch = Number(cloudRoom.hostClaimEpoch) || 1;
        const myEpoch = Number(this.hostClaimEpoch) || 1;

        if (
          cloudRoom.hostClientId &&
          cloudRoom.hostClientId !== this.myClientId &&
          cloudEpoch > myEpoch
        ) {
          this.demoteHostToGuest(cloudRoom);
          this._pollingHost = false;
          return;
        }
      }

      const allEvents = [
        ...(Array.isArray(cloudRoom?.events) ? cloudRoom.events : []),
        ...(Array.isArray(cloudEvents) ? cloudEvents : []),
      ];
      let hadNewEvt = false;
      allEvents.forEach((evt) => {
        if (evt && evt.id && !this.processedClientEventIds.has(evt.id)) {
          hadNewEvt = true;
          this.handleClientEventOnHost(evt);
        }
      });

      const now = Date.now();
      if (hadNewEvt || !this._lastHostHeartbeatPushMs || now - this._lastHostHeartbeatPushMs > 2800) {
        this._lastHostHeartbeatPushMs = now;
        await this.pushRoomStateToCloud([]);
      }

      // 2. Local server (nếu chạy LAN)
      if (!this.isStaticCloudHost()) {
        const res = await fetch(`/api/room/${this.roomId}/poll?host=1`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events) && data.events.length > 0) {
            data.events.forEach((evt) => this.handleClientEventOnHost(evt));
          }
        }
      }
    } catch (_) {}
    this._pollingHost = false;
  }

  async pollRoomAsGuest() {
    if (!this.isMultiplayer || this.isHost || !this.roomId || this._pollingGuest) return;
    this._pollingGuest = true;
    try {
      const cloudRoom = await this.fetchRoomStateFromCloud(this.roomId);
      if (cloudRoom) {
        if (cloudRoom.closed) {
          this._pollingGuest = false;
          await this.leaveWifiRoom(false, '🏠 Bàn chơi đã đóng do toàn bộ người chơi rời bàn.');
          return;
        }

        // Đo nhịp tim của Chủ phòng hoàn toàn bằng đồng hồ nội bộ của máy Khách (miễn nhiễm 100% lỗi lệch giờ hệ thống giữa 2 máy!)
        const beatVal = Number(cloudRoom.hostHeartbeatMs) || 0;
        if (!this._lastObservedHostBeatVal || beatVal !== this._lastObservedHostBeatVal) {
          this._lastObservedHostBeatVal = beatVal;
          this._lastObservedHostBeatLocalMs = Date.now();
          this._autoRestoreTakeoverCheck = false;
        }

        const silenceDurationOnMyClock = Date.now() - (this._lastObservedHostBeatLocalMs || Date.now());
        const takeoverThresholdMs = this._autoRestoreTakeoverCheck ? 5000 : 25000;

        // Chỉ tiếp quản làm Chủ phòng nếu Chủ phòng thực sự đã đóng trình duyệt (nhịp tim đứng yên suốt 25s, hoặc 5s khi tự khôi phục sau khi cả 2 thoát game)
        if (
          !document.hidden &&
          (cloudRoom.hostClientId === this.myClientId || silenceDurationOnMyClock > takeoverThresholdMs)
        ) {
          this._autoRestoreTakeoverCheck = false;
          await this.promoteGuestToHost(cloudRoom);
          this._pollingGuest = false;
          return;
        }

        if (cloudRoom.hostPeerId && cloudRoom.hostPeerId !== this.connectedHostPeerId) {
          this.hostPeerId = cloudRoom.hostPeerId;
          this.hostClaimEpoch = Number(cloudRoom.hostClaimEpoch) || 1;
          this.initGuestPeer(this.roomId, this.getLocalPlayer()?.name || this.savedPlayerName || 'Bạn bè');
        }
        if (cloudRoom.state && Array.isArray(cloudRoom.state.players)) {
          const v = Number(cloudRoom.version) || 0;
          if (v >= this.lastSyncedVersion) {
            this.lastSyncedVersion = v;
            this.applySyncedStateOnGuest(cloudRoom.state);
          }
        }
      }

      if (!this.isStaticCloudHost()) {
        const res = await fetch(`/api/room/${this.roomId}/poll?host=0`);
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== this.lastSyncedVersion && data.state && data.state.players) {
            this.lastSyncedVersion = data.version;
            this.applySyncedStateOnGuest(data.state);
          }
        }
      }
    } catch (_) {}
    this._pollingGuest = false;
  }

  handleClientEventOnHost(evt) {
    if (!evt || !evt.type) return;
    if (evt.id) {
      if (this.processedClientEventIds.has(evt.id)) return;
      this.processedClientEventIds.add(evt.id);
    }
    if (evt.clientId) {
      this.playerHeartbeats[evt.clientId] = Date.now();
    }

    if (evt.type === 'JOIN') {
      if (evt.clientId) {
        this.kickedAfkClientIds?.delete(evt.clientId);
      }
      // Tìm ghế theo đúng clientId của thiết bị đó (tuyệt đối không lấy ghế của Chủ phòng dù 2 máy đăng nhập cùng 1 tài khoản!)
      let seat = this.players.find((p) => p.clientId === evt.clientId);
      const isRejoin = !!seat && seat.active;
      if (!seat) {
        if (
          typeof evt.preferredSeatId === 'number' &&
          evt.preferredSeatId > 0 &&
          evt.preferredSeatId < 4 &&
          this.players[evt.preferredSeatId] &&
          !this.players[evt.preferredSeatId].active
        ) {
          seat = this.players[evt.preferredSeatId];
        } else {
          seat =
            this.players.find((p, idx) => idx > 0 && !p.active) ||
            this.players.find((p) => !p.active && p.id !== this.mySeatId);
        }
      }
      if (seat && seat.id !== this.mySeatId) {
        seat.name = evt.name || `Người chơi ${seat.id + 1}`;
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (evt.chopBurst) seat.chopBurst = evt.chopBurst;
        if (evt.winBurst) seat.winBurst = evt.winBurst;
        if (evt.activeChar) seat.activeChar = evt.activeChar;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        seat.accountUsername = evt.accountUsername || seat.accountUsername || '';
        seat.isBot = false;
        seat.active = true;
        if (!isRejoin) {
          seat.finishRank = null;
          seat.passed = false;
          seat.manualActionsInMatch = 0;
          seat.afkAutoTurns = 0;
        }
        seat.clientId = evt.clientId;
        if (!isRejoin) {
          sfx.win();
          this.addLog(`👋 <strong>${seat.name}</strong> đã vào bàn (Ghế #${seat.id + 1})!`, 'log-win');
        }
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
        this.publishRoomToDirectory(false);
      }
    } else if (evt.type === 'LEAVE') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (seat && seat.id !== this.mySeatId) {
        const leftName = seat.name;
        seat.active = false;
        seat.isBot = false;
        seat.name = `Ghế trống ${seat.id + 1}`;
        seat.clientId = null;
        seat.hand = [];
        seat.passed = true;
        this.addLog(`👋 <strong>${leftName}</strong> đã rời khỏi bàn.`, 'log-pass');
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
        this.publishRoomToDirectory(false);
      }
    } else if (evt.type === 'UPDATE_COSMETICS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId && p.id !== this.mySeatId);
      if (seat) {
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (evt.chopBurst) seat.chopBurst = evt.chopBurst;
        if (evt.winBurst) seat.winBurst = evt.winBurst;
        if (evt.activeChar) seat.activeChar = evt.activeChar;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'USE_CHAR_SKILL') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver) return;
      seat.manualActionsInMatch = (seat.manualActionsInMatch || 0) + 1;
      seat.afkAutoTurns = 0;
      if (evt.charId && CHARACTER_SKILLS[evt.charId]) {
        seat.activeChar = evt.charId;
        seat.chopBurst = evt.charId;
        seat.winBurst = evt.charId;
      }
      this.useCharacterSkill(seat, evt.selectedIds || []);
    } else if (evt.type === 'PLAY_CARDS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.isGameOver) return;
      if (evt.manual !== false) {
        seat.manualActionsInMatch = (seat.manualActionsInMatch || 0) + 1;
        seat.afkAutoTurns = 0;
      }
      const cardIdSet = new Set(evt.cardIds || []);
      const chosenCards = seat.hand.filter((c) => cardIdSet.has(c.id));
      const combo = classifyCombo(chosenCards);
      if (combo) {
        this.playCombo(seat, combo);
      }
    } else if (evt.type === 'PASS_TURN') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver || !this.currentCombo) return;
      if (evt.manual !== false) {
        seat.manualActionsInMatch = (seat.manualActionsInMatch || 0) + 1;
        seat.afkAutoTurns = 0;
      }
      this.passTurn(seat);
    }
  }

  applySyncedStateOnGuest(state) {
    if (!state) return;
    if (Array.isArray(state.kickedAfkClientIds) && state.kickedAfkClientIds.includes(this.myClientId)) {
      this.leaveWifiRoom(true, '💤 Bạn đã AFK (treo máy) suốt cả trận nên tự động rời bàn ở ván tiếp theo!');
      return;
    }

    if (typeof state.betPerCard === 'number' && state.betPerCard >= 20) {
      this.betPerCard = state.betPerCard;
      this.updateBetBadges();
    this.tighnariBonusByPlayer = {};
    }
    this.matchCount = typeof state.matchCount === 'number' ? state.matchCount : 0;
    this.currentTurn = state.currentTurn || 0;
    this.currentCombo = state.currentCombo || null;
    this.previousCombo = state.previousCombo || null;
    this.trickOwnerId = state.trickOwnerId;
    this.mustPlay3Spade = !!state.mustPlay3Spade;
    this.raidenElectroMarkOwnerId = state.raidenElectroMarkOwnerId ?? null;
    this.raidenSlashMustSingle = !!state.raidenSlashMustSingle;
    this.furinaReverseSuitRound = !!state.furinaReverseSuitRound;
    activeFurinaReverseSuit = this.furinaReverseSuitRound;
    this.yaeForcePlayRound = !!state.yaeForcePlayRound;
    this.clorindeDuelPair = state.clorindeDuelPair || null;
    this.ayakaFrozenPlayerId = state.ayakaFrozenPlayerId ?? null;
    this.hutaoTaxOwnerId = state.hutaoTaxOwnerId ?? null;
    this.eulaNextPlayBoost = !!state.eulaNextPlayBoost;
    this.naviaLockedTargetId = state.naviaLockedTargetId ?? null;
    this.naviaLockedCardIds = new Set(Array.isArray(state.naviaLockedCardIds) ? state.naviaLockedCardIds : []);
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = !!state.shenheSingleOnlyRound;
    activeShenheSingleOnly = this.shenheSingleOnlyRound;
    this.ganyuGapStraightTurn = !!state.ganyuGapStraightTurn;
    activeGanyuGapStraight = this.ganyuGapStraightTurn;
    this.kokomiReverseRankRound = !!state.kokomiReverseRankRound;
    activeKokomiReverseRank = this.kokomiReverseRankRound;
    this.yoimiyaBurnTrashReady = !!state.yoimiyaBurnTrashReady;
    this.turnDirection = state.turnDirection === -1 ? -1 : 1;
    this.mualaniCrossBeatTurn = !!state.mualaniCrossBeatTurn;
    activeMualaniCrossBeat = this.mualaniCrossBeatTurn;
    const wasGameOver = this.isGameOver;
    this.isGameOver = !!(state.isGameOver && this.matchCount >= 1);

    if (Array.isArray(state.players)) {
      this.players = state.players;
      // Chỉ khớp ghế của Khách theo đúng myClientId của thiết bị hiện tại (tránh khớp nhầm vào Ghế #1 của Chủ phòng khi 2 máy dùng chung 1 tài khoản!)
      const me = this.players.find((p) => p.clientId === this.myClientId);
      if (me) {
        this.mySeatId = me.id;
        if (Array.isArray(me.hand)) {
          const handIds = new Set(me.hand.map((c) => c.id));
          Array.from(this.selectedCardIds).forEach((id) => {
            if (!handIds.has(id)) this.selectedCardIds.delete(id);
          });
        }
        this.saveShopProfile();
      } else {
        const firstGuestSeat =
          (this.mySeatId > 0 && this.players[this.mySeatId] && !this.players[this.mySeatId].active
            ? this.players[this.mySeatId]
            : null) || this.players.find((p, idx) => idx > 0 && !p.active);
        if (firstGuestSeat) {
          this.mySeatId = firstGuestSeat.id;
          const myName =
            document.getElementById('input-player-name')?.value.trim() ||
            this.resolveCleanPlayerName(this.savedPlayerName, this.currentAccountUsername) ||
            'Bạn bè';
          firstGuestSeat.name = myName;
          firstGuestSeat.avatar = this.equippedAvatar;
          firstGuestSeat.cardSkin = this.equippedSkin;
          firstGuestSeat.chopBurst = this.equippedChopBurst;
          firstGuestSeat.winBurst = this.equippedWinBurst;
          firstGuestSeat.activeChar = this.equippedActiveChar || 'none';
          firstGuestSeat.coins = this.savedCoins;
          firstGuestSeat.isBot = false;
          firstGuestSeat.active = true;
          firstGuestSeat.clientId = this.myClientId;
          firstGuestSeat.accountUsername = this.currentAccountUsername || '';
          if (Date.now() - (this._lastJoinRetryMs || 0) > 2500) {
            this._lastJoinRetryMs = Date.now();
            this.sendClientEvent({
              id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              type: 'JOIN',
              clientId: this.myClientId,
              preferredSeatId: this.mySeatId,
              accountUsername: this.currentAccountUsername || '',
              name: myName,
              avatar: this.equippedAvatar,
              cardSkin: this.equippedSkin,
              chopBurst: this.equippedChopBurst,
              winBurst: this.equippedWinBurst,
              activeChar: this.equippedActiveChar || 'none',
              coins: this.savedCoins,
              sentAtMs: Date.now(),
            });
          }
        }
      }
    }

    if (Array.isArray(state.penaltyCardIds)) {
      this.penaltyCardIdsByPlayer = state.penaltyCardIds.map((arr) => new Set(arr));
    }

    if (state.firstTurnBadgeText) {
      this.elFirstTurnBadge.textContent = state.firstTurnBadgeText;
    }
    this.elMatchInfo.textContent = `Ván #${this.matchCount} • Phòng #${this.roomId} • Cược ${this.betPerCard.toLocaleString()} xu/lá`;

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

    if (this.matchCount >= 1 && state.lastBurstEffect && state.lastBurstEffect.id !== this.lastShownBurstId) {
      this.lastShownBurstId = state.lastBurstEffect.id;
      const burst = state.lastBurstEffect;
      const bId = burst.burstId || burst.type || 'none';
      if (!burst.isWin) {
        this.triggerGenshinBurst(bId, burst.detail, null, !!burst.lockGameplay);
      } else {
        sfx.win();
        const summarySnapshot = state.lastSummaryData;
        clearTimeout(this.endMatchDelayTimer);
        this.endMatchDelayTimer = setTimeout(() => {
          if (!this.isGameOver) return;
          this.triggerGenshinBurst(bId, burst.detail, () => {
            if (this.isGameOver && summarySnapshot) {
              this.showSummaryModal(
                summarySnapshot.coinChanges,
                summarySnapshot.detailsByPlayer,
                summarySnapshot.bannerTitle
              );
            }
          });
        }, 1350);
      }
    }

    if (this.isGameOver && this.matchCount >= 1 && state.lastSummaryData) {
      this.btnShowSummary.classList.remove('hidden');
      if (!wasGameOver) {
        this.incrementDailyQuest('play_matches', 1);
        if (this.players[this.mySeatId]?.finishRank === 1) {
          this.incrementDailyQuest('win_matches', 1);
        }
      }
      if (!wasGameOver && (!state.lastBurstEffect || !state.lastBurstEffect.isWin)) {
        sfx.win();
        const summarySnapshot = state.lastSummaryData;
        clearTimeout(this.endMatchDelayTimer);
        this.endMatchDelayTimer = setTimeout(() => {
          if (!this.isGameOver || !summarySnapshot) return;
          this.showSummaryModal(
            summarySnapshot.coinChanges,
            summarySnapshot.detailsByPlayer,
            summarySnapshot.bannerTitle
          );
        }, 1350);
      }
    } else if (!this.isGameOver) {
      clearTimeout(this.endMatchDelayTimer);
      this.modalSummary.classList.add('hidden');
      this.btnShowSummary.classList.add('hidden');
    }

    const me = this.players[this.mySeatId];
    if (me && me.hand && me.hand.length > 0 && !this.isGameOver && !this.modalWifi.classList.contains('hidden')) {
      document.getElementById('mode-setup-modal')?.classList.add('hidden');
      this.modalWifi.classList.add('hidden');
    }

    this.updateArenaBackdropCharacters();
    this.renderRoundSkillStatusBar();
    this.renderLobbyModal();
    this.renderAll();
    if (this.isGameOver) {
      this.stopTurnCountdown();
    } else {
      this.startTurnCountdown(false);
    }
  }

  renderLobbyModal() {
    this.renderBetTiers();
    const me = this.getLocalPlayer();
    const lobbyAvatar = document.getElementById('lobby-avatar-preview');
    if (lobbyAvatar) {
      lobbyAvatar.innerHTML = getAvatarHtml(this.equippedAvatar || 'default_player');
    }
    const lobbyBal = document.getElementById('lobby-balance-display');
    if (lobbyBal && me) {
      lobbyBal.textContent = me.coins.toLocaleString();
    }
    const grid = document.getElementById('lobby-seats-grid');
    if (!grid) return;

    const activePlayers = this.players.filter((p) => p.active);
    const countEl = document.getElementById('lobby-player-count');
    if (countEl) countEl.textContent = activePlayers.length;

    const startBtn = document.getElementById('btn-start-wifi-match');
    if (startBtn) {
      if (this.isHost && this.isMultiplayer) {
        startBtn.disabled = activePlayers.length < 2;
        startBtn.textContent =
          activePlayers.length >= 2
            ? `🃏 Bắt Đầu Chia Bài (Phòng #${this.roomId} • ${activePlayers.length} người • Cược ${this.betPerCard.toLocaleString()} Xu/lá)`
            : '⏳ Đang chờ ít nhất 2 người trong bàn...';
      } else if (this.isMultiplayer && !this.isHost) {
        startBtn.disabled = true;
        startBtn.textContent = `⏳ Chờ Chủ phòng bắt đầu (Phòng #${this.roomId} • Cược ${this.betPerCard.toLocaleString()} Xu/lá)...`;
      } else {
        startBtn.disabled = true;
        startBtn.textContent = 'Hãy bấm "➕ Tạo Phòng Mới" hoặc chọn 1 bàn trên Sảnh';
      }
    }

    grid.innerHTML = this.players
      .map((p, idx) => {
        const isMe = p.id === this.mySeatId && this.isMultiplayer;
        const isRoomHostSeat =
          this.isMultiplayer &&
          ((p.clientId && p.clientId === this.hostClientId) || (this.isHost && idx === this.mySeatId));
        let actionHtml = '';
        if (this.isHost && this.isMultiplayer && idx !== this.mySeatId) {
          if (!p.active) {
            actionHtml = `<button class="tool-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, true)">🤖 + Thêm Bot</button>`;
          } else {
            actionHtml = `<button class="clear-log-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, false)">✕ Bỏ ghế</button>`;
          }
        }

        const roleLabel = !p.active
          ? 'Ghế trống (Đang chờ người chơi vào...)'
          : isRoomHostSeat
          ? '👑 Chủ phòng'
          : p.isBot
          ? '🤖 Máy (Bot AI)'
          : '👤 Người chơi Online';

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
    if (!this.isHost || seatIdx < 0 || seatIdx > 3 || seatIdx === this.mySeatId) return;
    if (this.isMidMatch()) {
      alert('⛔ Ván bài đang diễn ra! Vui lòng hoàn thành ván hiện tại trước khi thêm/bỏ ghế.');
      return;
    }
    const p = this.players[seatIdx];
    if (addBot) {
      const botRoster = this.getBotBurstRoster();
      const usedSkins = new Set(this.players.map((pl) => pl.cardSkin));
      const available = botRoster.filter((c) => !usedSkins.has(c.id));
      const pick =
        available[Math.floor(Math.random() * available.length)] ||
        botRoster[seatIdx % botRoster.length];
      const shortName = pick.name.split('(')[0].trim();
      p.active = true;
      p.isBot = true;
      p.name = `Bot ${shortName} ${pick.crest}`;
      p.avatar = pick.id;
      p.cardSkin = pick.id;
      p.chopBurst = pick.id;
      p.winBurst = pick.id;
      p.activeChar = pick.id;
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

  showComboBanner(text, reactionClass = '') {
    this.elComboAnnouncement.textContent = text;
    this.elComboAnnouncement.classList.remove(
      'hidden',
      'reaction-vaporize',
      'reaction-melt',
      'reaction-overloaded',
      'reaction-electrocharged',
      'reaction-frozen',
      'reaction-superconduct',
      'reaction-crystallize',
      'reaction-aggravate',
      'reaction-burning',
      'reaction-bloom'
    );
    if (reactionClass) {
      this.elComboAnnouncement.classList.add(reactionClass);
    }
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

  kickFullMatchAfkPlayersBeforeNextMatch() {
    if (!this.isMultiplayer || !this.isHost) return false;
    if (!this.kickedAfkClientIds) this.kickedAfkClientIds = [];
    let kickedAny = false;
    this.players.forEach((p) => {
      if (!p.active || p.isBot) return;
      const isAfkWholeMatch =
        p.wasFullMatchAfk || ((p.manualActionsInMatch || 0) === 0 && (p.afkAutoTurns || 0) >= 1);
      if (!isAfkWholeMatch) return;
      if (p.id === this.mySeatId) {
        // Chủ phòng AFK cả trận -> tự rời bàn
        setTimeout(() => {
          if (this.isMultiplayer) {
            this.leaveWifiRoom(true, '💤 Bạn đã treo máy (AFK) suốt cả trận nên tự động rời bàn!');
          }
        }, 150);
        return;
      }
      if (p.clientId && !this.kickedAfkClientIds.includes(p.clientId)) {
        this.kickedAfkClientIds.push(p.clientId);
      }
      const oldName = p.name;
      p.active = false;
      p.isBot = false;
      p.name = `Ghế trống ${p.id + 1}`;
      p.clientId = null;
      p.hand = [];
      p.wasFullMatchAfk = false;
      p.manualActionsInMatch = 0;
      p.afkAutoTurns = 0;
      kickedAny = true;
      this.addLog(
        `💤 <strong>[Tự Động Rời Bàn Do AFK]</strong> <strong>${oldName}</strong> đã treo máy (AFK) suốt cả trận trước nên đã tự động bị mời rời bàn!`,
        'log-chop'
      );
    });
    if (kickedAny) {
      this.renderLobbyModal();
      this.publishRoomToDirectory();
      this.broadcastState();
    }
    return kickedAny;
  }

  startNewMatch(resetHistory = false) {
    clearTimeout(this.botTimer);
    clearTimeout(this.endMatchDelayTimer);
    clearTimeout(this.afkAutoLeaveTimer);
    this.modalSummary.classList.add('hidden');
    this.btnShowSummary.classList.add('hidden');

    if (this.isMultiplayer && this.isHost && !resetHistory) {
      this.kickFullMatchAfkPlayersBeforeNextMatch();
    }

    if (!this.isMultiplayer && this.queuedNextMatchBots) {
      this.applyQueuedNextMatchBots();
    } else {
      this.updateArenaBackdropCharacters();
    }

    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      this.elTurnBanner.textContent = '⏳ Cần tối thiểu 2 người chơi trong phòng để chia bài!';
      if (this.isMultiplayer) {
        this.inInitialLobby = true;
        this.modalWifi?.classList.remove('hidden');
        this.selectLobbyMode('human');
        this.renderLobbyModal();
        if (this.isHost) {
          this.publishRoomToDirectory();
          this.broadcastState();
        }
      }
      this.renderAll();
      return;
    }

    if (resetHistory) {
      this.matchCount = 1;
      this.lastWinnerId = null;
    } else {
      this.matchCount++;
    }

    const isFirstMatch = this.lastWinnerId === null || !this.players[this.lastWinnerId]?.active;
    const preventInstantWinOnBootOrFirstDeal = Boolean(this.inInitialLobby || resetHistory);
    let deck = shuffleDeck(createDeck());
    for (let attempt = 0; attempt < 25; attempt++) {
      let hasToiTrang = false;
      let offset = 0;
      for (const p of this.players) {
        if (!p.active) continue;
        const testHand = deck.slice(offset * 13, (offset + 1) * 13);
        offset++;
        if (preventInstantWinOnBootOrFirstDeal && checkToiTrang(testHand, isFirstMatch)) {
          hasToiTrang = true;
          break;
        }
      }
      if (!hasToiTrang) break;
      deck = shuffleDeck(createDeck());
    }

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
      p.declinedFourPairsCut = false;
      p.finishRank = null;
      p.skillUsed = false;
      p.manualActionsInMatch = 0;
      p.afkAutoTurns = 0;
      p.wasFullMatchAfk = false;
      p.activeChar = this.getPlayerActiveCharId(p);
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
    this.roundChoppableStack = [];

    // Trạng thái Kỹ Năng Nhân Vật trong vòng hiện tại
    this.raidenElectroMarkOwnerId = null;
    this.raidenSlashMustSingle = false;
    this.furinaReverseSuitRound = false;
    activeFurinaReverseSuit = false;
    this.yaeForcePlayRound = false;
    this.clorindeDuelPair = null;
    this.ayakaFrozenPlayerId = null;
    this.hutaoTaxOwnerId = null;
    this.eulaNextPlayBoost = false;
    this.mavuikaSelectingCard = false;
    this.yelanRevealedByPlayer = {};
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = false;
    activeShenheSingleOnly = false;
    this.ganyuGapStraightTurn = false;
    activeGanyuGapStraight = false;
    this.kokomiReverseRankRound = false;
    activeKokomiReverseRank = false;
    this.yoimiyaBurnTrashReady = false;
    this.columbinaExtraTurnReady = false;
    this.xiaoPlungeSingleTurn = false;
    activeXiaoPlungeSingle = false;
    this.kinichBombOwnerId = null;
    this.turnDirection = 1;
    this.mualaniCrossBeatTurn = false;
    activeMualaniCrossBeat = false;
    this.turnTimerComboSig = '';
    this.isGameOver = false;
    this.updateArenaBackdropCharacters();
    this.renderRoundSkillStatusBar();

    const b = this.betPerCard || 100;
    const tierMeta = this.getCurrentBetTierMeta(b);
    this.elGameLog.innerHTML = '';
    this.elMatchInfo.textContent = this.isMultiplayer
      ? `Ván #${this.matchCount} • Phòng ${this.roomId} (${activePlayers.length} người) • Cược ${b.toLocaleString()} xu/lá`
      : `Ván #${this.matchCount} • Bàn ${activePlayers.length} Người • ${tierMeta.name} (${b.toLocaleString()} xu/lá)`;

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

    // Khi mới mở trang web (đang ở Sảnh Chờ hoặc màn hình Tạo Tài Khoản, chưa bắt đầu chơi trận nào):
    // Tuyệt đối KHÔNG xét Tới Trắng và KHÔNG chạy lượt đánh ngầm phía sau!
    if (this.inInitialLobby) {
      this.stopTurnCountdown();
      return;
    }

    // Kiểm tra Tới Trắng (chỉ áp dụng từ Ván #2 trở đi sau khi người chơi đã thực sự chơi ít nhất 1 ván)
    if (!resetHistory) {
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
    }

    this.promptCurrentTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
  }

  handleToiTrang(winnerId, reason) {
    this.isGameOver = true;
    this.stopTurnCountdown();
    this.clearActiveMatchSnapshot();
    this.updateMidMatchLockUI();
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
    const winBurstId = this.getPlayerActiveCharId(winner);
    this.lastBurstEffect = { id: Date.now(), type: winBurstId, burstId: winBurstId, isWin: true, detail: burstDetail };
    this.incrementDailyQuest('play_matches', 1);
    if (winnerId === this.mySeatId) {
      this.incrementDailyQuest('win_matches', 1);
    }
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    clearTimeout(this.endMatchDelayTimer);
    this.endMatchDelayTimer = setTimeout(() => {
      if (!this.isGameOver) return;
      this.triggerGenshinBurst(winBurstId, burstDetail, () => {
        if (this.isGameOver) {
          this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
        }
      });
    }, 1350);
  }

  getComboChopValue(combo, b = this.betPerCard || 100) {
    if (!combo) return 0;
    if (combo.type === COMBO_TYPES.SINGLE && combo.highRank === 12) {
      return Math.round(b * (combo.highCard?.isRed ? 5 : 2.5));
    }
    if (combo.type === COMBO_TYPES.PAIR && combo.highRank === 12) {
      return Math.round(b * 10);
    }
    if (combo.type === COMBO_TYPES.THREE_PAIRS) {
      return Math.round(b * 7.5);
    }
    if (combo.type === COMBO_TYPES.FOUR_OF_A_KIND) {
      return Math.round(b * 10);
    }
    if (combo.type === COMBO_TYPES.FOUR_PAIRS) {
      return Math.round(b * 12.5);
    }
    return 0;
  }

  canPlayerCutWithFourPairs(player) {
    if (!player || !player.active || player.declinedFourPairsCut || !this.currentCombo || player.hand.length < 8) {
      return false;
    }
    const moves = getValidMoves(player.hand, this.currentCombo, false, true);
    return moves.length > 0;
  }

  getTurnStateSignature() {
    const comboKey = this.currentCombo
      ? `${this.currentCombo.type}_${this.currentCombo.highValue}_${this.currentCombo.cards.map((c) => c.id).join(',')}`
      : 'lead';
    const curHandLen = this.players[this.currentTurn]?.hand?.length || 0;
    return `${this.matchCount}:${this.currentTurn}:${this.trickOwnerId ?? 'none'}:${comboKey}:${curHandLen}`;
  }

  isTurnTimerPausedByModal() {
    if (this.inInitialLobby) return true;
    if (this.isBurstPlaying) return true;
    const burstOv = document.getElementById('genshin-burst-overlay');
    if (burstOv && !burstOv.classList.contains('hidden')) return true;
    const adOv = document.getElementById('rickroll-ad-overlay');
    if (adOv && !adOv.classList.contains('hidden')) return true;
    if (!this.isMultiplayer) {
      const modalIds = [
        'wifi-modal',
        'mode-setup-modal',
        'pause-modal',
        'shop-modal',
        'inventory-modal',
        'quests-modal',
        'rules-modal',
        'account-modal',
      ];
      for (const id of modalIds) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) return true;
      }
    }
    return false;
  }

  stopTurnCountdown() {
    if (this.turnCountdownInterval) {
      clearInterval(this.turnCountdownInterval);
      this.turnCountdownInterval = null;
    }
    document.getElementById('turn-timer-hud')?.classList.add('hidden');
    document.getElementById('top-turn-timer-pill')?.classList.add('hidden');
  }

  updateTurnTimerUI() {
    const hudEl = document.getElementById('turn-timer-hud');
    const secEl = document.getElementById('turn-timer-sec');
    const fillEl = document.getElementById('turn-timer-fill');
    const topPillEl = document.getElementById('top-turn-timer-pill');
    const topSecEl = document.getElementById('top-turn-timer-sec');

    if (this.isGameOver || this.inInitialLobby) {
      hudEl?.classList.add('hidden');
      topPillEl?.classList.add('hidden');
      return;
    }

    const limit = this.turnTimeLimitSec || 15;
    const rem = Math.max(0, Math.min(limit, this.turnRemainingSec ?? limit));
    const pct = Math.max(0, Math.min(100, Math.round((rem / limit) * 100)));
    const isUrgent = rem <= 5;
    const isMyTurn = this.currentTurn === this.mySeatId;

    if (hudEl) {
      hudEl.classList.remove('hidden');
      hudEl.classList.toggle('urgent', isUrgent);
      hudEl.classList.toggle('is-my-turn', isMyTurn);
    }
    if (secEl) {
      secEl.textContent = `${rem}s`;
    }
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
    }
    if (topPillEl) {
      topPillEl.classList.remove('hidden');
      topPillEl.classList.toggle('urgent', isUrgent);
      topPillEl.classList.toggle('is-my-turn', isMyTurn);
    }
    if (topSecEl) {
      topSecEl.textContent = `${rem}s`;
    }
  }

  startTurnCountdown(forceReset = false) {
    if (this.isGameOver || this.inInitialLobby) {
      this.stopTurnCountdown();
      return;
    }

    const sig = this.getTurnStateSignature();
    if (forceReset || sig !== this.turnTimerComboSig) {
      this.turnTimerComboSig = sig;
      this.turnRemainingSec = this.turnTimeLimitSec || 15;
    }

    this.updateTurnTimerUI();

    if (this.turnCountdownInterval) {
      clearInterval(this.turnCountdownInterval);
    }

    this.turnCountdownInterval = setInterval(() => {
      if (this.isGameOver || this.inInitialLobby) {
        this.stopTurnCountdown();
        return;
      }
      if (this.isTurnTimerPausedByModal()) {
        return;
      }
      this.turnRemainingSec = Math.max(0, (this.turnRemainingSec || 0) - 1);
      if (this.turnRemainingSec > 0 && this.turnRemainingSec <= 5 && this.currentTurn === this.mySeatId) {
        sfx.click();
      }
      this.updateTurnTimerUI();
      if (this.turnRemainingSec <= 0) {
        clearInterval(this.turnCountdownInterval);
        this.turnCountdownInterval = null;
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  handleTurnTimeout() {
    if (this.isGameOver || this.isBurstPlaying) return;
    this.mavuikaSelectingCard = false;
    const currentPlayer = this.players[this.currentTurn];
    if (!currentPlayer || !currentPlayer.active) return;

    // CHỐNG CHẠY 2 BÀN SONG SONG: Ở chế độ Multiplayer, Khách (Guest) KHÔNG TỰ ĐÁNH LOCAL khi hết 15s,
    // mà gửi tín hiệu GUEST_TIMEOUT lên Chủ phòng (Host) để Host là nguồn chân lý duy nhất đánh thay & đồng bộ cho cả bàn!
    if (this.isMultiplayer && !this.isHost) {
      if (this.currentTurn === this.mySeatId) {
        this.sendClientEvent({
          type: 'GUEST_TIMEOUT',
          clientId: this.myClientId,
        });
      }
      return;
    }

    if (this.currentTurn === this.mySeatId) {
      currentPlayer.afkAutoTurns = (currentPlayer.afkAutoTurns || 0) + 1;
      this.autoPlayForHuman(true);
    } else if (currentPlayer.isBot && (!this.isMultiplayer || this.isHost)) {
      this.executeBotTurn(currentPlayer);
    } else if (this.isMultiplayer && this.isHost && !currentPlayer.isBot) {
      // Nếu khách trong phòng Multiplayer treo máy quá 15s (cộng 0.6s trễ mạng), Chủ phòng tự động đánh thay để bàn không bị kẹt
      setTimeout(() => {
        if (!this.isGameOver && this.currentTurn === currentPlayer.id) {
          this.autoPlayForSeatOnHost(currentPlayer);
        }
      }, 600);
    }
  }

  autoPlayForSeatOnHost(seatPlayer) {
    if (this.isGameOver || !seatPlayer || !seatPlayer.active || this.currentTurn !== seatPlayer.id) return;
    seatPlayer.afkAutoTurns = (seatPlayer.afkAutoTurns || 0) + 1;
    const onlyFourPairs = seatPlayer.passed && this.canPlayerCutWithFourPairs(seatPlayer);
    const validMoves = getValidMoves(seatPlayer.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);
    if (validMoves.length > 0) {
      let chosen = null;
      try {
        chosen = !this.currentCombo
          ? this.chooseBotLeadMove(seatPlayer, validMoves)
          : this.chooseBotResponseMove(seatPlayer, validMoves) || validMoves[0];
      } catch (_) {}
      if (!chosen) chosen = validMoves[0];
      this.addLog(
        `⏰ <strong>[Hết 15s - AFK]</strong> Hệ thống tự động đánh <strong>${chosen.label}</strong> cho <strong>${seatPlayer.name}</strong>!`,
        'log-play'
      );
      this.playCombo(seatPlayer, chosen);
    } else if (this.currentCombo) {
      this.addLog(`⏰ <strong>[Hết 15s - AFK]</strong> Tự động bỏ lượt cho <strong>${seatPlayer.name}</strong>.`, 'log-pass');
      this.passTurn(seatPlayer);
    } else if (seatPlayer.hand.length > 0) {
      const fallback = classifyCombo([seatPlayer.hand[0]]);
      if (fallback) this.playCombo(seatPlayer, fallback);
    }
  }

  autoPlayForHuman(isAutoTimeout = true) {
    if (this.isGameOver || this.isBurstPlaying || this.currentTurn !== this.mySeatId) return;
    const human = this.getLocalPlayer();
    if (!human || !human.active || human.hand.length === 0) return;

    // 1. Nếu người chơi đang chọn sẵn 1 bộ bài hợp lệ trên tay thì tự động đánh bộ đang chọn đó ngay!
    const selectedCards = this.getSelectedCards();
    const selCombo = classifyCombo(selectedCards);
    const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
    if (
      selCombo &&
      (!onlyFourPairs || selCombo.type === COMBO_TYPES.FOUR_PAIRS) &&
      canBeatCombo(selCombo, this.currentCombo).ok
    ) {
      this.showComboBanner(`⏰ HẾT 15 GIÂY! TỰ ĐỘNG ĐÁNH: ${selCombo.label.toUpperCase()}`);
      this.addLog(
        `⏰ <strong>[Hết 15s suy nghĩ]</strong> Tự động đánh bộ bài đang chọn: <strong>${selCombo.label}</strong>!`,
        'log-play'
      );
      this.onHumanPlay(isAutoTimeout);
      return;
    }

    // 2. Tìm toàn bộ nước đi hợp lệ trên tay
    const validMoves = getValidMoves(human.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);
    if (validMoves.length > 0) {
      let chosenMove = null;
      try {
        if (!this.currentCombo) {
          chosenMove = this.chooseBotLeadMove(human, validMoves);
        } else {
          chosenMove = this.chooseBotResponseMove(human, validMoves) || validMoves[0];
        }
      } catch (_) {}
      if (!chosenMove) {
        validMoves.sort((a, b) => a.length - b.length || a.highValue - b.highValue);
        chosenMove = validMoves[0];
      }

      this.selectedCardIds = new Set(chosenMove.cards.map((c) => c.id));
      this.companionCardIds.clear();
      this.showComboBanner(`⏰ HẾT 15 GIÂY! TỰ ĐỘNG ĐÁNH: ${chosenMove.label.toUpperCase()}`);
      this.addLog(
        `⏰ <strong>[Hết 15s suy nghĩ]</strong> Hệ thống tự động chọn &amp; đánh <strong>${chosenMove.label}</strong>!`,
        'log-play'
      );
      this.onHumanPlay(isAutoTimeout);
      return;
    }

    // 3. Nếu đang đỡ bài và không có bộ nào chặn được (hoặc từ chối chặt 4 đôi thông) -> Tự động Bỏ lượt
    if (this.currentCombo) {
      this.showComboBanner('⏰ HẾT 15 GIÂY! TỰ ĐỘNG BỎ LƯỢT');
      this.addLog(
        '⏰ <strong>[Hết 15s suy nghĩ]</strong> Không có bộ bài chặn được ➔ Tự động <strong>Bỏ lượt</strong>.',
        'log-pass'
      );
      this.onHumanPass(isAutoTimeout);
      return;
    }

    // 4. Phòng hộ khi mở vòng mới: đánh lá nhỏ nhất trên tay
    const fallbackSingle = classifyCombo([human.hand[0]]);
    if (fallbackSingle) {
      this.selectedCardIds = new Set(fallbackSingle.cards.map((c) => c.id));
      this.companionCardIds.clear();
      this.onHumanPlay(isAutoTimeout);
    }
  }

  promptCurrentTurn() {
    clearTimeout(this.botTimer);
    if (this.isGameOver) {
      this.stopTurnCountdown();
      this.clearActiveMatchSnapshot();
      this.updateMidMatchLockUI();
      return;
    }

    const currentPlayer = this.players[this.currentTurn];
    if (!currentPlayer || !currentPlayer.active) {
      this.advanceTurn();
      return;
    }

    this.saveActiveMatchSnapshot();
    this.updateMidMatchLockUI();
    this.renderAll();
    this.startTurnCountdown(false);

    if (this.isMultiplayer && !this.isHost) {
      return;
    }

    if (this.isBurstPlaying) {
      return;
    }

    if (currentPlayer.isBot) {
      this.elTurnBanner.textContent = `⏳ Đang đợi ${currentPlayer.name} suy nghĩ...`;
      if (!this.isMultiplayer && this.isTurnTimerPausedByModal()) {
        // Nếu Sảnh Chờ hoặc Menu Tạm Dừng đang mở thì tự động kiểm tra lại sau 450ms để ngay khi đóng là Bot đánh liền!
        this.botTimer = setTimeout(() => this.promptCurrentTurn(), 450);
        return;
      }
      const turnPlayerId = currentPlayer.id;
      this.botTimer = setTimeout(() => {
        if (!this.isGameOver && this.currentTurn === turnPlayerId) {
          this.executeBotTurn(this.players[turnPlayerId]);
        }
      }, this.botDelay);
    } else if (currentPlayer.id === this.mySeatId) {
      if (!this.currentCombo) {
        this.elTurnBanner.textContent = '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ (15s).';
      } else if (currentPlayer.passed && this.canPlayerCutWithFourPairs(currentPlayer)) {
        this.elTurnBanner.textContent = '🔥 Bạn có 4 ĐÔI THÔNG! Có thể chặt không cần vòng hoặc Bỏ qua (15s).';
      } else {
        this.elTurnBanner.textContent = `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt (15s).`;
      }
      this.updateHumanActionButtons();
    } else {
      this.elTurnBanner.textContent = `⏳ Đang tới lượt của ${currentPlayer.name} (15s)...`;
    }
  }

  playCombo(player, combo) {
    if (this.isGameOver || this.isBurstPlaying || !player || !player.active || !combo) return false;
    const isFourPairsCutAnytime =
      combo.type === COMBO_TYPES.FOUR_PAIRS &&
      this.currentCombo &&
      this.trickOwnerId !== player.id &&
      canBeatCombo(combo, this.currentCombo).ok;
    if (this.currentTurn !== player.id && !isFourPairsCutAnytime) return false;
    this.currentTurn = player.id;
    this.raidenSlashMustSingle = false;
    const beatCheck = canBeatCombo(combo, this.currentCombo);
    if (!beatCheck.ok) return false;

    clearTimeout(this.botTimer);
    const playedIds = new Set(combo.cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !playedIds.has(c.id));

    // Reset các trạng thái Kỹ Năng chỉ có hiệu lực trong 1 lượt của người vừa đánh
    if (this.ganyuGapStraightTurn || this.mualaniCrossBeatTurn || this.xiaoPlungeSingleTurn) {
      this.ganyuGapStraightTurn = false;
      activeGanyuGapStraight = false;
      this.mualaniCrossBeatTurn = false;
      activeMualaniCrossBeat = false;
      this.xiaoPlungeSingleTurn = false;
      activeXiaoPlungeSingle = false;
      this.renderRoundSkillStatusBar();
    }

    // Bom Hẹn Giờ Ajaw của Kinich: Nếu đối thủ đánh đè lên bài của Kinich trong vòng này sẽ bị nổ bom nhận 1 lá bài rác nhỏ nhất từ tay Kinich!
    if (
      this.kinichBombOwnerId !== null &&
      this.currentCombo &&
      this.trickOwnerId === this.kinichBombOwnerId &&
      player.id !== this.kinichBombOwnerId &&
      player.hand.length >= 1
    ) {
      const kinichOwner = this.players[this.kinichBombOwnerId];
      this.kinichBombOwnerId = null;
      if (kinichOwner && kinichOwner.active && kinichOwner.finishRank === null && kinichOwner.hand.length >= 2) {
        const kStruct = this.analyzeBotHandStructure(kinichOwner.hand);
        const kSorted = sortCardsAsc(kinichOwner.hand);
        const bombTrash =
          kSorted.find(
            (c) =>
              c.rankIndex < 12 &&
              kStruct.rankCounts[c.rankIndex] === 1 &&
              !kStruct.bombRanks.has(c.rankIndex) &&
              !kStruct.criticalStraightRanks.has(c.rankIndex)
          ) ||
          kSorted.find((c) => c.rankIndex < 12) ||
          kSorted[0];
        if (bombTrash) {
          kinichOwner.hand = kinichOwner.hand.filter((c) => c.id !== bombTrash.id);
          player.hand.push(bombTrash);
          player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
          this.showComboBanner(`🎮💥 BOM AJAW NỔ! ${player.name.toUpperCase()} NHẬN THÊM 1 LÁ RÁC!`, 'reaction-burning');
          this.addLog(
            `🎮💥 <strong>[Bom Hẹn Giờ Ajaw]</strong> <strong>${player.name}</strong> đánh đè lên bài của <strong>${kinichOwner.name}</strong> nên kích nổ bom, bị nhét thêm lá rác <strong>${bombTrash.rank}${bombTrash.suit}</strong> vào tay!`,
            'log-chop'
          );
        }
      }
      this.renderRoundSkillStatusBar();
    }

    // Pháo Hoa Thiêu Rác của Yoimiya: Khi đánh Đôi, Sám Cô hoặc Sảnh sẽ tự động đốt kèm 1 lá bài lẻ nhỏ nhất trên tay
    if (this.yoimiyaBurnTrashReady) {
      this.yoimiyaBurnTrashReady = false;
      if (
        this.getPlayerActiveCharId(player) === 'yoimiya' &&
        combo.length >= 2 &&
        player.hand.length >= 1
      ) {
        const struct = this.analyzeBotHandStructure(player.hand);
        const sortedRem = sortCardsAsc(player.hand);
        const trashCard =
          sortedRem.find(
            (c) =>
              c.rankIndex < 12 &&
              struct.rankCounts[c.rankIndex] === 1 &&
              !struct.bombRanks.has(c.rankIndex) &&
              !struct.criticalStraightRanks.has(c.rankIndex)
          ) ||
          sortedRem.find((c) => c.rankIndex < 12) ||
          sortedRem[0];
        if (trashCard) {
          player.hand = player.hand.filter((c) => c.id !== trashCard.id);
          combo.label = `${combo.label} [🎆 Yoimiya đốt kèm ${trashCard.rank}${trashCard.suit}]`;
          this.addLog(
            `🎆 <strong>[Pháo Hoa Thiêu Rác]</strong> <strong>${player.name}</strong> đốt bỏ kèm lá rác <strong>${trashCard.rank}${trashCard.suit}</strong> bay theo bộ bài vừa đánh!`,
            'log-chop'
          );
        }
      }
      this.renderRoundSkillStatusBar();
    }

    // Cường hóa Kiếm Ánh Sáng của Eula (+2 bậc khi mở vòng mới)
    if (
      this.eulaNextPlayBoost &&
      this.getPlayerActiveCharId(player) === 'eula' &&
      combo.highRank < 12 &&
      !combo.isBomb
    ) {
      this.eulaNextPlayBoost = false;
      combo.highRank = Math.min(11, combo.highRank + 2);
      combo.highValue = combo.highRank * 4 + (combo.highCard?.suitIndex || 0);
      combo.label = `${combo.label} [❄️ Eula +2 bậc ➔ ${RANKS[combo.highRank]}]`;
      this.renderRoundSkillStatusBar();
    }

    // Bùa Vãng Sinh của Hu Tao: CHỈ ĐỐI THỦ (player.id !== this.hutaoTaxOwnerId) đánh bài trong vòng này mới bị trừ Thuế Vãng Sinh (2x cược)
    if (
      this.hutaoTaxOwnerId !== null &&
      player.id !== this.hutaoTaxOwnerId
    ) {
      const hutaoOwner = this.players[this.hutaoTaxOwnerId];
      if (hutaoOwner && hutaoOwner.active) {
        const tax = Math.round((this.betPerCard || 100) * 2);
        player.coins -= tax;
        hutaoOwner.coins += tax;
        this.matchChopCoins[player.id] -= tax;
        this.matchChopCoins[hutaoOwner.id] += tax;
        this.matchChopDetails[player.id].push({
          label: `🦋 Nộp Thuế Bùa Vãng Sinh cho ${hutaoOwner.name} (-${tax.toLocaleString()})`,
          isSpecial: true,
        });
        this.matchChopDetails[hutaoOwner.id].push({
          label: `🦋 Thu Thuế Bùa Vãng Sinh từ ${player.name} (+${tax.toLocaleString()})`,
          isGood: true,
        });
        this.addLog(
          `🦋 <strong>[Bùa Vãng Sinh]</strong> Đối thủ <strong>${player.name}</strong> đánh bài trong vòng bùa của <strong>${hutaoOwner.name}</strong> nên bị trừ <strong>-${tax.toLocaleString()} Xu</strong> nộp cho <strong>${hutaoOwner.name}</strong>!`,
          'log-chop'
        );
      }
    }

    // Nội Tại Cược của Tighnari (Dây Leo Sinh Trưởng): Mỗi khi đánh ra Sảnh (>= 4 lá) hoặc Sám Cô, tích ngay +0.5× cược (tối đa 3 lần/ván)
    if (
      this.getPlayerActiveCharId(player) === 'tighnari' &&
      (combo.type === COMBO_TYPES.TRIPLE || (combo.type === COMBO_TYPES.STRAIGHT && combo.length >= 4))
    ) {
      if (!this.tighnariBonusByPlayer) this.tighnariBonusByPlayer = {};
      const usedCnt = this.tighnariBonusByPlayer[player.id] || 0;
      if (usedCnt < 3) {
        this.tighnariBonusByPlayer[player.id] = usedCnt + 1;
        const tigBonus = Math.max(10, Math.round((this.betPerCard || 100) * 0.5));
        player.coins += tigBonus;
        this.matchChopCoins[player.id] += tigBonus;
        this.matchChopDetails[player.id].push({
          label: `🌿 Dây Leo Tighnari (${usedCnt + 1}/3): Đánh ${combo.label} (+${tigBonus.toLocaleString()})`,
          isGood: true,
        });
        this.addLog(
          `🌿 <strong>[Dây Leo Sinh Trưởng]</strong> <strong>${player.name}</strong> đánh <strong>${combo.label}</strong> nhận thưởng nội tại <strong>+${tigBonus.toLocaleString()} Xu</strong> (${usedCnt + 1}/3 lần)!`,
          'log-chop'
        );
      }
    }

    // Cập nhật tiến độ Nhiệm Vụ Hàng Ngày nếu người đánh là người chơi chính
    if (player.id === this.mySeatId) {
      if (combo.length >= 2) {
        this.incrementDailyQuest('play_combos', 1);
      }
      const twosPlayed = combo.cards.filter((c) => c.rankIndex === 12).length;
      const powerGain = twosPlayed + (beatCheck.isChop ? 1 : 0);
      if (powerGain > 0) {
        this.incrementDailyQuest('play_power', powerGain);
      }
    }

    if (
      beatCheck.isChop &&
      this.currentCombo &&
      this.trickOwnerId !== null &&
      this.trickOwnerId !== player.id
    ) {
      sfx.chop();
      const victim = this.players[this.trickOwnerId];
      const b = this.betPerCard || 100;
      const singleTargetVal = this.getComboChopValue(this.currentCombo, b) || Math.round(b * 7.5);

      if (!Array.isArray(this.roundChoppableStack) || this.roundChoppableStack.length === 0) {
        this.roundChoppableStack = [
          {
            playerId: victim.id,
            playerName: victim.name,
            label: this.currentCombo.label,
            value: singleTargetVal,
          },
        ];
      }

      // Cộng dồn toàn bộ các lớp Heo đè Heo / Đôi thông đè Đôi thông / Tứ quý đè Đôi thông trong vòng này!
      let totalChopValue = this.roundChoppableStack.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
      let chopPassiveNotes = [];
      if (this.getPlayerActiveCharId(player) === 'diluc') {
        const dilucBonus = Math.round(totalChopValue * 0.2);
        totalChopValue += dilucBonus;
        chopPassiveNotes.push(`🔥 Diluc +20% (+${dilucBonus.toLocaleString()})`);
      }
      if (this.getPlayerActiveCharId(victim) === 'jean') {
        const jeanShield = Math.round(totalChopValue * 0.25);
        totalChopValue = Math.max(b, totalChopValue - jeanShield);
        chopPassiveNotes.push(`🍃 Jean giảm 25% (-${jeanShield.toLocaleString()})`);
      }
      const isStackedChop = this.roundChoppableStack.length > 1;
      const stackedBreakdownStr = this.roundChoppableStack
        .map((it) => `${it.label} (${it.value.toLocaleString()})`)
        .join(' + ');
      const passiveSuffix = chopPassiveNotes.length > 0 ? ` [${chopPassiveNotes.join(' • ')}]` : '';
      const targetDisplayLabel = isStackedChop
        ? `${this.currentCombo.label} [Cộng dồn: ${stackedBreakdownStr}]${passiveSuffix}`
        : `${this.currentCombo.label}${passiveSuffix}`;

      if (this.lastChoppedPlayerId !== null && this.chopPot > 0) {
        const prevVictim = this.players[this.lastChoppedPlayerId];
        if (prevVictim) {
          prevVictim.coins += this.chopPot;
          victim.coins -= this.chopPot;
          this.matchChopCoins[prevVictim.id] += this.chopPot;
          this.matchChopCoins[victim.id] -= this.chopPot;
          this.matchChopDetails[prevVictim.id].push({
            label: `🔄 Thoát nạn nhờ ${player.name} chặt đè (+${this.chopPot.toLocaleString()})`,
            isGood: true,
          });
          this.matchChopDetails[victim.id].push({
            label: `💸 Hoàn trả tiền chặt trước cho ${prevVictim.name} do bị chặt đè (-${this.chopPot.toLocaleString()})`,
            isSpecial: true,
          });
        }
      }

      this.chopPot = totalChopValue;
      this.lastChoppedPlayerId = victim.id;

      victim.coins -= totalChopValue;
      player.coins += totalChopValue;
      this.matchChopCoins[victim.id] -= totalChopValue;
      this.matchChopCoins[player.id] += totalChopValue;
      this.matchChopDetails[victim.id].push({
        label: `💸 Bị ${player.name} ${isStackedChop ? 'chặt chồng ' : 'chặt '}${targetDisplayLabel} (-${totalChopValue.toLocaleString()})`,
        isSpecial: true,
      });
      this.matchChopDetails[player.id].push({
        label: `💥 ${isStackedChop ? 'Chặt chồng ' : 'Chặt '}${targetDisplayLabel} của ${victim.name} (+${totalChopValue.toLocaleString()})`,
        isGood: true,
      });

      const rx = this.getSpecialPlayReaction(player, combo);
      combo.reaction = rx;
      this.applyElementalReactionBonus(player, victim, rx);
      const chopTitleUpper = isStackedChop ? 'CHẶT CHỒNG' : 'CHẶT';
      const chopBurstDetail = `⚡ [${rx.shortName}] ${player.name} tung ${combo.label} ${chopTitleUpper.toLowerCase()} ${targetDisplayLabel} của ${victim.name} (+${totalChopValue.toLocaleString()} xu)!`;
      const chopBurstId = this.getPlayerActiveCharId(player);
      if (player.hand.length > 0) {
        this.lastBurstEffect = { id: Date.now(), type: chopBurstId, burstId: chopBurstId, isWin: false, detail: chopBurstDetail };
        this.triggerGenshinBurst(chopBurstId, chopBurstDetail);
      } else {
        this.triggerArenaReactionFlash(rx);
      }
      this.showComboBanner(`${rx.badge} • ${chopTitleUpper} +${totalChopValue.toLocaleString()} XU!`, rx.cssClass);
      this.addLog(
        `💥 <strong>[${rx.shortName}]</strong> <strong>${player.name}</strong> tung <strong>${combo.label}</strong> ${chopTitleUpper.toLowerCase()} <strong>${targetDisplayLabel}</strong> của <strong>${victim.name}</strong> (+${totalChopValue.toLocaleString()} xu)!`,
        'log-chop'
      );
      setTimeout(() => {
        this.saveShopProfile();
      }, 350);
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

      const prevPlayer =
        this.currentCombo && this.trickOwnerId !== null && this.trickOwnerId !== player.id
          ? this.players[this.trickOwnerId]
          : null;
      const hasElementalClash =
        prevPlayer &&
        checkGenuineGenshinReaction(
          this.getPlayerElement(player, combo),
          this.getPlayerElement(prevPlayer, this.currentCombo)
        );

      sfx.playCard(isUltra ? 'ultra' : isHeavy ? 'heavy' : 'normal');
      // CHỈ kích hoạt Phản Ứng Nguyên Tố khi KHÔNG phải người đánh đầu tiên trong vòng (có prevPlayer trên bàn) VÀ đánh bài TO (isHeavy)
      if (isHeavy && prevPlayer) {
        const rx = this.getSpecialPlayReaction(player, combo);
        combo.reaction = rx;
        this.triggerArenaReactionFlash(rx);
        const rxBonus = hasElementalClash ? this.applyElementalReactionBonus(player, prevPlayer, rx) : 0;
        const bonusTag = rxBonus > 0 ? ` (+${rxBonus.toLocaleString()} XU ×5)` : '';
        this.showComboBanner(`${rx.badge}${bonusTag} • ${combo.label.toUpperCase()}!`, rx.cssClass);
        this.addLog(
          `<strong>[${rx.shortName}]</strong> <strong>${player.name}</strong> đánh <strong>${combo.label}</strong> (${combo.cards
            .map((c) => `${c.rank}${c.suit}`)
            .join(' ')})`,
          'log-play'
        );
      } else {
        if (isHeavy) {
          this.showComboBanner(`🔥 ${combo.label.toUpperCase()}!`, 'chop-banner');
        }
        this.addLog(
          `<strong>${player.name}</strong> đánh <strong>${combo.label}</strong> (${combo.cards
            .map((c) => `${c.rank}${c.suit}`)
            .join(' ')})`,
          'log-play'
        );
      }
    }

    // Lưu mọi bộ bài có giá trị chặt (Heo lẻ, Đôi Heo, 3 Đôi Thông, Tứ Quý, 4 Đôi Thông) vào nồi cộng dồn của vòng hiện tại!
    const playedChopVal = this.getComboChopValue(combo, this.betPerCard || 100);
    if (playedChopVal > 0) {
      if (!Array.isArray(this.roundChoppableStack)) {
        this.roundChoppableStack = [];
      }
      this.roundChoppableStack.push({
        playerId: player.id,
        playerName: player.name,
        label: combo.label,
        value: playedChopVal,
      });
      if (!beatCheck.isChop && this.roundChoppableStack.length > 1) {
        const potNow = this.roundChoppableStack.reduce((s, it) => s + (Number(it.value) || 0), 0);
        const stackText = this.roundChoppableStack.map((it) => `${it.label} (${it.value.toLocaleString()})`).join(' + ');
        this.addLog(
          `🔥 <strong>[Cộng Dồn Nồi Heo]</strong> <strong>${player.name}</strong> đè <strong>${combo.label}</strong>! Nếu bị chặt sẽ đền tổng nồi <strong>${potNow.toLocaleString()} xu</strong> [${stackText}]!`,
          'log-chop'
        );
      }
    }

    combo.ownerSkin = player.cardSkin || 'classic';
    combo.wasChop = !!beatCheck.isChop;
    this.previousCombo = this.currentCombo;
    this.currentCombo = combo;
    this.trickOwnerId = player.id;
    this.currentTurn = player.id;
    this.mustPlay3Spade = false;
    this.hintIndex = 0;
    this.turnTimerComboSig = '';
    player.passed = false;
    this.players.forEach((p) => {
      p.declinedFourPairsCut = false;
    });

    // Kiểm tra người chơi vừa hết bài -> NHẤT ĂN TẤT (WIN LUÔN)
    if (player.hand.length === 0) {
      player.finishRank = 1;
      this.players.forEach((p) => {
        if (p.active && p.id !== player.id) p.finishRank = 2;
      });
      // Chỉ tính ĐÚT 3 BÍCH khi đánh RIÊNG lẻ 1 con 3♠ ở nước cuối cùng!
      const wonBy3Spade =
        combo.type === COMBO_TYPES.SINGLE && combo.cards.length === 1 && combo.cards[0].value === 0;
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

    // Khúc Ca Thiên Thần của Columbina: Đánh bồi thêm 1 bộ bài nữa ngay lập tức trước khi chuyển lượt!
    if (this.columbinaExtraTurnReady && this.getPlayerActiveCharId(player) === 'columbina') {
      this.columbinaExtraTurnReady = false;
      this.previousCombo = this.currentCombo;
      this.currentCombo = null;
      this.trickOwnerId = player.id;
      this.currentTurn = player.id;
      this.turnTimerComboSig = '';
      this.players.forEach((p) => {
        if (p.active && p.finishRank === null) {
          p.passed = false;
          p.declinedFourPairsCut = false;
        }
      });
      this.showComboBanner(`🕊️ KHÚC CA THIÊN THẦN: ${player.name.toUpperCase()} ĐÁNH TIẾP LƯỢT 2 NGAY LẬP TỨC!`, 'reaction-electro-charged');
      this.addLog(
        `🕊️ <strong>[Khúc Ca Thiên Thần]</strong> <strong>${player.name}</strong> được đánh bồi thêm <strong>1 bộ bài nữa ngay lập tức</strong> trước khi chuyển lượt!`,
        'log-win'
      );
      this.renderRoundSkillStatusBar();
      this.promptCurrentTurn();
      if (this.isMultiplayer && this.isHost) {
        this.broadcastState();
      }
      return true;
    }

    this.advanceTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    return true;
  }

  passTurn(player) {
    if (this.isGameOver || !player || !player.active || this.currentTurn !== player.id || !this.currentCombo) {
      return;
    }
    // Hồ Ly Dụ Hoặc của Yae Miko: Nếu còn bài hợp lệ chặn được thì cấm Bỏ lượt giấu bài!
    if (this.yaeForcePlayRound && !player.passed) {
      const validMoves = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false);
      if (validMoves.length > 0) {
        if (player.isBot) {
          this.playCombo(player, validMoves[0]);
          return;
        }
        this.showComboBanner('🌸 HỒ LY DỤ HOẶC: CÒN BÀI CHẶN ĐƯỢC KHÔNG ĐƯỢC BỎ LƯỢT!', 'reaction-overloaded');
        return;
      }
    }

    clearTimeout(this.botTimer);
    sfx.pass();
    if (this.ganyuGapStraightTurn || this.mualaniCrossBeatTurn || this.xiaoPlungeSingleTurn || this.yoimiyaBurnTrashReady || this.columbinaExtraTurnReady) {
      this.ganyuGapStraightTurn = false;
      activeGanyuGapStraight = false;
      this.mualaniCrossBeatTurn = false;
      activeMualaniCrossBeat = false;
      this.xiaoPlungeSingleTurn = false;
      activeXiaoPlungeSingle = false;
      this.yoimiyaBurnTrashReady = false;
      this.columbinaExtraTurnReady = false;
      this.renderRoundSkillStatusBar();
    }
    if (player.passed) {
      player.declinedFourPairsCut = true;
    }
    player.passed = true;
    this.turnTimerComboSig = '';
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

    const dir = this.turnDirection === -1 ? -1 : 1;
    for (let step = 1; step <= 4; step++) {
      const nextId = (this.currentTurn + step * dir + 16) % 4;
      if (nextId === this.trickOwnerId) continue;
      const nextPlayer = this.players[nextId];
      if (!nextPlayer.active || nextPlayer.finishRank !== null) continue;
      if (!nextPlayer.passed || this.canPlayerCutWithFourPairs(nextPlayer)) {
        // Sương Hoa Phong Ấn của Ayaka: đóng băng mất 1 lượt trong vòng hiện tại
        // (Ở bàn 2 người: chỉ kích hoạt đóng băng nếu bộ bài trên bàn từ 10 trở xuống để không khóa trắng Heo/Át)
        if (nextId === this.ayakaFrozenPlayerId) {
          const activeCount = this.getActivePlayers().length;
          const allowFreeze =
            activeCount >= 3 || !this.currentCombo || this.currentCombo.highRank <= 9;
          this.ayakaFrozenPlayerId = null;
          if (allowFreeze) {
            nextPlayer.passed = true;
            this.showComboBanner(`❄️ ${nextPlayer.name.toUpperCase()} BỊ ĐÓNG BĂNG MẤT LƯỢT!`, 'reaction-superconduct');
            this.addLog(
              `❄️ <strong>[Sương Hoa Phong Ấn]</strong> <strong>${nextPlayer.name}</strong> bị đóng băng nên mất lượt đỡ bài trong vòng này!`,
              'log-chop'
            );
            this.renderRoundSkillStatusBar();
            continue;
          }
        }
        this.currentTurn = nextId;
        this.promptCurrentTurn();
        return;
      }
    }

    this.startNewRoundAfterAllPass();
  }

  startNewRoundAfterAllPass() {
    this.players.forEach((p) => {
      p.passed = false;
      p.declinedFourPairsCut = false;
    });
    this.currentCombo = null;
    this.previousCombo = null;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;
    this.roundChoppableStack = [];

    // Trạng thái Kỹ Năng Nhân Vật trong vòng hiện tại
    this.raidenElectroMarkOwnerId = null;
    this.raidenSlashMustSingle = false;
    this.furinaReverseSuitRound = false;
    activeFurinaReverseSuit = false;
    this.yaeForcePlayRound = false;
    this.clorindeDuelPair = null;
    this.ayakaFrozenPlayerId = null;
    this.hutaoTaxOwnerId = null;
    this.eulaNextPlayBoost = false;
    this.mavuikaSelectingCard = false;
    this.yelanRevealedByPlayer = {};
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = false;
    activeShenheSingleOnly = false;
    this.ganyuGapStraightTurn = false;
    activeGanyuGapStraight = false;
    this.kokomiReverseRankRound = false;
    activeKokomiReverseRank = false;
    this.yoimiyaBurnTrashReady = false;
    this.columbinaExtraTurnReady = false;
    this.xiaoPlungeSingleTurn = false;
    activeXiaoPlungeSingle = false;
    this.kinichBombOwnerId = null;
    this.mualaniCrossBeatTurn = false;
    activeMualaniCrossBeat = false;
    this.renderRoundSkillStatusBar();

    let leaderId = this.trickOwnerId;
    const owner = leaderId !== null ? this.players[leaderId] : null;

    if (!owner || !owner.active || owner.finishRank !== null) {
      const startFrom = leaderId !== null ? leaderId : this.currentTurn;
      const dir = this.turnDirection === -1 ? -1 : 1;
      for (let step = 1; step <= 4; step++) {
        const candidateId = (startFrom + step * dir + 16) % 4;
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
    this.turnTimerComboSig = '';
    this.promptCurrentTurn();
  }

  // ============================================================================
  // BOT AI DECISION ENGINE (GIỮ HÀNG TỨ QUÝ / ĐÔI THÔNG & ĐÁNH LẺ DỤ HEO!)
  // ============================================================================
  executeBotTurn(bot) {
    if (this.isGameOver || this.isBurstPlaying || !bot || !bot.active || this.currentTurn !== bot.id) return;

    const onlyFourPairs = bot.passed && this.canPlayerCutWithFourPairs(bot);
    let validMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);

    // Bot tự động cân nhắc kích hoạt Kỹ Năng Nhân Vật chiến thuật (1 lần/ván)
    // Nếu Bot kích hoạt Kỹ Năng [E], dừng lại đợi hết hoạt ảnh Kỹ Năng Nộ rồi mới đánh bài!
    if (!onlyFourPairs) {
      let usedSkill = false;
      try {
        usedSkill = this.maybeBotUseSkill(bot, validMoves);
      } catch (err) {
        console.warn('Bot skill check error:', err);
      }
      if (usedSkill) {
        return;
      }
    }

    if (validMoves.length === 0) {
      if (this.currentCombo) {
        this.passTurn(bot);
      } else if (bot.hand.length > 0) {
        // Phòng hộ tuyệt đối khi mở vòng mới: luôn đánh lá nhỏ nhất nếu bộ lọc trả rỗng
        const fallbackSingle = classifyCombo([bot.hand[0]]);
        if (fallbackSingle) this.playCombo(bot, fallbackSingle);
      }
      return;
    }

    if (!this.currentCombo) {
      let chosen = null;
      try {
        chosen = this.chooseBotLeadMove(bot, validMoves);
      } catch (_) {}
      if (!chosen) chosen = validMoves[0];
      this.playCombo(bot, chosen);
      return;
    }

    let chosen = null;
    try {
      chosen = this.chooseBotResponseMove(bot, validMoves);
    } catch (_) {}
    // Nếu đang trúng Hồ Ly Dụ Hoặc của Yae Miko thì bắt buộc phải đánh lá hợp lệ nhỏ nhất
    if (!chosen && this.yaeForcePlayRound && validMoves.length > 0) {
      chosen = validMoves[0];
    }
    if (chosen) {
      this.playCombo(bot, chosen);
    } else {
      this.passTurn(bot);
    }
  }

  // ============================================================================
  // SMART HAND-STRUCTURE ANALYZER FOR BOT AI (KHÔNG XÉ LẺ ĐÔI / SẢNH / HÀNG)
  // ============================================================================
  analyzeBotHandStructure(hand) {
    const rankCounts = new Array(13).fill(0);
    hand.forEach((c) => rankCounts[c.rankIndex]++);

    // 1. Nhận diện các quân nằm trong HÀNG (Tứ Quý hoặc 3-4 Đôi Thông) cần bảo vệ tuyệt đối
    const bombRanks = new Set();
    for (let r = 0; r < 13; r++) {
      if (rankCounts[r] === 4) bombRanks.add(r);
    }
    let pairStreak = [];
    for (let r = 0; r <= 11; r++) {
      if (rankCounts[r] >= 2) {
        pairStreak.push(r);
      } else {
        if (pairStreak.length >= 3) pairStreak.forEach((pr) => bombRanks.add(pr));
        pairStreak = [];
      }
    }
    if (pairStreak.length >= 3) pairStreak.forEach((pr) => bombRanks.add(pr));

    // 2. Nhận diện các mắt xích SẢNH (3..A): nếu rút hết quân ở rank này làm đứt chuỗi >= 3 lá
    const criticalStraightRanks = new Set();
    let run = [];
    const flushRun = (seq) => {
      if (seq.length < 3) return;
      seq.forEach((r, idx) => {
        const leftLen = idx;
        const rightLen = seq.length - 1 - idx;
        // Nếu bỏ mắt xích r mà phần bên trái hoặc bên phải bị cụt (< 3 lá) -> làm gãy sảnh!
        if ((leftLen > 0 && leftLen < 3) || (rightLen > 0 && rightLen < 3) || seq.length === 3) {
          criticalStraightRanks.add(r);
        }
      });
    };
    for (let r = 0; r <= 11; r++) {
      if (rankCounts[r] >= 1) {
        run.push(r);
      } else {
        flushRun(run);
        run = [];
      }
    }
    flushRun(run);

    const comboCardIds = new Set();
    hand.forEach((c) => {
      if (rankCounts[c.rankIndex] >= 2 || bombRanks.has(c.rankIndex) || criticalStraightRanks.has(c.rankIndex)) {
        comboCardIds.add(c.id);
      }
    });

    return { rankCounts, bombRanks, criticalStraightRanks, comboCardIds };
  }

  evaluateMoveBreakCost(move, struct) {
    const { rankCounts, bombRanks, criticalStraightRanks } = struct;
    let breakCost = 0;

    // 1. Nếu nước đi KHÔNG phải là tung Hàng (Bom) mà lại lấy bài trong Tứ Quý / 3-4 Đôi Thông -> Phạt cực nặng!
    if (!move.isBomb) {
      const touchesBomb = move.cards.some((c) => bombRanks.has(c.rankIndex));
      if (touchesBomb) {
        breakCost += 480;
      }
    }

    // 2. Nếu đánh LẺ (SINGLE): kiểm tra xem có đang xé Đôi, xé Sám Cô hay rút gãy Sảnh không
    if (move.type === COMBO_TYPES.SINGLE) {
      const r = move.cards[0].rankIndex;
      if (rankCounts[r] === 2) {
        // Xé Đôi ra đánh lẻ (trừ Đôi Heo khi cần thiết vẫn hạn chế xé)
        breakCost += r === 12 ? 65 : 125;
      } else if (rankCounts[r] === 3) {
        // Xé Sám Cô ra đánh lẻ
        breakCost += 140;
      }
      // Nếu chỉ có đúng 1 lá ở rank này và nó là mắt xích sống còn của Sảnh -> Xé Sảnh!
      if (rankCounts[r] === 1 && criticalStraightRanks.has(r)) {
        breakCost += 135;
      }
    }

    // 3. Nếu đánh ĐÔI (PAIR): kiểm tra xem có làm gãy Sám Cô hoặc làm đứt Sảnh không
    else if (move.type === COMBO_TYPES.PAIR) {
      const r = move.cards[0].rankIndex;
      if (rankCounts[r] === 3) {
        breakCost += 95;
      }
      if (rankCounts[r] === 2 && criticalStraightRanks.has(r)) {
        breakCost += 110;
      }
    }

    // 4. Nếu đánh SẢNH (STRAIGHT): kiểm tra xem sảnh này có phá nát nhiều Đôi/Sám trên tay không
    else if (move.type === COMBO_TYPES.STRAIGHT) {
      let brokenPairs = 0;
      move.cards.forEach((c) => {
        const r = c.rankIndex;
        if (rankCounts[r] === 2) brokenPairs++;
        else if (rankCounts[r] === 3) brokenPairs += 1.5;
      });
      // Nếu sảnh ngắn (3-4 lá) mà lại phá từ 2 Đôi trở lên thì lỗ bộ
      if (brokenPairs >= 2 && move.length <= 4) {
        breakCost += brokenPairs * 55;
      } else if (brokenPairs === 1 && move.length === 3) {
        breakCost += 35;
      }
    }

    return breakCost;
  }

  // ============================================================================
  // ĐỌC TÌNH HÌNH BÀN BÀI & CHIẾN THUẬT GIỮ HÀNG DỤ HEO CHO BOT AI
  // ============================================================================
  analyzeBotTableSituation(bot, struct) {
    const activeOpponents = this.players.filter(
      (p) => p.active && p.id !== bot.id && p.finishRank === null
    );
    const minOpponentCards =
      activeOpponents.length > 0
        ? Math.min(...activeOpponents.map((p) => p.hand.length))
        : 13;
    const owner = this.trickOwnerId !== null ? this.players[this.trickOwnerId] : null;
    const ownerCards = owner && owner.id !== bot.id ? owner.hand.length : 13;
    const cardDeficit = bot.hand.length - minOpponentCards;

    const hasTwos = bot.hand.some((c) => c.rankIndex === 12);
    const has3Spade = bot.hand.some((c) => c.value === 0);
    const hasBombs = struct.bombRanks.size > 0;
    const hasQuadOrFourPairs =
      struct.rankCounts.some((cnt, r) => r < 12 && cnt === 4) ||
      (() => {
        let streak = 0;
        for (let r = 0; r <= 11; r++) {
          if (struct.rankCounts[r] >= 2) {
            streak++;
            if (streak >= 4) return true;
          } else {
            streak = 0;
          }
        }
        return false;
      })();

    // Đếm số Heo (quân 2) còn nằm trên tay các đối thủ (chưa đánh ra bàn)
    let opponentTwosCount = 0;
    let opponentHasPairOfTwos = false;
    activeOpponents.forEach((p) => {
      const twos = p.hand.filter((c) => c.rankIndex === 12).length;
      opponentTwosCount += twos;
      if (twos >= 2) opponentHasPairOfTwos = true;
    });

    // CHIẾN THUẬT RÌNH CHẶT HEO (GIỮ HÀNG & ĐÁNH LẺ DỤ HEO):
    // Nếu Bot đang có Hàng (Tứ Quý / 3-4 Đôi Thông) VÀ đối thủ vẫn còn giữ Heo trên tay:
    // -> TUYỆT ĐỐI KHÔNG tự đánh Hàng ra bàn trống và KHÔNG xé Hàng! Phải đánh lẻ (hoặc đôi) để dụ đối thủ ra Heo!
    const shouldHoldBombToBaitHeo = hasBombs && opponentTwosCount > 0;

    // 1. Nguy cơ bị CÓNG (Còn nguyên 13 lá phạt gấp đôi 26x + thối toàn bộ Heo/Hàng):
    const isCongRisk = bot.hand.length === 13 && minOpponentCards <= 10;

    // 2. Nguy cơ THỐI HEO / THỐI 3♠ khi đối thủ đã xuống <= 7 lá (hoặc Thối Hàng CHỈ KHI đối thủ đã hết sạch Heo):
    const bombRotDanger = hasBombs && opponentTwosCount === 0 && minOpponentCards <= 5;
    const hasRotDanger =
      ((hasTwos || has3Spade) && minOpponentCards <= 7) || bombRotDanger;

    // 3. Thấy mình SẮP THUA (Đối thủ còn <= 6 lá, hoặc người cầm cái còn <= 7 lá, hoặc mình tụt lại >= 5 lá):
    // Lúc này phải xé Đôi / Sảnh thường ra đánh, NHƯNG nếu đang có Hàng chờ chặt Heo thì vẫn giữ nguyên Hàng!
    const isLosingSoon =
      isCongRisk ||
      hasRotDanger ||
      minOpponentCards <= 6 ||
      ownerCards <= 7 ||
      cardDeficit >= 5;

    // 4. Báo động đỏ TỬ CHIẾN (Đối thủ còn <= 4 lá hoặc người cầm cái còn <= 4 lá):
    const isCriticalEndgame =
      minOpponentCards <= 4 ||
      ownerCards <= 4 ||
      (isCongRisk && minOpponentCards <= 8);

    return {
      minOpponentCards,
      ownerCards,
      cardDeficit,
      hasTwos,
      has3Spade,
      hasBombs,
      hasQuadOrFourPairs,
      opponentTwosCount,
      opponentHasPairOfTwos,
      shouldHoldBombToBaitHeo,
      isCongRisk,
      hasRotDanger,
      isLosingSoon,
      isCriticalEndgame,
    };
  }

  chooseBotLeadMove(bot, validMoves) {
    // 1. Nếu có bộ đánh 1 phát hết sạch bài trên tay luôn (hoặc Yoimiya đang bật Pháo Hoa đốt nốt lá cuối) -> Đánh thắng ngay!
    const isYoimiyaBurnActive =
      this.yoimiyaBurnTrashReady && this.getPlayerActiveCharId(bot) === 'yoimiya';
    const instantWin = validMoves.find(
      (m) =>
        m.length === bot.hand.length ||
        (isYoimiyaBurnActive && m.length >= 2 && m.length === bot.hand.length - 1)
    );
    if (instantWin) return instantWin;

    const struct = this.analyzeBotHandStructure(bot.hand);
    const sit = this.analyzeBotTableSituation(bot, struct);

    // 2. NGUYÊN TẮC VÀNG KHI CẦM HÀNG (TỨ QUÝ / 3-4 ĐÔI THÔNG):
    // - Nếu đối thủ VẪN CÒN HEO (sit.opponentTwosCount > 0): TUYỆT ĐỐI KHÔNG đánh Tứ Quý / Đôi Thông ra bàn trống!
    //   Và TUYỆT ĐỐI KHÔNG xé lẻ quân trong Tứ Quý / Đôi Thông! Phải giữ nguyên Hàng và đánh LẺ để DỤ HEO đối thủ!
    // - Chỉ khi toàn bộ 4 quân Heo đã ra hết (sit.opponentTwosCount === 0) và sắp hết ván (minOpponentCards <= 4)
    //   thì mới xả Hàng ra bàn để chạy lá tránh Thối Hàng!
    const allowLeadBomb =
      sit.opponentTwosCount === 0 && (sit.minOpponentCards <= 4 || bot.hand.length <= 5);

    const safeNonBombMoves = validMoves.filter((m) => {
      if (m.isBomb) return false;
      const touchesBomb = m.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      return !touchesBomb;
    });
    const nonBombMoves = validMoves.filter((m) => !m.isBomb);

    let pool = validMoves;
    if (!allowLeadBomb) {
      if (safeNonBombMoves.length > 0) {
        pool = safeNonBombMoves;
      } else if (nonBombMoves.length > 0) {
        pool = nonBombMoves;
      }
    }

    // Hệ số bảo vệ bộ thường (Đôi / Sảnh) khi cầm cái:
    const breakWeight = sit.isCriticalEndgame ? 0.25 : sit.isLosingSoon ? 0.55 : 1.25;

    const scored = pool.map((move) => {
      let score = 0;
      const breakCost = this.evaluateMoveBreakCost(move, struct);
      const touchesBomb = !move.isBomb && move.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      const contains3Spade = move.cards.some((c) => c.value === 0);
      const twosCount = move.cards.filter((c) => c.rankIndex === 12).length;
      const effHighValue =
        activeKokomiReverseRank && move.highRank < 12
          ? (11 - move.highRank) * 4 + (move.highCard?.suitIndex || 0)
          : move.highValue;

      // Bảo vệ tuyệt đối Tứ Quý / Đôi Thông không bao giờ bị xé khi mở vòng
      if (touchesBomb) {
        score -= 2500;
      } else {
        score -= breakCost * breakWeight;
      }

      // Ưu tiên tuyệt đối nước đi phát huy Kỹ Năng vừa bật trong lượt này (Ganyu Sảnh Khuyết / Yoimiya Pháo Hoa Thiêu Rác)
      if (this.ganyuGapStraightTurn && move.isGapStraight && !touchesBomb) {
        score += 340;
      }
      if (isYoimiyaBurnActive && move.length >= 2 && !touchesBomb) {
        score += 190;
      }

      // CHIẾN THUẬT ĐÁNH LẺ DỤ HEO KHI ĐANG ÔM TỨ QUÝ / ĐÔI THÔNG:
      if (sit.shouldHoldBombToBaitHeo && !touchesBomb && !move.isBomb) {
        if (move.type === COMBO_TYPES.SINGLE && move.highRank < 12) {
          // Ưu tiên số 1: Đánh bài LẺ (nhất là các quân tầm trung-khá 7..A) để ép đối thủ phải tung Heo (2) ra đỡ!
          score += 95;
          if (move.highRank >= 4 && move.highRank <= 11) {
            score += 32 + move.highRank * 3.5; // Quân lẻ mồi câu áp lực cao buộc đối thủ ra Heo!
          }
        } else if (
          move.type === COMBO_TYPES.PAIR &&
          move.highRank < 12 &&
          sit.hasQuadOrFourPairs &&
          sit.opponentHasPairOfTwos
        ) {
          // Nếu cầm Tứ Quý / 4 Đôi Thông và đối thủ có Đôi Heo: có thể đánh Đôi mồi câu Đôi Heo!
          score += 75;
        }
      }

      // Ưu tiên đánh các bộ xả được nhiều lá cùng lúc (khi không bận câu Heo)
      if (move.isBomb && allowLeadBomb) {
        score += 95 + move.length * 12; // Chỉ xả Hàng khi đối thủ đã hết sạch Heo!
      } else if (move.type === COMBO_TYPES.STRAIGHT) {
        score += (sit.shouldHoldBombToBaitHeo ? 28 : 56) + move.length * 10;
      } else if (move.type === COMBO_TYPES.TRIPLE) {
        score += 46;
      } else if (move.type === COMBO_TYPES.PAIR) {
        score += 36;
      } else if (move.type === COMBO_TYPES.SINGLE) {
        score += 22;
        if (breakCost === 0 && effHighValue < 40) {
          score += 28; // Xả rác lẻ cô lập
        }
      }

      // Chạy 3♠ ngay khi có cơ hội kẻo bị phạt Thối 3♠ (5x mức cược)
      if (contains3Spade && !touchesBomb) {
        score += sit.minOpponentCards <= 8 ? 95 : 40;
      }

      // Chạy Heo (2) nếu thấy đối thủ sắp về (<= 5 lá) kẻo bị Thối Heo
      if (twosCount > 0 && sit.minOpponentCards <= 5) {
        score += 55 * twosCount;
      }

      // ĐỌC TÌNH HÌNH ĐỐI THỦ KHI MỞ VÒNG:
      if (sit.minOpponentCards === 1 && !sit.shouldHoldBombToBaitHeo) {
        // Đối thủ chỉ còn 1 lá (và không phải thế câu Heo): ưu tiên đánh Bộ >= 2 lá hoặc đánh quân lẻ lớn nhất!
        if (move.length >= 2) {
          score += 120 + move.length * 10;
        } else {
          score += effHighValue * 2.2 - 40;
        }
      } else if (sit.minOpponentCards <= 3 && !sit.shouldHoldBombToBaitHeo) {
        score += move.length * 18 + effHighValue * 0.45;
      } else if (!sit.shouldHoldBombToBaitHeo) {
        score -= effHighValue * 0.85;
        if (move.highRank === 12 && bot.hand.length > 3) {
          score -= 75;
        }
      } else {
        // Khi đang câu Heo: không đánh Heo của chính mình ra trước
        if (move.highRank === 12 && bot.hand.length > 3) {
          score -= 95;
        }
      }

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  chooseBotResponseMove(bot, validMoves) {
    // 1. Nếu đánh 1 nước hết bài Về Nhất luôn (hoặc Yoimiya đang bật Pháo Hoa đốt nốt lá cuối) -> Đánh ngay lập tức!
    const activeCharId = this.getPlayerActiveCharId(bot);
    const isYoimiyaBurnActive =
      this.yoimiyaBurnTrashReady && activeCharId === 'yoimiya';
    const instantWin = validMoves.find(
      (m) =>
        m.length === bot.hand.length ||
        (isYoimiyaBurnActive && m.length >= 2 && m.length === bot.hand.length - 1)
    );
    if (instantWin) return instantWin;

    // 2. Nếu đối thủ vừa sập bẫy tung Heo / Đôi Heo / Hàng -> TUNG TỨ QUÝ / ĐÔI THÔNG CHẶT NGAY LẬP TỨC!
    const chopMoves = validMoves.filter((m) => canBeatCombo(m, this.currentCombo).isChop);
    if (chopMoves.length > 0) {
      chopMoves.sort((a, b) => a.highValue - b.highValue);
      return chopMoves[0];
    }

    const struct = this.analyzeBotHandStructure(bot.hand);
    const sit = this.analyzeBotTableSituation(bot, struct);

    // 3. KHI ĐANG ÔM TỨ QUÝ / ĐÔI THÔNG RÌNH CHẶT HEO (sit.shouldHoldBombToBaitHeo):
    // Nếu trên bàn đang đánh LẺ (hoặc Đôi) thường và Bot có quân ngoài Hàng chặn được -> Đè mạnh để ép đối thủ phải ra Heo!
    if (
      sit.shouldHoldBombToBaitHeo &&
      this.currentCombo &&
      this.currentCombo.highRank < 12 &&
      (this.currentCombo.type === COMBO_TYPES.SINGLE ||
        (this.currentCombo.type === COMBO_TYPES.PAIR && sit.hasQuadOrFourPairs))
    ) {
      const baitResponses = validMoves.filter((m) => {
        if (m.isBomb) return false;
        const touchesBomb = m.cards.some((c) => struct.bombRanks.has(c.rankIndex));
        return !touchesBomb && m.highRank < 12;
      });
      if (baitResponses.length > 0) {
        // Chọn quân đủ lớn (ưu tiên không xé bộ trước, nếu phải xé đôi thường cũng chấp nhận để ép Heo!)
        baitResponses.sort((a, b) => {
          const effA =
            activeKokomiReverseRank && a.highRank < 12
              ? (11 - a.highRank) * 4 + (a.highCard?.suitIndex || 0)
              : a.highValue;
          const effB =
            activeKokomiReverseRank && b.highRank < 12
              ? (11 - b.highRank) * 4 + (b.highCard?.suitIndex || 0)
              : b.highValue;
          const costA = this.evaluateMoveBreakCost(a, struct) * 0.35 + effA;
          const costB = this.evaluateMoveBreakCost(b, struct) * 0.35 + effB;
          return costA - costB;
        });
        return baitResponses[0];
      }
    }

    // Trọng số phạt khi Xé Bộ thường (Đôi, Sảnh, Sám):
    const breakWeight = sit.isCriticalEndgame ? 0.05 : sit.isLosingSoon ? 0.18 : 1.0;

    const candidates = validMoves.map((move) => {
      const breakCost = this.evaluateMoveBreakCost(move, struct);
      const touchesBomb = !move.isBomb && move.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      const isTwo = move.highRank === 12;
      const containsTwo = move.cards.some((c) => c.rankIndex === 12);
      const remainingAfter = bot.hand.length - move.length;
      const nearFinishBonus = remainingAfter <= 1 ? -95 : remainingAfter === 2 ? -45 : 0;
      const effHighValue =
        activeKokomiReverseRank && move.highRank < 12
          ? (11 - move.highRank) * 4 + (move.highCard?.suitIndex || 0)
          : move.highValue;

      // Bảo vệ Tứ Quý / Đôi Thông: nếu đối thủ còn Heo thì phạt cực nặng nước đi làm gãy Hàng
      const bombProtectPenalty =
        touchesBomb && (sit.shouldHoldBombToBaitHeo || sit.minOpponentCards > 1) ? 2000 : 0;

      // Nếu đang có nguy cơ Thối Heo (đối thủ <= 6 lá mà mình ôm Heo), ưu tiên quăng Heo ra cướp cái & chạy Heo!
      const rotEscapeBonus =
        containsTwo && sit.minOpponentCards <= 6 ? -55 : 0;

      // Nếu đối thủ hoặc người cầm cái chỉ còn <= 2 lá (nguy cơ về đích ngay lượt sau):
      let cardValueTerm = effHighValue * 1.3;
      if (sit.minOpponentCards <= 2 || sit.ownerCards <= 2) {
        cardValueTerm = -effHighValue * 1.1; // Ưu tiên quân lớn đè chết đối thủ!
      }

      const holdTwoPenalty =
        isTwo && !sit.isLosingSoon && bot.hand.length > 4 ? 48 : 0;

      // Ưu tiên mạnh các bộ bài kích hoạt đúng hiệu ứng Kỹ Năng vừa bật (Ganyu Sảnh Khuyết, Mualani Đè Khác Loại, Yoimiya Đốt Rác, Xiao Đạp Kích, Columbina Hiệp Phụ)
      let skillSynergyBonus = 0;
      if (!touchesBomb) {
        if (this.ganyuGapStraightTurn && move.isGapStraight) {
          skillSynergyBonus -= 340;
        }
        if (
          this.mualaniCrossBeatTurn &&
          this.currentCombo &&
          move.length > this.currentCombo.length &&
          move.highRank < 12
        ) {
          skillSynergyBonus -= 340;
        }
        if (
          this.xiaoPlungeSingleTurn &&
          move.isXiaoPlunge &&
          this.currentCombo &&
          this.currentCombo.length >= 2
        ) {
          skillSynergyBonus -= 360;
        }
        if (this.columbinaExtraTurnReady) {
          const usedIds = new Set(move.cards.map((c) => c.id));
          const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
          if (remHand.length > 0 && classifyCombo(remHand)) {
            skillSynergyBonus -= 950;
          } else {
            skillSynergyBonus -= 180;
          }
        }
        if (isYoimiyaBurnActive && move.length >= 2) {
          skillSynergyBonus -= 190;
        }
      }

      const totalCost =
        breakCost * breakWeight +
        bombProtectPenalty +
        cardValueTerm +
        holdTwoPenalty +
        nearFinishBonus +
        rotEscapeBonus +
        skillSynergyBonus;

      return { move, breakCost, touchesBomb, totalCost };
    });

    candidates.sort((a, b) => a.totalCost - b.totalCost);
    const best = candidates[0];

    // Tuyệt đối không tự xé Tứ Quý / Đôi Thông để đỡ bài thường khi đối thủ vẫn còn Heo!
    if (best.touchesBomb && sit.shouldHoldBombToBaitHeo) {
      return null;
    }

    // Nếu Bot vừa chủ động bật Kỹ Năng phá thế trong lượt/vòng này
    // thì BẮT BUỘC đánh tiếp nước bài đã mở đường, TUYỆT ĐỐI KHÔNG BỎ LƯỢT lãng phí Kỹ Năng!
    const mustFollowUpSkill =
      !best.touchesBomb &&
      ((this.ganyuGapStraightTurn && activeCharId === 'ganyu') ||
        (this.mualaniCrossBeatTurn && activeCharId === 'mualani') ||
        (this.xiaoPlungeSingleTurn && activeCharId === 'xiao') ||
        (this.columbinaExtraTurnReady && activeCharId === 'columbina') ||
        (this.kinichBombOwnerId === bot.id && activeCharId === 'kinich') ||
        (this.kokomiReverseRankRound && activeCharId === 'kokomi') ||
        (this.shenheSingleOnlyRound && activeCharId === 'shenhe') ||
        (this.currentCombo?.label?.includes('Varesa') && activeCharId === 'varesa') ||
        (this.currentCombo?.label?.includes('Odette') && activeCharId === 'odette') ||
        (this.currentCombo?.label?.includes('Lauma') && activeCharId === 'lauma') ||
        (bot.skillUsed && ['vodyanitsa', 'durin', 'venti', 'linnea', 'nefer', 'sandrone', 'zibai'].includes(activeCharId)));
    if (mustFollowUpSkill) {
      return best.move;
    }

    // 4. QUYẾT ĐỊNH ĐÁNH HAY BỎ LƯỢT DỰA TRÊN ĐỌC TÌNH HÌNH BÀN BÀI:
    // (A) KHI BÁO ĐỘNG ĐỎ TỬ CHIẾN (Đối thủ <= 4 lá):
    // Xé mọi Đôi / Sảnh / Sám để chặn đối thủ (và chỉ xé Hàng nếu đối thủ đã hết sạch Heo!)
    if (sit.isCriticalEndgame) {
      if (best.touchesBomb && sit.opponentTwosCount > 0) return null;
      return best.move;
    }

    if (sit.isLosingSoon) {
      // Sắp thua: Xé Đôi, xé Sảnh, xé Sám, đánh Heo thoải mái để cướp cái và xả lá!
      if (best.touchesBomb) {
        return null;
      }
      return best.move;
    }

    // (B) KHI BÀN BÀI ĐANG AN TOÀN (Đầu ván, mọi đối thủ còn >= 7 lá, Bot đã thoát Cóng):
    if (best.touchesBomb || best.breakCost >= 400) {
      return null;
    }

    if (best.breakCost >= 90 && bot.hand.length >= 5) {
      return null;
    }

    if (
      best.move.highRank === 12 &&
      this.currentCombo.highRank <= 8 &&
      bot.hand.length > 6
    ) {
      return null;
    }

    return best.move;
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

    if (activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(cardId)) {
      sfx.pass();
      this.showComboBanner('🔒 LÁ BÀI NÀY ĐANG BỊ PHÁO KÍCH CỦA NAVIA KHÓA TRONG VÒNG NÀY!');
      return;
    }

    // Chế độ Chọn 1 Lá Bài để Rèn (+1 bậc ♥) của Mavuika
    if (this.mavuikaSelectingCard) {
      if (clickedCard.rankIndex > 10) {
        sfx.pass();
        this.showComboBanner('⚠️ CHỈ CHỌN ĐƯỢC LÁ BÀI TỪ 3 ĐẾN K (KHÔNG RÈN ĐƯỢC A HOẶC 2)!');
        return;
      }
      this.mavuikaSelectingCard = false;
      this.selectedCardIds = new Set([clickedCard.id]);
      this.companionCardIds.clear();
      if (this.isMultiplayer && !this.isHost) {
        this.sendClientEvent({
          type: 'USE_CHAR_SKILL',
          clientId: this.myClientId,
          charId: 'mavuika',
          selectedIds: [clickedCard.id],
        });
        return;
      }
      this.useCharacterSkill(human, [clickedCard.id]);
      return;
    }

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

    const onlyFourPairs =
      (human.passed || this.currentTurn !== this.mySeatId) && this.canPlayerCutWithFourPairs(human);
    const currentSelected = this.getSelectedCards();
    if (currentSelected.length > 0) {
      const nextCards = [...currentSelected, clickedCard];
      const manualCandidate = classifyCombo(nextCards);
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

      // Kiểm tra xem tập bài đang chọn + lá vừa bấm có thể hoàn thiện thành 4 Đôi Thông / 3 Đôi Thông / Tứ Quý hợp lệ (giữ nguyên 100% chất bài người chơi đã chọn) hay không
      const usableHand =
        activeNaviaLockedCardIds && activeNaviaLockedCardIds.size > 0
          ? human.hand.filter((c) => !activeNaviaLockedCardIds.has(c.id))
          : human.hand;
      const allUnder2 = nextCards.every((c) => c.rankIndex < 12);
      if (allUnder2) {
        const seedByRank = new Map();
        let validPairSeed = true;
        for (const c of nextCards) {
          const arr = seedByRank.get(c.rankIndex) || [];
          arr.push(c);
          if (arr.length > 2) validPairSeed = false;
          seedByRank.set(c.rankIndex, arr);
        }
        if (validPairSeed && seedByRank.size >= 2) {
          for (const pairCount of [4, 3]) {
            if (onlyFourPairs && pairCount !== 4) continue;
            for (let start = 0; start <= 12 - pairCount; start++) {
              const endRank = start + pairCount - 1;
              const allRanksInWindow = Array.from(seedByRank.keys()).every(
                (r) => r >= start && r <= endRank
              );
              if (!allRanksInWindow) continue;
              let canBuild = true;
              const builtCards = [];
              for (let r = start; r <= endRank; r++) {
                const chosenForRank = seedByRank.get(r) || [];
                const handForRank = usableHand.filter(
                  (c) => c.rankIndex === r && !chosenForRank.some((sc) => sc.id === c.id)
                );
                if (chosenForRank.length + handForRank.length < 2) {
                  canBuild = false;
                  break;
                }
                const needed = 2 - chosenForRank.length;
                const sortedRem = sortCardsAsc(handForRank);
                const picks =
                  r === endRank
                    ? sortedRem.slice(sortedRem.length - needed)
                    : sortedRem.slice(0, needed);
                builtCards.push(...chosenForRank, ...picks);
              }
              if (canBuild) {
                const pairRunCombo = classifyCombo(builtCards);
                if (
                  pairRunCombo &&
                  (!this.mustPlay3Spade || pairRunCombo.cards.some((c) => c.value === 0)) &&
                  canBeatCombo(pairRunCombo, this.currentCombo).ok
                ) {
                  this.selectedCardIds = new Set(pairRunCombo.cards.map((c) => c.id));
                  sfx.click();
                  this.renderHumanHand();
                  this.updateHumanActionButtons();
                  return;
                }
              }
            }
          }
        }
      }

      const curCombo = classifyCombo(currentSelected);
      const curComboValidBeat =
        curCombo &&
        (!onlyFourPairs || curCombo.type === COMBO_TYPES.FOUR_PAIRS) &&
        canBeatCombo(curCombo, this.currentCombo).ok;

      // Nếu người chơi bấm thêm 1 lá cùng số với lá đang chọn (để đổi chất bài hoặc gom Sám/Tứ quý), hoặc các lá đang chọn chưa tạo thành bộ chặn hợp lệ -> Cộng thẳng lá vừa bấm, KHÔNG xóa lựa chọn cũ!
      if (!curComboValidBeat || currentSelected.some((c) => c.rankIndex === clickedCard.rankIndex)) {
        this.selectedCardIds.add(cardId);
        sfx.click();
        this.renderHumanHand();
        this.updateHumanActionButtons();
        return;
      }
    }

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
      // Nếu có nước đi hợp lệ chứa toàn bộ các lá đang chọn CỘNG THÊM lá vừa bấm (VD: mở rộng Sảnh, nâng 3 đôi thông lên 4 đôi thông) -> Ưu tiên chọn bộ mở rộng đó!
      if (currentSelected.length > 0) {
        const supersetMoves = movesWithClicked.filter((m) =>
          currentSelected.every((sc) => m.cards.some((mc) => mc.id === sc.id))
        );
        if (supersetMoves.length > 0) {
          supersetMoves.sort((a, b) => {
            if (
              (a.type === COMBO_TYPES.FOUR_PAIRS && b.type === COMBO_TYPES.THREE_PAIRS) ||
              (a.type === COMBO_TYPES.THREE_PAIRS && b.type === COMBO_TYPES.FOUR_PAIRS)
            ) {
              return b.length - a.length;
            }
            return a.length - b.length || a.highValue - b.highValue;
          });
          const supMove = supersetMoves[0];
          this.selectedCardIds = new Set(supMove.cards.map((c) => c.id));
          sfx.click();
          this.renderHumanHand();
          this.updateHumanActionButtons();
          return;
        }
      }

      const bombPriority = (type) => {
        if (type === COMBO_TYPES.FOUR_PAIRS) return 3;
        if (type === COMBO_TYPES.FOUR_OF_A_KIND) return 2;
        if (type === COMBO_TYPES.THREE_PAIRS) return 1;
        return 0;
      };

      movesWithClicked.sort((a, b) => {
        // Khi Mualani bật Cá Mập Đè Khác Loại: ưu tiên bộ nhiều lá đè khác loại lên đầu
        if (activeMualaniCrossBeat && this.currentCombo) {
          const aCross = a.length > this.currentCombo.length ? 0 : 1;
          const bCross = b.length > this.currentCombo.length ? 0 : 1;
          if (aCross !== bCross) return aCross - bCross;
        }
        // Khi cả 2 đều là Hàng (3 đôi thông, Tứ quý, 4 đôi thông): luôn ưu tiên 4 Đôi Thông > Tứ Quý > 3 Đôi Thông để không chặn chặt 4 đôi thông!
        if (a.isBomb && b.isBomb) {
          const bpDiff = bombPriority(b.type) - bombPriority(a.type);
          if (bpDiff !== 0) return bpDiff;
          return a.highValue - b.highValue;
        }
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
      // Không tự ý xóa các lá đang chọn nếu người chơi bấm thêm lá bài thủ công
      this.selectedCardIds.add(cardId);
    }

    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  clearSelection() {
    this.mavuikaSelectingCard = false;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  toggleSortMode() {
    this.sortMode = this.sortMode === 'asc' ? 'combo' : 'asc';
    const sortLabel = document.getElementById('sort-mode-label');
    if (sortLabel) {
      sortLabel.textContent = this.sortMode === 'asc' ? 'Tăng dần' : 'Theo Bộ';
    }
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

    // Cập nhật nút Kỹ Năng Nhân Vật (1 lần/ván — chỉ mở khi sở hữu Nộ 5★ của nhân vật đó)
    if (this.btnCharSkill) {
      const charId = this.getPlayerActiveCharId(human);
      const hasChar = charId && charId !== 'none' && CHARACTER_SKILLS[charId];
      const skill = hasChar ? CHARACTER_SKILLS[charId] : null;
      const skillCheck = this.canUseCharacterSkill(human);

      if (!hasChar) {
        if (this.elCharSkillLabel) {
          this.elCharSkillLabel.textContent = '🔒 Cần Nộ 5★';
        }
        this.btnCharSkill.disabled = true;
        this.btnCharSkill.classList.remove('skill-ready', 'skill-used');
        this.btnCharSkill.title =
          '🔒 Bạn phải sở hữu Hoạt Ảnh Kỹ Năng Nộ 5★ (tại Sảnh Cầu Nguyện) mới được sử dụng Kỹ Năng của nhân vật đó!';
      } else {
        if (this.elCharSkillLabel) {
          if (skill.isPassiveBet) {
            this.elCharSkillLabel.textContent = `💠 ${skill.name} (Nội Tại)`;
          } else if (human.skillUsed) {
            this.elCharSkillLabel.textContent = `${skill.icon} Đã dùng`;
          } else if (charId === 'mavuika' && this.mavuikaSelectingCard) {
            this.elCharSkillLabel.textContent = '🔥 Bấm 1 lá (3➔K) trên tay (Hủy [E])';
          } else if (
            charId === 'mavuika' &&
            selectedCards.length === 1 &&
            selectedCards[0].rankIndex <= 10
          ) {
            const c = selectedCards[0];
            this.elCharSkillLabel.textContent = `🔥 Rèn ${c.rank}${c.suit} ➔ ${RANKS[c.rankIndex + 1]}♥ [E]`;
          } else {
            this.elCharSkillLabel.textContent = `${skill.icon} ${skill.name} [E]`;
          }
        }
        this.btnCharSkill.disabled = !skillCheck.ok;
        this.btnCharSkill.classList.toggle('skill-ready', !!skillCheck.ok);
        this.btnCharSkill.classList.toggle('skill-used', !!human.skillUsed || !!skill.isPassiveBet);
        this.btnCharSkill.title = `${skill.icon} ${skill.charName} — ${skill.name}: ${skill.shortDesc}${
          skillCheck.ok ? ' (Nhấn phím E để tung chiêu!)' : ` (${skillCheck.reason})`
        }`;
      }
    }

    if (this.mavuikaSelectingCard) {
      this.elSelectedPreview.textContent =
        '🔥 THÁNH HỎA RÈN BÀI: Hãy bấm trực tiếp vào 1 lá bài (từ 3 đến K) trên tay bạn để nâng lên +1 bậc (chất Cơ ♥)!';
      this.elSelectedPreview.classList.remove('invalid');
    } else if (selectedCards.length === 0) {
      this.elSelectedPreview.textContent = 'Chọn bài để đánh';
      this.elSelectedPreview.classList.remove('invalid');
    } else if (!combo) {
      this.elSelectedPreview.textContent = `⚠️ ${selectedCards.length} lá đang chọn chưa tạo thành bộ hợp lệ`;
      this.elSelectedPreview.classList.add('invalid');
    } else {
      this.elSelectedPreview.textContent = `✅ Đang chọn: ${combo.label}`;
      this.elSelectedPreview.classList.remove('invalid');
    }

    if (this.isBurstPlaying) {
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      if (this.btnCharSkill) this.btnCharSkill.disabled = true;
      this.elSelectedPreview.textContent = '⏳ Đang phát hoạt ảnh Kỹ Năng Nộ... Đợi hết hoạt ảnh để đánh bài!';
      return;
    }

    const canFourPairsCutAnytime =
      !this.isGameOver &&
      !this.isBurstPlaying &&
      human.finishRank === null &&
      this.currentCombo &&
      this.trickOwnerId !== this.mySeatId &&
      combo &&
      combo.type === COMBO_TYPES.FOUR_PAIRS &&
      canBeatCombo(combo, this.currentCombo).ok;

    if (!isMyTurn && !canFourPairsCutAnytime) {
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    const canBeatAny =
      this.currentCombo &&
      getValidMoves(human.hand, this.currentCombo, this.mustPlay3Spade, false).length > 0;
    const forcePlayLocked = this.yaeForcePlayRound && !human.passed && canBeatAny;
    this.btnPass.disabled = !isMyTurn || this.currentCombo === null || forcePlayLocked;
    if (forcePlayLocked) {
      this.btnPass.title = '🌸 Hồ Ly Dụ Hoặc (Yae Miko): Bạn đang có bài chặn được nên không thể Bỏ lượt!';
    } else {
      this.btnPass.title = 'Bỏ qua vòng hiện tại (Phím P)';
    }

    if (!combo) {
      this.btnPlay.disabled = true;
      return;
    }

    if ((human.passed || !isMyTurn) && combo.type !== COMBO_TYPES.FOUR_PAIRS) {
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

  onHumanPlay(isAutoTimeout = false) {
    if (this.isGameOver || this.isBurstPlaying) return;
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);
    if (!combo) return;
    const isFourPairsCutAnytime =
      combo.type === COMBO_TYPES.FOUR_PAIRS &&
      this.currentCombo &&
      this.trickOwnerId !== this.mySeatId &&
      canBeatCombo(combo, this.currentCombo).ok;
    if (this.currentTurn !== this.mySeatId && !isFourPairsCutAnytime) return;

    const human = this.getLocalPlayer();
    if (!isAutoTimeout && human) {
      human.manualActionsInMatch = (human.manualActionsInMatch || 0) + 1;
      human.afkAutoTurns = 0;
    }

    const cardIds = combo.cards.map((c) => c.id);
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      const beatCheck = canBeatCombo(combo, this.currentCombo);
      if (beatCheck.ok) {
        if (combo.length >= 2) {
          this.incrementDailyQuest('play_combos', 1);
        }
        const twosPlayed = combo.cards.filter((c) => c.rankIndex === 12).length;
        const powerGain = twosPlayed + (beatCheck.isChop ? 1 : 0);
        if (powerGain > 0) {
          this.incrementDailyQuest('play_power', powerGain);
        }
      }
      this.sendClientEvent({
        type: 'PLAY_CARDS',
        clientId: this.myClientId,
        cardIds,
        manual: !isAutoTimeout,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.playCombo(human, combo);
  }

  onHumanPass(isAutoTimeout = false) {
    if (this.isGameOver || this.isBurstPlaying || this.currentTurn !== this.mySeatId || !this.currentCombo) return;
    const human = this.getLocalPlayer();
    if (!isAutoTimeout && human) {
      human.manualActionsInMatch = (human.manualActionsInMatch || 0) + 1;
      human.afkAutoTurns = 0;
    }
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      this.sendClientEvent({
        type: 'PASS_TURN',
        clientId: this.myClientId,
        manual: !isAutoTimeout,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.passTurn(human);
  }

  // ============================================================================
  // END OF MATCH & SCORING (NHẤT ĂN TẤT - ĐẾM LÁ + THỐI HEO/HÀNG/3♠ + ĐÚT 3♠)
  // ============================================================================
  endMatch(winnerId, wonBy3Spade = false) {
    this.isGameOver = true;
    this.stopTurnCountdown();
    this.clearActiveMatchSnapshot();
    this.updateMidMatchLockUI();
    this.btnShowSummary.classList.remove('hidden');
    clearTimeout(this.botTimer);

    const winner = this.players[winnerId];
    const b = this.betPerCard || 100;
    const coinChanges = [0, 0, 0, 0];
    const detailsByPlayer = [[], [], [], []];
    let totalWinnerGain = 0;

    const winnerCharId = this.getPlayerActiveCharId(winner);
    this.players.forEach((p) => {
      if (!p.active || p.id === winnerId) return;

      const analysis = analyzeLoserHand(p.hand, wonBy3Spade, b);
      let loss = analysis.totalPenalty;
      const pCharId = this.getPlayerActiveCharId(p);
      const passiveBreakdowns = [];

      // 1. Qiqi (Bùa Độ Ách): Giảm 15% tiền phạt đếm lá khi thua
      if (pCharId === 'qiqi' && p.hand.length > 0) {
        const leafBase = p.hand.length === 13 ? b * 26 : p.hand.length * b;
        const qiqiRed = Math.max(10, Math.round(leafBase * 0.15));
        loss = Math.max(b, loss - qiqiRed);
        passiveBreakdowns.push({ label: `❄️ Bùa Độ Ách Qiqi: Giảm 15% phạt lá (+${qiqiRed.toLocaleString()})`, isGood: true });
      }
      // 2. Jean (Gió Bồ Công Anh): Giảm 25% tiền phạt Thối Heo/Hàng/Cóng cuối ván
      if (pCharId === 'jean') {
        const leafNormal = p.hand.length < 13 ? p.hand.length * b : 0;
        const specialPen = Math.max(0, analysis.totalPenalty - leafNormal);
        if (specialPen > 0) {
          const jeanRed = Math.max(10, Math.round(specialPen * 0.25));
          loss = Math.max(b, loss - jeanRed);
          passiveBreakdowns.push({ label: `🍃 Gió Bồ Công Anh Jean: Giảm 25% phạt Thối/Cóng (+${jeanRed.toLocaleString()})`, isGood: true });
        }
      }
      // 3. Dehya (Sư Tử Lửa Bờm Đỏ): Khi thua >= 8 lá (hoặc Cóng), giảm 25% tiền phạt các lá vượt ngưỡng 7 lá
      if (pCharId === 'dehya' && p.hand.length >= 8) {
        const extraLeavesCost = p.hand.length === 13 ? b * 19 : (p.hand.length - 7) * b;
        const dehyaRed = Math.max(10, Math.round(extraLeavesCost * 0.25));
        loss = Math.max(b, loss - dehyaRed);
        passiveBreakdowns.push({ label: `🔥 Sư Tử Lửa Dehya: Giảm 25% phạt lá vượt ngưỡng 7 (+${dehyaRed.toLocaleString()})`, isGood: true });
      }
      // 4. Mona (Quỹ Đạo Tinh Mệnh — khi thua): Giảm nhẹ 1× mức cược
      if (pCharId === 'mona') {
        const monaRed = Math.round(b);
        loss = Math.max(b, loss - monaRed);
        passiveBreakdowns.push({ label: `💧 Quỹ Đạo Tinh Mệnh Mona: Giảm phạt (-1× cược = +${monaRed.toLocaleString()})`, isGood: true });
      }

      // 5. Kẻ thắng là Keqing / Mona / Diluc tác động lên tiền thắng từ mỗi nhà thua:
      if (winnerCharId === 'keqing') {
        const keqBonus = Math.round(b * 2);
        loss += keqBonus;
        passiveBreakdowns.push({ label: `⚡ Keqing Về Nhất thu thêm +2× cược (-${keqBonus.toLocaleString()})`, isSpecial: true });
      } else if (winnerCharId === 'mona') {
        const monaWinBonus = Math.round(b * 1.5);
        loss += monaWinBonus;
        passiveBreakdowns.push({ label: `💧 Mona Về Nhất thu lộc tinh mệnh +1.5× cược (-${monaWinBonus.toLocaleString()})`, isSpecial: true });
      } else if (winnerCharId === 'diluc') {
        const leafNormal = p.hand.length === 13 ? b * 26 : p.hand.length * b;
        const rottedPen = Math.max(0, analysis.totalPenalty - leafNormal);
        if (rottedPen > 0) {
          const dilucBonus = Math.round(rottedPen * 0.2);
          loss += dilucBonus;
          passiveBreakdowns.push({ label: `🔥 Diluc ăn Thối +20% (-${dilucBonus.toLocaleString()})`, isSpecial: true });
        }
      }

      this.penaltyCardIdsByPlayer[p.id] = analysis.penaltyCardIds;
      detailsByPlayer[p.id] = [...this.matchChopDetails[p.id], ...analysis.breakdown, ...passiveBreakdowns];

      p.coins -= loss;
      coinChanges[p.id] = this.matchChopCoins[p.id] - loss;
      totalWinnerGain += loss;

      const detailText = [...analysis.breakdown, ...passiveBreakdowns].map((item) => item.label).join(', ');
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

    // 6. Yumemizuki Mizuki (Liệu Pháp Mộng Đẹp Baku): Kết thúc mỗi ván (thắng hay thua) đều được Baku hồi cố định +1.5× Mức cược Xu
    this.players.forEach((p) => {
      if (!p.active) return;
      if (this.getPlayerActiveCharId(p) === 'mizuki') {
        const mizukiHeal = Math.round(b * 1.5);
        p.coins += mizukiHeal;
        coinChanges[p.id] += mizukiHeal;
        detailsByPlayer[p.id].push({
          label: `🍃 Liệu Pháp Mộng Đẹp Mizuki: Baku hồi phục (+${mizukiHeal.toLocaleString()} xu)`,
          isGood: true,
        });
        this.addLog(
          `🍃 <strong>[Liệu Pháp Mộng Đẹp]</strong> Baku của <strong>${p.name}</strong> hồi phục an ủi <strong>+${mizukiHeal.toLocaleString()} Xu</strong> (+1.5× cược) sau ván đấu!`,
          'log-win'
        );
      }
    });

    // KIỂM TRA TREO MÁY (AFK) CẢ TRẬN TRONG CHẾ ĐỘ NHIỀU NGƯỜI CHƠI -> TỰ OUT BÀN VÀO TRẬN SAU!
    if (this.isMultiplayer) {
      this.players.forEach((p) => {
        if (!p.active || p.isBot) return;
        const afkWholeMatch = (p.manualActionsInMatch || 0) === 0 && (p.afkAutoTurns || 0) >= 1;
        if (afkWholeMatch) {
          p.wasFullMatchAfk = true;
          detailsByPlayer[p.id].push({
            label: '💤 AFK cả trận (Tự rời bàn ván sau)',
            isSpecial: true,
          });
          this.addLog(
            `💤 <strong>[AFK Cả Trận]</strong> <strong>${p.name}</strong> đã treo máy (AFK) suốt cả trận đấu nên sẽ <strong>tự động rời bàn</strong> ở ván tiếp theo!`,
            'log-chop'
          );
        }
      });

      // Nếu bản thân người chơi hiện tại (Host hoặc Guest) đã AFK suốt cả trận -> Tự động out phòng sau 3.2s khi hiện bảng tổng kết!
      const localP = this.getLocalPlayer();
      if (
        localP &&
        localP.active &&
        !localP.isBot &&
        (localP.manualActionsInMatch || 0) === 0 &&
        (localP.afkAutoTurns || 0) >= 1
      ) {
        clearTimeout(this.afkAutoLeaveTimer);
        this.afkAutoLeaveTimer = setTimeout(() => {
          if (this.isMultiplayer && this.isGameOver) {
            this.leaveWifiRoom(true, '💤 Bạn đã treo máy (AFK) suốt cả trận đấu nên đã tự động rời bàn!');
          }
        }, 3200);
      } else if (this.isHost) {
        // Chủ phòng tự động kích người chơi AFK cả trận ra khỏi bàn sau 2.8s để chuẩn bị cho ván sau sạch sẽ
        clearTimeout(this.afkAutoLeaveTimer);
        this.afkAutoLeaveTimer = setTimeout(() => {
          if (this.isMultiplayer && this.isHost && this.isGameOver) {
            this.kickFullMatchAfkPlayersBeforeNextMatch();
          }
        }, 2800);
      }
    }

    this.lastWinnerId = winnerId;
    this.elTurnBanner.textContent = `🏁 ${winner.name} Về Nhất (+${totalWinnerGain.toLocaleString()} xu)! Đã lật bài toàn bàn.`;

    const bannerTitle = wonBy3Spade
      ? `👑 ${winner.name.toUpperCase()} ĐÚT 3 BÍCH VỀ NHẤT — ĂN TRỌN +${totalWinnerGain.toLocaleString()} XU!`
      : `🏆 ${winner.name.toUpperCase()} VỀ NHẤT — ĂN TRỌN +${totalWinnerGain.toLocaleString()} XU!`;

    const winBurstDetail = wonBy3Spade
      ? `👑 ${winner.name} Đút 3♠ Về Nhất • +${totalWinnerGain.toLocaleString()} Xu!`
      : `🏆 ${winner.name} Về Nhất Ăn Tất • +${totalWinnerGain.toLocaleString()} Xu!`;
    const winBurstId = this.getPlayerActiveCharId(winner);
    this.lastBurstEffect = { id: Date.now(), type: winBurstId, burstId: winBurstId, isWin: true, detail: winBurstDetail };
    this.lastSummaryData = { coinChanges, detailsByPlayer, bannerTitle };
    this.incrementDailyQuest('play_matches', 1);
    if (winnerId === this.mySeatId) {
      this.incrementDailyQuest('win_matches', 1);
    }
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }

    // Delay ~1.35 giây để người chơi nhìn rõ lá bài cuối cùng đánh xuống bàn & bài lật ngửa của đối thủ rồi mới tổng kết
    clearTimeout(this.endMatchDelayTimer);
    this.endMatchDelayTimer = setTimeout(() => {
      if (!this.isGameOver) return;
      this.triggerGenshinBurst(winBurstId, winBurstDetail, () => {
        if (this.isGameOver) {
          this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
        }
      });
    }, 1350);
  }

  showSummaryModal(coinChanges, detailsByPlayer, bannerText) {
    const tbody = document.getElementById('summary-tbody');
    const banner = document.getElementById('toi-trang-banner');
    this.updateBetBadges();
    this.tighnariBonusByPlayer = {};

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

    this.resetSummaryBotPrompt();
    this.modalSummary.classList.remove('hidden');
  }

  // ============================================================================
  // RENDERING UI (WITH PERSPECTIVE ROTATION & ANIME SKINS/AVATARS)
  // ============================================================================
  createCardElement(card, interactive = false, isPenalty = false, skinId = 'classic') {
    const div = document.createElement('div');
    const isSelected = interactive && this.selectedCardIds.has(card.id);
    const isCompanion = interactive && this.companionCardIds.has(card.id);
    const isNaviaLocked = interactive && activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(card.id);
    const activeSkin = getCardSkinMeta(skinId);

    div.className = `playing-card ${card.isRed ? 'red-card' : 'black-card'} ${
      card.rankIndex === 12 ? 'is-two' : ''
    } ${isSelected ? 'selected' : ''} ${isCompanion ? 'companion-card' : ''} ${
      isNaviaLocked ? 'navia-locked-card' : ''
    } skin-${activeSkin.id}`;

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
    const naviaLockHtml = isNaviaLocked
      ? `<div class="card-navia-lock-badge" title="Bị Pháo Kích Khóa Bài của Navia khóa trong vòng này">🔒 KHÓA</div>`
      : '';

    div.innerHTML = `
      ${bgArtHtml}
      ${naviaLockHtml}
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

      // Cập nhật Ô Riêng Bên Cạnh Name Tag Ghi Tên Nhân Vật Người Đó Đang Xài
      const charId = this.getPlayerActiveCharId(p);
      const hasChar = charId && charId !== 'none' && CHARACTER_SKILLS[charId];
      const sk = hasChar ? CHARACTER_SKILLS[charId] : null;
      const elem = hasChar ? CHARACTER_ELEMENTS[charId] || 'electro' : 'none';
      const charBoxEl = document.getElementById(`char-box-${visualSlot}`);
      const charThumbEl = document.getElementById(`char-thumb-${visualSlot}`);
      const charNameEl = document.getElementById(`char-name-${visualSlot}`);
      const charSkillEl = document.getElementById(`char-skill-${visualSlot}`);

      if (charBoxEl) {
        charBoxEl.classList.remove('elem-electro', 'elem-hydro', 'elem-pyro', 'elem-cryo', 'elem-geo', 'elem-none');
        charBoxEl.classList.add(`elem-${elem}`);
        charBoxEl.title = hasChar
          ? `🔍 Bấm để xem chi tiết: ${sk.icon} ${sk.charName} — Kỹ năng [${sk.name}]: ${sk.shortDesc}`
          : `🔒 Chưa sở hữu Hoạt Ảnh Nộ 5★ (Bấm vào để xem danh sách Kỹ Năng ${GENSHIN_BURSTS.length} Nhân Vật 5★)`;
      }
      if (charThumbEl) {
        if (hasChar) {
          const expectedSrc = `fanart/${charId}.jpg?v=57`;
          if (charThumbEl.getAttribute('src') !== expectedSrc) {
            charThumbEl.setAttribute('src', expectedSrc);
          }
          charThumbEl.alt = sk.charName;
          charThumbEl.style.display = '';
        } else {
          charThumbEl.style.display = 'none';
        }
      }
      if (charNameEl) {
        charNameEl.textContent = hasChar ? `${sk.icon} ${sk.charName}` : '🔒 Chưa có Nộ 5★';
      }
      if (charSkillEl) {
        if (hasChar) {
          if (sk.isPassiveBet) {
            charSkillEl.textContent = `${sk.name} • Nội Tại Cược`;
            charSkillEl.classList.remove('used');
          } else {
            charSkillEl.textContent = p.skillUsed
              ? `${sk.name} • Đã dùng`
              : `${sk.name} • 1/1`;
            charSkillEl.classList.toggle('used', !!p.skillUsed);
          }
        } else {
          charSkillEl.textContent = 'Bấm xem chi tiết';
          charSkillEl.classList.remove('used');
        }
      }

      // Khi ván bài kết thúc (isGameOver), lật ngửa toàn bộ bài còn lại của các đối thủ ngay trên bàn!
      // Hoặc khi Yelan kích hoạt [Mạng Lưới Tình Báo], lộ diện 3 lá lớn nhất của đối thủ trong 8.5s!
      if (revealEl) {
        const yelanCards = !this.isGameOver && this.yelanRevealedByPlayer?.[p.id];
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
        } else if (yelanCards && yelanCards.length > 0) {
          revealEl.innerHTML = yelanCards
            .map(
              (c) => `<div class="mini-open-card ${c.isRed ? 'red-card' : 'black-card'} penalty-card" title="🎲 Tình báo Yelan soi bài!">
                <span>${c.rank}</span>
                <span>${c.suit}</span>
              </div>`
            )
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
        const rx = this.currentCombo.reaction || null;
        const fxWrap = document.createElement('div');
        fxWrap.className = `trick-impact-fx impact-${impactTier} ${rx ? rx.cssClass : ''}`;
        fxWrap.innerHTML = `
          <div class="trick-flash-core"></div>
          <div class="trick-shockwave-ring"></div>
          ${isHeavy ? '<div class="trick-slash-line"></div>' : ''}
          ${rx ? buildReactionVfxHtml(rx) : ''}
          ${rx ? `<div class="trick-reaction-float ${rx.cssClass}">${rx.shortName}</div>` : ''}
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
    this.updateArenaBackdropCharacters();
    this.renderRoundSkillStatusBar();
    this.renderSeats();
    this.renderCenterTrick();
    this.renderHumanHand();
    this.updateHumanActionButtons();
    this.updateMidMatchLockUI();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tienLenGame = new TienLenGame();
});
