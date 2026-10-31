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
  klee: ['klee', 'yoimiya', 'hutao'],
  albedo: ['albedo', 'navia', 'zibai'],
  varka: ['varka', 'eula', 'lohen'],
  nicole: ['nicole', 'durin', 'mavuika'],
  zhongli: ['zhongli', 'xiao', 'ganyu'],
  baizhu: ['baizhu', 'shenhe', 'ganyu'],
  xianyun: ['xianyun', 'xiao', 'shenhe'],
  kazuha: ['kazuha', 'ayaka', 'yoimiya'],
  itto: ['itto', 'yoimiya', 'yaemiko'],
  ayato: ['ayato', 'ayaka', 'yaemiko'],
  cyno: ['cyno', 'nefer', 'kinich'],
  nilou: ['nilou', 'lauma', 'kokomi'],
  nahida: ['nahida', 'nilou', 'cyno'],
  alhaitham: ['alhaitham', 'nahida', 'cyno'],
  neuvillette: ['neuvillette', 'furina', 'clorinde'],
  wriothesley: ['wriothesley', 'clorinde', 'navia'],
  sigewinne: ['sigewinne', 'wriothesley', 'furina'],
  emilie: ['emilie', 'escoffier', 'navia'],
  chasca: ['chasca', 'mualani', 'kinich'],
  tartaglia: ['tartaglia', 'zhongli', 'skirk'],
  arlecchino: ['arlecchino', 'columbina', 'sandrone'],
  ineffa: ['ineffa', 'varesa', 'clorinde'],
  flins: ['flins', 'vesna', 'odette'],
};

const GENSHIN_FANART_ROSTER = [
  { id: 'zibai', name: 'Zibai (Tiên Nhân Bạch Mã)', desc: '[Hiếm] Fanart Tiên Nhân Zibai thanh tao của vùng đất Liyue.', avatarPrice: 22000, skinPrice: 30000, crest: '🐎' },
  { id: 'lauma', name: 'Lauma (Nữ Tu Sương Giá)', desc: '[Hiếm] Fanart thiếu nữ huyền bí mang sức mạnh cổ đại.', avatarPrice: 23000, skinPrice: 32000, crest: '✨' },
  { id: 'linnea', name: 'Linnea (Ảo Thuật Gia Tinh Linh)', desc: '[Hiếm] Fanart thiếu nữ tinh linh duyên dáng và sắc sảo.', avatarPrice: 23000, skinPrice: 32000, crest: '🎩' },
  { id: 'citlali', name: 'Citlali (Bà Ngoại Itztli)', desc: '[Hiếm] Đại pháp sư Chủ Nhân Gió Đêm gắn Gối Ôm Ký Sinh xả bài rác ké theo mỗi lá bài đối thủ đánh ra.', avatarPrice: 25000, skinPrice: 35000, crest: '❄️' },
  { id: 'nefer', name: 'Nefer (Nữ Hoàng Sa Mạc)', desc: '[Hiếm] Fanart vẻ đẹp quyến rũ và quyền lực vùng cát vàng.', avatarPrice: 25000, skinPrice: 35000, crest: '🌙' },
  { id: 'odette', name: 'Odette (Thiên Nga Băng Giá)', desc: '[Hiếm] Vũ công thiên nga soi Mặt Hồ Đối Xứng lật ngược 3 lá nhỏ nhất trên tay thành bài đại gia (3➔A, 4➔K, 5➔Q).', avatarPrice: 25000, skinPrice: 35000, crest: '🦢' },
  { id: 'mualani', name: 'Mualani (Hướng Dẫn Viên Suối Nước)', desc: '[Hiếm] Fanart cô nàng lướt sóng năng động của Cư Dân Suối Nước.', avatarPrice: 26000, skinPrice: 38000, crest: '🦈' },
  { id: 'escoffier', name: 'Escoffier (Siêu Đầu Bếp Fontaine)', desc: '[Hiếm] Fanart thiên tài ẩm thực Băng nguyên tố của Fontaine.', avatarPrice: 28000, skinPrice: 40000, crest: '🍰' },
  { id: 'varesa', name: 'Varesa (Đấu Sĩ Lôi Đình)', desc: '[Sử Thi] Fanart nữ chiến binh tràn đầy năng lượng vùng Natlan.', avatarPrice: 32000, skinPrice: 45000, crest: '⚡' },
  { id: 'yoimiya', name: 'Yoimiya (Nữ Hoàng Lễ Hội Hè)', desc: '[Sử Thi] Chủ tiệm pháo hoa Naganohara đốt Dây Pháo Liên Hoàn nổ nối đuôi toàn bộ các lá liên tiếp ngay phía trên.', avatarPrice: 34000, skinPrice: 48000, crest: '🎆' },
  { id: 'eula', name: 'Eula (Kỵ Sĩ Sóng Nước)', desc: '[Sử Thi] Fanart Đội trưởng Đội Du Kích Kỵ Sĩ Đoàn Tây Phong.', avatarPrice: 35000, skinPrice: 50000, crest: '❄️' },
  { id: 'ganyu', name: 'Ganyu (Tuần Lộc Ánh Trăng)', desc: '[Sử Thi] Fanart tổng thư ký Nguyệt Hải Đình dịu dàng.', avatarPrice: 35000, skinPrice: 50000, crest: '🏹' },
  { id: 'kokomi', name: 'Sangonomiya Kokomi (Thánh Pháp Sư)', desc: '[Sử Thi] Fanart quân sư tối cao đảo Watatsumi.', avatarPrice: 35000, skinPrice: 50000, crest: '🫧' },
  { id: 'navia', name: 'Navia (Hội Trưởng Spina di Rosula)', desc: '[Sử Thi] Đại tiểu thư Spina di Rosula khai hỏa Pháo Dù Phỏm Pha Lê: Mặc kệ đối thủ đánh gì, chỉ cần tung Sảnh Đồng Chất hoặc Sám Cô là đều chặt đè được tất cả!', avatarPrice: 38000, skinPrice: 54000, crest: '☂️' },
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
  { id: 'mavuika', name: 'Mavuika (Hỏa Thần Natlan)', desc: '[Thần Thoại] Hỏa Thần mở khóa Vòng Lửa Thái Dương ghép Heo (2) nối liền A và 3-4 thành Sảnh Vòng Tròn Xuyên Heo.', avatarPrice: 75000, skinPrice: 115000, crest: '🔥' },
  { id: 'vodyanitsa', name: 'Vodyanitsa (Mỹ Nhân Ngư Biển Sâu)', desc: '[Thần Thoại] Fanart danh ca Hệ Thủy của Đoàn Kịch Korolevskiy.', avatarPrice: 78000, skinPrice: 120000, crest: '🌊' },
  { id: 'raiden', name: 'Raiden Shogun (Lôi Thần Vĩnh Hằng)', desc: '[Thần Thoại] Fanart Chúa tể sấm sét Inazuma — Vô Tưởng Nhất Đao.', avatarPrice: 80000, skinPrice: 125000, crest: '⚡' },
  { id: 'skirk', name: 'Skirk (Kiếm Khách Vực Sâu)', desc: '[Thần Thoại] Fanart nữ kiếm khách bí ẩn ngự trị Tinh Không Vực Sâu.', avatarPrice: 85000, skinPrice: 130000, crest: '🌌' },
  { id: 'lohen', name: 'Lohen (Phó Đội Trưởng Kỵ Sĩ Tây Phong)', desc: '[Sử Thi] Kỵ sĩ thương băng Tây Phong với tuyệt kỹ Khiên Phản Đòn trả ngược bộ bài trên bàn.', avatarPrice: 70000, skinPrice: 110000, crest: '❄️' },
  { id: 'durin', name: 'Durin (Hắc Long Tái Sinh)', desc: '[Huyền Thoại] Hắc Long mang Trái Tim Rồng Đỏ hóa thân lá bài thường thành Heo Cơ 2♥.', avatarPrice: 85000, skinPrice: 130000, crest: '🐉' },
  { id: 'xiao', name: 'Xiao (Hộ Pháp Dạ Xoa)', desc: '[Huyền Thoại] Hộ Pháp Dạ Xoa phóng thích Ách Nạn Nghiệp Chướng ép đối thủ chỉ được đánh bài thấp theo số lá còn trên tay.', avatarPrice: 85000, skinPrice: 130000, crest: '👹' },
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
  { id: 'klee', name: 'Klee (Mặt Trời Chạy Trốn)', desc: '[Huyền Thoại] Kỵ Sĩ Tia Lửa của Đội Kỵ Sĩ Tây Phong ném Bom Nảy phá nát bộ bài trên tay đối thủ.', avatarPrice: 75000, skinPrice: 115000, crest: '💣' },
  { id: 'albedo', name: 'Albedo (Kreideprinz Giả Kim)', desc: '[Huyền Thoại] Giả kim thuật sĩ trưởng Đội Kỵ Sĩ Tây Phong luyện Đôi + lá rác thành Sảnh đồng chất Cơ ♥.', avatarPrice: 75000, skinPrice: 115000, crest: '⚜️' },
  { id: 'varka', name: 'Varka (Đại Đoàn Trưởng Tây Phong)', desc: '[Thần Thoại] Kỵ Sĩ Bắc Phong vung đại kiếm chẻ đôi bộ bài trên bàn, quét bay nửa lớn hơn.', avatarPrice: 90000, skinPrice: 140000, crest: '🗡️' },
  { id: 'nicole', name: 'Nicole Reeyn (Phù Thủy Hexenzirkel N)', desc: '[Thần Thoại] Phù thủy tiên tri Hội Ma Nữ viết lại quy luật: Mọi bậc số 3→A ngang nhau, đè bài thuần bằng Chất!', avatarPrice: 90000, skinPrice: 140000, crest: '🔮' },
  { id: 'zhongli', name: 'Zhongli (Nham Vương Đế Quân)', desc: '[Thần Thoại] Nham Thần giáng Thiên Tinh hóa đá khóa toàn bộ lá bài chất Đen (♠, ♣) của mọi đối thủ.', avatarPrice: 95000, skinPrice: 145000, crest: '🪨' },
  { id: 'baizhu', name: 'Baizhu (Chủ Nhà Thuốc Bubu)', desc: '[Huyền Thoại] Danh y Liyue bắt mạch bộ bài trên bàn và biến bài rác thành bộ cùng số chất Đỏ ♥/♦ cao nhất.', avatarPrice: 78000, skinPrice: 120000, crest: '🐍' },
  { id: 'xianyun', name: 'Xianyun (Lưu Vân Tá Phong Chân Quân)', desc: '[Huyền Thoại] Tiên nhân Đằng Vân cho phép ghép và đánh Sảnh Nhảy Bậc Cách Đều +2 nút (VD: 3-5-7, 4-6-8-10).', avatarPrice: 80000, skinPrice: 125000, crest: '🦩' },
  { id: 'kazuha', name: 'Kaedehara Kazuha (Lá Đỏ Đuổi Sóng)', desc: '[Huyền Thoại] Lãng khách Inazuma cuốn gió thu tráo đổi 1-lấy-1 lá rác của mình lấy lá cùng bậc số từ tay đối thủ.', avatarPrice: 85000, skinPrice: 130000, crest: '🍁' },
  { id: 'itto', name: 'Arataki Itto (Quỷ Vương Nhất Đấu)', desc: '[Huyền Thoại] Đại ca Bang Arataki đúc Sám Cô thành Tứ Quý hoặc gom 3 lá rác đúc thành Sám Cô lớn.', avatarPrice: 78000, skinPrice: 120000, crest: '👹' },
  { id: 'ayato', name: 'Kamisato Ayato (Trụ Cột Gia Tộc)', desc: '[Huyền Thoại] Gia chủ Kamisato tạo Thủy Ảnh Thế Thân tiêu hao lá rác thay cho lá bài chủ lực vừa đánh.', avatarPrice: 82000, skinPrice: 125000, crest: '🌊' },
  { id: 'cyno', name: 'Cyno (Tổng Quản Mahamatra)', desc: '[Huyền Thoại] Phán quyết Thần Anubis giáng cấp lá bài lớn nhất của đối thủ xuống 3♠ và nâng lá rác lên A♦.', avatarPrice: 80000, skinPrice: 125000, crest: '🐺' },
  { id: 'nilou', name: 'Nilou (Vũ Công Hoa Sen Zubayr)', desc: '[Huyền Thoại] Vũ điệu Hạt Nhân Căng Tràn nâng cấp đồng loạt TẤT CẢ các bộ Đôi trên tay tăng thêm +2 bậc số.', avatarPrice: 80000, skinPrice: 125000, crest: '🪷' },
  { id: 'nahida', name: 'Nahida (Thảo Thần Kusanali)', desc: '[Thần Thoại] Thảo Thần kết nối Akasha lật ngửa 3 lá lớn nhất của CẢ 3 ĐỐI THỦ & giảm -1 bậc lá cao nhất của họ.', avatarPrice: 95000, skinPrice: 145000, crest: '🌱' },
  { id: 'alhaitham', name: 'Alhaitham (Quan Thư Ký Giáo Viện)', desc: '[Huyền Thoại] Lăng Kính Khúc Xạ nối 2 lá rác nhỏ nhất vào lá đơn lớn nhất trên tay thành Sảnh Thượng Đẳng 3 lá.', avatarPrice: 82000, skinPrice: 125000, crest: '📗' },
  { id: 'neuvillette', name: 'Neuvillette (Thẩm Phán Tối Cao Fontaine)', desc: '[Thần Thoại] Thủy Long Vương gõ Cán Cân Tuyệt Đối chuyển thẳng các lá bài rác nhỏ nhất sang tay đối thủ ít bài nhất để san bằng số lá.', avatarPrice: 95000, skinPrice: 145000, crest: '⚖️' },
  { id: 'wriothesley', name: 'Wriothesley (Công Tước Pháo Đài Meropide)', desc: '[Huyền Thoại] Cú đấm móc băng giá cho phép dùng 1 bộ Đôi đấm vỡ và đè trực tiếp lên bất kỳ bộ Sảnh nào trên bàn.', avatarPrice: 82000, skinPrice: 125000, crest: '🥊' },
  { id: 'sigewinne', name: 'Sigewinne (Y Tá Trưởng Melusine)', desc: '[Huyền Thoại] Bắn Bong Bóng Nước khóa cứng lá bài lớn nhất của TẤT CẢ đối thủ và nâng 1 lá rác thành A♥.', avatarPrice: 78000, skinPrice: 120000, crest: '💉' },
  { id: 'emilie', name: 'Emilie (Nhà Điều Hương Fontaine)', desc: '[Huyền Thoại] Nhà điều hương tỏa Tinh Dầu Khử Trùng bắt buộc mọi bộ bài đối thủ đánh ra trong vòng phải chứa ít nhất 1 lá mang Chất Hương Hoa.', avatarPrice: 80000, skinPrice: 125000, crest: '🧪' },
  { id: 'chasca', name: 'Chasca (Người Hòa Giải Tlalocan)', desc: '[Huyền Thoại] Nạp 2 lá bài rác lẻ vào ổ súng Linh Hồn bắn nối dài bộ Sảnh trên tay thêm +2 lá liên tiếp.', avatarPrice: 82000, skinPrice: 125000, crest: '🔫' },
  { id: 'tartaglia', name: 'Tartaglia (Childe Fatui #11)', desc: '[Huyền Thoại] Quan Chấp Hành thứ 11 chuyển đổi Cung Tên ⇄ Song Đao hoán đổi linh hoạt giữa Sảnh 3 lá và Sám Cô.', avatarPrice: 85000, skinPrice: 130000, crest: '🐳' },
  { id: 'arlecchino', name: 'Arlecchino (The Knave Fatui #4)', desc: '[Thần Thoại] Quan Chấp Hành thứ 4 khắc Khế Ước Sinh Mệnh: Đối thủ nào Bỏ Lượt bị nhét 1 lá rác và phạt 2× cược.', avatarPrice: 95000, skinPrice: 145000, crest: '🩸' },
  { id: 'ineffa', name: 'Ineffa (Cơ Khí Đồng Bộ Lôi)', desc: '[Huyền Thoại] Phát xung nhịp điện từ đồng bộ hóa các lá bài lẻ rời rạc thành 2 Đôi liên tiếp (Đôi Thông).', avatarPrice: 82000, skinPrice: 125000, crest: '🤖' },
  { id: 'flins', name: 'Flins (Người Giữ Đèn Ratniki)', desc: '[Huyền Thoại] Treo Ngọn Đèn Dẫn Hồn: Ngay khi có bất kỳ đối thủ nào Bỏ Lượt sẽ lập tức kết thúc vòng và cướp Cái.', avatarPrice: 88000, skinPrice: 135000, crest: '🏮' },
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
    imgUrl: `fanart/${c.id}.jpg?v=66`,
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
    imgUrl: `fanart/${c.id}.jpg?v=66`,
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
    desc: '[Huyền Thoại] Thần bài Liyue mở Sòng Bạc Dạ Lan: Khóa Luật Chẵn/Lẻ trong vòng này (đối thủ đè bài bắt buộc phải cùng bậc Chẵn hoặc cùng bậc Lẻ với bộ trên bàn) & nâng +1 bậc ♥ cho 1 lá bài (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'yelan_burst.mp4',
    audioUrl: 'yelan_burst.ogg',
    posterUrl: 'fanart/yelan.jpg',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🎲 KỸ NĂNG NỘ • YELAN (DEPTH-CLARION DICE)',
    title: 'THẦN BÀI LIYUE: SÒNG BẠC CHẴN LẺ',
    quote: '“Đặt Cược Chẵn Hay Lẻ — Nhà Cái Luôn Thắng!”',
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
    desc: '[Thần Thoại] Hỏa Thần Natlan mở khóa Vòng Lửa Thái Dương cho phép ghép Heo (2) nối liền với A và vòng qua 3 - 4 thành Sảnh Vòng Tròn Xuyên Heo đè mọi Sảnh (Video + Giọng lồng tiếng thật).',
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
    desc: '[Sử Thi] Hội trưởng Spina di Rosula khai hỏa Pháo Dù Phỏm Pha Lê: Khi kích hoạt, mặc kệ đối thủ đánh bài gì trên bàn, chỉ cần Navia đánh ra Sảnh Đồng Chất (≥ 3 lá liên tiếp cùng chất) hoặc Sám Cô (giống bộ Phỏm) là đều chặt đè được tất cả (Video + Giọng lồng tiếng thật).',
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
    desc: '[Sử Thi] Nữ hoàng lễ hội hè đốt Dây Pháo Liên Hoàn: Khi đánh 1 lá bài (hoặc Đôi), toàn bộ các lá có bậc số liên tiếp ngay phía trên trên tay tự động nổ dây chuyền bay ra bàn cùng lúc (Video + Giọng lồng tiếng thật).',
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
    name: 'Citlali — Gối Sao Đêm Ký Sinh',
    desc: '[Sử Thi] Đại pháp sư Chủ Nhân Gió Đêm gắn Gối Ôm Ký Sinh lên đối thủ ít bài nhất trong vòng này: Hễ đối thủ đánh ra bao nhiêu lá bài, Citlali tự động vứt bỏ theo bấy nhiêu lá rác nhỏ nhất (Video + Giọng lồng tiếng thật).',
    price: 125000,
    mp4Url: 'citlali_burst.mp4',
    audioUrl: 'citlali_burst.ogg?v=48',
    posterUrl: 'fanart/citlali.jpg?v=66',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '❄️ KỸ NĂNG NỘ • CITLALI (EDICT OF ENTWINED SPLENDOR)',
    title: 'CHỦ NHÂN GIÓ ĐÊM: GỐI ÔM KÝ SINH',
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
    desc: '[Sử Thi] Siêu đầu bếp Fontaine hoàn thiện Đôi Thông: Khi sắp có Đôi Thông (VD: Đôi 5, Đôi 6, Lẻ 7), lập tức thêm lá còn thiếu vào tay và bỏ đi 1 lá bài rác (Video + Giọng lồng tiếng thật).',
    price: 120000,
    mp4Url: 'escoffier_burst.mp4',
    audioUrl: 'escoffier_burst.ogg?v=48',
    posterUrl: 'fanart/escoffier.jpg?v=66',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🍰 KỸ NĂNG NỘ • ESCOFFIER (SCORING CUTS)',
    title: 'ĐẠI TIỆC FONTAINE: TUYỆT KỸ ĐÔI THÔNG',
    quote: '“Thưởng Thức Món Đặc Biệt Của Bếp Trưởng Nào!”',
  },
  {
    id: 'zibai',
    name: 'Zibai — Tam Hoàng Chi Uy',
    desc: '[Sử Thi] Tiên nhân Bạch Mã chỉ định đối thủ nhiều bài nhất phải đỡ bài kế tiếp và dựng Rào Cản Bạch Mã: Mọi đối thủ muốn đè bài trong vòng này bắt buộc phải lớn hơn tối thiểu +2 bậc số (Video + Giọng lồng tiếng thật).',
    price: 110000,
    mp4Url: 'zibai_burst.mp4',
    audioUrl: 'zibai_burst.ogg?v=54',
    posterUrl: 'fanart/zibai.jpg',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🐎 KỸ NĂNG NỘ • ZIBAI (TRI-SPHERE EMINENCE)',
    title: 'TIÊN NHÂN BẠCH MÃ: BẠCH MÃ VƯỢT TUYẾN',
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
    posterUrl: 'fanart/linnea.jpg?v=66',
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
    posterUrl: 'fanart/nefer.jpg?v=66',
    theme: 'theme-electro',
    sfxType: 'skirk',
    tag: '🌙 KỸ NĂNG NỘ • NEFER (TRUE EYE\'S PHANTASM)',
    title: 'NỮ HOÀNG SA MẠC: THÁNH THỆ CHÂN NHÃN',
    quote: '“Ảo Ảnh Bạch Xà — Nhìn Thấu Vạn Vật!”',
  },
  {
    id: 'odette',
    name: 'Odette — Vũ Khúc Thiên Nga Xanh',
    desc: '[Huyền Thoại] Vũ công thiên nga soi Mặt Hồ Đối Xứng phản chiếu ngược 3 lá bài nhỏ nhất trên tay qua trục gương bàn bài (3➔A, 4➔K, 5➔Q, 6➔J, 7➔10, 8➔9) biến thành dàn bài đại gia (Video + Giọng lồng tiếng thật).',
    price: 130000,
    mp4Url: 'odette_burst.mp4',
    audioUrl: 'odette_burst.ogg?v=55',
    posterUrl: 'fanart/odette.jpg?v=66',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🦢 KỸ NĂNG NỘ • ODETTE (PRESTO: BLUEBIRD FINALE)',
    title: 'VŨ KHÚC BĂNG GIÁ: MẶT HỒ ĐỐI XỨNG',
    quote: '“Điệu Múa Đêm Đông — Khép Lại Màn Nhung!”',
  },
  {
    id: 'vesna',
    name: 'Vesna — Vì Nữ Hoàng Băng Giá!',
    desc: '[Huyền Thoại] Nữ kiếm sĩ Hệ Phong gieo Gió Xuân Đoạt Cái: Nhuộm 2 lá Đen nhỏ trên tay thành Cơ ♥ & nếu đối thủ kết thúc vòng bằng bộ bài có lá Đỏ (♥/♦) sẽ bị Vesna TỊCH THU QUYỀN CẦM CÁI mở vòng mới (Video + Giọng lồng tiếng thật).',
    price: 140000,
    mp4Url: 'vesna_burst.mp4',
    audioUrl: 'vesna_burst.ogg?v=55',
    posterUrl: 'fanart/vesna.jpg?v=66',
    theme: 'theme-cryo',
    sfxType: 'skirk',
    tag: '🍃 KỸ NĂNG NỘ • VESNA (FOR THE TSARITSA!)',
    title: 'KIẾM VŨ PHONG XUÂN: GIÓ XUÂN ĐOẠT CÁI',
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
    desc: '[Thần Thoại] Mỹ nhân ngư Hệ Thủy dùng Gương Nước Phản Chiếu đổi ngẫu nhiên các lá bài trên tay thành bộ bài VỪA ĐỦ lớn hơn (nhỉnh hơn đúng 1 nấc chất/số hoặc Tứ Quý nhỏ nhất) để chặt/đè ngay bộ bài của đối thủ (Video + Giọng lồng tiếng thật).',
    price: 185000,
    mp4Url: 'vodyanitsa_burst.mp4',
    audioUrl: 'vodyanitsa_burst.ogg?v=55',
    posterUrl: 'fanart/vodyanitsa.jpg?v=66',
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
    posterUrl: 'fanart/lohen.jpg?v=66',
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
    posterUrl: 'fanart/durin.jpg?v=66',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🐉 KỸ NĂNG NỘ • DURIN (PRINCIPLE OF PURITY)',
    title: 'HẮC LONG TÁI SINH: TRÁI TIM RỒNG ĐỎ',
    quote: '“Sự Suy Tàn Và Tái Sinh — Câu Chuyện Mới Chỉ Bắt Đầu!”',
  },
  {
    id: 'xiao',
    name: 'Xiao — Vũ Điệu Trừ Yêu',
    desc: '[Huyền Thoại] Hộ Pháp Dạ Xoa phóng thích Ách Nạn Nghiệp Chướng bao trùm vòng này: Mọi đối thủ chỉ được phép đánh ra quân bài có bậc số tối đa bằng số lá bài họ đang cầm trên tay (+3) (Video + Giọng lồng tiếng thật).',
    price: 155000,
    mp4Url: 'xiao_burst.mp4?v=57',
    audioUrl: 'xiao_burst.ogg?v=62',
    posterUrl: 'fanart/xiao.jpg?v=66',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '👹 KỸ NĂNG NỘ • XIAO (BANE OF ALL EVIL)',
    title: 'HỘ PHÁP DẠ XOA: ÁCH NẠN NGHIỆP CHƯỚNG',
    quote: '“Vô Dụng — Trừ Yêu Diệt Ác, Tan Biến Đi!”',
  },
  {
    id: 'wanderer',
    name: 'Wanderer — Kyougen: Thức Lạc Ngũ Phiên',
    desc: '[Huyền Thoại] Kẻ Lang Thang triệu hồi cuồng phong xáo trộn toàn bộ bài đang cầm trên tay của tất cả người chơi trên bàn rồi chia lại (Video + Giọng lồng tiếng thật).',
    price: 160000,
    mp4Url: 'wanderer_burst.mp4?v=57',
    audioUrl: 'wanderer_burst.ogg?v=62',
    posterUrl: 'fanart/wanderer.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🌀 KỸ NĂNG NỘ • WANDERER (FIVE CEREMONIAL PLAYS)',
    title: 'CHÂN KHÔNG TỰ TẠI: THỨC LẠC NGŨ PHIÊN',
    quote: '“Lũ Côn Trùng Thấp Kém — Dám Ngước Nhìn Ta Sao!?”',
  },
  {
    id: 'kinich',
    name: 'Kinich — Kính Chào Thánh Long Toàn Năng',
    desc: '[Huyền Thoại] Thợ săn Natlan đặt Bom Hẹn Giờ Pixel Ajaw lên bàn: Kể từ sau khi Kinich kích hoạt chiêu, bất kỳ đối thủ nào đánh bài đi sau Kinich trong vòng đó đều bị nổ bom bốc thêm 1 lá rác từ tay Kinich (Video + Giọng lồng tiếng thật).',
    price: 155000,
    mp4Url: 'kinich_burst.mp4?v=57',
    audioUrl: 'kinich_burst.ogg?v=62',
    posterUrl: 'fanart/kinich.jpg?v=66',
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
    posterUrl: 'fanart/venti.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Khi thua ván được giảm 15% tiền phạt đếm lá + Có Hoạt Ảnh Nộ 5★ khi Chặt & Thắng.',
    price: 90000,
    mp4Url: 'qiqi_burst.mp4?v=61',
    audioUrl: 'qiqi_burst.ogg?v=62',
    posterUrl: 'fanart/qiqi.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Khi Về Nhất thu thêm +2× Mức cược từ mỗi nhà thua + Có Hoạt Ảnh Nộ 5★ khi Chặt & Thắng.',
    price: 95000,
    mp4Url: 'keqing_burst.mp4?v=61',
    audioUrl: 'keqing_burst.ogg?v=62',
    posterUrl: 'fanart/keqing.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Về Nhất thu thêm +1.5× cược mỗi nhà thua, khi thua được giảm 1× cược + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'mona_burst.mp4?v=61',
    audioUrl: 'mona_burst.ogg?v=62',
    posterUrl: 'fanart/mona.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Tăng +20% tiền thưởng khi Chặt Heo/Hàng và khi ăn Thối cuối ván + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'diluc_burst.mp4?v=61',
    audioUrl: 'diluc_burst.ogg?v=62',
    posterUrl: 'fanart/diluc.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Giảm 25% tiền phạt khi bị Chặt Heo/Hàng hoặc bị phạt Thối/Cóng cuối ván + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'jean_burst.mp4?v=61',
    audioUrl: 'jean_burst.ogg?v=62',
    posterUrl: 'fanart/jean.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Mỗi lần đánh Sảnh (≥ 4 lá) hoặc Sám Cô nhận ngay +0.5× cược (tối đa 3 lần/ván) + Có Hoạt Ảnh Nộ 5★.',
    price: 90000,
    mp4Url: 'tighnari_burst.mp4?v=61',
    audioUrl: 'tighnari_burst.ogg?v=62',
    posterUrl: 'fanart/tighnari.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Khi thua nặng (≥ 8 lá hoặc Cóng), giảm 25% tiền phạt các lá vượt ngưỡng 7 lá + Có Hoạt Ảnh Nộ 5★.',
    price: 90000,
    mp4Url: 'dehya_burst.mp4?v=61',
    audioUrl: 'dehya_burst.ogg?v=62',
    posterUrl: 'fanart/dehya.jpg?v=66',
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
    desc: '[5★ Thường • Lệch Rate] Không có Chiêu Nộ [Q] • Nội Tại Cược: Kết thúc mỗi ván (thắng hay thua) đều được Baku hồi cố định +1.5× Mức cược Xu + Có Hoạt Ảnh Nộ 5★.',
    price: 95000,
    mp4Url: 'mizuki_burst.mp4?v=61',
    audioUrl: 'mizuki_burst.ogg?v=62',
    posterUrl: 'fanart/mizuki.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🍃 NỘ 5★ THƯỜNG • MIZUKI (SECRET SPRING THERAPY)',
    title: 'MỘNG ĐẸP AN THẦN: LIỆU PHÁP SUỐI MƠ',
    quote: '“Xua Tan Ác Mộng — Hãy Thả Lỏng Và Chìm Vào Giấc Mơ Đẹp Nhé~”',
  },
  {
    id: 'klee',
    name: 'Klee — Tia Lửa Nảy Nổ',
    desc: '[Huyền Thoại] Kỵ Sĩ Tia Lửa ném Bom Nảy phá nát 1 bộ bài ghép (Đôi/Sám/Sảnh) trên tay đối thủ thành các lá lẻ rời rạc bậc thấp (Video + Giọng Nhật thật).',
    price: 135000,
    mp4Url: 'klee_burst.mp4?v=64',
    audioUrl: 'klee_burst.ogg?v=64',
    posterUrl: 'fanart/klee.jpg?v=66',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '💣 KỸ NĂNG NỘ • KLEE (SPARKS \'N\' SPLASH)',
    title: 'KỴ SĨ TIA LỬA: BOM NẢY JUMPY DUMPTY',
    quote: '“Hoa Lửa Rực Trời — Nổ Tung Hết Đi Nào~!”',
  },
  {
    id: 'albedo',
    name: 'Albedo — Giả Kim Thuật: Đại Địa Trào Dâng',
    desc: '[Huyền Thoại] Kreideprinz quét Mộ Bài từ đầu ván, tái tạo lá bài MẠNH NHẤT đã từng đánh ra trên bàn và biến 1 lá bài rác của Albedo thành bản sao của lá đó (Video + Giọng Nhật thật).',
    price: 135000,
    mp4Url: 'albedo_burst.mp4?v=64',
    audioUrl: 'albedo_burst.ogg?v=64',
    posterUrl: 'fanart/albedo.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '⚜️ KỸ NĂNG NỘ • ALBEDO (RITE OF PROGENITURE)',
    title: 'GIẢ KIM THUẬT: TÁI TẠO MỘ BÀI',
    quote: '“Khoảnh Khắc Khai Sinh — Chào Đón Sự Chuyển Hóa!”',
  },
  {
    id: 'varka',
    name: 'Varka — Bão Kiếm Bắc Phong',
    desc: '[Thần Thoại] Đại Đoàn Trưởng Tây Phong vung Song Kiếm Hợp Lực: Ghép 2 lá bài Lẻ khác số cộng gộp điểm lại thành 1 đòn Song Kiếm (tối đa cấp 2♥) đè thẳng lên Bài Lẻ lớn trên bàn (Video + Giọng Nhật thật).',
    price: 175000,
    mp4Url: 'varka_burst.mp4?v=64',
    audioUrl: 'varka_burst.ogg?v=64',
    posterUrl: 'fanart/varka.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'raiden',
    tag: '🗡️ KỸ NĂNG NỘ • VARKA (NORTHWIND TEMPEST)',
    title: 'ĐẠI ĐOÀN TRƯỞNG TÂY PHONG: SONG KIẾM HỢP LỰC',
    quote: '“Hỡi Ngọn Gió Phương Bắc — Chẻ Đôi Bầu Trời!”',
  },
  {
    id: 'nicole',
    name: 'Nicole Reeyn — Lời Tiên Tri Hexenzirkel',
    desc: '[Thần Thoại] Phù thủy Hội Ma Nữ xóa nhòa khoảng cách bậc số (3→A ngang nhau) trong vòng này: Đè bài cùng loại xét thuần bằng Chất (♠ < ♣ < ♦ < ♥)!',
    price: 175000,
    mp4Url: 'nicole_burst.mp4?v=64',
    audioUrl: 'nicole_burst.ogg?v=64',
    posterUrl: 'fanart/nicole.jpg?v=66',
    theme: 'theme-pyro',
    sfxType: 'skirk',
    tag: '🔮 KỸ NĂNG NỘ • NICOLE REEYN (FATE REWRITTEN)',
    title: 'HỘI MA NỮ HEXENZIRKEL: SỬA ĐỔI ĐỊNH MỆNH',
    quote: '“Hãy Lắng Nghe — Định Mệnh Của Thế Gian Đã Được Viết Lại!”',
  },
  {
    id: 'zhongli',
    name: 'Zhongli — Thiên Tinh',
    desc: '[Thần Thoại] Nham Vương Đế Quân giáng Thiên Tinh Hóa Đá khóa cứng toàn bộ lá bài chất Đen (♠, ♣) của mọi đối thủ trong vòng này!',
    price: 185000,
    mp4Url: 'zhongli_burst.mp4?v=64',
    audioUrl: 'zhongli_burst.ogg?v=64',
    posterUrl: 'fanart/zhongli.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '🪨 KỸ NĂNG NỘ • ZHONGLI (PLANET BEFALL)',
    title: 'NHAM VƯƠNG ĐẾ QUÂN: THIÊN TINH HÓA ĐÁ',
    quote: '“Thiên Động Vạn Tượng — Hóa Đá Vĩnh Hằng!”',
  },
  {
    id: 'baizhu',
    name: 'Baizhu — Phổ Độ Toàn Chân',
    desc: '[Huyền Thoại] Chủ Nhà Thuốc Bubu dùng Kim Chung Hồi Mạch: Tự hồi sinh quay lại vòng đấu dù đã Bỏ Lượt (cướp ngay lượt đánh) & tạo Khiên Trường Sinh miễn nhiễm bị Hàng chặt!',
    price: 145000,
    mp4Url: 'baizhu_burst.mp4?v=64',
    audioUrl: 'baizhu_burst.ogg?v=64',
    posterUrl: 'fanart/baizhu.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'skirk',
    tag: '🐍 KỸ NĂNG NỘ • BAIZHU (HOLISTIC REVIVIFICATION)',
    title: 'Y THUẬT TRƯỜNG SINH: KIM CHUNG HỒI MẠCH',
    quote: '“Sinh Tử Hữu Mệnh — Y Thuật Cứu Nhân Độ Thế!”',
  },
  {
    id: 'xianyun',
    name: 'Xianyun — Chạng Vạng Sao Trời',
    desc: '[Huyền Thoại] Lưu Vân Tá Phong Chân Quân ban Bộ Pháp Đằng Vân: Cho phép ghép và đánh Sảnh Nhảy Bậc Cách Đều +2 nút (VD: 3-5-7, 4-6-8-10)!',
    price: 150000,
    mp4Url: 'xianyun_burst.mp4?v=64',
    audioUrl: 'xianyun_burst.ogg?v=64',
    posterUrl: 'fanart/xianyun.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🦩 KỸ NĂNG NỘ • XIANYUN (STARS GATHER AT DUSK)',
    title: 'LƯU VÂN CHÂN QUÂN: BỘ PHÁP ĐẰNG VÂN',
    quote: '“Đạp Mây Lướt Gió — Nhảy Bậc Vượt Chín Tầng Trời!”',
  },
  {
    id: 'kazuha',
    name: 'Kaedehara Kazuha — Nhất Đao Vạn Diệp',
    desc: '[Huyền Thoại] Lãng khách cuốn Vạn Diệp Phong Vực: Nhuộm Đỏ toàn bộ bài trên tay Kazuha lên chất Cơ ♥ / Rô ♦ và thổi bạc màu toàn bộ bài đối thủ ít bài nhất xuống chất Bích ♠!',
    price: 160000,
    mp4Url: 'kazuha_burst.mp4?v=64',
    audioUrl: 'kazuha_burst.ogg?v=64',
    posterUrl: 'fanart/kazuha.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🍁 KỸ NĂNG NỘ • KAEDEHARA KAZUHA (KAZUHA SLASH)',
    title: 'NHẤT ĐAO VẠN DIỆP: VẠN DIỆP PHONG VỰC',
    quote: '“Lá Đỏ Bay Theo Gió — Mây Trời Dừng Bước Chân!”',
  },
  {
    id: 'itto',
    name: 'Arataki Itto — Quỷ Vương Nhất Đấu',
    desc: '[Huyền Thoại] Đại ca Bang Arataki ném Bò Ushi trấn giữ bàn bài: Khi đối thủ đánh đè lên bài của Itto, Bò Ushi sẽ lao ra HÚC VĂNG bộ bài đó và lập tức trả quyền đánh về lại cho Itto!',
    price: 145000,
    mp4Url: 'itto_burst.mp4?v=64',
    audioUrl: 'itto_burst.ogg?v=64',
    posterUrl: 'fanart/itto.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '👹 KỸ NĂNG NỘ • ARATAKI ITTO (ROYAL DESCENT)',
    title: 'NỘ MỤC QUỶ VƯƠNG: TUYỆT KỸ NÉM BÒ USHI',
    quote: '“Haha! Đến Giờ Cho Bọn Ngươi Thấy Sức Mạnh Của Bang Arataki Rồi!”',
  },
  {
    id: 'ayato',
    name: 'Kamisato Ayato — Thủy囿 (Vườn Nước Thanh Tịnh)',
    desc: '[Huyền Thoại] Gia chủ Kamisato tạo Thủy Ảnh Thế Thân: Khi đánh bộ bài trong lượt này, 1 lá rác nhỏ nhất sẽ bị tiêu hao thay thế còn lá chủ lực được giữ lại bản sao!',
    price: 150000,
    mp4Url: 'ayato_burst.mp4?v=64',
    audioUrl: 'ayato_burst.ogg?v=64',
    posterUrl: 'fanart/ayato.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🌊 KỸ NĂNG NỘ • KAMISATO AYATO (KAMISATO ART: SUIYUU)',
    title: 'KAMISATO LƯU: THỦY ẢNH THẾ THÂN',
    quote: '“Tất Cả Đều Nằm Trong Nước Cờ Của Ta!”',
  },
  {
    id: 'cyno',
    name: 'Cyno — Nghi Lễ Thần Dẫn Đường',
    desc: '[Huyền Thoại] Tổng Quản Mahamatra ban hành Thiết Quân Luật trong vòng này: CẤM toàn bộ đối thủ đánh ra các quân bài Hoàng Gia (J, Q, K, A, 2 — chỉ được đỡ bằng 3→10) & giáng cấp bài lớn trên bàn xuống 9!',
    price: 150000,
    mp4Url: 'cyno_burst.mp4?v=64',
    audioUrl: 'cyno_burst.ogg?v=64',
    posterUrl: 'fanart/cyno.jpg?v=66',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '🐺 KỸ NĂNG NỘ • CYNO (WOLF\'S SWIFTNESS)',
    title: 'TỔNG QUẢN MAHAMATRA: THIẾT QUÂN LUẬT',
    quote: '“Thiết Quân Luật Đã Ban — Phong Ấn Toàn Bộ Bài Hoàng Gia!”',
  },
  {
    id: 'nilou',
    name: 'Nilou — Vũ Điệu Hoa Sen: Suối Nguồn Viễn Mộng',
    desc: '[Huyền Thoại] Vũ công Nhà Hát Zubayr kích nổ Hạt Nhân Căng Tràn làm đồng loạt TẤT CẢ các bộ Đôi đang có trên tay Nilou tăng thêm +2 bậc số!',
    price: 150000,
    mp4Url: 'nilou_burst.mp4?v=64',
    audioUrl: 'nilou_burst.ogg?v=64',
    posterUrl: 'fanart/nilou.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '🪷 KỸ NĂNG NỘ • NILOU (DISTANT DREAMS, LISTENING SPRING)',
    title: 'VŨ ĐIỆU HOA SEN: HẠT NHÂN CĂNG TRÀN',
    quote: '“Tất Cả Ánh Nhìn — Hãy Cùng Hòa Vào Điệu Múa Này!”',
  },
  {
    id: 'nahida',
    name: 'Nahida — Ảo Ảnh Tâm Cảnh (Đền Maya)',
    desc: '[Thần Thoại] Thảo Thần mở Đền Tri Thức: Lật ngửa xem trước 3 lá bài lớn nhất của CẢ 3 ĐỐI THỦ trong 10 giây VÀ giảm -1 bậc lá bài cao nhất (dưới Heo) của mọi đối thủ!',
    price: 185000,
    mp4Url: 'nahida_burst.mp4?v=64',
    audioUrl: 'nahida_burst.ogg?v=64',
    posterUrl: 'fanart/nahida.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'skirk',
    tag: '🌱 KỸ NĂNG NỘ • NAHIDA (ILLUSORY HEART)',
    title: 'THẢO THẦN KUSANALI: ĐỀN CHÂN LÝ AKASHA',
    quote: '“Cùng Chia Sẻ Tri Thức — Mọi Bí Mật Đều Hiện Rõ!”',
  },
  {
    id: 'alhaitham',
    name: 'Alhaitham — Liên Kết Đặc Thù: Khung Cảnh Trói Buộc',
    desc: '[Huyền Thoại] Quan Thư Ký Giáo Viện giăng Ma Trận Phổ Quang: Khóa Bản Quyền Cấp Số vòng này — Mọi đối thủ CHỈ được đánh các bậc số hiện có trên tay Alhaitham!',
    price: 155000,
    mp4Url: 'alhaitham_burst.mp4?v=64',
    audioUrl: 'alhaitham_burst.ogg?v=64',
    posterUrl: 'fanart/alhaitham.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'raiden',
    tag: '📗 KỸ NĂNG NỘ • ALHAITHAM (FETTERS OF PHENOMENA)',
    title: 'QUAN THƯ KÝ GIÁO VIỆN: MA TRẬN PHỔ QUANG',
    quote: '“Quá Trình Tư Duy Hoàn Tất — Phản Chiếu Sự Thật!”',
  },
  {
    id: 'neuvillette',
    name: 'Neuvillette — Hỡi Nước Biển, Ta Đã Trở Về',
    desc: '[Thần Thoại] Thẩm Phán Tối Cao Fontaine gõ Cán Cân Tuyệt Đối: Chuyển thẳng các lá bài rác nhỏ nhất từ tay Neuvillette sang tay đối thủ đang ít bài nhất cho đến khi số lá hai bên bằng nhau (tối đa chuyển 3 lá)!',
    price: 185000,
    mp4Url: 'neuvillette_burst.mp4?v=64',
    audioUrl: 'neuvillette_burst.ogg?v=64',
    posterUrl: 'fanart/neuvillette.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '⚖️ KỸ NĂNG NỘ • NEUVILLETTE (O TIDES, I HAVE RETURNED)',
    title: 'THẨM PHÁN TỐI CAO: CÁN CÂN TUYỆT ĐỐI',
    quote: '“Thủy Triều Dâng Trào — Lắng Nghe Phán Quyết Cuối Cùng!”',
  },
  {
    id: 'wriothesley',
    name: 'Wriothesley — Cú Cắn Hắc Kim Lang',
    desc: '[Huyền Thoại] Công Tước Pháo Đài Meropide mở Đấu Trường Ngục Tù: CẤM toàn bộ đối thủ đánh Bài Lẻ 1 lá trong vòng này (chỉ được đánh Đôi/Sám/Sảnh ≥ 2 lá) & đấm vỡ Bài Lẻ trên bàn để cướp Cái!',
    price: 155000,
    mp4Url: 'wriothesley_burst.mp4?v=64',
    audioUrl: 'wriothesley_burst.ogg?v=64',
    posterUrl: 'fanart/wriothesley.jpg?v=66',
    theme: 'theme-cryo',
    sfxType: 'raiden',
    tag: '🥊 KỸ NĂNG NỘ • WRIOTHESLEY (DARKGOLD WOLFBITE)',
    title: 'CÔNG TƯỚC MEROPIDE: ĐẤU TRƯỜNG NGỤC TÙ',
    quote: '“Luật Của Meropide — Kẻ Nào Đánh Lẻ Sẽ Bị Đấm Vỡ Nát!”',
  },
  {
    id: 'sigewinne',
    name: 'Sigewinne — Ống Tiêm Siêu Đặc Biệt',
    desc: '[Huyền Thoại] Y Tá Trưởng Melusine mở Trạm Y Tế Meropide: Tiêm thuốc bổ chữa lành tối đa 3 lá bài nhỏ (3→7) trên tay tăng đồng loạt +2 bậc Đỏ (♥/♦) & thu 3× cược Xu viện phí từ đối thủ thắng vòng này!',
    price: 145000,
    mp4Url: 'sigewinne_burst.mp4?v=64',
    audioUrl: 'sigewinne_burst.ogg?v=64',
    posterUrl: 'fanart/sigewinne.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'skirk',
    tag: '💉 KỸ NĂNG NỘ • SIGEWINNE (SUPER SATURATED SYRINGING)',
    title: 'Y TÁ TRƯỞNG MELUSINE: TRẠM Y TẾ MEROPIDE',
    quote: '“Tiêm Thuốc Bổ Nào — Nhớ Đóng Đủ Viện Phí Đấy Nhé~!”',
  },
  {
    id: 'emilie',
    name: 'Emilie — Lọ Điều Hương Cấp Cao',
    desc: '[Huyền Thoại] Nhà điều hương Fontaine tỏa Tinh Dầu Khử Trùng chọn 1 Chất bài chủ đạo: Trong suốt vòng này, mọi bộ bài đối thủ đánh ra bắt buộc phải chứa ít nhất 1 lá mang Chất Hương Hoa đó!',
    price: 150000,
    mp4Url: 'emilie_burst.mp4?v=64',
    audioUrl: 'emilie_burst.ogg?v=64',
    posterUrl: 'fanart/emilie.jpg?v=66',
    theme: 'theme-geo',
    sfxType: 'skirk',
    tag: '🧪 KỸ NĂNG NỘ • EMILIE (AROMATIC EXPLICATION)',
    title: 'NHÀ ĐIỀU HƯƠNG: TINH DẦU KHỬ TRÙNG',
    quote: '“Hương Thơm Tinh Khiết — Thanh Lọc Mọi Tạp Chất!”',
  },
  {
    id: 'chasca',
    name: 'Chasca — Đạn Linh Hồn Đoạt Mệnh',
    desc: '[Huyền Thoại] Người Hòa Giải Tlalocan nạp 2 lá bài rác lẻ vào ổ súng Linh Hồn rồi bắn nối trực tiếp vào bộ Sảnh trên tay để kéo dài thêm +2 lá liên tiếp!',
    price: 155000,
    mp4Url: 'chasca_burst.mp4?v=64',
    audioUrl: 'chasca_burst.ogg?v=64',
    posterUrl: 'fanart/chasca.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'raiden',
    tag: '🔫 KỸ NĂNG NỘ • CHASCA (SOULREAPER\'S FATAL ROUND)',
    title: 'DÂY CƯƠNG TRUY ẢNH: ĐẠN LINH HỒN NỐI SẢNH',
    quote: '“Đã Ngắm Chuẩn — Đạn Linh Hồn Không Bao Giờ Trượt!”',
  },
  {
    id: 'tartaglia',
    name: 'Tartaglia — Cực Ác Kỹ: Tận Diệt Thủy Quang',
    desc: '[Huyền Thoại] Quan Chấp Hành thứ 11 chuyển đổi Cung Tên ⇄ Song Đao: Nếu có Sảnh 3 lá thì gom lại thành Sám Cô; nếu có Sám Cô / Đôi thì bắn trải ra thành Sảnh 3 lá!',
    price: 160000,
    mp4Url: 'tartaglia_burst.mp4?v=64',
    audioUrl: 'tartaglia_burst.ogg?v=64',
    posterUrl: 'fanart/tartaglia.jpg?v=66',
    theme: 'theme-hydro',
    sfxType: 'raiden',
    tag: '🐳 KỸ NĂNG NỘ • TARTAGLIA (HAVOC: OBLITERATION)',
    title: 'QUAN CHẤP HÀNH #11: CHUYỂN ĐỔI CUNG ĐAO',
    quote: '“Thời Khắc Giải Trí Kết Thúc — Đỡ Lấy Một Chiêu Này!”',
  },
  {
    id: 'arlecchino',
    name: 'Arlecchino — Trăng Máu Trỗi Dậy',
    desc: '[Thần Thoại] Quan Chấp Hành thứ 4 khắc Khế Ước Sinh Mệnh lên bàn: Bất kỳ đối thủ nào Bỏ Lượt trong vòng này sẽ bị nhét 1 lá rác của Arlecchino và nộp phạt 2× cược!',
    price: 185000,
    mp4Url: 'arlecchino_burst.mp4?v=64',
    audioUrl: 'arlecchino_burst.ogg?v=64',
    posterUrl: 'fanart/arlecchino.jpg?v=66',
    theme: 'theme-pyro',
    sfxType: 'raiden',
    tag: '🩸 KỸ NĂNG NỘ • ARLECCHINO (BALEFUL MOON RISING)',
    title: 'QUAN CHẤP HÀNH #4: KHẾ ƯỚC SINH MỆNH',
    quote: '“Dưới Ánh Trăng Đỏ — Mọi Kẻ Hèn Nhát Đều Phải Trả Giá!”',
  },
  {
    id: 'ineffa',
    name: 'Ineffa — Mệnh Lệnh Tối Thượng: Quét Sạch Toàn Diện',
    desc: '[Huyền Thoại] Cơ khí Lôi nguyên tố phát Xung Điện Cộng Hưởng: Quét toàn bộ tay đối thủ, làm đoản mạch các lá bài TRÙNG BẬC SỐ với chủ lực của Ineffa tụt thẳng về 3♠/4♠!',
    price: 155000,
    mp4Url: 'ineffa_burst.mp4?v=64',
    audioUrl: 'ineffa_burst.ogg?v=64',
    posterUrl: 'fanart/ineffa.jpg?v=66',
    theme: 'theme-electro',
    sfxType: 'raiden',
    tag: '🤖 KỸ NĂNG NỘ • INEFFA (SUPREME DIRECTIVE)',
    title: 'XUNG NHỊP CƠ KHÍ: XUNG ĐIỆN CỘNG HƯỞNG',
    quote: '“Giao Thức Tối Thượng Đã Kích Hoạt — Đồng Bộ Hóa Hoàn Tất!”',
  },
  {
    id: 'flins',
    name: 'Flins — Nghi Thức Cổ Xưa: Khách Viếng Đêm Khuya',
    desc: '[Huyền Thoại] Người Giữ Đèn Ratniki treo Ngọn Đèn Dẫn Hồn: Ngay khoảnh khắc có bất kỳ đối thủ nào Bỏ Lượt, lập tức kết thúc vòng đấu và trao thẳng quyền Cầm Cái về cho Flins!',
    price: 165000,
    mp4Url: 'flins_burst.mp4?v=64',
    audioUrl: 'flins_burst.ogg?v=64',
    posterUrl: 'fanart/flins.jpg?v=66',
    theme: 'theme-electro',
    sfxType: 'skirk',
    tag: '🏮 KỸ NĂNG NỘ • FLINS (COMETH THE NIGHT)',
    title: 'NGƯỜI GIỮ ĐÈN RATNIKI: NGỌN ĐÈN CƯỚP CÁI',
    quote: '“Ngọn Đèn Đêm Khuya Đã Cháy — Màn Đêm Này Thuộc Về Ta!”',
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
  klee: 'pyro',
  albedo: 'geo',
  varka: 'anemo',
  nicole: 'pyro',
  zhongli: 'geo',
  baizhu: 'dendro',
  xianyun: 'anemo',
  kazuha: 'anemo',
  itto: 'geo',
  ayato: 'hydro',
  cyno: 'electro',
  nilou: 'hydro',
  nahida: 'dendro',
  alhaitham: 'dendro',
  neuvillette: 'hydro',
  wriothesley: 'cryo',
  sigewinne: 'hydro',
  emilie: 'dendro',
  chasca: 'anemo',
  tartaglia: 'hydro',
  arlecchino: 'pyro',
  ineffa: 'electro',
  flins: 'electro',
};

// attackerElem: nguyên tố của người ĐANG ĐÁNH (người kích hoạt phản ứng)
// defenderElem: nguyên tố của người ĐANG GIỮ BÀI TRÊN BÀN (ấn nguyên tố có sẵn)
// Lưu ý chuẩn Genshin Impact:
// - Hệ Phong (anemo) và Hệ Nham (geo) KHÔNG để lại ấn nguyên tố trên bàn -> Nhân vật hệ khác đánh đè lên bài của Phong/Nham KHÔNG THỂ kích Khuếch Tán hay Kết Tinh!
// - Chỉ khi chính nhân vật hệ Phong (anemo) hoặc Nham (geo) đánh đè lên bài của hệ Hỏa/Thủy/Lôi/Băng mới kích hoạt được Khuếch Tán (Swirl) hoặc Kết Tinh (Crystallize)!
function checkGenuineGenshinReaction(attackerElem, defenderElem) {
  if (!attackerElem || !defenderElem || attackerElem === defenderElem) return false;
  if (defenderElem === 'anemo' || defenderElem === 'geo') return false;
  if (attackerElem === 'anemo') {
    return defenderElem === 'pyro' || defenderElem === 'hydro' || defenderElem === 'electro' || defenderElem === 'cryo';
  }
  if (attackerElem === 'geo') {
    return defenderElem === 'pyro' || defenderElem === 'hydro' || defenderElem === 'electro' || defenderElem === 'cryo';
  }
  const pair = new Set([attackerElem, defenderElem]);
  if (pair.has('pyro') && (pair.has('hydro') || pair.has('cryo') || pair.has('electro') || pair.has('dendro'))) return true;
  if (pair.has('hydro') && (pair.has('electro') || pair.has('cryo') || pair.has('dendro'))) return true;
  if (pair.has('electro') && (pair.has('cryo') || pair.has('dendro'))) return true;
  return false;
}

function resolveGenshinReaction(attackerElem, defenderElem) {
  if (!checkGenuineGenshinReaction(attackerElem, defenderElem)) return null;
  if (attackerElem === 'anemo') {
    return {
      shortName: '🍃🌀 Khuếch Tán (Swirl)',
      badge: '🍃🌀 PHẢN ỨNG KHUẾCH TÁN (SWIRL)',
      cssClass: 'reaction-frozen',
    };
  }
  if (attackerElem === 'geo') {
    return {
      shortName: '💎🪨 Kết Tinh (Crystallize)',
      badge: '💎🪨 PHẢN ỨNG KẾT TINH (CRYSTALLIZE)',
      cssClass: 'reaction-crystallize',
    };
  }
  const pair = new Set([attackerElem, defenderElem]);
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
      id: 'bloom',
      isBloom: true,
      shortName: '🌿💧 Sum Suê (Bloom)',
      badge: '🌿💧 PHẢN ỨNG SUM SUÊ (BLOOM)',
      cssClass: 'reaction-bloom',
      multiplier: 5,
    };
  }
  return null;
}

// ============================================================================
// HỆ THỐNG 20 KỸ NĂNG CHIẾN THUẬT NHÂN VẬT 5★ (MỖI VÁN DÙNG 1 LẦN • CÂN BẰNG)
// ============================================================================
let activeFurinaReverseSuit = false;
let activeNaviaLockedCardIds = new Set();
let activeZhongliPetrifiedCardIds = new Set();
let activeShenheSingleOnly = false;
let activeGanyuGapStraight = false;
let activeKokomiReverseRank = false;
let activeMualaniCrossBeat = false;
let activeXiaoPlungeSingle = false;
let activeNicoleSuitOnlyRound = false;
let activeXianyunStepStraight = false;
let activeWriothesleyPairSmash = false;
let activeWriothesleyNoSingle = false;
let activeVarkaSumSlash = false;
let activeAlhaithamAllowedRanks = null;
let activeEmilieStepCap = false;
let activeZibaiMinStep = false;
let activeCynoRoyalBan = false;
let activeYelanSameParity = false;
let activeBaizhuShield = false;
let activeMavuikaWrapStraight = false;
let activeNaviaFlushStraight = false;
let activeXiaoKarmaMaxRank = null;
let activeEmilieRequiredSuit = null;

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
    name: 'Vòng Lửa Thái Dương',
    shortDesc: 'Trong lượt này: Cho phép Mavuika ghép Heo (2) nối liền với A và vòng qua 3 - 4 để đánh ra Sảnh Vòng Tròn (VD: K-A-2, Q-K-A-2-3, A-2-3-4) đè được mọi Sảnh cùng độ dài trên bàn!',
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
    name: 'Sòng Bạc Dạ Lan',
    shortDesc: 'Mở Sòng Bạc Xúc Xắc trong vòng này: Khóa Luật Đồng Chẵn/Lẻ (mọi đối thủ đè bài bắt buộc phải đánh bộ có lá cao nhất CÙNG BẬC CHẴN hoặc CÙNG BẬC LẺ với bộ trên bàn) & thấu thị 2 lá bài đối thủ!',
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
    name: 'Pháo Dù Phỏm Pha Lê',
    shortDesc: 'Trong lượt này: Mặc kệ đối thủ đang đánh bài gì trên bàn (Cóc lẻ, Đôi, Sảnh, Heo hay Hàng...), chỉ cần Navia đánh ra một bộ Sảnh Đồng Chất (≥ 3 lá liên tiếp cùng chất) hoặc Sám Cô (giống bộ Phỏm) là đều CHẶT ĐÈ được tất cả!',
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
    name: 'Dây Pháo Liên Hoàn',
    shortDesc: 'Trong lượt này: Khi Yoimiya đánh ra 1 lá bài (hoặc 1 Đôi), tất cả các lá bài có bậc số liên tiếp ngay phía trên nó trên tay Yoimiya sẽ tự động bắt lửa nổ dây chuyền bay ra bàn cùng lúc và chốt bàn ở lá cao nhất!',
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
    name: 'Gối Ôm Ký Sinh',
    shortDesc: 'Gắn Gối Citlalin ký sinh lên đối thủ đang ít bài nhất trong vòng này: Hễ đối thủ đó đánh ra bao nhiêu lá bài, Citlali tự động được vứt bỏ theo bấy nhiêu lá bài rác nhỏ nhất trên tay mình!',
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
    name: 'Tuyệt Kỹ Đôi Thông',
    shortDesc: 'Khi sắp có Đôi Thông (VD: Đôi 5, Đôi 6, Lẻ 7): Lập tức thêm lá còn thiếu (con 7) vào tay mình để hoàn thiện Đôi Thông và bỏ đi 1 lá bài rác!',
  },
  zibai: {
    id: 'zibai',
    charName: 'Zibai',
    icon: '🐎',
    name: 'Bạch Mã Vượt Tuyến',
    shortDesc: 'Chỉ định thẳng đối thủ NHIỀU BÀI NHẤT phải đỡ bài kế tiếp (lướt qua các nhà ít bài ngồi giữa) & ép mọi đối thủ muốn đè bài trong vòng này phải lớn hơn tối thiểu +2 bậc số (cấm đè đồng số hoặc +1 bậc)!',
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
    name: 'Mặt Hồ Đối Xứng',
    shortDesc: 'Phản chiếu đối xứng 3 lá bài nhỏ nhất trên tay Odette qua trục gương bàn bài (3➔A, 4➔K, 5➔Q, 6➔J, 7➔10, 8➔9) — biến ngay các quân bài đáy sổ thành dàn bài đại gia!',
  },
  vesna: {
    id: 'vesna',
    charName: 'Vesna',
    icon: '🍃',
    name: 'Gió Xuân Đoạt Cái',
    shortDesc: 'Nở hoa biến 2 lá chất Đen (♠/♣) nhỏ nhất trên tay thành Cơ ♥ & yểm Gió Xuân: Nếu vòng này kết thúc bằng bộ bài có lá chất Đỏ (♥/♦) của đối thủ, Vesna sẽ TỊCH THU QUYỀN CẦM CÁI mở vòng mới!',
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
    shortDesc: 'Đổi ngẫu nhiên lá bài trên tay thành bộ bài VỪA ĐỦ (lớn hơn đúng 1 nấc chất/số hoặc ghép Hàng nhỏ nhất) để chặt/đè ngay bộ bài của đối thủ trên bàn!',
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
    name: 'Ách Nạn Nghiệp Chướng',
    shortDesc: 'Phóng thích Nghiệp Chướng bao trùm vòng này: Mọi đối thủ chỉ được phép đánh ra quân bài có bậc số tối đa bằng số lá bài họ đang cầm trên tay (+3) — Kẻ càng ít bài càng bị đè thấp!',
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
    shortDesc: 'Đặt Bom Pixel Ajaw lên bàn bài: Kể từ sau khi Kinich kích hoạt chiêu, bất kỳ đối thủ nào đi sau Kinich có đánh bài trong vòng đó đều bị nổ bom bốc thêm 1 lá bài rác nhỏ nhất từ tay Kinich!',
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
  klee: {
    id: 'klee',
    charName: 'Klee',
    icon: '💣',
    name: 'Bom Nảy Jumpy Dumpty',
    shortDesc: 'Ném Bom Nảy vào tay đối thủ đang ít bài nhất, nổ tung 1 bộ bài ghép (Đôi/Sám Cô/Sảnh) của họ thành các lá bài lẻ rời rạc bậc thấp (3→8)!',
  },
  albedo: {
    id: 'albedo',
    charName: 'Albedo',
    icon: '⚜️',
    name: 'Giả Kim Mộ Bài',
    shortDesc: 'Quét toàn bộ Mộ Bài (các lá đã đánh ra từ đầu ván), chọn lá bài MẠNH NHẤT trong Mộ Bài và luyện kim biến 1 lá bài rác trên tay Albedo thành bản sao của lá đó!',
  },
  varka: {
    id: 'varka',
    charName: 'Varka',
    icon: '🗡️',
    name: 'Song Kiếm Hợp Lực',
    shortDesc: 'Trong lượt này: Cho phép Varka ghép 2 lá bài Lẻ khác số bất kỳ cộng gộp điểm lại thành 1 đòn Song Kiếm (tối đa cấp Heo Cơ 2♥) để chém đè trực tiếp lên Bài Lẻ trên bàn!',
  },
  nicole: {
    id: 'nicole',
    charName: 'Nicole Reeyn',
    icon: '🔮',
    name: 'Sửa Đổi Định Mệnh',
    shortDesc: 'Trong vòng này: Xóa nhòa khoảng cách bậc số (3→A ngang bằng nhau khi đè cùng loại) — đè bài xét thuần bằng Chất (♠ < ♣ < ♦ < ♥, VD: 4♥ đè A♦)!',
  },
  zhongli: {
    id: 'zhongli',
    charName: 'Zhongli',
    icon: '🪨',
    name: 'Thiên Tinh Hóa Đá',
    shortDesc: 'Thả Thiên Tinh hóa đá khóa cứng toàn bộ các lá bài chất Đen (♠, ♣) trên tay TẤT CẢ đối thủ trong vòng này (chỉ được đánh bài Đỏ ♦, ♥) & tạo Khiên Ngọc!',
  },
  baizhu: {
    id: 'baizhu',
    charName: 'Baizhu',
    icon: '🐍',
    name: 'Kim Chung Hồi Mạch',
    shortDesc: 'Hồi Sinh Vòng Đấu & Khiên Trường Sinh: Tự hồi sinh quay lại vòng dù đã Bỏ Lượt (cướp ngay lượt đánh) & tạo Khiên Ngọc giúp bộ bài Baizhu đánh ra MIỄN NHIỄM BỊ CHẶT (Hàng không thể chặt)!',
  },
  xianyun: {
    id: 'xianyun',
    charName: 'Xianyun',
    icon: '🦩',
    name: 'Bộ Pháp Đằng Vân',
    shortDesc: 'Trong lượt này: Cho phép ghép và đánh Sảnh Nhảy Bậc Cách Đều +2 nút (VD: 3-5-7, 4-6-8-10, 7-9-J-K) được tính là Sảnh hợp lệ!',
  },
  kazuha: {
    id: 'kazuha',
    charName: 'Kaedehara Kazuha',
    icon: '🍁',
    name: 'Vạn Diệp Phong Vực',
    shortDesc: 'Cuốn lá phong đỏ nhuộm TOÀN BỘ bài trên tay Kazuha lên chất Đỏ cao nhất (Cơ ♥ / Rô ♦), đồng thời thổi bạc màu TOÀN BỘ bài của đối thủ ít bài nhất xuống chất Bích ♠!',
  },
  itto: {
    id: 'itto',
    charName: 'Arataki Itto',
    icon: '👹',
    name: 'Tuyệt Kỹ Ném Bò Ushi',
    shortDesc: 'Triệu hồi Bò Ushi trấn giữ bàn bài trong vòng này: Lần đầu tiên có đối thủ đánh đè lên bài của Itto, Bò Ushi sẽ lao ra HÚC VĂNG bộ bài đó và lập tức trả quyền đánh về lại cho Itto!',
  },
  ayato: {
    id: 'ayato',
    charName: 'Kamisato Ayato',
    icon: '🌊',
    name: 'Thủy Ảnh Thế Thân',
    shortDesc: 'Bật Phân Thân Nước trong lượt này: Khi đánh bộ bài ra bàn, 1 lá rác nhỏ nhất trên tay sẽ bị tiêu hao thế chỗ, còn lá lớn nhất vừa đánh được giữ lại bản sao (-1 bậc)!',
  },
  cyno: {
    id: 'cyno',
    charName: 'Cyno',
    icon: '🐺',
    name: 'Thiết Quân Luật Mahamatra',
    shortDesc: 'Cắm Quyền Trượng Xích Sa ban hành Thiết Quân Luật trong vòng này: CẤM toàn bộ đối thủ đánh ra các quân bài Hoàng Gia (J, Q, K, A, 2 — chỉ được đỡ bằng 3→10) & giáng cấp bài lớn trên bàn xuống bậc 9!',
  },
  nilou: {
    id: 'nilou',
    charName: 'Nilou',
    icon: '🪷',
    name: 'Hạt Nhân Căng Tràn',
    shortDesc: 'Kích nổ Hạt Nhân Sum Suê làm đồng loạt TẤT CẢ các bộ Đôi đang có trên tay Nilou cùng tăng thêm +2 bậc số (tối đa lên Đôi A)!',
  },
  nahida: {
    id: 'nahida',
    charName: 'Nahida',
    icon: '🌱',
    name: 'Đền Chân Lý Akasha',
    shortDesc: 'Kết nối Ấn Skandha lật ngửa 3 lá bài lớn nhất của CẢ 3 ĐỐI THỦ trong 10 giây VÀ giảm -1 bậc số lá bài lớn nhất (dưới Heo) của toàn bộ đối thủ!',
  },
  alhaitham: {
    id: 'alhaitham',
    charName: 'Alhaitham',
    icon: '📗',
    name: 'Ma Trận Phổ Quang',
    shortDesc: 'Khóa Bản Quyền Cấp Số trong vòng này: Mọi đối thủ CHỈ ĐƯỢC PHÉP đánh ra bộ bài có bậc số trùng với các bậc số hiện có trên tay Alhaitham (các bậc số khác bị cấm đánh)!',
  },
  neuvillette: {
    id: 'neuvillette',
    charName: 'Neuvillette',
    icon: '⚖️',
    name: 'Cán Cân Tuyệt Đối',
    shortDesc: 'Gõ trượng Cán Cân Công Lý chuyển thẳng các lá bài rác nhỏ nhất từ tay Neuvillette sang tay đối thủ đang ít bài nhất cho đến khi số lá bài của hai bên bằng nhau (tối đa chuyển 3 lá)!',
  },
  wriothesley: {
    id: 'wriothesley',
    charName: 'Wriothesley',
    icon: '🥊',
    name: 'Đấu Trường Ngục Tù',
    shortDesc: 'Đấm sập sàn đấu mở Luật Ngục Tù Meropide trong vòng này: CẤM toàn bộ đối thủ đánh Bài Lẻ 1 lá (bắt buộc chỉ được đánh Đôi, Sám Cô hoặc Sảnh ≥ 2 lá) & đấm vỡ Bài Lẻ trên bàn để cướp Cái!',
  },
  sigewinne: {
    id: 'sigewinne',
    charName: 'Sigewinne',
    icon: '💉',
    name: 'Trạm Y Tế Meropide',
    shortDesc: 'Bắn Mũi Tiêm Dinh Dưỡng chữa lành tối đa 3 lá bài nhỏ (3→7) trên tay Sigewinne tăng đồng loạt +2 bậc Đỏ (♥/♦) & gắn Tim Thuốc: Nếu đối thủ thắng vòng này phải trả 3× cược Xu viện phí cho Sigewinne!',
  },
  emilie: {
    id: 'emilie',
    charName: 'Emilie',
    icon: '🧪',
    name: 'Tinh Dầu Khử Trùng',
    shortDesc: 'Tỏa hương nước hoa chọn 1 Chất bài chủ đạo (♠, ♣, ♦ hoặc ♥ mà Emilie có nhiều nhất): Trong suốt vòng này, mọi bộ bài đối thủ đánh ra bắt buộc phải chứa ít nhất 1 lá mang Chất Hương Hoa đó!',
  },
  chasca: {
    id: 'chasca',
    charName: 'Chasca',
    icon: '🔫',
    name: 'Đạn Linh Hồn Nối Sảnh',
    shortDesc: 'Nạp 2 lá bài rác lẻ nhỏ nhất vào ổ súng Linh Hồn rồi bắn nối trực tiếp vào bộ Sảnh trên tay để kéo dài thành Sảnh Lớn dài hơn thêm +2 lá!',
  },
  tartaglia: {
    id: 'tartaglia',
    charName: 'Tartaglia',
    icon: '🐳',
    name: 'Chuyển Đổi Cung ⇄ Đao',
    shortDesc: 'Hoán đổi thế võ: Nếu có Sảnh 3 lá thì rút Song Đao gom về cùng bậc thành 1 bộ Sám Cô; nếu có Sám Cô / Đôi thì đổi Cung Tên bắn trải thành Sảnh 3 lá liên tiếp!',
  },
  arlecchino: {
    id: 'arlecchino',
    charName: 'Arlecchino',
    icon: '🩸',
    name: 'Khế Ước Sinh Mệnh',
    shortDesc: 'Khắc Khế Ước Sinh Mệnh lên bàn trong vòng này: Bất kỳ đối thủ nào bấm Bỏ Lượt sẽ bị phạt nhận ngay 1 lá bài rác nhỏ nhất từ tay Arlecchino và nộp 2× mức cược Xu!',
  },
  ineffa: {
    id: 'ineffa',
    charName: 'Ineffa',
    icon: '🤖',
    name: 'Xung Điện Cộng Hưởng',
    shortDesc: 'Phát xung điện từ theo bậc số chủ lực của Ineffa: Quét toàn bộ tay đối thủ, làm đoản mạch các lá bài TRÙNG BẬC SỐ tụt thẳng xuống phế liệu 3♠/4♠!',
  },
  flins: {
    id: 'flins',
    charName: 'Flins',
    icon: '🏮',
    name: 'Ngọn Đèn Dẫn Hồn',
    shortDesc: 'Treo Ngọn Đèn Linh Hồn lên bàn trong vòng này: Ngay khoảnh khắc có bất kỳ 1 đối thủ nào Bỏ Lượt, lập tức kết thúc vòng đấu và trao thẳng quyền Mở Vòng Mới về cho Flins!',
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
  } else if (cls === 'reaction-hyperbloom') {
    ringColor = '#c084fc';
    clashIcons = '🌿 💧 ⚡';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#4ade80" stroke-width="5" stroke-dasharray="12 6"/>
      <circle cx="200" cy="140" r="64" fill="none" stroke="#38bdf8" stroke-width="4"/>
      <polyline points="75,140 145,95 175,160 225,85 265,155 325,120" fill="none" stroke="#d8b4fe" stroke-width="6"/>
    `;
    particles = ['🌿', '💧', '⚡', '🌱', '💜', '⚡', '✨', '💥'];
  } else if (cls === 'reaction-burgeon') {
    ringColor = '#fb923c';
    clashIcons = '🌿 💧 🔥';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#4ade80" stroke-width="5" stroke-dasharray="12 6"/>
      <polygon points="200,28 232,106 312,140 232,174 200,252 168,174 88,140 168,106" fill="rgba(249,115,22,0.22)" stroke="#fb923c" stroke-width="5"/>
    `;
    particles = ['🌿', '💧', '🔥', '🌱', '💥', '🔥', '✨', '🧨'];
  } else if (cls === 'reaction-lunar-electrocharged') {
    ringColor = '#e9d5ff';
    clashIcons = '🌙 ⚡ 💧';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#c084fc" stroke-width="5" stroke-dasharray="14 6"/>
      <circle cx="200" cy="140" r="64" fill="none" stroke="#38bdf8" stroke-width="4.5"/>
      <polyline points="70,135 140,95 170,160 225,85 265,155 330,115" fill="none" stroke="#fef08a" stroke-width="6"/>
    `;
    particles = ['🌙', '⚡', '💧', '✨', '🌙', '⚡', '🌊', '💜'];
  } else if (cls === 'reaction-lunar-crystallize') {
    ringColor = '#fde047';
    clashIcons = '🌙 💎 💧';
    svgInner = `
      <polygon points="200,28 282,140 200,252 118,140" fill="rgba(250,204,21,0.2)" stroke="#fde047" stroke-width="5"/>
      <circle cx="200" cy="140" r="78" fill="none" stroke="#38bdf8" stroke-width="4.5" stroke-dasharray="12 6"/>
    `;
    particles = ['🌙', '💎', '💧', '🪨', '✨', '🌙', '💎', '🌊'];
  } else if (cls === 'reaction-lunar-bloom') {
    ringColor = '#6ee7b7';
    clashIcons = '🌙 🌿 💧';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#34d399" stroke-width="5" stroke-dasharray="12 6"/>
      <circle cx="200" cy="140" r="64" fill="none" stroke="#38bdf8" stroke-width="4.5"/>
      <polygon points="200,40 225,115 300,140 225,165 200,240 175,165 100,140 175,115" fill="rgba(52,211,153,0.2)" stroke="#a7f3d0" stroke-width="4"/>
    `;
    particles = ['🌙', '🌿', '💧', '🌱', '✨', '🌙', '🌿', '🌊'];
  } else if (cls === 'reaction-astral-superconduct') {
    ringColor = '#a5f3fc';
    clashIcons = '✨ ❄️ ⚡';
    svgInner = `
      <polygon points="200,24 226,108 312,140 226,172 200,256 174,172 88,140 174,108" fill="rgba(165,243,252,0.22)" stroke="#67e8f9" stroke-width="5"/>
      <polyline points="75,140 145,90 175,160 230,85 325,140" fill="none" stroke="#e879f9" stroke-width="5.5"/>
    `;
    particles = ['✨', '❄️', '⚡', '🌟', '🧊', '⚡', '✨', '💜'];
  } else if (cls === 'reaction-astral-swirl') {
    ringColor = '#99f6e4';
    clashIcons = '✨ 🍃 ❄️';
    svgInner = `
      <circle cx="200" cy="140" r="88" fill="none" stroke="#2dd4bf" stroke-width="5" stroke-dasharray="14 6"/>
      <circle cx="200" cy="140" r="62" fill="none" stroke="#bae6fd" stroke-width="4.5"/>
      <path d="M110,165 Q165,65 205,140 T295,100" fill="none" stroke="#f0fdfa" stroke-width="5.5" stroke-linecap="round"/>
    `;
    particles = ['✨', '🍃', '❄️', '🌪️', '🌟', '❄️', '🍃', '💎'];
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
    return `<img class="anime-avatar-img" src="${found.imgUrl}" alt="" onerror="this.style.display='none'" referrerpolicy="no-referrer" />`;
  }
  if (typeof mappedId === 'string' && (mappedId.startsWith('http') || mappedId.startsWith('fanart/'))) {
    return `<img class="anime-avatar-img" src="${mappedId}" alt="" onerror="this.style.display='none'" referrerpolicy="no-referrer" />`;
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
    if (activeVarkaSumSlash) {
      const face0 = sorted[0].rankIndex + 3;
      const face1 = sorted[1].rankIndex + 3;
      const sumRank = Math.min(12, Math.max(sorted[1].rankIndex + 1, face0 + face1 - 3));
      const sumSuit = sumRank === 12 ? 3 : Math.max(sorted[0].suitIndex, sorted[1].suitIndex, 2);
      const virtualHighCard = {
        ...highCard,
        rankIndex: sumRank,
        suitIndex: sumSuit,
        rank: RANKS[sumRank],
        suit: SUITS[sumSuit],
        isRed: sumSuit >= 2,
        value: sumRank * 4 + sumSuit,
      };
      return {
        type: COMBO_TYPES.SINGLE,
        cards: sorted,
        length: 1,
        highCard: virtualHighCard,
        highValue: virtualHighCard.value,
        highRank: sumRank,
        isVarkaSumSlash: true,
        label: `Song Kiếm Hợp Lực (${sorted[0].rank}${sorted[0].suit}+${sorted[1].rank}${sorted[1].suit} ➔ Cấp ${RANKS[sumRank]}${SUITS[sumSuit]} 🗡️)`,
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
        isNaviaPhom: true,
        label: activeNaviaFlushStraight
          ? `Phỏm Sám Cô ${highCard.rank} ☂️`
          : `Sám cô ${highCard.rank}`,
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
      const isSameSuitStraight = sorted.every((c) => c.suitIndex === sorted[0].suitIndex);
      return {
        type: COMBO_TYPES.STRAIGHT,
        cards: sorted,
        length: n,
        highCard,
        highValue,
        highRank,
        isSameSuitStraight,
        isNaviaPhom: isSameSuitStraight,
        label: isSameSuitStraight
          ? activeNaviaFlushStraight
            ? `Phỏm Sảnh Đồng Chất ${n} lá (${sorted[0].rank}${sorted[0].suit}→${highCard.rank}${highCard.suit} ☂️)`
            : `Sảnh Đồng Chất ${n} lá (${sorted[0].rank}${sorted[0].suit}→${highCard.rank}${highCard.suit})`
          : `Sảnh ${n} lá (${sorted[0].rank}→${highCard.rank}${highCard.suit})`,
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
    // Bộ Pháp Đằng Vân (Xianyun): Cho phép đánh Sảnh Nhảy Bậc Cách Đều +2 nút (VD: 3-5-7, 4-6-8-10)
    if (activeXianyunStepStraight) {
      let isStep2 = true;
      for (let i = 1; i < n; i++) {
        if (sorted[i].rankIndex !== sorted[i - 1].rankIndex + 2) {
          isStep2 = false;
          break;
        }
      }
      if (isStep2) {
        return {
          type: COMBO_TYPES.STRAIGHT,
          cards: sorted,
          length: n,
          highCard,
          highValue,
          highRank,
          isStepStraight: true,
          label: `Sảnh Đằng Vân ${n} lá (${sorted[0].rank}→${highCard.rank}${highCard.suit} 🦩)`,
        };
      }
    }
  }

  // Vòng Lửa Thái Dương (Mavuika): Cho phép ghép Heo (2) nối liền với A và vòng qua 3-4 tạo Sảnh Vòng Tròn Xuyên Heo (VD: K-A-2, Q-K-A-2-3, A-2-3-4)
  if (n >= 3 && activeMavuikaWrapStraight) {
    let distinctRanks = true;
    for (let i = 1; i < n; i++) {
      if (sorted[i].rankIndex === sorted[i - 1].rankIndex) {
        distinctRanks = false;
        break;
      }
    }
    if (distinctRanks && sorted[n - 1].rankIndex === 12 && n <= 12) {
      const rankSet = new Set(sorted.map((c) => c.rankIndex));
      let wrapStart = -1;
      for (let s = 0; s < 13; s++) {
        let okWrap = true;
        for (let k = 0; k < n; k++) {
          if (!rankSet.has((s + k) % 13)) {
            okWrap = false;
            break;
          }
        }
        if (okWrap) {
          wrapStart = s;
          break;
        }
      }
      if (wrapStart !== -1) {
        const byR = new Map(sorted.map((c) => [c.rankIndex, c]));
        const orderedWrap = [];
        for (let k = 0; k < n; k++) {
          orderedWrap.push(byR.get((wrapStart + k) % 13));
        }
        return {
          type: COMBO_TYPES.STRAIGHT,
          cards: sorted,
          length: n,
          highCard,
          highValue,
          highRank,
          isWrapStraight: true,
          label: `Sảnh Vòng Lửa ${n} lá (${orderedWrap.map((c) => c.rank).join('-')} 🔥)`,
        };
      }
    }
  }

  return null;
}

function canBeatCombo(candidate, current) {
  if (!candidate) return { ok: false, isChop: false };

  // Pháo Kích Khóa Bài (Navia) & Thiên Tinh Hóa Đá (Zhongli): Không thể đánh ra các lá bài đang bị khóa trong vòng này
  if (
    candidate.cards &&
    candidate.cards.some(
      (c) =>
        (activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(c.id)) ||
        (activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(c.id))
    )
  ) {
    return {
      ok: false,
      isChop: false,
      reason: '🔒 Có lá bài đang bị Pháo Kích (Navia) hoặc Thiên Tinh Hóa Đá (Zhongli) khóa cứng trong vòng này!',
    };
  }

  // Pháo Dù Phỏm Pha Lê (Navia): Mặc kệ đối thủ đánh gì trên bàn, chỉ cần Navia đánh ra Sảnh Đồng Chất hoặc Sám Cô (bộ Phỏm) là đều CHẶT ĐÈ được tất cả!
  const isNaviaPhomChop =
    Boolean(activeNaviaFlushStraight) &&
    (candidate.type === COMBO_TYPES.TRIPLE ||
      (candidate.type === COMBO_TYPES.STRAIGHT && Boolean(candidate.isSameSuitStraight)));
  if (isNaviaPhomChop && current) {
    if (current.baizhuShielded || activeBaizhuShield) {
      return {
        ok: false,
        isChop: false,
        reason: '🐍 Khiên Trường Sinh (Baizhu): Bộ bài này đang được Khiên Ngọc bảo hộ — Miễn nhiễm bị chặt!',
      };
    }
    return {
      ok: true,
      isChop: true,
      chopReason: `Phỏm Pha Lê (${candidate.label}) chặt ${current.label}!`,
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

  // Đấu Trường Ngục Tù (Wriothesley): Cấm đối thủ đánh Bài Lẻ 1 lá trong vòng hiện tại (bắt buộc đánh Đôi, Sám Cô, Sảnh hoặc Hàng)
  if (activeWriothesleyNoSingle && !candidate.isBomb && candidate.type === COMBO_TYPES.SINGLE) {
    return {
      ok: false,
      isChop: false,
      reason: '🥊 Đấu Trường Ngục Tù (Wriothesley): Vòng này CẤM đánh Bài Lẻ 1 lá — Chỉ được đánh Đôi, Sám Cô hoặc Sảnh (≥ 2 lá)!',
    };
  }

  // Thiết Quân Luật Mahamatra (Cyno): Cấm đối thủ đánh các quân bài Hoàng Gia (J, Q, K, A, 2) trong vòng hiện tại (chỉ được đánh 3→10)
  if (
    activeCynoRoyalBan &&
    !candidate.isBomb &&
    candidate.cards &&
    candidate.cards.some((c) => c.rankIndex >= 8)
  ) {
    return {
      ok: false,
      isChop: false,
      reason: '🐺 Thiết Quân Luật (Cyno): Vòng này phong ấn toàn bộ quân Hoàng Gia (J, Q, K, A, 2) — Chỉ được đánh các lá từ 3 đến 10!',
    };
  }

  // Ma Trận Phổ Quang (Alhaitham): Đối thủ chỉ được phép đánh bộ bài có bậc số nằm trong các bậc Alhaitham đang sở hữu
  if (
    activeAlhaithamAllowedRanks &&
    activeAlhaithamAllowedRanks.size > 0 &&
    !candidate.isBomb &&
    !activeAlhaithamAllowedRanks.has(candidate.highRank)
  ) {
    return {
      ok: false,
      isChop: false,
      reason: '📗 Ma Trận Phổ Quang (Alhaitham): Bậc số này không có trong phổ bài của Alhaitham nên bị khóa trong vòng này!',
    };
  }

  // Ách Nạn Nghiệp Chướng (Xiao): Mọi đối thủ chỉ được phép đánh ra quân bài có bậc số tối đa bằng số lá bài họ đang cầm trên tay (+3)
  if (
    activeXiaoKarmaMaxRank !== null &&
    !candidate.isBomb &&
    candidate.cards &&
    candidate.cards.some((c) => c.rankIndex > activeXiaoKarmaMaxRank)
  ) {
    const capRankName = RANKS[Math.min(12, Math.max(0, activeXiaoKarmaMaxRank))];
    return {
      ok: false,
      isChop: false,
      reason: `👹 Ách Nạn Nghiệp Chướng (Xiao): Bạn đang cầm ít bài nên chỉ được phép đánh quân bài tối đa đến bậc ${capRankName}!`,
    };
  }

  // Tinh Dầu Khử Trùng (Emilie): Mọi bộ bài đối thủ đánh ra trong vòng này bắt buộc phải chứa ít nhất 1 lá mang Chất Hương Hoa của Emilie
  if (
    activeEmilieRequiredSuit !== null &&
    !candidate.isBomb &&
    (!candidate.cards || !candidate.cards.some((c) => c.suitIndex === activeEmilieRequiredSuit))
  ) {
    return {
      ok: false,
      isChop: false,
      reason: `🧪 Tinh Dầu Khử Trùng (Emilie): Vòng này bắt buộc mọi bộ bài đánh ra phải có ít nhất 1 lá mang chất ${SUITS[activeEmilieRequiredSuit]}!`,
    };
  }

  if (!current) return { ok: true, isChop: false };

  // Sòng Bạc Dạ Lan (Yelan): Đối thủ khi đè bài thường bắt buộc phải có lá cao nhất CÙNG TÍNH CHẴN / LẺ với bộ trên bàn
  if (
    activeYelanSameParity &&
    !candidate.isBomb &&
    !current.isBomb &&
    candidate.highRank % 2 !== current.highRank % 2
  ) {
    const parityLabel = current.highRank % 2 === 0 ? 'BẬC LẺ (3, 5, 7, 9, J, K, 2)' : 'BẬC CHẴN (4, 6, 8, 10, Q, A)';
    return {
      ok: false,
      isChop: false,
      reason: `🎲 Sòng Bạc Dạ Lan (Yelan): Vòng này đang khóa luật đồng tính Chẵn/Lẻ — Chỉ được đè bằng bộ có lá cao nhất thuộc nhóm ${parityLabel}!`,
    };
  }

  // Hương Hoa Mê Hoặc (Emilie): Đối thủ khi đè bài thường chỉ được phép đè cao hơn tối đa +2 bậc số (cấm nhảy cóc)
  if (
    activeEmilieStepCap &&
    !candidate.isBomb &&
    !current.isBomb &&
    candidate.highRank > current.highRank + 2
  ) {
    return {
      ok: false,
      isChop: false,
      reason: `🧪 Hương Hoa Emilie: Vòng này chỉ được đè cao hơn tối đa +2 bậc (≤ ${RANKS[Math.min(12, current.highRank + 2)]})!`,
    };
  }

  // Bạch Mã Vượt Tuyến (Zibai): Đối thủ khi đè bài thường bắt buộc phải lớn hơn tối thiểu +2 bậc số (cấm đè đồng số khác chất hoặc +1 bậc)
  if (
    activeZibaiMinStep &&
    !candidate.isBomb &&
    !current.isBomb &&
    candidate.highRank < current.highRank + 2
  ) {
    return {
      ok: false,
      isChop: false,
      reason: `🐎 Bạch Mã Vượt Tuyến (Zibai): Vòng này bắt buộc phải đè cao hơn tối thiểu +2 bậc (≥ ${RANKS[Math.min(12, current.highRank + 2)]})!`,
    };
  }

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

    // Sửa Đổi Định Mệnh (Nicole): Mọi bậc số thường (3→A) coi như ngang bằng nhau, đè bài xét thuần theo Chất (hoặc đồng chất thì bài cao hơn thắng)
    if (activeNicoleSuitOnlyRound && !candidate.isBomb && !current.isBomb && candRank < 12 && curRank < 12) {
      if (candSuit > curSuit || (candSuit === curSuit && candRank > curRank)) {
        return { ok: true, isChop: false };
      }
      return { ok: false, isChop: false };
    }

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

  // Cú Đấm Đôi Vỡ Sảnh (Wriothesley): Dùng 1 bộ Đôi có bậc >= bậc cao nhất của Sảnh để đấm vỡ bất kỳ bộ Sảnh nào trên bàn!
  if (
    activeWriothesleyPairSmash &&
    !current.isBomb &&
    current.type === COMBO_TYPES.STRAIGHT &&
    candidate.type === COMBO_TYPES.PAIR
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

  if (current.baizhuShielded || activeBaizhuShield) {
    if (
      candidate.type === COMBO_TYPES.THREE_PAIRS ||
      candidate.type === COMBO_TYPES.FOUR_OF_A_KIND ||
      candidate.type === COMBO_TYPES.FOUR_PAIRS
    ) {
      return {
        ok: false,
        isChop: false,
        reason: '🐍 Khiên Trường Sinh (Baizhu): Bộ bài này đang được Khiên Ngọc bảo hộ — Miễn nhiễm bị Hàng chặt!',
      };
    }
  }

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

  // Song Kiếm Hợp Lực (Varka): Sinh các cặp 2 lá bài Lẻ khác số cộng điểm đè Bài Lẻ trên bàn
  if (activeVarkaSumSlash && sorted.length >= 2) {
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].rankIndex !== sorted[j].rankIndex && sorted[j].rankIndex < 12) {
          const sumCombo = classifyCombo([sorted[i], sorted[j]]);
          if (sumCombo) combos.push(sumCombo);
        }
      }
    }
  }

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

  // Bộ Pháp Đằng Vân (Xianyun): Sinh thêm các bộ Sảnh Nhảy Bậc Cách Đều +2 nút (VD: 3-5-7, 4-6-8-10)
  if (activeXianyunStepStraight) {
    const pickCardForRank = (r) => {
      if (preferredCard && preferredCard.rankIndex === r) return preferredCard;
      return byRank[r][0];
    };
    for (let start = 0; start <= 7; start++) {
      if (byRank[start].length === 0) continue;
      const stepRun = [pickCardForRank(start)];
      for (let next = start + 2; next <= 11; next += 2) {
        if (byRank[next].length === 0) break;
        const highOfNext = byRank[next][byRank[next].length - 1];
        const lowOfNext = pickCardForRank(next);
        const candLow = [...stepRun, lowOfNext];
        if (candLow.length >= 3) {
          const sc = classifyCombo(candLow);
          if (sc) combos.push(sc);
        }
        if (highOfNext.id !== lowOfNext.id && candLow.length >= 3) {
          const scH = classifyCombo([...stepRun, highOfNext]);
          if (scH) combos.push(scH);
        }
        stepRun.push(lowOfNext);
      }
    }
  }

  // Vòng Lửa Thái Dương (Mavuika): Sinh thêm các bộ Sảnh Vòng Tròn Xuyên Heo (VD: K-A-2, Q-K-A-2-3, A-2-3-4)
  if (activeMavuikaWrapStraight && byRank[12].length > 0) {
    const pickCardForRank = (r) => {
      if (preferredCard && preferredCard.rankIndex === r) return preferredCard;
      return r === 12 ? byRank[12][byRank[12].length - 1] : byRank[r][0];
    };
    for (let len = 3; len <= Math.min(8, sorted.length); len++) {
      for (let offset = 0; offset < len; offset++) {
        const sRank = (12 - offset + 13) % 13;
        const wrapCards = [];
        let okWrap = true;
        for (let k = 0; k < len; k++) {
          const rk = (sRank + k) % 13;
          if (byRank[rk].length === 0) {
            okWrap = false;
            break;
          }
          wrapCards.push(pickCardForRank(rk));
        }
        if (okWrap) {
          const wc = classifyCombo(wrapCards);
          if (wc) combos.push(wc);
        }
      }
    }
  }

  // Pháo Dù Phỏm Pha Lê (Navia): Sinh đầy đủ mọi bộ Sảnh Đồng Chất (≥ 3 lá liên tiếp cùng chất ♠, ♣, ♦, ♥)
  for (let suitIdx = 0; suitIdx < 4; suitIdx++) {
    const suitByRank = new Array(12).fill(null);
    sorted.forEach((c) => {
      if (c.suitIndex === suitIdx && c.rankIndex <= 11) {
        suitByRank[c.rankIndex] = c;
      }
    });
    for (let start = 0; start <= 9; start++) {
      if (!suitByRank[start]) continue;
      const sameSuitRun = [suitByRank[start]];
      for (let next = start + 1; next <= 11; next++) {
        if (!suitByRank[next]) break;
        sameSuitRun.push(suitByRank[next]);
        if (sameSuitRun.length >= 3) {
          const fc = classifyCombo([...sameSuitRun]);
          if (fc) combos.push(fc);
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
  const hasLocked =
    (activeNaviaLockedCardIds && activeNaviaLockedCardIds.size > 0) ||
    (activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.size > 0);
  const usableHand = hasLocked
    ? hand.filter(
        (c) =>
          !(activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(c.id)) &&
          !(activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(c.id))
      )
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
      { id: 0, name: this.savedPlayerName || this.currentAccountUsername || 'Nhà Lữ Hành', avatar: this.equippedAvatar, cardSkin: this.equippedSkin, chopBurst: this.equippedChopBurst, winBurst: this.equippedWinBurst, activeChar: this.equippedActiveChar || 'none', skillUsed: false, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
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
    this.resetMatchPlayerMemory();

    // Trạng thái Kỹ Năng Nhân Vật trong vòng hiện tại
    this.raidenElectroMarkOwnerId = null;
    this.raidenSlashMustSingle = false;
    this.furinaReverseSuitRound = false;
    this.yaeForcePlayRound = false;
    this.clorindeDuelPair = null;
    this.ayakaFrozenPlayerId = null;
    this.hutaoTaxOwnerId = null;
    this.eulaNextPlayBoost = false;
    this.mavuikaWrapStraightTurn = false;
    this.yelanRevealedByPlayer = {};
    this.naviaFlushStraightTurn = false;
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    this.zhongliPetrifiedCardIds = new Set();
    this.shenheSingleOnlyRound = false;
    this.ganyuGapStraightTurn = false;
    this.kokomiReverseRankRound = false;
    this.yoimiyaChainFuseReady = false;
    this.citlaliPillowOwnerId = null;
    this.citlaliPillowTargetId = null;
    this.columbinaExtraTurnReady = false;
    this.xiaoKarmaOwnerId = null;
    activeXiaoKarmaMaxRank = null;
    this.kinichBombOwnerId = null;
    this.roundPlayedSeatIds = new Set();
    this.roundSkillActivatedSeatIds = new Set();
    this.nicoleSuitOnlyRound = false;
    activeNicoleSuitOnlyRound = false;
    this.xianyunStepStraightTurn = false;
    activeXianyunStepStraight = false;
    this.wriothesleyNoSingleOwnerId = null;
    this.wriothesleyNoSingleRound = false;
    activeWriothesleyNoSingle = false;
    this.cynoRoyalBanOwnerId = null;
    this.cynoRoyalBanRound = false;
    activeCynoRoyalBan = false;
    this.sigewinneCareOwnerId = null;
    this.yelanParityOwnerId = null;
    this.yelanParityRound = false;
    activeYelanSameParity = false;
    this.varkaSumSlashTurn = false;
    activeVarkaSumSlash = false;
    this.baizhuShieldOwnerId = null;
    activeBaizhuShield = false;
    this.ittoUshiOwnerId = null;
    this.alhaithamOwnerId = null;
    this.alhaithamAllowedRanks = null;
    activeAlhaithamAllowedRanks = null;
    this.emiliePerfumeOwnerId = null;
    this.emilieRequiredSuit = null;
    activeEmilieRequiredSuit = null;
    this.zibaiMinStepOwnerId = null;
    this.zibaiRedirectTargetId = null;
    activeZibaiMinStep = false;
    this.vesnaSpringOwnerId = null;
    this.matchGraveyardCards = [];
    this.ayatoCloneReady = false;
    this.arlecchinoBondOwnerId = null;
    this.flinsLanternOwnerId = null;
    this.roundSkillActivatedSeatIds = new Set();
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
    this.activeInventoryTab = 'bursts';
    this.inventoryFilter = 'all';
    this.turnTimeLimitSec = 30;
    this.turnRemainingSec = 30;
    this.turnTimerComboSig = '';
    this.turnCountdownInterval = null;
    this._returnToSummaryAfterModal = false;

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
    } else if (!this.tutorialCompleted && this.tutorialStep >= 2 && this.tutorialStep <= 6) {
      setTimeout(() => this.resumeNewbieTutorialOnBoot(), 120);
    } else if (!this.tutorialCompleted && (this.tutorialStep === 1 || (this.unlockedBursts.size === 0 && (this.totalWishes || 0) === 0))) {
      setTimeout(() => this.startNewbieTutorial(false), 120);
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

  preloadBurstById(burstId) {
    try {
      if (!burstId || burstId === 'none') return;
      if (!this.preloadedVideoSet) this.preloadedVideoSet = new Set();
      if (!this.burstBlobUrls) this.burstBlobUrls = new Map();
      const meta = getBurstMeta(burstId);
      if (!meta) return;
      if (meta.posterUrl && !this.preloadedVideoSet.has(meta.posterUrl)) {
        this.preloadedVideoSet.add(meta.posterUrl);
        try {
          const pImg = new Image();
          pImg.src = meta.posterUrl;
        } catch (_) {}
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
          .catch(() => {
            this.preloadedVideoSet.delete(url);
          });
      };
      cacheMediaToBlob(meta.mp4Url);
      cacheMediaToBlob(meta.audioUrl);
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
      if (this.selectedBannerBurstId && this.selectedBannerBurstId !== 'none') charIds.add(this.selectedBannerBurstId);
      try {
        const dailyInfo = this.getServerDailyBannerInfo?.();
        if (dailyInfo && Array.isArray(dailyInfo.todayBannerIds)) {
          dailyInfo.todayBannerIds.forEach((id) => {
            if (id && id !== 'none') charIds.add(id);
          });
        }
      } catch (_) {}
      if (this.unlockedBursts instanceof Set) {
        let count = 0;
        for (const uid of this.unlockedBursts) {
          if (uid && uid !== 'none') {
            charIds.add(uid);
            count++;
            if (count >= 6) break;
          }
        }
      }
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
      charIds.forEach((cid) => this.preloadBurstById(cid));
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

    // Gọi nạp Blob ngầm cho những lần xem sau nếu nhân vật này chưa có trong bộ nhớ đệm
    this.preloadBurstById(burstId);

    // Tăng mã phiên Nộ để hủy mọi callback cũ nếu có 2 hoạt ảnh Nộ kích hoạt liên tiếp nhau
    this._burstSeqId = (this._burstSeqId || 0) + 1;
    const seqId = this._burstSeqId;

    // Luôn tạm khóa botTimer và đóng băng lớp giao diện nặng bên dưới (Kho Đồ / Cầu Nguyện / Bàn Đấu)
    // để GPU chỉ tập trung giải mã duy nhất Video Nộ 60fps — triệt tiêu 100% hiện tượng giật lag lần đầu xem thử Nộ!
    this.isBurstPlaying = true;
    clearTimeout(this.botTimer);
    document.body.classList.add('burst-playing-gpu-lock');

    let videoEl = document.getElementById('burst-video');
    const audioEl = document.getElementById('burst-audio');
    const charWrapEl = videoEl ? videoEl.parentElement : document.querySelector('.burst-character-wrap');
    const chakraEl = document.getElementById('burst-chakra-ring');
    const slashContainer = document.getElementById('burst-slash-container');
    const tagEl = document.getElementById('burst-skill-tag');
    const titleEl = document.getElementById('burst-skill-title');
    const quoteEl = document.getElementById('burst-skill-quote');
    const detailEl = document.getElementById('burst-skill-detail');

    // Khởi tạo lại nút DOM <video id="burst-video"> mới tinh mỗi lần tung Nộ để giải phóng 100% bộ đệm phần cứng GPU của video nhân vật trước trên máy yếu/điện thoại!
    if (charWrapEl) {
      if (videoEl) {
        try {
          videoEl.onplaying = null;
          videoEl.onloadeddata = null;
          videoEl.oncanplay = null;
          videoEl.ontimeupdate = null;
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.removeAttribute('poster');
          videoEl.load();
        } catch (_) {}
      }
      const freshVideo = document.createElement('video');
      freshVideo.id = 'burst-video';
      freshVideo.className = 'burst-video';
      freshVideo.autoplay = true;
      freshVideo.playsInline = true;
      freshVideo.setAttribute('playsinline', '');
      freshVideo.preload = 'auto';
      freshVideo.style.transition = 'none';
      freshVideo.style.opacity = '0';
      freshVideo.style.visibility = 'hidden';
      if (videoEl && videoEl.parentNode === charWrapEl) {
        charWrapEl.replaceChild(freshVideo, videoEl);
      } else {
        charWrapEl.appendChild(freshVideo);
      }
      videoEl = freshVideo;
    }

    // Xóa tuyệt đối backgroundImage và mọi ảnh tĩnh (#burst-poster-img) trên charWrapEl
    const oldPosterImgEl = document.getElementById('burst-poster-img');
    if (oldPosterImgEl) {
      oldPosterImgEl.remove();
    }
    if (charWrapEl) {
      charWrapEl.style.backgroundImage = 'none';
    }

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

    clearTimeout(this.burstTimeout);
    let burstFinished = false;
    const finishBurst = () => {
      if (burstFinished || seqId !== this._burstSeqId) return;
      burstFinished = true;
      clearTimeout(this.burstTimeout);
      document.body.classList.remove('burst-playing-gpu-lock');
      if (charWrapEl) {
        charWrapEl.style.backgroundImage = 'none';
      }
      if (videoEl) {
        videoEl.onplaying = null;
        videoEl.onloadeddata = null;
        videoEl.oncanplay = null;
        videoEl.ontimeupdate = null;
        videoEl.style.transition = 'none';
        videoEl.style.opacity = '0';
        videoEl.style.visibility = 'hidden';
        try {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.removeAttribute('poster');
          videoEl.removeAttribute('data-loaded-src');
          videoEl.load();
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
      if (seqId !== this._burstSeqId) return;
      clearTimeout(this.burstTimeout);
      this.burstTimeout = setTimeout(finishBurst, 3400);
    };

    // Chuẩn bị sẵn luồng âm thanh (nhưng chỉ bấm play ngay khi frame đầu tiên của video sẵn sàng để không bị tiếng đi trước hình ở lần mở đầu tiên)
    let audioTriggered = false;
    if (audioEl && burstMeta.audioUrl && sfx.enabled) {
      const targetAudioSrc = this.burstBlobUrls?.get(burstMeta.audioUrl) || burstMeta.audioUrl;
      if (audioEl.getAttribute('data-loaded-src') !== targetAudioSrc) {
        try {
          audioEl.pause();
        } catch (_) {}
        audioEl.src = targetAudioSrc;
        audioEl.setAttribute('data-loaded-src', targetAudioSrc);
        try {
          audioEl.load();
        } catch (_) {}
      }
      audioEl.muted = false;
      audioEl.volume = 1.0;
      try {
        audioEl.currentTime = 0;
      } catch (_) {}
    }
    const triggerSyncedBurstAudio = () => {
      if (audioTriggered || seqId !== this._burstSeqId) return;
      audioTriggered = true;
      if (burstMeta.sfxType === 'skirk') {
        sfx.skirkBurst();
      } else {
        sfx.raidenBurst();
      }
      if (audioEl && burstMeta.audioUrl && sfx.enabled) {
        try {
          audioEl.currentTime = 0;
        } catch (_) {}
        audioEl.play().catch(() => {});
      }
    };

    if (videoEl && burstMeta.mp4Url) {
      videoEl.style.display = 'block';
      const targetVideoSrc = this.burstBlobUrls?.get(burstMeta.mp4Url) || burstMeta.mp4Url;
      videoEl.src = targetVideoSrc;
      videoEl.setAttribute('data-loaded-src', targetVideoSrc);

      videoEl.muted = !sfx.enabled;
      videoEl.volume = 0.95;

      let frameRevealed = false;
      const revealVideoFrame = () => {
        if (frameRevealed || seqId !== this._burstSeqId) return;
        frameRevealed = true;
        videoEl.ontimeupdate = null;
        videoEl.onloadeddata = null;
        videoEl.style.visibility = 'visible';
        videoEl.style.opacity = '1';
        triggerSyncedBurstAudio();
      };

      // Chỉ hiển thị thẻ <video> mới tạo và phát tiếng Nộ ngay khi decoder đã có khung hình đầu tiên của video
      if (typeof videoEl.requestVideoFrameCallback === 'function') {
        videoEl.requestVideoFrameCallback(() => {
          revealVideoFrame();
        });
      }
      videoEl.onloadeddata = () => {
        if (seqId !== this._burstSeqId) return;
        revealVideoFrame();
      };
      videoEl.ontimeupdate = () => {
        if (seqId !== this._burstSeqId) return;
        if (videoEl.currentTime > 0.01) {
          revealVideoFrame();
        }
      };
      videoEl.onplaying = () => {
        if (seqId !== this._burstSeqId) return;
        videoEl.onplaying = null;
        startDurationCountdown();
        setTimeout(() => {
          if (seqId === this._burstSeqId && !videoEl.paused) {
            revealVideoFrame();
          }
        }, 60);
      };
      this.burstTimeout = setTimeout(finishBurst, 4600);

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (seqId !== this._burstSeqId) return;
          videoEl.muted = true;
          videoEl.play().catch(() => {
            triggerSyncedBurstAudio();
            startDurationCountdown();
          });
        });
      }
    } else {
      triggerSyncedBurstAudio();
      startDurationCountdown();
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
      if (data.equippedActiveChar === 'none' && isNewerOrEqual) {
        this.equippedActiveChar = 'none';
      } else if (data.equippedActiveChar && this.unlockedBursts.has(data.equippedActiveChar)) {
        this.equippedActiveChar = data.equippedActiveChar;
      } else if (data.equippedChopBurst && this.unlockedBursts.has(data.equippedChopBurst)) {
        this.equippedActiveChar = data.equippedChopBurst;
      } else if (data.equippedWinBurst && this.unlockedBursts.has(data.equippedWinBurst)) {
        this.equippedActiveChar = data.equippedWinBurst;
      } else if (!this.equippedActiveChar || !this.unlockedBursts.has(this.equippedActiveChar)) {
        this.equippedActiveChar = 'none';
      }
      this.equippedChopBurst = this.equippedActiveChar || 'none';
      this.equippedWinBurst = this.equippedActiveChar || 'none';
    }
    if (data.lastDailyDate) this.lastDailyDate = data.lastDailyDate;
    if (typeof data.dailyReliefUsed === 'number') this.dailyReliefUsed = data.dailyReliefUsed;
    if (typeof data.tutorialCompleted === 'boolean') {
      this.tutorialCompleted = isNewerOrEqual ? data.tutorialCompleted : (this.tutorialCompleted || data.tutorialCompleted);
    }
    if (typeof data.beginnerBannerUsed === 'boolean') {
      this.beginnerBannerUsed = isNewerOrEqual ? data.beginnerBannerUsed : (this.beginnerBannerUsed || data.beginnerBannerUsed);
    }
    if (typeof data.tutorialStep === 'number' && isNewerOrEqual) {
      this.tutorialStep = data.tutorialStep;
    }
    if (this.unlockedBursts.size > 0 && (this.totalWishes || 0) > 0 && data.tutorialCompleted === undefined && this.tutorialStep === 0) {
      this.tutorialCompleted = true;
      this.beginnerBannerUsed = true;
    }
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
    this.tutorialCompleted = false;
    this.beginnerBannerUsed = false;
    this.tutorialStep = 0;
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

      // Mặc định bật Tự Động Random Bot (khôi phục nếu trước đó lỡ bị tắt do hộp thoại cũ)
      try {
        if (!localStorage.getItem('tlmn_autorandom_v69')) {
          this.autoRandomizeBots = true;
          localStorage.setItem('tlmn_autorandom_v69', '1');
        }
      } catch (_) {
        this.autoRandomizeBots = true;
      }

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
        const localAccRev = Math.max(
          Number(acc.syncRev) || 0,
          Number(acc.profile?.syncRev) || 0,
          usernameKey === this.currentAccountUsername ? Number(this.profileSyncRev) || 0 : 0
        );
        if (existingCloud.profile && acc.profile) {
          const cProf = existingCloud.profile;
          acc.profile.unlockedBursts = Array.from(new Set([...(acc.profile.unlockedBursts || []), ...(cProf.unlockedBursts || [])]));
          acc.profile.unlockedSkins = Array.from(new Set([...(acc.profile.unlockedSkins || ['classic']), ...(cProf.unlockedSkins || ['classic'])]));
          acc.profile.unlockedAvatars = Array.from(new Set([...(acc.profile.unlockedAvatars || ['default_player']), ...(cProf.unlockedAvatars || ['default_player'])]));
          // Nếu trên Đám Mây có bản ghi mới hơn (cloudMaxRev >= localAccRev) với số Vàng cao hơn (do vừa được cấp/đồng bộ từ thiết bị khác), giữ nguyên số Vàng cao hơn đó thay vì ghi đè!
          if (cloudMaxRev >= localAccRev && typeof cProf.coins === 'number' && cProf.coins > (Number(acc.profile.coins) || 0)) {
            acc.profile.coins = cProf.coins;
            if (usernameKey === this.currentAccountUsername) {
              this.savedCoins = cProf.coins;
              const me = this.getLocalPlayer();
              if (me) me.coins = cProf.coins;
              this.renderAll();
              this.renderLobbyModal();
              this.renderShopModal();
            }
          }
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
      newer.equippedActiveChar === 'none'
        ? 'none'
        : newerChar && newerChar !== 'none' && mergedBursts.includes(newerChar)
          ? newerChar
          : olderChar && olderChar !== 'none' && mergedBursts.includes(olderChar)
            ? olderChar
            : 'none';

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
      tutorialCompleted:
        typeof newer.tutorialCompleted === 'boolean'
          ? newer.tutorialCompleted
          : Boolean(older.tutorialCompleted || (mergedBursts.length > 0 && !newer.tutorialStep)),
      beginnerBannerUsed:
        typeof newer.beginnerBannerUsed === 'boolean'
          ? newer.beginnerBannerUsed
          : Boolean(older.beginnerBannerUsed || (mergedBursts.length > 0 && !newer.tutorialStep)),
      tutorialStep:
        typeof newer.tutorialStep === 'number' && newer.tutorialStep > 0
          ? newer.tutorialStep
          : Number(older.tutorialStep) || 0,
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
              tutorialCompleted: this.tutorialCompleted,
              beginnerBannerUsed: this.beginnerBannerUsed,
              tutorialStep: this.tutorialStep,
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
        const prevTutorialActive = !this.tutorialCompleted && this.tutorialStep >= 1 && this.tutorialStep <= 6;
        const prevTutorialStep = this.tutorialStep;
        const prevTutorialCompleted = this.tutorialCompleted;
        const prevBeginnerBannerUsed = this.beginnerBannerUsed;
        this.resetProfileMemoryToDefaults();
        this.currentAccountUsername = targetUser;
        this.applyProfileDataObject(mergedProfile, this.getTodayKey());
        if (prevTutorialActive) {
          this.tutorialCompleted = prevTutorialCompleted;
          this.beginnerBannerUsed = prevBeginnerBannerUsed;
          this.tutorialStep = Math.max(prevTutorialStep, Number(this.tutorialStep) || 0);
        }
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
        if (!this.tutorialCompleted && this.tutorialStep >= 1) {
          this.renderTravelerGuide();
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
        tutorialCompleted: !!this.tutorialCompleted,
        beginnerBannerUsed: !!this.beginnerBannerUsed,
        tutorialStep: this.tutorialStep || 0,
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
    if (this.currentAccountUsername || (!this.tutorialCompleted && this.tutorialStep >= 1)) return true;
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
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
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
    const keepCurrentData = keepEl ? keepEl.checked : false;

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

    // Mặc định (keepCurrentData = false): Tạo tài khoản Tân Thủ mới hoàn toàn, vào Hướng Dẫn Tân Thủ và nhận 1 Nhân Vật 5★ Limited miễn phí!
    if (!keepCurrentData) {
      this.resetProfileMemoryToDefaults();
    }

    const isFreshNewbie = !keepCurrentData || (this.unlockedBursts.size === 0 && (this.totalWishes || 0) === 0);
    if (isFreshNewbie) {
      this.tutorialCompleted = false;
      this.beginnerBannerUsed = false;
      this.tutorialStep = 1;
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
    if (isFreshNewbie) {
      this._pendingJoinRoomParam = '';
      this.startNewbieTutorial(1);
      return;
    }
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
    if (!this.tutorialCompleted && this.unlockedBursts.size === 0 && (this.totalWishes || 0) === 0) {
      this._pendingJoinRoomParam = '';
      this.startNewbieTutorial(1);
      return;
    }
    if (!this.tutorialCompleted && this.tutorialStep >= 1 && this.tutorialStep <= 6) {
      this.resumeNewbieTutorialOnBoot();
      return;
    }
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
            <input type="checkbox" id="acc-reg-keep-data" style="width:16px;height:16px;accent-color:#10b981;" />
            <span>✅ Gộp dữ liệu khách trên máy này (${curCoins.toLocaleString()} Xu, ${this.unlockedBursts.size} Nộ 5★) — <em>Để trống nếu muốn tạo Tài Khoản Tân Thủ mới &amp; nhận quà 5★ Limited!</em></span>
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

  getVietnamDayNumber() {
    // Tính số ngày theo múi giờ Việt Nam (UTC+7) — tự động Reset đúng 00:00 mỗi ngày đồng bộ trên toàn Server
    return Math.floor((Date.now() + 7 * 3600 * 1000) / 86400000);
  }

  getServerDailyBannerInfo() {
    const limitedList = GENSHIN_BURSTS.filter((b) => !b.isStandard);
    const totalLimited = limitedList.length; // 50 nhân vật 5★ giới hạn
    const bannersPerDay = 2;
    const daysPerCycle = Math.ceil(totalLimited / bannersPerDay); // 25 ngày / 1 chu kỳ (50 nhân vật)
    const vnDay = this.getVietnamDayNumber();
    const epochOffset = 20750;
    const relDay = Math.max(0, vnDay - epochOffset);
    const cycleIndex = Math.floor(relDay / daysPerCycle);
    const dayInCycle = relDay % daysPerCycle; // 0 .. (daysPerCycle - 1)

    // Hoán vị tất định (Deterministic Seeded Fisher-Yates) theo từng chu kỳ:
    // - Mọi người chơi trên toàn Server đều nhận đúng 2 Banner giống hệt nhau mỗi ngày.
    // - Trong suốt 1 chu kỳ (25 ngày = 50 Banner), tuyệt đối KHÔNG CÓ nhân vật nào bị lặp lại!
    const buildCycleOrder = (cycIdx) => {
      const arr = [...limitedList];
      let seed = ((cycIdx + 1) * 0x9e3779b9) >>> 0;
      const nextRand = () => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(nextRand() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    };

    const cycleOrder = buildCycleOrder(cycleIndex);
    const startIdx = dayInCycle * bannersPerDay;
    const todayBanners = cycleOrder.slice(startIdx, startIdx + bannersPerDay);
    if (todayBanners.length < bannersPerDay && cycleOrder.length > 0) {
      const nextCycleOrder = buildCycleOrder(cycleIndex + 1);
      for (const b of nextCycleOrder) {
        if (todayBanners.length >= bannersPerDay) break;
        if (!todayBanners.some((x) => x.id === b.id)) {
          todayBanners.push(b);
        }
      }
    }

    const vnNowMs = Date.now() + 7 * 3600 * 1000;
    const nextResetMs = (vnDay + 1) * 86400000;
    const remainSec = Math.max(0, Math.floor((nextResetMs - vnNowMs) / 1000));
    const hoursLeft = Math.floor(remainSec / 3600);
    const minsLeft = Math.floor((remainSec % 3600) / 60);

    return {
      vnDay,
      cycleIndex: cycleIndex + 1,
      dayInCycle: dayInCycle + 1,
      daysPerCycle,
      totalLimited,
      todayBanners,
      todayBannerIds: todayBanners.map((b) => b.id),
      cycleOrder,
      hoursLeft,
      minsLeft,
    };
  }

  ensureValidDailyBannerSelection() {
    const info = this.getServerDailyBannerInfo();
    if (!info.todayBannerIds.includes(this.selectedBannerBurstId)) {
      this.selectedBannerBurstId = info.todayBannerIds[0] || 'raiden';
    }
    return info;
  }

  selectBannerUp(burstId) {
    const info = this.getServerDailyBannerInfo();
    if (!info.todayBannerIds.includes(burstId)) {
      this.ensureValidDailyBannerSelection();
      this.renderShopModal();
      return;
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
    const info = this.getServerDailyBannerInfo();
    if (charId && info.todayBannerIds.includes(charId)) {
      this.selectedBannerBurstId = charId;
    } else {
      this.ensureValidDailyBannerSelection();
      if (charId) {
        const targetBurst = GENSHIN_BURSTS.find((b) => b.id === charId);
        const targetName = targetBurst ? targetBurst.name.split('—')[0].trim() : charId;
        const idxInCycle = info.cycleOrder.findIndex((b) => b.id === charId);
        if (idxInCycle >= 0) {
          const scheduledDay = Math.floor(idxInCycle / 2) + 1;
          const todayNames = info.todayBanners.map((b) => b.name.split('—')[0].trim()).join(' & ');
          this.showComboBanner(
            `⏳ Banner hôm nay toàn Server là [${todayNames}] • ${targetName} thuộc Ngày ${scheduledDay}/${info.daysPerCycle} của chu kỳ!`
          );
        }
      }
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
    this.modalShop?.classList.add('hidden');
    document.getElementById('pause-modal')?.classList.add('hidden');
    this.renderInventoryModal();
    document.getElementById('inventory-modal')?.classList.remove('hidden');
    sfx.click();
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
    if (this.currentAccountUsername) {
      this.pullAccountFromCloudAndSync(this.currentAccountUsername);
    }
  }

  closeInventoryModal() {
    if (!this.tutorialCompleted && this.tutorialStep === 4 && this.equippedActiveChar !== 'raiden') {
      alert('🌟 Nhà Lữ Hành: Bạn phải bấm nút "⚡ Trang Bị Nhân Vật Này" ở thẻ Raiden Shogun trước khi đóng Kho Đồ nhé!');
      this.renderTravelerGuide();
      return;
    }
    document.getElementById('inventory-modal')?.classList.add('hidden');
    sfx.click();
    if (this._returnToSummaryAfterModal && this.isGameOver) {
      this._returnToSummaryAfterModal = false;
      this.modalSummary?.classList.remove('hidden');
      this.renderSummaryReadyStateUI();
    }
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
  }

  openInventoryFromSummary(defaultTab = 'bursts') {
    if (!this.requireAccountLogin()) return;
    this._returnToSummaryAfterModal = true;
    this.modalSummary?.classList.add('hidden');
    this.openInventoryModal(defaultTab);
  }

  openGachaFromSummary() {
    if (!this.requireAccountLogin()) return;
    this._returnToSummaryAfterModal = true;
    this.modalSummary?.classList.add('hidden');
    this.renderShopModal();
    this.modalShop?.classList.remove('hidden');
    this.switchShopTab('gacha');
    sfx.click();
    if (this.currentAccountUsername) {
      this.pullAccountFromCloudAndSync(this.currentAccountUsername);
    }
  }

  areAllOnlinePlayersReadyForNextMatch() {
    if (!this.isMultiplayer) return true;
    const activeHumans = (this.players || []).filter((p) => p && p.active && !p.isBot);
    if (activeHumans.length === 0) return true;
    return activeHumans.every((p) => !!p.readyForNextMatch);
  }

  toggleSummaryReady() {
    const me = this.getLocalPlayer();
    if (!me) return;
    sfx.click();
    me.readyForNextMatch = !me.readyForNextMatch;
    if (this.isMultiplayer) {
      if (this.isHost) {
        this.renderSummaryReadyStateUI();
        this.broadcastState();
      } else {
        this.renderSummaryReadyStateUI();
        this.sendClientEvent({
          type: 'TOGGLE_READY',
          clientId: this.myClientId,
          ready: !!me.readyForNextMatch,
          activeChar: this.equippedActiveChar || 'none',
          cardSkin: this.equippedSkin || 'classic',
          avatar: this.equippedAvatar || 'default_player',
        });
      }
    } else {
      this.renderSummaryReadyStateUI();
    }
  }

  renderSummaryReadyStateUI() {
    const me = this.getLocalPlayer();
    const myCharId = me ? this.getPlayerActiveCharId(me) : this.equippedActiveChar || 'none';
    const myCharMeta = myCharId && myCharId !== 'none' ? CHARACTER_SKILLS[myCharId] : null;
    const mySkinMeta = getCardSkinMeta(this.equippedSkin || 'classic');

    const loadoutEl = document.getElementById('summary-my-loadout-line');
    if (loadoutEl) {
      const charText = myCharMeta
        ? `<strong style="color:#fde047;">${myCharMeta.icon} ${myCharMeta.charName}</strong>`
        : `<strong style="color:#94a3b8;">Chưa trang bị 5★</strong>`;
      const skinText = `<strong style="color:#d8b4fe;">${mySkinMeta ? mySkinMeta.name.split('—')[0].trim() : 'Mặc định'}</strong>`;
      loadoutEl.innerHTML = `🎭 Đang trang bị: ${charText} • 🃏 Decor Bài: ${skinText}`;
    }

    const readyListEl = document.getElementById('summary-ready-players-list');
    if (readyListEl && Array.isArray(this.players)) {
      const activePlayers = this.players.filter((p) => p && p.active);
      readyListEl.innerHTML = activePlayers
        .map((p) => {
          const isReady = p.isBot ? true : !!p.readyForNextMatch;
          const pCharId = this.getPlayerActiveCharId(p);
          const pChar = pCharId && pCharId !== 'none' ? CHARACTER_SKILLS[pCharId] : null;
          const charTag = pChar ? `${pChar.icon} ${pChar.charName}` : 'Chưa chọn 5★';
          const bg = isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.16)';
          const border = isReady ? '1.5px solid #34d399' : '1.5px solid #fbbf24';
          const color = isReady ? '#a7f3d0' : '#fde68a';
          const badge = isReady ? '✅ Đã Sẵn Sàng' : '⏳ Đang đổi đồ / Chưa sẵn sàng';
          return `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:${bg};border:${border};color:${color};font-size:11.5px;font-weight:800;">
            <span>${p.name}${p.id === this.mySeatId ? ' (Bạn)' : ''}</span>
            <span style="opacity:0.85;">• ${charTag}</span>
            <span>• ${badge}</span>
          </div>`;
        })
        .join('');
    }

    const readyBtn = document.getElementById('btn-summary-ready');
    if (readyBtn && me) {
      const myReady = !!me.readyForNextMatch;
      readyBtn.textContent = myReady ? '✅ Đã Sẵn Sàng (Bấm để hủy)' : '✋ Sẵn Sàng Ván Tiếp';
      readyBtn.style.background = myReady
        ? 'linear-gradient(135deg, #059669, #10b981)'
        : 'linear-gradient(135deg, #d97706, #f59e0b)';
      readyBtn.style.borderColor = myReady ? '#6ee7b7' : '#fde047';
    }

    const nextRoundBtn = document.getElementById('btn-next-round');
    if (nextRoundBtn) {
      if (this.isMultiplayer) {
        const allReady = this.areAllOnlinePlayersReadyForNextMatch();
        if (this.isHost) {
          nextRoundBtn.disabled = !allReady;
          nextRoundBtn.style.opacity = allReady ? '1' : '0.55';
          nextRoundBtn.style.cursor = allReady ? 'pointer' : 'not-allowed';
          nextRoundBtn.textContent = allReady
            ? '🃏 Bắt Đầu Ván Tiếp Theo (Tất cả đã Sẵn Sàng!)'
            : '⏳ Chờ tất cả người chơi bấm Sẵn Sàng...';
        } else {
          nextRoundBtn.disabled = true;
          nextRoundBtn.style.opacity = '0.65';
          nextRoundBtn.style.cursor = 'not-allowed';
          nextRoundBtn.textContent = allReady
            ? '⏳ Tất cả đã Sẵn Sàng — Chờ Chủ phòng bắt đầu...'
            : '⏳ Hãy bấm "✋ Sẵn Sàng Ván Tiếp" để Chủ phòng chia bài...';
        }
      } else {
        nextRoundBtn.disabled = false;
        nextRoundBtn.style.opacity = '1';
        nextRoundBtn.style.cursor = 'pointer';
        nextRoundBtn.textContent = '🃏 Đánh ván tiếp theo';
      }
    }
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
    this.syncAutoRandomBotsUI();
    this.updateMidMatchLockUI();
    document.getElementById('pause-modal')?.classList.remove('hidden');
    sfx.click();
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
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
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
  }

  rollSingleWish() {
    this.ensureValidDailyBannerSelection();
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
        // Chỉ mở khóa lưu vào Kho Đồ — người chơi phải vào Kho Đồ bấm Trang Bị mới sử dụng được nhân vật!
        this.unlockedBursts.add(chosenBurst.id);
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

  performBeginnerWish10() {
    if (this.beginnerBannerUsed) {
      alert('🎁 Banner Tân Thủ chỉ có thể Cầu Nguyện duy nhất 1 lần ×10 và đã được sử dụng!');
      return;
    }
    const me = this.getLocalPlayer();
    if (!me) return;
    if (me.coins < WISH_COST_TEN) {
      if (this.tutorialStep === 3 || !this.tutorialCompleted) {
        me.coins = Math.max(20000, me.coins);
        this.savedCoins = me.coins;
      } else {
        alert(`⚠️ Bạn cần ${WISH_COST_TEN.toLocaleString()} Xu để Cầu Nguyện Tân Thủ ×10!`);
        return;
      }
    }

    me.coins -= WISH_COST_TEN;
    this.savedCoins = me.coins;
    this.beginnerBannerUsed = true;

    const results = [];
    let totalRefund = 0;

    // 8 món 3★ Avatar + 1 món 4★ Decor Bài Raiden + 1 món 5★ Limited Chắc Chắn: Raiden Shogun (Lôi Thần)
    const pool3 = ANIME_AVATARS.filter((a) => a.id !== 'default_player');
    for (let i = 0; i < 8; i++) {
      this.totalWishes = (this.totalWishes || 0) + 1;
      const chosenAvatar = pool3[(i * 3 + Math.floor(Math.random() * pool3.length)) % pool3.length];
      const alreadyOwned = this.unlockedAvatars.has(chosenAvatar.id);
      const refund = alreadyOwned ? DUPLICATE_REFUND_COINS[3] : 0;
      if (!alreadyOwned) {
        this.unlockedAvatars.add(chosenAvatar.id);
        if (this.equippedAvatar === 'default_player') {
          this.equippedAvatar = chosenAvatar.id;
          me.avatar = chosenAvatar.id;
        }
      }
      totalRefund += refund;
      const r3 = {
        pullNo: this.totalWishes,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        star: 3,
        category: 'avatar',
        typeLabel: 'Avatar Nhân Vật 3★',
        id: chosenAvatar.id,
        name: `Avatar: ${chosenAvatar.name}`,
        thumbUrl: chosenAvatar.imgUrl,
        isNew: !alreadyOwned,
        refund,
        pityUsed: i + 1,
        rateNote: '3★ Banner Tân Thủ',
      };
      this.gachaHistory.unshift(r3);
      results.push(r3);
    }

    // Món thứ 9: 4★ Decor Bài Raiden Shogun
    this.totalWishes = (this.totalWishes || 0) + 1;
    const chosenSkin = getCardSkinMeta('raiden') || ANIME_CARD_SKINS.find((s) => s.id !== 'classic');
    const skinOwned = this.unlockedSkins.has(chosenSkin.id);
    const skinRefund = skinOwned ? DUPLICATE_REFUND_COINS[4] : 0;
    if (!skinOwned) {
      this.unlockedSkins.add(chosenSkin.id);
      if (this.equippedSkin === 'classic') {
        this.equippedSkin = chosenSkin.id;
        me.cardSkin = chosenSkin.id;
      }
    }
    totalRefund += skinRefund;
    const r4 = {
      pullNo: this.totalWishes,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      star: 4,
      category: 'skin',
      typeLabel: 'Decor Bài 4★ (Tặng Kèm)',
      id: chosenSkin.id,
      name: chosenSkin.name,
      thumbUrl: `fanart/${chosenSkin.id}.jpg?v=66`,
      isNew: !skinOwned,
      refund: skinRefund,
      pityUsed: 9,
      rateNote: '🔥 4★ Banner Tân Thủ',
    };
    this.gachaHistory.unshift(r4);
    results.push(r4);

    // Món thứ 10: NỔ VÀNG 100% NHÂN VẬT 5★ LIMITED TẶNG TÂN THỦ — RAIDEN SHOGUN (⚡ Lôi Thần)
    this.totalWishes = (this.totalWishes || 0) + 1;
    const giftBurst = getBurstMeta('raiden') || GENSHIN_BURSTS[0];
    const burstOwned = this.unlockedBursts.has(giftBurst.id);
    const burstRefund = burstOwned ? DUPLICATE_REFUND_COINS[5] : 0;
    this.unlockedBursts.add(giftBurst.id);
    // Chỉ mở khóa lưu vào Kho Đồ, chưa tự động trang bị để Nhà Lữ Hành hướng dẫn người chơi vào Kho Đồ mặc Raiden Shogun!
    this.equippedActiveChar = 'none';
    this.equippedChopBurst = 'none';
    this.equippedWinBurst = 'none';
    me.activeChar = 'none';
    me.chopBurst = 'none';
    me.winBurst = 'none';
    totalRefund += burstRefund;

    const r5 = {
      pullNo: this.totalWishes,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      star: 5,
      category: 'burst',
      typeLabel: '🎁 QUÀ 5★ LIMITED TÂN THỦ',
      id: giftBurst.id,
      name: giftBurst.name,
      thumbUrl: `fanart/${giftBurst.id}.jpg?v=66`,
      videoUrl: giftBurst.videoUrl,
      isNew: !burstOwned,
      refund: burstRefund,
      pityUsed: 10,
      rateNote: '🌟 Cam Kết 100% Nổ 5★ Limited Tân Thủ',
    };
    this.gachaHistory.unshift(r5);
    results.push(r5);
    if (this.gachaHistory.length > 300) this.gachaHistory.length = 300;

    if (totalRefund > 0) {
      me.coins += totalRefund;
      this.savedCoins = me.coins;
    }

    this.showGachaMeteorAndResults(results, totalRefund);

    setTimeout(() => {
      this.addLog(
        `🎁🌟 <strong>Banner Tân Thủ ×10:</strong> Chúc mừng bạn đã nổ vàng nhận <strong>Nhân Vật 5★ Limited: ⚡ Raiden Shogun (Lôi Thần)</strong> và tự động trang bị vào bàn đấu! (Banner Tân Thủ đã biến mất sau 10 lần roll duy nhất).`,
        'log-win'
      );
      this.saveShopProfile();
      this.renderShopModal();
      this.renderAll();
      this.syncCosmeticsInRoom();
    }, 60);
  }

  performWish(count = 1) {
    if (!this.tutorialCompleted && this.tutorialStep === 3 && !this.beginnerBannerUsed) {
      alert('🌟 Nhà Lữ Hành: Hãy bấm vào nút "🌟 Cầu Nguyện Tân Thủ ×10 (16,000 Vàng)" trên Banner Tân Thủ đặc biệt phía trên để nhận chắc chắn Nhân Vật 5★ Limited trước nhé!');
      return;
    }
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

  playGachaSfxFile(url, volume = 0.85) {
    if (!sfx.enabled || !url) return null;
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  }

  stopGachaSplashMedia() {
    this.gachaSplashLoadToken = (this.gachaSplashLoadToken || 0) + 1;
    clearTimeout(this.gachaSplashVoiceTimer);
    clearTimeout(this.gachaSplashLightTimer);
    clearTimeout(this.gachaSplashImgFallbackTimer);
    if (this.currentGachaRevealAudio) {
      try {
        this.currentGachaRevealAudio.pause();
      } catch (_) {}
      this.currentGachaRevealAudio = null;
    }
    if (this.currentGachaVoiceAudio) {
      try {
        this.currentGachaVoiceAudio.pause();
      } catch (_) {}
      this.currentGachaVoiceAudio = null;
    }
    const splashImg = document.getElementById('gacha-splash-img');
    if (splashImg) {
      splashImg.onload = null;
      splashImg.onerror = null;
      splashImg.style.visibility = 'hidden';
      splashImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
    const vIn = document.getElementById('gacha-splashlight-in');
    const vOut = document.getElementById('gacha-splashlight-out');
    [vIn, vOut].forEach((v) => {
      if (v) {
        try {
          v.pause();
          v.removeAttribute('src');
        } catch (_) {}
      }
    });
  }

  showGacha5StarSplashSequence(splashItems, index, onAllDone) {
    const splashStage = document.getElementById('gacha-splash-stage');
    this.stopGachaSplashMedia();
    const myToken = this.gachaSplashLoadToken;

    if (!splashStage || !Array.isArray(splashItems) || index >= splashItems.length) {
      if (splashStage) {
        splashStage.classList.add('hidden');
        splashStage.classList.remove('gacha-splash-anim-active');
        splashStage.onclick = null;
      }
      if (typeof onAllDone === 'function') onAllDone();
      return;
    }

    const item = splashItems[index];
    const starRarity = item.star === 5 ? 5 : item.star === 4 ? 4 : 3;
    const elemKey = CHARACTER_ELEMENTS[item.id] || 'electro';
    const rosterItem = GENSHIN_FANART_ROSTER.find((c) => c.id === item.id);
    const burstMeta = getBurstMeta(item.id);

    let charDisplayName = item.name || 'Raiden Shogun';
    if (rosterItem && rosterItem.name) {
      const m = rosterItem.name.match(/^([^(]+)/);
      charDisplayName = m ? m[1].trim() : rosterItem.name.trim();
    } else {
      charDisplayName = charDisplayName
        .replace(/^Bài Fanart:\s*/i, '')
        .replace(/^Avatar:\s*/i, '')
        .split('—')[0]
        .split('(')[0]
        .trim();
    }

    const visionImg = document.getElementById('gacha-splash-vision-img');
    if (visionImg) {
      visionImg.src = `assets/icon-${elemKey}.svg`;
      visionImg.alt = elemKey;
    }

    const charNameEl = document.getElementById('gacha-splash-char-name');
    if (charNameEl) {
      charNameEl.textContent = charDisplayName;
    }

    const starsEl = document.getElementById('gacha-splash-stars');
    if (starsEl) {
      starsEl.innerHTML = Array.from({ length: starRarity }, (_, i) => `<span class="splash-star s${i + 1}">★</span>`).join('');
    }

    const advanceNext = (e) => {
      if (e) e.stopPropagation();
      this.showGacha5StarSplashSequence(splashItems, index + 1, onAllDone);
    };

    const skipAllBtn = document.getElementById('btn-skip-gacha-splash');
    if (skipAllBtn) {
      skipAllBtn.onclick = (e) => {
        if (e) e.stopPropagation();
        this.showGacha5StarSplashSequence(splashItems, splashItems.length, onAllDone);
      };
    }

    const continueBtn = document.getElementById('btn-close-gacha-splash');
    if (continueBtn) {
      continueBtn.onclick = advanceNext;
    }

    splashStage.onclick = advanceNext;
    splashStage.classList.remove('hidden');
    splashStage.classList.remove('gacha-splash-anim-active');

    const splashImg = document.getElementById('gacha-splash-img');
    let revealStarted = false;
    const startRevealNow = () => {
      if (revealStarted || this.gachaSplashLoadToken !== myToken) return;
      revealStarted = true;
      clearTimeout(this.gachaSplashImgFallbackTimer);

      if (splashImg) {
        splashImg.style.visibility = 'visible';
      }

      const vIn = document.getElementById('gacha-splashlight-in');
      const vOut = document.getElementById('gacha-splashlight-out');
      if (vIn) {
        vIn.classList.remove('hidden');
        vIn.src = `assets/${starRarity}star-splashout.webm`;
        vIn.currentTime = 0;
        const p1 = vIn.play();
        if (p1 && typeof p1.catch === 'function') p1.catch(() => {});
      }
      if (vOut) {
        vOut.classList.add('hidden');
        vOut.src = `assets/${starRarity}star-splashout2.webm`;
        vOut.currentTime = 0;
      }
      this.gachaSplashLightTimer = setTimeout(() => {
        if (this.gachaSplashLoadToken !== myToken) return;
        if (vIn) vIn.classList.add('hidden');
        if (vOut) {
          vOut.classList.remove('hidden');
          const p2 = vOut.play();
          if (p2 && typeof p2.catch === 'function') p2.catch(() => {});
        }
      }, 1100);

      this.currentGachaRevealAudio = this.playGachaSfxFile(`assets/reveal_${starRarity}star.ogg`, 0.92);
      if (starRarity === 5 && burstMeta?.audioUrl) {
        this.gachaSplashVoiceTimer = setTimeout(() => {
          if (this.gachaSplashLoadToken !== myToken) return;
          this.currentGachaVoiceAudio = this.playGachaSfxFile(burstMeta.audioUrl, 0.85);
        }, 1100);
      }

      splashStage.classList.remove('gacha-splash-anim-active');
      void splashStage.offsetWidth;
      splashStage.classList.add('gacha-splash-anim-active');

      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    };

    if (splashImg) {
      splashImg.style.visibility = 'hidden';
      splashImg.alt = charDisplayName;
      splashImg.onload = () => {
        splashImg.onload = null;
        if (typeof splashImg.decode === 'function') {
          splashImg.decode().then(startRevealNow).catch(startRevealNow);
        } else {
          startRevealNow();
        }
      };
      splashImg.onerror = () => {
        splashImg.onerror = null;
        splashImg.onload = () => {
          splashImg.onload = null;
          startRevealNow();
        };
        splashImg.src = item.thumbUrl || `fanart/${item.id}.jpg?v=66`;
      };
      splashImg.src = `splash/${item.id}.png`;
      this.gachaSplashImgFallbackTimer = setTimeout(startRevealNow, 900);
    } else {
      startRevealNow();
    }
  }

  showGachaMeteorAndResults(results, totalRefund) {
    const overlay = document.getElementById('gacha-wish-overlay');
    const meteorStage = document.getElementById('gacha-meteor-stage');
    const splashStage = document.getElementById('gacha-splash-stage');
    const resultsStage = document.getElementById('gacha-results-stage');
    const meteorVideo = document.getElementById('gacha-meteor-video');
    const resultsGrid = document.getElementById('gacha-results-grid');
    const refundSummary = document.getElementById('gacha-refund-summary');
    const resultsTitle = document.getElementById('gacha-results-title');
    const resultsBal = document.getElementById('gacha-results-balance');

    if (!overlay || !meteorStage || !resultsStage) return;

    const maxStar = Math.max(...results.map((r) => r.star));
    const isTenPull = results.length > 1;
    sfx.duckBGM(true);
    this.stopGachaSplashMedia();

    // Tải trước (Preload) ngay lập tức ảnh Splash Art 5★ trong lúc video sao băng (6 giây) đang rơi
    results
      .filter((r) => r && r.star === 5)
      .forEach((r) => {
        try {
          const preImg = new Image();
          preImg.src = `splash/${r.id}.png`;
          const ek = CHARACTER_ELEMENTS[r.id] || 'electro';
          const preVis = new Image();
          preVis.src = `assets/icon-${ek}.svg`;
        } catch (_) {}
      });

    overlay.classList.remove('hidden');
    meteorStage.classList.remove('hidden');
    if (splashStage) {
      splashStage.classList.add('hidden');
      splashStage.classList.remove('gacha-splash-anim-active');
    }
    resultsStage.classList.add('hidden');

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
              ? `<div style="font-size:10.5px;color:#fde68a;background:rgba(15,23,42,0.82);border:1px solid rgba(250,204,21,0.4);border-radius:6px;padding:4px 6px;margin-top:3px;line-height:1.3;"><strong>${CHARACTER_SKILLS[item.id].icon} Chiêu Nộ [Q]: ${CHARACTER_SKILLS[item.id].name}</strong> — ${CHARACTER_SKILLS[item.id].shortDesc}</div>`
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

    const openResultsGrid = () => {
      this.stopGachaSplashMedia();
      meteorStage.classList.add('hidden');
      if (splashStage) {
        splashStage.classList.add('hidden');
        splashStage.classList.remove('gacha-splash-anim-active');
      }
      resultsStage.classList.remove('hidden');
      this.playGachaSfxFile('assets/result_list.ogg', 0.88);
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    };

    let meteorFinished = false;
    const finishMeteorStage = () => {
      if (meteorFinished) return;
      meteorFinished = true;
      clearTimeout(this.gachaMeteorTimer);
      if (meteorVideo) {
        meteorVideo.onended = null;
        meteorVideo.onerror = null;
        try {
          meteorVideo.pause();
        } catch (_) {}
      }
      meteorStage.classList.add('hidden');

      // Chỉ hiện hoạt ảnh nổ Splash Art cho vật phẩm 5★ (3★ và 4★ bỏ qua hoạt ảnh Splash Art, vào thẳng bảng kết quả)
      const splashQueue = sorted.filter((r) => r.star === 5);
      this.showGacha5StarSplashSequence(splashQueue, 0, openResultsGrid);
    };

    const skipBtn = document.getElementById('btn-skip-gacha-meteor');
    if (skipBtn) {
      skipBtn.onclick = finishMeteorStage;
    }

    clearTimeout(this.gachaMeteorTimer);

    const wishVideoFile =
      maxStar === 5
        ? isTenPull
          ? 'assets/wish_5star_10.mp4'
          : 'assets/wish_5star_1.mp4'
        : maxStar === 4
        ? isTenPull
          ? 'assets/wish_4star_10.mp4'
          : 'assets/wish_4star_1.mp4'
        : 'assets/wish_3star_1.mp4';

    if (meteorVideo) {
      meteorVideo.src = wishVideoFile;
      meteorVideo.currentTime = 0;
      meteorVideo.muted = !sfx.enabled;
      meteorVideo.volume = 0.88;
      meteorVideo.onended = finishMeteorStage;
      meteorVideo.onerror = finishMeteorStage;
      const playPromise = meteorVideo.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            clearTimeout(this.gachaMeteorTimer);
            this.gachaMeteorTimer = setTimeout(finishMeteorStage, 6800);
          })
          .catch(() => {
            meteorVideo.muted = true;
            const mutedPlay = meteorVideo.play();
            if (mutedPlay && typeof mutedPlay.then === 'function') {
              mutedPlay
                .then(() => {
                  clearTimeout(this.gachaMeteorTimer);
                  this.gachaMeteorTimer = setTimeout(finishMeteorStage, 6800);
                })
                .catch(finishMeteorStage);
            } else {
              finishMeteorStage();
            }
          });
      } else {
        this.gachaMeteorTimer = setTimeout(finishMeteorStage, 6500);
      }
    } else {
      finishMeteorStage();
    }

    if (!this.tutorialCompleted) {
      this.renderTravelerGuide();
    }
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
      const dailyInfo = this.ensureValidDailyBannerSelection();
      const prevRosterEl = gachaPanel.querySelector('.gacha-up-Roster');
      const savedRosterScrollLeft = prevRosterEl ? prevRosterEl.scrollLeft : (this.lastGachaRosterScrollLeft || 0);
      const savedRosterScrollTop = prevRosterEl ? prevRosterEl.scrollTop : (this.lastGachaRosterScrollTop || 0);

      const featuredId = this.selectedBannerBurstId || dailyInfo.todayBannerIds[0] || 'raiden';
      const featuredBurst = getBurstMeta(featuredId) || dailyInfo.todayBanners[0] || GENSHIN_BURSTS[0];
      this.preloadBurstById(featuredBurst.id);
      if (Array.isArray(dailyInfo.todayBannerIds)) {
        dailyInfo.todayBannerIds.forEach((bid) => this.preloadBurstById(bid));
      }
      const rateUp4Ids = BANNER_4STAR_RATEUPS[featuredBurst.id] || ['raiden', 'furina', 'skirk'];
      const nextPull5 = (this.gachaPity5 || 0) + 1;
      const nextPull4 = (this.gachaPity4 || 0) + 1;
      const curChance5 = (this.get5StarDropChance(nextPull5) * 100).toFixed(1);
      const curChance4 = (this.get4StarDropChance(nextPull4) * 100).toFixed(1);
      const pity5Pct = Math.min(100, Math.round(((this.gachaPity5 || 0) / 90) * 100));
      const pity4Pct = Math.min(100, Math.round(((this.gachaPity4 || 0) / 10) * 100));

      const featuredSkill = CHARACTER_SKILLS[featuredBurst.id] || CHARACTER_SKILLS.raiden;

      const upRosterHtml = dailyInfo.todayBanners.map((b, bIdx) => {
        const isCurrent = b.id === featuredBurst.id;
        const owned = this.unlockedBursts.has(b.id);
        const charName = b.name.split('—')[0].trim();
        const bSkill = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;
        return `
          <div class="gacha-up-chip ${isCurrent ? 'active' : ''}" style="padding:8px 12px;" data-burst-id="${b.id}" onmouseenter="window.tienLenGame.preloadBurstById('${b.id}')" ontouchstart="window.tienLenGame.preloadBurstById('${b.id}')" onclick="window.tienLenGame.selectBannerUp('${b.id}')" title="${bSkill.icon} Kỹ Năng [E]: ${bSkill.name} — ${bSkill.shortDesc}">
            <img src="fanart/${b.id}.jpg?v=66" alt="${charName}" style="width:46px;height:46px;" loading="lazy" referrerpolicy="no-referrer" />
            <div>
              <div class="gacha-up-chip-name" style="font-size:13.5px;">🔥 BANNER #${bIdx + 1} HÔM NAY: ${charName}</div>
              <div class="gacha-up-chip-status" style="font-size:11.5px;">${owned ? '✅ Đã sở hữu' : '🌠 Đang UP 5★ Hôm Nay'} • ${bSkill.icon} ${bSkill.name}</div>
            </div>
          </div>
        `;
      }).join('');

      const standardRosterHtml = GENSHIN_BURSTS.filter((b) => b.isStandard).map((b) => {
        const owned = this.unlockedBursts.has(b.id);
        const charName = b.name.split('—')[0].trim();
        const bSkill = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.qiqi;
        return `
          <div class="gacha-up-chip" style="border-color:rgba(148,163,184,0.35);" onmouseenter="window.tienLenGame.preloadBurstById('${b.id}')" ontouchstart="window.tienLenGame.preloadBurstById('${b.id}')" onclick="window.tienLenGame.triggerGenshinBurst('${b.id}', '🎬 Xem thử Hoạt Ảnh Nộ 5★ Thường (Lệch Rate): ${b.name}!')" title="Bấm để xem thử Nộ 5★! ${bSkill.icon} Nội Tại Cược [${bSkill.name}]: ${bSkill.shortDesc}">
            <img src="fanart/${b.id}.jpg?v=66" alt="${charName}" loading="lazy" referrerpolicy="no-referrer" />
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
              <img src="fanart/${id}.jpg?v=66" alt="${s.name}" loading="lazy" referrerpolicy="no-referrer" />
              ${id.toUpperCase()} (4★ UP)
            </span>
          `;
        })
        .join('');

      const beginnerBannerHtml = !this.beginnerBannerUsed
        ? `
          <div class="beginner-banner-box ${this.tutorialStep === 3 ? 'tutorial-highlight-pulse' : ''}" id="beginner-banner-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:260px;">
                <img src="fanart/raiden.jpg?v=66" alt="Raiden Shogun" style="width:78px;height:78px;border-radius:16px;object-fit:cover;border:2.5px solid #fde047;box-shadow:0 0 20px rgba(250,204,21,0.6);flex-shrink:0;" />
                <div>
                  <div style="display:inline-block;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#fde047,#f59e0b);color:#0f172a;font-size:11px;font-weight:900;margin-bottom:4px;">
                    🎁 BANNER TÂN THỦ ĐẶC BIỆT • CHỈ ROLL DUY NHẤT 1 LẦN ×10 RỒI BIẾN MẤT!
                  </div>
                  <div style="font-size:18px;font-weight:900;color:#ffffff;text-shadow:0 2px 10px rgba(0,0,0,0.85);">
                    ⚡ TẶNG CHẮC CHẮN 100% NHÂN VẬT 5★ LIMITED: RAIDEN SHOGUN (LÔI THẦN)
                  </div>
                  <div style="font-size:12.5px;color:#fde68a;margin-top:3px;line-height:1.4;">
                    🔮 <strong>Chiêu Nộ [Phím Q] — Tịnh Thổ Cắt Vòng:</strong> Chém đứt bộ Lẻ/Đôi ≤ J trên bàn để <strong>cướp quyền Cầm Cái mở vòng mới</strong> ngay lập tức • Mang hệ <strong>⚡ Lôi</strong> kích hoạt <strong>Phản Ứng Nguyên Tố (+5× cược)</strong> khi đánh Sảnh Lớn / Sám Cô!
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:240px;">
                <button type="button" class="gacha-wish-btn wish-10x ${this.tutorialStep === 3 ? 'tutorial-highlight-pulse' : ''}" id="btn-beginner-wish-10" onclick="window.tienLenGame.performBeginnerWish10()" style="width:100%;padding:12px 18px;border:2px solid #fef08a;">
                  <span class="gacha-wish-btn-title">🌟 Cầu Nguyện Tân Thủ ×10</span>
                  <span class="gacha-wish-btn-cost">🪙 ${WISH_COST_TEN.toLocaleString()} Vàng • Nổ Chắc Chắn 5★ Limited!</span>
                </button>
                <div style="font-size:11px;color:#e2e8f0;text-align:center;">
                  ✨ Kèm 1 Decor Bài 4★ Raiden + 8 Avatar 3★ (Tự động biến mất ngay sau khi quay)
                </div>
              </div>
            </div>
          </div>
        `
        : '';

      gachaPanel.innerHTML = `
        ${beginnerBannerHtml}
        <div class="gacha-epitomized-bar">
          <div class="gacha-epitomized-title" style="flex-wrap:wrap;gap:6px;">
            <span>🌐 2 BANNER 5★ GIỚI HẠN HÔM NAY (ĐỒNG BỘ TOÀN SERVER • CHU KỲ #${dailyInfo.cycleIndex} — NGÀY ${dailyInfo.dayInCycle}/${dailyInfo.daysPerCycle} • KHÔNG TRÙNG NHÂN VẬT TRONG CHU KỲ):</span>
            <span style="font-size:11.5px;color:#fde047;font-weight:800;">⏰ Reset 00:00 mỗi ngày (còn ${dailyInfo.hoursLeft}h ${dailyInfo.minsLeft}p) • Đã Roll: <strong>${(this.totalWishes || 0).toLocaleString()}</strong> lượt</span>
          </div>
          <div class="gacha-up-Roster" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));max-height:none;">${upRosterHtml}</div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(148,163,184,0.28);">
            <div style="font-size:11.5px;font-weight:800;color:#93c5fd;margin-bottom:4px;">
              ☯️ 8 NHÂN VẬT 5★ THƯỜNG (LỆCH RATE 50/50 • CÓ HOẠT ẢNH NỘ 5★ &amp; NỘI TẠI CƯỢC TỰ ĐỘNG, KHÔNG CÓ CHIÊU NỘ Q — BẤM ĐỂ XEM NỘ):
            </div>
            <div class="gacha-up-Roster" style="max-height:76px;">${standardRosterHtml}</div>
          </div>
        </div>

        <div class="gacha-banner-hero">
          <div class="gacha-hero-left">
            <div>
              <div class="gacha-banner-tag">🌠 BANNER NHÂN VẬT GIỚI HẠN • MỞ KHÓA NỘ 5★ &amp; CHIÊU NỘ [Q]</div>
              <div class="gacha-banner-main-title" style="margin-top:6px;">${featuredBurst.name}</div>
              <div class="gacha-banner-sub" style="margin-top:4px;">${featuredBurst.desc}</div>
            </div>

            <div class="gacha-featured-visual">
              <img class="gacha-featured-gif" src="${featuredBurst.posterUrl}" alt="${featuredBurst.name}" loading="lazy" referrerpolicy="no-referrer" />
              <div class="gacha-featured-info">
                <div class="gacha-featured-stars">⭐⭐⭐⭐⭐ VIDEO KỸ NĂNG NỘ + CHIÊU NỘ BÀN BÀI [Q] (5 SAO UP)</div>
                <div style="font-size:12px;color:#fde68a;font-weight:700;">${featuredBurst.title}</div>
                <div style="font-size:11px;color:#cbd5e1;font-style:italic;">${featuredBurst.quote}</div>
                <div class="gacha-featured-skill-box">
                  <div style="font-weight:900;color:#fde047;margin-bottom:2px;">
                    🔮 Chiêu Nộ [Phím Q]: ${featuredSkill.icon} ${featuredSkill.name}
                  </div>
                  <div style="color:#e2e8f0;">
                    ${featuredSkill.shortDesc}
                  </div>
                </div>
                <div style="margin-top:5px;">
                  <button class="tool-btn" onmouseenter="window.tienLenGame.preloadBurstById('${featuredBurst.id}')" ontouchstart="window.tienLenGame.preloadBurstById('${featuredBurst.id}')" onclick="window.tienLenGame.triggerGenshinBurst('${featuredBurst.id}', '🎬 Xem & Nghe Thử Video Nộ 5★ UP: ${featuredBurst.name}!')">
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
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
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
                ? `<img src="fanart/${currentCharId}.jpg?v=66" alt="${charSkill.charName}" />`
                : `<span style="font-size:20px;">🔒</span>`
            }
          </div>
          <div class="inv-equip-meta">
            <span class="inv-equip-label">⭐⭐⭐⭐⭐ Nhân Vật &amp; Nộ 5★ Đang Trang Bị</span>
            <strong class="inv-equip-val">${hasChar ? `${charSkill.icon} ${charSkill.charName} (${charSkill.name})` : this.unlockedBursts.size > 0 ? '⚠️ Chưa trang bị nhân vật (Hãy bấm Trang Bị bên dưới!)' : 'Chưa sở hữu Nộ 5★'}</strong>
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

    // 1. RENDER TAB KHO ĐỒ 5★ NHÂN VẬT & KỸ NĂNG NỘ (Sắp xếp: Đang xài ➔ Đã sở hữu ➔ Chưa sở hữu)
    const burstsGrid = document.getElementById('shop-bursts-grid');
    if (burstsGrid && activeInvTab === 'bursts') {
      const currentCharId = this.getPlayerActiveCharId(me);
      const rawList = onlyOwned ? GENSHIN_BURSTS.filter((b) => this.unlockedBursts.has(b.id)) : GENSHIN_BURSTS;
      const list = [...rawList].sort((a, b) => {
        const aOwned = this.unlockedBursts.has(a.id);
        const bOwned = this.unlockedBursts.has(b.id);
        const aEq = aOwned && currentCharId === a.id;
        const bEq = bOwned && currentCharId === b.id;
        const aRank = aEq ? 0 : aOwned ? 1 : 2;
        const bRank = bEq ? 0 : bOwned ? 1 : 2;
        return aRank - bRank;
      });
      if (list.length === 0) {
        burstsGrid.innerHTML = `
          <div class="inv-empty-notice" style="grid-column: 1 / -1;">
            <div>🔒 Bạn chưa sở hữu Hoạt Ảnh Kỹ Năng Nộ 5★ nào trong Kho Đồ!</div>
            <button class="primary-btn" onclick="window.tienLenGame.openGachaFromInventory()">🌠 Tới Sảnh Cầu Nguyện Mở Khóa 5★ Ngay</button>
          </div>
        `;
      } else {
        const dailyInfo = this.getServerDailyBannerInfo();
        list.slice(0, 6).forEach((b) => {
          if (this.unlockedBursts.has(b.id)) this.preloadBurstById(b.id);
        });
        burstsGrid.innerHTML = list
          .map((b) => {
            const owned = this.unlockedBursts.has(b.id);
            const isEquipped = owned && currentCharId === b.id;
            const sk = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;

            let actionsHtml = '';
            if (!owned) {
              const isUpToday = dailyInfo.todayBannerIds.includes(b.id);
              const cycIdx = dailyInfo.cycleOrder.findIndex((x) => x.id === b.id);
              const schedDay = cycIdx >= 0 ? Math.floor(cycIdx / 2) + 1 : null;
              const btnLabel = isUpToday
                ? '🔥 Đang UP Hôm Nay ➔ Tới Banner Cầu Nguyện Ngay'
                : b.isStandard
                ? '☯️ Nhân Vật 5★ Thường (Lệch Rate) ➔ Tới Sảnh Cầu Nguyện'
                : `⏳ Lịch UP: Ngày ${schedDay || '?'}/${dailyInfo.daysPerCycle} Chu Kỳ ➔ Tới Sảnh Cầu Nguyện`;
              actionsHtml = `
                <button class="shop-buy-btn buy-btn" onclick="window.tienLenGame.openGachaForCharacter('${b.id}')">
                  ${btnLabel}
                </button>
              `;
            } else {
              actionsHtml = `
                <div class="shop-burst-actions">
                  <button id="btn-equip-burst-${b.id}" class="shop-buy-btn ${isEquipped ? 'equipped-btn' : 'equip-btn'}" style="width:100%;" onclick="window.tienLenGame.buyOrEquipBurst('${b.id}')">
                    ${isEquipped ? '✅ Đang Trang Bị (Kỹ Năng + Nộ Chặt Heo & Về Nhất)' : '⚡ Trang Bị Nhân Vật Này (Kỹ Năng & Nộ)'}
                  </button>
                </div>
              `;
            }

            return `
              <div class="shop-item-card ${isEquipped ? 'equipped' : ''}" onmouseenter="window.tienLenGame.preloadBurstById('${b.id}')" ontouchstart="window.tienLenGame.preloadBurstById('${b.id}')">
                <div class="rarity-stars-badge rarity-5">⭐⭐⭐⭐⭐ NHÂN VẬT &amp; NỘ 5★ ${isEquipped ? '• ĐANG XÀI' : owned ? '• ĐÃ SỞ HỮU' : '• CHƯA SỞ HỮU'}</div>
                <div class="shop-burst-preview-wrap">
                  <img src="${b.posterUrl}" alt="${b.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" referrerpolicy="no-referrer" />
                  <button class="shop-burst-preview-btn" onmouseenter="window.tienLenGame.preloadBurstById('${b.id}')" ontouchstart="window.tienLenGame.preloadBurstById('${b.id}')" onclick="window.tienLenGame.triggerGenshinBurst('${b.id}', '🎬 Xem & Nghe Thử Video Nộ: ${b.name}!')">
                    🔊 Xem Video + Tiếng
                  </button>
                </div>
                <div class="shop-item-title">${b.name}</div>
                <div class="shop-item-desc">${b.desc}</div>
                <div style="font-size:11.5px;color:#fde68a;background:rgba(15,23,42,0.72);border:1px solid rgba(250,204,21,0.35);border-radius:8px;padding:6px 8px;margin-bottom:6px;line-height:1.35;">
                  <strong>${sk.icon} Chiêu Nộ [Phím Q]: ${sk.name}</strong> — ${sk.shortDesc}
                </div>
                ${actionsHtml}
              </div>
            `;
          })
          .join('');
      }
    }

    // 2. RENDER TAB KHO ĐỒ 4★ DECOR BÀI (Sắp xếp: Đang trang bị ➔ Đã sở hữu ➔ Chưa sở hữu)
    const skinsGrid = document.getElementById('shop-skins-grid');
    if (skinsGrid && activeInvTab === 'skins') {
      const rawList = onlyOwned ? ANIME_CARD_SKINS.filter((s) => this.unlockedSkins.has(s.id)) : ANIME_CARD_SKINS;
      const list = [...rawList].sort((a, b) => {
        const aOwned = this.unlockedSkins.has(a.id);
        const bOwned = this.unlockedSkins.has(b.id);
        const aEq = this.equippedSkin === a.id;
        const bEq = this.equippedSkin === b.id;
        const aRank = aEq ? 0 : aOwned ? 1 : 2;
        const bRank = bEq ? 0 : bOwned ? 1 : 2;
        return aRank - bRank;
      });
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

    // 3. RENDER TAB KHO ĐỒ 3★ AVATAR (Sắp xếp: Đang dùng ➔ Đã sở hữu ➔ Chưa sở hữu)
    const avatarsGrid = document.getElementById('shop-avatars-grid');
    if (avatarsGrid && activeInvTab === 'avatars') {
      const rawList = onlyOwned ? ANIME_AVATARS.filter((a) => this.unlockedAvatars.has(a.id)) : ANIME_AVATARS;
      const list = [...rawList].sort((a, b) => {
        const aOwned = this.unlockedAvatars.has(a.id);
        const bOwned = this.unlockedAvatars.has(b.id);
        const aEq = this.equippedAvatar === a.id;
        const bEq = this.equippedAvatar === b.id;
        const aRank = aEq ? 0 : aOwned ? 1 : 2;
        const bRank = bEq ? 0 : bOwned ? 1 : 2;
        return aRank - bRank;
      });
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
    this.renderInventoryModal();
    this.renderSummaryReadyStateUI();
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
    this.renderInventoryModal();
    this.renderSummaryReadyStateUI();
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
    const sk = CHARACTER_SKILLS[burstId];
    if (sk) {
      this.showComboBanner(`⚡ ĐÃ TRANG BỊ NHÂN VẬT 5★: ${sk.icon} ${sk.charName.toUpperCase()} (${sk.name.toUpperCase()})!`);
    }

    this.saveShopProfile();
    this.saveActiveMatchSnapshot();
    if (this.currentAccountUsername) {
      this.pushAccountToCloud(this.currentAccountUsername);
    }
    this.updateArenaBackdropCharacters();
    this.renderShopModal();
    this.renderInventoryModal();
    this.renderSummaryReadyStateUI();
    this.renderAll();
    this.syncCosmeticsInRoom();
    if (!this.tutorialCompleted && this.tutorialStep >= 1) {
      this.renderTravelerGuide();
    }
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
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });

    document.getElementById('btn-lobby-open-rules')?.addEventListener('click', () => {
      this.modalRules.classList.remove('hidden');
      sfx.click();
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });

    document.getElementById('btn-apply-custom-bet')?.addEventListener('click', () => {
      const inp = document.getElementById('input-custom-bet');
      if (!inp) return;
      const raw = Math.max(20, Math.round(Number(inp.value) || 100));
      this.selectBetTier(raw, true);
    });

    document.getElementById('btn-summary-change-bet')?.addEventListener('click', () => {
      if (this.isMidMatch()) {
        alert('⛔ Ván bài hiện tại chưa kết thúc! Không thể quay về Sảnh Chờ khi trận đấu đang diễn ra.');
        return;
      }
      this.modalSummary.classList.add('hidden');
      this.inInitialLobby = true;
      this.modalWifi.classList.remove('hidden');
      this.renderBetTiers();
      this.renderLobbyModal();
      this.updateMidMatchLockUI();
      sfx.click();
      if (!this.tutorialCompleted) {
        if (this.tutorialStep === 1 || this.tutorialStep === 2) {
          this.advanceTutorialStep(3);
        } else {
          this.renderTravelerGuide();
        }
      }
    });

    document.getElementById('btn-close-gacha-results')?.addEventListener('click', () => {
      document.getElementById('gacha-wish-overlay')?.classList.add('hidden');
      this.stopGachaSplashMedia();
      sfx.duckBGM(false);
      sfx.click();
      if (!this.tutorialCompleted && (this.tutorialStep === 3 || this.tutorialStep === 4) && this.beginnerBannerUsed) {
        this.advanceTutorialStep(4);
      } else if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
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
        if (!this.tutorialCompleted) {
          this.renderTravelerGuide();
        }
      });

      document.getElementById('btn-close-shop')?.addEventListener('click', () => {
        if (!this.tutorialCompleted && this.tutorialStep === 3 && !this.beginnerBannerUsed) {
          alert('🌟 Nhà Lữ Hành: Hãy bấm vào nút "🌟 Cầu Nguyện Tân Thủ ×10" đang được chỉ mũi tên để nhận 5★ Limited Raiden Shogun trước khi đóng Sảnh nhé!');
          this.renderTravelerGuide();
          return;
        }
        this.modalShop.classList.add('hidden');
        sfx.click();
        if (this._returnToSummaryAfterModal && this.isGameOver) {
          this._returnToSummaryAfterModal = false;
          this.modalSummary?.classList.remove('hidden');
          this.renderSummaryReadyStateUI();
        }
        if (!this.tutorialCompleted) {
          this.renderTravelerGuide();
        }
      });

      document.getElementById('btn-ok-shop')?.addEventListener('click', () => {
        if (!this.tutorialCompleted && this.tutorialStep === 3 && !this.beginnerBannerUsed) {
          alert('🌟 Nhà Lữ Hành: Hãy bấm vào nút "🌟 Cầu Nguyện Tân Thủ ×10" đang được chỉ mũi tên để nhận 5★ Limited Raiden Shogun trước khi đóng Sảnh nhé!');
          this.renderTravelerGuide();
          return;
        }
        this.modalShop.classList.add('hidden');
        sfx.click();
        if (this._returnToSummaryAfterModal && this.isGameOver) {
          this._returnToSummaryAfterModal = false;
          this.modalSummary?.classList.remove('hidden');
          this.renderSummaryReadyStateUI();
        }
        if (!this.tutorialCompleted) {
          this.renderTravelerGuide();
        }
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
    this.syncAutoRandomBotsUI();

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
      if (this.isMultiplayer && this.isHost && this.isGameOver && !this.areAllOnlinePlayersReadyForNextMatch()) {
        const notReadyNames = this.players
          .filter((p) => p && p.active && !p.isBot && !p.readyForNextMatch)
          .map((p) => p.name)
          .join(', ');
        alert(`⏳ Chưa thể bắt đầu ván mới! Đang chờ người chơi bấm "✋ Sẵn Sàng": ${notReadyNames}`);
        this.modalSummary?.classList.remove('hidden');
        this.renderSummaryReadyStateUI();
        return;
      }
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.inInitialLobby = false;
      this.startNewMatch(false);
    });

    this.btnWifi.addEventListener('click', async () => {
      if (!this.requireAccountLogin()) return;
      if (this.isMidMatch()) {
        alert('⛔ Ván bài hiện tại chưa kết thúc! Bạn phải đánh xong ván bài này mới được quay về Màn Hình Chờ / Đổi Chế Độ.');
        return;
      }
      await this.refreshServerInfo();
      if (this.roomId) {
        document.getElementById('share-link-input').value = this.getShareableRoomUrl(this.roomId);
      }
      ['mode-setup-modal', 'pause-modal', 'inventory-modal', 'shop-modal', 'quests-modal', 'rules-modal', 'account-modal', 'char-skill-detail-modal', 'summary-modal'].forEach(
        (id) => document.getElementById(id)?.classList.add('hidden')
      );
      this.inInitialLobby = true;
      this.modalWifi.classList.remove('hidden');
      this.renderSoloPlayerCountUI();
      this.renderBetTiers();
      this.renderLobbyModal();
      this.updateMidMatchLockUI();
      sfx.click();
      if (!this.tutorialCompleted) {
        if (this.tutorialStep === 1 || this.tutorialStep === 2) {
          this.advanceTutorialStep(3);
        } else {
          this.renderTravelerGuide();
        }
      }
    });

    document.getElementById('btn-close-wifi').addEventListener('click', () => {
      if (!this.requireAccountLogin()) return;
      if (!this.tutorialCompleted && (this.tutorialStep === 2 || this.tutorialStep === 3 || this.tutorialStep === 4)) {
        alert('🌟 Nhà Lữ Hành: Hãy làm theo hướng dẫn của mình trên màn hình trước khi vào bàn nhé!');
        return;
      }
      if (this.isMultiplayer && this.roomId) {
        if (!this.isMidMatch()) {
          alert(`⛔ Bạn đang ở trong Phòng Chờ Nhiều Người (#${this.roomId})! Không được phép ra khỏi Sảnh Chờ khi trận đấu chưa bắt đầu (hoặc bấm "✕ Rời phòng" nếu muốn thoát phòng).`);
          return;
        }
        document.getElementById('mode-setup-modal')?.classList.add('hidden');
        this.modalWifi.classList.add('hidden');
        this.updateMidMatchLockUI();
        return;
      }
      if (!this.isMidMatch()) {
        alert('⛔ Hiện chưa có ván đấu nào đang diễn ra! Vui lòng bấm chọn "🤖 CHƠI VỚI BOT" hoặc "👥 CHƠI VỚI NGƯỜI" trên Sảnh Chờ để bắt đầu ván đấu.');
        return;
      }
      this.inInitialLobby = false;
      document.getElementById('mode-setup-modal')?.classList.add('hidden');
      this.modalWifi.classList.add('hidden');
      this.saveActiveMatchSnapshot();
      this.updateMidMatchLockUI();
      if (!this.isGameOver) {
        clearTimeout(this.botTimer);
        this.promptCurrentTurn();
      }
    });

    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      if (!this.requireAccountLogin()) return;
      if (!this.isMultiplayer && this.isMidMatch()) {
        alert('⛔ Bạn đang đánh dở ván bài với Bot! Không thể chơi 2 trận với Người và với Bot cùng 1 lúc.');
        return;
      }
      if (this.isMultiplayer && this.isMidMatch()) {
        alert('⛔ Trận đấu trong phòng hiện tại chưa kết thúc! Bạn không được phép tạo phòng khác khi ván bài đang diễn ra.');
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
      if (this.isMultiplayer && this.roomId) {
        if (this.isMidMatch()) {
          alert(`⛔ Bạn đang trong trận đấu với Người (Phòng #${this.roomId}) chưa kết thúc! Tuyệt đối không thể chơi 2 trận với Người và với Bot cùng 1 lúc.`);
        } else {
          alert(`⛔ Bạn đang ở trong Phòng Đấu Với Người (#${this.roomId})! Không thể vào trận Đấu Với Bot cùng lúc. Vui lòng bấm "✕ Rời phòng" trước nếu muốn chuyển sang chơi với Bot.`);
        }
        return;
      }
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
      if (!this.tutorialCompleted && this.tutorialStep === 4) {
        this.startTutorialMatch2WithRaiden();
        return;
      }
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
      this.renderSummaryReadyStateUI();
      this.modalSummary.classList.remove('hidden');
      sfx.click();
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });

    document.getElementById('btn-close-summary').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });

    document.getElementById('btn-peek-table').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
      if (!this.tutorialCompleted && (this.tutorialStep === 2 || this.tutorialStep === 6)) {
        alert('🌟 Nhà Lữ Hành: Hãy bấm vào nút "🏠 Đổi Chế Độ / Đổi Mức Cược" đang được mũi tên chỉ vào để về Màn Hình Chờ nhé!');
        this.renderTravelerGuide();
        return;
      }
      if (this.isMultiplayer && !this.isHost) {
        const me = this.getLocalPlayer();
        if (me && !me.readyForNextMatch) {
          this.toggleSummaryReady();
        }
        this.elTurnBanner.textContent = '⏳ Bạn đã Sẵn Sàng! Đang chờ Chủ phòng bắt đầu ván tiếp theo...';
        return;
      }
      if (this.isMultiplayer && this.isHost && !this.areAllOnlinePlayersReadyForNextMatch()) {
        const notReadyNames = this.players
          .filter((p) => p && p.active && !p.isBot && !p.readyForNextMatch)
          .map((p) => p.name)
          .join(', ');
        alert(`⏳ Cần tất cả người chơi trong phòng bấm "✋ Sẵn Sàng Ván Tiếp" (đổi đồ xong) mới có thể bắt đầu!\nĐang chờ: ${notReadyNames}`);
        this.renderSummaryReadyStateUI();
        return;
      }
      this.modalSummary.classList.add('hidden');
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
      if (!this.tutorialCompleted && this.tutorialStep >= 6) {
        if (this.modalSummary) this.modalSummary.classList.add('hidden');
      }
      this.modalRules.classList.remove('hidden');
      sfx.click();
      if (!this.tutorialCompleted) {
        this.renderTravelerGuide();
      }
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
      this.onCloseRulesModalCompleteTutorial();
    });
    document.getElementById('btn-ok-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
      this.onCloseRulesModalCompleteTutorial();
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
        if (!this.tutorialCompleted && this.tutorialStep >= 1 && this.tutorialStep <= 6) {
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
        if (this.selectedCardIds.size > 0) {
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
      if (!this.tutorialCompleted && this._tutorialTargetEl) {
        if ((e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') && this._tutorialTargetEl === this.btnCharSkill) {
          if (this.btnCharSkill && !this.btnCharSkill.disabled) {
            e.preventDefault();
            this.onHumanUseSkill();
          }
        } else if ((e.code === 'Space' || e.code === 'Enter') && this._tutorialTargetEl === this.btnPlay) {
          if (!this.btnPlay.disabled) {
            e.preventDefault();
            this.onHumanPlay();
          }
        }
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
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
        if (this.btnCharSkill && !this.btnCharSkill.disabled) {
          e.preventDefault();
          this.onHumanUseSkill();
        }
      }
    });

    this.setupTutorialInteractionGuard();
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
    const targetMode = mode === 'human' ? 'human' : 'bot';
    if (!this.tutorialCompleted && (this.tutorialStep === 2 || this.tutorialStep === 3)) {
      alert('🌟 Nhà Lữ Hành: Hãy vào Sảnh Cầu Nguyện để nhận Nhân Vật 5★ Limited tặng Tân Thủ trước khi tạo bàn nhé!');
      return;
    }
    if (!this.tutorialCompleted && this.tutorialStep === 4 && this.equippedActiveChar !== 'raiden') {
      alert('🌟 Nhà Lữ Hành: Bạn phải vào "🎒 Kho Đồ" mặc Raiden Shogun trước thì mới sử dụng được nhân vật trên bàn đấu nhé!');
      this.renderTravelerGuide();
      return;
    }
    if (!this.tutorialCompleted && this.tutorialStep === 4 && targetMode === 'human') {
      alert('🌟 Nhà Lữ Hành: Ở bước hướng dẫn này, hãy bấm chọn "🤖 CHƠI VỚI BOT" để mình hướng dẫn bạn xài chiêu của Raiden Shogun và Phản Ứng Nguyên Tố nhé!');
      return;
    }
    if (targetMode === 'bot' && this.isMultiplayer && this.roomId) {
      if (this.isMidMatch()) {
        alert(`⛔ Bạn đang trong trận đấu với Người (Phòng #${this.roomId}) chưa kết thúc! Tuyệt đối không thể chơi 2 trận với Người và với Bot cùng 1 lúc.`);
      } else {
        alert(`⛔ Bạn đang ở trong Phòng Đấu Với Người (#${this.roomId})! Không thể mở bàn Đấu Với Bot cùng lúc. Vui lòng bấm "✕ Rời phòng" trước nếu muốn chuyển sang chơi với Bot.`);
      }
      return;
    }
    if (targetMode === 'human' && !this.isMultiplayer && this.isMidMatch()) {
      alert('⛔ Bạn đang trong trận đấu với Bot chưa kết thúc! Tuyệt đối không thể chơi 2 trận với Người và với Bot cùng 1 lúc.');
      return;
    }
    this.selectLobbyMode(targetMode);
    const modal = document.getElementById('mode-setup-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    if (!this.tutorialCompleted && this.tutorialStep === 4 && targetMode === 'bot') {
      this.renderTravelerGuide();
    }
  }

  closeModeSetupModal() {
    document.getElementById('mode-setup-modal')?.classList.add('hidden');
    if (this.roomsDirRefreshTimer) {
      clearInterval(this.roomsDirRefreshTimer);
      this.roomsDirRefreshTimer = null;
    }
    sfx.click();
    if (!this.tutorialCompleted) {
      this.renderTravelerGuide();
    }
  }

  selectLobbyMode(mode) {
    const requestedMode = mode === 'human' ? 'human' : 'bot';
    if (requestedMode === 'bot' && this.isMultiplayer && this.roomId) {
      this.selectedLobbyMode = 'human';
    } else if (requestedMode === 'human' && !this.isMultiplayer && this.isMidMatch()) {
      this.selectedLobbyMode = 'bot';
    } else {
      this.selectedLobbyMode = requestedMode;
    }
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
    if (this.isMultiplayer) {
      return (this.matchCount || 0) >= 1;
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
    if (this.btnWifi) {
      this.btnWifi.style.opacity = locked ? '0.6' : '1';
      this.btnWifi.style.cursor = locked ? 'not-allowed' : 'pointer';
      const subEl = document.getElementById('wifi-status-label');
      if (subEl) {
        subEl.textContent = locked
          ? '🔒 Đánh xong ván mới được về Sảnh'
          : this.isMultiplayer && this.roomId
          ? `Phòng #${this.roomId}`
          : 'Chọn Chế Độ / Đổi Cược';
      }
    }
    const btnCloseWifi = document.getElementById('btn-close-wifi');
    if (btnCloseWifi) {
      const canReturnTable = this.isMidMatch();
      btnCloseWifi.style.opacity = canReturnTable ? '1' : '0.55';
      btnCloseWifi.title = canReturnTable
        ? 'Đóng Sảnh Chờ để quay lại bàn đang đánh'
        : 'Hiện chưa có ván đấu nào đang diễn ra — Hãy chọn Chơi Với Bot hoặc Chơi Với Người!';
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
        mavuikaWrapStraightTurn: !!this.mavuikaWrapStraightTurn,
        naviaFlushStraightTurn: !!this.naviaFlushStraightTurn,
        naviaLockedTargetId: this.naviaLockedTargetId ?? null,
        naviaLockedCardIds: Array.from(this.naviaLockedCardIds || []),
        shenheSingleOnlyRound: !!this.shenheSingleOnlyRound,
        ganyuGapStraightTurn: !!this.ganyuGapStraightTurn,
        kokomiReverseRankRound: !!this.kokomiReverseRankRound,
        yoimiyaChainFuseReady: !!this.yoimiyaChainFuseReady,
        citlaliPillowOwnerId: this.citlaliPillowOwnerId ?? null,
        citlaliPillowTargetId: this.citlaliPillowTargetId ?? null,
        xiaoKarmaOwnerId: this.xiaoKarmaOwnerId ?? null,
        emiliePerfumeOwnerId: this.emiliePerfumeOwnerId ?? null,
        emilieRequiredSuit: this.emilieRequiredSuit ?? null,
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
      this.mavuikaWrapStraightTurn = !!snap.mavuikaWrapStraightTurn;
      activeMavuikaWrapStraight = this.mavuikaWrapStraightTurn;
      this.naviaFlushStraightTurn = !!snap.naviaFlushStraightTurn;
      activeNaviaFlushStraight = this.naviaFlushStraightTurn;
      this.naviaLockedTargetId = snap.naviaLockedTargetId ?? null;
      this.naviaLockedCardIds = new Set(Array.isArray(snap.naviaLockedCardIds) ? snap.naviaLockedCardIds : []);
      activeNaviaLockedCardIds = this.naviaLockedCardIds;
      this.shenheSingleOnlyRound = !!snap.shenheSingleOnlyRound;
      activeShenheSingleOnly = this.shenheSingleOnlyRound;
      this.ganyuGapStraightTurn = !!snap.ganyuGapStraightTurn;
      activeGanyuGapStraight = this.ganyuGapStraightTurn;
      this.kokomiReverseRankRound = !!snap.kokomiReverseRankRound;
      activeKokomiReverseRank = this.kokomiReverseRankRound;
      this.yoimiyaChainFuseReady = !!snap.yoimiyaChainFuseReady;
      this.citlaliPillowOwnerId = snap.citlaliPillowOwnerId ?? null;
      this.citlaliPillowTargetId = snap.citlaliPillowTargetId ?? null;
      this.xiaoKarmaOwnerId = snap.xiaoKarmaOwnerId ?? null;
      this.emiliePerfumeOwnerId = snap.emiliePerfumeOwnerId ?? null;
      this.emilieRequiredSuit = snap.emilieRequiredSuit ?? null;
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
        activeChar: idx === 0 ? this.equippedActiveChar || 'none' : p.activeChar || p.chopBurst || p.cardSkin || 'raiden',
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
      return this.equippedActiveChar && this.equippedActiveChar !== 'none' && this.unlockedBursts?.has(this.equippedActiveChar)
        ? this.equippedActiveChar
        : 'none';
    }
    // Người chơi chính: PHẢI TRANG BỊ nhân vật trong Kho Đồ mới sử dụng được Kỹ Năng [E], Nguyên Tố & Hoạt Ảnh Nộ 5★!
    if (player.id === this.mySeatId && !player.isBot) {
      if (!this.tutorialCompleted && this.tutorialStep === 1 && !this.beginnerBannerUsed) {
        return 'none';
      }
      if (
        this.equippedActiveChar &&
        this.equippedActiveChar !== 'none' &&
        CHARACTER_SKILLS[this.equippedActiveChar] &&
        this.unlockedBursts.has(this.equippedActiveChar)
      ) {
        return this.equippedActiveChar;
      }
      return 'none';
    }
    // Khách trong phòng Multiplayer (không phải Bot): lấy theo nhân vật họ đang trang bị
    if (!player.isBot) {
      if (player.activeChar && player.activeChar !== 'none' && CHARACTER_SKILLS[player.activeChar]) {
        return player.activeChar;
      }
      return 'none';
    }
    // Bot AI (luôn đồng bộ 100% giữa activeChar, chopBurst, winBurst và cardSkin)
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
      if (activeId && activeId !== 'none' && CHARACTER_ELEMENTS[activeId]) return CHARACTER_ELEMENTS[activeId];
      if (player.isBot) {
        const candidates = [player.chopBurst, player.winBurst, player.avatar, player.cardSkin];
        for (const id of candidates) {
          if (id && CHARACTER_ELEMENTS[id]) return CHARACTER_ELEMENTS[id];
        }
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

  getSpecialPlayReaction(player, combo, targetOpponent = null) {
    const opp =
      targetOpponent && targetOpponent.id !== player?.id
        ? targetOpponent
        : this.currentCombo && this.trickOwnerId !== null && this.trickOwnerId !== player?.id
        ? this.players[this.trickOwnerId]
        : null;
    if (!player || !opp) return null;
    const attackerCharId = this.getPlayerActiveCharId(player);
    const defenderCharId = this.getPlayerActiveCharId(opp);
    if (attackerCharId === 'none' || defenderCharId === 'none') {
      return null;
    }
    const attackerElem = this.getPlayerElement(player, combo);
    const defenderElem = this.getPlayerElement(opp, this.currentCombo);
    const prevReaction = this.currentCombo?.reaction || null;

    // 1. Khi nhân vật đánh trước đó vừa kích hoạt phản ứng Sum Suê / Nguyệt Sum Suê (isBloom),
    // nếu mình phản ứng bằng nguyên tố Lôi (electro) sẽ thành Nở Rộ (Hyperbloom ×10 lần cược),
    // tương tự với hệ Hỏa (pyro) sẽ thành Bung Tỏa (Burgeon ×10 lần cược)!
    if (
      prevReaction &&
      (prevReaction.isBloom ||
        prevReaction.cssClass === 'reaction-bloom' ||
        prevReaction.cssClass === 'reaction-lunar-bloom')
    ) {
      if (attackerElem === 'electro') {
        return {
          id: 'hyperbloom',
          shortName: '🌿💧⚡ Nở Rộ (Hyperbloom)',
          badge: '🌿💧⚡ PHẢN ỨNG NỞ RỘ (HYPERBLOOM)',
          cssClass: 'reaction-hyperbloom',
          multiplier: 10,
        };
      }
      if (attackerElem === 'pyro') {
        return {
          id: 'burgeon',
          shortName: '🌿💧🔥 Bung Tỏa (Burgeon)',
          badge: '🌿💧🔥 PHẢN ỨNG BUNG TỎA (BURGEON)',
          cssClass: 'reaction-burgeon',
          multiplier: 10,
        };
      }
    }

    // Hai nhân vật trùng nguyên tố hoặc 2 nguyên tố không tương tác thực tế sẽ KHÔNG có Phản Ứng Nguyên Tố!
    if (!checkGenuineGenshinReaction(attackerElem, defenderElem)) {
      return null;
    }

    // 2. Phản Ứng Nguyệt (×10 cược): CHỈ khi người đánh đè (attackerCharId) là Linnea, Flins, Lauma, Nefer, Ineffa, Zibai
    // kích hoạt phản ứng lên bài hệ Thủy (Hydro) trên bàn -> Nguyệt Điện Cảm / Nguyệt Kết Tinh / Nguyệt Sum Suê!
    const LUNAR_CHARS = new Set(['linnea', 'flins', 'lauma', 'nefer', 'ineffa', 'zibai']);
    const isLunarWithHydro = LUNAR_CHARS.has(attackerCharId) && defenderElem === 'hydro';
    if (isLunarWithHydro) {
      const pair = new Set([attackerElem, defenderElem]);
      if (pair.has('electro') && pair.has('hydro')) {
        return {
          id: 'lunar_electrocharged',
          shortName: '🌙⚡💧 Nguyệt Điện Cảm',
          badge: '🌙⚡💧 PHẢN ỨNG NGUYỆT ĐIỆN CẢM',
          cssClass: 'reaction-lunar-electrocharged',
          multiplier: 10,
        };
      }
      if (attackerElem === 'geo' && defenderElem === 'hydro') {
        return {
          id: 'lunar_crystallize',
          shortName: '🌙💎💧 Nguyệt Kết Tinh',
          badge: '🌙💎💧 PHẢN ỨNG NGUYỆT KẾT TINH',
          cssClass: 'reaction-lunar-crystallize',
          multiplier: 10,
        };
      }
      if (pair.has('dendro') && pair.has('hydro')) {
        return {
          id: 'lunar_bloom',
          isBloom: true,
          shortName: '🌙🌿💧 Nguyệt Sum Suê',
          badge: '🌙🌿💧 PHẢN ỨNG NGUYỆT SUM SUÊ',
          cssClass: 'reaction-lunar-bloom',
          multiplier: 10,
        };
      }
    }

    // 3. Phản Ứng Tinh (×10 cược): CHỈ khi người đánh đè (attackerCharId) là:
    // - Sandrone, Odette kích hoạt phản ứng lên bài hệ Lôi (electro) -> Tinh Siêu Dẫn (×10 cược)
    // - Vesna kích hoạt phản ứng lên bài hệ Băng (cryo) -> Tinh Khuếch Tán (×10 cược)
    const ASTRAL_SUPERCONDUCT_CHARS = new Set(['sandrone', 'odette']);
    const isAstralSuperconduct =
      ASTRAL_SUPERCONDUCT_CHARS.has(attackerCharId) && defenderElem === 'electro';
    if (isAstralSuperconduct) {
      return {
        id: 'astral_superconduct',
        shortName: '✨❄️⚡ Tinh Siêu Dẫn',
        badge: '✨❄️⚡ PHẢN ỨNG TINH SIÊU DẪN',
        cssClass: 'reaction-astral-superconduct',
        multiplier: 10,
      };
    }

    if (attackerCharId === 'vesna' && defenderElem === 'cryo') {
      return {
        id: 'astral_swirl',
        shortName: '✨🍃❄️ Tinh Khuếch Tán',
        badge: '✨🍃❄️ PHẢN ỨNG TINH KHUẾCH TÁN',
        cssClass: 'reaction-astral-swirl',
        multiplier: 10,
      };
    }

    return resolveGenshinReaction(attackerElem, defenderElem);
  }

  syncAutoRandomBotsUI() {
    const enabled = this.autoRandomizeBots !== false;
    const label = enabled ? '🔄 Tự Động Random: BẬT' : '🔄 Tự Động Random: TẮT';
    document.querySelectorAll('.auto-random-bot-toggle-btn').forEach((btn) => {
      btn.textContent = label;
      btn.style.borderColor = enabled ? '#34d399' : 'rgba(148,163,184,0.45)';
      btn.style.background = enabled
        ? 'linear-gradient(135deg,rgba(16,185,129,0.32),rgba(5,150,105,0.28))'
        : 'rgba(15,23,42,0.75)';
      btn.style.color = enabled ? '#a7f3d0' : '#cbd5e1';
      btn.style.boxShadow = enabled ? '0 0 10px rgba(16,185,129,0.35)' : 'none';
      btn.title = enabled
        ? 'Đang BẬT Tự động Random Bot sau mỗi ván bài (Bấm để TẮT và giữ nguyên Bot)'
        : 'Đang TẮT Tự động Random Bot — Giữ nguyên nhân vật Bot qua các ván (Bấm để BẬT)';
    });
    const autoRandomChk = document.getElementById('chk-auto-random-bots');
    if (autoRandomChk) {
      autoRandomChk.checked = enabled;
    }
  }

  toggleAutoRandomBots(forceVal = null) {
    if (this.isMultiplayer && !this.isHost) {
      alert('Chỉ Chủ phòng mới có thể bật/tắt Tự Động Random Bot trong phòng WiFi!');
      return;
    }
    if (typeof forceVal === 'boolean') {
      this.autoRandomizeBots = forceVal;
    } else {
      this.autoRandomizeBots = !this.autoRandomizeBots;
    }
    sfx.click();
    this.saveShopProfile();
    this.syncAutoRandomBotsUI();

    const activeBotSeats = this.getActiveBotSeats();
    if (this.autoRandomizeBots) {
      if (activeBotSeats.length > 0 && !this.isMidMatch()) {
        this.randomizeBotCharacters(true);
      }
      if (!this.modalSummary?.classList.contains('hidden')) {
        this.showSummaryBotStatus(
          `🔄 <strong>Đã BẬT Tự Động Random Bot mỗi ván!</strong> Đội hình hiện tại: <strong>${this.getActiveBotNamesPlain()}</strong>.`
        );
      }
    } else {
      if (!this.modalSummary?.classList.contains('hidden')) {
        this.showSummaryBotStatus(
          `📌 <strong>Đã TẮT Tự Động Random Bot:</strong> Giữ nguyên đội hình Bot hiện tại (<strong>${this.getActiveBotNamesPlain()}</strong>) cho các ván sau.`
        );
      }
    }
  }

  getActiveBotSeats() {
    if (this.isMultiplayer) {
      return (this.players || [])
        .map((p, idx) => (p && p.active && p.isBot ? idx : -1))
        .filter((idx) => idx >= 0);
    }
    const count = this.soloPlayerCount || 4;
    return count === 2 ? [2] : count === 3 ? [1, 2] : [1, 2, 3];
  }

  getBotSeatLabel(seatIdx) {
    if (this.isMultiplayer) {
      return `Ghế #${seatIdx + 1} (Bot WiFi)`;
    }
    const count = this.soloPlayerCount || 4;
    const labels = {
      1: 'Ghế Trái',
      2: count === 2 ? 'Ghế Đối Diện (1v1)' : 'Ghế Đối Diện',
      3: 'Ghế Phải',
    };
    return labels[seatIdx] || `Ghế #${seatIdx + 1}`;
  }

  addBotToNextEmptyWifiSeat() {
    if (!this.isMultiplayer || !this.isHost) {
      alert('Chỉ Chủ phòng mới có thể thêm Bot vào phòng!');
      return false;
    }
    if (this.isMidMatch()) {
      alert('⛔ Ván bài đang diễn ra! Vui lòng hoàn thành ván hiện tại trước khi thêm Bot.');
      return false;
    }
    const emptySeat = (this.players || []).find((p, idx) => idx !== this.mySeatId && !p.active);
    if (!emptySeat) {
      alert('⚠️ Cả 4 ghế trong phòng đều đã có người / Bot ngồi!');
      return false;
    }
    this.toggleBotInLobby(emptySeat.id, true);
    return true;
  }

  randomizeSingleBotSeat(seatIdx, notify = true) {
    if (this.isMultiplayer && !this.isHost) {
      alert('Chỉ Chủ phòng mới có thể đổi nhân vật Bot!');
      return;
    }
    const p = this.players?.[seatIdx];
    if (!p || (this.isMultiplayer && (!p.active || !p.isBot))) return;
    const roster = this.getBotBurstRoster();
    const usedIds = new Set(
      (this.players || [])
        .filter((pl, i) => pl && pl.active && i !== seatIdx)
        .map((pl) => pl.activeChar || pl.cardSkin)
    );
    const curId =
      this.isMidMatch() && this.queuedNextMatchBots?.[seatIdx]
        ? this.queuedNextMatchBots[seatIdx].id
        : p.activeChar || p.cardSkin;
    const pool = roster.filter((c) => c.id !== curId && !usedIds.has(c.id));
    const candidates = pool.length > 0 ? pool : roster.filter((c) => c.id !== curId);
    const ch = candidates[Math.floor(Math.random() * candidates.length)] || roster[0];
    this.selectBotCharacterForSeat(seatIdx, ch.id, false);
    if (notify) {
      const shortName = ch.name.split('(')[0].trim();
      this.addLog(
        `🎲 <strong>[Đổi Nhân Vật Bot]</strong> ${this.getBotSeatLabel(seatIdx)} đã đổi sang <strong>Bot ${shortName} ${ch.crest}</strong>!`,
        'log-win'
      );
    }
  }

  randomizeBotCharacters(notify = false) {
    if (!this.players || this.players.length < 4) return;
    if (this.isMultiplayer && !this.isHost) {
      if (notify) alert('Chỉ Chủ phòng mới có thể đổi nhân vật Bot trong phòng!');
      return;
    }
    if (this.isMultiplayer && this.getActiveBotSeats().length === 0) {
      if (!this.isMidMatch()) {
        const added = this.addBotToNextEmptyWifiSeat();
        if (!added) return;
      } else {
        if (notify) alert('Trong bàn hiện chưa có ghế Bot nào!');
        return;
      }
    }

    const targetSeats = this.isMultiplayer ? this.getActiveBotSeats() : [1, 2, 3];
    const prevBotCharIds = new Set(
      targetSeats
        .map((sIdx) =>
          this.isMidMatch() && this.queuedNextMatchBots?.[sIdx]
            ? this.queuedNextMatchBots[sIdx].id
            : this.players?.[sIdx]?.activeChar || this.players?.[sIdx]?.cardSkin
        )
        .filter(Boolean)
    );
    const fullRoster = [...this.getBotBurstRoster()]; // 58 Nhân vật 5★ có Burst Animation riêng
    const diffPool = fullRoster.filter((c) => !prevBotCharIds.has(c.id));
    const pool = diffPool.length >= 4 ? diffPool : fullRoster;
    // Thuật toán trộn bài Fisher-Yates chuẩn xác 100% không thiên vị
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, 4);

    if (this.isMidMatch()) {
      // Đang chơi giữa trận: Cho phép Random chọn trước nhân vật Bot cho VÁN TIẾP THEO mà không phá ván đang đánh!
      this.queuedNextMatchBots = {
        1: picked[0] || pool[0],
        2: picked[1] || pool[1 % pool.length],
        3: picked[2] || pool[2 % pool.length],
      };
      targetSeats.forEach((sIdx, idx) => {
        this.queuedNextMatchBots[sIdx] = picked[idx] || pool[idx % pool.length];
      });
      sfx.click();
      const activeIdxs = this.getActiveBotSeats();
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
      if (this.isMultiplayer && this.isHost) {
        this.renderLobbyModal();
      }
      this.updateMidMatchLockUI();
      return;
    }

    this.queuedNextMatchBots = null;
    targetSeats.forEach((seatIdx, idx) => {
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
      const activeBots = this.players.filter((p) => p.active && p.isBot);
      const names = (activeBots.length > 0 ? activeBots : [this.players[2]])
        .filter(Boolean)
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
    if (this.isMultiplayer && !this.isHost) {
      alert('Chỉ Chủ phòng mới có thể chọn nhân vật Bot trong phòng WiFi!');
      return;
    }
    if (this.isMultiplayer && this.getActiveBotSeats().length === 0) {
      if (!this.isMidMatch()) {
        const added = this.addBotToNextEmptyWifiSeat();
        if (!added) return;
      } else {
        alert('Trong phòng hiện chưa có ghế Bot nào! Hãy thêm Bot ở sảnh chờ trước.');
        return;
      }
    }
    sfx.click();
    const activeSeats = this.getActiveBotSeats();
    this.activeBotPickerSeat = activeSeats.includes(Number(preferredSeatIdx))
      ? Number(preferredSeatIdx)
      : activeSeats[0] ?? 2;
    this.botPickerFromSummary = !!fromSummary;
    this.syncAutoRandomBotsUI();
    this.renderBotPickerModal();
    document.getElementById('bot-picker-modal')?.classList.remove('hidden');
  }

  closeBotPickerModal() {
    sfx.click();
    document.getElementById('bot-picker-modal')?.classList.add('hidden');
  }

  randomizeBotFromPicker() {
    this._manualBotChangedAfterMatch = true;
    this.randomizeBotCharacters(true);
    this.renderBotPickerModal();
    if (this.botPickerFromSummary) {
      this.showSummaryBotStatus(`🎲 Đã đổi ngẫu nhiên đối thủ Bot: ${this.getActiveBotNamesPlain()}`);
    }
  }

  selectBotCharacterForSeat(seatIdx, charId, advanceTab = true) {
    if (this.isMultiplayer && !this.isHost) return;
    const roster = this.getBotBurstRoster();
    const ch = roster.find((c) => c.id === charId);
    if (!ch || !this.players || !this.players[seatIdx]) return;
    sfx.click();
    this._manualBotChangedAfterMatch = true;

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
    if (this.isMultiplayer && this.isHost) {
      this.renderLobbyModal();
      if (!this.isMidMatch()) {
        this.broadcastState();
      }
    }
    this.updateMidMatchLockUI();
    this.syncSummaryBotNamesUI();

    const activeSeats = this.getActiveBotSeats();
    const curPos = activeSeats.indexOf(seatIdx);
    if (advanceTab && activeSeats.length > 1 && curPos >= 0 && curPos < activeSeats.length - 1) {
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

    this.syncAutoRandomBotsUI();
    const activeSeats = this.getActiveBotSeats();
    if (activeSeats.length === 0) {
      tabsEl.innerHTML = `<div style="color:#fde047;font-weight:700;">⚠️ Chưa có ghế Bot nào trong bàn!</div>`;
      gridEl.innerHTML = '';
      return;
    }
    if (!activeSeats.includes(this.activeBotPickerSeat)) {
      this.activeBotPickerSeat = activeSeats[0];
    }
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
        const seatLabel = this.getBotSeatLabel(sIdx);
        return `
          <button type="button" onclick="window.tienLenGame.activeBotPickerSeat=${sIdx};window.tienLenGame.renderBotPickerModal();" style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:12px;cursor:pointer;border:2px solid ${
            isSelectedTab ? '#38bdf8' : 'rgba(148,163,184,0.3)'
          };background:${
            isSelectedTab ? 'linear-gradient(135deg,rgba(2,132,199,0.38),rgba(37,99,235,0.32))' : 'rgba(15,23,42,0.75)'
          };color:#f8fafc;box-shadow:${isSelectedTab ? '0 0 14px rgba(56,189,248,0.4)' : 'none'};">
            <img src="fanart/${cid}.jpg?v=66" alt="${sk ? sk.charName : cid}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 18%;border:1.5px solid #38bdf8;" />
            <div style="text-align:left;">
              <div style="font-size:11px;color:#93c5fd;font-weight:700;">${seatLabel} ${isSelectedTab ? '• Đang chọn' : ''}</div>
              <div style="font-size:13.5px;font-weight:800;color:#fff;">Bot ${sk ? `${sk.charName} ${sk.crest || sk.icon}` : cid}</div>
            </div>
          </button>
        `;
      })
      .join('');

    const activeSeat = this.activeBotPickerSeat;
    const activeSeatLabel = this.getBotSeatLabel(activeSeat);
    const currentSeatCharId = getSeatCharId(activeSeat);
    const otherSeatMap = {};
    activeSeats.forEach((sIdx) => {
      if (sIdx !== activeSeat) {
        otherSeatMap[getSeatCharId(sIdx)] = this.getBotSeatLabel(sIdx);
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
              <img src="fanart/${ch.id}.jpg?v=66" alt="${shortName}" loading="lazy" style="width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid ${
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
                ? `<div style="font-size:11px;font-weight:800;color:#fde047;text-align:center;background:rgba(234,179,8,0.18);border-radius:6px;padding:2px 4px;">✅ Đang chọn cho ${activeSeatLabel}</div>`
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
    const activeSeats = this.getActiveBotSeats();
    if (activeSeats.length === 0) return 'Chưa có Bot';
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
    this._manualBotChangedAfterMatch = false;
    const canManageBots = !this.isMultiplayer || (this.isHost && this.getActiveBotSeats().length > 0);
    if (box) {
      box.classList.toggle('hidden', !canManageBots);
    }

    // Tự động đổi sang Bot mới NGAY LẬP TỨC khi chơi xong 1 trận mà không cần ấn bất kỳ nút nào!
    if (canManageBots) {
      if (this.queuedNextMatchBots) {
        this.applyQueuedNextMatchBots();
        this._manualBotChangedAfterMatch = true;
      } else if (this.autoRandomizeBots !== false) {
        this.randomizeBotCharacters(false);
        this._manualBotChangedAfterMatch = true;
      }
    }

    this.syncSummaryBotNamesUI();
    this.syncAutoRandomBotsUI();
    stepAsk?.classList.add('hidden');
    stepActions?.classList.remove('hidden');
    if (statusMsg) {
      if (this.autoRandomizeBots !== false) {
        statusMsg.innerHTML = `🔄 <strong>Tự Động Random Bot:</strong> Đã tự động đổi sang đối thủ Bot mới cho ván tiếp theo: <strong>${this.getActiveBotNamesPlain()}</strong>!`;
        statusMsg.classList.remove('hidden');
      } else {
        statusMsg.innerHTML = `📌 Chế độ <strong>Tự Động Random Bot</strong> đang <strong>TẮT</strong> — Đang giữ nguyên đối thủ Bot: <strong>${this.getActiveBotNamesPlain()}</strong>.`;
        statusMsg.classList.remove('hidden');
      }
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
      this._manualBotChangedAfterMatch = true;
      this.saveShopProfile();
      this.syncAutoRandomBotsUI();
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
    this._manualBotChangedAfterMatch = true;
    this.randomizeBotCharacters(true);
    this.syncSummaryBotNamesUI();
    this.showSummaryBotStatus(
      `🎲 Đã đổi ngẫu nhiên sang: <strong>${this.getActiveBotNamesPlain()}</strong>! (Bấm 🎲 Ngẫu Nhiên để xoay tiếp hoặc bấm 🃏 Chia Ván Tiếp Theo)`
    );
  }

  applyQueuedNextMatchBots() {
    if (!this.queuedNextMatchBots || !this.players || this.players.length < 4) return;
    const targetSeats = this.isMultiplayer ? this.getActiveBotSeats() : [1, 2, 3];
    targetSeats.forEach((seatIdx) => {
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
    if (this.isMultiplayer && this.isHost) {
      this.renderLobbyModal();
    }
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
      leftEl.style.backgroundImage = `url('fanart/${leftArtId}.jpg?v=66')`;
    }
    if (rightEl) {
      const activeOpponents = this.players.filter((p) => p.active && p.id !== this.mySeatId);
      const mainOpp = activeOpponents.find((p) => p.id === 2) || activeOpponents[0] || this.players[2];
      const oppCharId = this.getPlayerActiveCharId(mainOpp);
      const rightArtId = oppCharId && oppCharId !== 'none' ? oppCharId : 'furina';
      rightEl.style.backgroundImage = `url('fanart/${rightArtId}.jpg?v=66')`;
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
          <img class="char-detail-art" src="fanart/${charId}.jpg?v=66" alt="${sk.charName}" />
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
            ${sk.isPassiveBet ? `💠 Nội Tại Cược [Tự Động — Không Có Chiêu Nộ Q]: ${sk.name}` : `🔮 Chiêu Nộ [Phím Q]: ${sk.name}`}
          </div>
          <div style="font-size:12.5px;color:#e2e8f0;line-height:1.5;">
            • <strong>Hiệu ứng chính:</strong> ${sk.shortDesc}<br/>
            • <strong>Quy tắc:</strong> ${
              sk.isPassiveBet
                ? 'Nhân vật 5★ Thường (Lệch Rate) <strong>không có Chiêu Nộ [Q] chủ động</strong> trên bàn bài, nhưng <strong>tự động kích hoạt Nội Tại Cược</strong> và vẫn phát <strong>Hoạt Ảnh Kỹ Năng Nộ 5★ khi Chặt Heo &amp; Về Nhất</strong>!'
                : 'Dùng tối đa <strong>1 lần / ván</strong> khi đang tới lượt của người chơi (bấm nút hoặc nhấn phím Q). Nhân vật đang trang bị cũng đồng thời phát <strong>Hoạt Ảnh Nộ Chặt Heo &amp; Về Nhất</strong>!'
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

    const sortedRosterBursts = [...GENSHIN_BURSTS].sort((a, b) => {
      const aOwned = this.unlockedBursts.has(a.id);
      const bOwned = this.unlockedBursts.has(b.id);
      const aEq = hasChar && charId === a.id;
      const bEq = hasChar && charId === b.id;
      const aRank = aEq ? 0 : aOwned ? 1 : 2;
      const bRank = bEq ? 0 : bOwned ? 1 : 2;
      return aRank - bRank;
    });
    const rosterItemsHtml = sortedRosterBursts.map((b) => {
      const cSk = CHARACTER_SKILLS[b.id] || CHARACTER_SKILLS.raiden;
      const owned = this.unlockedBursts.has(b.id);
      const isCurrent = hasChar && charId === b.id;
      const clickAttr = owned
        ? `onclick="window.tienLenGame.buyOrEquipBurst('${b.id}'); window.tienLenGame.openPlayerSkillInspect(0);"`
        : `onclick="document.getElementById('char-skill-detail-modal').classList.add('hidden'); window.tienLenGame.openGachaForCharacter('${b.id}');"`;

      return `
        <div class="char-detail-roster-item ${isCurrent ? 'active-char' : ''} ${!owned ? 'locked-char' : ''}" ${clickAttr}>
          <img src="fanart/${b.id}.jpg?v=66" alt="${cSk.charName}" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1.5px solid ${
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
    if (this.mavuikaWrapStraightTurn) {
      pills.push(
        `<span class="round-skill-pill">🔥 Vòng Lửa Thái Dương (Mavuika): Lượt này được ghép Heo (2) nối liền với A &amp; 3-4 tạo Sảnh Vòng Tròn Xuyên Heo!</span>`
      );
    }
    if (this.naviaFlushStraightTurn) {
      pills.push(
        `<span class="round-skill-pill">☂️ Pháo Dù Phỏm Pha Lê (Navia): Lượt này dùng Sảnh Đồng Chất hoặc Sám Cô chặt đè mọi bộ bài trên bàn!</span>`
      );
    }
    if (this.naviaLockedCardIds && this.naviaLockedCardIds.size > 0) {
      const np = this.naviaLockedTargetId !== null ? this.players[this.naviaLockedTargetId] : null;
      pills.push(
        `<span class="round-skill-pill">🔒 Pháo Kích Khóa Bài (Navia): Đang khóa cứng ${this.naviaLockedCardIds.size} lá bài của ${
          np ? np.name : 'đối thủ'
        } trong vòng này</span>`
      );
    }
    if (this.zhongliPetrifiedCardIds && this.zhongliPetrifiedCardIds.size > 0) {
      pills.push(
        `<span class="round-skill-pill">☄️ Thiên Tinh Hoá Đá (Zhongli): Đang hóa đá khóa cứng ${this.zhongliPetrifiedCardIds.size} lá bài chất Đen (♠, ♣) của các đối thủ trong vòng này!</span>`
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
    if (this.yoimiyaChainFuseReady) {
      pills.push(
        `<span class="round-skill-pill">🎆 Dây Pháo Liên Hoàn (Yoimiya): Đánh Lẻ/Đôi lượt này sẽ tự nổ dây chuyền mọi lá có bậc liên tiếp ngay phía trên và chốt ở lá cao nhất!</span>`
      );
    }
    if (this.citlaliPillowOwnerId !== null && this.citlaliPillowTargetId !== null) {
      const cpOwner = this.players[this.citlaliPillowOwnerId];
      const cpTarget = this.players[this.citlaliPillowTargetId];
      pills.push(
        `<span class="round-skill-pill">🛏️ Gối Ôm Ký Sinh (${cpOwner ? cpOwner.name : 'Citlali'} ➔ ${
          cpTarget ? cpTarget.name : 'Đối thủ'
        }): Hễ ${cpTarget ? cpTarget.name : 'đối thủ'} đánh bao nhiêu lá bài, ${
          cpOwner ? cpOwner.name : 'Citlali'
        } tự động vứt bỏ theo bấy nhiêu lá rác nhỏ nhất!</span>`
      );
    }
    if (this.mualaniCrossBeatTurn) {
      pills.push(
        `<span class="round-skill-pill">🦈 Cá Mập Mualani: Lượt này được lấy Đôi đè Lẻ, Sám/Sảnh đè Đôi!</span>`
      );
    }
    if (this.xiaoKarmaOwnerId !== null) {
      const xp = this.players[this.xiaoKarmaOwnerId];
      pills.push(
        `<span class="round-skill-pill">👹 Ách Nạn Nghiệp Chướng (${xp ? xp.name : 'Xiao'}): Đối thủ chỉ được phép đánh quân bài có bậc tối đa bằng số lá bài đang cầm (+3)!</span>`
      );
    }
    if (this.kinichBombOwnerId !== null) {
      const kp = this.players[this.kinichBombOwnerId];
      pills.push(
        `<span class="round-skill-pill">🎮 Bom Hẹn Giờ Ajaw (${kp ? kp.name : 'Kinich'}): Tất cả đối thủ đánh bài trong vòng đang diễn ra đều bị nổ bom nhận 1 lá rác!</span>`
      );
    }
    if (this.columbinaExtraTurnReady) {
      pills.push(
        `<span class="round-skill-pill">🕊️ Khúc Ca Thiên Thần Columbina: Sau khi đánh bộ bài lượt này được đánh bồi thêm 1 bộ nữa ngay lập tức!</span>`
      );
    }
    if (this.nicoleSuitOnlyRound) {
      pills.push(
        `<span class="round-skill-pill">☕ Tiệc Trà Nicole: San bằng cấp số 3➔A — Vòng này đè bài cùng loại hoàn toàn bằng Chất (♠ &lt; ♣ &lt; ♦ &lt; ♥)!</span>`
      );
    }
    if (this.xianyunStepStraightTurn) {
      pills.push(
        `<span class="round-skill-pill">🦩 Tiên Hạc Xianyun: Lượt này được đánh Sảnh Nhảy Bậc cách 2 đơn vị (VD: 3-5-7, 6-8-10)!</span>`
      );
    }
    if (this.varkaSumSlashTurn) {
      pills.push(
        `<span class="round-skill-pill">🗡️ Song Kiếm Varka: Lượt này được ghép 2 Lá Lẻ khác số cộng điểm đè Bài Lẻ trên bàn!</span>`
      );
    }
    if (this.baizhuShieldOwnerId !== null) {
      const bp = this.players[this.baizhuShieldOwnerId];
      pills.push(
        `<span class="round-skill-pill">🐍 Khiên Trường Sinh (${bp ? bp.name : 'Baizhu'}): Bộ bài đánh ra miễn nhiễm bị Hàng chặt trong vòng này!</span>`
      );
    }
    if (this.ittoUshiOwnerId !== null) {
      const ip = this.players[this.ittoUshiOwnerId];
      pills.push(
        `<span class="round-skill-pill">👹🐂 Bò Ushi Trấn Bàn (${ip ? ip.name : 'Itto'}): Đối thủ đầu tiên đánh đè sẽ bị Bò Ushi húc văng &amp; trả lượt về cho ${ip ? ip.name : 'Itto'}!</span>`
      );
    }
    if (this.alhaithamOwnerId !== null && this.alhaithamAllowedRanks && this.alhaithamAllowedRanks.size > 0) {
      const alp = this.players[this.alhaithamOwnerId];
      const rankList = Array.from(this.alhaithamAllowedRanks)
        .sort((a, b) => a - b)
        .map((r) => RANKS[r])
        .join(', ');
      pills.push(
        `<span class="round-skill-pill">📗 Ma Trận Phổ Quang (${alp ? alp.name : 'Alhaitham'}): Đối thủ chỉ được đánh các bậc số [${rankList}]!</span>`
      );
    }
    if (this.emiliePerfumeOwnerId !== null && this.emilieRequiredSuit !== null) {
      const emp = this.players[this.emiliePerfumeOwnerId];
      pills.push(
        `<span class="round-skill-pill">🧪 Tinh Dầu Khử Trùng (${emp ? emp.name : 'Emilie'}): Mọi bộ bài đối thủ đánh ra trong vòng này bắt buộc phải chứa ít nhất 1 lá chất ${SUITS[this.emilieRequiredSuit]}!</span>`
      );
    }
    if (this.zibaiMinStepOwnerId !== null) {
      const zp = this.players[this.zibaiMinStepOwnerId];
      pills.push(
        `<span class="round-skill-pill">🐎 Bạch Mã Vượt Tuyến (${zp ? zp.name : 'Zibai'}): Đối thủ muốn đè bài bắt buộc phải lớn hơn tối thiểu +2 bậc số!</span>`
      );
    }
    if (this.vesnaSpringOwnerId !== null) {
      const vp = this.players[this.vesnaSpringOwnerId];
      pills.push(
        `<span class="round-skill-pill">🍃 Gió Xuân Đoạt Cái (${vp ? vp.name : 'Vesna'}): Nếu đối thủ thắng vòng bằng bộ bài có lá Đỏ (♥/♦), ${vp ? vp.name : 'Vesna'} sẽ TỊCH THU QUYỀN CẦM CÁI mở vòng mới!</span>`
      );
    }
    if (this.cynoRoyalBanRound) {
      const cp = this.cynoRoyalBanOwnerId !== null ? this.players[this.cynoRoyalBanOwnerId] : null;
      pills.push(
        `<span class="round-skill-pill">🐺 Thiết Quân Luật (${cp ? cp.name : 'Cyno'}): CẤM đối thủ đánh bài Tây &amp; Heo (J, Q, K, A, 2) — Chỉ được đánh bài số 3 ➔ 10!</span>`
      );
    }
    if (this.wriothesleyNoSingleRound) {
      const wp = this.wriothesleyNoSingleOwnerId !== null ? this.players[this.wriothesleyNoSingleOwnerId] : null;
      pills.push(
        `<span class="round-skill-pill">🥊 Đấu Trường Ngục Tù (${wp ? wp.name : 'Wriothesley'}): CẤM đối thủ đánh Bài Lẻ (1 lá) — Chỉ được đánh Đôi, Sám, Sảnh (≥ 2 lá)!</span>`
      );
    }
    if (this.sigewinneCareOwnerId !== null) {
      const sp = this.players[this.sigewinneCareOwnerId];
      pills.push(
        `<span class="round-skill-pill">💉 Trạm Y Tế (${sp ? sp.name : 'Sigewinne'}): Đối thủ nào thắng vòng này phải nộp viện phí ${(b * 3).toLocaleString()} Xu cho ${sp ? sp.name : 'Sigewinne'}!</span>`
      );
    }
    if (this.yelanParityRound) {
      const yp = this.yelanParityOwnerId !== null ? this.players[this.yelanParityOwnerId] : null;
      pills.push(
        `<span class="round-skill-pill">🎲 Sòng Bạc Dạ Lan (${yp ? yp.name : 'Yelan'}): Đối thủ muốn đè bài bắt buộc phải đánh lá cao nhất CÙNG CHẴN / CÙNG LẺ với bài trên bàn!</span>`
      );
    }
    if (this.ayatoCloneReady) {
      pills.push(
        `<span class="round-skill-pill">🌊 Thủy Ảnh Ayato: Bộ bài sắp đánh dùng 1 lá rác thế thân, giữ lại Phân Thân Nước (-1 bậc) trên tay!</span>`
      );
    }
    if (this.arlecchinoBondOwnerId !== null) {
      const ap = this.players[this.arlecchinoBondOwnerId];
      pills.push(
        `<span class="round-skill-pill">🩸 Khế Ước Sinh Mệnh (${ap ? ap.name : 'Arlecchino'}): Đối thủ Bỏ Lượt vòng này bị nhận 1 lá rác &amp; nộp phạt ${(b * 2).toLocaleString()} Xu!</span>`
      );
    }
    if (this.flinsLanternOwnerId !== null) {
      const flp = this.players[this.flinsLanternOwnerId];
      pills.push(
        `<span class="round-skill-pill">🏮 Ngọn Đèn Đêm (${flp ? flp.name : 'Flins'}): Ngay khi có bất kỳ đối thủ nào Bỏ Lượt, ${flp ? flp.name : 'Flins'} lập tức cướp Cái mở vòng mới!</span>`
      );
    }
    if (this.turnDirection === -1) {
      pills.push(
        `<span class="round-skill-pill">❄️ Bão Đêm Citlali: Chiều đánh đang đảo ngược (↺ Ngược chiều kim đồng hồ)</span>`
      );
    }

    this.syncRoundRuleGlobals();

    if (pills.length === 0 || this.isGameOver) {
      bar.innerHTML = '';
      bar.classList.add('hidden');
    } else {
      bar.innerHTML = pills.join('');
      bar.classList.remove('hidden');
    }
  }

  syncRoundRuleGlobals(actingPlayerId = this.currentTurn) {
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    activeZhongliPetrifiedCardIds = this.zhongliPetrifiedCardIds;
    activeVarkaSumSlash = Boolean(this.varkaSumSlashTurn);
    activeMavuikaWrapStraight = Boolean(this.mavuikaWrapStraightTurn);
    activeNaviaFlushStraight = Boolean(this.naviaFlushStraightTurn);
    activeBaizhuShield = Boolean(
      this.baizhuShieldOwnerId !== null && this.trickOwnerId === this.baizhuShieldOwnerId
    );
    if (
      this.alhaithamOwnerId !== null &&
      this.alhaithamAllowedRanks &&
      this.alhaithamAllowedRanks.size > 0 &&
      actingPlayerId !== this.alhaithamOwnerId
    ) {
      activeAlhaithamAllowedRanks = this.alhaithamAllowedRanks;
    } else {
      activeAlhaithamAllowedRanks = null;
    }
    if (
      this.xiaoKarmaOwnerId !== null &&
      actingPlayerId !== null &&
      actingPlayerId !== undefined &&
      actingPlayerId !== this.xiaoKarmaOwnerId
    ) {
      const actP = this.players?.[actingPlayerId];
      const handLen = actP && Array.isArray(actP.hand) ? actP.hand.length : 13;
      activeXiaoKarmaMaxRank = Math.min(12, Math.max(0, handLen));
    } else {
      activeXiaoKarmaMaxRank = null;
    }
    if (
      this.emiliePerfumeOwnerId !== null &&
      this.emilieRequiredSuit !== null &&
      this.emilieRequiredSuit !== undefined &&
      actingPlayerId !== this.emiliePerfumeOwnerId
    ) {
      activeEmilieRequiredSuit = this.emilieRequiredSuit;
    } else {
      activeEmilieRequiredSuit = null;
    }
    if (this.zibaiMinStepOwnerId !== null && actingPlayerId !== this.zibaiMinStepOwnerId) {
      activeZibaiMinStep = true;
    } else {
      activeZibaiMinStep = false;
    }
    if (this.cynoRoyalBanRound && actingPlayerId !== this.cynoRoyalBanOwnerId) {
      activeCynoRoyalBan = true;
    } else {
      activeCynoRoyalBan = false;
    }
    if (this.wriothesleyNoSingleRound && actingPlayerId !== this.wriothesleyNoSingleOwnerId) {
      activeWriothesleyNoSingle = true;
    } else {
      activeWriothesleyNoSingle = false;
    }
    if (this.yelanParityRound && actingPlayerId !== this.yelanParityOwnerId) {
      activeYelanSameParity = true;
    } else {
      activeYelanSameParity = false;
    }
  }

  findEscoffierPairRunSetup(hand, preferredTrashIds = []) {
    if (!Array.isArray(hand) || hand.length < 6) return null;
    const sorted = sortCardsAsc(hand);
    const byRank = new Map();
    for (let r = 0; r < 13; r++) byRank.set(r, []);
    sorted.forEach((c) => {
      if (byRank.has(c.rankIndex)) byRank.get(c.rankIndex).push(c);
    });

    const pickBestTrash = (coreIdsSet) => {
      const candidates = sorted.filter((c) => !coreIdsSet.has(c.id));
      if (candidates.length === 0) return null;
      if (Array.isArray(preferredTrashIds) && preferredTrashIds.length > 0) {
        const pref = candidates.find((c) => preferredTrashIds.includes(c.id));
        if (pref) return pref;
      }
      const singleUnder2 = candidates.find((c) => c.rankIndex < 12 && (byRank.get(c.rankIndex)?.length || 0) === 1);
      if (singleUnder2) return singleUnder2;
      const anyUnder2 = candidates.find((c) => c.rankIndex < 12);
      return anyUnder2 || candidates[0];
    };

    // 1. Ưu tiên kiểm tra sắp thành 4 ĐÔI THÔNG (3 Đôi + 1 Lẻ trong 4 bậc liên tiếp r..r+3, từ 3 đến A)
    if (hand.length >= 8) {
      for (let start = 8; start >= 0; start--) {
        const windowRanks = [start, start + 1, start + 2, start + 3];
        const pairRanks = windowRanks.filter((r) => (byRank.get(r)?.length || 0) >= 2);
        const singleRanks = windowRanks.filter((r) => (byRank.get(r)?.length || 0) === 1);
        if (pairRanks.length === 3 && singleRanks.length === 1) {
          const targetRank = singleRanks[0];
          const coreCards = [];
          pairRanks.forEach((r) => coreCards.push(...byRank.get(r).slice(0, 2)));
          coreCards.push(byRank.get(targetRank)[0]);
          const coreIds = new Set(coreCards.map((c) => c.id));
          const trashCard = pickBestTrash(coreIds);
          if (trashCard) {
            return {
              pairCount: 4,
              startRank: start,
              endRank: start + 3,
              targetRank,
              coreCards,
              trashCard,
              label: `4 Đôi Thông (${RANKS[start]} ➔ ${RANKS[start + 3]})`,
            };
          }
        }
      }
    }

    // 2. Kiểm tra sắp thành 3 ĐÔI THÔNG (2 Đôi + 1 Lẻ trong 3 bậc liên tiếp r..r+2, VD: Đôi 5, Đôi 6, Lẻ 7)
    for (let start = 9; start >= 0; start--) {
      const windowRanks = [start, start + 1, start + 2];
      const pairRanks = windowRanks.filter((r) => (byRank.get(r)?.length || 0) >= 2);
      const singleRanks = windowRanks.filter((r) => (byRank.get(r)?.length || 0) === 1);
      if (pairRanks.length === 2 && singleRanks.length === 1) {
        const targetRank = singleRanks[0];
        const coreCards = [];
        pairRanks.forEach((r) => coreCards.push(...byRank.get(r).slice(0, 2)));
        coreCards.push(byRank.get(targetRank)[0]);
        const coreIds = new Set(coreCards.map((c) => c.id));
        const trashCard = pickBestTrash(coreIds);
        if (trashCard) {
          return {
            pairCount: 3,
            startRank: start,
            endRank: start + 2,
            targetRank,
            coreCards,
            trashCard,
            label: `3 Đôi Thông (${RANKS[start]}-${RANKS[start + 1]}-${RANKS[start + 2]})`,
          };
        }
      }
    }

    return null;
  }

  findVodyanitsaMinimalBeatSpec(hand, currentCombo, playerId = null) {
    if (!currentCombo || !Array.isArray(hand) || hand.length === 0) return null;
    if (playerId !== null) {
      this.syncRoundRuleGlobals(playerId);
    }

    const makeSpecCard = (r, s, idx = 0) => ({
      rankIndex: r,
      suitIndex: s,
      rank: RANKS[r],
      suit: SUITS[s],
      value: r * 4 + s,
      isRed: s >= 2,
      id: `vody_spec_${r}_${s}_${idx}`,
    });
    const testSpecs = (specs) => {
      if (!specs || specs.length === 0 || hand.length < specs.length) return false;
      const cards = specs.map((sp, i) => makeSpecCard(sp.rankIndex, sp.suitIndex, i));
      const combo = classifyCombo(cards);
      return Boolean(combo && canBeatCombo(combo, currentCombo).ok);
    };

    const rankOrder = activeKokomiReverseRank
      ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 12]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const suitOrder = activeFurinaReverseSuit ? [3, 2, 1, 0] : [0, 1, 2, 3];

    // 1. Khi trên bàn là Bài Lẻ (SINGLE): tìm lá lẻ nhỏ nhất VỪA ĐỦ đè (nhỉnh hơn đúng 1 chất hoặc 1 bậc)
    if (currentCombo.type === COMBO_TYPES.SINGLE) {
      for (const r of rankOrder) {
        for (const s of suitOrder) {
          const specs = [{ rankIndex: r, suitIndex: s }];
          if (testSpecs(specs)) {
            return { specs };
          }
        }
      }
      // Nếu lá lẻ trên bàn là 2♥ (hoặc bị khóa đánh lẻ 2) và tay còn >= 4 lá -> Ghép Tứ Quý nhỏ nhất VỪA ĐỦ chặt Heo!
      if (hand.length >= 4 && !currentCombo.baizhuShielded) {
        for (let r = 0; r <= 11; r++) {
          const quadSpecs = [0, 1, 2, 3].map((s) => ({ rankIndex: r, suitIndex: s }));
          if (testSpecs(quadSpecs)) {
            return { specs: quadSpecs };
          }
        }
      }
      return null;
    }

    // 2. Khi trên bàn là Đôi (PAIR): tìm Đôi nhỏ nhất VỪA ĐỦ đè (ưu tiên giữ lại 1 lá cùng số trên tay nếu có)
    if (currentCombo.type === COMBO_TYPES.PAIR) {
      if (hand.length >= 2) {
        for (const r of rankOrder) {
          const existingSameRank = hand.find((c) => c.rankIndex === r);
          const suitPairs = [];
          for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
              const sLow = suitOrder[i];
              const sHigh = suitOrder[j];
              const matchesExisting =
                existingSameRank &&
                (existingSameRank.suitIndex === sLow || existingSameRank.suitIndex === sHigh)
                  ? 0
                  : 1;
              suitPairs.push({ sLow, sHigh, highIdx: j, lowIdx: i, matchesExisting });
            }
          }
          suitPairs.sort(
            (a, b) => a.highIdx - b.highIdx || a.matchesExisting - b.matchesExisting || a.lowIdx - b.lowIdx
          );
          for (const sp of suitPairs) {
            const specs = [
              { rankIndex: r, suitIndex: sp.sLow },
              { rankIndex: r, suitIndex: sp.sHigh },
            ];
            if (testSpecs(specs)) {
              return { specs };
            }
          }
        }
      }
      // Nếu trên bàn là Đôi 2 có 2♥ và tay còn >= 4 lá -> Ghép Tứ Quý nhỏ nhất VỪA ĐỦ chặt Đôi 2!
      if (hand.length >= 4 && !currentCombo.baizhuShielded) {
        for (let r = 0; r <= 11; r++) {
          const quadSpecs = [0, 1, 2, 3].map((s) => ({ rankIndex: r, suitIndex: s }));
          if (testSpecs(quadSpecs)) {
            return { specs: quadSpecs };
          }
        }
      }
      return null;
    }

    // 3. Khi trên bàn là Sám Cô (TRIPLE): tìm Sám Cô nhỏ nhất VỪA ĐỦ đè
    if (currentCombo.type === COMBO_TYPES.TRIPLE && hand.length >= 3) {
      for (const r of rankOrder) {
        const existingSuits = hand.filter((c) => c.rankIndex === r).map((c) => c.suitIndex);
        const chosenSuits = [...new Set([...existingSuits, ...suitOrder])].slice(0, 3);
        const specs = chosenSuits.map((s) => ({ rankIndex: r, suitIndex: s }));
        if (testSpecs(specs)) {
          return { specs };
        }
      }
      return null;
    }

    // 4. Khi trên bàn là Sảnh (STRAIGHT): tìm Sảnh cùng độ dài nhỏ nhất VỪA ĐỦ đè (nhỉnh hơn đúng 1 chất ở lá đầu tàu hoặc +1 bậc chất nhỏ nhất)
    if (currentCombo.type === COMBO_TYPES.STRAIGHT && hand.length >= currentCombo.length) {
      const len = currentCombo.length;
      const validTopRanks = rankOrder.filter((r) => r >= len - 1 && r <= 11);
      for (const topRank of validTopRanks) {
        const startRank = topRank - len + 1;
        for (const topSuit of suitOrder) {
          const specs = [];
          for (let idx = 0; idx < len; idx++) {
            const r = startRank + idx;
            if (idx === len - 1) {
              specs.push({ rankIndex: r, suitIndex: topSuit });
            } else {
              const existingInHand = hand.find((c) => c.rankIndex === r);
              specs.push({
                rankIndex: r,
                suitIndex: existingInHand ? existingInHand.suitIndex : suitOrder[0],
              });
            }
          }
          if (testSpecs(specs)) {
            return { specs };
          }
        }
      }
      return null;
    }

    // 5. Khi trên bàn là Hàng (3 Đôi Thông / Tứ Quý) và tay còn >= 4 lá: tìm Tứ Quý nhỏ nhất VỪA ĐỦ chặt!
    if (currentCombo.isBomb && hand.length >= 4 && !currentCombo.baizhuShielded) {
      for (let r = 0; r <= 11; r++) {
        const quadSpecs = [0, 1, 2, 3].map((s) => ({ rankIndex: r, suitIndex: s }));
        if (testSpecs(quadSpecs)) {
          return { specs: quadSpecs };
        }
      }
    }

    return null;
  }

  canUseCharacterSkill(player) {
    if (!player || !player.active || player.skillUsed || this.isGameOver) return { ok: false, reason: 'Đã dùng kỹ năng trong ván này' };

    const charId = this.getPlayerActiveCharId(player);
    const canBaizhuReviveOutTurn = charId === 'baizhu' && player.passed && this.currentCombo !== null;
    if (this.currentTurn !== player.id && !canBaizhuReviveOutTurn) return { ok: false, reason: 'Chỉ dùng trong lượt của bạn' };
    if (player.passed && charId !== 'baizhu') return { ok: false, reason: 'Bạn đã bỏ lượt vòng này' };

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
        reason: 'Nhân vật 5★ Thường (Lệch Rate): Không có Chiêu Nộ [Q] chủ động — Tự động kích hoạt Nội Tại Cược & Hoạt Ảnh Nộ 5★!',
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
      if (this.mavuikaWrapStraightTurn) {
        return { ok: false, reason: 'Vòng Lửa Thái Dương đã bật trong lượt này' };
      }
      const prevWrap = activeMavuikaWrapStraight;
      activeMavuikaWrapStraight = true;
      const wrapMoves = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
        (m) => m.isMavuikaWrapStraight
      );
      activeMavuikaWrapStraight = prevWrap;
      if (wrapMoves.length === 0) {
        return {
          ok: false,
          reason: 'Cần có Heo (2) nối liền với A hoặc 3 trên tay (VD: K-A-2, Q-K-A-2-3, A-2-3-4) đủ sức đánh ra bàn!',
        };
      }
    }
    if (charId === 'eula') {
      const canSlashTable = this.currentCombo && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb;
      const canBuffLead = !this.currentCombo && !this.eulaNextPlayBoost;
      if (!canSlashTable && !canBuffLead) {
        return { ok: false, reason: 'Chỉ chém giảm bậc bộ bài thường trên bàn (dưới Heo/Hàng) hoặc dùng khi mở vòng' };
      }
    }
    if (charId === 'navia') {
      if (this.naviaFlushStraightTurn) {
        return { ok: false, reason: 'Pháo Dù Phỏm Pha Lê đã bật trong lượt này' };
      }
      if (!this.currentCombo || this.trickOwnerId === player.id) {
        return {
          ok: false,
          reason: 'Chỉ kích hoạt khi trên bàn đang có bộ bài của đối thủ để dùng Sảnh Đồng Chất hoặc Sám Cô chặt đè!',
        };
      }
      const prevFlush = activeNaviaFlushStraight;
      activeNaviaFlushStraight = true;
      const phomMoves = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
        (m) => m.type === COMBO_TYPES.TRIPLE || (m.type === COMBO_TYPES.STRAIGHT && m.isSameSuitStraight)
      );
      activeNaviaFlushStraight = prevFlush;
      if (phomMoves.length === 0) {
        return {
          ok: false,
          reason: 'Cần có ít nhất 1 bộ Sảnh Đồng Chất (≥ 3 lá liên tiếp cùng chất) hoặc Sám Cô (3 lá cùng số) trên tay để chặt đè!',
        };
      }
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
      if (this.yoimiyaChainFuseReady) {
        return { ok: false, reason: 'Dây Pháo Liên Hoàn đã bật trong lượt này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để châm ngòi Dây Pháo Liên Hoàn!' };
      }
    }
    if (charId === 'citlali') {
      if (this.citlaliPillowOwnerId !== null) {
        return { ok: false, reason: 'Gối Ôm Ký Sinh đã gắn lên đối thủ trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để gắn Gối Ôm Ký Sinh!' };
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
    if (charId === 'escoffier') {
      if (!this.findEscoffierPairRunSetup(player.hand)) {
        return {
          ok: false,
          reason: 'Cần có thế bài sắp thành Đôi Thông (VD: Đôi 5, Đôi 6, Lẻ 7 + 1 lá bài rác) để Escoffier thêm lá còn thiếu và bỏ 1 lá rác!',
        };
      }
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
      if (!player.hand.some((c) => c.rankIndex <= 5)) {
        return {
          ok: false,
          reason: 'Cần có ít nhất 1 lá bài nhỏ (từ 3 đến 8) trên tay để phản chiếu đối xứng qua Mặt Hồ thành bài lớn (9 ➔ A)!',
        };
      }
    }
    if (charId === 'yelan' && this.yelanParityRound) {
      return { ok: false, reason: 'Sòng Bạc Dạ Lan đã mở trong vòng này' };
    }
    if (charId === 'zibai' && this.zibaiMinStepOwnerId !== null) {
      return { ok: false, reason: 'Bạch Mã Vượt Tuyến đã kích hoạt trong vòng này' };
    }
    if (charId === 'vesna' && this.vesnaSpringOwnerId !== null) {
      return { ok: false, reason: 'Gió Xuân Đoạt Cái đã kích hoạt trong vòng này' };
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
      if (!this.currentCombo) {
        return { ok: false, reason: 'Chỉ dùng khi đối thủ vừa đánh bài trên bàn để Gương Nước đổi lá ngẫu nhiên vừa đủ chặt/đè đối thủ!' };
      }
      const plan = this.findVodyanitsaMinimalBeatSpec(player.hand, this.currentCombo, player.id);
      if (!plan) {
        return {
          ok: false,
          reason: `Số lá trên tay (${player.hand.length} lá) hoặc luật vòng hiện tại không đủ để ghép bộ vừa đủ chặt ${this.currentCombo.label}!`,
        };
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
      if (this.xiaoKarmaOwnerId !== null) {
        return { ok: false, reason: 'Ách Nạn Nghiệp Chướng đã bao trùm vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn bài trên tay để phóng thích Ách Nạn Nghiệp Chướng!' };
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
    if (charId === 'albedo' && player.hand.length < 1) {
      return { ok: false, reason: 'Cần ít nhất 1 lá bài trên tay để Giả Kim Mộ Bài tái tạo lá mạnh nhất!' };
    }
    if (charId === 'varka') {
      if (this.varkaSumSlashTurn) {
        return { ok: false, reason: 'Song Kiếm Hợp Lực đã bật trong lượt này' };
      }
      if (this.currentCombo && this.currentCombo.type !== COMBO_TYPES.SINGLE) {
        return { ok: false, reason: 'Song Kiếm Hợp Lực chỉ dùng khi mở vòng hoặc khi trên bàn đang là Bài Lẻ (1 lá)!' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần ít nhất 2 lá bài trên tay để thi triển Song Kiếm Hợp Lực!' };
      }
    }
    if (charId === 'nicole' && this.nicoleSuitOnlyRound) {
      return { ok: false, reason: 'Tiệc Trà Tiên Tri đã bật trong vòng này' };
    }
    if (charId === 'zhongli' && this.zhongliPetrifiedCardIds && this.zhongliPetrifiedCardIds.size > 0) {
      return { ok: false, reason: 'Thiên Tinh Hoá Đá đã phong ấn bài đối thủ trong vòng này' };
    }
    if (charId === 'baizhu') {
      if (this.baizhuShieldOwnerId !== null) {
        return { ok: false, reason: 'Khiên Trường Sinh đã bật trong vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn ít nhất 1 lá bài trên tay để dùng Kim Chung Hồi Mạch!' };
      }
    }
    if (charId === 'xianyun') {
      if (this.xianyunStepStraightTurn) {
        return { ok: false, reason: 'Tiên Hạc Đạp Mây đã bật trong lượt này' };
      }
      if (player.hand.length < 3) {
        return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay để ghép Sảnh Nhảy Bậc (cách 2 đơn vị)!' };
      }
    }
    if (charId === 'kazuha' && player.hand.length < 1) {
      return { ok: false, reason: 'Cần còn ít nhất 1 lá bài trên tay để tung Vạn Diệp Phong Vực!' };
    }
    if (charId === 'itto') {
      if (this.ittoUshiOwnerId !== null) {
        return { ok: false, reason: 'Bò Ushi đang trấn giữ bàn bài trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để triệu hồi Bò Ushi Đỡ Đòn!' };
      }
    }
    if (charId === 'ayato') {
      if (this.ayatoCloneReady) {
        return { ok: false, reason: 'Thủy Ảnh Thế Thân đã bật trong lượt này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để dùng lá rác thế thân và giữ lại Phân Thân Nước!' };
      }
    }
    if (charId === 'cyno') {
      if (this.cynoRoyalBanRound) {
        return { ok: false, reason: 'Thiết Quân Luật Mahamatra đã ban hành trong vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn bài trên tay để ban hành Thiết Quân Luật Mahamatra!' };
      }
    }
    if (charId === 'nilou' && player.hand.length < 2) {
      return { ok: false, reason: 'Cần ít nhất 2 lá bài trên tay để Vũ Điệu Hoa Sen thăng hoa các Đôi!' };
    }
    if (charId === 'alhaitham') {
      if (this.alhaithamOwnerId !== null) {
        return { ok: false, reason: 'Ma Trận Phổ Quang đã bật trong vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn bài trên tay để bật Ma Trận Phổ Quang!' };
      }
    }
    if (charId === 'neuvillette') {
      const minOppCards = Math.min(...activeOpponents.map((p) => p.hand.length));
      if (player.hand.length <= minOppCards) {
        return {
          ok: false,
          reason: `Cán Cân Tuyệt Đối chỉ kích hoạt khi số bài trên tay bạn (${player.hand.length} lá) nhiều hơn đối thủ ít bài nhất (${minOppCards} lá)!`,
        };
      }
    }
    if (charId === 'wriothesley') {
      if (this.wriothesleyNoSingleRound) {
        return { ok: false, reason: 'Đấu Trường Ngục Tù đã thiết lập trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để mở Đấu Trường Ngục Tù (Cấm Đánh Lẻ)!' };
      }
    }
    if (charId === 'sigewinne') {
      if (this.sigewinneCareOwnerId !== null) {
        return { ok: false, reason: 'Trạm Y Tế Meropide đã kích hoạt trong vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn bài trên tay để kích hoạt Trạm Y Tế Meropide!' };
      }
    }
    if (charId === 'emilie') {
      if (this.emiliePerfumeOwnerId !== null) {
        return { ok: false, reason: 'Tinh Dầu Khử Trùng đã tỏa hương trong vòng này' };
      }
      if (player.hand.length < 1) {
        return { ok: false, reason: 'Cần còn bài trên tay để tỏa Tinh Dầu Khử Trùng!' };
      }
    }
    if (charId === 'chasca' && player.hand.length < 3) {
      return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay để Đạn Xoáy Nối Sảnh!' };
    }
    if (charId === 'tartaglia' && player.hand.length < 3) {
      return { ok: false, reason: 'Cần ít nhất 3 lá bài trên tay để Hoán Đổi Võ Khí (Sảnh ⇄ Sám Cô)!' };
    }
    if (charId === 'arlecchino') {
      if (this.arlecchinoBondOwnerId !== null) {
        return { ok: false, reason: 'Khế Ước Sinh Mệnh đã yểm trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để yểm Khế Ước Sinh Mệnh!' };
      }
    }
    if (charId === 'ineffa' && player.hand.length < 1) {
      return { ok: false, reason: 'Cần còn ít nhất 1 lá bài trên tay để phát Xung Điện Cộng Hưởng!' };
    }
    if (charId === 'flins') {
      if (this.flinsLanternOwnerId !== null) {
        return { ok: false, reason: 'Ngọn Đèn Đêm Cướp Cái đã thắp trong vòng này' };
      }
      if (player.hand.length < 2) {
        return { ok: false, reason: 'Cần còn ít nhất 2 lá bài trên tay để thắp Ngọn Đèn Đêm Cướp Cái!' };
      }
    }
    return { ok: true, charId };
  }

  onHumanUseSkill() {
    if (this.isGameOver || this.isBurstPlaying) return;
    const human = this.getLocalPlayer();
    const humanCharId = this.getPlayerActiveCharId(human);
    const canBaizhuOutTurn = humanCharId === 'baizhu' && human && human.passed && this.currentCombo !== null;
    if (this.currentTurn !== this.mySeatId && !canBaizhuOutTurn) return;
    const check = this.canUseCharacterSkill(human);
    if (!check.ok) {
      alert(`⚠️ Chưa thể kích hoạt Kỹ Năng: ${check.reason}`);
      return;
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
    const mult = Number(rx.multiplier) || 5;
    const rxBonus = Math.round((this.betPerCard || 100) * mult);
    prevPlayer.coins -= rxBonus;
    attacker.coins += rxBonus;
    this.matchChopCoins[prevPlayer.id] -= rxBonus;
    this.matchChopCoins[attacker.id] += rxBonus;
    this.matchChopDetails[prevPlayer.id].push({
      label: `⚡ Bị ${attacker.name} kích nổ ${rx.shortName} ×${mult} cược (-${rxBonus.toLocaleString()})`,
      isSpecial: true,
    });
    this.matchChopDetails[attacker.id].push({
      label: `⚡ Kích nổ ${rx.shortName} ×${mult} cược lên ${prevPlayer.name} (+${rxBonus.toLocaleString()})`,
      isGood: true,
    });
    this.addLog(
      `⚡ <strong>[Thưởng Phản Ứng ×${mult} Cược]</strong> <strong>${attacker.name}</strong> kích hoạt <strong>${rx.shortName}</strong> lấy <strong>+${rxBonus.toLocaleString()} Xu</strong> (${mult}× cược) từ người đánh trước <strong>${prevPlayer.name}</strong>!`,
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

    try {
      this.recordPlayerSkillBehavior(player, charId);
    } catch (_) {}
    if (!this.roundSkillActivatedSeatIds) this.roundSkillActivatedSeatIds = new Set();
    this.roundSkillActivatedSeatIds.add(player.id);
    player.skillUsed = true;
    player._skillForcedComboIds = null;
    player._skillBoostedCardIds = null;
    const savedHumanSelectedIds = new Set(this.selectedCardIds);
    const savedHumanCompanionIds = new Set(this.companionCardIds);
    if (player.id !== this.mySeatId) {
      this.selectedCardIds.clear();
      this.companionCardIds.clear();
    }

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
      this.lastSkillCutTargetId = prevTrickOwner ? prevTrickOwner.id : null;
      this.previousCombo = this.currentCombo;
      this.currentCombo = null;
      this.trickOwnerId = player.id;
      this.raidenSlashMustSingle = false;
      this.naviaLockedTargetId = null;
      this.naviaLockedCardIds = new Set();
      activeNaviaLockedCardIds = this.naviaLockedCardIds;
      this.zhongliPetrifiedCardIds = new Set();
      activeZhongliPetrifiedCardIds = this.zhongliPetrifiedCardIds;
      this.shenheSingleOnlyRound = false;
      activeShenheSingleOnly = false;
      this.kokomiReverseRankRound = false;
      activeKokomiReverseRank = false;
      this.cynoRoyalBanOwnerId = null;
      this.cynoRoyalBanRound = false;
      activeCynoRoyalBan = false;
      this.wriothesleyNoSingleOwnerId = null;
      this.wriothesleyNoSingleRound = false;
      activeWriothesleyNoSingle = false;
      this.yelanParityOwnerId = null;
      this.yelanParityRound = false;
      activeYelanSameParity = false;
      this.xiaoKarmaOwnerId = null;
      activeXiaoKarmaMaxRank = null;
      this.emiliePerfumeOwnerId = null;
      this.emilieRequiredSuit = null;
      activeEmilieRequiredSuit = null;
      this.citlaliPillowOwnerId = null;
      this.citlaliPillowTargetId = null;
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
      this.mavuikaWrapStraightTurn = true;
      activeMavuikaWrapStraight = true;
      this.syncRoundRuleGlobals(player.id);
      const wrapMoves = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false)
        .filter((m) => m.isMavuikaWrapStraight)
        .sort((a, b) => b.length - a.length || b.highValue - a.highValue);
      if (wrapMoves.length > 0) {
        this.selectedCardIds = new Set(wrapMoves[0].cards.map((c) => c.id));
        this.companionCardIds.clear();
      }
      skillSummary = `🔥 [Vòng Lửa Thái Dương] ${player.name} khép kín Vòng Lửa: Cho phép ghép Heo (2) nối liền với A và vòng qua 3-4 để tung Sảnh Vòng Tròn Xuyên Heo trong lượt này!`;
    } else if (charId === 'yaemiko') {
      this.yaeForcePlayRound = true;
      skillSummary = `🌸 [Hồ Ly Dụ Hoặc] ${player.name} yểm ấn Hồ Ly: Mọi đối thủ có bài đánh được BẮT BUỘC PHẢI ĐÁNH (khóa Bỏ lượt giấu Heo)!`;
    } else if (charId === 'yelan') {
      this.yelanParityOwnerId = player.id;
      this.yelanParityRound = true;
      this.syncRoundRuleGlobals(player.id);
      const target = [...activeOpponents].sort((a, b) => a.hand.length - b.hand.length)[0];
      let revNote = '';
      if (target && target.hand.length > 0) {
        const shuffledHand = shuffleDeck([...target.hand]);
        const revealed = sortCardsAsc(shuffledHand.slice(0, Math.min(2, shuffledHand.length)));
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
        const revStr = revealed.map((c) => `${c.rank}${c.suit}`).join(' ');
        revNote = ` • Thấu thị ${target.name} [${revStr}]`;
      }
      skillSummary = `🎲 [Sòng Bạc Dạ Lan] ${player.name} tung Xúc Xắc Chẵn Lẻ: Mọi đối thủ muốn đè bài trong vòng này BẮT BUỘC phải đánh lá cao nhất CÙNG CHẴN hoặc CÙNG LẺ bậc với bài trên bàn${revNote}!`;
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
      this.naviaFlushStraightTurn = true;
      activeNaviaFlushStraight = true;
      this.syncRoundRuleGlobals(player.id);
      const struct = this.analyzeBotHandStructure(player.hand);
      const allPhomMoves = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
        (m) => m.type === COMBO_TYPES.TRIPLE || (m.type === COMBO_TYPES.STRAIGHT && m.isSameSuitStraight)
      );
      const safePhomMoves = allPhomMoves
        .filter((m) => !m.cards.some((c) => struct.bombRanks.has(c.rankIndex)))
        .sort(
          (a, b) =>
            this.evaluateMoveBreakCost(a, struct) - this.evaluateMoveBreakCost(b, struct) ||
            a.highValue - b.highValue
        );
      const chosenPhom = safePhomMoves[0] || allPhomMoves[0];
      if (chosenPhom) {
        const phomIds = chosenPhom.cards.map((c) => c.id);
        this.selectedCardIds = new Set(phomIds);
        this.companionCardIds.clear();
        player._skillForcedComboIds = phomIds;
      }
      skillSummary = `☂️ [Pháo Dù Phỏm Pha Lê] ${player.name} khai hỏa Pháo Dù Phỏm: Mặc kệ đối thủ vừa đánh bộ bài gì trên bàn, lượt này ${player.name} được dùng Sảnh Đồng Chất hoặc Sám Cô để chặt đè trực tiếp!`;
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
      this.yoimiyaChainFuseReady = true;
      skillSummary = `🎆 [Dây Pháo Liên Hoàn] ${player.name} châm ngòi Dây Pháo: Khi đánh ra 1 lá bài (hoặc 1 Đôi) trong lượt này, tất cả các lá bài có bậc số liên tiếp ngay phía trên nó trên tay sẽ tự động bắt lửa nổ dây chuyền bay ra bàn cùng lúc và chốt bàn ở lá cao nhất!`;
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
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const candOpps = unpassedOpps.length > 0 ? unpassedOpps : activeOpponents;
      const target = [...candOpps].sort((a, b) => a.hand.length - b.hand.length)[0];
      if (target) {
        this.citlaliPillowOwnerId = player.id;
        this.citlaliPillowTargetId = target.id;
        skillSummary = `🛏️ [Gối Ôm Ký Sinh] ${player.name} gắn Gối Citlalin ký sinh lên ${target.name} (${target.hand.length} lá) trong vòng này: Hễ ${target.name} đánh ra bao nhiêu lá bài, ${player.name} sẽ tự động được vứt bỏ theo bấy nhiêu lá bài rác nhỏ nhất trên tay!`;
      }
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
      const setup = this.findEscoffierPairRunSetup(player.hand, preferredCardIds);
      if (setup && setup.trashCard) {
        const trashCard = setup.trashCard;
        const trashLabel = `${trashCard.rank}${trashCard.suit}`;
        const targetRank = setup.targetRank;
        const existingSuits = new Set(
          player.hand
            .filter((c) => c.id !== trashCard.id && c.rankIndex === targetRank)
            .map((c) => c.suitIndex)
        );
        let newSuitIdx = 3;
        for (const s of [3, 2, 1, 0]) {
          if (!existingSuits.has(s)) {
            newSuitIdx = s;
            break;
          }
        }
        const newCard = {
          rankIndex: targetRank,
          suitIndex: newSuitIdx,
          rank: RANKS[targetRank],
          suit: SUITS[newSuitIdx],
          value: targetRank * 4 + newSuitIdx,
          isRed: newSuitIdx >= 2,
          id: `${RANKS[targetRank]}${SUITS[newSuitIdx]}_escoffier_${Date.now()}`,
        };
        player.hand = player.hand.filter((c) => c.id !== trashCard.id);
        player.hand.push(newCard);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        const completedCards = [...setup.coreCards, newCard];
        this.selectedCardIds = new Set(completedCards.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `🍰 [Tuyệt Kỹ Đôi Thông] ${player.name} lập tức thêm lá ${newCard.rank}${newCard.suit} vào tay và bỏ lá bài rác ${trashLabel} ➔ Hoàn thành ngay bộ ${setup.label}!`;
      }
    } else if (charId === 'zibai') {
      this.zibaiMinStepOwnerId = player.id;
      this.syncRoundRuleGlobals(player.id);
      const unpassedOpps = activeOpponents.filter((p) => !p.passed);
      const candOpps = unpassedOpps.length > 0 ? unpassedOpps : activeOpponents;
      const maxCardOpp = [...candOpps].sort((a, b) => b.hand.length - a.hand.length)[0];
      let redirectNote = '';
      if (maxCardOpp) {
        this.zibaiRedirectTargetId = maxCardOpp.id;
        // Các đối thủ ngồi chen giữa Zibai và người nhiều bài nhất bị Bạch Mã phóng vọt qua đầu
        const dir = this.turnDirection === -1 ? -1 : 1;
        const skippedNames = [];
        for (let step = 1; step < 4; step++) {
          const midId = (player.id + step * dir + 16) % 4;
          if (midId === maxCardOpp.id) break;
          const midP = this.players[midId];
          if (midP && midP.active && midP.finishRank === null && !midP.passed && midP.hand.length > 0) {
            midP.passed = true;
            skippedNames.push(midP.name);
          }
        }
        redirectNote =
          skippedNames.length > 0
            ? ` chỉ định thẳng ${maxCardOpp.name} (${maxCardOpp.hand.length} lá) phải đỡ bài kế tiếp (vượt qua ${skippedNames.join(', ')}) và`
            : ` chỉ định ${maxCardOpp.name} (${maxCardOpp.hand.length} lá) đỡ bài kế tiếp và`;
      }
      skillSummary = `🐎 [Bạch Mã Vượt Tuyến] ${player.name} thúc Bạch Mã${redirectNote} dựng Rào Cản Tốc Độ: Mọi đối thủ muốn đánh đè bài trong vòng này BẮT BUỘC phải lớn hơn tối thiểu +2 bậc số (CẤM đè đồng số hoặc +1 bậc)!`;
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
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      const lowMirrorCands = sorted.filter((c) => c.rankIndex <= 5 && !struct.bombRanks.has(c.rankIndex));
      const targets = (lowMirrorCands.length > 0 ? lowMirrorCands : sorted.filter((c) => c.rankIndex <= 5)).slice(0, 3);
      const mirrorLogs = [];
      const mirroredIds = [];
      targets.forEach((c, idx) => {
        const oldStr = `${c.rank}${c.suit}`;
        // Trục đối xứng bàn bài: 3(0)➔A(11), 4(1)➔K(10), 5(2)➔Q(9), 6(3)➔J(8), 7(4)➔10(7), 8(5)➔9(6)
        const newR = Math.min(11, Math.max(0, 11 - c.rankIndex));
        c.rankIndex = newR;
        c.rank = RANKS[newR];
        c.value = newR * 4 + c.suitIndex;
        c.id = `${c.rank}${c.suit}_odette_mirror_${Date.now()}_${idx}`;
        mirrorLogs.push(`${oldStr}➔${c.rank}${c.suit}`);
        mirroredIds.push(c.id);
      });
      player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
      if (mirroredIds.length > 0) {
        this.selectedCardIds = new Set([mirroredIds[mirroredIds.length - 1]]);
        this.companionCardIds.clear();
      }
      skillSummary = `🦢 [Mặt Hồ Đối Xứng] ${player.name} soi bóng Mặt Hồ Thiên Nga phản chiếu đối xứng ${targets.length} lá bài nhỏ nhất qua trục gương (${mirrorLogs.join(', ')})!`;
    } else if (charId === 'vesna') {
      this.vesnaSpringOwnerId = player.id;
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      const blackCands = sorted.filter((c) => c.suitIndex <= 1 && !struct.bombRanks.has(c.rankIndex));
      const targets = (blackCands.length > 0 ? blackCands : sorted.filter((c) => c.suitIndex <= 1)).slice(0, 2);
      const bloomLogs = [];
      targets.forEach((c, idx) => {
        const oldStr = `${c.rank}${c.suit}`;
        c.suitIndex = 3;
        c.suit = '♥';
        c.isRed = true;
        c.value = c.rankIndex * 4 + 3;
        c.id = `${c.rank}♥_vesna_${Date.now()}_${idx}`;
        bloomLogs.push(`${oldStr}➔${c.rank}♥`);
      });
      player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
      const bloomNote = bloomLogs.length > 0 ? ` (nở hoa nhuộm Đỏ ${bloomLogs.join(', ')}) và ` : ': ';
      skillSummary = `🍃 [Gió Xuân Đoạt Cái] ${player.name} thổi Gió Xuân${bloomNote}yểm Lời Nguyền Bài Đỏ lên bàn: Nếu vòng này kết thúc mà bộ bài thắng vòng của đối thủ có chứa lá Đỏ (♥/♦), ${player.name} sẽ TỊCH THU QUYỀN CẦM CÁI mở vòng mới!`;
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
      const plan = this.findVodyanitsaMinimalBeatSpec(player.hand, this.currentCombo, player.id);
      if (plan && plan.specs && plan.specs.length > 0) {
        const specs = plan.specs;
        const needLen = specs.length;
        const struct = this.analyzeBotHandStructure(player.hand);

        // Giữ lại tối đa (needLen - 1) lá trên tay nếu đã trùng khớp sẵn với một phần bộ mục tiêu,
        // và ĐỔI NGẪU NHIÊN các lá còn lại trên tay thành các mảnh ghép còn thiếu để VỪA ĐỦ chặt/đè đối thủ!
        const keptCards = [];
        const remainingSpecs = [];
        const usedHandIds = new Set();

        for (let i = 0; i < specs.length; i++) {
          const sp = specs[i];
          // Luôn để dành ít nhất 1 vị trí (lá chủ lực cuối cùng) để đổi ngẫu nhiên từ tay bài
          if (keptCards.length < needLen - 1) {
            const exactMatch = player.hand.find(
              (c) => !usedHandIds.has(c.id) && c.rankIndex === sp.rankIndex && c.suitIndex === sp.suitIndex
            );
            if (exactMatch) {
              keptCards.push(exactMatch);
              usedHandIds.add(exactMatch.id);
              continue;
            }
          }
          remainingSpecs.push(sp);
        }

        const availableHand = player.hand.filter((c) => !usedHandIds.has(c.id));
        const nonBombPool = shuffleDeck(
          availableHand.filter((c) => !struct.bombRanks.has(c.rankIndex) && !(this.mustPlay3Spade && c.value === 0))
        );
        const fallbackPool = shuffleDeck(
          availableHand.filter((c) => !nonBombPool.some((nb) => nb.id === c.id))
        );
        const randomCandidates = [...nonBombPool, ...fallbackPool].slice(0, remainingSpecs.length);

        const swappedOldLabels = [];
        const swappedNewLabels = [];
        randomCandidates.forEach((c, idx) => {
          const sp = remainingSpecs[idx];
          if (!sp) return;
          swappedOldLabels.push(`${c.rank}${c.suit}`);
          c.rankIndex = sp.rankIndex;
          c.rank = RANKS[sp.rankIndex];
          c.suitIndex = sp.suitIndex;
          c.suit = SUITS[sp.suitIndex];
          c.isRed = sp.suitIndex >= 2;
          c.value = sp.rankIndex * 4 + sp.suitIndex;
          c.id = `${c.rank}${c.suit}_vody_${Date.now()}_${idx}`;
          swappedNewLabels.push(`${c.rank}${c.suit}`);
        });

        const finalComboCards = sortCardsAsc([...keptCards, ...randomCandidates]);
        const finalIds = finalComboCards.map((c) => c.id);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        player._skillForcedComboIds = finalIds;
        if (player.id === this.mySeatId) {
          this.selectedCardIds = new Set(finalIds);
          this.companionCardIds.clear();
        }
        const mirroredCombo = classifyCombo(finalComboCards);
        const newLabel = mirroredCombo ? mirroredCombo.label : finalComboCards.map((c) => `${c.rank}${c.suit}`).join(' ');
        skillSummary = `🌊 [Gương Nước Phản Chiếu] ${player.name} đổi ngẫu nhiên (${swappedOldLabels.join(', ')}) ➔ (${swappedNewLabels.join(', ')}) tạo thành ${newLabel} VỪA ĐỦ chặt/đè ${this.currentCombo.label} của đối thủ!`;
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
      this.xiaoKarmaOwnerId = player.id;
      this.syncRoundRuleGlobals(player.id);
      const capNotes = activeOpponents
        .map((opp) => {
          const capIdx = Math.min(12, Math.max(0, opp.hand.length));
          return `${opp.name} (${opp.hand.length} lá ➔ ≤ ${RANKS[capIdx]})`;
        })
        .join(', ');
      skillSummary = `👹 [Ách Nạn Nghiệp Chướng] ${player.name} đeo Mặt Nạ Dạ Xoa phóng thích Nghiệp Chướng bao trùm vòng này: Mọi đối thủ chỉ được phép đánh ra quân bài có bậc số tối đa bằng số lá bài họ đang cầm trên tay (+3) [${capNotes}]!`;
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
      skillSummary = `🎮 [Gài Bom Hẹn Giờ Ajaw] ${player.name} đặt Bom Pixel Ajaw lên bàn bài: Kể từ sau khi ${player.name} kích hoạt chiêu, bất kỳ đối thủ nào đi sau ${player.name} có đánh bài trong vòng đó đều sẽ nổ bom và bốc thêm 1 lá bài rác từ tay ${player.name}!`;
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
    } else if (charId === 'klee') {
      const target = [...activeOpponents].sort((a, b) => a.hand.length - b.hand.length)[0];
      if (target && target.hand.length > 0) {
        const oppRC = new Array(13).fill(0);
        target.hand.forEach((c) => oppRC[c.rankIndex]++);
        let targetCards = [];
        for (let r = 11; r >= 0; r--) {
          if (oppRC[r] >= 2) {
            targetCards = target.hand.filter((c) => c.rankIndex === r).slice(0, 3);
            break;
          }
        }
        if (targetCards.length === 0) {
          const oppStruct = this.analyzeBotHandStructure(target.hand);
          const straightCards = sortCardsAsc(target.hand).filter(
            (c) => c.rankIndex <= 11 && oppStruct.criticalStraightRanks.has(c.rankIndex)
          );
          if (straightCards.length >= 2) {
            targetCards = straightCards.slice(-3);
          } else {
            targetCards = sortCardsAsc(target.hand)
              .filter((c) => c.rankIndex <= 11)
              .slice(-Math.min(3, target.hand.length));
            if (targetCards.length === 0) targetCards = target.hand.slice(0, Math.min(2, target.hand.length));
          }
        }
        const scatterRanks = [0, 2, 5]; // 3, 5, 8 rời rạc không ghép đôi hay nối sảnh
        const blastedLog = [];
        targetCards.forEach((c, idx) => {
          const oldStr = `${c.rank}${c.suit}`;
          const newR = scatterRanks[idx % scatterRanks.length];
          const newS = idx % 2;
          c.rankIndex = newR;
          c.rank = RANKS[newR];
          c.suitIndex = newS;
          c.suit = SUITS[newS];
          c.isRed = false;
          c.value = newR * 4 + newS;
          c.id = `${c.rank}${c.suit}_klee_${Date.now()}_${idx}`;
          blastedLog.push(`${oldStr}➔${c.rank}${c.suit}`);
        });
        target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
        skillSummary = `💣 [Bom Nảy Phá Bộ] ${player.name} ném Bom Nảy vào tay ${target.name}, nổ tung bộ bài ghép thành các lá lẻ rời rạc (${blastedLog.join(', ')})!`;
      }
    } else if (charId === 'albedo') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      const trashCand =
        sorted.find(
          (c) =>
            c.rankIndex < 12 &&
            struct.rankCounts[c.rankIndex] === 1 &&
            !struct.bombRanks.has(c.rankIndex) &&
            !struct.criticalStraightRanks.has(c.rankIndex)
        ) ||
        sorted.find((c) => c.rankIndex < 12 && !struct.bombRanks.has(c.rankIndex)) ||
        sorted[0];
      let bestGrave = null;
      if (this.matchGraveyardCards && this.matchGraveyardCards.length > 0) {
        bestGrave = sortCardsAsc(this.matchGraveyardCards)[this.matchGraveyardCards.length - 1];
      }
      const targetRank = bestGrave ? bestGrave.rankIndex : 11; // Mặc định A♥ nếu Mộ Bài chưa có lá lớn
      const targetSuit = bestGrave ? bestGrave.suitIndex : 3;
      if (trashCand) {
        const oldStr = `${trashCand.rank}${trashCand.suit}`;
        trashCand.rankIndex = targetRank;
        trashCand.rank = RANKS[targetRank];
        trashCand.suitIndex = targetSuit;
        trashCand.suit = SUITS[targetSuit];
        trashCand.isRed = targetSuit >= 2;
        trashCand.value = targetRank * 4 + targetSuit;
        trashCand.id = `${trashCand.rank}${trashCand.suit}_albedo_${Date.now()}`;
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set([trashCand.id]);
        this.companionCardIds.clear();
        skillSummary = `⚜️ [Giả Kim Mộ Bài] ${player.name} trục xuất giả kim tái tạo lá mạnh nhất từ Mộ Bài đã đánh ra trong ván, biến lá rác ${oldStr} thành bản sao ${trashCand.rank}${trashCand.suit}!`;
      }
    } else if (charId === 'varka') {
      this.varkaSumSlashTurn = true;
      activeVarkaSumSlash = true;
      this.syncRoundRuleGlobals(player.id);
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand).filter((c) => !struct.bombRanks.has(c.rankIndex));
      const pool = sorted.length >= 2 ? sorted : sortCardsAsc(player.hand);
      let chosenPair = null;
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (pool[i].rankIndex === pool[j].rankIndex) continue;
          const combo = classifyCombo([pool[i], pool[j]]);
          if (combo && combo.isVarkaSumSlash && (!this.currentCombo || canBeatCombo(this.currentCombo, combo))) {
            chosenPair = [pool[i], pool[j]];
            break;
          }
        }
        if (chosenPair) break;
      }
      if (!chosenPair && pool.length >= 2) {
        for (let i = 0; i < pool.length; i++) {
          for (let j = i + 1; j < pool.length; j++) {
            if (pool[i].rankIndex !== pool[j].rankIndex) {
              chosenPair = [pool[i], pool[j]];
              break;
            }
          }
          if (chosenPair) break;
        }
      }
      let slashNote = '';
      if (chosenPair) {
        this.selectedCardIds = new Set(chosenPair.map((c) => c.id));
        this.companionCardIds.clear();
        const slashCombo = classifyCombo(chosenPair);
        if (slashCombo) {
          slashNote = ` — Sẵn sàng hợp kích ${slashCombo.label}`;
        }
      }
      skillSummary = `🗡️ [Song Kiếm Hợp Lực] ${player.name} vung Song Đại Kiếm Bắc Phong: Cho phép gộp 2 lá lẻ khác số cộng dồn tổng điểm thành 1 đòn chém Bài Lẻ cực đại (tối đa hóa thành Heo Cơ 2♥)${slashNote}!`;
    } else if (charId === 'nicole') {
      this.nicoleSuitOnlyRound = true;
      activeNicoleSuitOnlyRound = true;
      skillSummary = `☕ [Tiệc Trà Tiên Tri] ${player.name} khai tiệc Hexenzirkel: San bằng mọi cấp số từ 3 đến A trong vòng này — Đè bài cùng loại hoàn toàn quyết định bằng Chất (♠ < ♣ < ♦ < ♥)!`;
    } else if (charId === 'zhongli') {
      const blackIds = [];
      activeOpponents.forEach((opp) => {
        opp.hand.forEach((c) => {
          if (c.suitIndex <= 1) {
            blackIds.push(c.id);
          }
        });
      });
      this.zhongliPetrifiedCardIds = new Set(blackIds);
      activeZhongliPetrifiedCardIds = this.zhongliPetrifiedCardIds;
      skillSummary = `☄️ [Thiên Tinh Hoá Đá] ${player.name} giáng Thiên Tinh hóa đá khóa cứng toàn bộ ${blackIds.length} lá bài chất Đen (♠, ♣) trên tay TẤT CẢ đối thủ trong vòng này (chỉ được đánh bài Đỏ ♦, ♥)!`;
    } else if (charId === 'baizhu') {
      this.baizhuShieldOwnerId = player.id;
      activeBaizhuShield = true;
      const wasPassedOrOut = player.passed || this.currentTurn !== player.id;
      if (wasPassedOrOut) {
        clearTimeout(this.botTimer);
        player.passed = false;
        player.declinedFourPairsCut = false;
        this.currentTurn = player.id;
      }
      this.syncRoundRuleGlobals(player.id);
      skillSummary = `🐍 [Kim Chung Hồi Mạch] ${player.name} kích hoạt Khiên Vô Sự ${
        wasPassedOrOut ? 'HỒI SINH LƯỢT ĐÁNH NGAY LẬP TỨC và ' : ''
      }bảo hộ tuyệt đối bộ bài đánh ra (CẤM chặt Heo / Đôi Heo / Hàng trong vòng này)!`;
    } else if (charId === 'xianyun') {
      this.xianyunStepStraightTurn = true;
      activeXianyunStepStraight = true;
      const struct = this.analyzeBotHandStructure(player.hand);
      const stepMovesNow = getValidMoves(player.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
        (m) => m.isStepStraight && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
      );
      if (stepMovesNow.length > 0) {
        this.selectedCardIds = new Set(stepMovesNow[0].cards.map((c) => c.id));
        this.companionCardIds.clear();
      }
      skillSummary = `🦩 [Bộ Pháp Đằng Vân] ${player.name} bật cơ quan Trúc Tinh: Cho phép đánh Sảnh Nhảy Bậc cách 2 đơn vị (VD: 3-5-7, 4-6-8-10) trong lượt này!`;
    } else if (charId === 'kazuha') {
      // Kazuha: Vạn Diệp Phong Vực — Nhuộm Đỏ (♥/♦) toàn bộ bài trên tay Kazuha và tước sắc hạ toàn bộ bài của đối thủ ít bài nhất xuống chất Đen (♠/♣)
      const rankUsedSuits = new Map();
      player.hand.forEach((c, idx) => {
        const used = rankUsedSuits.get(c.rankIndex) || 0;
        const redOrder = [3, 2, 1, 0];
        const newS = redOrder[used % 4];
        rankUsedSuits.set(c.rankIndex, used + 1);
        c.suitIndex = newS;
        c.suit = SUITS[newS];
        c.isRed = newS >= 2;
        c.value = c.rankIndex * 4 + newS;
        c.id = `${c.rank}${c.suit}_kazuha_red_${Date.now()}_${idx}`;
      });
      player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');

      const target = [...activeOpponents].sort((a, b) => a.hand.length - b.hand.length)[0];
      let oppNote = '';
      if (target && target.hand.length > 0) {
        const oppUsedSuits = new Map();
        target.hand.forEach((c, idx) => {
          const used = oppUsedSuits.get(c.rankIndex) || 0;
          const blackOrder = [0, 1, 2, 3];
          const newS = blackOrder[used % 4];
          oppUsedSuits.set(c.rankIndex, used + 1);
          c.suitIndex = newS;
          c.suit = SUITS[newS];
          c.isRed = newS >= 2;
          c.value = c.rankIndex * 4 + newS;
          c.id = `${c.rank}${c.suit}_kazuha_blk_${Date.now()}_${idx}`;
        });
        target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
        oppNote = ` và tước sắc toàn bộ ${target.hand.length} lá bài trên tay ${target.name} tụt xuống chất Đen (♠/♣)`;
      }
      skillSummary = `🍁 [Vạn Diệp Phong Vực] ${player.name} cuốn lốc lá phong đỏ nhuộm toàn bộ ${player.hand.length} lá bài trên tay mình thành chất Đỏ (♥/♦)${oppNote}!`;
    } else if (charId === 'itto') {
      this.ittoUshiOwnerId = player.id;
      skillSummary = `👹 [Tuyệt Kỹ Ném Bò Ushi] ${player.name} ném Bò Ushi trấn thủ giữa bàn bài: Ngay khi đối thủ kế tiếp đánh ra BẤT KỲ bộ bài nào (kể cả Heo/Hàng), Bò Ushi sẽ húc văng đòn đánh đó, hủy lượt của họ và trao quyền Cầm Cái mở vòng mới về tay ${player.name}!`;
    } else if (charId === 'ayato') {
      this.ayatoCloneReady = true;
      skillSummary = `🌊 [Thủy Ảnh Thế Thân] ${player.name} triệu hồi phân thân nước Kamisato: Khi đánh bộ bài trong lượt này, 1 lá rác nhỏ nhất trên tay sẽ thế chỗ cho lá chủ lực để lại Phân Thân Nước (-1 bậc) ở lại trên tay!`;
    } else if (charId === 'cyno') {
      this.cynoRoyalBanOwnerId = player.id;
      this.cynoRoyalBanRound = true;
      this.syncRoundRuleGlobals(player.id);
      let demoteNote = '';
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank >= 8 &&
        this.currentCombo.highRank <= 11
      ) {
        const oldLabel = this.currentCombo.label;
        const targetRank = 6; // 9 (rankIndex 6)
        if (this.currentCombo.type === COMBO_TYPES.STRAIGHT && this.currentCombo.length >= 3) {
          const topR = Math.max(this.currentCombo.length - 1, targetRank);
          const startR = topR - this.currentCombo.length + 1;
          this.currentCombo.cards.forEach((c, idx) => {
            const rIdx = startR + idx;
            c.rankIndex = rIdx;
            c.rank = RANKS[rIdx];
            c.value = rIdx * 4 + c.suitIndex;
          });
          this.currentCombo.highRank = topR;
          this.currentCombo.highValue = topR * 4 + (this.currentCombo.highCard?.suitIndex || 0);
          this.currentCombo.label = `Sảnh ${this.currentCombo.length} lá (${RANKS[startR]}➔${RANKS[topR]}) [🐺 Cyno hạ từ ${oldLabel}]`;
        } else {
          this.currentCombo.cards.forEach((c) => {
            c.rankIndex = targetRank;
            c.rank = RANKS[targetRank];
            c.value = targetRank * 4 + c.suitIndex;
          });
          this.currentCombo.highRank = targetRank;
          this.currentCombo.highValue = targetRank * 4 + (this.currentCombo.highCard?.suitIndex || 0);
          this.currentCombo.label = `${this.currentCombo.label.split(' ')[0]} 9 [🐺 Cyno hạ từ ${oldLabel}]`;
        }
        demoteNote = ` • Giáng lôi trượng hạ ${oldLabel} trên bàn xuống bậc 9 để đè bằng bài số`;
      }
      skillSummary = `🐺 [Thiết Quân Luật Mahamatra] ${player.name} ban hành Thiết Quân Luật: CẤM TẤT CẢ đối thủ đánh mọi lá bài Hình & Heo (J, Q, K, A, 2) trong vòng này — Đối thủ chỉ được phép ra bài số từ 3 ➔ 10${demoteNote}!`;
    } else if (charId === 'nilou') {
      const sorted = sortCardsAsc(player.hand);
      const rc = new Array(13).fill(0);
      sorted.forEach((c) => rc[c.rankIndex]++);
      const pairRanks = [];
      for (let r = 0; r <= 10; r++) {
        if (rc[r] === 2) pairRanks.push(r);
      }
      if (pairRanks.length > 0) {
        const changes = [];
        const boostedIds = [];
        pairRanks.forEach((pr) => {
          const cards = player.hand.filter((c) => c.rankIndex === pr);
          const newR = Math.min(11, pr + 2);
          cards.forEach((c, idx) => {
            c.rankIndex = newR;
            c.rank = RANKS[newR];
            c.value = newR * 4 + c.suitIndex;
            c.id = `${c.rank}${c.suit}_nilou_${Date.now()}_${pr}_${idx}`;
            boostedIds.push(c.id);
          });
          changes.push(`Đôi ${RANKS[pr]}➔Đôi ${RANKS[newR]}`);
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(boostedIds.slice(-2));
        this.companionCardIds.clear();
        skillSummary = `🪷 [Vũ Điệu Hoa Sen] ${player.name} múa vũ điệu Sabzeruz thăng hoa toàn bộ ${pairRanks.length} Đôi trên tay tăng +2 bậc (${changes.join(', ')})!`;
      } else {
        const twoLow = sorted.slice(0, 2);
        const oldStr = twoLow.map((c) => `${c.rank}${c.suit}`).join(', ');
        const targetR = 9; // Q
        twoLow.forEach((c, idx) => {
          const sIdx = idx === 0 ? 3 : 2;
          c.rankIndex = targetR;
          c.rank = RANKS[targetR];
          c.suitIndex = sIdx;
          c.suit = SUITS[sIdx];
          c.isRed = true;
          c.value = targetR * 4 + sIdx;
          c.id = `${c.rank}${c.suit}_nilou_${Date.now()}_${idx}`;
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(twoLow.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `🪷 [Vũ Điệu Hoa Sen] ${player.name} kết nở Hạt Nhân Căng Tràn biến (${oldStr}) thành Đôi Q Đỏ (Q♥ Q♦)!`;
      }
    } else if (charId === 'nahida') {
      const loweredNotes = [];
      activeOpponents.forEach((opp) => {
        const oppSorted = sortCardsAsc(opp.hand);
        const top3 = oppSorted.slice(-Math.min(3, oppSorted.length));
        this.yelanRevealedByPlayer[opp.id] = {
          cards: top3,
          expiresAt: Date.now() + 10000,
        };
        setTimeout(() => {
          if (this.yelanRevealedByPlayer[opp.id] && Date.now() >= this.yelanRevealedByPlayer[opp.id].expiresAt) {
            delete this.yelanRevealedByPlayer[opp.id];
            this.renderSeats();
          }
        }, 10100);
        const oppNormals = oppSorted.filter((c) => c.rankIndex <= 11);
        const highestNormal = oppNormals.length > 0 ? oppNormals[oppNormals.length - 1] : null;
        if (highestNormal && highestNormal.rankIndex > 0) {
          const oldR = highestNormal.rank;
          const newR = Math.max(0, highestNormal.rankIndex - 1);
          highestNormal.rankIndex = newR;
          highestNormal.rank = RANKS[newR];
          highestNormal.value = newR * 4 + highestNormal.suitIndex;
          highestNormal.id = `${highestNormal.rank}${highestNormal.suit}_nahida_${Date.now()}_${opp.id}`;
          opp.hand = sortHandByMode(opp.hand, opp.id === this.mySeatId ? this.sortMode : 'asc');
          loweredNotes.push(`${opp.name}: ${oldR}➔${highestNormal.rank}`);
        }
      });
      skillSummary = `🌿 [Đền Thờ Maya Liên Kết] ${player.name} quét tri thức Akasha: Lộ diện 3 lá bài lớn nhất của TẤT CẢ đối thủ trong 10s và hạ -1 bậc lá bài thường cao nhất của họ (${loweredNotes.join(' • ') || 'Đã liên kết'})!`;
    } else if (charId === 'alhaitham') {
      this.alhaithamOwnerId = player.id;
      this.alhaithamAllowedRanks = new Set(player.hand.map((c) => c.rankIndex));
      this.syncRoundRuleGlobals(player.id);
      const allowedLabels = [...this.alhaithamAllowedRanks]
        .sort((a, b) => a - b)
        .map((r) => RANKS[r])
        .join(', ');
      skillSummary = `🪞 [Ma Trận Phổ Quang] ${player.name} dựng Ma Trận Gương Ánh Sáng: CẤM đối thủ đánh bộ bài có lá cao nhất nằm ngoài tập số [${allowedLabels}] đang có trên tay Alhaitham trong vòng này!`;
    } else if (charId === 'neuvillette') {
      const target = [...activeOpponents].sort((a, b) => a.hand.length - b.hand.length)[0];
      if (target && player.hand.length > target.hand.length) {
        const diff = player.hand.length - target.hand.length;
        // Chuyển thẳng các lá bài rác nhỏ nhất từ tay Neuvillette sang tay đối thủ cho đến khi số bài 2 bên bằng nhau (tối đa chuyển 3 lá)
        const transferCount = Math.min(3, Math.ceil(diff / 2), Math.max(1, player.hand.length - 1));
        const struct = this.analyzeBotHandStructure(player.hand);
        const sorted = sortCardsAsc(player.hand);
        const isolatedTrash = sorted.filter(
          (c) =>
            c.rankIndex < 12 &&
            struct.rankCounts[c.rankIndex] === 1 &&
            !struct.bombRanks.has(c.rankIndex) &&
            !struct.criticalStraightRanks.has(c.rankIndex) &&
            !(this.mustPlay3Spade && c.value === 0)
        );
        const fallbackTrash = sorted.filter(
          (c) =>
            !isolatedTrash.some((it) => it.id === c.id) &&
            !struct.bombRanks.has(c.rankIndex) &&
            !(this.mustPlay3Spade && c.value === 0)
        );
        const toTransfer = [...isolatedTrash, ...fallbackTrash, ...sorted].slice(0, transferCount);
        const transferIds = new Set(toTransfer.map((c) => c.id));
        const transferLabels = toTransfer.map((c) => `${c.rank}${c.suit}`).join(', ');
        player.hand = player.hand.filter((c) => !transferIds.has(c.id));
        target.hand.push(...toTransfer);
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        target.hand = sortHandByMode(target.hand, target.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        skillSummary = `⚖️ [Cán Cân Tuyệt Đối] ${player.name} gõ trượng Cán Cân Công Lý chuyển thẳng ${toTransfer.length} lá bài rác nhỏ nhất (${transferLabels}) từ tay mình sang tay ${target.name} (cân bằng quân số: ${player.name} còn ${player.hand.length} lá — ${target.name} lên ${target.hand.length} lá)!`;
      }
    } else if (charId === 'wriothesley') {
      this.wriothesleyNoSingleOwnerId = player.id;
      this.wriothesleyNoSingleRound = true;
      this.syncRoundRuleGlobals(player.id);
      let smashNote = '';
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.type === COMBO_TYPES.SINGLE &&
        this.currentCombo.highRank < 12
      ) {
        const oldSingleLabel = this.currentCombo.label;
        this.previousCombo = this.currentCombo;
        this.currentCombo = null;
        this.trickOwnerId = player.id;
        this.chopPot = 0;
        this.lastChoppedPlayerId = null;
        this.roundChoppableStack = [];
        this.players.forEach((p) => {
          p.passed = false;
          p.declinedFourPairsCut = false;
        });
        smashNote = ` • Đấm tan ${oldSingleLabel} trên bàn để cướp quyền mở vòng bằng bộ ghép`;
      }
      const multiCombos = generateAllCombosFromHand(player.hand).filter(
        (m) => m.length >= 2 && (!this.currentCombo || canBeatCombo(m, this.currentCombo).ok)
      );
      if (multiCombos.length > 0 && player.id === this.mySeatId) {
        this.selectedCardIds = new Set(multiCombos[0].cards.map((c) => c.id));
        this.companionCardIds.clear();
      }
      skillSummary = `🥊 [Đấu Trường Ngục Tù] ${player.name} thiết lập Luật Đấu Trường Meropide: CẤM TẤT CẢ đối thủ đánh Bài Lẻ (1 lá) trong vòng này — Đối thủ chỉ được phép tung Đôi, Sám Cô, Sảnh (≥ 2 lá) hoặc Hàng${smashNote}!`;
    } else if (charId === 'sigewinne') {
      this.sigewinneCareOwnerId = player.id;
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      let healTargets = sorted.filter((c) => c.rankIndex <= 4 && !struct.bombRanks.has(c.rankIndex)).slice(0, 3);
      if (healTargets.length === 0) {
        healTargets = sorted.filter((c) => c.rankIndex <= 9 && !struct.bombRanks.has(c.rankIndex)).slice(0, 2);
      }
      if (healTargets.length === 0 && sorted.length > 0) {
        healTargets = [sorted[0]];
      }
      const healedLogs = [];
      const healedIds = [];
      healTargets.forEach((c, idx) => {
        const oldStr = `${c.rank}${c.suit}`;
        const newR = Math.min(11, c.rankIndex + 2);
        const newS = idx % 2 === 0 ? 3 : 2; // ♥ hoặc ♦
        c.rankIndex = newR;
        c.rank = RANKS[newR];
        c.suitIndex = newS;
        c.suit = SUITS[newS];
        c.isRed = true;
        c.value = newR * 4 + newS;
        c.id = `${c.rank}${c.suit}_sigewinne_${Date.now()}_${idx}`;
        healedLogs.push(`${oldStr}➔${c.rank}${c.suit}`);
        healedIds.push(c.id);
      });
      player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
      if (healedIds.length > 0 && player.id === this.mySeatId) {
        this.selectedCardIds = new Set([healedIds[healedIds.length - 1]]);
        this.companionCardIds.clear();
      }
      skillSummary = `💉 [Trạm Y Tế Meropide] ${player.name} tiêm Tinh Chất Trị Liệu nâng +2 bậc chất Đỏ cho ${healTargets.length} lá bài nhỏ (${healedLogs.join(', ')}) và đặt Phí Chăm Sóc Đặc Biệt: Khi kết thúc vòng này, đối thủ nào thắng vòng phải nộp 3× tiền cược (${(
        b * 3
      ).toLocaleString()} Xu) viện phí cho ${player.name}!`;
    } else if (charId === 'emilie') {
      const suitCounts = [0, 0, 0, 0];
      if (preferredCardIds && preferredCardIds.length > 0) {
        const prefCard = player.hand.find((c) => preferredCardIds.includes(c.id));
        if (prefCard) suitCounts[prefCard.suitIndex] += 100;
      }
      player.hand.forEach((c) => {
        suitCounts[c.suitIndex] = (suitCounts[c.suitIndex] || 0) + 1;
      });
      let bestSuit = 3;
      let bestCount = -1;
      for (const s of [3, 2, 1, 0]) {
        if (suitCounts[s] > bestCount) {
          bestCount = suitCounts[s];
          bestSuit = s;
        }
      }
      this.emiliePerfumeOwnerId = player.id;
      this.emilieRequiredSuit = bestSuit;
      this.syncRoundRuleGlobals(player.id);
      const suitNames = ['Bích ♠', 'Chuồn ♣', 'Rô ♦', 'Cơ ♥'];
      skillSummary = `🧪 [Tinh Dầu Khử Trùng] ${player.name} xịt Tinh Dầu Hương Hoa khóa vòng đấu theo chất ${suitNames[bestSuit]}: Mọi bộ bài đối thủ đánh ra trong vòng này BẮT BUỘC phải chứa ít nhất 1 lá mang chất ${SUITS[bestSuit]}!`;
    } else if (charId === 'chasca') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      const allCombos = generateAllCombosFromHand(player.hand);
      const straights = allCombos
        .filter((m) => m.type === COMBO_TYPES.STRAIGHT && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex)))
        .sort((a, b) => b.length - a.length || b.highValue - a.highValue);
      if (straights.length > 0) {
        const baseSt = straights[0];
        const stIds = new Set(baseSt.cards.map((c) => c.id));
        const remTrash = sorted.filter((c) => !stIds.has(c.id) && !struct.bombRanks.has(c.rankIndex)).slice(0, 2);
        let curLow = baseSt.cards[0].rankIndex;
        let curHigh = baseSt.cards[baseSt.cards.length - 1].rankIndex;
        const extendedIds = [...baseSt.cards.map((c) => c.id)];
        remTrash.forEach((c, idx) => {
          let newR = -1;
          if (curHigh < 11) {
            curHigh++;
            newR = curHigh;
          } else if (curLow > 0) {
            curLow--;
            newR = curLow;
          }
          if (newR >= 0) {
            c.rankIndex = newR;
            c.rank = RANKS[newR];
            c.suitIndex = 3;
            c.suit = '♥';
            c.isRed = true;
            c.value = newR * 4 + 3;
            c.id = `${c.rank}♥_chasca_${Date.now()}_${idx}`;
            extendedIds.push(c.id);
          }
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(extendedIds);
        this.companionCardIds.clear();
        skillSummary = `🔫 [Đạn Xoáy Nối Sảnh] ${player.name} nạp ${remTrash.length} viên đạn nguyên tố nối dài ${baseSt.label} thành Sảnh ${extendedIds.length} lá (${RANKS[curLow]} ➔ ${RANKS[curHigh]})!`;
      } else {
        const pool = sorted.filter((c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex)).slice(0, Math.min(4, player.hand.length));
        const len = pool.length;
        const topR = Math.min(11, Math.max(len - 1, (pool[len - 1]?.rankIndex || 6) + 2));
        const startR = topR - len + 1;
        pool.forEach((c, idx) => {
          const rIdx = startR + idx;
          c.rankIndex = rIdx;
          c.rank = RANKS[rIdx];
          c.suitIndex = idx === len - 1 ? 3 : c.suitIndex;
          c.suit = SUITS[c.suitIndex];
          c.isRed = c.suitIndex >= 2;
          c.value = rIdx * 4 + c.suitIndex;
          c.id = `${c.rank}${c.suit}_chasca_${Date.now()}_${idx}`;
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(pool.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `🔫 [Đạn Xoáy Nối Sảnh] ${player.name} bắn loạt đạn đa sắc kết nối ${len} lá lẻ thành Sảnh ${len} lá (${RANKS[startR]} ➔ ${RANKS[topR]})!`;
      }
    } else if (charId === 'tartaglia') {
      const struct = this.analyzeBotHandStructure(player.hand);
      const sorted = sortCardsAsc(player.hand);
      const allCombos = generateAllCombosFromHand(player.hand);
      const straights = allCombos.filter(
        (m) => m.type === COMBO_TYPES.STRAIGHT && m.length >= 3 && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
      );
      const wantTriple =
        (this.currentCombo && this.currentCombo.type === COMBO_TYPES.TRIPLE) ||
        (straights.length > 0 && (!this.currentCombo || this.currentCombo.type !== COMBO_TYPES.STRAIGHT));
      if (wantTriple && straights.length > 0) {
        const chosen3 = straights[0].cards.slice(-3);
        const targetR = chosen3[2].rankIndex;
        const oldStr = chosen3.map((c) => `${c.rank}${c.suit}`).join('-');
        const suitsOrder = [3, 2, 1];
        chosen3.forEach((c, idx) => {
          const sIdx = suitsOrder[idx % 3];
          c.rankIndex = targetR;
          c.rank = RANKS[targetR];
          c.suitIndex = sIdx;
          c.suit = SUITS[sIdx];
          c.isRed = sIdx >= 2;
          c.value = targetR * 4 + sIdx;
          c.id = `${c.rank}${c.suit}_childe_${Date.now()}_${idx}`;
        });
        player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
        this.selectedCardIds = new Set(chosen3.map((c) => c.id));
        this.companionCardIds.clear();
        skillSummary = `🐋 [Hoán Đổi Võ Khí — Song Đao] ${player.name} rút Song Đao Thủy gom bộ Sảnh (${oldStr}) thành Sám Cô ${RANKS[targetR]}!`;
      } else {
        let tripleCards = [];
        for (let r = 11; r >= 0; r--) {
          if (struct.rankCounts[r] === 3) {
            tripleCards = sorted.filter((c) => c.rankIndex === r);
            break;
          }
        }
        const chosen3 =
          tripleCards.length === 3
            ? tripleCards
            : sorted.filter((c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex)).slice(0, 3);
        if (chosen3.length === 3) {
          const oldStr = chosen3.map((c) => `${c.rank}${c.suit}`).join(', ');
          const topR =
            this.currentCombo && this.currentCombo.type === COMBO_TYPES.STRAIGHT && this.currentCombo.length === 3
              ? Math.min(11, Math.max(2, this.currentCombo.highRank + 1))
              : Math.min(11, Math.max(2, chosen3[2].rankIndex + 1));
          const startR = topR - 2;
          chosen3.forEach((c, idx) => {
            const rIdx = startR + idx;
            const sIdx = idx === 2 ? 3 : c.suitIndex;
            c.rankIndex = rIdx;
            c.rank = RANKS[rIdx];
            c.suitIndex = sIdx;
            c.suit = SUITS[sIdx];
            c.isRed = sIdx >= 2;
            c.value = rIdx * 4 + sIdx;
            c.id = `${c.rank}${c.suit}_childe_${Date.now()}_${idx}`;
          });
          player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
          this.selectedCardIds = new Set(chosen3.map((c) => c.id));
          this.companionCardIds.clear();
          skillSummary = `🐋 [Hoán Đổi Võ Khí — Cung Tên] ${player.name} giương Cung Thủy trải (${oldStr}) thành Sảnh 3 lá ${RANKS[startR]}-${RANKS[startR + 1]}-${RANKS[topR]}♥!`;
        }
      }
    } else if (charId === 'arlecchino') {
      this.arlecchinoBondOwnerId = player.id;
      skillSummary = `🩸 [Khế Ước Sinh Mệnh] ${player.name} khắc dấu Huyết Nguyệt: Trong vòng này, bất kỳ đối thủ nào bấm BỎ LƯỢT sẽ lập tức bị nhét 1 lá bài rác nhỏ nhất từ tay ${player.name} và nộp phạt ${(
        b * 2
      ).toLocaleString()} Xu!`;
    } else if (charId === 'ineffa') {
      const resonanceRanks = new Set();
      if (preferredCardIds && preferredCardIds.length > 0) {
        player.hand.forEach((c) => {
          if (preferredCardIds.includes(c.id)) resonanceRanks.add(c.rankIndex);
        });
      }
      if (resonanceRanks.size === 0) {
        const mySortedDesc = [...sortCardsAsc(player.hand)].reverse();
        for (const c of mySortedDesc) {
          if (c.rankIndex <= 11) {
            resonanceRanks.add(c.rankIndex);
            if (resonanceRanks.size >= 3) break;
          }
        }
      }
      const shockedLogs = [];
      activeOpponents.forEach((opp) => {
        if (opp.hand.length === 0) return;
        let matchedCards = opp.hand.filter((c) => resonanceRanks.has(c.rankIndex));
        if (matchedCards.length === 0) {
          const oppNormals = sortCardsAsc(opp.hand).filter((c) => c.rankIndex <= 11);
          const fallback = oppNormals.length > 0 ? oppNormals[oppNormals.length - 1] : sortCardsAsc(opp.hand)[opp.hand.length - 1];
          if (fallback) matchedCards = [fallback];
        }
        const zapped = matchedCards.slice(0, 2);
        const oppZapStr = [];
        zapped.forEach((c, idx) => {
          const oldStr = `${c.rank}${c.suit}`;
          const newR = idx % 2; // 3 hoặc 4
          c.rankIndex = newR;
          c.rank = RANKS[newR];
          c.suitIndex = 0;
          c.suit = '♠';
          c.isRed = false;
          c.value = newR * 4;
          c.id = `${c.rank}♠_ineffa_${Date.now()}_${opp.id}_${idx}`;
          oppZapStr.push(`${oldStr}➔${c.rank}♠`);
        });
        opp.hand = sortHandByMode(opp.hand, opp.id === this.mySeatId ? this.sortMode : 'asc');
        if (oppZapStr.length > 0) {
          shockedLogs.push(`${opp.name} (${oppZapStr.join(', ')})`);
        }
      });
      skillSummary = `🤖 [Xung Điện Cộng Hưởng] ${player.name} phát xung điện cao thế xuyên qua bàn bài, làm chập mạch các lá trùng số của đối thủ biến thành phế liệu 3♠/4♠ (${shockedLogs.join(' • ')})!`;
    } else if (charId === 'flins') {
      this.flinsLanternOwnerId = player.id;
      skillSummary = `🏮 [Ngọn Đèn Đêm Cướp Cái] ${player.name} thắp sáng Ngọn Đèn Ratniki: Trong vòng này, ngay khoảnh khắc có BẤT KỲ đối thủ nào bấm BỎ LƯỢT, vòng đấu lập tức kết thúc và ${player.name} CƯỚP QUYỀN CẦM CÁI mở vòng mới ngay!`;
    }

    // Lưu lại các lá bài vừa được Kỹ Năng tạo ra / nâng cấp để Bot ưu tiên đánh ngay sau khi hết Hoạt Ảnh Nộ,
    // đồng thời khôi phục nguyên vẹn lựa chọn bài trên tay của người chơi thật!
    const createdBySkillIds = Array.from(this.selectedCardIds);
    if (createdBySkillIds.length > 0) {
      player._skillBoostedCardIds = createdBySkillIds;
      const comboFromSkill = classifyCombo(player.hand.filter((c) => createdBySkillIds.includes(c.id)));
      if (
        comboFromSkill &&
        (!this.currentCombo || canBeatCombo(comboFromSkill, this.currentCombo).ok) &&
        [
          'vodyanitsa',
          'escoffier',
          'linnea',
          'nefer',
          'sandrone',
          'chasca',
          'tartaglia',
          'varka',
          'xianyun',
          'nilou',
          'wriothesley',
          'durin',
          'albedo',
          'mavuika',
          'navia',
          'odette',
        ].includes(charId)
      ) {
        player._skillForcedComboIds = createdBySkillIds;
      }
    }
    if (player.id !== this.mySeatId) {
      this.selectedCardIds = savedHumanSelectedIds;
      this.companionCardIds = savedHumanCompanionIds;
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
    this.showComboBanner(`🔮 KỸ NĂNG ${sk.charName.toUpperCase()}: ${sk.name.toUpperCase()}!`, rx ? rx.cssClass : 'chop-banner');
    this.addLog(`🔮 <strong>${skillSummary}</strong>`, 'log-win');

    this.updateArenaBackdropCharacters();
    this.renderRoundSkillStatusBar();
    this.renderAll();
    if (!this.tutorialCompleted && this.tutorialStep === 5 && player.id === this.mySeatId) {
      this.tutorialMatch2SkillUsed = true;
      this.tutorialMatch2LeadPlayed = false;
      // Sau khi dùng Chiêu Nộ [Q] Tịnh Thổ Cắt Vòng (bàn đang trống, lúc mở lượt chưa tính Phản Ứng Nguyên Tố),
      // tự động chọn sẵn Sám Cô 4-4-4 để người chơi mở vòng (thấy rõ bàn trống không nổ phản ứng) và nhử Bot Furina đè bằng Sám Cô 7!
      const triple4 = player.hand.filter((c) => c.rank === '4');
      if (triple4.length === 3) {
        this.selectedCardIds = new Set(triple4.map((c) => c.id));
        this.renderHumanHand();
        this.updateControls();
      }
      setTimeout(() => {
        this.renderTravelerGuide();
      }, 600);
    }
    setTimeout(() => {
      this.saveActiveMatchSnapshot();
    }, 350);
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    return true;
  }

  getRoundSkillTacticalAssessment(bot) {
    const activeOpponents = this.players.filter(
      (p) => p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0
    );
    const minOppCards =
      activeOpponents.length > 0 ? Math.min(...activeOpponents.map((p) => p.hand.length)) : 99;
    const ownerPlayer = this.trickOwnerId !== null ? this.players[this.trickOwnerId] : null;
    const ownerCards = ownerPlayer && ownerPlayer.id !== bot.id ? ownerPlayer.hand.length : 99;

    const oppActivatedInSet = Array.from(this.roundSkillActivatedSeatIds || []).some(
      (sid) => sid !== bot.id
    );
    const hasOppRoundEffect =
      (this.ittoUshiOwnerId !== null && this.ittoUshiOwnerId !== bot.id) ||
      (this.kinichBombOwnerId !== null && this.kinichBombOwnerId !== bot.id) ||
      (this.citlaliPillowOwnerId !== null && this.citlaliPillowOwnerId !== bot.id) ||
      (this.hutaoTaxOwnerId !== null && this.hutaoTaxOwnerId !== bot.id) ||
      (this.sigewinneCareOwnerId !== null && this.sigewinneCareOwnerId !== bot.id) ||
      (this.vesnaSpringOwnerId !== null && this.vesnaSpringOwnerId !== bot.id) ||
      (this.xiaoKarmaOwnerId !== null && this.xiaoKarmaOwnerId !== bot.id) ||
      (this.emiliePerfumeOwnerId !== null && this.emiliePerfumeOwnerId !== bot.id) ||
      (this.alhaithamOwnerId !== null && this.alhaithamOwnerId !== bot.id) ||
      (this.zibaiMinStepOwnerId !== null && this.zibaiMinStepOwnerId !== bot.id) ||
      (this.yelanParityOwnerId !== null && this.yelanParityOwnerId !== bot.id) ||
      (this.cynoRoyalBanOwnerId !== null && this.cynoRoyalBanOwnerId !== bot.id) ||
      (this.wriothesleyNoSingleOwnerId !== null && this.wriothesleyNoSingleOwnerId !== bot.id) ||
      (this.baizhuShieldOwnerId !== null && this.baizhuShieldOwnerId !== bot.id) ||
      (this.arlecchinoBondOwnerId !== null && this.arlecchinoBondOwnerId !== bot.id) ||
      (this.flinsLanternOwnerId !== null && this.flinsLanternOwnerId !== bot.id) ||
      this.furinaReverseSuitRound ||
      this.kokomiReverseRankRound ||
      this.shenheSingleOnlyRound ||
      this.yaeForcePlayRound ||
      this.nicoleSuitOnlyRound ||
      (this.zhongliPetrifiedCardIds && this.zhongliPetrifiedCardIds.size > 0);

    const oppSkillActiveInRound = oppActivatedInSet || hasOppRoundEffect;

    // Kiểm tra nếu đánh bài trong vòng này sẽ gặp bất lợi trực tiếp (dẫm bẫy / nộp phạt / mất cái)
    const playTriggersHardTrap =
      (this.ittoUshiOwnerId !== null && this.ittoUshiOwnerId !== bot.id) ||
      (this.kinichBombOwnerId !== null &&
        this.kinichBombOwnerId !== bot.id &&
        this.trickOwnerId === this.kinichBombOwnerId) ||
      (this.citlaliPillowOwnerId !== null &&
        this.citlaliPillowTargetId === bot.id &&
        this.trickOwnerId === this.citlaliPillowOwnerId) ||
      (this.hutaoTaxOwnerId !== null && this.hutaoTaxOwnerId !== bot.id) ||
      (this.sigewinneCareOwnerId !== null && this.sigewinneCareOwnerId !== bot.id);

    // Kiểm tra nếu bỏ lượt sẽ chịu phạt nặng
    const passHasDirectDisadvantage =
      this.yaeForcePlayRound ||
      (this.arlecchinoBondOwnerId !== null && this.arlecchinoBondOwnerId !== bot.id) ||
      (this.flinsLanternOwnerId !== null && this.flinsLanternOwnerId !== bot.id);

    // Đối phương sắp thắng (<= 3 lá): buộc phải đánh hoặc tung kỹ năng chặn!
    const isOpponentAboutToWin = ownerCards <= 3 || minOppCards <= 3;

    return {
      oppSkillActiveInRound,
      playTriggersHardTrap,
      passHasDirectDisadvantage,
      isOpponentAboutToWin,
      ownerCards,
      minOppCards,
    };
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
    const tac = this.getRoundSkillTacticalAssessment(bot);

    // Tính trước nước đi dự kiến của Bot để KHÔNG BAO GIỜ tung kỹ năng hỗ trợ vòng rồi lại Bỏ Lượt!
    const plannedMove = !this.currentCombo
      ? this.chooseBotLeadMove(bot, validMoves)
      : this.chooseBotResponseMove(bot, validMoves);

    // ==========================================================================
    // STOCKFISH SKILL ENGINE: BẢO VỆ THẾ CHIẾU HẾT SẴN CÓ & TÌM ĐÒN NỘ CHIẾU HẾT NGAY LẬP TỨC!
    // ==========================================================================
    const beforeChess = this.evaluateChessPosition(bot, bot.hand, false);
    const hasLeadCheckmateNow = Boolean(this.findForcedCheckmateMoveFromLead(bot, bot.hand));
    const hasResponseCheckmateNow = Boolean(
      this.currentCombo &&
        plannedMove &&
        this.isMoveUnbeatableByOpponents(bot, plannedMove, true) &&
        (() => {
          const usedIds = new Set(plannedMove.cards.map((c) => c.id));
          const rem = bot.hand.filter((c) => !usedIds.has(c.id));
          return rem.length === 0 || Boolean(this.findForcedCheckmateMoveFromLead(bot, rem));
        })()
    );
    const alreadyHasCheckmate =
      (!this.currentCombo && hasLeadCheckmateNow) || hasResponseCheckmateNow;

    // 0. CHIẾN THUẬT NHỊN NỘ KHI NGƯỜI HOẶC BOT TRƯỚC ĐÃ BẬT KỸ NĂNG TRONG VÒNG NÀY:
    // Nếu đối thủ trước trong vòng đã kích hoạt kỹ năng mà đối phương chưa sắp thắng (`!tac.isOpponentAboutToWin`)
    // và Bot không có đòn dứt điểm ván đấu hay chặt Heo/Hàng ăn xu trực tiếp -> BỎ QUA không phung phí Kỹ Năng [Q]!
    if (tac.oppSkillActiveInRound && !tac.isOpponentAboutToWin && !alreadyHasCheckmate) {
      if (tac.playTriggersHardTrap) {
        return false;
      }
      const isDirectChopSkillOnTwoOrBomb =
        this.currentCombo &&
        (this.currentCombo.highRank === 12 || this.currentCombo.isBomb) &&
        ['navia', 'vodyanitsa'].includes(charId);
      const isCheckmateCutSkill =
        this.currentCombo &&
        (hasLeadCheckmateNow || (beforeChess.deficitToForcedWin === 0 && beforeChess.plan.totalTurns <= 2)) &&
        ['raiden', 'wriothesley'].includes(charId);
      if (!isDirectChopSkillOnTwoOrBomb && !isCheckmateCutSkill && !tac.passHasDirectDisadvantage) {
        return false;
      }
    }

    // 1. Nếu tay bài Bot ĐÃ CÓ SẴN THẾ CHIẾU HẾT 100% -> CẤM bật các kỹ năng tráo/đổi bài làm hỏng thế thắng!
    if (
      alreadyHasCheckmate &&
      ['skirk', 'wanderer', 'xilonen', 'kazuha', 'sigewinne', 'nilou', 'sandrone', 'chasca', 'tartaglia', 'neuvillette'].includes(charId)
    ) {
      return false;
    }

    // 2. Nếu đang phải đỡ bài mà trên tay đã có sẵn chuỗi Chiếu Hết khi cầm Cái (`hasLeadCheckmateNow` hoặc `deficitToForcedWin === 0`):
    // Bật ngay kỹ năng Cắt Vòng / Đấm Văng Bài Lẻ (`raiden`, `wriothesley`) để cướp Cái và Chiếu Hết bàn đấu!
    if (this.currentCombo && !alreadyHasCheckmate && (hasLeadCheckmateNow || (beforeChess.deficitToForcedWin === 0 && beforeChess.plan.totalTurns <= 3))) {
      if (
        charId === 'raiden' &&
        (this.currentCombo.type === COMBO_TYPES.SINGLE || this.currentCombo.type === COMBO_TYPES.PAIR) &&
        this.currentCombo.highRank <= 8 &&
        !this.currentCombo.isBomb
      ) {
        return this.useCharacterSkill(bot, []);
      }
      if (
        charId === 'wriothesley' &&
        this.currentCombo.type === COMBO_TYPES.SINGLE &&
        this.currentCombo.highRank < 12 &&
        !this.currentCombo.isBomb
      ) {
        return this.useCharacterSkill(bot, []);
      }
    }

    let shouldCast = false;
    let preferredIds = [];

    if (charId === 'raiden') {
      // Cắt vòng khi trên bàn là Lẻ/Đôi <= J mà Bot không muốn/không thể đỡ (hoặc phải tốn Heo/xé bộ mới đỡ được), hoặc khi cần cướp cái mở vòng mới
      const wouldSpendTwo = plannedMove && plannedMove.highRank === 12;
      const expensiveBreak = plannedMove && this.evaluateMoveBreakCost(plannedMove, struct) >= 70;
      if (
        this.currentCombo &&
        (this.currentCombo.type === COMBO_TYPES.SINGLE || this.currentCombo.type === COMBO_TYPES.PAIR) &&
        this.currentCombo.highRank <= 8 &&
        !this.currentCombo.isBomb &&
        (!plannedMove || wouldSpendTwo || expensiveBreak || bot.hand.length <= 7 || minOppCards <= 6)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'eula') {
      // Chế độ 1: Trên bàn có bộ bài thường (5..A) mà Bot không đỡ được (hoặc phải tốn bài lớn >= K / xé bộ),
      // nhưng sau khi Eula chém giảm 2 bậc thì Bot có bài thường đỡ được ngay!
      if (this.currentCombo && this.currentCombo.highRank >= 2 && this.currentCombo.highRank < 12 && !this.currentCombo.isBomb) {
        const hasCheapNormalNow =
          plannedMove &&
          plannedMove.highRank < 10 &&
          !plannedMove.isBomb &&
          this.evaluateMoveBreakCost(plannedMove, struct) < 75;
        if (!hasCheapNormalNow) {
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
      } else if (!this.currentCombo && plannedMove && !plannedMove.isBomb && plannedMove.highRank >= 4 && plannedMove.highRank <= 9) {
        // Chế độ 2: Khi Bot mở vòng mới bằng bộ bài tầm trung (>= 2 lá hoặc gần cuối ván) -> Cường hóa +2 bậc khó đỡ!
        if (
          (plannedMove.type !== COMBO_TYPES.SINGLE && (bot.hand.length <= 8 || minOppCards <= 7)) ||
          (bot.hand.length <= 5 || minOppCards <= 5)
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'mavuika') {
      const prevWrap = activeMavuikaWrapStraight;
      activeMavuikaWrapStraight = true;
      const wrapMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
        (m) => m.isMavuikaWrapStraight && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
      );
      activeMavuikaWrapStraight = prevWrap;
      if (wrapMoves.length > 0) {
        const canInstantWinWrap = wrapMoves.some((m) => m.length === bot.hand.length);
        const needWrapToBeatStraight =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 70);
        const goodLeadWrap =
          !this.currentCombo && (bot.hand.length <= 9 || minOppCards <= 7);
        if (canInstantWinWrap || needWrapToBeatStraight || goodLeadWrap) {
          shouldCast = true;
        }
      }
    } else if (charId === 'skirk') {
      const hasTwos = rankCounts[12] > 0;
      const hasBombs = struct.bombRanks.size > 0;
      const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
      if (!hasBombs && (!hasTwos || minOppCards <= 4) && bot.hand.length >= 2) {
        if (
          (!plannedMove && this.currentCombo && minOppCards <= 7) ||
          (lowCardsCount >= Math.ceil(bot.hand.length * 0.55) && bot.hand.length <= 9) ||
          minOppCards <= 4
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'furina') {
      // TH1: Đang bị chặn bởi bài < 2, thử bật đảo ngược chất (♠ > ♣ > ♦ > ♥) xem có tạo ra nước đè đồng số không!
      if (
        this.currentCombo &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 75) &&
        this.currentCombo.highRank < 12 &&
        !this.currentCombo.isBomb
      ) {
        const prevRev = activeFurinaReverseSuit;
        activeFurinaReverseSuit = true;
        const movesWithReverse = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false);
        const reverseChoice = this.chooseBotResponseMove(bot, movesWithReverse);
        activeFurinaReverseSuit = prevRev;
        if (reverseChoice && reverseChoice.highRank < 12) {
          shouldCast = true;
        }
      }
      // TH2: Bot chuẩn bị đánh bài Lẻ khá-cao (9..A) -> Bật Furina để CẤM đối thủ đập Heo lẻ!
      if (
        !shouldCast &&
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.type === COMBO_TYPES.SINGLE &&
        plannedMove.highRank >= 6 &&
        plannedMove.highRank <= 11 &&
        (minOppCards <= 7 || bot.hand.length <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yaemiko') {
      // Hồ Ly Dụ Hoặc: Ép đối thủ phải đánh bài (rất lợi khi Bot đang ôm Hàng rình chặt Heo, hoặc đánh bộ bài mạnh ép đối thủ xé bộ)
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.highRank >= 6 &&
        plannedMove.highRank <= 11 &&
        (struct.bombRanks.size > 0 || plannedMove.length >= 2 || minOppCards <= 7 || bot.hand.length <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'hutao') {
      // Yểm Bùa Vãng Sinh: Chỉ bật khi Bot đánh bộ bài có sức ép cao (Bộ >= 2 lá hoặc bài >= 9) khiến đối thủ dễ phải Bỏ Lượt chịu phạt!
      const minRequiredUnpassed = Math.min(2, activeOpponents.length);
      if (
        plannedMove &&
        unpassedOpps.length >= minRequiredUnpassed &&
        !plannedMove.isBomb &&
        (plannedMove.length >= 2 || (plannedMove.highRank >= 6 && plannedMove.highRank <= 11)) &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ayaka') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        plannedMove.highRank >= 5 &&
        plannedMove.highRank < 12 &&
        (minOppCards <= 7 || bot.hand.length <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'clorinde') {
      if (
        plannedMove &&
        unpassedOpps.length >= Math.min(2, activeOpponents.length) &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 7) &&
        (bot.hand.length <= 8 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yelan') {
      // Sòng Bạc Dạ Lan: Thấu thị 2 lá đối thủ và khóa vòng cùng Chẵn/Lẻ
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 5) &&
        (minOppCards <= 7 || bot.hand.length <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'navia') {
      if (this.currentCombo && this.trickOwnerId !== bot.id) {
        const prevFlush = activeNaviaFlushStraight;
        activeNaviaFlushStraight = true;
        const phomMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) =>
            (m.type === COMBO_TYPES.TRIPLE || (m.type === COMBO_TYPES.STRAIGHT && m.isSameSuitStraight)) &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeNaviaFlushStraight = prevFlush;
        if (phomMoves.length > 0) {
          const canInstantWinPhom = phomMoves.some((m) => m.length === bot.hand.length);
          const isChoppingTwoOrBomb = this.currentCombo.highRank === 12 || this.currentCombo.isBomb;
          const needPhomToDefend =
            (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 65) &&
            (this.currentCombo.highRank >= 6 ||
              this.currentCombo.length >= 2 ||
              minOppCards <= 6 ||
              bot.hand.length <= 7);
          if (canInstantWinPhom || isChoppingTwoOrBomb || needPhomToDefend) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'shenhe') {
      const wouldSpendTwoCombo = plannedMove && plannedMove.highRank === 12;
      const expensiveCombo = plannedMove && this.evaluateMoveBreakCost(plannedMove, struct) >= 75;
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.type !== COMBO_TYPES.SINGLE &&
        (!plannedMove || wouldSpendTwoCombo || expensiveCombo)
      ) {
        const lowestOnTable = sortCardsAsc(this.currentCombo.cards)[0];
        const fakeSingle = classifyCombo([lowestOnTable]);
        const singleMoves = getValidMoves(bot.hand, fakeSingle, this.mustPlay3Spade, false).filter(
          (m) =>
            !m.isBomb &&
            !m.cards.some((c) => struct.bombRanks.has(c.rankIndex)) &&
            (m.highRank < 12 || minOppCards <= 6)
        );
        if (singleMoves.length > 0) {
          shouldCast = true;
        }
      }
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
        (minOppCards <= 7 || (bot.hand.length <= 8 && isolatedSingleCount >= 2 && plannedMove.highRank >= 5))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ganyu') {
      const needHelpAgainstStraight =
        this.currentCombo &&
        this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
        (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75);
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
            (m) => m.length === bot.hand.length || this.evaluateMoveBreakCost(m, struct) <= 55
          )
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'kokomi') {
      if (
        this.currentCombo &&
        this.currentCombo.highRank >= 6 &&
        this.currentCombo.highRank < 12 &&
        !this.currentCombo.isBomb &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 75)
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
      const lowBossCards = bot.hand.filter((c) => c.rankIndex <= 4).length;
      if (
        !shouldCast &&
        !this.currentCombo &&
        plannedMove &&
        plannedMove.highRank <= 4 &&
        !plannedMove.isBomb &&
        lowBossCards >= 2 &&
        (bot.hand.length <= 10 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'yoimiya') {
      if (
        plannedMove &&
        (plannedMove.type === COMBO_TYPES.SINGLE || plannedMove.type === COMBO_TYPES.PAIR) &&
        plannedMove.highRank < 11
      ) {
        const hasNextRank = bot.hand.some((c) => c.rankIndex === plannedMove.highRank + 1);
        if (hasNextRank) {
          shouldCast = true;
        }
      }
    } else if (charId === 'xilonen') {
      if (activeOpponents.length >= 2) {
        if ((!this.currentCombo || plannedMove) && (minOppCards <= 7 || bot.hand.length <= 8)) {
          shouldCast = true;
        }
      } else if (activeOpponents.length === 1) {
        const hasTwos = rankCounts[12] > 0;
        const hasBombs = struct.bombRanks.size > 0;
        const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
        if (!hasBombs && (!hasTwos || minOppCards <= 5) && bot.hand.length >= 2) {
          if (
            minOppCards <= 6 ||
            (!plannedMove && this.currentCombo) ||
            lowCardsCount >= Math.ceil(bot.hand.length * 0.45)
          ) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'citlali') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - plannedMove.length >= 1 &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'mualani') {
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
            (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 75) &&
            crossMoves.some(
              (m) =>
                this.evaluateMoveBreakCost(m, struct) <= 55 ||
                bot.hand.length <= 7 ||
                minOppCards <= 6
            );
          const canDumpLongComboEndgame =
            bot.hand.length <= 8 &&
            crossMoves.some((m) => m.length >= 2 && this.evaluateMoveBreakCost(m, struct) === 0);
          if (canInstantWinCross || needCrossToBeat || canDumpLongComboEndgame) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'varesa') {
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 75)
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
                minOppCards <= 6 ||
                bot.hand.length <= 7
            )
          ) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'escoffier') {
      const pairRunSetup = this.findEscoffierPairRunSetup(bot.hand);
      if (
        pairRunSetup &&
        pairRunSetup.trashCard &&
        (!this.currentCombo ||
          plannedMove ||
          this.currentCombo.highRank === 12 ||
          this.currentCombo.type === COMBO_TYPES.THREE_PAIRS)
      ) {
        shouldCast = true;
        preferredIds = [pairRunSetup.trashCard.id];
      }
    } else if (charId === 'zibai') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 6) &&
        (bot.hand.length <= 8 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'linnea') {
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
        if (
          !bestTarget &&
          (!this.currentCombo || (plannedMove && !plannedMove.cards.some((pc) => pc.id === lowest.id))) &&
          (bot.hand.length <= 9 || minOppCards <= 7)
        ) {
          bestTarget = [...singleNormals]
            .reverse()
            .find((c) => c.id !== lowest.id && !struct.criticalStraightRanks.has(c.rankIndex));
        }
        if (bestTarget && lowest.rankIndex <= 9) {
          shouldCast = true;
          preferredIds = [bestTarget.id];
        }
      }
    } else if (charId === 'nefer') {
      const pairRanks = [];
      for (let r = 0; r <= 11; r++) {
        if (struct.rankCounts[r] === 2 && !struct.bombRanks.has(r)) pairRanks.push(r);
      }
      const lowestPairRank = pairRanks.length > 0 ? pairRanks[0] : -1;
      const trashSingle = sortCardsAsc(bot.hand).find(
        (c) =>
          c.rankIndex <= 9 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      );
      if (lowestPairRank >= 0 && trashSingle) {
        const canBeatTableTriple =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.TRIPLE &&
          !plannedMove &&
          lowestPairRank > this.currentCombo.highRank;
        const canUpgradeWhenLeadingOrSafe =
          (!this.currentCombo ||
            (plannedMove &&
              !plannedMove.cards.some(
                (pc) => pc.id === trashSingle.id || pc.rankIndex === lowestPairRank
              ))) &&
          (bot.hand.length <= 9 || minOppCards <= 7);
        if (canBeatTableTriple || canUpgradeWhenLeadingOrSafe) {
          shouldCast = true;
        }
      }
    } else if (charId === 'sandrone') {
      const isolatedSingles = sortCardsAsc(bot.hand).filter(
        (c) =>
          c.rankIndex <= 11 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      );
      if (isolatedSingles.length >= 3) {
        const picked3 = isolatedSingles.slice(0, 3);
        const topRank = Math.max(2, Math.min(11, picked3[2].rankIndex));
        const forgedHighVal = topRank * 4 + 3;
        const canBeatTable3Straight =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
          this.currentCombo.length === 3 &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75) &&
          forgedHighVal > this.currentCombo.highValue;
        const canForgeLeadCombo =
          !this.currentCombo ||
          (plannedMove && !plannedMove.cards.some((pc) => picked3.some((p3) => p3.id === pc.id)));
        if (canBeatTable3Straight || canForgeLeadCombo) {
          shouldCast = true;
        }
      }
    } else if (charId === 'lauma') {
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12) {
        if (
          this.currentCombo.length === 1 &&
          this.currentCombo.highRank >= 5 &&
          (!plannedMove || plannedMove.highRank === 12 || minOppCards <= 7)
        ) {
          const fake3 = classifyCombo([{ id: '3-spade', rank: '3', suit: 'spade', rankIndex: 0, suitIndex: 0, value: 0 }]);
          const afterMoves = getValidMoves(bot.hand, fake3, this.mustPlay3Spade, false).filter(
            (m) => m.highRank < 12 && !m.isBomb
          );
          if (afterMoves.length > 0) shouldCast = true;
        } else if (this.currentCombo.length >= 2 && this.currentCombo.highRank >= 4 && !plannedMove) {
          const loweredRank = Math.max(0, this.currentCombo.highRank - 2);
          const fakeLower = {
            ...this.currentCombo,
            highRank: loweredRank,
            highValue: loweredRank * 4 + (this.currentCombo.highCard?.suitIndex || 0),
          };
          const afterMoves = getValidMoves(bot.hand, fakeLower, this.mustPlay3Spade, false).filter(
            (m) => m.highRank < 12 && !m.isBomb && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
          );
          if (afterMoves.length > 0) shouldCast = true;
        }
      } else if (!this.currentCombo && (bot.hand.length <= 8 || minOppCards <= 7)) {
        shouldCast = true;
      }
    } else if (charId === 'vesna') {
      if ((!this.currentCombo || plannedMove) && (bot.hand.length <= 8 || minOppCards <= 7)) {
        shouldCast = true;
      }
    } else if (charId === 'columbina') {
      if (bot.hand.length >= 2 && (!this.currentCombo || plannedMove)) {
        const canCheckmateOnExtraTurn = validMoves.some((m) => {
          const usedIds = new Set(m.cards.map((c) => c.id));
          const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
          return (
            remHand.length > 0 &&
            (Boolean(classifyCombo(remHand)) || Boolean(this.findForcedCheckmateMoveFromLead(bot, remHand)))
          );
        });
        if (canCheckmateOnExtraTurn || bot.hand.length <= 8 || minOppCards <= 6) {
          shouldCast = true;
        }
      }
    } else if (charId === 'odette') {
      const lowMirrorCards = sortCardsAsc(bot.hand)
        .filter((c) => c.rankIndex <= 5 && !struct.bombRanks.has(c.rankIndex))
        .slice(0, 3);
      if (lowMirrorCards.length >= 1) {
        const mirrorIds = new Set(lowMirrorCards.map((c) => c.id));
        const safeMirror =
          !this.currentCombo ||
          !plannedMove ||
          !plannedMove.cards.some((pc) => mirrorIds.has(pc.id));
        if (safeMirror && (lowMirrorCards.length >= 2 || bot.hand.length <= 7 || minOppCards <= 6)) {
          shouldCast = true;
        }
      }
    } else if (charId === 'vodyanitsa') {
      // Gương Nước Phản Chiếu: Đổi ngẫu nhiên các lá bài trên tay thành bộ bài VỪA ĐỦ chặt/đè bộ bài trên bàn!
      if (this.currentCombo) {
        const plan = this.findVodyanitsaMinimalBeatSpec(bot.hand, this.currentCombo, bot.id);
        if (plan) {
          const isChoppingTwoOrBomb = this.currentCombo.highRank === 12 || this.currentCombo.isBomb;
          const needHelp =
            !plannedMove ||
            plannedMove.highRank === 12 ||
            this.evaluateMoveBreakCost(plannedMove, struct) >= 65 ||
            minOppCards <= 6 ||
            bot.hand.length <= 7;
          if (isChoppingTwoOrBomb || needHelp) {
            shouldCast = true;
          }
        }
      }
    } else if (charId === 'lohen') {
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank < 12 &&
        this.trickOwnerId !== null &&
        this.trickOwnerId !== bot.id
      ) {
        const isStrongTablePlay =
          this.currentCombo.highRank >= 5 ||
          this.currentCombo.length >= 2 ||
          minOppCards <= 6;
        const needDefense =
          !plannedMove ||
          plannedMove.highRank === 12 ||
          this.evaluateMoveBreakCost(plannedMove, struct) >= 70 ||
          minOppCards <= 5;
        if (isStrongTablePlay && needDefense) {
          shouldCast = true;
        }
      }
    } else if (charId === 'durin') {
      const sortedDesc = [...sortCardsAsc(bot.hand)].reverse();
      const highCand =
        sortedDesc.find((c) => c.rankIndex < 12 && !struct.bombRanks.has(c.rankIndex)) ||
        sortedDesc.find((c) => c.rankIndex < 12);
      if (highCand) {
        const canCutSingleWith2Heart =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.SINGLE &&
          this.currentCombo.highValue < 51 &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75 || this.currentCombo.highRank >= 8);
        const canFormPairOfTwos =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.PAIR &&
          this.currentCombo.highValue < 51 &&
          rankCounts[12] >= 1 &&
          (!plannedMove || this.currentCombo.highRank >= 8);
        const goodMidEndgameUpgrade =
          !this.currentCombo && (bot.hand.length <= 7 || minOppCards <= 6);
        if (canCutSingleWith2Heart || canFormPairOfTwos || goodMidEndgameUpgrade) {
          shouldCast = true;
          preferredIds = [highCand.id];
        }
      }
    } else if (charId === 'xiao') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (minOppCards <= 7 || (bot.hand.length <= 8 && plannedMove.highRank >= 5))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'kinich') {
      // Gài bẫy Bom Dây Móc: chỉ gài khi Bot CHẮC CHẮN ĐÁNH một bộ bài mồi vừa phải (<= J) để dụ đối thủ đè và nổ bom!
      const moveLen = plannedMove ? plannedMove.length : 1;
      const isBaitableMove =
        plannedMove &&
        !plannedMove.isBomb &&
        plannedMove.highRank >= 2 &&
        plannedMove.highRank <= 9;
      if (
        isBaitableMove &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - moveLen >= 2 &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'venti') {
      const nonBombCards = sortCardsAsc(bot.hand).filter((c) => !struct.bombRanks.has(c.rankIndex));
      const lowestNonBomb = nonBombCards[0];
      if (lowestNonBomb && lowestNonBomb.rankIndex <= 8) {
        const canBeatSingleWithWind =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.SINGLE &&
          this.currentCombo.highRank <= 10 &&
          (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 75);
        const canBeatPairWithWind =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.PAIR &&
          this.currentCombo.highRank <= 10 &&
          (!plannedMove || plannedMove.highRank === 12) &&
          rankCounts[this.currentCombo.highRank + 1] >= 1;
        const canUpgradeTrashOnLead =
          !this.currentCombo &&
          lowestNonBomb.rankIndex <= 5 &&
          struct.rankCounts[lowestNonBomb.rankIndex] === 1 &&
          (bot.hand.length <= 8 || minOppCards <= 7);
        if (canBeatSingleWithWind || canBeatPairWithWind || canUpgradeTrashOnLead) {
          shouldCast = true;
        }
      }
    } else if (charId === 'wanderer') {
      const canWinNow = plannedMove && plannedMove.length === bot.hand.length;
      const hasBombs = struct.bombRanks.size > 0;
      const twosCount = rankCounts[12];
      const lowCardsCount = bot.hand.filter((c) => c.rankIndex <= 6).length;
      if (!canWinNow && !hasBombs && bot.hand.length >= 4) {
        const emergencyStopOpponent = minOppCards <= 3 && twosCount <= 1 && bot.hand.length >= minOppCards + 2;
        const terribleHandBailout =
          twosCount === 0 &&
          lowCardsCount >= Math.ceil(bot.hand.length * 0.55) &&
          ((!plannedMove && this.currentCombo && minOppCards <= 7) || minOppCards <= 5);
        if (emergencyStopOpponent || terribleHandBailout) {
          shouldCast = true;
        }
      }
    } else if (charId === 'klee') {
      if (plannedMove && unpassedOpps.length >= 1 && (minOppCards <= 7 || bot.hand.length <= 8)) {
        shouldCast = true;
      }
    } else if (charId === 'albedo') {
      const lowestNonBomb = sortCardsAsc(bot.hand).find(
        (c) => c.rankIndex <= 7 && struct.rankCounts[c.rankIndex] === 1 && !struct.bombRanks.has(c.rankIndex)
      );
      const bestGrave =
        this.matchGraveyardCards && this.matchGraveyardCards.length > 0
          ? [...this.matchGraveyardCards].sort((a, b) => b.value - a.value)[0]
          : { rankIndex: 11, suitIndex: 2, value: 46 };
      if (lowestNonBomb && bestGrave && bestGrave.rankIndex >= 9) {
        const canBeatSingleWithClone =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.SINGLE &&
          !plannedMove &&
          bestGrave.value > this.currentCombo.highValue;
        const canUpgradeWhenLeading =
          !this.currentCombo && (bot.hand.length <= 8 || minOppCards <= 7);
        if (canBeatSingleWithClone || canUpgradeWhenLeading) {
          shouldCast = true;
        }
      }
    } else if (charId === 'varka') {
      if (
        this.currentCombo &&
        this.currentCombo.type === COMBO_TYPES.SINGLE &&
        !this.currentCombo.isBomb &&
        bot.hand.length >= 2 &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 70)
      ) {
        const prevVarka = activeVarkaSumSlash;
        activeVarkaSumSlash = true;
        const varkaMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) => m.isVarkaSumSlash && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeVarkaSumSlash = prevVarka;
        if (varkaMoves.length > 0) {
          shouldCast = true;
        }
      } else if (!this.currentCombo && bot.hand.length === 2 && bot.hand[0].rankIndex !== bot.hand[1].rankIndex) {
        shouldCast = true;
      }
    } else if (charId === 'nicole') {
      if (this.currentCombo && !this.currentCombo.isBomb && this.currentCombo.highRank < 12 && (!plannedMove || plannedMove.highRank === 12)) {
        const prevNic = activeNicoleSuitOnlyRound;
        activeNicoleSuitOnlyRound = true;
        const nicMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) => m.highRank < 12 && !m.isBomb && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeNicoleSuitOnlyRound = prevNic;
        if (nicMoves.length > 0) shouldCast = true;
      } else if (plannedMove && plannedMove.highCard?.suitIndex === 3 && (bot.hand.length <= 8 || minOppCards <= 7)) {
        shouldCast = true;
      }
    } else if (charId === 'zhongli') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 6) &&
        (minOppCards <= 7 || bot.hand.length <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'baizhu') {
      if (
        plannedMove &&
        (plannedMove.highRank === 12 || plannedMove.isBomb || (bot.passed && this.currentCombo !== null))
      ) {
        shouldCast = true;
      }
    } else if (charId === 'xianyun') {
      const needStepStraight =
        !this.currentCombo ||
        (this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75));
      if (needStepStraight && bot.hand.length >= 3) {
        const prevStep = activeXianyunStepStraight;
        activeXianyunStepStraight = true;
        const stepMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, false).filter(
          (m) => m.isStepStraight && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeXianyunStepStraight = prevStep;
        if (
          stepMoves.length > 0 &&
          (this.currentCombo ||
            stepMoves.some((m) => m.length === bot.hand.length || this.evaluateMoveBreakCost(m, struct) <= 55))
        ) {
          shouldCast = true;
        }
      }
    } else if (charId === 'kazuha') {
      const isolatedCount = bot.hand.filter(
        (c) =>
          c.rankIndex <= 9 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      ).length;
      if (
        !this.currentCombo &&
        isolatedCount >= 2 &&
        (bot.hand.length <= 9 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'itto') {
      // Gài bẫy Đấu Trường Arataki: chỉ bật khi đánh bài mồi vừa phải (<= J) để dụ đối thủ đè bài và phạt gấp 3!
      if (
        plannedMove &&
        !plannedMove.isBomb &&
        plannedMove.highRank >= 2 &&
        plannedMove.highRank <= 9 &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - plannedMove.length >= 1 &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ayato') {
      if (
        plannedMove &&
        !plannedMove.isBomb &&
        plannedMove.highRank >= 4 &&
        plannedMove.highRank <= 9 &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - plannedMove.length >= 1 &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'cyno') {
      // Thiết Quân Luật Mahamatra: Cấm đối thủ đánh J, Q, K, A, 2 (chỉ cho đánh 3..10) & hạ bài lớn trên bàn xuống 9!
      let canDemoteAndBeat = false;
      if (
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.highRank >= 8 &&
        this.currentCombo.highRank <= 11 &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 70)
      ) {
        const demotedCombo = {
          ...this.currentCombo,
          highRank: 6,
          highValue: 6 * 4 + (this.currentCombo.highCard?.suitIndex || 0),
        };
        const prevBan = activeCynoRoyalBan;
        activeCynoRoyalBan = true;
        const cynoMoves = getValidMoves(bot.hand, demotedCombo, this.mustPlay3Spade, false).filter(
          (m) => m.highRank <= 7 && !m.isBomb && !m.cards.some((c) => struct.bombRanks.has(c.rankIndex))
        );
        activeCynoRoyalBan = prevBan;
        if (cynoMoves.length > 0) canDemoteAndBeat = true;
      }
      const canLockOpponents =
        plannedMove &&
        plannedMove.highRank <= 7 &&
        unpassedOpps.length >= 1 &&
        (minOppCards <= 7 || bot.hand.length <= 8);
      if (canDemoteAndBeat || canLockOpponents) {
        shouldCast = true;
      }
    } else if (charId === 'nilou') {
      const upgradablePairRanks = [];
      for (let r = 0; r <= 10; r++) {
        if (struct.rankCounts[r] === 2 && !struct.bombRanks.has(r)) upgradablePairRanks.push(r);
      }
      if (upgradablePairRanks.length >= 1) {
        const highestUpgradedPairRank = upgradablePairRanks[upgradablePairRanks.length - 1] + 1;
        const canBeatTablePairAfterUpgrade =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.PAIR &&
          !plannedMove &&
          highestUpgradedPairRank * 4 + 3 > this.currentCombo.highValue;
        const canUpgradeOnLead =
          !this.currentCombo && (bot.hand.length <= 9 || minOppCards <= 8);
        if (canBeatTablePairAfterUpgrade || canUpgradeOnLead) {
          shouldCast = true;
        }
      }
    } else if (charId === 'nahida') {
      if (plannedMove && unpassedOpps.length >= 1 && (minOppCards <= 7 || bot.hand.length <= 8)) {
        shouldCast = true;
      }
    } else if (charId === 'alhaitham') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - plannedMove.length >= 1 &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 6) &&
        (bot.hand.length <= 8 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'neuvillette') {
      if (
        bot.hand.length > minOppCards &&
        (bot.hand.length - minOppCards >= 2 || minOppCards <= 5) &&
        (!this.currentCombo || plannedMove || minOppCards <= 4)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'wriothesley') {
      // Đấu Trường Ngục Tù: Cấm đối thủ đánh Lẻ (1 lá) & đấm văng lá Lẻ (< 2) trên bàn để cướp Cái!
      const multiCombos = generateAllCombosFromHand(bot.hand).filter((m) => m.length >= 2 && !m.isBomb);
      const canSmashSingleOnTable =
        multiCombos.length > 0 &&
        this.currentCombo &&
        !this.currentCombo.isBomb &&
        this.currentCombo.type === COMBO_TYPES.SINGLE &&
        this.currentCombo.highRank < 12 &&
        (!plannedMove || plannedMove.highRank === 12 || this.evaluateMoveBreakCost(plannedMove, struct) >= 65 || bot.hand.length <= 8 || minOppCards <= 7);
      const canLockNoSingleRound =
        plannedMove &&
        plannedMove.length >= 2 &&
        bot.hand.length >= 2 &&
        (bot.hand.length <= 8 || minOppCards <= 7);
      if (canSmashSingleOnTable || canLockNoSingleRound) {
        shouldCast = true;
      }
    } else if (charId === 'sigewinne') {
      // Trạm Y Tế Meropide: Chỉ bật khi Bot đang cầm cái (hoặc có nước đỡ chắc chắn mà không bị hỏng bởi nâng 3 lá thấp nhất)
      const low3Ids = new Set(
        sortCardsAsc(bot.hand)
          .filter((c) => c.rankIndex <= 9 && !struct.bombRanks.has(c.rankIndex))
          .slice(0, 3)
          .map((c) => c.id)
      );
      const safeToUpgrade3 =
        !this.currentCombo ||
        (plannedMove && !plannedMove.cards.some((pc) => low3Ids.has(pc.id)));
      if (safeToUpgrade3 && low3Ids.size >= 2 && (minOppCards <= 8 || bot.hand.length <= 9)) {
        shouldCast = true;
      }
    } else if (charId === 'emilie') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        !plannedMove.isBomb &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 5) &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'chasca') {
      const singleCand = sortCardsAsc(bot.hand).filter(
        (c) =>
          c.rankIndex <= 11 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      );
      const fallbackCand = sortCardsAsc(bot.hand).filter(
        (c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex)
      );
      const picked3 = (singleCand.length >= 3 ? singleCand : fallbackCand).slice(0, 3);
      if (picked3.length === 3) {
        const anchorRank = Math.max(2, Math.min(11, picked3[2].rankIndex));
        const forgedHighVal = anchorRank * 4 + 3;
        const canBeatTable3Straight =
          this.currentCombo &&
          this.currentCombo.type === COMBO_TYPES.STRAIGHT &&
          this.currentCombo.length === 3 &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75) &&
          forgedHighVal > this.currentCombo.highValue;
        const canForgeFromIsolatedOnLead =
          !this.currentCombo &&
          singleCand.length >= 3 &&
          (bot.hand.length <= 10 || minOppCards <= 8);
        if (canBeatTable3Straight || canForgeFromIsolatedOnLead) {
          shouldCast = true;
        }
      }
    } else if (charId === 'tartaglia') {
      const singleCand = sortCardsAsc(bot.hand).filter(
        (c) =>
          c.rankIndex <= 11 &&
          struct.rankCounts[c.rankIndex] === 1 &&
          !struct.bombRanks.has(c.rankIndex) &&
          !struct.criticalStraightRanks.has(c.rankIndex)
      );
      const fallbackCand = sortCardsAsc(bot.hand).filter(
        (c) => c.rankIndex <= 11 && !struct.bombRanks.has(c.rankIndex)
      );
      const picked3 = (singleCand.length >= 3 ? singleCand : fallbackCand).slice(0, 3);
      if (picked3.length === 3) {
        const targetRank = Math.max(2, Math.min(11, picked3[1].rankIndex));
        const forgedHighVal = targetRank * 4 + 3;
        const canBeatTableTripleOr3Straight =
          this.currentCombo &&
          (this.currentCombo.type === COMBO_TYPES.TRIPLE ||
            (this.currentCombo.type === COMBO_TYPES.STRAIGHT && this.currentCombo.length === 3)) &&
          (!plannedMove || this.evaluateMoveBreakCost(plannedMove, struct) >= 75) &&
          forgedHighVal > this.currentCombo.highValue;
        const canForgeFromIsolatedOnLead =
          !this.currentCombo &&
          singleCand.length >= 3 &&
          (bot.hand.length <= 9 || minOppCards <= 8);
        if (canBeatTableTripleOr3Straight || canForgeFromIsolatedOnLead) {
          shouldCast = true;
        }
      }
    } else if (charId === 'arlecchino') {
      // Gài Khế Ước Sinh Mệnh: chỉ bật khi đánh bài mồi tầm trung (<= J) để dụ đối thủ đè bài và chịu phạt 5x!
      if (
        plannedMove &&
        !plannedMove.isBomb &&
        plannedMove.highRank >= 4 &&
        plannedMove.highRank <= 9 &&
        unpassedOpps.length >= 1 &&
        bot.hand.length - plannedMove.length >= 1 &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'ineffa') {
      if (
        plannedMove &&
        unpassedOpps.length >= 1 &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 6) &&
        (bot.hand.length <= 8 || minOppCards <= 7)
      ) {
        shouldCast = true;
      }
    } else if (charId === 'flins') {
      const minRequiredUnpassed = Math.min(2, activeOpponents.length);
      if (
        plannedMove &&
        unpassedOpps.length >= minRequiredUnpassed &&
        (plannedMove.length >= 2 || plannedMove.highRank >= 6) &&
        (bot.hand.length <= 9 || minOppCards <= 8)
      ) {
        shouldCast = true;
      }
    }

    if (shouldCast) {
      return this.useCharacterSkill(bot, preferredIds);
    }

    // ==========================================================================
    // HỌC CÁCH NGƯỜI CHƠI DÙNG SKILL & PHÒNG VỆ TRƯỚC NHỊP NỘ CỦA NGƯỜI CHƠI
    // ==========================================================================
    const humanProf = this.getHumanLearningProfile();
    const learnedChar = humanProf.skillByChar ? humanProf.skillByChar[charId] : null;
    const learnedHandTrigger =
      learnedChar && learnedChar.uses > 0
        ? Math.round(learnedChar.sumHandLen / learnedChar.uses)
        : null;
    const avgHumanSkillHandLen =
      humanProf.skillUsesTotal > 0
        ? Math.round(humanProf.skillSumHandLen / humanProf.skillUsesTotal)
        : 7;
    const humanDangerOpp = activeOpponents.find(
      (p) => !p.isBot && !p.skillUsed && this.getPlayerActiveCharId(p) !== 'none'
    );
    const isHumanAboutToBurst =
      Boolean(humanDangerOpp) &&
      humanDangerOpp.hand.length <= Math.max(6, Math.min(10, avgHumanSkillHandLen + 1));

    const controlOrTempoChars = [
      'ayaka',
      'zhongli',
      'navia',
      'cyno',
      'wriothesley',
      'hutao',
      'arlecchino',
      'alhaitham',
      'zibai',
      'yaemiko',
      'furina',
      'shenhe',
      'yelan',
      'emilie',
      'flins',
      'odette',
      'itto',
      'vesna',
      'klee',
      'nahida',
      'ineffa',
    ];

    if (
      !alreadyHasCheckmate &&
      controlOrTempoChars.includes(charId) &&
      plannedMove &&
      !plannedMove.isBomb &&
      unpassedOpps.length >= 1 &&
      (plannedMove.length >= 2 || plannedMove.highRank >= 5)
    ) {
      const matchLearnedCharWindow =
        learnedHandTrigger !== null && bot.hand.length <= learnedHandTrigger;
      if (isHumanAboutToBurst || matchLearnedCharWindow) {
        return this.useCharacterSkill(bot, preferredIds);
      }
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
              <img src="fanart/${d.skin}.jpg?v=66" alt="${d.name}" />
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
    this.syncAutoRandomBotsUI();
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
      alert('⛔ Bạn đang đánh dở ván bài với Bot! Không thể chơi 2 trận với Người và với Bot cùng 1 lúc.');
      return;
    }
    if (this.isMultiplayer && this.roomId && this.roomId !== cleanId && this.isMidMatch()) {
      alert(`⛔ Bạn đang trong trận đấu tại Phòng #${this.roomId} chưa kết thúc! Không thể chuyển sang bàn khác khi trận đang diễn ra.`);
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
    this.mavuikaWrapStraightTurn = !!state.mavuikaWrapStraightTurn;
    activeMavuikaWrapStraight = this.mavuikaWrapStraightTurn;
    this.naviaFlushStraightTurn = !!state.naviaFlushStraightTurn;
    activeNaviaFlushStraight = this.naviaFlushStraightTurn;
    this.naviaLockedTargetId = state.naviaLockedTargetId ?? null;
    this.naviaLockedCardIds = new Set(Array.isArray(state.naviaLockedCardIds) ? state.naviaLockedCardIds : []);
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = !!state.shenheSingleOnlyRound;
    activeShenheSingleOnly = this.shenheSingleOnlyRound;
    this.ganyuGapStraightTurn = !!state.ganyuGapStraightTurn;
    activeGanyuGapStraight = this.ganyuGapStraightTurn;
    this.kokomiReverseRankRound = !!state.kokomiReverseRankRound;
    activeKokomiReverseRank = this.kokomiReverseRankRound;
    this.yoimiyaChainFuseReady = !!state.yoimiyaChainFuseReady;
    this.citlaliPillowOwnerId = state.citlaliPillowOwnerId ?? null;
    this.citlaliPillowTargetId = state.citlaliPillowTargetId ?? null;
    this.xiaoKarmaOwnerId = state.xiaoKarmaOwnerId ?? null;
    this.emiliePerfumeOwnerId = state.emiliePerfumeOwnerId ?? null;
    this.emilieRequiredSuit = state.emilieRequiredSuit ?? null;
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
    if (!this.isMultiplayer && this.isMidMatch()) {
      alert('⛔ Bạn đang đánh dở ván bài với Bot! Không thể chơi 2 trận với Người và với Bot cùng 1 lúc.');
      return;
    }
    if (this.isMultiplayer && this.isMidMatch()) {
      alert('⛔ Trận đấu trong phòng hiện tại chưa kết thúc! Bạn không được phép tạo phòng khác khi ván bài đang diễn ra.');
      return;
    }
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
    this.resetMatchPlayerMemory();
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
    this.mavuikaWrapStraightTurn = false;
    activeMavuikaWrapStraight = false;
    this.naviaFlushStraightTurn = false;
    activeNaviaFlushStraight = false;
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
    if (!isAutoRestore) {
      if (!this.isMultiplayer && this.isMidMatch()) {
        alert('⛔ Bạn đang đánh dở ván bài với Bot! Không thể chơi 2 trận với Người và với Bot cùng 1 lúc.');
        return;
      }
      if (this.isMultiplayer && this.roomId && this.roomId !== cleanCode && this.isMidMatch()) {
        alert(`⛔ Bạn đang trong trận đấu tại Phòng #${this.roomId} chưa kết thúc! Không thể vào phòng khác khi trận đang diễn ra.`);
        return;
      }
    }

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
    if (this.isMultiplayer && this.roomId) {
      if (this.isMidMatch()) {
        alert(`⛔ Bạn đang trong trận đấu với Người (Phòng #${this.roomId}) chưa kết thúc! Tuyệt đối không thể chơi 2 trận với Người và với Bot cùng 1 lúc.`);
      } else {
        alert(`⛔ Bạn đang ở trong Phòng Đấu Với Người (#${this.roomId})! Không thể vào trận Đấu Với Bot cùng lúc. Vui lòng bấm "✕ Rời phòng" trước nếu muốn chuyển sang chơi với Bot.`);
      }
      return;
    }
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
      mavuikaWrapStraightTurn: !!this.mavuikaWrapStraightTurn,
      naviaFlushStraightTurn: !!this.naviaFlushStraightTurn,
      naviaLockedTargetId: this.naviaLockedTargetId ?? null,
      naviaLockedCardIds: Array.from(this.naviaLockedCardIds || []),
      shenheSingleOnlyRound: !!this.shenheSingleOnlyRound,
      ganyuGapStraightTurn: !!this.ganyuGapStraightTurn,
      kokomiReverseRankRound: !!this.kokomiReverseRankRound,
      yoimiyaChainFuseReady: !!this.yoimiyaChainFuseReady,
      citlaliPillowOwnerId: this.citlaliPillowOwnerId ?? null,
      citlaliPillowTargetId: this.citlaliPillowTargetId ?? null,
      xiaoKarmaOwnerId: this.xiaoKarmaOwnerId ?? null,
      emiliePerfumeOwnerId: this.emiliePerfumeOwnerId ?? null,
      emilieRequiredSuit: this.emilieRequiredSuit ?? null,
      turnDirection: this.turnDirection === -1 ? -1 : 1,
      mualaniCrossBeatTurn: !!this.mualaniCrossBeatTurn,
      nicoleSuitOnlyRound: !!this.nicoleSuitOnlyRound,
      xianyunStepStraightTurn: !!this.xianyunStepStraightTurn,
      wriothesleyPairSmashTurn: !!this.wriothesleyPairSmashTurn,
      ayatoCloneReady: !!this.ayatoCloneReady,
      arlecchinoBondOwnerId: this.arlecchinoBondOwnerId ?? null,
      flinsLanternOwnerId: this.flinsLanternOwnerId ?? null,
      kinichBombOwnerId: this.kinichBombOwnerId ?? null,
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
        readyForNextMatch: p.isBot ? true : !!p.readyForNextMatch,
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
        seat.avatar = evt.avatar || 'default_player';
        seat.cardSkin = evt.cardSkin || 'classic';
        const resolvedGuestChar =
          evt.activeChar && evt.activeChar !== 'none'
            ? evt.activeChar
            : evt.chopBurst && evt.chopBurst !== 'none'
            ? evt.chopBurst
            : evt.winBurst && evt.winBurst !== 'none'
            ? evt.winBurst
            : 'none';
        seat.activeChar = resolvedGuestChar;
        seat.chopBurst = resolvedGuestChar;
        seat.winBurst = resolvedGuestChar;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        seat.accountUsername = evt.accountUsername || seat.accountUsername || '';
        seat.isBot = false;
        seat.active = true;
        if (!isRejoin) {
          seat.finishRank = null;
          seat.passed = false;
          seat.readyForNextMatch = false;
          seat.manualActionsInMatch = 0;
          seat.afkAutoTurns = 0;
        }
        seat.clientId = evt.clientId;
        if (!isRejoin) {
          sfx.win();
          this.addLog(`👋 <strong>${seat.name}</strong> đã vào bàn (Ghế #${seat.id + 1})!`, 'log-win');
        }
        this.preloadActiveBurstVideos();
        this.renderLobbyModal();
        this.renderSummaryReadyStateUI();
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
        seat.avatar = '🐯';
        seat.cardSkin = 'classic';
        seat.activeChar = 'none';
        seat.chopBurst = 'none';
        seat.winBurst = 'none';
        seat.clientId = null;
        seat.hand = [];
        seat.passed = true;
        seat.readyForNextMatch = false;
        this.addLog(`👋 <strong>${leftName}</strong> đã rời khỏi bàn.`, 'log-pass');
        this.renderLobbyModal();
        this.renderSummaryReadyStateUI();
        this.renderAll();
        this.broadcastState();
        this.publishRoomToDirectory(false);
      }
    } else if (evt.type === 'UPDATE_COSMETICS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId && p.id !== this.mySeatId);
      if (seat) {
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        const resolvedGuestChar =
          evt.activeChar && evt.activeChar !== 'none'
            ? evt.activeChar
            : evt.chopBurst && evt.chopBurst !== 'none'
            ? evt.chopBurst
            : evt.winBurst && evt.winBurst !== 'none'
            ? evt.winBurst
            : 'none';
        seat.activeChar = resolvedGuestChar;
        seat.chopBurst = resolvedGuestChar;
        seat.winBurst = resolvedGuestChar;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        this.preloadActiveBurstVideos();
        this.renderLobbyModal();
        this.renderSummaryReadyStateUI();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'TOGGLE_READY') {
      const seat = this.players.find((p) => p.clientId === evt.clientId && p.id !== this.mySeatId);
      if (seat) {
        seat.readyForNextMatch = !!evt.ready;
        if (evt.activeChar) {
          seat.activeChar = evt.activeChar;
          seat.chopBurst = evt.activeChar;
          seat.winBurst = evt.activeChar;
        }
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (evt.avatar) seat.avatar = evt.avatar;
        this.renderSummaryReadyStateUI();
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
    this.mavuikaWrapStraightTurn = !!state.mavuikaWrapStraightTurn;
    activeMavuikaWrapStraight = this.mavuikaWrapStraightTurn;
    this.naviaFlushStraightTurn = !!state.naviaFlushStraightTurn;
    activeNaviaFlushStraight = this.naviaFlushStraightTurn;
    this.naviaLockedTargetId = state.naviaLockedTargetId ?? null;
    this.naviaLockedCardIds = new Set(Array.isArray(state.naviaLockedCardIds) ? state.naviaLockedCardIds : []);
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.shenheSingleOnlyRound = !!state.shenheSingleOnlyRound;
    activeShenheSingleOnly = this.shenheSingleOnlyRound;
    this.ganyuGapStraightTurn = !!state.ganyuGapStraightTurn;
    activeGanyuGapStraight = this.ganyuGapStraightTurn;
    this.kokomiReverseRankRound = !!state.kokomiReverseRankRound;
    activeKokomiReverseRank = this.kokomiReverseRankRound;
    this.yoimiyaChainFuseReady = !!state.yoimiyaChainFuseReady;
    this.citlaliPillowOwnerId = state.citlaliPillowOwnerId ?? null;
    this.citlaliPillowTargetId = state.citlaliPillowTargetId ?? null;
    this.xiaoKarmaOwnerId = state.xiaoKarmaOwnerId ?? null;
    this.emiliePerfumeOwnerId = state.emiliePerfumeOwnerId ?? null;
    this.emilieRequiredSuit = state.emilieRequiredSuit ?? null;
    this.turnDirection = state.turnDirection === -1 ? -1 : 1;
    this.mualaniCrossBeatTurn = !!state.mualaniCrossBeatTurn;
    activeMualaniCrossBeat = this.mualaniCrossBeatTurn;
    this.nicoleSuitOnlyRound = !!state.nicoleSuitOnlyRound;
    activeNicoleSuitOnlyRound = this.nicoleSuitOnlyRound;
    this.xianyunStepStraightTurn = !!state.xianyunStepStraightTurn;
    activeXianyunStepStraight = this.xianyunStepStraightTurn;
    this.wriothesleyPairSmashTurn = !!state.wriothesleyPairSmashTurn;
    activeWriothesleyPairSmash = this.wriothesleyPairSmashTurn;
    this.ayatoCloneReady = !!state.ayatoCloneReady;
    this.arlecchinoBondOwnerId = state.arlecchinoBondOwnerId ?? null;
    this.flinsLanternOwnerId = state.flinsLanternOwnerId ?? null;
    this.kinichBombOwnerId = state.kinichBombOwnerId ?? null;
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
    this.preloadActiveBurstVideos();
    this.renderRoundSkillStatusBar();
    this.renderLobbyModal();
    this.renderSummaryReadyStateUI();
    this.renderAll();
    if (this.isGameOver) {
      this.stopTurnCountdown();
    } else {
      this.startTurnCountdown(false);
    }
  }

  renderLobbyModal() {
    this.renderBetTiers();
    this.syncAutoRandomBotsUI();
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

    const wifiHostBtns = document.getElementById('wifi-host-bot-btns');
    if (wifiHostBtns) {
      wifiHostBtns.style.display = !this.isMultiplayer || this.isHost ? 'flex' : 'none';
    }
    const wifiLineupEl = document.getElementById('wifi-bot-lineup-avatars');
    if (wifiLineupEl && this.players) {
      const botSeats = this.players
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => p.active && p.isBot);
      if (botSeats.length === 0) {
        wifiLineupEl.innerHTML = `<div style="font-size:0.78rem;color:#94a3b8;padding:4px 8px;">Chưa có Bot trong bàn — Chủ phòng bấm <strong>🤖 + Thêm Bot</strong> để thêm Bot 5★ vào ghế trống!</div>`;
      } else {
        const locked = this.isMidMatch();
        wifiLineupEl.innerHTML = botSeats
          .map(({ p, idx }) => {
            const queued = locked && this.queuedNextMatchBots && this.queuedNextMatchBots[idx];
            const dispName = queued
              ? `Bot ${queued.name.split('(')[0].trim()} ${queued.crest}`
              : p.name;
            const dispSkin = queued ? queued.id : p.cardSkin || 'furina';
            const seatTag = queued ? `Ghế #${idx + 1} • ⏳ Trận sau` : `Ghế #${idx + 1}`;
            const canClick = !this.isMultiplayer || this.isHost;
            return `
              <div class="bot-lineup-chip" ${
                canClick ? `onclick="window.tienLenGame.openBotPickerModal(${idx})"` : ''
              } title="${
              canClick ? `Bấm để chọn đích danh nhân vật Bot cho Ghế #${idx + 1}` : dispName
            }" style="cursor:${canClick ? 'pointer' : 'default'};">
                <img src="fanart/${dispSkin}.jpg?v=66" alt="${dispName}" />
                <div class="bot-lineup-chip-info">
                  <span class="bot-lineup-chip-seat">${seatTag}${canClick ? ' • 🎯 Đổi' : ''}</span>
                  <span class="bot-lineup-chip-name">${dispName}</span>
                </div>
              </div>
            `;
          })
          .join('');
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
          } else if (p.isBot) {
            actionHtml = `
              <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="tool-btn" style="padding:4px 8px;font-size:0.74rem;" onclick="window.tienLenGame.randomizeSingleBotSeat(${idx})" title="Random đổi nhân vật khác cho Ghế #${idx + 1}">🎲 Đổi</button>
                <button class="tool-btn" style="padding:4px 8px;font-size:0.74rem;border-color:#c084fc;color:#f3e8ff;" onclick="window.tienLenGame.openBotPickerModal(${idx})" title="Chọn đích danh nhân vật 5★ cho Ghế #${idx + 1}">🎯 Chọn</button>
                <button class="clear-log-btn" style="padding:4px 8px;font-size:0.74rem;" onclick="window.tienLenGame.toggleBotInLobby(${idx}, false)">✕ Bỏ ghế</button>
              </div>
            `;
          } else {
            actionHtml = `<button class="clear-log-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, false)">✕ Bỏ ghế</button>`;
          }
        }

        const botSkill = p.active && p.isBot && CHARACTER_SKILLS[p.cardSkin] ? CHARACTER_SKILLS[p.cardSkin] : null;
        const roleLabel = !p.active
          ? 'Ghế trống (Đang chờ người chơi vào...)'
          : isRoomHostSeat
          ? '👑 Chủ phòng'
          : p.isBot
          ? `🤖 Máy (Bot AI)${botSkill ? ` • ${botSkill.icon} ${botSkill.name}` : ''}`
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
      p.avatar = '🐯';
      p.cardSkin = 'classic';
      p.activeChar = 'none';
      p.chopBurst = 'none';
      p.winBurst = 'none';
      p.clientId = null;
      p.hand = [];
    }
    sfx.click();
    this.preloadActiveBurstVideos();
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
      'reaction-bloom',
      'reaction-hyperbloom',
      'reaction-burgeon',
      'reaction-lunar-electrocharged',
      'reaction-lunar-crystallize',
      'reaction-lunar-bloom',
      'reaction-astral-superconduct',
      'reaction-astral-swirl'
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

    if (this.queuedNextMatchBots && (!this.isMultiplayer || this.isHost)) {
      this.applyQueuedNextMatchBots();
    } else if (
      (!resetHistory || (!this.inInitialLobby && this.matchCount >= 1)) &&
      this.autoRandomizeBots !== false &&
      !this._manualBotChangedAfterMatch &&
      (!this.isMultiplayer || (this.isHost && this.getActiveBotSeats().length > 0))
    ) {
      this.randomizeBotCharacters(true);
    } else {
      this.updateArenaBackdropCharacters();
    }
    this._manualBotChangedAfterMatch = false;

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
      p.readyForNextMatch = !!p.isBot;
      p.manualActionsInMatch = 0;
      p.afkAutoTurns = 0;
      p.wasFullMatchAfk = false;
      const cid = this.getPlayerActiveCharId(p);
      p.activeChar = cid;
      p.chopBurst = cid;
      p.winBurst = cid;
    });
    this.preloadActiveBurstVideos();

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
    this.resetMatchPlayerMemory();
    this.syncGlobalAiBrainWithCloud(false);
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
    this.mavuikaWrapStraightTurn = false;
    activeMavuikaWrapStraight = false;
    this.yelanRevealedByPlayer = {};
    this.naviaFlushStraightTurn = false;
    activeNaviaFlushStraight = false;
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.zhongliPetrifiedCardIds = new Set();
    activeZhongliPetrifiedCardIds = this.zhongliPetrifiedCardIds;
    this.shenheSingleOnlyRound = false;
    activeShenheSingleOnly = false;
    this.ganyuGapStraightTurn = false;
    activeGanyuGapStraight = false;
    this.kokomiReverseRankRound = false;
    activeKokomiReverseRank = false;
    this.yoimiyaChainFuseReady = false;
    this.citlaliPillowOwnerId = null;
    this.citlaliPillowTargetId = null;
    this.columbinaExtraTurnReady = false;
    this.xiaoKarmaOwnerId = null;
    activeXiaoKarmaMaxRank = null;
    this.kinichBombOwnerId = null;
    this.roundPlayedSeatIds = new Set();
    this.roundSkillActivatedSeatIds = new Set();
    this.nicoleSuitOnlyRound = false;
    activeNicoleSuitOnlyRound = false;
    this.xianyunStepStraightTurn = false;
    activeXianyunStepStraight = false;
    this.wriothesleyNoSingleOwnerId = null;
    this.wriothesleyNoSingleRound = false;
    activeWriothesleyNoSingle = false;
    this.cynoRoyalBanOwnerId = null;
    this.cynoRoyalBanRound = false;
    activeCynoRoyalBan = false;
    this.sigewinneCareOwnerId = null;
    this.yelanParityOwnerId = null;
    this.yelanParityRound = false;
    activeYelanSameParity = false;
    this.varkaSumSlashTurn = false;
    activeVarkaSumSlash = false;
    this.baizhuShieldOwnerId = null;
    activeBaizhuShield = false;
    this.ittoUshiOwnerId = null;
    this.alhaithamOwnerId = null;
    this.alhaithamAllowedRanks = null;
    activeAlhaithamAllowedRanks = null;
    this.emiliePerfumeOwnerId = null;
    this.emilieRequiredSuit = null;
    activeEmilieRequiredSuit = null;
    this.zibaiMinStepOwnerId = null;
    this.zibaiRedirectTargetId = null;
    activeZibaiMinStep = false;
    this.vesnaSpringOwnerId = null;
    this.matchGraveyardCards = [];
    this.ayatoCloneReady = false;
    this.arlecchinoBondOwnerId = null;
    this.flinsLanternOwnerId = null;
    this.roundSkillActivatedSeatIds = new Set();
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
    this.players.forEach((p) => {
      if (p) p.readyForNextMatch = !!p.isBot;
    });
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
    this.syncGlobalAiBrainWithCloud(true);

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

    const limit = this.turnTimeLimitSec || 30;
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
      this.turnRemainingSec = this.turnTimeLimitSec || 30;
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
    if (
      !this.tutorialCompleted &&
      this.tutorialStep === 5 &&
      this.currentTurn === this.mySeatId &&
      (!this.tutorialMatch2SkillUsed || !this.tutorialMatch2FirstCardPlayed)
    ) {
      // Trong lúc người chơi mới đang đọc hướng dẫn xài Kỹ Năng [E] ở Bước 5, không tự động bỏ lượt
      this.startTurnCountdown(true);
      return;
    }
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
        `⏰ <strong>[Hết 30s - AFK]</strong> Hệ thống tự động đánh <strong>${chosen.label}</strong> cho <strong>${seatPlayer.name}</strong>!`,
        'log-play'
      );
      this.playCombo(seatPlayer, chosen);
    } else if (this.currentCombo) {
      this.addLog(`⏰ <strong>[Hết 30s - AFK]</strong> Tự động bỏ lượt cho <strong>${seatPlayer.name}</strong>.`, 'log-pass');
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
      this.showComboBanner(`⏰ HẾT 30 GIÂY! TỰ ĐỘNG ĐÁNH: ${selCombo.label.toUpperCase()}`);
      this.addLog(
        `⏰ <strong>[Hết 30s suy nghĩ]</strong> Tự động đánh bộ bài đang chọn: <strong>${selCombo.label}</strong>!`,
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
      this.showComboBanner(`⏰ HẾT 30 GIÂY! TỰ ĐỘNG ĐÁNH: ${chosenMove.label.toUpperCase()}`);
      this.addLog(
        `⏰ <strong>[Hết 30s suy nghĩ]</strong> Hệ thống tự động chọn &amp; đánh <strong>${chosenMove.label}</strong>!`,
        'log-play'
      );
      this.onHumanPlay(isAutoTimeout);
      return;
    }

    // 3. Nếu đang đỡ bài và không có bộ nào chặn được (hoặc từ chối chặt 4 đôi thông) -> Tự động Bỏ lượt
    if (this.currentCombo) {
      this.showComboBanner('⏰ HẾT 30 GIÂY! TỰ ĐỘNG BỎ LƯỢT');
      this.addLog(
        '⏰ <strong>[Hết 30s suy nghĩ]</strong> Không có bộ bài chặn được ➔ Tự động <strong>Bỏ lượt</strong>.',
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

    this.syncRoundRuleGlobals(this.currentTurn);
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
        this.elTurnBanner.textContent = '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ (30s).';
      } else if (currentPlayer.passed && this.canPlayerCutWithFourPairs(currentPlayer)) {
        this.elTurnBanner.textContent = '🔥 Bạn có 4 ĐÔI THÔNG! Có thể chặt không cần vòng hoặc Bỏ qua (30s).';
      } else {
        this.elTurnBanner.textContent = `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt (30s).`;
      }
      this.updateHumanActionButtons();
      if (!this.tutorialCompleted && this.tutorialStep === 5) {
        this.renderTravelerGuide();
      }
    } else {
      this.elTurnBanner.textContent = `⏳ Đang tới lượt của ${currentPlayer.name} (30s)...`;
    }
  }

  playCombo(player, combo) {
    if (this.isGameOver || this.isBurstPlaying || !player || !player.active || !combo) return false;
    this.syncRoundRuleGlobals(player.id);
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
    if (!this.currentCombo || !(this.roundPlayedSeatIds instanceof Set)) {
      this.roundPlayedSeatIds = new Set();
    }
    this.roundPlayedSeatIds.add(player.id);
    try {
      this.recordPlayerPlayBehavior(player, combo);
    } catch (_) {}
    const playedIds = new Set(combo.cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !playedIds.has(c.id));
    if (!Array.isArray(this.matchGraveyardCards)) {
      this.matchGraveyardCards = [];
    }
    this.matchGraveyardCards.push(...combo.cards);
    if (this.baizhuShieldOwnerId === player.id) {
      combo.baizhuShielded = true;
      activeBaizhuShield = true;
    }

    // Reset các trạng thái Kỹ Năng chỉ có hiệu lực trong 1 lượt của người vừa đánh
    if (
      this.mavuikaWrapStraightTurn ||
      this.naviaFlushStraightTurn ||
      this.ganyuGapStraightTurn ||
      this.mualaniCrossBeatTurn ||
      this.xianyunStepStraightTurn ||
      this.wriothesleyPairSmashTurn ||
      this.varkaSumSlashTurn
    ) {
      this.mavuikaWrapStraightTurn = false;
      activeMavuikaWrapStraight = false;
      this.naviaFlushStraightTurn = false;
      activeNaviaFlushStraight = false;
      this.ganyuGapStraightTurn = false;
      activeGanyuGapStraight = false;
      this.mualaniCrossBeatTurn = false;
      activeMualaniCrossBeat = false;
      this.xianyunStepStraightTurn = false;
      activeXianyunStepStraight = false;
      this.wriothesleyPairSmashTurn = false;
      activeWriothesleyPairSmash = false;
      this.varkaSumSlashTurn = false;
      activeVarkaSumSlash = false;
      this.renderRoundSkillStatusBar();
    }

    // Thủy Ảnh Thế Thân của Ayato: Dùng 1 lá rác nhỏ nhất còn lại trên tay thế chỗ cho lá chủ lực vừa đánh, để lại Phân Thân Nước (-1 bậc) ở lại trên tay!
    if (this.ayatoCloneReady) {
      this.ayatoCloneReady = false;
      if (this.getPlayerActiveCharId(player) === 'ayato' && player.hand.length >= 1) {
        const playedNormals = sortCardsAsc(combo.cards).filter((c) => c.rankIndex <= 11);
        const mainPlayed = playedNormals.length > 0 ? playedNormals[playedNormals.length - 1] : null;
        if (mainPlayed) {
          const struct = this.analyzeBotHandStructure(player.hand);
          const sortedRem = sortCardsAsc(player.hand);
          const trashSub =
            sortedRem.find(
              (c) =>
                c.rankIndex < 12 &&
                struct.rankCounts[c.rankIndex] === 1 &&
                !struct.bombRanks.has(c.rankIndex) &&
                !struct.criticalStraightRanks.has(c.rankIndex)
            ) || sortedRem[0];
          if (trashSub) {
            const oldTrashStr = `${trashSub.rank}${trashSub.suit}`;
            const cloneRank = Math.max(0, mainPlayed.rankIndex - 1);
            trashSub.rankIndex = cloneRank;
            trashSub.rank = RANKS[cloneRank];
            trashSub.suitIndex = mainPlayed.suitIndex;
            trashSub.suit = mainPlayed.suit;
            trashSub.isRed = mainPlayed.isRed;
            trashSub.value = cloneRank * 4 + mainPlayed.suitIndex;
            trashSub.id = `${trashSub.rank}${trashSub.suit}_ayato_clone_${Date.now()}`;
            player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
            this.addLog(
              `🌊 <strong>[Thủy Ảnh Thế Thân]</strong> <strong>${player.name}</strong> dùng lá rác <strong>${oldTrashStr}</strong> thế thân cho <strong>${mainPlayed.rank}${mainPlayed.suit}</strong>, lưu lại <strong>Phân Thân Nước ${trashSub.rank}${trashSub.suit}</strong> ở lại trên tay!`,
              'log-win'
            );
          }
        }
      }
      this.renderRoundSkillStatusBar();
    }

    // Bom Hẹn Giờ Ajaw của Kinich: Tất cả đối thủ tham gia đánh bài trong vòng đang diễn ra đều bị nổ bom nhận 1 lá bài rác nhỏ nhất từ tay Kinich!
    if (
      this.kinichBombOwnerId !== null &&
      player.id !== this.kinichBombOwnerId &&
      player.hand.length >= 1
    ) {
      const kinichOwner = this.players[this.kinichBombOwnerId];
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
            `🎮💥 <strong>[Bom Hẹn Giờ Ajaw]</strong> <strong>${player.name}</strong> đánh bài trong vòng gài bom của <strong>${kinichOwner.name}</strong> nên kích nổ bom, bị nhét thêm lá rác <strong>${bombTrash.rank}${bombTrash.suit}</strong> vào tay!`,
            'log-chop'
          );
        }
        if (kinichOwner.hand.length < 2) {
          this.kinichBombOwnerId = null;
        }
      } else {
        this.kinichBombOwnerId = null;
      }
      this.renderRoundSkillStatusBar();
    }

    // Dây Pháo Liên Hoàn của Yoimiya: Khi đánh 1 lá bài (hoặc 1 Đôi), tất cả các lá bài có bậc số liên tiếp ngay phía trên nó trên tay Yoimiya tự động bắt lửa nổ dây chuyền bay ra bàn cùng lúc và chốt bàn ở lá cao nhất!
    if (this.yoimiyaChainFuseReady) {
      this.yoimiyaChainFuseReady = false;
      if (
        this.getPlayerActiveCharId(player) === 'yoimiya' &&
        (combo.type === COMBO_TYPES.SINGLE || combo.type === COMBO_TYPES.PAIR) &&
        combo.highRank < 12 &&
        player.hand.length >= 1
      ) {
        const struct = this.analyzeBotHandStructure(player.hand);
        const ignitedCards = [];
        for (let r = combo.highRank + 1; r <= 11; r++) {
          if (struct.bombRanks.has(r)) break;
          const cardsAtR = sortCardsAsc(player.hand.filter((c) => c.rankIndex === r));
          if (cardsAtR.length === 0) break;
          ignitedCards.push(cardsAtR[cardsAtR.length - 1]);
        }
        if (ignitedCards.length > 0) {
          const ignitedIds = new Set(ignitedCards.map((c) => c.id));
          player.hand = player.hand.filter((c) => !ignitedIds.has(c.id));
          combo.cards.push(...ignitedCards);
          this.matchGraveyardCards.push(...ignitedCards);
          const topIgnited = ignitedCards[ignitedCards.length - 1];
          combo.highCard = topIgnited;
          combo.highRank = topIgnited.rankIndex;
          combo.highValue = topIgnited.value;
          const chainStr = ignitedCards.map((c) => `${c.rank}${c.suit}`).join(' ➔ ');
          combo.label = `${combo.label} [🎆 Cháy lan: ➔ ${chainStr} (Chốt ${topIgnited.rank}${topIgnited.suit})]`;
          this.showComboBanner(
            `🎆 DÂY PHÁO YOIMIYA NỔ LAN +${ignitedCards.length} LÁ ➔ CHỐT ${topIgnited.rank}${topIgnited.suit}!`,
            'reaction-overloaded'
          );
          this.addLog(
            `🎆 <strong>[Dây Pháo Liên Hoàn]</strong> <strong>${player.name}</strong> châm ngòi nổ dây chuyền cuốn bay thêm <strong>${ignitedCards.length} lá liên tiếp (${chainStr})</strong> ra bàn, chốt bàn ở bậc <strong>${topIgnited.rank}${topIgnited.suit}</strong>!`,
            'log-win'
          );
        }
      }
      this.renderRoundSkillStatusBar();
    }

    // Gối Ôm Ký Sinh của Citlali: Khi đối thủ bị gắn Gối Citlalin đánh ra bao nhiêu lá bài, Citlali tự động được vứt bỏ theo bấy nhiêu lá bài rác nhỏ nhất trên tay mình!
    if (
      this.citlaliPillowOwnerId !== null &&
      player.id === this.citlaliPillowTargetId &&
      player.hand.length > 0
    ) {
      const citlaliOwner = this.players[this.citlaliPillowOwnerId];
      if (
        citlaliOwner &&
        citlaliOwner.active &&
        citlaliOwner.finishRank === null &&
        citlaliOwner.hand.length > 1
      ) {
        const maxDrop = Math.min(combo.cards.length, citlaliOwner.hand.length - 1);
        const cStruct = this.analyzeBotHandStructure(citlaliOwner.hand);
        const cSorted = sortCardsAsc(citlaliOwner.hand);
        const pureTrash = cSorted.filter(
          (c) =>
            c.rankIndex < 12 &&
            cStruct.rankCounts[c.rankIndex] === 1 &&
            !cStruct.bombRanks.has(c.rankIndex) &&
            !cStruct.criticalStraightRanks.has(c.rankIndex)
        );
        const fallbackNormal = cSorted.filter(
          (c) =>
            c.rankIndex < 12 &&
            !cStruct.bombRanks.has(c.rankIndex) &&
            !pureTrash.some((pt) => pt.id === c.id)
        );
        const dropPool = [
          ...pureTrash,
          ...fallbackNormal,
          ...cSorted.filter(
            (c) => !pureTrash.some((pt) => pt.id === c.id) && !fallbackNormal.some((fn) => fn.id === c.id)
          ),
        ];
        const droppedCards = dropPool.slice(0, maxDrop);
        if (droppedCards.length > 0) {
          const dropIds = new Set(droppedCards.map((c) => c.id));
          citlaliOwner.hand = citlaliOwner.hand.filter((c) => !dropIds.has(c.id));
          this.matchGraveyardCards.push(...droppedCards);
          const dropStr = droppedCards.map((c) => `${c.rank}${c.suit}`).join(', ');
          this.showComboBanner(
            `🛏️❄️ GỐI CITLALIN KÝ SINH: ${citlaliOwner.name.toUpperCase()} VỨT KÈM ${droppedCards.length} LÁ RÁC (${dropStr})!`,
            'reaction-superconduct'
          );
          this.addLog(
            `🛏️❄️ <strong>[Gối Ôm Ký Sinh]</strong> Do <strong>${player.name}</strong> đánh ra <strong>${combo.cards.length} lá</strong>, Gối Citlalin tự động giúp <strong>${citlaliOwner.name}</strong> vứt bỏ theo <strong>${droppedCards.length} lá bài rác (${dropStr})</strong>!`,
            'log-win'
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

      const rx = victim ? this.getSpecialPlayReaction(player, combo, victim) : null;
      combo.reaction = rx;
      if (rx) {
        this.applyElementalReactionBonus(player, victim, rx);
      }
      const chopTitleUpper = isStackedChop ? 'CHẶT CHỒNG' : 'CHẶT';
      const chopBurstDetail = rx
        ? `⚡ [${rx.shortName}] ${player.name} tung ${combo.label} ${chopTitleUpper.toLowerCase()} ${targetDisplayLabel} của ${victim.name} (+${totalChopValue.toLocaleString()} xu)!`
        : `💥 ${player.name} tung ${combo.label} ${chopTitleUpper.toLowerCase()} ${targetDisplayLabel} của ${victim.name} (+${totalChopValue.toLocaleString()} xu)!`;
      const chopBurstId = this.getPlayerActiveCharId(player);
      if (player.hand.length > 0) {
        this.lastBurstEffect = { id: Date.now(), type: chopBurstId, burstId: chopBurstId, isWin: false, detail: chopBurstDetail };
        this.triggerGenshinBurst(chopBurstId, chopBurstDetail);
      } else if (rx) {
        this.triggerArenaReactionFlash(rx);
      }
      if (rx) {
        this.showComboBanner(`${rx.badge} • ${chopTitleUpper} +${totalChopValue.toLocaleString()} XU!`, rx.cssClass);
        this.addLog(
          `💥 <strong>[${rx.shortName}]</strong> <strong>${player.name}</strong> tung <strong>${combo.label}</strong> ${chopTitleUpper.toLowerCase()} <strong>${targetDisplayLabel}</strong> của <strong>${victim.name}</strong> (+${totalChopValue.toLocaleString()} xu)!`,
          'log-chop'
        );
      } else {
        this.showComboBanner(`💥 ${chopTitleUpper} +${totalChopValue.toLocaleString()} XU!`, 'chop-banner');
        this.addLog(
          `💥 <strong>${player.name}</strong> tung <strong>${combo.label}</strong> ${chopTitleUpper.toLowerCase()} <strong>${targetDisplayLabel}</strong> của <strong>${victim.name}</strong> (+${totalChopValue.toLocaleString()} xu)!`,
          'log-chop'
        );
      }
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

      const hasEquippedChar = this.getPlayerActiveCharId(player) !== 'none';
      this.lastSkillCutTargetId = null;

      // Phản Ứng Nguyên Tố CHỈ tính khi ĐÈ (chặn) bộ bài đang có trên bàn của đối thủ VÀ 2 nhân vật khác hệ có tương tác thực sự
      // (2 con trùng nguyên tố nhau hoàn toàn KHÔNG có phản ứng nguyên tố!)
      const prevPlayer =
        this.currentCombo && this.trickOwnerId !== null && this.trickOwnerId !== player.id
          ? this.players[this.trickOwnerId]
          : null;

      const candidateRx = prevPlayer ? this.getSpecialPlayReaction(player, combo, prevPlayer) : null;

      sfx.playCard(isUltra ? 'ultra' : isHeavy ? 'heavy' : 'normal');
      const rx = isHeavy ? candidateRx : null;
      if (rx) {
        combo.reaction = rx;
        this.triggerArenaReactionFlash(rx);
        const rxBonus = this.applyElementalReactionBonus(player, prevPlayer, rx);
        const rxMult = Number(rx.multiplier) || 5;
        const bonusTag = rxBonus > 0 ? ` (+${rxBonus.toLocaleString()} XU ×${rxMult})` : '';
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

    // Tuyệt Kỹ Ném Bò Ushi của Arataki Itto: Bò Ushi lao ra húc văng đòn đánh của đối thủ, hủy lượt của họ và trao quyền Cầm Cái mở vòng mới về tay Itto!
    if (this.ittoUshiOwnerId !== null && player.id !== this.ittoUshiOwnerId) {
      const ittoOwner = this.players[this.ittoUshiOwnerId];
      this.ittoUshiOwnerId = null;
      if (ittoOwner && ittoOwner.active && ittoOwner.finishRank === null && ittoOwner.hand.length > 0) {
        this.previousCombo = this.currentCombo;
        this.currentCombo = null;
        this.trickOwnerId = ittoOwner.id;
        this.currentTurn = ittoOwner.id;
        this.turnTimerComboSig = '';
        this.players.forEach((p) => {
          if (p.active && p.finishRank === null) {
            p.passed = false;
            p.declinedFourPairsCut = false;
          }
        });
        this.showComboBanner(
          `👹🐂 BÒ USHI HÚC VĂNG ${combo.label.toUpperCase()} — ${ittoOwner.name.toUpperCase()} CƯỚP CÁI!`,
          'reaction-crystallize'
        );
        this.addLog(
          `👹🐂 <strong>[Tuyệt Kỹ Ném Bò Ushi]</strong> Bò Ushi của <strong>${ittoOwner.name}</strong> lao ra húc văng <strong>${combo.label}</strong> của <strong>${player.name}</strong> và giành quyền <strong>Cầm Cái mở vòng mới</strong> ngay lập tức!`,
          'log-win'
        );
        this.renderRoundSkillStatusBar();
        this.promptCurrentTurn();
        if (this.isMultiplayer && this.isHost) {
          this.broadcastState();
        }
        return true;
      }
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
    // Hồ Ly Dụ Hoặc của Yae Miko: Nếu còn bài chặn được thì cấm Bỏ lượt giấu bài!
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
    if (
      this.mavuikaWrapStraightTurn ||
      this.naviaFlushStraightTurn ||
      this.ganyuGapStraightTurn ||
      this.mualaniCrossBeatTurn ||
      this.yoimiyaChainFuseReady ||
      this.columbinaExtraTurnReady ||
      this.xianyunStepStraightTurn ||
      this.varkaSumSlashTurn ||
      this.ayatoCloneReady
    ) {
      this.mavuikaWrapStraightTurn = false;
      activeMavuikaWrapStraight = false;
      this.naviaFlushStraightTurn = false;
      activeNaviaFlushStraight = false;
      this.ganyuGapStraightTurn = false;
      activeGanyuGapStraight = false;
      this.mualaniCrossBeatTurn = false;
      activeMualaniCrossBeat = false;
      this.yoimiyaChainFuseReady = false;
      this.columbinaExtraTurnReady = false;
      this.xianyunStepStraightTurn = false;
      activeXianyunStepStraight = false;
      this.varkaSumSlashTurn = false;
      activeVarkaSumSlash = false;
      this.ayatoCloneReady = false;
      this.renderRoundSkillStatusBar();
    }
    if (player.passed) {
      player.declinedFourPairsCut = true;
    }
    try {
      this.recordPlayerPassBehavior(player, this.currentCombo);
    } catch (_) {}
    player.passed = true;
    this.turnTimerComboSig = '';
    this.addLog(`<em>${player.name} bỏ lượt.</em>`, 'log-pass');

    // Khế Ước Sinh Mệnh của Arlecchino: Bất kỳ đối thủ nào Bỏ Lượt trong vòng này bị nhét 1 lá rác nhỏ nhất từ tay Arlecchino và nộp phạt 2× mức cược!
    if (this.arlecchinoBondOwnerId !== null && player.id !== this.arlecchinoBondOwnerId) {
      const arleOwner = this.players[this.arlecchinoBondOwnerId];
      if (arleOwner && arleOwner.active && arleOwner.finishRank === null) {
        const b = this.betPerCard || 100;
        const bondTax = Math.round(b * 2);
        player.coins -= bondTax;
        arleOwner.coins += bondTax;
        this.matchChopCoins[player.id] -= bondTax;
        this.matchChopCoins[arleOwner.id] += bondTax;
        this.matchChopDetails[player.id].push({
          label: `🩸 Khế Ước Sinh Mệnh (${arleOwner.name}): Bỏ lượt nộp phạt (-${bondTax.toLocaleString()})`,
          isSpecial: true,
        });
        this.matchChopDetails[arleOwner.id].push({
          label: `🩸 Thu Khế Ước Sinh Mệnh từ ${player.name} (+${bondTax.toLocaleString()})`,
          isGood: true,
        });
        let cardTransferNote = '';
        if (arleOwner.hand.length >= 2) {
          const aStruct = this.analyzeBotHandStructure(arleOwner.hand);
          const aSorted = sortCardsAsc(arleOwner.hand);
          const bondTrash =
            aSorted.find(
              (c) =>
                c.rankIndex < 12 &&
                aStruct.rankCounts[c.rankIndex] === 1 &&
                !aStruct.bombRanks.has(c.rankIndex) &&
                !aStruct.criticalStraightRanks.has(c.rankIndex)
            ) ||
            aSorted.find((c) => c.rankIndex < 12) ||
            aSorted[0];
          if (bondTrash) {
            arleOwner.hand = arleOwner.hand.filter((c) => c.id !== bondTrash.id);
            player.hand.push(bondTrash);
            arleOwner.hand = sortHandByMode(arleOwner.hand, arleOwner.id === this.mySeatId ? this.sortMode : 'asc');
            player.hand = sortHandByMode(player.hand, player.id === this.mySeatId ? this.sortMode : 'asc');
            cardTransferNote = ` và bị nhét lá rác <strong>${bondTrash.rank}${bondTrash.suit}</strong> vào tay`;
          }
        }
        this.showComboBanner(`🩸 KHẾ ƯỚC ARLECCHINO: ${player.name.toUpperCase()} BỎ LƯỢT BỊ PHẠT!`, 'reaction-overloaded');
        this.addLog(
          `🩸 <strong>[Khế Ước Sinh Mệnh]</strong> <strong>${player.name}</strong> bỏ lượt trong vòng khế ước của <strong>${arleOwner.name}</strong> nên nộp phạt <strong>-${bondTax.toLocaleString()} Xu</strong>${cardTransferNote}!`,
          'log-chop'
        );
      }
    }

    // Ngọn Đèn Đêm Cướp Cái của Flins: Ngay khoảnh khắc có BẤT KỲ đối thủ nào Bỏ Lượt, vòng đấu kết thúc lập tức và Flins cướp Cái mở vòng mới!
    if (this.flinsLanternOwnerId !== null && player.id !== this.flinsLanternOwnerId) {
      const flinsOwner = this.players[this.flinsLanternOwnerId];
      if (flinsOwner && flinsOwner.active && flinsOwner.finishRank === null && flinsOwner.hand.length > 0) {
        this.trickOwnerId = flinsOwner.id;
        this.flinsLanternOwnerId = null;
        this.showComboBanner(
          `🏮 NGỌN ĐÈN FLINS: ${flinsOwner.name.toUpperCase()} CƯỚP CÁI MỞ VÒNG MỚI NGAY!`,
          'reaction-electro-charged'
        );
        this.addLog(
          `🏮 <strong>[Ngọn Đèn Đêm Cướp Cái]</strong> Ngay khi <strong>${player.name}</strong> vừa bỏ lượt, <strong>${flinsOwner.name}</strong> lập tức kết thúc vòng đấu và <strong>cướp quyền Cầm Cái mở vòng mới</strong>!`,
          'log-win'
        );
        this.startNewRoundAfterAllPass();
        if (this.isMultiplayer && this.isHost) {
          this.broadcastState();
        }
        return;
      }
    }

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
    // Trạm Y Tế Meropide của Sigewinne: Khi vòng kết thúc, nếu đối thủ thắng vòng này thì phải đóng viện phí 3× mức cược cho Sigewinne!
    if (
      this.sigewinneCareOwnerId !== null &&
      this.trickOwnerId !== null &&
      this.trickOwnerId !== this.sigewinneCareOwnerId
    ) {
      const sigeOwner = this.players[this.sigewinneCareOwnerId];
      const roundWinner = this.players[this.trickOwnerId];
      if (sigeOwner && sigeOwner.active && roundWinner && roundWinner.active) {
        const b = this.betPerCard || 100;
        const medFee = Math.round(b * 3);
        roundWinner.coins -= medFee;
        sigeOwner.coins += medFee;
        this.matchChopCoins[roundWinner.id] -= medFee;
        this.matchChopCoins[sigeOwner.id] += medFee;
        this.matchChopDetails[roundWinner.id].push({
          label: `💉 Viện Phí Meropide (${sigeOwner.name}): Thắng vòng nộp phạt (-${medFee.toLocaleString()})`,
          isSpecial: true,
        });
        this.matchChopDetails[sigeOwner.id].push({
          label: `💉 Thu Viện Phí Meropide từ ${roundWinner.name} (+${medFee.toLocaleString()})`,
          isGood: true,
        });
        this.showComboBanner(
          `💉 TRẠM Y TẾ MEROPIDE: ${roundWinner.name.toUpperCase()} NỘP VIỆN PHÍ +${medFee.toLocaleString()} XU CHO ${sigeOwner.name.toUpperCase()}!`,
          'reaction-electro-charged'
        );
        this.addLog(
          `💉 <strong>[Trạm Y Tế Meropide]</strong> <strong>${roundWinner.name}</strong> thắng vòng chăm sóc của <strong>${sigeOwner.name}</strong> nên phải đóng <strong>+${medFee.toLocaleString()} Xu</strong> (3× cược) viện phí cho Y Tá trưởng!`,
          'log-chop'
        );
      }
    }

    // Gió Xuân Đoạt Cái của Vesna: Khi vòng kết thúc, nếu bộ bài thắng vòng cuối cùng của đối thủ có chứa lá Đỏ (♥/♦) -> Vesna tịch thu quyền Cầm Cái mở vòng mới!
    if (
      this.vesnaSpringOwnerId !== null &&
      this.trickOwnerId !== null &&
      this.trickOwnerId !== this.vesnaSpringOwnerId &&
      this.currentCombo &&
      Array.isArray(this.currentCombo.cards) &&
      this.currentCombo.cards.some((c) => c.suitIndex >= 2)
    ) {
      const vesnaOwner = this.players[this.vesnaSpringOwnerId];
      const prevWinner = this.players[this.trickOwnerId];
      if (vesnaOwner && vesnaOwner.active && vesnaOwner.finishRank === null && vesnaOwner.hand.length > 0) {
        this.trickOwnerId = vesnaOwner.id;
        this.showComboBanner(
          `🍃 GIÓ XUÂN ĐOẠT CÁI: ${vesnaOwner.name.toUpperCase()} TỊCH THU QUYỀN MỞ VÒNG MỚI!`,
          'reaction-bloom'
        );
        this.addLog(
          `🍃 <strong>[Gió Xuân Đoạt Cái]</strong> Bộ bài kết vòng của <strong>${prevWinner ? prevWinner.name : 'đối thủ'}</strong> có chứa <strong>lá bài Đỏ (♥/♦)</strong> nên <strong>${vesnaOwner.name}</strong> lập tức <strong>tịch thu quyền Cầm Cái mở vòng mới</strong>!`,
          'log-win'
        );
      }
    }

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
    this.mavuikaWrapStraightTurn = false;
    activeMavuikaWrapStraight = false;
    this.yelanRevealedByPlayer = {};
    this.naviaFlushStraightTurn = false;
    activeNaviaFlushStraight = false;
    this.naviaLockedTargetId = null;
    this.naviaLockedCardIds = new Set();
    activeNaviaLockedCardIds = this.naviaLockedCardIds;
    this.zhongliPetrifiedCardIds = new Set();
    activeZhongliPetrifiedCardIds = this.zhongliPetrifiedCardIds;
    this.shenheSingleOnlyRound = false;
    activeShenheSingleOnly = false;
    this.ganyuGapStraightTurn = false;
    activeGanyuGapStraight = false;
    this.kokomiReverseRankRound = false;
    activeKokomiReverseRank = false;
    this.yoimiyaChainFuseReady = false;
    this.citlaliPillowOwnerId = null;
    this.citlaliPillowTargetId = null;
    this.columbinaExtraTurnReady = false;
    this.xiaoKarmaOwnerId = null;
    activeXiaoKarmaMaxRank = null;
    this.kinichBombOwnerId = null;
    this.roundPlayedSeatIds = new Set();
    this.roundSkillActivatedSeatIds = new Set();
    this.mualaniCrossBeatTurn = false;
    activeMualaniCrossBeat = false;
    this.nicoleSuitOnlyRound = false;
    activeNicoleSuitOnlyRound = false;
    this.xianyunStepStraightTurn = false;
    activeXianyunStepStraight = false;
    this.wriothesleyNoSingleOwnerId = null;
    this.wriothesleyNoSingleRound = false;
    activeWriothesleyNoSingle = false;
    this.cynoRoyalBanOwnerId = null;
    this.cynoRoyalBanRound = false;
    activeCynoRoyalBan = false;
    this.sigewinneCareOwnerId = null;
    this.yelanParityOwnerId = null;
    this.yelanParityRound = false;
    activeYelanSameParity = false;
    this.varkaSumSlashTurn = false;
    activeVarkaSumSlash = false;
    this.baizhuShieldOwnerId = null;
    activeBaizhuShield = false;
    this.ittoUshiOwnerId = null;
    this.alhaithamOwnerId = null;
    this.alhaithamAllowedRanks = null;
    activeAlhaithamAllowedRanks = null;
    this.emiliePerfumeOwnerId = null;
    this.emilieRequiredSuit = null;
    activeEmilieRequiredSuit = null;
    this.zibaiMinStepOwnerId = null;
    this.zibaiRedirectTargetId = null;
    activeZibaiMinStep = false;
    this.vesnaSpringOwnerId = null;
    this.ayatoCloneReady = false;
    this.arlecchinoBondOwnerId = null;
    this.flinsLanternOwnerId = null;
    this.players.forEach((p) => {
      p._skillForcedComboIds = null;
      p._skillBoostedCardIds = null;
    });
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

    // Nếu có bộ đánh 1 phát hết sạch bài trên tay luôn -> Đánh thắng ngay lập tức!
    const isYoimiyaChainInstant =
      this.yoimiyaChainFuseReady && this.getPlayerActiveCharId(bot) === 'yoimiya';
    const instantWinMove = validMoves.find(
      (m) =>
        m.length === bot.hand.length ||
        (isYoimiyaChainInstant && m.length >= 1 && m.length === bot.hand.length - 1)
    );
    if (instantWinMove) {
      bot._skillForcedComboIds = null;
      bot._skillBoostedCardIds = null;
      this.playCombo(bot, instantWinMove);
      return;
    }

    // Nếu Bot vừa kích hoạt Kỹ Năng tạo / ghép ra một bộ bài hoàn chỉnh (Vodyanitsa, Escoffier, Linnea, Nefer, Sandrone, Chasca, Tartaglia, Varka, Xianyun, Xiao, Durin...)
    // thì ngay sau khi hết Hoạt Ảnh Nộ, Bot tung ngay bộ bài vừa được rèn ra để chặt/đè bàn!
    if (Array.isArray(bot._skillForcedComboIds) && bot._skillForcedComboIds.length > 0) {
      const forcedSet = new Set(bot._skillForcedComboIds);
      bot._skillForcedComboIds = null;
      const forcedCards = bot.hand.filter((c) => forcedSet.has(c.id));
      const forcedCombo = classifyCombo(forcedCards);
      const isForcedLegal =
        forcedCombo &&
        (!onlyFourPairs || forcedCombo.type === COMBO_TYPES.FOUR_PAIRS) &&
        (!this.mustPlay3Spade || forcedCombo.cards.some((c) => c.value === 0)) &&
        (!this.currentCombo || canBeatCombo(forcedCombo, this.currentCombo).ok);
      if (isForcedLegal) {
        bot._skillBoostedCardIds = null;
        this.playCombo(bot, forcedCombo);
        return;
      }
    }

    if (validMoves.length === 0) {
      bot._skillForcedComboIds = null;
      bot._skillBoostedCardIds = null;
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
      bot._skillForcedComboIds = null;
      bot._skillBoostedCardIds = null;
      if (!chosen) chosen = validMoves[0];
      this.playCombo(bot, chosen);
      return;
    }

    let chosen = null;
    try {
      chosen = this.chooseBotResponseMove(bot, validMoves);
    } catch (_) {}
    bot._skillForcedComboIds = null;
    bot._skillBoostedCardIds = null;
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
  // HỆ THỐNG TỰ HỌC THÓI QUEN ĐÁNH BÀI & DÙNG SKILL CỦA NGƯỜI CHƠI (ADAPTIVE AI MEMORY)
  // ============================================================================
  getHumanLearningProfile() {
    if (this.humanLearningProfile) return this.humanLearningProfile;
    const defaultProf = {
      totalLeads: 0,
      leadByType: { single: 0, pair: 0, triple: 0, straight: 0 },
      earlyLowSinglePlays: 0,
      earlyComboPlays: 0,
      twoPlaysCount: 0,
      twoPlaysSumHandLen: 0,
      skillUsesTotal: 0,
      skillOnLeadCount: 0,
      skillOnResponseCount: 0,
      skillSumHandLen: 0,
      skillSumMinOppLen: 0,
      skillByChar: {},
    };
    try {
      const raw = localStorage.getItem('tlmn_bot_learned_human_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.humanLearningProfile = {
            ...defaultProf,
            ...parsed,
            leadByType: { ...defaultProf.leadByType, ...(parsed.leadByType || {}) },
            skillByChar: { ...(parsed.skillByChar || {}) },
          };
          return this.humanLearningProfile;
        }
      }
    } catch (_) {}
    this.humanLearningProfile = defaultProf;
    return this.humanLearningProfile;
  }

  saveHumanLearningProfile() {
    if (!this.humanLearningProfile) return;
    try {
      localStorage.setItem('tlmn_bot_learned_human_v1', JSON.stringify(this.humanLearningProfile));
    } catch (_) {}
  }

  async syncGlobalAiBrainWithCloud(pushUpdate = false) {
    if (this._syncingAiBrain) return;
    this._syncingAiBrain = true;
    try {
      const localProf = this.getHumanLearningProfile();
      const res = await fetch(`https://textdb.dev/api/data/tlmn_bkp_global_ai_brain_v1?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const text = await res.text();
        const cloudProf = this.decodeCloudPayload(text);
        if (cloudProf && typeof cloudProf === 'object') {
          localProf.totalLeads = Math.max(localProf.totalLeads || 0, cloudProf.totalLeads || 0);
          localProf.earlyLowSinglePlays = Math.max(
            localProf.earlyLowSinglePlays || 0,
            cloudProf.earlyLowSinglePlays || 0
          );
          localProf.earlyComboPlays = Math.max(localProf.earlyComboPlays || 0, cloudProf.earlyComboPlays || 0);
          if ((cloudProf.twoPlaysCount || 0) > (localProf.twoPlaysCount || 0)) {
            localProf.twoPlaysCount = cloudProf.twoPlaysCount;
            localProf.twoPlaysSumHandLen = cloudProf.twoPlaysSumHandLen || 0;
          }
          if ((cloudProf.skillUsesTotal || 0) > (localProf.skillUsesTotal || 0)) {
            localProf.skillUsesTotal = cloudProf.skillUsesTotal;
            localProf.skillOnLeadCount = cloudProf.skillOnLeadCount || 0;
            localProf.skillOnResponseCount = cloudProf.skillOnResponseCount || 0;
            localProf.skillSumHandLen = cloudProf.skillSumHandLen || 0;
            localProf.skillSumMinOppLen = cloudProf.skillSumMinOppLen || 0;
          }
          if (cloudProf.skillByChar && typeof cloudProf.skillByChar === 'object') {
            for (const [cid, cStat] of Object.entries(cloudProf.skillByChar)) {
              const cur = localProf.skillByChar[cid];
              if (!cur || (cStat && cStat.uses > cur.uses)) {
                localProf.skillByChar[cid] = { ...cStat };
              }
            }
          }
          this.saveHumanLearningProfile();
        }
      }
      if (pushUpdate) {
        await fetch('https://textdb.dev/api/data/tlmn_bkp_global_ai_brain_v1', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: this.encodeCloudPayload(localProf),
        });
      }
    } catch (_) {}
    this._syncingAiBrain = false;
  }

  resetMatchPlayerMemory() {
    this.matchPlayerMemory = [0, 1, 2, 3].map(() => ({
      passedPairCeiling: 99,
      pairPassCount: 0,
      passedTripleCeiling: 99,
      triplePassCount: 0,
      passedStraightByLen: {},
      straightPassCount: 0,
      passedSingleCeiling: 99,
      singlePassCount: 0,
      lowSinglesPlayed: 0,
      multiCombosPlayed: 0,
    }));
  }

  getMatchPlayerMemory(playerId) {
    if (!Array.isArray(this.matchPlayerMemory) || this.matchPlayerMemory.length < 4) {
      this.resetMatchPlayerMemory();
    }
    return this.matchPlayerMemory[playerId] || this.matchPlayerMemory[0];
  }

  recordPlayerPlayBehavior(player, combo) {
    if (!player || !combo) return;
    const mem = this.getMatchPlayerMemory(player.id);
    const handLenBefore = player.hand ? player.hand.length : 0;

    if (combo.type === COMBO_TYPES.SINGLE && combo.highRank <= 6) {
      mem.lowSinglesPlayed++;
    } else if (combo.length >= 2 && !combo.isBomb) {
      mem.multiCombosPlayed++;
    }
    if (combo.type === COMBO_TYPES.PAIR && combo.highRank >= mem.passedPairCeiling) {
      mem.passedPairCeiling = 99;
    }

    if (!player.isBot) {
      const prof = this.getHumanLearningProfile();
      if (!this.currentCombo) {
        prof.totalLeads = (prof.totalLeads || 0) + 1;
        if (prof.leadByType[combo.type] !== undefined) {
          prof.leadByType[combo.type]++;
        }
      }
      if (handLenBefore >= 8) {
        if (combo.type === COMBO_TYPES.SINGLE && combo.highRank <= 6) {
          prof.earlyLowSinglePlays = (prof.earlyLowSinglePlays || 0) + 1;
        } else if (combo.length >= 2 && !combo.isBomb) {
          prof.earlyComboPlays = (prof.earlyComboPlays || 0) + 1;
        }
      }
      if (combo.highRank === 12) {
        prof.twoPlaysCount = (prof.twoPlaysCount || 0) + 1;
        prof.twoPlaysSumHandLen = (prof.twoPlaysSumHandLen || 0) + handLenBefore;
      }
      this.saveHumanLearningProfile();
    }
  }

  recordPlayerPassBehavior(player, tableCombo) {
    if (!player || !tableCombo || tableCombo.isBomb) return;
    const mem = this.getMatchPlayerMemory(player.id);
    const effRank =
      activeKokomiReverseRank && tableCombo.highRank < 12
        ? 11 - tableCombo.highRank
        : tableCombo.highRank;

    if (tableCombo.type === COMBO_TYPES.PAIR) {
      mem.pairPassCount++;
      if (effRank < mem.passedPairCeiling) mem.passedPairCeiling = effRank;
    } else if (tableCombo.type === COMBO_TYPES.TRIPLE) {
      mem.triplePassCount++;
      if (effRank < mem.passedTripleCeiling) mem.passedTripleCeiling = effRank;
    } else if (tableCombo.type === COMBO_TYPES.STRAIGHT) {
      mem.straightPassCount++;
      const len = tableCombo.length;
      const prev = mem.passedStraightByLen[len] ?? 99;
      if (effRank < prev) mem.passedStraightByLen[len] = effRank;
    } else if (tableCombo.type === COMBO_TYPES.SINGLE && player.hand.length <= 6) {
      mem.singlePassCount++;
      if (effRank < mem.passedSingleCeiling) mem.passedSingleCeiling = effRank;
    }
  }

  recordPlayerSkillBehavior(player, charId) {
    if (!player || player.isBot || !charId || charId === 'none') return;
    const prof = this.getHumanLearningProfile();
    const opps = this.players.filter(
      (p) => p.active && p.id !== player.id && p.finishRank === null && p.hand.length > 0
    );
    const minOppLen = opps.length > 0 ? Math.min(...opps.map((p) => p.hand.length)) : 13;
    const isLead = !this.currentCombo;
    const myHandLen = player.hand ? player.hand.length : 0;

    prof.skillUsesTotal = (prof.skillUsesTotal || 0) + 1;
    if (isLead) {
      prof.skillOnLeadCount = (prof.skillOnLeadCount || 0) + 1;
    } else {
      prof.skillOnResponseCount = (prof.skillOnResponseCount || 0) + 1;
    }
    prof.skillSumHandLen = (prof.skillSumHandLen || 0) + myHandLen;
    prof.skillSumMinOppLen = (prof.skillSumMinOppLen || 0) + minOppLen;

    if (!prof.skillByChar[charId]) {
      prof.skillByChar[charId] = { uses: 0, onLead: 0, sumHandLen: 0, sumMinOppLen: 0 };
    }
    const cs = prof.skillByChar[charId];
    cs.uses++;
    if (isLead) cs.onLead++;
    cs.sumHandLen += myHandLen;
    cs.sumMinOppLen += minOppLen;

    this.saveHumanLearningProfile();
  }

  getNextActiveOpponent(bot) {
    const dir = this.turnDirection === -1 ? -1 : 1;
    for (let step = 1; step < 4; step++) {
      const nextId = (bot.id + step * dir + 16) % 4;
      const p = this.players[nextId];
      if (p && p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0) {
        return p;
      }
    }
    return null;
  }

  // ============================================================================
  // MASTER TIẾN LÊN MIỀN NAM AI BRAIN (XẾP BỘ TỐI ƯU, TÍNH ĐƯỜNG THẮNG & XẢ RÁC LẺ)
  // ============================================================================
  partitionHandOptimally(hand, allowBreakBombs = false) {
    const usable = hand.filter(
      (c) =>
        !(activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(c.id)) &&
        !(activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(c.id))
    );
    const counts = new Array(13).fill(0);
    usable.forEach((c) => counts[c.rankIndex]++);

    let bombCombos = 0;
    if (!allowBreakBombs) {
      // 1. Tách Tứ Quý cố định trước
      for (let r = 0; r < 13; r++) {
        if (counts[r] === 4) {
          counts[r] = 0;
          bombCombos++;
        }
      }
      // 2. Tách 4 Đôi Thông / 3 Đôi Thông
      let r = 0;
      while (r <= 9) {
        let streak = 0;
        while (r + streak <= 11 && counts[r + streak] >= 2) {
          streak++;
        }
        if (streak >= 4) {
          for (let k = 0; k < 4; k++) counts[r + k] -= 2;
          bombCombos++;
          r += 4;
        } else if (streak === 3) {
          for (let k = 0; k < 3; k++) counts[r + k] -= 2;
          bombCombos++;
          r += 3;
        } else {
          r += Math.max(1, streak);
        }
      }
    }

    // Quân 2 (rankIndex = 12) không nằm trong Sảnh: tính riêng thành Sám 2 / Đôi 2 / Lẻ 2
    const twosCount = counts[12];
    const twosTurns = twosCount > 0 ? 1 : 0;
    const twosBossSingle = twosCount === 1 ? 1 : 0;
    const twosMultiCombo = twosCount >= 2 ? 1 : 0;

    // Giải bài toán phân hoạch tối ưu trên counts[0..11] (3..A) bằng quy hoạch động / nhánh cận có nhớ
    const memo = new Map();
    const isRev = !!activeKokomiReverseRank;
    const effRank = (r) => (isRev && r < 12 ? 11 - r : r);

    const solve = (arr) => {
      const key = arr.join(',');
      if (memo.has(key)) return memo.get(key);

      let firstR = -1;
      for (let i = 0; i <= 11; i++) {
        if (arr[i] > 0) {
          firstR = i;
          break;
        }
      }

      if (firstR === -1) {
        const emptyRes = {
          score: 0,
          turns: 0,
          trashSingles: 0,
          veryLowSingles: 0,
          bossSingles: 0,
          multiCombos: 0,
          combos: [],
        };
        memo.set(key, emptyRes);
        return emptyRes;
      }

      let best = null;
      const consider = (cand) => {
        if (!best || cand.score > best.score) {
          best = cand;
        }
      };

      // Nhánh 1: Thử tạo Sảnh bắt đầu từ firstR (độ dài L >= 3)
      let maxLen = 0;
      while (firstR + maxLen <= 11 && arr[firstR + maxLen] > 0) {
        maxLen++;
      }
      if (maxLen >= 3) {
        for (let len = maxLen; len >= 3; len--) {
          const nextArr = [...arr];
          for (let k = 0; k < len; k++) nextArr[firstR + k]--;
          const sub = solve(nextArr);
          const topR = firstR + len - 1;
          // Ưu tiên Sảnh giải phóng bài thấp và giảm số lượt đánh
          const straightBonus = -110 + len * 18 + (effRank(firstR) <= 4 ? 14 : 0);
          consider({
            score: sub.score + straightBonus,
            turns: sub.turns + 1,
            trashSingles: sub.trashSingles,
            veryLowSingles: sub.veryLowSingles,
            bossSingles: sub.bossSingles,
            multiCombos: sub.multiCombos + 1,
            combos: [{ type: COMBO_TYPES.STRAIGHT, startRank: firstR, highRank: topR, length: len }, ...sub.combos],
          });
        }
      }

      // Nhánh 2: Nếu ở firstR có >= 3 lá -> Thử lập Sám Cô
      if (arr[firstR] >= 3) {
        const nextArr = [...arr];
        nextArr[firstR] -= 3;
        const sub = solve(nextArr);
        consider({
          score: sub.score - 110 + 28,
          turns: sub.turns + 1,
          trashSingles: sub.trashSingles,
          veryLowSingles: sub.veryLowSingles,
          bossSingles: sub.bossSingles,
          multiCombos: sub.multiCombos + 1,
          combos: [{ type: COMBO_TYPES.TRIPLE, startRank: firstR, highRank: firstR, length: 3 }, ...sub.combos],
        });
      }

      // Nhánh 3: Nếu ở firstR có >= 2 lá -> Thử lập Đôi
      if (arr[firstR] >= 2) {
        const nextArr = [...arr];
        nextArr[firstR] -= 2;
        const sub = solve(nextArr);
        const er = effRank(firstR);
        const pairBonus = -110 + 22 + (er >= 9 ? 10 : 0);
        consider({
          score: sub.score + pairBonus,
          turns: sub.turns + 1,
          trashSingles: sub.trashSingles,
          veryLowSingles: sub.veryLowSingles,
          bossSingles: sub.bossSingles,
          multiCombos: sub.multiCombos + 1,
          combos: [{ type: COMBO_TYPES.PAIR, startRank: firstR, highRank: firstR, length: 2 }, ...sub.combos],
        });
      }

      // Nhánh 4: Tách 1 lá ở firstR làm Bài Lẻ
      {
        const nextArr = [...arr];
        nextArr[firstR] -= 1;
        const sub = solve(nextArr);
        const er = effRank(firstR);
        const isTrash = er <= 8 ? 1 : 0; // 3..J lẻ là bài cần xả sớm
        const isVeryLow = er <= 5 ? 1 : 0; // 3..8 lẻ rất khó chạy cuối ván
        const isBoss = er >= 10 ? 1 : 0; // K, A lẻ là quân cướp cái
        const singleScore =
          -110 -
          (isTrash ? 95 + (8 - er) * 7 : 0) -
          (isVeryLow ? 45 : 0) +
          (isBoss ? 16 + (er - 9) * 8 : 0);
        consider({
          score: sub.score + singleScore,
          turns: sub.turns + 1,
          trashSingles: sub.trashSingles + isTrash,
          veryLowSingles: sub.veryLowSingles + isVeryLow,
          bossSingles: sub.bossSingles + isBoss,
          multiCombos: sub.multiCombos,
          combos: [{ type: COMBO_TYPES.SINGLE, startRank: firstR, highRank: firstR, length: 1 }, ...sub.combos],
        });
      }

      memo.set(key, best);
      return best;
    };

    const basePlan = solve(counts.slice(0, 12));
    return {
      score: basePlan.score,
      totalTurns: basePlan.turns + twosTurns + bombCombos,
      trashSinglesCount: basePlan.trashSingles,
      veryLowSinglesCount: basePlan.veryLowSingles,
      bossSinglesCount: basePlan.bossSingles + twosBossSingle,
      multiCombosCount: basePlan.multiCombos + twosMultiCombo,
      bombCombosCount: bombCombos,
      plannedCombos: basePlan.combos,
    };
  }

  isMoveUnbeatableByOpponents(bot, move, onlyUnpassed = false) {
    if (!move) return false;
    const opps = this.players.filter(
      (p) =>
        p.active &&
        p.id !== bot.id &&
        p.finishRank === null &&
        p.hand.length > 0 &&
        (!onlyUnpassed || !p.passed)
    );
    if (opps.length === 0) return true;
    for (const opp of opps) {
      const counters = getValidMoves(opp.hand, move, false, false);
      if (counters.length > 0) return false;
    }
    return true;
  }

  // Kiểm tra xem nếu Bot đánh `move` ra bàn, có đối thủ nào đỡ được VÀ hết sạch bài Về Nhất ngay lập tức (Mate in 1 cho đối thủ) không!
  doesMoveAllowOpponentInstantWin(bot, move, onlyUnpassed = false) {
    if (!move) return false;
    const opps = this.players.filter(
      (p) =>
        p.active &&
        p.id !== bot.id &&
        p.finishRank === null &&
        p.hand.length > 0 &&
        (!onlyUnpassed || !p.passed)
    );
    for (const opp of opps) {
      if (opp.hand.length > move.length && opp.hand.length < 6) {
        // Đối thủ có thể tung Hàng chặt nếu còn đúng 6 hoặc 8 lá, còn bình thường chỉ hết bài khi số lá bằng độ dài bộ đè
        continue;
      }
      const counters = getValidMoves(opp.hand, move, false, false);
      if (counters.some((c) => c.length === opp.hand.length)) {
        return true;
      }
    }
    return false;
  }

  // Đếm số đối thủ có khả năng đỡ được `move` (0 = Bất bại hoàn toàn, 1 = Cận Boss chỉ 1 nhà đỡ được)
  countOpponentsWhoCanBeat(bot, move, onlyUnpassed = false) {
    if (!move) return 99;
    const opps = this.players.filter(
      (p) =>
        p.active &&
        p.id !== bot.id &&
        p.finishRank === null &&
        p.hand.length > 0 &&
        (!onlyUnpassed || !p.passed)
    );
    let count = 0;
    for (const opp of opps) {
      const counters = getValidMoves(opp.hand, move, false, false);
      if (counters.length > 0) count++;
    }
    return count;
  }

  // ============================================================================
  // CHESS ENDGAME CHECKMATE SOLVER (DUYỆT CÂY TRÒ CHƠI AND-OR ĐA TẦNG TÌM ĐƯỜNG THẮNG 100%)
  // Tìm chuỗi nước đi cưỡng bức thắng (Forced Win / Mate in N) từ tới 10 lá bài:
  // - Kết hợp các cặp "Thí Tốt Dẫn Đường - Boss Cướp Cái" `(lowMove, bossReEntry)` cùng loại
  // - Cộng các bộ Bất Bại (`unbeatableMove`)
  // - Kết thúc bằng 1 bộ cuối cùng bất kỳ (`finalCombo`) chạm bàn là hết bài!
  // ============================================================================
  findForcedCheckmateMoveFromLead(bot, hand, candidateMoves = null, depth = 0, memo = new Map()) {
    if (!hand || hand.length === 0) return null;
    if (depth > 6) return null;

    const singlePlay = classifyCombo(hand);
    if (singlePlay && (depth > 0 || !this.mustPlay3Spade || singlePlay.cards.some((c) => c.value === 0))) {
      return singlePlay;
    }

    const handKey = hand
      .map((c) => c.id)
      .sort()
      .join('|');
    if (depth > 0 && memo.has(handKey)) {
      return memo.get(handKey);
    }

    const moves =
      candidateMoves ||
      getValidMoves(hand, null, depth === 0 ? this.mustPlay3Spade : false, false).filter((m) => !m.isBomb);

    // 1. ƯU TIÊN SỐ 1: Tìm cặp Đòn Phối Hợp "(Lá/Bộ Nhỏ Dẫn Đường -> Quân Boss Cùng Loại Cướp Lại Cái)"
    // Giống hệt Cờ Vua thí Tốt mở đường rồi đưa Hậu vào chiếu hết:
    // Đánh bộ nhỏ trước (nếu không đút bài cho đối thủ về luôn), đối thủ đỡ cỡ nào mình cũng có Quân Boss Bất Bại cùng loại đè lại lấy Cái!
    const lowMoves = [...moves]
      .filter((m) => !this.isMoveUnbeatableByOpponents(bot, m, false))
      .sort((a, b) => a.highValue - b.highValue || b.length - a.length);

    for (const lowMove of lowMoves) {
      if (this.doesMoveAllowOpponentInstantWin(bot, lowMove, false)) continue;
      const lowIds = new Set(lowMove.cards.map((c) => c.id));
      const remAfterLow = hand.filter((c) => !lowIds.has(c.id));
      // Tìm trong phần bài còn lại 1 bộ `bossReEntry` cùng loại đè được `lowMove` và BẤT BẠI trước mọi đối thủ!
      const reEntries = getValidMoves(remAfterLow, lowMove, false, false).filter(
        (re) => !re.isBomb && re.type === lowMove.type && re.length === lowMove.length && this.isMoveUnbeatableByOpponents(bot, re, false)
      );
      if (reEntries.length > 0) {
        reEntries.sort((a, b) => a.highValue - b.highValue);
        const bossReEntry = reEntries[0];
        const bossIds = new Set(bossReEntry.cards.map((c) => c.id));
        const remAfterBoth = remAfterLow.filter((c) => !bossIds.has(c.id));
        if (remAfterBoth.length === 0) {
          if (depth > 0) memo.set(handKey, lowMove);
          return lowMove;
        }
        const nextWin = this.findForcedCheckmateMoveFromLead(bot, remAfterBoth, null, depth + 1, memo);
        if (nextWin) {
          if (depth > 0) memo.set(handKey, lowMove);
          return lowMove;
        }
      }
    }

    // 2. ƯU TIÊN SỐ 2: Đánh bộ BẤT BẠI (`unbeatableMove`) thắng trắng vòng hiện tại rồi tiếp tục chuỗi Chiếu Hết trên phần bài còn lại!
    const unbeatableMoves = [...moves]
      .filter((m) => this.isMoveUnbeatableByOpponents(bot, m, false))
      .sort((a, b) => b.length - a.length || a.highValue - b.highValue);

    for (const ubMove of unbeatableMoves) {
      const ubIds = new Set(ubMove.cards.map((c) => c.id));
      const remHand = hand.filter((c) => !ubIds.has(c.id));
      if (remHand.length === 0) {
        if (depth > 0) memo.set(handKey, ubMove);
        return ubMove;
      }
      const nextWin = this.findForcedCheckmateMoveFromLead(bot, remHand, null, depth + 1, memo);
      if (nextWin) {
        if (depth > 0) memo.set(handKey, ubMove);
        return ubMove;
      }
    }

    if (depth > 0) memo.set(handKey, null);
    return null;
  }

  // ============================================================================
  // HÀM LƯỢNG GIÁ THẾ CỜ KIỂU STOCKFISH (POSITIONAL DEFICIT & ESCORT PAIRING)
  // Tính chính xác số bộ bài yếu "Chưa Có Quân Chủ Lực Hộ Tống" (`deficitToForcedWin`):
  // - Mỗi quân Boss/Cận Boss loại T bảo kê được cho 1 quân nhỏ cùng loại T.
  // - Bộ cuối cùng đánh ra khi hết bài được miễn phí 1 lượt thoát.
  // - Khi `deficitToForcedWin === 0`: Tay bài đã vào Thế Thắng Cưỡng Bức!
  // ============================================================================
  evaluateChessPosition(bot, hand, allowBreakBombs = false) {
    const plan = this.partitionHandOptimally(hand, allowBreakBombs);
    const usable = sortCardsAsc(
      hand.filter(
        (c) =>
          !(activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(c.id)) &&
          !(activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(c.id))
      )
    );
    const usedIds = new Set();
    const concreteCombos = [];

    // Dựng các bộ bài thực tế từ `plan.plannedCombos` để kiểm tra sức mạnh đối kháng với bài đối thủ
    for (const cb of plan.plannedCombos) {
      if (cb.type === COMBO_TYPES.STRAIGHT) {
        const stCards = [];
        for (let r = cb.startRank; r <= cb.highRank; r++) {
          const pick = usable.find((c) => !usedIds.has(c.id) && c.rankIndex === r);
          if (pick) {
            usedIds.add(pick.id);
            stCards.push(pick);
          }
        }
        const comboObj = classifyCombo(stCards);
        if (comboObj) concreteCombos.push(comboObj);
      } else {
        const group = usable.filter((c) => !usedIds.has(c.id) && c.rankIndex === cb.highRank).slice(0, cb.length);
        group.forEach((c) => usedIds.add(c.id));
        const comboObj = classifyCombo(group);
        if (comboObj) concreteCombos.push(comboObj);
      }
    }
    // Thêm nhóm quân 2 (nếu có)
    const twos = usable.filter((c) => !usedIds.has(c.id) && c.rankIndex === 12);
    if (twos.length > 0) {
      const twoCombo = classifyCombo(twos);
      if (twoCombo) concreteCombos.push(twoCombo);
    }

    // Phân loại từng bộ theo nhóm (type + length) thành: Boss (bất bại), Strong (chỉ <= 1 đối thủ đỡ được), Low (bị đè dễ)
    const byBucket = new Map();
    let totalBoss = 0;
    let totalStrong = 0;

    for (const m of concreteCombos) {
      const bucketKey = `${m.type}_${m.length}`;
      if (!byBucket.has(bucketKey)) {
        byBucket.set(bucketKey, { boss: 0, strong: 0, low: 0 });
      }
      const b = byBucket.get(bucketKey);
      const beaters = this.countOpponentsWhoCanBeat(bot, m, false);
      if (beaters === 0) {
        b.boss++;
        totalBoss++;
      } else if (beaters === 1 && m.highRank >= 9) {
        b.strong++;
        totalStrong++;
      } else {
        b.low++;
      }
    }

    // Ghép cặp Hộ Tống: Mỗi Boss/Strong trong cùng loại T dẫn đường được cho 1 bộ Low cùng loại T!
    let unescortedLow = 0;
    let excessBoss = 0;
    for (const b of byBucket.values()) {
      const escorts = b.boss + b.strong * 0.65;
      if (b.low > escorts) {
        unescortedLow += b.low - escorts;
      } else {
        excessBoss += escorts - b.low;
      }
    }
    // Các quân Boss dư thừa (như Heo lẻ / Đôi Heo) vẫn có thể cướp cái ở vòng khác để mở đường cho 1 bộ Low bất kỳ
    const finalUnescorted = Math.max(0, unescortedLow - excessBoss * 0.75);
    // Bộ cuối cùng thoát tay không cần quân hộ tống (vì đánh xuống là hết bài Về Nhất ngay)
    const deficitToForcedWin = Math.max(0, finalUnescorted - 1);

    return {
      plan,
      deficitToForcedWin,
      unescortedLow: finalUnescorted,
      totalBoss,
      totalStrong,
    };
  }

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

    // 2. Sử dụng Bộ Não Phân Hoạch Tối Ưu để biết chính xác mắt xích nào thực sự nằm trong Sảnh / Đôi tối ưu
    const optimalPlan = this.partitionHandOptimally(hand, false);
    const criticalStraightRanks = new Set();
    const plannedPairOrTripleRanks = new Set();
    const plannedTrashSingleRanks = new Set();

    optimalPlan.plannedCombos.forEach((cb) => {
      if (cb.type === COMBO_TYPES.STRAIGHT) {
        for (let r = cb.startRank; r <= cb.highRank; r++) {
          criticalStraightRanks.add(r);
        }
      } else if (cb.type === COMBO_TYPES.PAIR || cb.type === COMBO_TYPES.TRIPLE) {
        plannedPairOrTripleRanks.add(cb.highRank);
      } else if (cb.type === COMBO_TYPES.SINGLE && cb.highRank <= 8) {
        plannedTrashSingleRanks.add(cb.highRank);
      }
    });

    const comboCardIds = new Set();
    hand.forEach((c) => {
      if (
        bombRanks.has(c.rankIndex) ||
        criticalStraightRanks.has(c.rankIndex) ||
        plannedPairOrTripleRanks.has(c.rankIndex)
      ) {
        comboCardIds.add(c.id);
      }
    });

    return {
      rankCounts,
      bombRanks,
      criticalStraightRanks,
      plannedPairOrTripleRanks,
      plannedTrashSingleRanks,
      comboCardIds,
      optimalPlan,
    };
  }

  evaluateMoveBreakCost(move, struct, hand = null) {
    const { rankCounts, bombRanks, criticalStraightRanks, optimalPlan } = struct;
    let breakCost = 0;

    // 1. Nếu nước đi KHÔNG phải là tung Hàng (Bom) mà lại lấy bài trong Tứ Quý / 3-4 Đôi Thông -> Phạt cực nặng!
    if (!move.isBomb) {
      const touchesBomb = move.cards.some((c) => bombRanks.has(c.rankIndex));
      if (touchesBomb) {
        breakCost += 480;
      }
    }

    // 2. Nếu có truyền hand vào: So sánh trực tiếp Cấu Trúc Tối Ưu TRƯỚC và SAU nước đi!
    if (hand && optimalPlan) {
      const moveIds = new Set(move.cards.map((c) => c.id));
      const remHand = hand.filter((c) => !moveIds.has(c.id));
      const afterPlan = this.partitionHandOptimally(remHand, false);
      // Một nước đi chuẩn trong kế hoạch sẽ làm totalTurns giảm đi 1 (turnsAdded = 0)
      const turnsAdded = afterPlan.totalTurns - (optimalPlan.totalTurns - 1);
      const trashAdded = afterPlan.trashSinglesCount - optimalPlan.trashSinglesCount;
      const veryLowAdded = afterPlan.veryLowSinglesCount - optimalPlan.veryLowSinglesCount;

      if (turnsAdded > 0) {
        breakCost += turnsAdded * 115;
      }
      if (trashAdded > 0) {
        breakCost += trashAdded * 95;
      }
      if (veryLowAdded > 0) {
        breakCost += veryLowAdded * 45;
      }
      return breakCost;
    }

    // Fallback khi không truyền hand:
    if (move.type === COMBO_TYPES.SINGLE) {
      const r = move.cards[0].rankIndex;
      if (struct.plannedTrashSingleRanks && struct.plannedTrashSingleRanks.has(r)) {
        return breakCost; // Lá lẻ đã nằm sẵn trong danh sách rác lẻ cần xả!
      }
      if (rankCounts[r] === 2 && (!struct.plannedPairOrTripleRanks || struct.plannedPairOrTripleRanks.has(r))) {
        breakCost += r === 12 ? 65 : 120;
      } else if (rankCounts[r] === 3) {
        breakCost += 135;
      }
      if (rankCounts[r] === 1 && criticalStraightRanks.has(r)) {
        breakCost += 130;
      }
    } else if (move.type === COMBO_TYPES.PAIR) {
      const r = move.cards[0].rankIndex;
      if (rankCounts[r] === 3 && !criticalStraightRanks.has(r)) {
        breakCost += 85;
      }
      if (rankCounts[r] === 2 && criticalStraightRanks.has(r) && !struct.plannedPairOrTripleRanks?.has(r)) {
        breakCost += 105;
      }
    }

    return breakCost;
  }

  // ============================================================================
  // ĐỌC TÌNH HÌNH BÀN BÀI & CHIẾN THUẬT GIỮ HÀNG DỤ HEO / GIỮ BÀI CAO ENDGAME CHO BOT AI
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

    let opponentTwosCount = 0;
    let opponentHasPairOfTwos = false;
    activeOpponents.forEach((p) => {
      const twos = p.hand.filter((c) => c.rankIndex === 12).length;
      opponentTwosCount += twos;
      if (twos >= 2) opponentHasPairOfTwos = true;
    });

    const lowCardsCount = bot.hand.filter(
      (c) => c.rankIndex <= 6 && !struct.bombRanks.has(c.rankIndex)
    ).length;
    const highControlCount = bot.hand.filter(
      (c) => c.rankIndex >= 9 && !struct.bombRanks.has(c.rankIndex)
    ).length;
    const veryHighControlCount = bot.hand.filter(
      (c) => c.rankIndex >= 10 && !struct.bombRanks.has(c.rankIndex)
    ).length;
    const isWeakLowHand =
      bot.hand.length >= 4 &&
      (lowCardsCount >= Math.ceil(bot.hand.length * 0.45) ||
        veryHighControlCount <= 2 ||
        highControlCount <= 3);

    const shouldBreakBombForEndgame =
      hasBombs &&
      (minOpponentCards <= 4 ||
        ownerCards <= 3 ||
        bot.hand.length <= 5 ||
        (opponentTwosCount === 0 && (minOpponentCards <= 6 || bot.hand.length <= 6)));
    const shouldHoldBombToBaitHeo = hasBombs && !shouldBreakBombForEndgame;

    // 1. Nguy cơ bị CÓNG (Còn nguyên 13 lá khi đối thủ đã xuống <= 7 lá):
    const isCongRisk = bot.hand.length === 13 && minOpponentCards <= 7;

    // 2. Nguy cơ THỐI HEO / THỐI 3♠ thực sự khi đối thủ chỉ còn <= 3 lá:
    const bombRotDanger = shouldBreakBombForEndgame && minOpponentCards <= 4;
    const hasRotDanger =
      ((hasTwos || has3Spade) && minOpponentCards <= 3) || bombRotDanger;

    // 3. Thấy đối thủ SẮP VỀ ĐÍCH (Đối thủ còn <= 3 lá, hoặc người cầm cái còn <= 3 lá):
    const isLosingSoon =
      isCongRisk ||
      hasRotDanger ||
      minOpponentCards <= 3 ||
      ownerCards <= 3;

    // 4. Báo động đỏ TỬ CHIẾN (Đối thủ chỉ còn 1-2 lá trên tay):
    const isCriticalEndgame =
      minOpponentCards <= 2 ||
      ownerCards <= 2 ||
      (isCongRisk && minOpponentCards <= 5);

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
      lowCardsCount,
      highControlCount,
      veryHighControlCount,
      isWeakLowHand,
      shouldBreakBombForEndgame,
      shouldHoldBombToBaitHeo,
      isCongRisk,
      hasRotDanger,
      isLosingSoon,
      isCriticalEndgame,
    };
  }

  chooseBotLeadMove(bot, validMoves) {
    // 1. Nếu có bộ đánh 1 phát hết sạch bài trên tay luôn (hoặc Yoimiya đang bật Dây Pháo Liên Hoàn nổ hết lá cuối) -> Đánh thắng ngay!
    const isYoimiyaChainActive =
      this.yoimiyaChainFuseReady && this.getPlayerActiveCharId(bot) === 'yoimiya';
    const instantWin = validMoves.find(
      (m) =>
        m.length === bot.hand.length ||
        (isYoimiyaChainActive && m.length >= 1 && m.length === bot.hand.length - 1)
    );
    if (instantWin) return instantWin;

    const struct = this.analyzeBotHandStructure(bot.hand);
    const sit = this.analyzeBotTableSituation(bot, struct);
    const beforePlan = struct.optimalPlan || this.partitionHandOptimally(bot.hand, sit.shouldBreakBombForEndgame);

    const safeNonBombMoves = validMoves.filter((m) => {
      if (m.isBomb) return false;
      const touchesBomb = m.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      return !touchesBomb;
    });
    const nonBombMoves = validMoves.filter((m) => !m.isBomb);

    let pool = validMoves;
    if (sit.shouldHoldBombToBaitHeo && safeNonBombMoves.length > 0) {
      pool = safeNonBombMoves;
    } else if (nonBombMoves.length > 0) {
      pool = nonBombMoves;
    }

    // ==========================================================================
    // 2. CHESS ENDGAME CHECKMATE SOLVER (DUYỆT CÂY CHIẾU HẾT ĐA TẦNG):
    // Nếu tìm thấy chuỗi nước đi Cưỡng Bức Thắng 100% (Mate in N: kết hợp Thí Tốt Dẫn Đường + Boss Cướp Cái + Bộ Cuối):
    // Thực thi ngay nước đầu tiên trong chuỗi Chiếu Hết!
    // ==========================================================================
    const forcedCheckmateMove = this.findForcedCheckmateMoveFromLead(bot, bot.hand, pool);
    if (forcedCheckmateMove) {
      return forcedCheckmateMove;
    }

    const beforeChess = this.evaluateChessPosition(bot, bot.hand, sit.shouldBreakBombForEndgame);
    const humanProf = this.getHumanLearningProfile();
    const nextOpp = this.getNextActiveOpponent(bot);
    const activeOpps = this.players.filter(
      (p) => p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0
    );
    const humanOpp = activeOpps.find((p) => !p.isBot) || null;
    const targetOpp =
      humanOpp && humanOpp.hand.length <= sit.minOpponentCards + 2
        ? humanOpp
        : [...activeOpps].sort((a, b) => a.hand.length - b.hand.length)[0] || null;
    const targetMem = targetOpp ? this.getMatchPlayerMemory(targetOpp.id) : null;
    const avgHumanTwoHandLen =
      humanProf.twoPlaysCount > 0 ? humanProf.twoPlaysSumHandLen / humanProf.twoPlaysCount : 5.0;
    const earlyTotal = (humanProf.earlyLowSinglePlays || 0) + (humanProf.earlyComboPlays || 0);
    const humanEarlySingleRate =
      earlyTotal >= 4 ? humanProf.earlyLowSinglePlays / earlyTotal : 0.5;

    // ==========================================================================
    // 3. CHIẾN THUẬT MỞ VÒNG CHUẨN ENGINE CỜ VUA (MINIMAX 2-PLY + LƯỢNG GIÁ THẾ CỜ):
    // - Tránh tuyệt đối nước đi đút bài cho đối thủ Về Nhất ngay (Mate-in-1 Blunder Check).
    // - Tối ưu hóa giảm `deficitToForcedWin` (xả các bộ yếu chưa có quân hộ tống, giữ nguyên các quân Boss hộ tống).
    // - Ưu tiên đánh các bộ nhỏ có Quân Boss Cùng Loại đứng sau bảo kê (Escorted Lead) để đối thủ đỡ xong mình cướp lại Cái ngay trong vòng!
    // ==========================================================================
    const scored = pool.map((move) => {
      let score = 0;
      const usedIds = new Set(move.cards.map((c) => c.id));
      const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
      const afterChess = this.evaluateChessPosition(bot, remHand, sit.shouldBreakBombForEndgame);
      const afterPlan = afterChess.plan;

      const turnsAdded = afterPlan.totalTurns - (beforePlan.totalTurns - 1);
      const trashAdded = afterPlan.trashSinglesCount - beforePlan.trashSinglesCount;
      const veryLowAdded = afterPlan.veryLowSinglesCount - beforePlan.veryLowSinglesCount;
      const deficitReduced = beforeChess.deficitToForcedWin - afterChess.deficitToForcedWin;

      const touchesBomb = !move.isBomb && move.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      const contains3Spade = move.cards.some((c) => c.value === 0);
      const effHighRank =
        activeKokomiReverseRank && move.highRank < 12 ? 11 - move.highRank : move.highRank;
      const effHighValue =
        activeKokomiReverseRank && move.highRank < 12
          ? (11 - move.highRank) * 4 + (move.highCard?.suitIndex || 0)
          : move.highValue;

      if (move.isBomb) {
        score -= 5000;
      }

      // CHỐNG BLUNDER CỜ VUA (MATE IN 1): Nếu đánh nước này mà đối thủ đỡ được và hết bài luôn -> Phạt cực đại!
      if (this.doesMoveAllowOpponentInstantWin(bot, move, false)) {
        score -= 6500;
      }

      if (touchesBomb) {
        if (sit.shouldHoldBombToBaitHeo) {
          score -= 2500;
        } else if (sit.shouldBreakBombForEndgame) {
          score += 55 + move.length * 16;
        } else {
          score -= 1200;
        }
      }

      // 1. LƯỢNG GIÁ THẾ CỜ STOCKFISH (`deficitReduced`):
      // Thưởng lớn khi nước đi giúp giảm số bộ yếu thiếu quân hộ tống; phạt nặng nếu tự làm mất quân Boss hộ tống sớm!
      score += deficitReduced * 210;
      if (afterChess.deficitToForcedWin === 0 && afterPlan.totalTurns <= 3) {
        score += 240; // Đưa tay bài vào Thế Thắng Cưỡng Bức!
      }

      // 2. KIỂM TRA ĐÒN DẪN ĐƯỜNG CÓ BẢO KÊ (ESCORTED LEAD 2-PLY LOOKAHEAD):
      // Nếu đánh bộ nhỏ `move` mà trên tay còn giữ 1 bộ Boss/Strong cùng loại (`reEntry`) đè lại được đối thủ -> Thưởng chiến thuật!
      const hasSameTypeEscortInRem = getValidMoves(remHand, move, false, false).some(
        (re) => !re.isBomb && re.type === move.type && re.length === move.length && this.countOpponentsWhoCanBeat(bot, re, false) <= 1
      );
      if (hasSameTypeEscortInRem && effHighRank <= 8 && turnsAdded <= 0) {
        score += 85;
      }

      // 3. KỶ LUẬT GIỮ BỘ TỐI ƯU: Phạt cực nặng mọi nước mở vòng tự làm tăng số lượt đánh hoặc đẻ thêm rác lẻ!
      if (turnsAdded > 0) {
        score -= turnsAdded * 290;
      } else if (turnsAdded < 0) {
        score += Math.abs(turnsAdded) * 140;
      }
      if (trashAdded > 0) {
        score -= trashAdded * 240;
      } else if (trashAdded < 0) {
        score += Math.abs(trashAdded) * 95;
      }
      if (veryLowAdded < 0) {
        score += Math.abs(veryLowAdded) * 48;
      }

      // 4. Ưu tiên tuyệt đối nước đi phát huy Chiêu Nộ vừa bật trong lượt này
      if (this.mavuikaWrapStraightTurn && move.isMavuikaWrapStraight && !touchesBomb) {
        score += 360;
      }
      if (this.naviaFlushStraightTurn && move.isNaviaFlushStraight && !touchesBomb) {
        score += 360;
      }
      if (this.ganyuGapStraightTurn && move.isGapStraight && !touchesBomb) {
        score += 340;
      }
      if (this.xianyunStepStraightTurn && move.isStepStraight && !touchesBomb) {
        score += 340;
      }
      if (isYoimiyaChainActive && (move.type === COMBO_TYPES.SINGLE || move.type === COMBO_TYPES.PAIR) && !touchesBomb) {
        score += 220;
      }
      if (
        (!touchesBomb || sit.shouldBreakBombForEndgame) &&
        Array.isArray(bot._skillBoostedCardIds) &&
        bot._skillBoostedCardIds.length > 0 &&
        move.cards.some((c) => bot._skillBoostedCardIds.includes(c.id))
      ) {
        score += 180 + move.length * 25;
      }

      // 5. CHIẾN THUẬT PHỐI HỢP XẢ RÁC LẺ & XẢ BỘ (TRÁNH ĐỂ LẺ NHỎ CUỐI VÁN):
      const hasSingleTrapComboSetup =
        beforePlan.totalTurns <= 3 &&
        beforePlan.trashSinglesCount >= 1 &&
        beforePlan.bossSinglesCount >= 1 &&
        beforePlan.multiCombosCount >= 1;

      if (move.type === COMBO_TYPES.SINGLE) {
        if (turnsAdded <= 0 && trashAdded < 0 && effHighRank <= 8) {
          score += 58 + beforePlan.trashSinglesCount * 26 + (8 - effHighRank) * 9;
          if (hasSingleTrapComboSetup && sit.minOpponentCards >= 2) {
            score += 95;
          }
          const allMultiAreHigh = beforePlan.plannedCombos
            .filter((cb) => cb.length >= 2)
            .every((cb) => cb.highRank >= 7);
          if (allMultiAreHigh) {
            score += 65;
          }
        } else {
          score += 15;
        }
      } else if (move.type === COMBO_TYPES.STRAIGHT) {
        score += 78 + move.length * 11;
      } else if (move.type === COMBO_TYPES.TRIPLE) {
        score += 68;
      } else if (move.type === COMBO_TYPES.PAIR) {
        score += 62;
      }

      // 6. NGUYÊN TẮC ĐÁNH TỪ NHỎ ĐẾN LỚN (GIỮ BÀI TO Q, K, A, 2 ĐỂ DÀNH ĐỠ BÀI & KẾT LIỄU):
      if (sit.minOpponentCards === 1) {
        if (move.length >= 2) {
          score += 220 + move.length * 15 - effHighValue * 1.2;
        } else {
          score += effHighValue * 3.2;
        }
      } else {
        score -= effHighValue * 2.1;
        if (move.highRank === 12) {
          score -= 650;
        } else if (effHighRank === 11) {
          score -= move.type === COMBO_TYPES.SINGLE ? 260 : 145;
        } else if (effHighRank === 10) {
          score -= move.type === COMBO_TYPES.SINGLE ? 165 : 85;
        } else if (effHighRank === 9) {
          score -= move.type === COMBO_TYPES.SINGLE ? 85 : 40;
        }
      }

      // 7. Mở vòng giải phóng 3♠ sớm (tránh bị phạt Thối 3♠ cuối ván)
      if (contains3Spade && turnsAdded <= 0 && (!touchesBomb || sit.shouldBreakBombForEndgame)) {
        score += 45;
      }

      // 8. Nếu sau nước đi này chỉ còn đúng 1 bộ bài trên tay (chuẩn bị Về Nhất ở lượt kế):
      if (afterPlan.totalTurns === 1) {
        score += 160;
      }

      // 9. BẮT BÀI NGƯỜI CHƠI TỪ LỊCH SỬ BỎ LƯỢT & THÓI QUEN ĐÃ HỌC:
      if (targetMem && turnsAdded <= 0 && !touchesBomb) {
        if (move.type === COMBO_TYPES.PAIR && targetMem.pairPassCount > 0) {
          score += 75 + Math.min(3, targetMem.pairPassCount) * 22;
          if (effHighRank >= targetMem.passedPairCeiling - 1) score += 35;
        } else if (move.type === COMBO_TYPES.TRIPLE && targetMem.triplePassCount > 0) {
          score += 85;
        } else if (
          move.type === COMBO_TYPES.STRAIGHT &&
          targetMem.passedStraightByLen &&
          targetMem.passedStraightByLen[move.length] !== undefined
        ) {
          score += 95;
        }

        if (targetOpp && targetOpp.hand.length >= 2 && targetOpp.hand.length <= 3) {
          const likelyHoldingCombo =
            (targetMem.lowSinglesPlayed >= 3 && targetMem.multiCombosPlayed <= 1) ||
            (!targetOpp.isBot && humanEarlySingleRate >= 0.62 && targetMem.lowSinglesPlayed >= 2);
          const likelyHoldingSingles =
            (targetMem.lowSinglesPlayed === 0 && targetMem.multiCombosPlayed >= 2) ||
            (!targetOpp.isBot && humanEarlySingleRate <= 0.38 && targetMem.lowSinglesPlayed === 0);

          if (likelyHoldingCombo) {
            if (move.length === targetOpp.hand.length) {
              score -= 175;
            } else if (move.type === COMBO_TYPES.SINGLE) {
              score += 80;
            }
          } else if (likelyHoldingSingles && move.length >= 2) {
            score += 90;
          }
        }
      }

      if (
        nextOpp &&
        nextOpp.hand.length >= 2 &&
        nextOpp.hand.length <= 3 &&
        move.length === nextOpp.hand.length &&
        effHighRank <= 7 &&
        !hasSameTypeEscortInRem
      ) {
        score -= 125;
      }

      if (
        sit.shouldHoldBombToBaitHeo &&
        sit.opponentTwosCount > 0 &&
        move.type === COMBO_TYPES.SINGLE &&
        effHighRank >= 6 &&
        effHighRank <= 10 &&
        turnsAdded <= 0
      ) {
        score += avgHumanTwoHandLen <= 5.5 ? 95 : 55;
      }

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  chooseBotResponseMove(bot, validMoves) {
    // 1. Nếu đánh 1 nước hết bài Về Nhất luôn (hoặc Yoimiya đang bật Dây Pháo Liên Hoàn nổ hết lá cuối) -> Đánh ngay lập tức!
    const activeCharId = this.getPlayerActiveCharId(bot);
    const isYoimiyaChainActive =
      this.yoimiyaChainFuseReady && activeCharId === 'yoimiya';
    const instantWin = validMoves.find(
      (m) =>
        m.length === bot.hand.length ||
        (isYoimiyaChainActive && m.length >= 1 && m.length === bot.hand.length - 1)
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
    const beforeChess = this.evaluateChessPosition(bot, bot.hand, sit.shouldBreakBombForEndgame);
    const humanProf = this.getHumanLearningProfile();
    const nextOpp = this.getNextActiveOpponent(bot);
    const activeOpps = this.players.filter(
      (p) => p.active && p.id !== bot.id && p.finishRank === null && p.hand.length > 0
    );
    const humanOpp = activeOpps.find((p) => !p.isBot) || null;
    const targetOpp =
      humanOpp && humanOpp.hand.length <= sit.minOpponentCards + 2
        ? humanOpp
        : [...activeOpps].sort((a, b) => a.hand.length - b.hand.length)[0] || null;
    const targetMem = targetOpp ? this.getMatchPlayerMemory(targetOpp.id) : null;
    const avgHumanTwoHandLen =
      humanProf.twoPlaysCount > 0 ? humanProf.twoPlaysSumHandLen / humanProf.twoPlaysCount : 5.0;
    const earlyTotal = (humanProf.earlyLowSinglePlays || 0) + (humanProf.earlyComboPlays || 0);
    const humanEarlySingleRate =
      earlyTotal >= 4 ? humanProf.earlyLowSinglePlays / earlyTotal : 0.5;
    const beforePlan = beforeChess.plan;

    // 3. CHESS CHECKMATE TAKEOVER (ĐOẠT CÁI CHIẾU HẾT ĐA TẦNG):
    // Nếu Bot đánh `move` cướp được Cái trong vòng này (`moveUnbeatable`) VÀ phần bài còn lại `remHand`
    // có chuỗi Chiếu Hết Cưỡng Bức 100% (`findForcedCheckmateMoveFromLead`) -> Tung đòn đoạt Cái ngay lập tức!
    for (const move of validMoves) {
      if (move.isBomb) continue;
      const touchesBomb = move.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      if (touchesBomb && sit.shouldHoldBombToBaitHeo) continue;
      const usedIds = new Set(move.cards.map((c) => c.id));
      const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
      const moveUnbeatable = this.isMoveUnbeatableByOpponents(bot, move, true);
      if (moveUnbeatable && this.findForcedCheckmateMoveFromLead(bot, remHand, null)) {
        return move;
      }
      const remCombo = classifyCombo(remHand);
      if (remCombo && this.isMoveUnbeatableByOpponents(bot, remCombo, false) && !this.doesMoveAllowOpponentInstantWin(bot, move, true)) {
        return move;
      }
    }

    // 4. ĐÁNH GIÁ TỪNG NƯỚC ĐỠ BÀI THEO MINIMAX 2-PLY & CẤU TRÚC TỐI ƯU:
    const candidates = validMoves.map((move) => {
      const usedIds = new Set(move.cards.map((c) => c.id));
      const remHand = bot.hand.filter((c) => !usedIds.has(c.id));
      const afterChess = this.evaluateChessPosition(bot, remHand, sit.shouldBreakBombForEndgame);
      const afterPlan = afterChess.plan;

      const turnsAdded = afterPlan.totalTurns - (beforePlan.totalTurns - 1);
      const trashAdded = afterPlan.trashSinglesCount - beforePlan.trashSinglesCount;
      const veryLowAdded = afterPlan.veryLowSinglesCount - beforePlan.veryLowSinglesCount;
      const deficitDelta = afterChess.deficitToForcedWin - beforeChess.deficitToForcedWin;

      const touchesBomb = !move.isBomb && move.cards.some((c) => struct.bombRanks.has(c.rankIndex));
      const isTwo = move.highRank === 12;
      const effHighRank =
        activeKokomiReverseRank && move.highRank < 12 ? 11 - move.highRank : move.highRank;
      const effHighValue =
        activeKokomiReverseRank && move.highRank < 12
          ? (11 - move.highRank) * 4 + (move.highCard?.suitIndex || 0)
          : move.highValue;
      const curEffRank =
        this.currentCombo && activeKokomiReverseRank && this.currentCombo.highRank < 12
          ? 11 - this.currentCombo.highRank
          : this.currentCombo
          ? this.currentCombo.highRank
          : 0;

      // CHỐNG BLUNDER MATE-IN-1: Nếu đánh `move` mà đối thủ còn lượt trong vòng đè được và hết sạch bài luôn -> Phạt cực nặng!
      const mateIn1BlunderPenalty = this.doesMoveAllowOpponentInstantWin(bot, move, true) ? 5500 : 0;

      // Chi phí phá vỡ cấu trúc bộ tối ưu
      let breakCost = 0;
      if (touchesBomb && !sit.shouldBreakBombForEndgame) {
        breakCost += 2000;
      }
      if (turnsAdded > 0) {
        breakCost += turnsAdded * 135;
      }
      if (trashAdded > 0) {
        breakCost += trashAdded * 110;
      }
      if (veryLowAdded > 0) {
        breakCost += veryLowAdded * 50;
      }
      // Chi phí thế cờ nếu làm mất quân Boss hộ tống sớm (`deficitDelta > 0`) hoặc thưởng nếu giảm `deficitToForcedWin`
      const chessPositionalCost =
        deficitDelta > 0.25 && !sit.isCriticalEndgame && afterPlan.totalTurns >= 2
          ? deficitDelta * 185
          : deficitDelta < 0
          ? deficitDelta * 140
          : 0;

      // Thưởng nếu nước đỡ này giúp giải phóng luôn 1 lá lẻ rác hoặc rút ngắn số lượt!
      const cleanStructureBonus =
        (turnsAdded < 0 ? Math.abs(turnsAdded) * 90 : 0) +
        (trashAdded < 0 ? Math.abs(trashAdded) * 55 : 0);

      const breakWeight = sit.isCriticalEndgame ? 0.12 : sit.isLosingSoon ? 0.45 : 1.0;

      // Ưu tiên ra quân vừa đủ lớn để đè (tiết kiệm quân lớn cho cuối ván)
      // Ngoại trừ khi có đối thủ chỉ còn 1 lá trên bàn đánh Lẻ -> Đập quân lớn nhất để khóa cửa!
      let cardValueTerm = effHighValue * 1.65;
      if (sit.minOpponentCards === 1 && this.currentCombo?.type === COMBO_TYPES.SINGLE) {
        cardValueTerm = -effHighValue * 1.4;
      }

      // Kỷ luật giữ Heo (2) và Át (A) / Già (K):
      let wasteHighCardPenalty = 0;
      if (!sit.isCriticalEndgame && afterPlan.totalTurns >= 2) {
        if (isTwo) {
          if (curEffRank <= 8 && sit.minOpponentCards >= 4) {
            wasteHighCardPenalty += 320;
          } else if (curEffRank <= 10 && sit.minOpponentCards >= 6) {
            wasteHighCardPenalty += 190;
          } else {
            wasteHighCardPenalty += 75;
          }
        } else if (effHighRank === 11 && curEffRank <= 6 && sit.minOpponentCards >= 5) {
          wasteHighCardPenalty += 115;
        } else if (effHighRank === 10 && curEffRank <= 4 && sit.minOpponentCards >= 6 && beforePlan.bossSinglesCount <= 1) {
          wasteHighCardPenalty += 65;
        }
      }

      const nearFinishBonus =
        afterPlan.totalTurns === 1 ? -145 : afterPlan.totalTurns === 2 && afterChess.deficitToForcedWin === 0 ? -95 : 0;

      // Ưu tiên mạnh các bộ bài kích hoạt đúng hiệu ứng Chiêu Nộ vừa bật trong lượt này
      let skillSynergyBonus = 0;
      if (!touchesBomb || sit.shouldBreakBombForEndgame) {
        if (this.mavuikaWrapStraightTurn && move.isMavuikaWrapStraight) {
          skillSynergyBonus -= 360;
        }
        if (this.naviaFlushStraightTurn && move.isNaviaFlushStraight) {
          skillSynergyBonus -= 360;
        }
        if (this.ganyuGapStraightTurn && move.isGapStraight) {
          skillSynergyBonus -= 340;
        }
        if (this.xianyunStepStraightTurn && move.isStepStraight) {
          skillSynergyBonus -= 340;
        }
        if (this.varkaSumSlashTurn && move.isVarkaSumSlash) {
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
        if (this.columbinaExtraTurnReady) {
          if (remHand.length > 0 && classifyCombo(remHand)) {
            skillSynergyBonus -= 950;
          } else {
            skillSynergyBonus -= 180;
          }
        }
        if (isYoimiyaChainActive && (move.type === COMBO_TYPES.SINGLE || move.type === COMBO_TYPES.PAIR)) {
          skillSynergyBonus -= 220;
        }
        if (
          Array.isArray(bot._skillBoostedCardIds) &&
          bot._skillBoostedCardIds.length > 0 &&
          move.cards.some((c) => bot._skillBoostedCardIds.includes(c.id))
        ) {
          skillSynergyBonus -= 260 + move.length * 25;
        }
      }

      const totalCost =
        mateIn1BlunderPenalty +
        breakCost * breakWeight +
        chessPositionalCost -
        cleanStructureBonus +
        cardValueTerm +
        wasteHighCardPenalty +
        nearFinishBonus +
        skillSynergyBonus;

      return {
        move,
        breakCost,
        turnsAdded,
        trashAdded,
        deficitDelta,
        touchesBomb,
        afterPlan,
        afterChess,
        effHighRank,
        curEffRank,
        totalCost,
      };
    });

    candidates.sort((a, b) => a.totalCost - b.totalCost);
    const best = candidates[0];

    // Tuyệt đối không tự xé Tứ Quý / Đôi Thông để đỡ bài thường khi chưa đến cuối ván!
    if (best.touchesBomb && sit.shouldHoldBombToBaitHeo) {
      return null;
    }

    // Chỉ bắt buộc đánh tiếp khi Bot VỪA MỚI bật Kỹ Năng ngay trong lượt này (tránh lỗi kẹt bot.skillUsed cả ván)
    const justBoostedThisTurn =
      Array.isArray(bot._skillBoostedCardIds) && bot._skillBoostedCardIds.length > 0;
    const mustFollowUpSkill =
      (!best.touchesBomb || sit.shouldBreakBombForEndgame) &&
      (justBoostedThisTurn ||
        (this.mavuikaWrapStraightTurn && activeCharId === 'mavuika') ||
        (this.naviaFlushStraightTurn && activeCharId === 'navia') ||
        (this.yoimiyaChainFuseReady && activeCharId === 'yoimiya') ||
        (this.ganyuGapStraightTurn && activeCharId === 'ganyu') ||
        (this.xianyunStepStraightTurn && activeCharId === 'xianyun') ||
        (this.mualaniCrossBeatTurn && activeCharId === 'mualani') ||
        (this.columbinaExtraTurnReady && activeCharId === 'columbina') ||
        (this.ayatoCloneReady && activeCharId === 'ayato') ||
        (this.varkaSumSlashTurn && activeCharId === 'varka'));
    if (mustFollowUpSkill) {
      return best.move;
    }

    // 5. QUYẾT ĐỊNH ĐÁNH HAY BỎ LƯỢT NHƯ CAO THỦ THỰC THỤ:
    // (A) Nếu sau khi đánh nước này mà Bot chỉ còn đúng 1 bộ trên tay (`afterPlan.totalTurns <= 1`) -> Đánh ngay để chuẩn bị Về Nhất!
    if (best.afterPlan.totalTurns <= 1 && !best.touchesBomb) {
      return best.move;
    }

    // (B) CHIẾN THUẬT NHỊN ĐÁNH KHI NGƯỜI HOẶC BOT TRƯỚC TRONG VÒNG NÀY ĐÃ KÍCH HOẠT KỸ NĂNG:
    // Nếu người/bot trước đã bật Kỹ Năng trong vòng này mà Bot đánh ra gặp bất lợi (dẫm bẫy Ushi/Bom/Gối/Thuế/Viện Phí/Đoạt Cái)
    // hoặc không được lợi rõ ràng -> BỎ QUA (không đánh), CHỈ ĐÁNH khi:
    // 1. Đối phương sắp thắng buộc phải chặn (`tac.isOpponentAboutToWin`), HOẶC
    // 2. Xả bài rác nhỏ/vừa thuần túy (`isPureTrashDump`) và không dẫm bẫy!
    const tac = this.getRoundSkillTacticalAssessment(bot);
    if (tac.oppSkillActiveInRound && !tac.passHasDirectDisadvantage && !tac.isOpponentAboutToWin) {
      const triggersVesnaRedSteal =
        this.vesnaSpringOwnerId !== null &&
        this.vesnaSpringOwnerId !== bot.id &&
        best.move.cards.some((c) => c.suitIndex >= 2);
      if (tac.playTriggersHardTrap || triggersVesnaRedSteal) {
        return null;
      }
      const isChopForCoins = Boolean(canBeatCombo(best.move, this.currentCombo).isChop);
      const isPureTrashDump =
        best.breakCost === 0 &&
        best.turnsAdded <= 0 &&
        best.trashAdded <= 0 &&
        !best.touchesBomb &&
        best.move.highRank <= 7 &&
        best.deficitDelta <= 0 &&
        best.afterPlan.totalTurns < beforePlan.totalTurns;
      if (!isChopForCoins && !isPureTrashDump) {
        return null;
      }
    }

    // (C) Khi đối thủ báo động đỏ chỉ còn 1-2 lá (`isCriticalEndgame`):
    // Chấp nhận xé bộ / tung bài lớn để chặn không cho đối thủ về đích!
    if (sit.isCriticalEndgame) {
      return best.move;
    }

    // (C) Khi bàn đấu chưa nguy cấp (đối thủ còn >= 3 lá):
    // 1. Không tự xé Sảnh / Đôi / Sám làm tăng số lượt đánh (`turnsAdded >= 1`) hoặc tạo thêm rác lẻ (`trashAdded >= 1`)
    if (best.turnsAdded >= 1 || best.trashAdded >= 1) {
      // Chỉ chấp nhận xé nhẹ nếu người cầm cái chỉ còn <= 3 lá và nước đánh là quân lớn kiểm soát bàn
      if (!(sit.ownerCards <= 3 && best.effHighRank >= 10 && best.turnsAdded <= 1)) {
        return null;
      }
    }

    // 2. Không đập Heo (2) lên bài nhỏ/trung bình (3..J) khi đối thủ còn >= 4 lá và mình còn >= 3 bộ bài
    if (
      best.move.highRank === 12 &&
      best.curEffRank <= 8 &&
      sit.minOpponentCards >= 4 &&
      best.afterPlan.totalTurns >= 2
    ) {
      return null;
    }

    // 3. Không phung phí quân Chủ Lực Hộ Tống (A / 2) làm hỏng thế cờ (`deficitDelta >= 0.6`) để đè bài nhỏ/trung bình khi ván bài còn dài
    if (
      best.effHighRank >= 11 &&
      best.curEffRank <= 7 &&
      sit.minOpponentCards >= 5 &&
      sit.ownerCards >= 5 &&
      (beforePlan.bossSinglesCount <= 1 || best.deficitDelta >= 0.6) &&
      best.afterPlan.totalTurns >= 3
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
    if (activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(cardId)) {
      sfx.pass();
      this.showComboBanner('☄️ LÁ BÀI ĐEN NÀY ĐANG BỊ THIÊN TINH CỦA ZHONGLI HÓA ĐÁ TRONG VÒNG NÀY!');
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
      const usableHand = human.hand.filter(
        (c) =>
          !(activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(c.id)) &&
          !(activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(c.id))
      );
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
          this.elCharSkillLabel.textContent = '🔒 Cần Trang Bị 5★';
        }
        this.btnCharSkill.disabled = true;
        this.btnCharSkill.classList.remove('skill-ready', 'skill-used');
        this.btnCharSkill.title =
          '🔒 Bạn phải vào Kho Đồ bấm Trang Bị Nhân Vật 5★ đã sở hữu thì mới sử dụng được Chiêu Nộ [Q] của nhân vật đó!';
      } else {
        if (this.elCharSkillLabel) {
          if (skill.isPassiveBet) {
            this.elCharSkillLabel.textContent = `💠 ${skill.name} (Nội Tại)`;
          } else if (human.skillUsed) {
            this.elCharSkillLabel.textContent = `${skill.icon} Đã dùng Nộ`;
          } else if (charId === 'escoffier' && skillCheck.ok) {
            const esSetup = this.findEscoffierPairRunSetup(human.hand, this.selectedCardIds);
            this.elCharSkillLabel.textContent = esSetup
              ? `🍰 Ghép ${esSetup.label} (+${RANKS[esSetup.targetRank]}♥) [Q]`
              : `${skill.icon} ${skill.name} [Q]`;
          } else {
            this.elCharSkillLabel.textContent = `${skill.icon} ${skill.name} [Q]`;
          }
        }
        this.btnCharSkill.disabled = !skillCheck.ok;
        this.btnCharSkill.classList.toggle('skill-ready', !!skillCheck.ok);
        this.btnCharSkill.classList.toggle('skill-used', !!human.skillUsed || !!skill.isPassiveBet);
        this.btnCharSkill.title = `${skill.icon} ${skill.charName} — Chiêu Nộ [Q] ${skill.name}: ${skill.shortDesc}${
          skillCheck.ok ? ' (Nhấn phím Q để tung Chiêu Nộ!)' : ` (${skillCheck.reason})`
        }`;
      }
    }

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
      if (!this.tutorialCompleted && this.tutorialStep === 5 && this.tutorialMatch2SkillUsed && !this.tutorialMatch2FirstCardPlayed) {
        this.renderTravelerGuide();
      }
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
    if (!this.tutorialCompleted && this.tutorialStep === 5 && this.tutorialMatch2SkillUsed && !this.tutorialMatch2FirstCardPlayed) {
      this.renderTravelerGuide();
    }
  }

  onHumanPlay(isAutoTimeout = false) {
    if (this.isGameOver || this.isBurstPlaying) return;
    if (!this.tutorialCompleted && this.tutorialStep === 5 && !this.tutorialMatch2SkillUsed) {
      this.showCenterToast('🌟 Nhà Lữ Hành: Hãy bấm vào nút [🔮 Chiêu Nộ Q] đang có mũi tên chỉ vào để thử Chiêu Nộ của Raiden Shogun trước nhé!');
      this.renderTravelerGuide();
      return;
    }
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);
    if (!combo) return;
    const isFourPairsCutAnytime =
      combo.type === COMBO_TYPES.FOUR_PAIRS &&
      this.currentCombo &&
      this.trickOwnerId !== this.mySeatId &&
      canBeatCombo(combo, this.currentCombo).ok;
    if (this.currentTurn !== this.mySeatId && !isFourPairsCutAnytime) return;

    if (!this.tutorialCompleted && this.tutorialStep === 5 && this.tutorialMatch2SkillUsed && !this.tutorialMatch2FirstCardPlayed) {
      const human = this.getLocalPlayer();
      // Bước 5.2: Đang cầm Cái mở vòng mới trên bàn trống (!this.currentCombo) -> Chỉ đánh Sám Cô 4-4-4 để mở vòng (thấy rõ bàn trống không nổ Phản Ứng Nguyên Tố) và nhử Bot Furina đè Sám Cô 7!
      if (!this.tutorialMatch2LeadPlayed && !this.currentCombo) {
        const isAllowedLead = combo.type === COMBO_TYPES.TRIPLE && combo.highRank === 1;
        if (!isAllowedLead) {
          if (human) {
            const triple4 = human.hand.filter((c) => c.rank === '4');
            if (triple4.length === 3) {
              this.selectedCardIds = new Set(triple4.map((c) => c.id));
              this.renderHumanHand();
              this.updateControls();
            }
          }
          this.showCenterToast('🌟 Nhà Lữ Hành: Hãy đánh bộ Sám Cô 4-4-4 (đã chọn sẵn) để mở vòng mới và nhử Bot Furina đè bài nhé!');
          this.renderTravelerGuide();
          return;
        }
        this.tutorialMatch2LeadPlayed = true;
        this.selectedCardIds.clear();
        this.companionCardIds.clear();
        if (!isAutoTimeout && human) {
          human.manualActionsInMatch = (human.manualActionsInMatch || 0) + 1;
          human.afkAutoTurns = 0;
        }
        this.playCombo(human, combo);
        clearTimeout(this.botTimer);

        // Kịch bản Bước 5.2 ➔ 5.3: Bot Furina (💧 Thủy) lập tức dùng Sám Cô 7 (7♣ 7♦ 7♥) đè lên Sám Cô 4 của bạn!
        this.botTimer = setTimeout(() => {
          if (this.isGameOver) return;
          const p1 = this.players[1];
          const p2 = this.players[2];
          const p3 = this.players[3];
          if (!p3 || !human) return;

          if (p1) p1.passed = true;
          if (p2) p2.passed = true;
          this.currentTurn = 3;
          const triple7Cards = p3.hand.filter((c) => c.rank === '7').slice(0, 3);
          const triple7Combo = classifyCombo(triple7Cards);
          if (triple7Combo) {
            this.playCombo(p3, triple7Combo);
            clearTimeout(this.botTimer);
          }
          const qTriple = human.hand.filter((c) => c.rank === 'Q');
          if (qTriple.length === 3) {
            this.selectedCardIds = new Set(qTriple.map((c) => c.id));
          }
          this.renderAll();
          this.updateControls();
          this.renderTravelerGuide();
        }, 750);
        return;
      }

      // Bước 5.3: Trên bàn ĐÃ CÓ Sám Cô 7 của Bot Furina (💧 Thủy) -> Người chơi đánh Sám Cô Q-Q-Q ĐÈ LÊN để nổ Phản Ứng Nguyên Tố!
      const isReactionCombo = combo.type === COMBO_TYPES.TRIPLE && combo.highRank === 9;
      if (!isReactionCombo || !this.currentCombo) {
        if (human) {
          const tripleQ = human.hand.filter((c) => c.rank === 'Q');
          if (tripleQ.length === 3) {
            this.selectedCardIds = new Set(tripleQ.map((c) => c.id));
            this.renderHumanHand();
            this.updateControls();
          }
        }
        this.showCenterToast('🌟 Nhà Lữ Hành: Hãy dùng bộ Sám Cô Q-Q-Q (đã chọn sẵn) ĐÈ LÊN Sám Cô 7 của Bot Furina để kích nổ Phản Ứng Nguyên Tố nhé!');
        this.renderTravelerGuide();
        return;
      }
      this.tutorialMatch2FirstCardPlayed = true;
      this.hideTravelerGuide();
    }

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
    if (!this.tutorialCompleted && this.tutorialStep === 5) {
      if (!this.tutorialMatch2SkillUsed) {
        this.showCenterToast('🌟 Nhà Lữ Hành: Đừng bỏ lượt! Hãy bấm vào nút [🔮 Chiêu Nộ Q] đang có mũi tên chỉ vào để chém đứt Đôi 3 của Bot Furina nhé!');
        this.renderTravelerGuide();
        return;
      }
      if (!this.tutorialMatch2FirstCardPlayed) {
        this.showCenterToast('🌟 Nhà Lữ Hành: Đừng bỏ lượt! Hãy dùng Sám Cô Q-Q-Q ĐÈ LÊN Sám Cô 7 của Bot Furina trên bàn để kích nổ Phản Ứng Nguyên Tố nhé!');
        this.renderTravelerGuide();
        return;
      }
    }
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
    this.players.forEach((p) => {
      if (p) p.readyForNextMatch = !!p.isBot;
    });

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
    this.syncGlobalAiBrainWithCloud(true);

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
    this.renderSummaryReadyStateUI();
    this.modalSummary.classList.remove('hidden');

    if (!this.tutorialCompleted) {
      if (this.tutorialStep === 1) {
        this.advanceTutorialStep(2);
      } else if (this.tutorialStep === 5) {
        this.advanceTutorialStep(6);
      }
    }
  }

  // ============================================================================
  // RENDERING UI (WITH PERSPECTIVE ROTATION & ANIME SKINS/AVATARS)
  // ============================================================================
  createCardElement(card, interactive = false, isPenalty = false, skinId = 'classic') {
    const div = document.createElement('div');
    const isSelected = interactive && this.selectedCardIds.has(card.id);
    const isCompanion = interactive && this.companionCardIds.has(card.id);
    const isNaviaLocked = interactive && activeNaviaLockedCardIds && activeNaviaLockedCardIds.has(card.id);
    const isZhongliPetrified =
      interactive && activeZhongliPetrifiedCardIds && activeZhongliPetrifiedCardIds.has(card.id);
    const activeSkin = getCardSkinMeta(skinId);

    div.className = `playing-card ${card.isRed ? 'red-card' : 'black-card'} ${
      card.rankIndex === 12 ? 'is-two' : ''
    } ${isSelected ? 'selected' : ''} ${isCompanion ? 'companion-card' : ''} ${
      isNaviaLocked || isZhongliPetrified ? 'navia-locked-card' : ''
    } skin-${activeSkin.id}`;

    if (isPenalty) {
      div.style.border = '2.5px solid #ef4444';
      div.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)';
    }

    const crestHtml = '';
    const bgArtHtml = activeSkin.imgUrl
      ? `<div class="card-anime-art" style="background-image:url('${activeSkin.imgUrl}')"></div>`
      : '';
    const naviaLockHtml = isNaviaLocked
      ? `<div class="card-navia-lock-badge" title="Bị Pháo Kích Khóa Bài của Navia khóa trong vòng này">🔒 KHÓA</div>`
      : isZhongliPetrified
      ? `<div class="card-navia-lock-badge" title="Bị Thiên Tinh Hoá Đá của Zhongli khóa trong vòng này">☄️ HOÁ ĐÁ</div>`
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
        const avatarKey = String(p.avatar || AVATARS[p.id] || '');
        if (avatarEl.getAttribute('data-avatar-key') !== avatarKey) {
          avatarEl.setAttribute('data-avatar-key', avatarKey);
          avatarEl.innerHTML = getAvatarHtml(avatarKey);
        }
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
          const expectedSrc = `fanart/${charId}.jpg?v=66`;
          if (charThumbEl.getAttribute('src') !== expectedSrc) {
            charThumbEl.setAttribute('src', expectedSrc);
          }
          charThumbEl.alt = '';
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
      // Hoặc khi Yelan / Nahida kích hoạt kỹ năng, lộ diện 3 lá của đối thủ!
      if (revealEl) {
        const yelanEntry = !this.isGameOver && this.yelanRevealedByPlayer?.[p.id];
        const yelanCards = Array.isArray(yelanEntry) ? yelanEntry : yelanEntry?.cards;
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
              (c) => `<div class="mini-open-card ${c.isRed ? 'red-card' : 'black-card'} penalty-card" title="🔍 Thấu thị bài đối thủ!">
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

  // ============================================================================
  // HƯỚNG DẪN TÂN THỦ — NHÀ LỮ HÀNH (TRAVELER TUTORIAL) & BANNER TÂN THỦ 5★
  // ============================================================================
  setupTutorialInteractionGuard() {
    if (this._tutorialInteractionGuardBound) return;
    this._tutorialInteractionGuardBound = true;

    const flashTutorialPointerNotice = () => {
      const now = Date.now();
      if (this._lastTutorialWarnAt && now - this._lastTutorialWarnAt < 650) return;
      this._lastTutorialWarnAt = now;
      sfx.pass();
      if (this._tutorialTargetEl) {
        this.scrollTutorialTargetIntoView(this._tutorialTargetEl, true);
      }
      const pill = document.getElementById('tutorial-pointer-label');
      if (pill) {
        pill.classList.add('pointer-attention-flash');
        setTimeout(() => pill.classList.remove('pointer-attention-flash'), 500);
      }
      this.showCenterToast('🌟 Nhà Lữ Hành (Aether): Mình đã cuộn tới nút có mũi tên vàng chỉ vào — hãy bấm vào đó nhé!');
    };

    const isAllowedTutorialElement = (targetNode) => {
      if (!targetNode || !(targetNode instanceof Element)) return true;
      if (this.tutorialCompleted || !this.tutorialStep || this.tutorialStep < 1 || this.tutorialStep > 6) {
        return true;
      }

      // 0. Luôn cho phép bấm vào nhãn mũi tên chỉ dẫn hoặc nút Thu gọn / Mở rộng khung thoại Nhà Lữ Hành
      if (targetNode.closest('#tutorial-screen-pointer, #btn-toggle-traveler-compact')) {
        return true;
      }

      // 1. Cho phép thao tác trong bảng Đăng Ký / Đăng Nhập khi chưa có tài khoản
      const accModal = document.getElementById('account-modal');
      if (accModal && !accModal.classList.contains('hidden') && !this.currentAccountUsername) {
        return accModal.contains(targetNode);
      }

      // 2. Khi đang chiếu Video Hoạt Ảnh Kỹ Năng Nộ: chỉ cho phép bấm nút Bỏ qua (Skip) của video Nộ
      const burstOverlay = document.getElementById('genshin-burst-overlay');
      if (burstOverlay && !burstOverlay.classList.contains('hidden')) {
        return Boolean(targetNode.closest('#btn-skip-burst'));
      }

      // 2b. Khi đang mở màn hình Cầu Nguyện Gacha (Sao băng / Splash Art 5★ / Bảng kết quả):
      // Cho phép bấm Bỏ qua sao băng, Tiếp tục trên màn hình nổ vàng Splash Art 5★, hoặc Xác nhận thu nhận
      const gachaOverlay = document.getElementById('gacha-wish-overlay');
      if (gachaOverlay && !gachaOverlay.classList.contains('hidden')) {
        return Boolean(
          targetNode.closest(
            '#btn-skip-gacha-meteor, #btn-skip-gacha-splash, #btn-close-gacha-splash, #btn-close-gacha-results, #gacha-splash-stage'
          )
        );
      }

      // 3. KHI MŨI TÊN HƯỚNG DẪN ĐANG CHỈ VÀO 1 NÚT CỤ THỂ (this._tutorialTargetEl):
      // Chỉ cho phép bấm đúng vào nút mà mũi tên đang chỉ!
      if (this._tutorialTargetEl) {
        if (this._tutorialTargetEl.contains(targetNode)) {
          return true;
        }
        // Ngoại lệ ở Bước 5 sau khi đã tung Kỹ Năng [E]: khi mũi tên chỉ vào nút "Đánh bài" (#btn-play),
        // người chơi vẫn có thể bấm chọn/đổi lá bài trên tay (#human-hand) hoặc bấm Bỏ chọn / Xếp bài
        if (
          this.tutorialStep === 5 &&
          this.tutorialMatch2SkillUsed &&
          !this.tutorialMatch2FirstCardPlayed &&
          (this.elHumanHand?.contains(targetNode) || targetNode.closest('#btn-unselect, #btn-sort'))
        ) {
          return true;
        }
        return false;
      }

      // 4. Khi đang ở Bước 5 đầu ván (đợi 0.85s cho Bot Furina đánh Đôi 3 xuống bàn): khóa tạm mọi nút để tránh bấm nhầm
      if (this.tutorialStep === 5 && !this.tutorialMatch2SkillUsed && this.currentTurn !== this.mySeatId) {
        if (targetNode.closest('#btn-sound, #btn-bgm, #btn-fullscreen')) {
          return true;
        }
        return false;
      }

      // 5. Khi đang đánh ván bài thực chiến trong Hướng Dẫn (Bước 1 hoặc Bước 5 sau khi đánh lá đầu tiên):
      // Chỉ cho phép bấm chọn bài & các nút điều khiển đánh bài trên bàn, khóa các nút mở Menu/Cầu Nguyện/Kho Đồ/Luật Chơi bên ngoài
      if (this.tutorialStep === 1 || (this.tutorialStep === 5 && this.tutorialMatch2FirstCardPlayed)) {
        if (
          this.elHumanHand?.contains(targetNode) ||
          targetNode.closest(
            '#btn-play, #btn-pass, #btn-sort, #btn-unselect, #btn-hint, #btn-char-skill, #btn-speed, #btn-sound, #btn-bgm, #btn-fullscreen'
          )
        ) {
          return true;
        }
        return false;
      }

      return true;
    };

    const interceptEvent = (e) => {
      if (this.tutorialCompleted || !this.tutorialStep || this.tutorialStep < 1 || this.tutorialStep > 6) {
        return;
      }
      const targetNode = e.target;
      if (!(targetNode instanceof Element)) return;

      const interactiveEl = targetNode.closest(
        'button, a, input, select, textarea, label, [onclick], .mode-choice-card, .playing-card, .gacha-up-chip, .shop-tab, .close-modal-btn, .seat-char-skill-box, .bet-tier-btn, .inv-equip-slot'
      );
      if (!interactiveEl) return;

      if (!isAllowedTutorialElement(interactiveEl)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.type === 'click') {
          flashTutorialPointerNotice();
        }
      }
    };

    window.addEventListener('pointerdown', interceptEvent, true);
    window.addEventListener('mousedown', interceptEvent, true);
    window.addEventListener('click', interceptEvent, true);
  }

  clearTutorialHighlights() {
    if (this._tutorialPointerRaf) {
      cancelAnimationFrame(this._tutorialPointerRaf);
      this._tutorialPointerRaf = null;
    }
    this._tutorialTargetEl = null;
    document.querySelectorAll('.tutorial-highlight-pulse').forEach((el) => {
      el.classList.remove('tutorial-highlight-pulse');
    });
    const pointer = document.getElementById('tutorial-screen-pointer');
    if (pointer) {
      pointer.classList.add('hidden');
      pointer.classList.remove('point-up', 'point-down', 'pointer-pass-through');
    }
  }

  toggleTravelerGuideCompact(event) {
    if (event) event.stopPropagation();
    const overlay = document.getElementById('traveler-guide-overlay');
    const btn = document.getElementById('btn-toggle-traveler-compact');
    if (!overlay) return;
    this._travelerGuideManualMinimized = !overlay.classList.contains('guide-minimized');
    overlay.classList.toggle('guide-minimized', this._travelerGuideManualMinimized);
    if (btn) {
      btn.textContent = this._travelerGuideManualMinimized ? '➕ Mở rộng' : '➖ Thu gọn';
    }
  }

  onClickTutorialPointer(event) {
    if (event) event.stopPropagation();
    if (!this._tutorialTargetEl || this.tutorialCompleted) return;
    if (this._tutorialTargetEl === this.elHumanHand) {
      if (this.tutorialStep === 5 && this.tutorialMatch2SkillUsed && !this.tutorialMatch2FirstCardPlayed) {
        const human = this.getLocalPlayer();
        if (human) {
          const targetRank = !this.tutorialMatch2LeadPlayed ? '4' : 'Q';
          const tripleCards = human.hand.filter((c) => c.rank === targetRank);
          if (tripleCards.length === 3) {
            this.selectedCardIds = new Set(tripleCards.map((c) => c.id));
            this.renderHumanHand();
            this.updateControls();
            this.renderTravelerGuide();
          }
        }
      }
      return;
    }
    try {
      this._tutorialTargetEl.click();
    } catch (_) {}
  }

  scrollTutorialTargetIntoView(targetEl, smooth = true) {
    if (!targetEl || typeof targetEl.getBoundingClientRect !== 'function') return;
    const behavior = smooth ? 'smooth' : 'auto';

    // 1. Tự động cuộn mọi khung cha có thanh cuộn (.modal-card, .modal-body, .gacha-results-stage, v.v.) tới đúng nút mục tiêu
    let parent = targetEl.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style ? style.overflowY : '';
      const canScrollY =
        (overflowY === 'auto' ||
          overflowY === 'scroll' ||
          overflowY === 'overlay' ||
          parent.classList?.contains('modal-card') ||
          parent.classList?.contains('modal-body') ||
          parent.classList?.contains('gacha-results-stage')) &&
        parent.scrollHeight > parent.clientHeight + 2;

      if (canScrollY) {
        const parentRect = parent.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const currentOffsetInParent = targetRect.top - parentRect.top + parent.scrollTop;
        const desiredTop = Math.max(
          0,
          Math.min(
            parent.scrollHeight - parent.clientHeight,
            currentOffsetInParent - parent.clientHeight * 0.55 + targetRect.height * 0.5
          )
        );
        try {
          parent.scrollTo({ top: Math.round(desiredTop), behavior });
        } catch (_) {
          parent.scrollTop = Math.round(desiredTop);
        }
      }
      parent = parent.parentElement;
    }

    // 2. Cuộn khung nhìn trình duyệt nếu nút nằm ngoài màn hình
    try {
      targetEl.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    } catch (_) {
      try {
        targetEl.scrollIntoView(false);
      } catch (_2) {}
    }
  }

  pointToScreenElement(targetEl, labelText = 'BẤM VÀO NÚT NÀY') {
    this.clearTutorialHighlights();
    if (!targetEl) return;

    targetEl.classList.add('tutorial-highlight-pulse');
    this._tutorialTargetEl = targetEl;

    const targetSig = `${this.tutorialStep}:${targetEl.id || targetEl.className || ''}:${labelText}`;
    if (this._lastScrolledTutorialSig !== targetSig) {
      this._lastScrolledTutorialSig = targetSig;
      this._lastTutorialAutoScrollMs = Date.now();
      this.scrollTutorialTargetIntoView(targetEl, false);
      clearTimeout(this._tutorialScrollTimer1);
      clearTimeout(this._tutorialScrollTimer2);
      this._tutorialScrollTimer1 = setTimeout(() => {
        if (this._tutorialTargetEl === targetEl && !this.tutorialCompleted) {
          this.scrollTutorialTargetIntoView(targetEl, true);
        }
      }, 90);
      this._tutorialScrollTimer2 = setTimeout(() => {
        if (this._tutorialTargetEl === targetEl && !this.tutorialCompleted) {
          this.scrollTutorialTargetIntoView(targetEl, true);
        }
      }, 280);
    }

    const pointer = document.getElementById('tutorial-screen-pointer');
    const labelEl = document.getElementById('tutorial-pointer-label');
    const overlay = document.getElementById('traveler-guide-overlay');
    const toggleBtn = document.getElementById('btn-toggle-traveler-compact');
    if (!pointer || !labelEl) return;

    labelEl.textContent = labelText;
    pointer.classList.toggle('pointer-pass-through', targetEl === this.elHumanHand);
    pointer.classList.remove('hidden');

    const updatePosition = () => {
      if (!this._tutorialTargetEl || this.tutorialCompleted) {
        pointer.classList.add('hidden');
        return;
      }
      const rect = this._tutorialTargetEl.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        pointer.classList.add('hidden');
      } else {
        pointer.classList.remove('hidden');
        const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
        const vh = window.innerHeight || document.documentElement.clientHeight || 768;

        // Tự động cuộn xuống/lên tìm nút hộ người chơi nếu nút đang bị khuất ngoài vùng nhìn thấy của Modal hoặc màn hình
        let isClippedOutOfView = rect.top < 10 || rect.bottom > vh - 10;
        const scrollContainer =
          this._tutorialTargetEl.closest &&
          this._tutorialTargetEl.closest('.modal-card, .gacha-results-stage');
        if (scrollContainer) {
          const scRect = scrollContainer.getBoundingClientRect();
          if (scRect.height > 0 && (rect.top < scRect.top + 6 || rect.bottom > scRect.bottom - 6)) {
            isClippedOutOfView = true;
          }
        }
        const nowMs = Date.now();
        if (
          isClippedOutOfView &&
          (!this._lastTutorialAutoScrollMs || nowMs - this._lastTutorialAutoScrollMs > 800)
        ) {
          this._lastTutorialAutoScrollMs = nowMs;
          this.scrollTutorialTargetIntoView(this._tutorialTargetEl, true);
        }

        const spaceAbove = rect.top;
        const spaceBelow = vh - rect.bottom;

        // 1. Đặt khung thoại Nhà Lữ Hành ở nửa màn hình xa nút mục tiêu nhất (ĐỈNH nếu nút ở nửa dưới, ĐÁY nếu nút ở nửa trên)
        const placeOverlayAtBottom = spaceBelow > spaceAbove;
        if (overlay) {
          overlay.classList.toggle('guide-bottom-pos', placeOverlayAtBottom);
          if (this._travelerGuideManualMinimized) {
            overlay.classList.add('guide-minimized');
          } else {
            overlay.classList.remove('guide-minimized');
            const ovRect = overlay.getBoundingClientRect();
            const overlapsTarget =
              ovRect.height > 0 && ovRect.bottom > rect.top - 8 && ovRect.top < rect.bottom + 8;
            if (overlapsTarget) {
              overlay.classList.add('guide-minimized');
            }
          }
          if (toggleBtn) {
            toggleBtn.textContent = overlay.classList.contains('guide-minimized')
              ? '➕ Mở rộng'
              : '➖ Thu gọn';
          }
        }

        // 2. Đặt mũi tên chỉ tay ở phía thoáng nhất để không đè lên nút và không va chạm khung thoại
        const ovRectAfter = overlay ? overlay.getBoundingClientRect() : null;
        const freeAbove =
          ovRectAfter && !placeOverlayAtBottom ? rect.top - ovRectAfter.bottom : spaceAbove;
        const freeBelow =
          ovRectAfter && placeOverlayAtBottom ? ovRectAfter.top - rect.bottom : spaceBelow;
        const placeAbove = freeAbove >= 44 || freeAbove >= freeBelow;

        const cx = Math.max(105, Math.min(vw - 105, rect.left + rect.width / 2));
        pointer.classList.toggle('point-down', placeAbove);
        pointer.classList.toggle('point-up', !placeAbove);
        pointer.style.left = `${Math.round(cx)}px`;
        if (placeAbove) {
          pointer.style.top = `${Math.max(38, Math.min(vh - 12, Math.round(rect.top - 6)))}px`;
        } else {
          pointer.style.top = `${Math.max(12, Math.min(vh - 38, Math.round(rect.bottom + 6)))}px`;
        }
      }
      this._tutorialPointerRaf = requestAnimationFrame(updatePosition);
    };

    updatePosition();
  }

  hideTravelerGuide() {
    this.clearTutorialHighlights();
    const overlay = document.getElementById('traveler-guide-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('guide-bottom-pos', 'guide-minimized');
    }
  }

  startNewbieTutorial(forceReset = false) {
    if (this.isMultiplayer && this.roomId) {
      this.showCenterToast('⚠️ Vui lòng rời phòng Online trước khi mở Hướng Dẫn Tân Thủ!');
      return;
    }
    if (forceReset) {
      this.beginnerBannerUsed = false;
    }
    this.tutorialCompleted = false;
    this.tutorialStep = 1;
    this.tutorialMatch2SkillUsed = false;
    this.tutorialMatch2LeadPlayed = false;
    this.tutorialMatch2FirstCardPlayed = false;

    // Trong ván khởi động đầu tiên (Step 1), người chơi mới chưa có kỹ năng 5★ để thấy sự khác biệt với 3 Bot
    if (!this.beginnerBannerUsed) {
      this.equippedActiveChar = 'none';
      this.equippedChopBurst = 'none';
      this.equippedWinBurst = 'none';
    }

    if (this.modalWifi) this.modalWifi.classList.add('hidden');
    if (this.modalRules) this.modalRules.classList.add('hidden');
    if (this.modalSummary) this.modalSummary.classList.add('hidden');
    if (this.modalShop) this.modalShop.classList.add('hidden');

    this.isMultiplayer = false;
    this.inInitialLobby = false;
    this.soloPlayerCount = 4;
    this.savedSoloPlayerCount = 4;
    this.activeCount = 4;
    this.betPerCard = 100;
    this.matchCount = 0;
    this.queuedNextMatchBots = null;
    this._manualBotChangedAfterMatch = true;

    // Thiết lập 3 Bot mang 3 Nhân Vật 5★ nổi bật (đồng bộ 100% activeChar, chopBurst, winBurst, cardSkin, avatar)
    const botConfigs = [
      { id: 1, name: 'Bot Furina 💧', burst: 'furina' },
      { id: 2, name: 'Bot Arlecchino 🔥', burst: 'arlecchino' },
      { id: 3, name: 'Bot Zhongli 🪨', burst: 'zhongli' },
    ];
    botConfigs.forEach((cfg) => {
      const p = this.players[cfg.id];
      if (p) {
        p.active = true;
        p.isBot = true;
        p.passed = false;
        p.finishRank = null;
        p.name = cfg.name;
        p.avatar = cfg.burst;
        p.cardSkin = cfg.burst;
        p.activeChar = cfg.burst;
        p.chopBurst = cfg.burst;
        p.winBurst = cfg.burst;
      }
    });
    if (this.players[0]) {
      this.players[0].active = true;
      this.players[0].isBot = false;
      this.players[0].passed = false;
      this.players[0].finishRank = null;
      this.players[0].activeChar = 'none';
      this.players[0].chopBurst = 'none';
      this.players[0].winBurst = 'none';
    }
    this.renderSoloPlayerCountUI();

    this.saveShopProfile();
    this.startNewMatch(true);
    this.addLog(
      '🌟 <strong>[Ván Khởi Động Tân Thủ]</strong> Chào mừng bạn! Hãy đánh hết <strong>1 ván bài khởi động với 3 Bot</strong> trên bàn để làm quen nhịp độ trước khi nhận quà 5★ từ Nhà Lữ Hành nhé!',
      'log-win'
    );
    this.renderTravelerGuide();
  }

  resumeNewbieTutorialOnBoot() {
    if (this.tutorialCompleted) {
      this.hideTravelerGuide();
      return;
    }
    const step = Number(this.tutorialStep) || 1;
    if (step <= 1) {
      this.startNewbieTutorial(false);
    } else if (step === 2) {
      this.advanceTutorialStep(3);
    } else if (step === 3) {
      if (this.beginnerBannerUsed) {
        this.advanceTutorialStep(4);
      } else {
        const localP = this.getLocalPlayer();
        const curCoins = localP ? localP.coins : this.savedCoins;
        if (curCoins < 20000) {
          this.savedCoins = 20000;
          if (localP) localP.coins = 20000;
          this.saveShopProfile();
        }
        this.inInitialLobby = true;
        this.isGameOver = true;
        if (this.modalWifi) this.modalWifi.classList.remove('hidden');
        this.renderAll();
        this.renderTravelerGuide();
      }
    } else if (step === 4) {
      this.inInitialLobby = true;
      this.isGameOver = true;
      if (this.modalWifi) this.modalWifi.classList.remove('hidden');
      this.renderAll();
      this.renderTravelerGuide();
    } else if (step === 5) {
      this.startTutorialMatch2WithRaiden();
    } else if (step >= 6) {
      this.inInitialLobby = true;
      this.isGameOver = true;
      if (this.modalWifi) this.modalWifi.classList.remove('hidden');
      this.renderAll();
      this.renderTravelerGuide();
    }
  }

  advanceTutorialStep(nextStep) {
    if (this.tutorialCompleted) return;
    this.tutorialStep = nextStep;

    if (nextStep === 3) {
      // Đảm bảo Banner Tân Thủ luôn hiển thị ở Bước 3 và chưa trang bị sẵn nhân vật để Bước 4 hướng dẫn vào Kho Đồ mặc Raiden Shogun
      this.beginnerBannerUsed = false;
      this.equippedActiveChar = 'none';
      this.equippedChopBurst = 'none';
      this.equippedWinBurst = 'none';
      if (this.modalSummary) this.modalSummary.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.inInitialLobby = true;
      if (this.modalWifi && (!this.modalShop || this.modalShop.classList.contains('hidden'))) {
        this.modalWifi.classList.remove('hidden');
        this.renderLobbyModal();
      }
      // Nhà Lữ Hành nâng tiền người chơi mới lên đủ 20,000 Vàng để roll Banner Tân Thủ (16,000 Vàng) và dư vốn đánh bài
      const localP = this.getLocalPlayer();
      if (localP) {
        localP.activeChar = 'none';
        localP.chopBurst = 'none';
        localP.winBurst = 'none';
      }
      const curCoins = localP ? localP.coins : this.savedCoins;
      if (curCoins < 20000) {
        const added = 20000 - curCoins;
        this.savedCoins = 20000;
        if (localP) localP.coins = 20000;
        sfx.coin();
        this.showComboBanner(`🎁 NHÀ LỮ HÀNH TẶNG +${added.toLocaleString()} VÀNG ➔ ĐỦ 20,000 VÀNG!`);
        this.addLog(
          `🌟 <strong>[Quà Tân Thủ Nhà Lữ Hành]</strong> Đã nâng ngân quỹ của bạn lên đủ <strong>20,000 Vàng</strong> để Cầu Nguyện Banner Tân Thủ 5★ Limited!`,
          'log-win'
        );
      }
      this.renderAll();
    }

    this.saveShopProfile();
    this.renderTravelerGuide();
  }

  startTutorialMatch2WithRaiden() {
    this.tutorialStep = 5;
    this.tutorialMatch2SkillUsed = false;
    this.tutorialMatch2LeadPlayed = false;
    this.tutorialMatch2FirstCardPlayed = false;

    this.unlockedBursts.add('raiden');
    this.equippedActiveChar = 'raiden';
    this.equippedChopBurst = 'raiden';
    this.equippedWinBurst = 'raiden';

    if (this.modalWifi) this.modalWifi.classList.add('hidden');
    if (this.modalShop) this.modalShop.classList.add('hidden');
    if (this.modalSummary) this.modalSummary.classList.add('hidden');

    this.isMultiplayer = false;
    this.inInitialLobby = false;
    this.soloPlayerCount = 4;
    this.savedSoloPlayerCount = 4;
    this.activeCount = 4;
    this.betPerCard = 100;
    this.matchCount = 0;
    this.queuedNextMatchBots = null;
    this._manualBotChangedAfterMatch = true;

    // Bắt buộc kích hoạt đủ 4 ghế (tránh lỗi kẹt ván khi người chơi trước đó đang để Bàn 2 Người / 3 Người khiến Seat 3 Bot Furina bị active: false)
    this.players.forEach((p, idx) => {
      if (!p) return;
      p.active = true;
      p.isBot = idx !== 0;
      p.passed = false;
      p.finishRank = null;
    });
    this.renderSoloPlayerCountUI();

    // Khởi tạo ván bài chuẩn rồi sắp xếp kịch bản thực hành Kỹ Năng Raiden Shogun + Phản Ứng Nguyên Tố Điện Cảm
    this.startNewMatch(true);
    clearTimeout(this.botTimer);

    // Gán Nhân Vật cho 4 ghế (đồng bộ 100% activeChar, chopBurst, winBurst, cardSkin, avatar)
    const p0 = this.players[0];
    const p1 = this.players[1];
    const p2 = this.players[2];
    const p3 = this.players[3];
    if (p0) {
      p0.active = true;
      p0.isBot = false;
      p0.passed = false;
      p0.activeChar = 'raiden';
      p0.chopBurst = 'raiden';
      p0.winBurst = 'raiden';
      p0.skillUsed = false;
    }
    if (p1) {
      p1.active = true;
      p1.isBot = true;
      p1.passed = false;
      p1.name = 'Bot Nahida 🌿';
      p1.avatar = 'nahida';
      p1.cardSkin = 'nahida';
      p1.activeChar = 'nahida';
      p1.chopBurst = 'nahida';
      p1.winBurst = 'nahida';
      p1.skillUsed = true; // Tạm khóa skill bot trong ván hướng dẫn để người mới dễ thực hành
    }
    if (p2) {
      p2.active = true;
      p2.isBot = true;
      p2.passed = false;
      p2.name = 'Bot Arlecchino 🔥';
      p2.avatar = 'arlecchino';
      p2.cardSkin = 'arlecchino';
      p2.activeChar = 'arlecchino';
      p2.chopBurst = 'arlecchino';
      p2.winBurst = 'arlecchino';
      p2.skillUsed = true;
    }
    if (p3) {
      p3.active = true;
      p3.isBot = true;
      p3.passed = false;
      p3.name = 'Bot Furina 💧';
      p3.avatar = 'furina';
      p3.cardSkin = 'furina';
      p3.activeChar = 'furina';
      p3.chopBurst = 'furina';
      p3.winBurst = 'furina';
      p3.skillUsed = true;
    }
    this.preloadActiveBurstVideos();

    // Sắp xếp bộ bài 52 lá sao cho:
    // - Seat 3 (Bot Furina 💧, ngồi ngay trước Seat 0 theo chiều đánh 3 -> 0) cầm Đôi 3 (3♠ 3♦) để mở đầu đánh Đôi 3, sau đó có Sảnh 4 lá (4♦ 5♦ 6♠ 7♣) & Sám Cô 7 (7♣ 7♦ 7♥) mang ấn Thủy (💧)
    // - Seat 0 (Bạn - Raiden Shogun ⚡) cầm 3♣ + Sám Cô (4-4-4, Q-Q-Q) + Sảnh Lớn 4 lá (6♦ 7♠ 8♥ 9♣) + A♠ + Heo Cơ (2♥) để:
    //   1) Bấm [Q] chém đứt Đôi 3 của Furina và cướp cái mở vòng mới
    //   2) Đánh 3♣ (hoặc Sám Cô 4-4-4) lúc mở vòng mới (bàn trống không tính Phản Ứng Nguyên Tố)
    //   3) Khi Bot Furina (💧 Thủy) ra Sảnh 4 lá (4-5-6-7) hoặc Sám Cô 7 trên bàn, dùng Sảnh Lớn (6-7-8-9) hoặc Sám Cô Q ĐÈ LÊN bài của Furina để kích nổ Phản Ứng Nguyên Tố Điện Cảm!
    const fullDeck = createDeck();
    const pickCards = (codes) => {
      const picked = [];
      codes.forEach((code) => {
        const idx = fullDeck.findIndex((c) => `${c.rank}${c.suit}` === code);
        if (idx !== -1) {
          picked.push(fullDeck.splice(idx, 1)[0]);
        }
      });
      return picked;
    };

    const humanHand = pickCards([
      '4♠', '4♣', '4♥',
      '5♠', '6♦', '7♠', '8♥', '9♣',
      'Q♠', 'Q♦', 'Q♥',
      'A♠',
      '2♥',
    ]);
    const furinaHand = pickCards([
      '3♠', '3♦',
      '3♣', '4♦', '5♦', '6♠', '7♣', '7♦', '7♥',
      '8♠', '9♦', '10♠', '10♦',
    ]);
    const nahidaHand = fullDeck.splice(0, 13);
    const arlecchinoHand = fullDeck.splice(0, 13);

    p0.hand = sortHandByMode(humanHand, this.sortMode);
    p1.hand = sortCardsAsc(nahidaHand);
    p2.hand = sortCardsAsc(arlecchinoHand);
    p3.hand = sortCardsAsc(furinaHand);

    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.mustPlay3Spade = true;
    this.currentTurn = 3; // Bot Furina 💧 cầm 3♠ đi trước, đánh xong tới lượt Seat 0 (Bạn) ngay lập tức!

    this.addLog(
      '🌟 <strong>[Ván Thực Hành Tân Thủ]</strong> Nhà Lữ Hành đã sắp xếp bàn đấu: <strong>Bot Furina (💧 Thủy)</strong> cầm <strong>3♠</strong> đi trước, ngay sau đó sẽ đến lượt của bạn (<strong>⚡ Raiden Shogun</strong>)!',
      'log-win'
    );
    this.renderAll();
    this.renderTravelerGuide();

    // Cho Bot Furina (Seat 3) đánh Đôi 3 (3♠ 3♦) mang ấn Thủy (💧) xuống bàn sau 850ms
    this.botTimer = setTimeout(() => {
      if (this.isGameOver || this.currentTurn !== 3) return;
      const pair3 = p3.hand.filter((c) => c.rankIndex === 0 && (c.suit === '♠' || c.suit === '♦'));
      const combo = classifyCombo(pair3);
      if (combo) {
        this.playCombo(p3, combo);
      } else {
        this.executeBotTurn(p3);
      }
    }, 850);
  }

  onCloseRulesModalCompleteTutorial() {
    if (this.tutorialCompleted) return;
    if (this.tutorialStep >= 6) {
      this.tutorialCompleted = true;
      this.tutorialStep = 7;
      this.hideTravelerGuide();
      this.saveShopProfile();
      if (this.modalSummary) this.modalSummary.classList.add('hidden');
      this.inInitialLobby = true;
      if (this.modalWifi) this.modalWifi.classList.remove('hidden');
      this.renderLobbyModal();
      this.showComboBanner('🎉 HOÀN THÀNH HƯỚNG DẪN TÂN THỦ! CHÚC BẠN CHƠI VUI VẺ!');
      this.addLog(
        '🌟 <strong>[Hoàn Thành Hướng Dẫn Tân Thủ]</strong> Bạn đã tốt nghiệp khóa huấn luyện của <strong>Nhà Lữ Hành</strong>! Giờ bạn có thể tự do đấu với Bot hoặc chơi Online cùng bạn bè.',
        'log-win'
      );
    }
  }

  replayNewbieTutorialFromRules() {
    if (this.isMultiplayer && this.roomId) {
      this.showCenterToast('⚠️ Vui lòng rời phòng Online trước khi chạy lại Hướng Dẫn Tân Thủ!');
      return;
    }
    this.startNewbieTutorial(true);
  }

  renderTravelerGuide() {
    const overlay = document.getElementById('traveler-guide-overlay');
    const stepPill = document.getElementById('traveler-guide-step-pill');
    const textEl = document.getElementById('traveler-guide-text');
    if (!overlay || !stepPill || !textEl) return;

    this.clearTutorialHighlights();

    if (this.tutorialCompleted) {
      this.hideTravelerGuide();
      return;
    }

    const step = Number(this.tutorialStep) || 1;

    // BƯỚC 1: Người chơi đánh bình thường hết 1 ván bài với 3 Bot (KHÔNG hiện khung đè lên màn hình, KHÔNG có nút skip)
    if (step === 1) {
      this.hideTravelerGuide();
      return;
    }

    overlay.classList.remove('hidden', 'guide-bottom-pos');

    // BƯỚC 2: Ván 1 kết thúc ➔ Chỉ mũi tên vào nút "🏠 Đổi Chế Độ / Đổi Mức Cược" có sẵn trên màn hình để về Sảnh Chờ
    if (step === 2) {
      const wifiOpen = this.modalWifi && !this.modalWifi.classList.contains('hidden');
      if (wifiOpen) {
        this.advanceTutorialStep(3);
        return;
      }
      stepPill.textContent = 'Bước 2/6 • Về Màn Hình Chờ';
      textEl.innerHTML = `
        Ván khởi động kết thúc rồi! Bạn thấy <strong>3 con Bot vừa xài Kỹ Năng Nhân Vật 5★</strong> rất lợi hại mà bạn chưa có phải không? 😊<br>
        Đừng lo, mình sẽ hướng dẫn bạn sở hữu ngay! Hãy bấm vào nút <strong>🏠 Đổi Chế Độ / Đổi Mức Cược</strong> đang có mũi tên chỉ vào để về <strong>Màn Hình Chờ</strong> nhé!
      `;
      const summaryOpen = this.modalSummary && !this.modalSummary.classList.contains('hidden');
      const pauseModal = document.getElementById('pause-modal');
      const pauseOpen = pauseModal && !pauseModal.classList.contains('hidden');
      let targetBtn = null;
      let pointerLabel = 'BẤM VÀO ĐÂY ĐỂ VỀ SẢNH CHỜ';
      if (summaryOpen) {
        targetBtn = document.getElementById('btn-summary-change-bet');
      } else if (pauseOpen) {
        targetBtn = document.getElementById('btn-wifi');
      } else if (this.btnShowSummary && !this.btnShowSummary.classList.contains('hidden')) {
        targetBtn = this.btnShowSummary;
        pointerLabel = 'BẤM MỞ BẢNG TỔNG KẾT';
      } else {
        targetBtn = document.getElementById('btn-pause-game');
        pointerLabel = 'BẤM MENU ĐỂ VỀ SẢNH CHỜ';
      }
      this.pointToScreenElement(targetBtn, pointerLabel);
      return;
    }

    // BƯỚC 3: Tặng đủ 20,000 Vàng ➔ Chỉ mũi tên vào nút "🌠 Cầu Nguyện" có sẵn ➔ Chỉ vào nút "🌟 Cầu Nguyện Tân Thủ ×10"
    if (step === 3) {
      stepPill.textContent = 'Bước 3/6 • Tặng 20,000 Vàng & Roll Banner Tân Thủ';
      const gachaOverlay = document.getElementById('gacha-wish-overlay');
      const meteorStage = document.getElementById('gacha-meteor-stage');
      const splashStage = document.getElementById('gacha-splash-stage');
      const resultsStage = document.getElementById('gacha-results-stage');
      const gachaOpen = gachaOverlay && !gachaOverlay.classList.contains('hidden');
      const shopOpen = this.modalShop && !this.modalShop.classList.contains('hidden');

      if (gachaOpen) {
        const meteorVisible = meteorStage && !meteorStage.classList.contains('hidden');
        const splashVisible = splashStage && !splashStage.classList.contains('hidden');
        const resultsVisible = resultsStage && !resultsStage.classList.contains('hidden');

        if (meteorVisible) {
          textEl.innerHTML = `
            🌠 <strong>Sao băng Vàng Kim 5★ đang rơi xuống bầu trời Teyvat!</strong><br>
            Hãy chiêm ngưỡng hoạt ảnh sao băng nổ vàng hoặc bấm <strong>⏭️ Bỏ qua ▸</strong> ở góc phải trên để xem Splash Art 5★ nhé!
          `;
          const skipBtn = document.getElementById('btn-skip-gacha-meteor');
          this.pointToScreenElement(skipBtn, 'XEM SAO BĂNG HOẶC BẤM BỎ QUA');
        } else if (splashVisible) {
          textEl.innerHTML = `
            ⚡🌟 <strong>NỔ VÀNG 5★ LIMITED: RAIDEN SHOGUN (LÔI THẦN)!</strong><br>
            Splash Art 5★ chuẩn Genshin Impact đã xuất hiện! Hãy bấm nút <strong>✕ Continue</strong> ở góc phải dưới để xem tổng kết 10 món nhé!
          `;
          const closeSplashBtn = document.getElementById('btn-close-gacha-splash');
          this.pointToScreenElement(closeSplashBtn, 'BẤM CONTINUE ĐỂ TIẾP TỤC');
        } else if (resultsVisible) {
          textEl.innerHTML = `
            🎉 <strong>Tổng kết 10 lần Cầu Nguyện Tân Thủ!</strong><br>
            ⚠️ <strong>Lưu ý:</strong> Nhân vật 5★ mới quay trúng chỉ mới lưu vào <strong>Kho Đồ</strong> — bạn <strong>phải Trang Bị nhân vật trong Kho Đồ</strong> mới sử dụng được! Hãy bấm <strong>✅ Xác Nhận &amp; Thu Nhận</strong> bên dưới nhé!
          `;
          const closeResBtn = document.getElementById('btn-close-gacha-results');
          this.pointToScreenElement(closeResBtn, 'BẤM THU NHẬN 5★ RAIDEN SHOGUN');
        }
      } else if (!shopOpen) {
        if (!this.modalWifi || this.modalWifi.classList.contains('hidden')) {
          if (this.modalSummary) this.modalSummary.classList.add('hidden');
          document.getElementById('pause-modal')?.classList.add('hidden');
          this.inInitialLobby = true;
          this.modalWifi?.classList.remove('hidden');
        }
        textEl.innerHTML = `
          🎁 Mình vừa nâng tiền của bạn lên đủ <strong>20,000 Vàng</strong> rồi đấy!<br>
          Thấy Bot xài kỹ năng mà bạn chưa có — đừng lo! Hãy bấm vào nút <strong>🌠 Cầu Nguyện</strong> đang có mũi tên chỉ vào ở thanh công cụ bên dưới để mở <strong>Banner Tân Thủ</strong> (cam kết 100% nổ <strong>5★ Limited Raiden Shogun ⚡</strong>)!
        `;
        const targetBtn = document.getElementById('btn-lobby-open-shop') || document.getElementById('btn-shop');
        this.pointToScreenElement(targetBtn, 'BẤM VÀO NÚT CẦU NGUYỆN');
      } else {
        textEl.innerHTML = `
          🌟 Đây là <strong>Banner Tân Thủ Đặc Biệt</strong> (chỉ xuất hiện <strong>duy nhất 1 lần ×10</strong> với <strong>16,000 Vàng</strong> rồi biến mất vĩnh viễn)!<br>
          Hãy bấm vào nút <strong>🌟 Cầu Nguyện Tân Thủ ×10</strong> đang có mũi tên chỉ vào để rước <strong>5★ Limited Raiden Shogun — Lôi Thần</strong> về đội nhé!
        `;
        const btnBeginner10 = document.getElementById('btn-beginner-wish-10');
        this.pointToScreenElement(btnBeginner10, 'BẤM CẦU NGUYỆN ×10 TÂN THỦ');
      }
      return;
    }

    // BƯỚC 4: Hướng dẫn vào Kho Đồ mặc Raiden Shogun ➔ Đóng Kho Đồ ➔ Chỉ vào thẻ "🤖 CHƠI VỚI BOT" ➔ Chỉ vào nút "⚔️ VÀO BÀN ĐẤU VỚI BOT NGAY"
    if (step === 4) {
      const invModal = document.getElementById('inventory-modal');
      const invOpen = invModal && !invModal.classList.contains('hidden');
      const shopOpen = this.modalShop && !this.modalShop.classList.contains('hidden');
      const modeModal = document.getElementById('mode-setup-modal');
      const modeOpen = modeModal && !modeModal.classList.contains('hidden');
      const isRaidenEquipped = this.equippedActiveChar === 'raiden';

      if (!isRaidenEquipped) {
        stepPill.textContent = 'Bước 4/6 • Vào Kho Đồ Trang Bị Raiden Shogun';
        if (invOpen) {
          if (this.activeInventoryTab !== 'bursts') {
            this.activeInventoryTab = 'bursts';
            this.renderInventoryModal();
          }
          textEl.innerHTML = `
            🎒 <strong>Đây là Kho Đồ Cá Nhân của bạn!</strong><br>
            ⚠️ <strong>Quy tắc bắt buộc:</strong> Bạn phải bấm <strong>Trang Bị</strong> thì mới sử dụng được Chiêu Nộ <code>[Q]</code>, Phản Ứng Nguyên Tố &amp; Hoạt Ảnh Nộ của nhân vật trên bàn đấu!<br>
            Hãy bấm vào nút <strong>⚡ Trang Bị Nhân Vật Này (Chiêu Nộ [Q])</strong> ở thẻ <strong>Raiden Shogun</strong> đang có mũi tên chỉ vào nhé!
          `;
          const btnEquipRaiden = document.getElementById('btn-equip-burst-raiden');
          this.pointToScreenElement(btnEquipRaiden, 'BẤM MẶC RAIDEN SHOGUN TẠI ĐÂY');
        } else if (shopOpen) {
          textEl.innerHTML = `
            🎉 <strong>Chúc mừng bạn đã quay trúng 5★ Limited Raiden Shogun (⚡ Lôi Thần)!</strong><br>
            ⚠️ <strong>Lưu ý quan trọng:</strong> Phải <strong>trang bị nhân vật trong Kho Đồ</strong> thì mới sử dụng được nhân vật đó khi đánh bài! Hãy bấm vào nút <strong>🎒 Mở Kho Đồ</strong> ở góc trên bên phải để đi mặc <strong>Raiden Shogun</strong> vào nhé!
          `;
          const btnShopOpenInv =
            document.getElementById('btn-shop-open-inventory') ||
            document.getElementById('btn-ok-shop') ||
            document.getElementById('btn-close-shop');
          this.pointToScreenElement(btnShopOpenInv, 'BẤM MỞ KHO ĐỒ ĐỂ MẶC RAIDEN');
        } else {
          if (!this.modalWifi || this.modalWifi.classList.contains('hidden')) {
            this.inInitialLobby = true;
            this.modalWifi?.classList.remove('hidden');
          }
          textEl.innerHTML = `
            ⚠️ <strong>Bạn vừa nhận 5★ Raiden Shogun nhưng CHƯA TRANG BỊ!</strong><br>
            Phải vào <strong>🎒 Kho Đồ</strong> mặc nhân vật vào thì khi vào bàn mới dùng được Chiêu Nộ <code>[Q]</code> và Phản Ứng Nguyên Tố. Hãy bấm vào nút <strong>🎒 Kho Đồ</strong> đang có mũi tên chỉ vào nhé!
          `;
          const btnLobbyInv = document.getElementById('btn-lobby-inventory');
          this.pointToScreenElement(btnLobbyInv, 'BẤM MỞ KHO ĐỒ ĐỂ MẶC RAIDEN');
        }
      } else {
        stepPill.textContent = 'Bước 4/6 • Đã Mặc Raiden & Tạo Phòng Đấu Bot';
        if (invOpen) {
          textEl.innerHTML = `
            ✅ <strong>Tuyệt vời! Bạn đã mặc 5★ Raiden Shogun (⚡ Lôi Thần) thành công!</strong><br>
            Giờ nhân vật, Chiêu Nộ <code>[Q]</code> và Nguyên Tố Lôi của bạn đã sẵn sàng chiến đấu. Hãy bấm vào nút <strong>✅ Đóng Kho Đồ</strong> ở góc dưới bên phải để ra Sảnh Chờ tạo phòng thử chiêu nhé!
          `;
          const btnOkInv = document.getElementById('btn-ok-inventory') || document.getElementById('btn-close-inventory');
          this.pointToScreenElement(btnOkInv, 'BẤM ĐÓNG KHO ĐỒ');
        } else if (shopOpen) {
          textEl.innerHTML = `
            ✅ <strong>Bạn đã trang bị 5★ Limited Raiden Shogun (⚡ Lôi Thần)!</strong><br>
            Hãy bấm vào nút <strong>✅ Đóng Sảnh Cầu Nguyện</strong> ở góc dưới bên phải để ra tạo phòng thử chiêu nhé!
          `;
          const btnOkShop = document.getElementById('btn-ok-shop') || document.getElementById('btn-close-shop');
          this.pointToScreenElement(btnOkShop, 'BẤM ĐÓNG SẢNH CẦU NGUYỆN');
        } else if (!modeOpen) {
          textEl.innerHTML = `
            ✅ <strong>Đã trang bị 5★ Raiden Shogun!</strong> Mỗi ngày Server có chung <strong>2 Banner 5★ Limited</strong> (reset 00:00, bảo hiểm 90 roll).<br>
            Bây giờ hãy bấm vào ô <strong>🤖 CHƠI VỚI BOT (⚔️ MỞ BÀN BOT)</strong> có sẵn trên màn hình để tạo phòng thử chiêu <strong>Raiden Shogun</strong> nhé!
          `;
          const cardBot = document.getElementById('mode-card-bot');
          this.pointToScreenElement(cardBot, 'BẤM CHỌN CHƠI VỚI BOT');
        } else {
          textEl.innerHTML = `
            Tuyệt lắm! Bây giờ hãy bấm vào nút <strong>⚔️ VÀO BÀN ĐẤU VỚI BOT NGAY</strong> có sẵn bên dưới để bắt đầu ván thực hành <strong>Chiêu Nộ [Q]</strong> và <strong>Phản Ứng Nguyên Tố</strong> nhé!
          `;
          const btnSoloBot = document.getElementById('btn-solo-bot-mode');
          this.pointToScreenElement(btnSoloBot, 'BẤM VÀO BÀN ĐẤU VỚI BOT');
        }
      }
      return;
    }

    // BƯỚC 5: Ván 2 thực hành Chiêu Nộ [Q] của Raiden Shogun ➔ Mở vòng mới ➔ Đè bài đối thủ bằng Sảnh Lớn / Sám Cô kích hoạt Phản Ứng Nguyên Tố
    if (step === 5) {
      if (this.tutorialMatch2FirstCardPlayed) {
        this.hideTravelerGuide();
        return;
      }
      if (!this.tutorialMatch2SkillUsed) {
        stepPill.textContent = 'Bước 5.1/6 • Thực Hành Chiêu Nộ [Q] Cắt Vòng';
        if (!this.players[3]?.active || !this.players[1]?.active || !this.players[2]?.active) {
          this.soloPlayerCount = 4;
          this.activeCount = 4;
          this.players.forEach((p, idx) => {
            if (!p) return;
            p.active = true;
            p.isBot = idx !== 0;
          });
        }
        if (this.currentTurn === 3 && !this.currentCombo) {
          clearTimeout(this.botTimer);
          this.botTimer = setTimeout(() => {
            if (this.isGameOver || this.currentTurn !== 3 || this.currentCombo) return;
            const p3 = this.players[3];
            if (!p3) return;
            p3.active = true;
            p3.isBot = true;
            p3.passed = false;
            const pair3 = p3.hand.filter((c) => c.rankIndex === 0 && (c.suit === '♠' || c.suit === '♦'));
            const combo = classifyCombo(pair3);
            if (combo) {
              this.playCombo(p3, combo);
            } else {
              this.executeBotTurn(p3);
            }
          }, 450);
        }
        const canUseNow = this.currentTurn === this.mySeatId && this.currentCombo && this.trickOwnerId !== this.mySeatId;
        textEl.innerHTML = `
          ⚡ <strong>Bước 5.1 — Thực hành Chiêu Nộ [Q] của Raiden Shogun:</strong><br>
          <strong>Bot Furina (💧 Thủy)</strong> vừa đánh <strong>Đôi 3 (3♠ 3♦)</strong> xuống bàn! Hãy bấm vào nút <strong>🔮 Chiêu Nộ [Q]</strong> trên thanh điều khiển để tung tuyệt kỹ <strong>Tịnh Thổ Cắt Vòng</strong>:<br>
          • Chém đứt bộ bài Lẻ/Đôi ≤ J trên bàn <strong>không tốn lá bài nào</strong> và <strong>cướp quyền Cầm Cái mở vòng mới</strong> ngay lập tức!
        `;
        if (canUseNow && this.btnCharSkill) {
          this.pointToScreenElement(this.btnCharSkill, 'BẤM NÚT CHIÊU NỘ [Q] TẠI ĐÂY');
        }
      } else if (!this.tutorialMatch2LeadPlayed) {
        stepPill.textContent = 'Bước 5.2/6 • Mở Vòng Bằng Sám Cô 4-4-4 (Bàn Trống Chưa Nổ Phản Ứng)';
        const selectedCards = this.getSelectedCards();
        const selCombo = classifyCombo(selectedCards);
        const isLeadReady =
          selCombo && selCombo.type === COMBO_TYPES.TRIPLE && selCombo.cards[0]?.rank === '4';
        textEl.innerHTML = `
          💡 <strong>Bước 5.2 — Mở vòng mới bằng Sám Cô 4-4-4:</strong><br>
          ⚠️ <strong>Quy tắc quan trọng:</strong> Dù <strong>Sám Cô 4-4-4</strong> là bộ bài lớn, nhưng đánh <strong>lúc mở lượt (bàn trống) sẽ KHÔNG tính là Phản Ứng Nguyên Tố</strong> vì chưa có bài đối thủ trên bàn để đè!<br>
          👉 Mình đã chọn sẵn bộ <strong>Sám Cô <code>4-4-4</code> (4♠ 4♣ 4♥)</strong> — hãy bấm <strong>🔥 Đánh bài</strong> để mở vòng nhử <strong>Bot Furina (💧 Thủy)</strong> đè bài trước nhé!
        `;
        if (isLeadReady && this.btnPlay && !this.btnPlay.disabled) {
          this.pointToScreenElement(this.btnPlay, 'BẤM ĐÁNH SÁM CÔ 4-4-4 MỞ VÒNG');
        } else {
          this.pointToScreenElement(this.elHumanHand, 'CHỌN BỘ SÁM CÔ 4-4-4 (4♠ 4♣ 4♥)');
        }
      } else {
        stepPill.textContent = 'Bước 5.3/6 • Đè Sám Cô 7 Bằng Sám Cô Q Nổ Phản Ứng Nguyên Tố';
        const selectedCards = this.getSelectedCards();
        const selCombo = classifyCombo(selectedCards);
        const canBeatTable =
          selCombo &&
          selCombo.type === COMBO_TYPES.TRIPLE &&
          selCombo.cards[0]?.rank === 'Q' &&
          this.currentCombo &&
          canBeatCombo(selCombo, this.currentCombo).ok;
        textEl.innerHTML = `
          💥 <strong>Bước 5.3 — Dùng Sám Cô Q-Q-Q đè lên Sám Cô 7 của Bot Furina (+5× cược)!</strong><br>
          <strong>Bot Furina (💧 Thủy)</strong> vừa dùng <strong>Sám Cô 7 (7♣ 7♦ 7♥)</strong> đè lên Sám Cô 4 của bạn! Giờ trên bàn đã có bài của đối thủ — khi bạn lấy <strong>Sám Cô Q-Q-Q</strong> <strong>ĐÈ LÊN Sám Cô 7</strong>, Nguyên Tố <strong>⚡ Lôi</strong> va chạm <strong>💧 Thủy</strong> sẽ nổ <strong>Phản Ứng ⚡💧 Điện Cảm (+500 Xu)</strong>!<br>
          👉 Mình đã chọn sẵn bộ <strong>Sám Cô <code>Q-Q-Q</code> (Q♠ Q♦ Q♥)</strong> trên tay — hãy bấm nút <strong>🔥 Đánh bài</strong> để đè bài Furina và nổ phản ứng ngay!
        `;
        if (canBeatTable && this.btnPlay && !this.btnPlay.disabled) {
          this.pointToScreenElement(this.btnPlay, 'BẤM ĐÁNH SÁM CÔ Q-Q-Q NỔ PHẢN ỨNG');
        } else {
          this.pointToScreenElement(this.elHumanHand, 'CHỌN BỘ SÁM CÔ Q-Q-Q (Q♠ Q♦ Q♥)');
        }
      }
      return;
    }

    // BƯỚC 6: Kết thúc Ván 2 ➔ Tạm biệt Nhà Lữ Hành & chỉ vào nút "📖 Luật Chơi" có sẵn trên màn hình
    if (step >= 6) {
      stepPill.textContent = 'Bước 6/6 • Tạm Biệt Nhà Lữ Hành & Xem Luật Chơi';
      const rulesOpen = this.modalRules && !this.modalRules.classList.contains('hidden');
      const summaryOpen = this.modalSummary && !this.modalSummary.classList.contains('hidden');
      const wifiOpen = this.modalWifi && !this.modalWifi.classList.contains('hidden');

      if (rulesOpen) {
        textEl.innerHTML = `
          📖 Đây là bảng <strong>Luật Chơi Tiến Lên Miền Nam — Genshin Impact Edition</strong>! Bạn có thể tra cứu mọi quy tắc chặt Heo/Hàng, 58 Nhân Vật 5★ và Phản Ứng Nguyên Tố tại đây.<br>
          Hãy bấm vào nút <strong>✅ Đã Hiểu Luật Chơi!</strong> bên dưới để hoàn tất hướng dẫn và bắt đầu chơi tự do nhé!
        `;
        const btnOkRules = document.getElementById('btn-ok-rules');
        this.pointToScreenElement(btnOkRules, 'BẤM ĐỂ HOÀN TẤT & CHƠI TỰ DO');
      } else if (summaryOpen) {
        textEl.innerHTML = `
          🎉 <strong>Chúc mừng bạn đã hoàn thành ván thực hành Kỹ Năng &amp; Phản Ứng Nguyên Tố!</strong><br>
          Hãy bấm vào nút <strong>🏠 Đổi Chế Độ / Đổi Mức Cược</strong> đang có mũi tên chỉ vào để về Màn Hình Chờ nhận lời dặn cuối từ mình nhé!
        `;
        const btnChangeBet = document.getElementById('btn-summary-change-bet');
        this.pointToScreenElement(btnChangeBet, 'BẤM ĐỂ VỀ MÀN HÌNH CHỜ');
      } else {
        textEl.innerHTML = `
          🎉 <strong>Chúc mừng bạn đã tốt nghiệp khóa huấn luyện Tân Thủ!</strong><br>
          <strong>Nhà Lữ Hành</strong> xin tạm biệt bạn tại đây. Nếu có bất kỳ thắc mắc nào về tỷ lệ chặt Heo/Hàng, danh sách 58 Nhân Vật 5★ hay bảng Phản Ứng Nguyên Tố, hãy bấm vào nút <strong>📖 Luật Chơi</strong> đang có mũi tên chỉ vào để đọc nhé!
        `;
        const targetRulesBtn = wifiOpen
          ? document.getElementById('btn-lobby-open-rules')
          : document.getElementById('btn-rules');
        this.pointToScreenElement(targetRulesBtn, 'BẤM XEM LUẬT CHƠI TẠI ĐÂY');
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tienLenGame = new TienLenGame();
});
